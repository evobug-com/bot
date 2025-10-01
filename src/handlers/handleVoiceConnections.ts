/**
 * Voice Connections Handler
 *
 * This module manages automated voice channel connections where the bot periodically
 * joins non-empty voice channels, plays random sound clips, and disconnects.
 *
 * Features:
 * - Persistent timer that survives bot restarts
 * - Waits for users if no one is in voice channels
 * - Only resets timer after successful full playback
 * - Joins immediately when someone joins voice after waiting period
 * - Tracks played clips to avoid repetition until all are played
 * - Multi-guild support
 * - Proper lifecycle management
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import {
	type Client,
	Events,
	type Guild,
	type VoiceChannel,
	ChannelType,
	type VoiceState,
} from "discord.js";
import {
	createAudioPlayer,
	createAudioResource,
	joinVoiceChannel,
	VoiceConnectionStatus,
	AudioPlayerStatus,
	entersState,
	getVoiceConnection,
	type VoiceConnection,
} from "@discordjs/voice";
import { createLogger } from "../util/logger.ts";

const log = createLogger("VoiceConnections");

/**
 * Configuration for voice connections
 */
const config = {
	/** Interval between voice channel checks (8 hours in milliseconds) */
	checkInterval: 8 * 60 * 60 * 1000, // 8 hours

	/** Directory containing sound files */
	soundsDirectory: join(process.cwd(), "sounds"),

	/** Data directory for persistent storage */
	dataDirectory: join(process.cwd(), "data"),

	/** Timer file path */
	timerFile: join(process.cwd(), "data", "voice-timer.json"),

	/** Connection timeout in milliseconds */
	connectionTimeout: 5000,

	/** Whether to enable the feature */
	enabled: true,
};

/**
 * Timer data structure
 */
interface TimerData {
	[guildId: string]: {
		nextPlayTime: number;
		waitingForUser: boolean;
		pendingPlayback: boolean;
		playedClips: string[];
		availableClips: string[];
	};
}

/**
 * Map to track active connections per guild
 */
const activeConnections = new Map<string, VoiceConnection>();

/**
 * Map to track the interval for each guild
 */
const intervalHandles = new Map<string, NodeJS.Timeout>();

/**
 * Map to track if we're waiting for users in each guild
 */
const waitingForUsers = new Map<string, boolean>();

/**
 * Map to track if playback was completed successfully
 */
const playbackCompleted = new Map<string, boolean>();

/**
 * Load timer data from file
 */
async function loadTimerData(): Promise<TimerData> {
	try {
		if (!existsSync(config.timerFile)) {
			return {};
		}
		const data = await readFile(config.timerFile, "utf-8");
		return JSON.parse(data) as TimerData;
	} catch (error) {
		log("error", "Failed to load timer data:", error);
		return {};
	}
}

/**
 * Save timer data to file
 */
async function saveTimerData(data: TimerData): Promise<void> {
	try {
		// Ensure data directory exists
		if (!existsSync(config.dataDirectory)) {
			await mkdir(config.dataDirectory, { recursive: true });
		}
		await writeFile(config.timerFile, JSON.stringify(data, null, 2));
	} catch (error) {
		log("error", "Failed to save timer data:", error);
	}
}

/**
 * Get or initialize timer for a guild
 */
async function getGuildTimer(guildId: string): Promise<number> {
	const data = await loadTimerData();

	if (!data[guildId] || !data[guildId].nextPlayTime) {
		// Initialize with current time + interval
		const nextPlayTime = Date.now() + config.checkInterval;
		data[guildId] = {
			nextPlayTime,
			waitingForUser: false,
			pendingPlayback: false,
			playedClips: [],
			availableClips: [],
		};
		await saveTimerData(data);
		return nextPlayTime;
	}

	// Ensure playedClips and availableClips exist (for backwards compatibility)
	if (!data[guildId].playedClips) {
		data[guildId].playedClips = [];
	}
	if (!data[guildId].availableClips) {
		data[guildId].availableClips = [];
	}
	await saveTimerData(data);

	return data[guildId].nextPlayTime;
}

/**
 * Update timer for a guild (only after successful playback)
 */
