/* eslint-disable no-await-in-loop -- Sequential processing required for voice channel members */
/**
 * Activity Points Handler
 *
 * Tracks user engagement across multiple activities and awards points:
 * - Messages sent: 2 points
 * - Thread replies: 2 points
 * - Reactions added: 1 point
 * - Threads created: 10 points
 * - Voice time: 5 points per 10 minutes
 *
 * Features:
 * - Daily cap of 100 points per user
 * - Weekly leaderboard with prizes
 * - Lifetime and weekly point tracking
 * - Auto-resets weekly points every Monday
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	Client,
	GuildMember,
	Message,
	MessageReaction,
	PartialMessageReaction,
	PartialUser,
	ThreadChannel,
	User,
	VoiceState,
} from "discord.js";
import { Events } from "discord.js";
import { dbUserExists, getDbUser, orpc } from "../client/client.ts";
import { DISCORD_CHANNELS } from "../util";
import { createKancelarPrezidentaRepubliky } from "../util/messages/embedBuilders.ts";

// Activity point values (defined in API, referenced here for documentation)
// message: 1, thread_reply: 2, reaction: 1, thread_created: 10, voice_time: 5 (per 10 min)

// Weekly reset state persistence
interface WeeklyResetState {
	lastResetWeek: number; // ISO week number (1-53)
	lastResetYear: number; // Year
	lastResetDate: string; // ISO date string for logging
}

const PERSISTENCE_PATH = join(__dirname, "../../data/activityPointsReset.json");

// Voice tracking map
const voiceUsers = new Map<string, { joinedAt: Date; lastCheckedAt: Date; userId: number }>();
let voiceCheckInterval: NodeJS.Timeout | null = null;

// Universal cooldown for all activities (except voice which has its own 10-min interval)
const ACTIVITY_COOLDOWN_MS = 1 * 60_000; // 1 minute

// Message debounce map (1 message per 1 minute per user)
const messageDebounce = new Map<string, number>();

// Reaction debounce: per-message + time-based
// Key: `${discordUserId}:${messageId}` for per-message tracking
// Key: `${discordUserId}:last` for time-based debounce
const reactionDebounce = new Map<string, number>();

// Thread creation debounce (1 per 5 minutes per user)
const threadDebounce = new Map<string, number>();

// Command usage debounce (1 per 5 minutes per user)
const commandDebounce = new Map<string, number>();

/**
 * Get ISO week number and year for a date
 * Week 1 is the week containing January 4th (ISO 8601)
 */
function getISOWeekAndYear(date: Date): { week: number; year: number } {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	// Set to nearest Thursday (current date + 4 - current day number, make Sunday 7)
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	// Get first day of year
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	// Calculate full weeks to nearest Thursday
	const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return { week, year: d.getUTCFullYear() };
}

/**
 * Get current week info in Prague timezone
 */
function getCurrentWeekInfo(): { week: number; year: number; dayOfWeek: number } {
	// Get current time in Prague
	const pragueNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Prague" }));
	const { week, year } = getISOWeekAndYear(pragueNow);
	const dayOfWeek = pragueNow.getDay(); // 0 = Sunday, 1 = Monday, etc.
	return { week, year, dayOfWeek };
}

/**
 * Load weekly reset state from file
 */
async function loadResetState(): Promise<WeeklyResetState | null> {
	try {
		const data = await readFile(PERSISTENCE_PATH, "utf-8");
		return JSON.parse(data) as WeeklyResetState;
	} catch {
		return null;
	}
}

/**
 * Save weekly reset state to file
 */
async function saveResetState(state: WeeklyResetState): Promise<void> {
	try {
		await writeFile(PERSISTENCE_PATH, JSON.stringify(state, null, 2), "utf-8");
	} catch (error) {
		console.error("[ActivityPoints] Failed to save reset state:", error);
	}
}

/**
 * Check if it's time for a weekly reset
 * Reset happens on Monday (day 1) if we haven't reset for this week yet
 */