async function updateGuildTimer(guildId: string, completed: boolean, playedClip?: string): Promise<void> {
	const data = await loadTimerData();

	if (completed) {
		// Only reset timer if playback completed successfully
		if (!data[guildId]) {
			data[guildId] = {
				nextPlayTime: Date.now() + config.checkInterval,
				waitingForUser: false,
				pendingPlayback: false,
				playedClips: [],
				availableClips: [],
			};
		} else {
			data[guildId].nextPlayTime = Date.now() + config.checkInterval;
			data[guildId].waitingForUser = false;
			data[guildId].pendingPlayback = false;
		}

		// Track the played clip if provided
		if (playedClip) {
			if (!data[guildId].playedClips) {
				data[guildId].playedClips = [];
			}
			data[guildId].playedClips.push(playedClip);

			// Remove from available clips
			if (data[guildId].availableClips) {
				data[guildId].availableClips = data[guildId].availableClips.filter(clip => clip !== playedClip);
			}

			log("info", `Marked clip "${playedClip}" as played for guild ${guildId}`);
			log("info", `Remaining clips: ${data[guildId].availableClips?.length || 0}, Played clips: ${data[guildId].playedClips.length}`);
		}

		log("info", `Timer reset for guild ${guildId} after successful playback`);
	} else {
		// Keep the same timer, mark as pending
		if (!data[guildId]) {
			data[guildId] = {
				nextPlayTime: Date.now(),
				waitingForUser: false,
				pendingPlayback: true,
				playedClips: [],
				availableClips: [],
			};
		} else {
			data[guildId].pendingPlayback = true;
		}
		log("info", `Playback interrupted for guild ${guildId}, timer not reset`);
	}

	await saveTimerData(data);
}

/**
 * Mark guild as waiting for users
 */
async function setWaitingForUsers(guildId: string, waiting: boolean): Promise<void> {
	const data = await loadTimerData();

	if (!data[guildId]) {
		data[guildId] = {
			nextPlayTime: Date.now(),
			waitingForUser: waiting,
			pendingPlayback: true,
			playedClips: [],
			availableClips: [],
		};
	} else {
		data[guildId].waitingForUser = waiting;
		if (waiting) {
			data[guildId].pendingPlayback = true;
		}
	}

	waitingForUsers.set(guildId, waiting);
	await saveTimerData(data);
}

/**
 * Check if guild is waiting for users
 */
async function isWaitingForUsers(guildId: string): Promise<boolean> {
	const data = await loadTimerData();
	return data[guildId]?.waitingForUser || waitingForUsers.get(guildId) || false;
}

/**
 * Get all MP3 files from the sounds directory
 */
async function getMP3Files(): Promise<string[]> {
	try {
		const files = await readdir(config.soundsDirectory);
		return files.filter(file => file.endsWith('.mp3'));
	} catch (error) {
		log("error", "Failed to read sounds directory:", error);
		return [];
	}
}

/**
 * Initialize or refresh available clips for a guild
 */
async function initializeAvailableClips(guildId: string): Promise<void> {
	const data = await loadTimerData();
	const allClips = await getMP3Files();

	if (!data[guildId]) {
		data[guildId] = {
			nextPlayTime: Date.now() + config.checkInterval,
			waitingForUser: false,
			pendingPlayback: false,
			playedClips: [],
			availableClips: allClips,
		};
	} else {
		// Check if we need to reset the cycle (all clips played or no available clips)
		if (!data[guildId].availableClips || data[guildId].availableClips.length === 0) {
			log("info", `Resetting clip cycle for guild ${guildId} - all clips have been played`);
			data[guildId].playedClips = [];
			data[guildId].availableClips = allClips;
		}

		// Handle new clips that were added to the folder
		const newClips = allClips.filter(clip =>
			!data[guildId]?.playedClips?.includes(clip) &&
			!data[guildId]?.availableClips?.includes(clip)
		);

		if (newClips.length > 0) {
			log("info", `Found ${newClips.length} new clips for guild ${guildId}`);
			if (!data[guildId].availableClips) {
				data[guildId].availableClips = [];
			}
			data[guildId].availableClips.push(...newClips);
		}
	}

	await saveTimerData(data);
}

/**
 * Get a random unplayed MP3 file for a guild
 */
async function getRandomUnplayedMP3(guildId: string): Promise<string | null> {
	await initializeAvailableClips(guildId);

	const data = await loadTimerData();
	const guildData = data[guildId];

	if (!guildData || !guildData.availableClips || guildData.availableClips.length === 0) {
		// This shouldn't happen after initialization, but just in case
		return null;
	}

	// Pick a random clip from available clips
	const randomIndex = Math.floor(Math.random() * guildData.availableClips.length);
	const selectedClip = guildData.availableClips[randomIndex];

	if (!selectedClip) {
		return null;
	}

	log("info", `Selected clip "${selectedClip}" for guild ${guildId} (${guildData.availableClips.length} available, ${guildData.playedClips?.length || 0} played)`);

	return selectedClip;
}

/**
 * Find a random non-empty voice channel in the guild
 */
function findNonEmptyVoiceChannel(guild: Guild): VoiceChannel | null {
	if (!guild.client.user) {
		return null;
	}

	const voiceChannels = guild.channels.cache.filter(
		(channel): channel is VoiceChannel =>
			channel.type === ChannelType.GuildVoice &&
			channel.members.size > 0 &&
			!channel.members.has(guild.client.user.id)
	);

	if (voiceChannels.size === 0) {
		return null;
	}

	const channelArray = Array.from(voiceChannels.values());
	const randomIndex = Math.floor(Math.random() * channelArray.length);
	return channelArray[randomIndex] ?? null;
}

/**
 * Play a sound in a voice channel
 */
async function playSoundInChannel(channel: VoiceChannel): Promise<boolean> {
	const guildId = channel.guild.id;

	// Check if already connected to this guild
	if (activeConnections.has(guildId)) {
		log("warn", `Already connected in guild ${channel.guild.name}`);
		return false;
	}

	// Get random unplayed MP3 file
	const mp3FileName = await getRandomUnplayedMP3(guildId);
	if (!mp3FileName) {
		log("warn", "No unplayed MP3 files found for guild");
		return false;
	}

	const mp3Path = join(config.soundsDirectory, mp3FileName);

	log("info", `Joining channel "${channel.name}" in guild "${channel.guild.name}" to play "${mp3FileName}"`);

	// Track if playback completed
	playbackCompleted.set(guildId, false);

	try {
		// Create voice connection
		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator,
		});

		activeConnections.set(guildId, connection);

		// Wait for connection to be ready
		await entersState(connection, VoiceConnectionStatus.Ready, config.connectionTimeout);

		// Create audio player and resource
		const player = createAudioPlayer();
		const resource = createAudioResource(mp3Path);

		// Subscribe connection to player
		const subscription = connection.subscribe(player);

		// Play the resource
		player.play(resource);

		// Handle player state changes
		player.on(AudioPlayerStatus.Playing, () => {
			log("info", `Now playing "${mp3FileName}" in channel "${channel.name}"`);
		});

		player.on('error', error => {
			log("error", `Audio player error in guild ${channel.guild.name}:`, error);
			cleanup(false);
		});

		// When audio finishes or enters idle state, disconnect
		player.on(AudioPlayerStatus.Idle, () => {
			log("info", `Finished playing "${mp3FileName}" in channel "${channel.name}"`);
			// Mark playback as completed
			playbackCompleted.set(guildId, true);
			cleanup(true);
		});

		// Handle connection errors
		connection.on(VoiceConnectionStatus.Disconnected, async () => {
			try {
				// Try to reconnect
				await Promise.race([
					entersState(connection, VoiceConnectionStatus.Signalling, 5000),
					entersState(connection, VoiceConnectionStatus.Connecting, 5000),
				]);
				// Connection is reconnecting
			} catch {
				// Failed to reconnect, cleanup
				cleanup(false);
			}
		});

		// Cleanup function
		function cleanup(completed: boolean) {
			if (subscription) {
				subscription.unsubscribe();
			}
			player.stop();
			connection.destroy();
			activeConnections.delete(guildId);

			// Update timer based on completion status, include the played clip if completed
			void updateGuildTimer(guildId, completed, completed ? mp3FileName ?? undefined : undefined);

			log("info", `Disconnected from channel "${channel.name}" in guild "${channel.guild.name}" - Playback ${completed ? 'completed' : 'interrupted'}`);
		}

		return true;

	} catch (error) {
		log("error", `Failed to connect to channel "${channel.name}":`, error);
		activeConnections.delete(guildId);
		playbackCompleted.delete(guildId);

		// Clean up any existing connection
		const existingConnection = getVoiceConnection(guildId);
		if (existingConnection) {
			existingConnection.destroy();
		}

		return false;
	}
}

/**
 * Check for voice channels and play sound in a random non-empty one
 */