function shouldReset(state: WeeklyResetState | null): boolean {
	const { week: currentWeek, year: currentYear, dayOfWeek } = getCurrentWeekInfo();

	// If no previous reset, we should reset (but only on Monday or later to avoid partial week)
	if (!state) {
		console.log(`[ActivityPoints] No previous reset state found, dayOfWeek=${dayOfWeek}`);
		return dayOfWeek >= 1; // Monday (1) or any day after
	}

	// Check if we're in a new week compared to last reset
	const isNewWeek =
		currentYear > state.lastResetYear || (currentYear === state.lastResetYear && currentWeek > state.lastResetWeek);

	if (isNewWeek) {
		console.log(
			`[ActivityPoints] New week detected: current=${currentYear}-W${currentWeek}, last=${state.lastResetYear}-W${state.lastResetWeek}`,
		);
	}

	return isNewWeek;
}

/**
 * Perform weekly reset and distribute prizes
 */
async function performWeeklyReset(client: Client<true>): Promise<void> {
	console.log("[ActivityPoints] Performing weekly reset...");

	const [error, result] = await orpc.users.stats.activity.resetWeekly({});

	if (error) {
		console.error("[ActivityPoints] Failed to reset weekly points:", error);
		return;
	}

	console.log(`[ActivityPoints] Reset ${result.usersReset} users' weekly points`);

	// Announce winners
	if (result.topUsers.length > 0) {
		const guild = client.guilds.cache.first();
		if (!guild) return;

		const commandsChannel = guild.channels.cache.get(DISCORD_CHANNELS.COMMANDS.id);
		if (!commandsChannel?.isTextBased()) return;

		const embed = createKancelarPrezidentaRepubliky()
			.setTitle("🏆 Týdenní výsledky aktivity")
			.setDescription("Gratulujeme vítězům tohoto týdne! Odměny byly automaticky připsány.");

		const fields = await Promise.all(
			result.topUsers.map(async (user, index) => {
				const medal = index <= 2 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`;
				let displayName = user.username ?? "Neznámý";

				if (user.discordId) {
					try {
						const discordUser = await client.users.fetch(user.discordId);
						displayName = discordUser.username;
					} catch {
						// Keep fallback
					}
				}

				return {
					name: `${medal} ${displayName}`,
					value: `📊 ${user.points} bodů → 🪙 +${user.prizes.coins} | ⭐ +${user.prizes.xp}`,
					inline: false,
				};
			}),
		);

		embed.addFields(fields);

		try {
			await commandsChannel.send({ embeds: [embed] });
		} catch (error) {
			console.error("[ActivityPoints] Failed to send weekly results:", error);
		}
	}

	// Save new reset state with current week info
	const { week, year } = getCurrentWeekInfo();
	await saveResetState({
		lastResetWeek: week,
		lastResetYear: year,
		lastResetDate: new Date().toISOString(),
	});

	console.log(`[ActivityPoints] Weekly reset completed, saved state: ${year}-W${week}`);
}

/**
 * Schedule weekly reset check
 */
function scheduleWeeklyReset(client: Client<true>): void {
	// Check every hour if we need to reset
	setInterval(
		async () => {
			const state = await loadResetState();
			if (shouldReset(state)) {
				await performWeeklyReset(client);
			}
		},
		60 * 60 * 1000,
	); // Check every hour

	// Also check immediately on startup
	void loadResetState().then(async (state) => {
		if (shouldReset(state)) {
			await performWeeklyReset(client);
		}
	});
}

/**
 * Track activity points for a user
 * @param points - Optional override for default points (e.g., 2 for messages)
 */
async function trackPoints(
	userId: number,
	activityType: "message" | "voice_time" | "reaction" | "thread_created" | "thread_reply",
	points?: number,
): Promise<void> {
	const [error] = await orpc.users.stats.activity.track({
		userId,
		activityType,
		points,
	});

	if (error) {
		// Silently fail - don't crash the bot for tracking errors
		console.error(`[ActivityPoints] Failed to track ${activityType} for user ${userId}:`, error);
	}
}

/**
 * Handle message create event
 */
async function handleMessageCreate(message: Message): Promise<void> {
	// Skip bots, DMs, system messages
	if (message.author.bot || !message.guild || message.system) return;

	// Skip messages from voice channel integrated text chat (only regular text channels count)
	if (message.channel.isVoiceBased()) return;

	// Debounce: one message per 1 minute per user
	const lastMessage = messageDebounce.get(message.author.id);
	const now = Date.now();
	if (lastMessage && now - lastMessage < ACTIVITY_COOLDOWN_MS) {
		return;
	}
	messageDebounce.set(message.author.id, now);

	// Check if user exists in database
	if (!(await dbUserExists(message.guild, message.author.id))) return;

	const dbUser = await getDbUser(message.guild, message.author.id);

	// Determine if this is a thread reply or regular message
	const isThreadReply = message.channel.isThread();
	const activityType = isThreadReply ? "thread_reply" : "message";

	// Messages award 2 points, thread replies use default (also 2)
	await trackPoints(dbUser.id, activityType, isThreadReply ? undefined : 2);
}

/**
 * Handle reaction add event
 */
async function handleReactionAdd(
	reaction: MessageReaction | PartialMessageReaction,
	user: User | PartialUser,
): Promise<void> {
	// Skip bots
	if (user.bot) return;

	// Get guild
	const guild = reaction.message.guild;
	if (!guild) return;

	const now = Date.now();
	const messageId = reaction.message.id;

	// Check per-message limit: only first reaction on each message counts
	const perMessageKey = `${user.id}:${messageId}`;
	if (reactionDebounce.has(perMessageKey)) {
		return;
	}

	// Check time-based debounce: 5 minutes between reactions
	const lastReactionKey = `${user.id}:last`;
	const lastReaction = reactionDebounce.get(lastReactionKey);
	if (lastReaction && now - lastReaction < ACTIVITY_COOLDOWN_MS) {
		return;
	}

	// Mark this message as reacted and update last reaction time
	reactionDebounce.set(perMessageKey, now);
	reactionDebounce.set(lastReactionKey, now);

	// Check if user exists in database
	if (!(await dbUserExists(guild, user.id))) return;

	const dbUser = await getDbUser(guild, user.id);
	await trackPoints(dbUser.id, "reaction");
}

/**
 * Handle thread create event
 */
async function handleThreadCreate(thread: ThreadChannel, newlyCreated: boolean): Promise<void> {
	// Only track newly created threads
	if (!newlyCreated) return;

	// Get the owner
	const ownerId = thread.ownerId;
	if (!ownerId) return;

	const guild = thread.guild;
	if (!guild) return;

	// Debounce: one thread creation per 5 minutes per user
	const lastThread = threadDebounce.get(ownerId);
	const now = Date.now();
	if (lastThread && now - lastThread < ACTIVITY_COOLDOWN_MS) {
		return;
	}
	threadDebounce.set(ownerId, now);

	// Check if user exists in database
	if (!(await dbUserExists(guild, ownerId))) return;

	const dbUser = await getDbUser(guild, ownerId);
	await trackPoints(dbUser.id, "thread_created");
}

/**
 * Track activity points for command usage
 * Can be called from command handlers to award points for using commands
 * Uses the same 5-minute debounce as messages
 *
 * @param discordUserId - Discord user ID
 * @param dbUserId - Database user ID
 * @returns true if points were awarded, false if on cooldown
 */
export async function trackCommandUsage(discordUserId: string, dbUserId: number): Promise<boolean> {
	const now = Date.now();
	const lastCommand = commandDebounce.get(discordUserId);

	// Check cooldown
	if (lastCommand && now - lastCommand < ACTIVITY_COOLDOWN_MS) {
		return false;
	}

	// Update debounce
	commandDebounce.set(discordUserId, now);

	// Track as message activity (commands count as engagement)
	await trackPoints(dbUserId, "message");
	return true;
}

/**
 * Handle voice state update
 */
async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState, client: Client<true>): Promise<void> {
	const member = newState.member;
	if (!member || member.user.bot) return;

	// User joined voice
	if (!oldState.channel && newState.channel) {
		if (!(await dbUserExists(member.guild, member.id))) return;

		const dbUser = await getDbUser(member.guild, member.id);
		const now = new Date();

		voiceUsers.set(member.id, {
			joinedAt: now,
			lastCheckedAt: now,
			userId: dbUser.id,
		});

		ensureVoiceIntervalRunning(client);
	}
	// User left voice
	else if (oldState.channel && !newState.channel) {
		const userData = voiceUsers.get(member.id);
		if (!userData) return;

		// Award points for remaining time (pass oldState.channel since member.voice.channel is null)
		await checkVoiceTime(member, userData, oldState.channel);
		voiceUsers.delete(member.id);

		// Stop interval if no users in voice
		if (voiceUsers.size === 0 && voiceCheckInterval) {
			clearInterval(voiceCheckInterval);
			voiceCheckInterval = null;
		}
	}
}

/**
 * Check and award voice time points
 * @param member - The guild member to check
 * @param userData - Voice tracking data for the user
 * @param channel - The voice channel to check (needed for leave events where member.voice.channel is null)
 */
async function checkVoiceTime(
	member: GuildMember,
	userData: { joinedAt: Date; lastCheckedAt: Date; userId: number },
	channel?: VoiceState["channel"],
): Promise<void> {
	// Get the voice channel (use passed channel for leave events, or member's current channel)
	const voiceChannel = channel ?? member.voice.channel;
	if (!voiceChannel) return;

	// Require at least 2 non-bot users in the channel to prevent solo farming
	const nonBotMembers = voiceChannel.members.filter((m) => !m.user.bot);
	if (nonBotMembers.size < 2) {
		// Still update lastCheckedAt to prevent accumulating time while alone
		userData.lastCheckedAt = new Date();
		return;
	}

	const now = new Date();
	const minutesSinceLastCheck = Math.floor((now.getTime() - userData.lastCheckedAt.getTime()) / 1000 / 60);

	// Award points for every 10 minutes
	const intervals = Math.floor(minutesSinceLastCheck / 10);
	if (intervals >= 1) {
		await Promise.all(Array.from({ length: intervals }, async () => trackPoints(userData.userId, "voice_time")));
		// Update last checked time
		userData.lastCheckedAt = new Date(userData.lastCheckedAt.getTime() + intervals * 10 * 60 * 1000);
	}
}

/**
 * Ensure the voice check interval is running
 */
function ensureVoiceIntervalRunning(client: Client<true>): void {
	if (voiceCheckInterval || voiceUsers.size === 0) return;

	voiceCheckInterval = setInterval(async () => {
		if (voiceUsers.size === 0) {
			if (voiceCheckInterval) {
				clearInterval(voiceCheckInterval);
				voiceCheckInterval = null;
			}
			return;
		}

		const guild = client.guilds.cache.first();
		if (!guild) return;

		for (const [memberId, userData] of voiceUsers.entries()) {
			const member = guild.members.cache.get(memberId);
			if (!member) {
				voiceUsers.delete(memberId);
				continue;
			}

			// Check if still in voice
			if (!member.voice.channel) {
				voiceUsers.delete(memberId);
				continue;
			}

			// eslint-disable-next-line no-await-in-loop -- Sequential processing for rate limiting
			await checkVoiceTime(member, userData);
		}
	}, 10 * 60 * 1000); // Check every 10 minutes
}

/**
 * Initialize the activity points handler
 */
export const handleActivityPoints = async (client: Client<true>): Promise<void> => {
	console.log("[ActivityPoints] Initializing activity points tracking...");

	// Set up event listeners
	client.on(Events.MessageCreate, handleMessageCreate);
	client.on(Events.MessageReactionAdd, handleReactionAdd);
	client.on(Events.ThreadCreate, handleThreadCreate);
	client.on(Events.VoiceStateUpdate, async (oldState, newState) => handleVoiceStateUpdate(oldState, newState, client));

	// Initialize voice tracking for users already in voice
	const guild = client.guilds.cache.first();
	if (guild) {
		const voiceChannels = guild.channels.cache.filter((channel) => channel.isVoiceBased());
		let initialUsers = 0;

		for (const channel of voiceChannels.values()) {
			if ("members" in channel) {
				for (const member of channel.members.values()) {
					if (member.user.bot) continue;
					if (!(await dbUserExists(guild, member.id))) continue;

					const dbUser = await getDbUser(guild, member.id);
					const now = new Date();

					voiceUsers.set(member.id, {
						joinedAt: now,
						lastCheckedAt: now,
						userId: dbUser.id,
					});
					initialUsers++;
				}
			}
		}

		if (initialUsers > 0) {
			console.log(`[ActivityPoints] Found ${initialUsers} users already in voice`);
			ensureVoiceIntervalRunning(client);
		}
	}

	// Schedule weekly reset
	scheduleWeeklyReset(client);

	console.log("[ActivityPoints] Activity points tracking initialized");
};