async function checkAndPlaySound(guild: Guild): Promise<void> {
	if (!config.enabled) {
		return;
	}

	// Skip if already connected in this guild
	if (activeConnections.has(guild.id)) {
		log("debug", `Skipping guild ${guild.name} - already connected`);
		return;
	}

	const channel = findNonEmptyVoiceChannel(guild);
	if (!channel) {
		log("info", `No non-empty voice channels found in guild ${guild.name}, waiting for users...`);
		await setWaitingForUsers(guild.id, true);
		return;
	}

	// Clear waiting status and play
	await setWaitingForUsers(guild.id, false);
	await playSoundInChannel(channel);
}

/**
 * Check if it's time to play sound
 */
async function checkTimer(guild: Guild): Promise<void> {
	const nextPlayTime = await getGuildTimer(guild.id);
	const now = Date.now();

	if (now >= nextPlayTime) {
		log("info", `Timer expired for guild ${guild.name}, attempting to play sound`);
		await checkAndPlaySound(guild);
	} else {
		const remainingMinutes = Math.floor((nextPlayTime - now) / 60000);
		log("debug", `Next play time for guild ${guild.name} in ${remainingMinutes} minutes`);
	}
}

/**
 * Set up periodic checks for a guild
 */
function setupGuildInterval(guild: Guild): void {
	// Clear existing interval if any
	const existingInterval = intervalHandles.get(guild.id);
	if (existingInterval) {
		clearInterval(existingInterval);
	}

	// Check timer immediately
	void checkTimer(guild);

	// Set up periodic checks (every minute to check if timer expired)
	const interval = setInterval(() => {
		void checkTimer(guild);
	}, 60000); // Check every minute

	intervalHandles.set(guild.id, interval);

	log("info", `Set up voice connection timer for guild ${guild.name}`);
}

/**
 * Handle voice state updates (someone joining/leaving voice)
 */
async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
	if (!newState.guild || !config.enabled) {
		return;
	}

	const guildId = newState.guild.id;

	// Check if we're waiting for users in this guild
	const waiting = await isWaitingForUsers(guildId);
	if (!waiting) {
		return;
	}

	// Check if someone joined a voice channel (not the bot)
	if (!newState.member?.user.bot && newState.channel && newState.channel.type === ChannelType.GuildVoice) {
		log("info", `User joined voice in guild ${newState.guild.name} while waiting, playing sound immediately`);

		// Clear waiting status and play
		await setWaitingForUsers(guildId, false);
		await playSoundInChannel(newState.channel as VoiceChannel);
	}
}

/**
 * Clean up resources for a guild
 */
function cleanupGuild(guildId: string): void {
	// Clear interval
	const interval = intervalHandles.get(guildId);
	if (interval) {
		clearInterval(interval);
		intervalHandles.delete(guildId);
	}

	// Destroy any active connection
	const connection = activeConnections.get(guildId);
	if (connection) {
		connection.destroy();
		activeConnections.delete(guildId);
	}

	// Clear waiting status
	waitingForUsers.delete(guildId);
	playbackCompleted.delete(guildId);
}

/**
 * Main handler function
 */
export async function handleVoiceConnections(client: Client<true>): Promise<void> {
	log("info", "Initializing voice connections handler");

	// Check if sounds directory exists and has MP3 files
	const mp3Files = await getMP3Files();
	if (mp3Files.length === 0) {
		log("warn", `No MP3 files found in ${config.soundsDirectory}. Voice connections will not be activated.`);
		config.enabled = false;
		return;
	}

	log("info", `Found ${mp3Files.length} MP3 files in sounds directory`);

	// Set up intervals for all guilds
	client.guilds.cache.forEach(guild => {
		setupGuildInterval(guild);
	});

	// Handle voice state updates
	client.on(Events.VoiceStateUpdate, (oldState, newState) => {
		void handleVoiceStateUpdate(oldState, newState);
	});

	// Handle new guilds
	client.on(Events.GuildCreate, (guild) => {
		log("info", `Setting up voice connections for new guild: ${guild.name}`);
		setupGuildInterval(guild);
	});

	// Handle removed guilds
	client.on(Events.GuildDelete, (guild) => {
		log("info", `Cleaning up voice connections for removed guild: ${guild.name}`);
		cleanupGuild(guild.id);
	});

	// Clean up on shutdown
	process.on('SIGINT', () => {
		log("info", "Shutting down voice connections handler");
		activeConnections.forEach((connection, _guildId) => {
			connection.destroy();
		});
		intervalHandles.forEach(interval => {
			clearInterval(interval);
		});
	});

	log("info", "Voice connections handler initialized successfully");
}