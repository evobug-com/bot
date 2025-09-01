/**
 * Warning System Handler
 *
 * This module manages the comprehensive warning and violation system:
 * - Tracks violations and their severity
 * - Calculates account standings
 * - Enforces feature restrictions
 * - Manages violation expiration
 * - Sends violation notifications via DM
 *
 * Features:
 * - Multi-tiered violation severity system
 * - Automatic restriction application
 * - Progressive enforcement based on history
 * - Review request handling
 * - Persistence across bot restarts
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	ActionRowBuilder,
	type Client,
	ContainerBuilder,
	Events,
	type GuildMember,
	type Interaction,
	type Message,
	MessageFlags,
	type PartialGuildMember,
	SecondaryButtonBuilder,
	SeparatorSpacingSize,
	type VoiceState,
} from "discord.js";
import { getDbUser, orpc } from "../client/client.ts";
import {
	AccountStanding,
	type AccountStandingData,
	calculateAccountStanding,
	calculateSeverityScore,
	createStandingDisplay,
	createViolationDMCard,
	createViolationListDisplay,
	DefaultExpirationDays,
	FeatureRestriction,
	isExpired,
	type Violation,
	ViolationSeverity,
	ViolationType,
	ViolationTypeDurations,
} from "../data/violationData.ts";
import { ChannelManager, RoleManager, reportError } from "../util";
import { createLogger } from "../util/logger.ts";

const log = createLogger("WarningSystem");

/**
 * Configuration for warning system
 */
const config = {
	/** Enforcement settings */
	enforcement: {
		/** Auto-timeout duration in minutes for HIGH severity */
		highSeverityTimeout: 60,
		/** Auto-timeout duration in minutes for CRITICAL severity */
		criticalSeverityTimeout: 1440, // 24 hours
		/** Check for expired violations every X minutes */
		expirationCheckInterval: 30,
	},

	/** Restriction enforcement */
	restrictions: {
		/** Rate limit for restricted users (messages per minute) */
		messageRateLimit: 3,
		/** Cooldown between messages for restricted users (seconds) */
		messageCooldown: 10,
	},

	/** Persistence settings */
	persistence: {
		/** Path to file for warning system data */
		filePath: join(__dirname, "../../warning_system.json"),
	},
} as const;

/**
 * Active restrictions cache
 * Structure: userId -> Set<FeatureRestriction>
 */
const activeRestrictions = new Map<string, Set<FeatureRestriction>>();

/**
 * Message rate limiting for restricted users
 * Structure: userId -> { count: number, resetAt: number }
 */
const messageRateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Violation cache for quick lookups
 * Structure: userId -> Violation[]
 */
const violationCache = new Map<string, Violation[]>();

/**
 * Initialize the warning system
 * Sets up event listeners and loads existing data
 *
 * @param client - Discord client instance
 */
export const handleWarningSystem = async (client: Client<true>) => {
	// Load saved data first
	await loadWarningData();

	// Load active violations from API and apply restrictions
	await loadActiveViolations(client);

	// Register event listeners for restriction enforcement
	client.on(Events.MessageCreate, handleMessageRestrictions);
	client.on(Events.VoiceStateUpdate, handleVoiceRestrictions);
	client.on(Events.InteractionCreate, handleInteractionRestrictions);
	client.on(Events.GuildMemberUpdate, handleNicknameRestrictions);

	// Register button interaction handler
	client.on(Events.InteractionCreate, handleButtonInteractions);

	// Set up periodic expiration checks
	setInterval(() => checkAndExpireViolations(client), config.enforcement.expirationCheckInterval * 60 * 1000);

	// Initial expiration check
	await checkAndExpireViolations(client);

	log("info", "Warning system initialized");
};

/**
 * Check if this is a repeat offense of the same type
 */
async function isRepeatOffense(userId: string, guildId: string, violationType: ViolationType): Promise<boolean> {
	try {
		const violations = await getUserViolations(userId, guildId);
		// Check for any previous violations of the same type within the last 90 days
		const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
		return violations.some((v) => v.type === violationType && v.issuedAt > ninetyDaysAgo && !isExpired(v));
	} catch (error) {
		log("error", "Failed to check repeat offense:", error);
		return false;
	}
}

/**
 * Calculate appropriate expiration based on violation type and history
 */
async function calculateViolationExpiration(
	userId: string,
	guildId: string,
	violationType: ViolationType,
	severity: ViolationSeverity,
): Promise<Date | undefined> {
	const typeConfig = ViolationTypeDurations[violationType];
	if (!typeConfig || !typeConfig[severity]) {
		// Fallback to default durations
		const days = DefaultExpirationDays[severity];
		return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
	}

	const severityConfig = typeConfig[severity];
	const isRepeat = await isRepeatOffense(String(userId), guildId, violationType);

	// Determine duration in days
	const durationDays = isRepeat ? severityConfig.repeatOffense : severityConfig.firstOffense;

	// 0 means permanent (for bans)
	if (durationDays === 0) {
		return undefined; // No expiration for permanent actions
	}

	return new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
}

/**
 * Issue a new violation to a user
 */
export async function issueViolation(
	client: Client<true>,
	violation: Omit<Violation, "id" | "issuedAt">,
): Promise<Violation | null> {
	try {
		// Calculate appropriate expiration if not provided
		if (!violation.expiresAt) {
			violation.expiresAt = await calculateViolationExpiration(
				String(violation.userId),
				violation.guildId,
				violation.type,
				violation.severity,
			);
		}

		// Determine if we should use Discord timeout or rate limit
		const typeConfig = ViolationTypeDurations[violation.type];
		const severityConfig = typeConfig?.[violation.severity];
		const useDiscordTimeout = severityConfig?.useDiscordTimeout || false;

		// Update restrictions based on configuration
		if (useDiscordTimeout && violation.severity >= ViolationSeverity.HIGH) {
			// For HIGH/CRITICAL with Discord timeout, we don't need rate limit restriction
			violation.restrictions = Array.isArray(violation.restrictions)
				? violation.restrictions.filter((r) => r !== FeatureRestriction.RATE_LIMIT && r !== FeatureRestriction.TIMEOUT)
				: [];
		} else if (violation.type === ViolationType.TOXICITY || violation.type === ViolationType.EVASION) {
			// Ensure RATE_LIMIT is included for these types
			const restrictions = Array.isArray(violation.restrictions) ? violation.restrictions : [];
			if (!restrictions.includes(FeatureRestriction.RATE_LIMIT)) {
				restrictions.push(FeatureRestriction.RATE_LIMIT);
				violation.restrictions = restrictions;
			}
		}

		// Call ORPC API to create violation
		const response = await orpc.moderation.violations.issue({
			userId: violation.userId,
			guildId: violation.guildId,
			type: violation.type,
			severity: violation.severity,
			policyViolated: typeof violation.policyViolated === "string" ? violation.policyViolated : undefined,
			reason: violation.reason,
			contentSnapshot: violation.contentSnapshot || undefined,
			context: violation.context || undefined,
			issuedBy: violation.issuedBy,
			expiresInDays: violation.expiresAt
				? Math.ceil((violation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
				: undefined,
			restrictions: Array.isArray(violation.restrictions)
				? violation.restrictions // Now properly typed as FeatureRestriction[]
				: [],
			actionsApplied: Array.isArray(violation.actionsApplied)
				? violation.actionsApplied.map((a) => JSON.stringify(a))
				: undefined,
		});

		const createdViolation = {
			...response.violation,
			type: response.violation.type as ViolationType,
			severity: response.violation.severity as ViolationSeverity,
		} as Violation;

		// Update cache - use string for Discord ID cache key
		const cacheKey = String(violation.userId);
		const userViolations = violationCache.get(cacheKey) || [];
		userViolations.push(createdViolation);
		violationCache.set(cacheKey, userViolations);

		// Get Discord ID from database user for applying restrictions
		const dbUser = await orpc.users.get({ id: violation.userId }).catch(() => null);
		if (dbUser?.discordId) {
			// Apply restrictions using Discord ID
			const restrictionsArray = Array.isArray(violation.restrictions) ? violation.restrictions : [];
			await applyRestrictions(client, dbUser.discordId, violation.guildId, restrictionsArray);
		} else {
			log("error", `Failed to get Discord ID for user ${violation.userId} when applying restrictions`);
		}

		// Apply automatic actions based on severity
		await applyAutomaticActions(client, createdViolation);

		// Send DM notification
		await sendViolationDM(client, createdViolation);

		// Log to audit channel
		await logViolationToAudit(client, createdViolation);

		// Update account standing - convert ID to string
		await updateAccountStanding(client, String(violation.userId), violation.guildId);

		// Save data
		await saveWarningData();

		log("info", `Violation issued to user ${violation.userId}: ${violation.type} (${violation.severity})`);

		return createdViolation;
	} catch (error) {
		log("error", "Failed to issue violation:", error);
		await reportError(
			client.guilds.cache.get(violation.guildId) || client.guilds.cache.first()!,
			"Failed to issue violation",
			String(error),
		);
		return null;
	}
}

/**
 * Apply feature restrictions to a user
 */
async function applyRestrictions(
	client: Client<true>,
	userId: string,
	guildId: string,
	restrictions: FeatureRestriction[],
): Promise<void> {
	try {
		const guild = client.guilds.cache.get(guildId);
		if (!guild) return;

		const member = await guild.members.fetch(userId).catch(() => null);
		if (!member) return;

		// Update restrictions cache
		const userRestrictions = activeRestrictions.get(userId) || new Set();
		restrictions.forEach((r) => userRestrictions.add(r));
		activeRestrictions.set(userId, userRestrictions);

		// Apply Discord-level restrictions
		for (const restriction of restrictions) {
			switch (restriction) {
				case "TIMEOUT":
					// Apply timeout (will be handled by automatic actions)
					break;
				case "NICKNAME_CHANGE":
					// Can't directly prevent, but will revert changes
					break;
				// Other restrictions are enforced via event handlers
			}
		}

		log("info", `Applied ${restrictions.length} restrictions to user ${userId}`);
	} catch (error) {
		log("error", "Failed to apply restrictions:", error);
	}
}

/**
 * Apply automatic actions based on violation severity
 */
async function applyAutomaticActions(client: Client<true>, violation: Violation): Promise<void> {
	try {
		const guild = client.guilds.cache.get(violation.guildId);
		if (!guild) return;

		// Get the Discord ID from the database user ID
		const dbUser = await orpc.users.get({ id: violation.userId }).catch(() => null);
		if (!dbUser || !dbUser.discordId) return;

		const member = await guild.members.fetch(dbUser.discordId).catch(() => null);
		if (!member) return;

		// Check type-specific configuration
		const typeConfig = ViolationTypeDurations[violation.type];
		const severityConfig = typeConfig?.[violation.severity];
		const useDiscordTimeout = severityConfig?.useDiscordTimeout || false;

		// Only apply Discord timeout if configured for this type/severity
		if (useDiscordTimeout) {
			const isRepeat = await isRepeatOffense(String(violation.userId), violation.guildId, violation.type);
			const durationDays = isRepeat ? severityConfig.repeatOffense : severityConfig.firstOffense;

			if (durationDays === 0) {
				// 0 means ban
				await member.ban({
					reason: `${violation.type} violation (${violation.severity}): ${violation.reason}`,
					deleteMessageSeconds: 86400, // Delete messages from last 24 hours
				});
				log("info", `Banned user ${dbUser.discordId} for ${violation.type} violation`);
			} else if (durationDays > 0) {
				// Apply Discord timeout (max 28 days)
				const timeoutDuration = Math.min(durationDays * 24 * 60 * 60 * 1000, 28 * 24 * 60 * 60 * 1000);
				await member.timeout(
					timeoutDuration,
					`${violation.type} violation (${violation.severity}): ${violation.reason}`,
				);
				log("info", `Applied ${durationDays}-day timeout to user ${dbUser.discordId}`);
			}
		}
		// If not using Discord timeout, rate limiting will be applied through restrictions
	} catch (error) {
		log("error", "Failed to apply automatic actions:", error);
	}
}

/**
 * Send violation notification via DM
 */
async function sendViolationDM(client: Client<true>, violation: Violation): Promise<void> {
	try {
		const user = await client.users.fetch(String(violation.userId)).catch(() => null);
		if (!user) return;

		const violationCard = createViolationDMCard(violation);

		// Add button for requesting review
		const reviewButton = new SecondaryButtonBuilder()
			.setCustomId(`review_violation_${violation.id}`)
			.setLabel("Požádat o přezkoumání")
			.setEmoji({ name: "📝" });

		const actionRow = new ActionRowBuilder().addComponents(reviewButton);

		await user
			.send({
				components: [violationCard, actionRow],
				flags: MessageFlags.IsComponentsV2,
			})
			.catch(() => {
				// User has DMs disabled
				log("warn", `Could not send violation DM to user ${violation.userId}`);
			});
	} catch (error) {
		log("error", "Failed to send violation DM:", error);
	}
}

/**
 * Log violation to audit channel
 */
async function logViolationToAudit(client: Client<true>, violation: Violation): Promise<void> {
	try {
		const guild = client.guilds.cache.get(violation.guildId);
		if (!guild) return;

		const auditChannel = ChannelManager.getTextChannel(guild, "BOT_INFO" as any); // Use BOT_INFO until AUDIT_LOG is added
		if (!auditChannel) return;

		const user = await client.users.fetch(String(violation.userId)).catch(() => null);
		const issuer = await client.users.fetch(String(violation.issuedBy)).catch(() => null);

		const auditMessage =
			`**[VIOLATION ISSUED]**\n` +
			`**User:** ${user ? `${user.tag} (${user.id})` : violation.userId}\n` +
			`**Type:** ${violation.type}\n` +
			`**Severity:** ${violation.severity}\n` +
			`**Reason:** ${violation.reason}\n` +
			`**Issued by:** ${issuer ? issuer.tag : violation.issuedBy}\n` +
			`**Expires:** ${violation.expiresAt ? violation.expiresAt.toISOString() : "Never"}\n` +
			`**Restrictions:** ${Array.isArray(violation.restrictions) ? violation.restrictions.join(", ") : "None"}`;

		await auditChannel.send(auditMessage);
	} catch (error) {
		log("error", "Failed to log violation to audit:", error);
	}
}

/**
 * Update user's account standing
 */
async function updateAccountStanding(
	client: Client<true>,
	userId: string,
	guildId: string,
): Promise<AccountStandingData | null> {
	try {
		const violations = await getUserViolations(userId, guildId);
		const standing = calculateAccountStanding(violations);
		const activeViolations = violations.filter((v) => !isExpired(v));

		const standingData: AccountStandingData = {
			standing,
			activeViolations: activeViolations.length,
			totalViolations: violations.length,
			restrictions: Array.from(activeRestrictions.get(userId) || []),
			severityScore: calculateSeverityScore(activeViolations),
			lastViolation: violations[0]?.issuedAt || undefined,
			nextExpiration:
				activeViolations
					.filter((v) => v.expiresAt)
					.sort((a, b) => (a.expiresAt?.getTime() || 0) - (b.expiresAt?.getTime() || 0))[0]?.expiresAt || undefined,
		};

		// Apply standing-based roles
		const guild = client.guilds.cache.get(guildId);
		if (guild) {
			const member = await guild.members.fetch(userId).catch(() => null);
			if (member) {
				await applyStandingRoles(member, standing);
			}
		}

		// Handle suspension if needed
		if (standing === AccountStanding.SUSPENDED) {
			await handleSuspension(client, userId, guildId);
		}

		return standingData;
	} catch (error) {
		log("error", "Failed to update account standing:", error);
		return null;
	}
}

/**
 * Apply roles based on account standing
 */
async function applyStandingRoles(member: GuildMember, standing: AccountStanding): Promise<void> {
	try {
		// Remove all standing roles first
		await RoleManager.removeRole(member, "WARNING_LIMITED");
		await RoleManager.removeRole(member, "WARNING_VERY_LIMITED");
		await RoleManager.removeRole(member, "WARNING_AT_RISK");

		// Add appropriate standing role
		switch (standing) {
			case AccountStanding.LIMITED:
				await RoleManager.addRole(member, "WARNING_LIMITED");
				break;
			case AccountStanding.VERY_LIMITED:
				await RoleManager.addRole(member, "WARNING_VERY_LIMITED");
				break;
			case AccountStanding.AT_RISK:
				await RoleManager.addRole(member, "WARNING_AT_RISK");
				break;
		}
	} catch (error) {
		log("error", "Failed to apply standing roles:", error);
	}
}

/**
 * Handle user suspension
 */
async function handleSuspension(client: Client<true>, userId: string, guildId: string): Promise<void> {
	try {
		const guild = client.guilds.cache.get(guildId);
		if (!guild) return;

		const member = await guild.members.fetch(userId).catch(() => null);
		if (!member) return;

		// Check if member can be banned
		if (!member.bannable) {
			log("warn", `Cannot ban user ${userId} - insufficient permissions`);
			return;
		}

		// Send suspension notice before banning
		try {
			const user = await client.users.fetch(userId);
			await user.send(
				`🔒 **Váš účet byl pozastaven**\n\n` +
					`Byl jste pozastaven ze serveru ${guild.name} kvůli závažným nebo opakovaným porušením pravidel.\n` +
					`Pro více informací nebo žádost o přezkoumání navštivte: https://allcom.zone/appeals`,
			);
		} catch {
			// User has DMs disabled
		}

		// Ban the user
		await member.ban({
			reason: "Account suspended due to severe or repeated violations",
		});

		// Create suspension record via API
		// Note: This needs proper DB user ID lookup
		await orpc.moderation.suspensions.create({
			userId: parseInt(userId, 10), // Assuming this is already a DB user ID
			guildId,
			reason: "Automatic suspension - Account standing reached SUSPENDED",
			issuedBy: 0, // System user
		});

		log("info", `User ${userId} suspended from guild ${guildId}`);
	} catch (error) {
		log("error", "Failed to handle suspension:", error);
	}
}

/**
 * Get user violations from cache or API
 */
async function getUserViolations(userId: string, guildId: string): Promise<Violation[]> {
	try {
		// Check cache first
		if (violationCache.has(userId)) {
			return violationCache.get(userId) || [];
		}

		// Get database user ID from Discord ID - assuming we have access to guild
		// Note: This function needs to be refactored to accept Guild parameter
		// For now, we'll fetch without caching
		const response = await orpc.moderation.violations.list({
			userId: parseInt(userId, 10), // Assuming this is already a DB user ID
			guildId,
			includeExpired: true,
		});

		// Extract violations from response and convert types
		const violations = (response.violations || []).map((v: any) => ({
			...v,
			issuedAt: new Date(v.issuedAt),
			expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
			reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : null,
			restrictions:
				typeof v.restrictions === "string" ? (v.restrictions ? JSON.parse(v.restrictions) : []) : v.restrictions || [],
		}));

		// Update cache
		violationCache.set(userId, violations);

		return violations;
	} catch (error) {
		log("error", "Failed to get user violations:", error);
		return [];
	}
}

/**
 * Check and expire violations
 */
async function checkAndExpireViolations(client: Client<true>): Promise<void> {
	try {
		const now = new Date();
		let expiredCount = 0;

		// Check all cached violations
		for (const [userId, violations] of violationCache) {
			for (const violation of violations) {
				if (!violation.expiredAt && violation.expiresAt && violation.expiresAt <= now) {
					// Expire the violation
					await orpc.moderation.violations.expire({
						violationId: violation.id,
						expiredBy: 0, // System user
					});

					violation.expiredAt = now;
					expiredCount++;

					// Get Discord ID to remove restrictions
					const dbUser = await orpc.users.get({ id: parseInt(userId, 10) }).catch(() => null);
					if (dbUser?.discordId) {
						// Remove associated restrictions using Discord ID
						const userRestrictions = activeRestrictions.get(dbUser.discordId);
						if (userRestrictions) {
							if (Array.isArray(violation.restrictions)) {
								violation.restrictions.forEach((r: FeatureRestriction) => userRestrictions.delete(r));
							}
							if (userRestrictions.size === 0) {
								activeRestrictions.delete(dbUser.discordId);
							}
						}
					}

					// Update account standing
					await updateAccountStanding(client, userId, violation.guildId);
				}
			}
		}

		if (expiredCount > 0) {
			log("info", `Expired ${expiredCount} violations`);
			await saveWarningData();
		}
	} catch (error) {
		log("error", "Failed to check and expire violations:", error);
	}
}

// ============================================================================
// RESTRICTION ENFORCEMENT HANDLERS
// ============================================================================

/**
 * Handle message restrictions
 */
async function handleMessageRestrictions(message: Message): Promise<void> {
	if (message.author.bot) return;

	const restrictions = activeRestrictions.get(message.author.id);
	if (!restrictions) {
		return;
	}

	let shouldDelete = false;
	let reason = "";

	// Check for restricted features
	if (restrictions.has(FeatureRestriction.MESSAGE_EMBED) && message.embeds.length > 0) {
		shouldDelete = true;
		reason = "posílání embedů";
	}

	if (restrictions.has(FeatureRestriction.MESSAGE_ATTACH) && message.attachments.size > 0) {
		shouldDelete = true;
		reason = "posílání příloh";
	}

	if (restrictions.has(FeatureRestriction.MESSAGE_LINK)) {
		const linkRegex = /https?:\/\/[^\s]+/gi;
		if (linkRegex.test(message.content)) {
			shouldDelete = true;
			reason = "posílání odkazů";
		}
	}

	// Check rate limiting (both TIMEOUT for backwards compat and RATE_LIMIT for new violations)
	if (restrictions.has(FeatureRestriction.TIMEOUT) || restrictions.has(FeatureRestriction.RATE_LIMIT)) {
		const rateLimit = messageRateLimits.get(message.author.id);
		const now = Date.now();

		if (rateLimit) {
			if (now < rateLimit.resetAt) {
				if (rateLimit.count >= config.restrictions.messageRateLimit) {
					shouldDelete = true;
					reason = "zprávy";
				} else {
					rateLimit.count++;
				}
			} else {
				// Reset rate limit
				messageRateLimits.set(message.author.id, {
					count: 1,
					resetAt: now + 60000, // 1 minute
				});
			}
		} else {
			messageRateLimits.set(message.author.id, {
				count: 1,
				resetAt: now + 60000,
			});
			console.log("rate limit set for", message.author.id, "at", now);
		}
	}

	if (shouldDelete) {
		try {
			// Delete the message
			await message.delete();

			// Determine the specific deletion reason and get restriction details
			let deletionReason = "";
			let restrictionDetails = "";
			let nextMessageAllowed = "";

			// Check what type of restriction caused deletion
			if (reason === "zprávy") {
				// Rate limit hit - user sent too many messages
				const rateLimit = messageRateLimits.get(message.author.id);
				if (rateLimit) {
					const waitTime = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
					deletionReason = `Překročil jsi limit ${config.restrictions.messageRateLimit} zpráv za minutu`;
					restrictionDetails = `⚡ **Omezení rychlosti:** Můžeš poslat maximálně ${config.restrictions.messageRateLimit} zprávy za minutu\n`;
					nextMessageAllowed = `⏱️ **Další zprávu můžeš poslat za:** ${waitTime} sekund`;
				}
			} else if (reason === "posílání embedů") {
				deletionReason = "Tvoje zpráva obsahovala embed, který momentálně nemůžeš posílat";
				restrictionDetails = `🚫 **Blokované funkce:** Embedy`;
			} else if (reason === "posílání příloh") {
				deletionReason = "Tvoje zpráva obsahovala přílohu, kterou momentálně nemůžeš posílat";
				restrictionDetails = `🚫 **Blokované funkce:** Přílohy (obrázky, soubory)`;
			} else if (reason === "posílání odkazů") {
				deletionReason = "Tvoje zpráva obsahovala odkaz, který momentálně nemůžeš posílat";
				restrictionDetails = `🚫 **Blokované funkce:** Odkazy (URL)`;
			} else {
				deletionReason = `Nemůžeš momentálně používat ${reason}`;
				restrictionDetails = `🚫 **Blokované funkce:** ${reason}`;
			}

			// Get violation expiration info
			let violationInfo = "";
			try {
				const dbUser = await getDbUser(message.guild!, message.author.id);
				const violations = violationCache.get(String(dbUser.id)) || [];
				const activeViolations = violations.filter((v) => !isExpired(v));

				if (activeViolations.length > 0) {
					// Find the violation with these restrictions
					const relevantViolation = activeViolations.find((v) => {
						const restrictionsList = Array.isArray(v.restrictions) ? v.restrictions : [];
						return restrictionsList.length > 0;
					});

					if (relevantViolation?.expiresAt) {
						const now = new Date();
						const timeLeft = relevantViolation.expiresAt.getTime() - now.getTime();
						const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

						violationInfo = `\n\n📅 **Omezení platí do:** ${relevantViolation.expiresAt.toLocaleString("cs-CZ")}\n`;
						violationInfo += `⏳ **Zbývá:** ${daysLeft} ${daysLeft === 1 ? "den" : daysLeft < 5 ? "dny" : "dní"}`;

						// Check if this was a repeat offense
						const previousViolations = activeViolations.filter(
							(v) => v.type === relevantViolation.type && v.id !== relevantViolation.id,
						);

						if (previousViolations.length > 0) {
							violationInfo += `\n🔁 **Opakované porušení** (${previousViolations.length + 1}. případ)`;
						}

						// Add violation reason
						if (relevantViolation.reason) {
							violationInfo += `\n\n⚠️ **Důvod omezení:** ${relevantViolation.reason}`;
						}
					}
				}
			} catch (err) {
				log("warn", "Could not fetch violation details for DM:", err);
			}

			// Create the DM using ContainerBuilder for components v2
			try {
				const container = new ContainerBuilder()
					.setAccentColor(0xff0000) // Red for restriction
					.addTextDisplayComponents((display) =>
						display.setContent(
							`# ❌ Zpráva byla smazána\n\n` +
								`**Důvod smazání:** ${deletionReason}\n\n` +
								`${restrictionDetails}` +
								`${nextMessageAllowed}` +
								`${violationInfo}`,
						),
					);

				// Add message content if it exists
				if (message.content) {
					container.addSeparatorComponents((separator) =>
						separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small),
					);

					container.addTextDisplayComponents((display) =>
						display.setContent(`## 📝 Obsah smazané zprávy:\n\`\`\`\n${message.content.substring(0, 1900)}\n\`\`\``),
					);
				}

				// Add help button
				const helpButton = new SecondaryButtonBuilder()
					.setCustomId("standing_check")
					.setLabel("Zkontrolovat můj stav")
					.setEmoji({ name: "📊" });

				const actionRow = new ActionRowBuilder().addComponents(helpButton);

				await message.author.send({
					components: [container, actionRow],
					flags: MessageFlags.IsComponentsV2,
				});
			} catch (_dmError) {
				// User has DMs disabled, log it
				log("warn", `Could not send restriction DM to user ${message.author.id} - DMs disabled`);
			}
		} catch (error) {
			log("error", "Failed to enforce message restriction:", error);
		}
	}
}

/**
 * Handle voice restrictions
 */
async function handleVoiceRestrictions(_oldState: VoiceState, newState: VoiceState): Promise<void> {
	const userId = newState.member?.id;
	if (!userId) return;

	const restrictions = activeRestrictions.get(userId);
	if (!restrictions) return;

	// Check voice restrictions
	if (restrictions.has(FeatureRestriction.VOICE_SPEAK) && !newState.serverMute) {
		await newState.setMute(true, "Voice speak restriction active");
	}

	if (restrictions.has(FeatureRestriction.VOICE_VIDEO) && newState.selfVideo) {
		await newState.member?.voice.disconnect("Voice video restriction active");
	}

	if (restrictions.has(FeatureRestriction.VOICE_STREAM) && newState.streaming) {
		await newState.member?.voice.disconnect("Voice stream restriction active");
	}
}

/**
 * Handle interaction restrictions
 */
async function handleInteractionRestrictions(interaction: Interaction): Promise<void> {
	if (!interaction.isMessageComponent()) return;

	const restrictions = activeRestrictions.get(interaction.user.id);
	if (!restrictions) return;

	if (restrictions.has(FeatureRestriction.REACTION_ADD)) {
		await interaction.reply({
			content: "❌ Nemůžeš momentálně používat reakce kvůli aktivnímu omezení.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Handle nickname change restrictions
 */
async function handleNicknameRestrictions(
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
): Promise<void> {
	const restrictions = activeRestrictions.get(newMember.id);
	if (!restrictions || !restrictions.has(FeatureRestriction.NICKNAME_CHANGE)) return;

	if (oldMember.nickname !== newMember.nickname) {
		try {
			await newMember.setNickname(oldMember.nickname, "Nickname change restriction active");
		} catch (error) {
			log("error", "Failed to enforce nickname restriction:", error);
		}
	}
}

/**
 * Handle button interactions for warning system
 */
async function handleButtonInteractions(interaction: Interaction): Promise<void> {
	if (!interaction.isButton()) return;

	const customId = interaction.customId;

	// Handle standing_check button from restriction DMs (works in DMs)
	if (customId === "standing_check") {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// For DM interactions, we need to find which guild to check
			// We'll use the first mutual guild with the bot
			const client = interaction.client;
			const mutualGuilds = client.guilds.cache.filter((guild) => guild.members.cache.has(interaction.user.id));

			if (mutualGuilds.size === 0) {
				await interaction.editReply({
					content: "❌ Nemohl jsem najít žádný společný server. Použij příkaz `/standing` přímo na serveru.",
				});
				return;
			}

			// Use the first mutual guild (typically there's only one - Allcom)
			const guild = mutualGuilds.first()!;

			// Get the user's database info
			const dbUser = await getDbUser(guild, interaction.user.id);

			// Fetch standing from API
			const standingResponse = await orpc.moderation.standing.get({
				userId: dbUser.id,
				guildId: guild.id,
			});

			// Create a simple standing summary
			const standingData: AccountStandingData = {
				standing: standingResponse.standing,
				activeViolations: standingResponse.activeViolations,
				totalViolations: standingResponse.totalViolations || standingResponse.activeViolations,
				restrictions: standingResponse.restrictions || [],
				severityScore: standingResponse.severityScore,
				lastViolation: standingResponse.nextExpirationDate ? new Date(standingResponse.nextExpirationDate) : undefined,
				nextExpiration: standingResponse.nextExpirationDate ? new Date(standingResponse.nextExpirationDate) : undefined,
			};

			// Fetch violations for display
			const violationsListResponse = await orpc.moderation.violations.list({
				userId: dbUser.id,
				guildId: guild.id,
				includeExpired: false,
			});

			const violations: Violation[] = (violationsListResponse.violations || []).map((v: any) => ({
				...v,
				type: v.type as ViolationType,
				severity: v.severity as ViolationSeverity,
				issuedAt: new Date(v.issuedAt),
				expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
				reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : null,
				restrictions:
					typeof v.restrictions === "string"
						? v.restrictions
							? JSON.parse(v.restrictions)
							: []
						: v.restrictions || [],
			}));

			// Create the standing display
			const display = createStandingDisplay(standingData, violations);

			await interaction.editReply({
				components: [display],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
			});
		} catch (error) {
			log("error", "Failed to fetch standing from DM button:", error);
			await interaction.editReply({
				content: "❌ Nepodařilo se načíst stav účtu. Použij příkaz `/standing` na serveru.",
			});
		}
	}

	// All other button handlers require guild context
	if (!interaction.guild) return;
	// Handle view_violations button from /standing command
	else if (customId === "view_violations") {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			// Get the user's database info
			const dbUser = await getDbUser(interaction.guild, interaction.user.id);

			// Fetch violations from API
			const response = await orpc.moderation.violations.list({
				userId: dbUser.id,
				guildId: interaction.guild.id,
				includeExpired: false,
				limit: 50,
			});

			if (!response.violations || response.violations.length === 0) {
				await interaction.editReply({
					content: "✅ Nemáš žádná aktivní porušení.",
				});
				return;
			}

			// Convert API violations to the format expected by createViolationListDisplay
			const violations: Violation[] = response.violations.map((v) => ({
				id: v.id,
				userId: v.userId,
				guildId: v.guildId,
				type: v.type as ViolationType,
				severity: v.severity as ViolationSeverity,
				policyViolated: v.policyViolated,
				reason: v.reason,
				contentSnapshot: v.contentSnapshot,
				context: v.context,
				evidence: undefined, // API doesn't have evidence field
				actionsApplied: v.actionsApplied ? JSON.parse(v.actionsApplied) : [],
				restrictions:
					typeof v.restrictions === "string"
						? v.restrictions
							? JSON.parse(v.restrictions)
							: []
						: v.restrictions || [],
				issuedBy: v.issuedBy || 0, // Default to 0 if null
				issuedAt: new Date(v.issuedAt),
				expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
				reviewRequested: v.reviewRequested || false,
				reviewedBy: v.reviewedBy || undefined,
				reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : undefined,
				reviewOutcome: v.reviewOutcome || undefined,
				reviewNotes: v.reviewNotes || undefined,
			}));

			// Create and send the violations display (showing user's own violations)
			const display = createViolationListDisplay(violations, false, undefined);

			await interaction.editReply({
				components: [display],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			log("error", "Failed to fetch violations:", error);
			await interaction.editReply({
				content: "❌ Nepodařilo se načíst porušení. Zkuste to prosím později.",
			});
		}
	}

	// Handle request_review button from /standing command
	else if (customId === "request_review") {
		await interaction.reply({
			content:
				"📝 Pro požádání o přezkoumání porušení použijte příkaz `/review` s ID konkrétního porušení.\n\n" +
				"Příklad: `/review violation_id:123 reason:Důvod pro přezkoumání`",
			flags: MessageFlags.Ephemeral,
		});
	}

	// Handle review_violation_X button from violation DMs
	else if (customId.startsWith("review_violation_")) {
		const violationId = customId.replace("review_violation_", "");
		await interaction.reply({
			content:
				`📝 Pro požádání o přezkoumání tohoto porušení použijte příkaz:\n` +
				`\`/review violation_id:${violationId} reason:Váš důvod pro přezkoumání\``,
			flags: MessageFlags.Ephemeral,
		});
	}
}

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

/**
 * Load warning system data from persistence
 */
async function loadWarningData(): Promise<void> {
	try {
		const data = await readFile(config.persistence.filePath, "utf-8");
		const savedData = JSON.parse(data) as SavedWarningData;

		// Restore restrictions (these should be Discord IDs now)
		for (const [discordId, restrictions] of Object.entries(savedData.restrictions || {})) {
			activeRestrictions.set(discordId, new Set(restrictions));
		}

		log("info", "Loaded warning system data from persistence");
	} catch (_error) {
		// File doesn't exist or is invalid, start fresh
		log("info", "No existing warning data found, starting fresh");
	}
}

/**
 * Load active violations from API and apply restrictions
 */
async function loadActiveViolations(client: Client<true>): Promise<void> {
	try {
		// Get all guilds the bot is in
		for (const guild of client.guilds.cache.values()) {
			log("info", `Loading active violations for guild ${guild.name} (${guild.id})`);

			// Fetch all active violations for this guild
			// Note: This requires an API endpoint that can fetch all violations for a guild
			// For now, we'll fetch violations for each member with restrictions

			// Get all members who might have violations
			const members = await guild.members.fetch();

			for (const member of members.values()) {
				if (member.user.bot) continue;

				try {
					// Get database user
					const dbUser = await orpc.users.get({ discordId: member.id }).catch(() => null);
					if (!dbUser) continue;

					// Fetch violations for this user
					const response = await orpc.moderation.violations.list({
						userId: dbUser.id,
						guildId: guild.id,
						includeExpired: false,
						limit: 100,
					});

					if (response.violations && response.violations.length > 0) {
						// Convert and cache violations
						const violations: Violation[] = response.violations.map((v) => ({
							id: v.id,
							userId: v.userId,
							guildId: v.guildId,
							type: v.type as ViolationType,
							severity: v.severity as ViolationSeverity,
							policyViolated: v.policyViolated,
							reason: v.reason,
							contentSnapshot: v.contentSnapshot,
							context: v.context,
							evidence: undefined,
							actionsApplied: v.actionsApplied ? JSON.parse(v.actionsApplied) : [],
							restrictions:
								typeof v.restrictions === "string"
									? v.restrictions
										? JSON.parse(v.restrictions)
										: []
									: v.restrictions || [],
							issuedBy: v.issuedBy || 0, // Default to 0 if null
							issuedAt: new Date(v.issuedAt),
							expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
							reviewRequested: v.reviewRequested || false,
							reviewedBy: v.reviewedBy || undefined,
							reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : undefined,
							reviewOutcome: v.reviewOutcome || undefined,
							reviewNotes: v.reviewNotes || undefined,
						}));

						// Cache violations
						violationCache.set(String(dbUser.id), violations);

						// Apply restrictions from active violations
						const activeViolations = violations.filter((v) => !isExpired(v));
						const allRestrictions = new Set<FeatureRestriction>();

						for (const violation of activeViolations) {
							if (Array.isArray(violation.restrictions)) {
								violation.restrictions.forEach((r) => allRestrictions.add(r));
							}
						}

						if (allRestrictions.size > 0) {
							// Apply restrictions using Discord ID
							activeRestrictions.set(member.id, allRestrictions);
							log("info", `Applied ${allRestrictions.size} restrictions to user ${member.user.tag} (${member.id})`);
						}
					}
				} catch (_error) {}
			}
		}

		// Save the loaded state
		await saveWarningData();

		log("info", "Completed loading active violations from API");
	} catch (error) {
		log("error", "Failed to load active violations:", error);
	}
}

/**
 * Save warning system data to persistence
 */
async function saveWarningData(): Promise<void> {
	try {
		const data: SavedWarningData = {
			restrictions: Object.fromEntries(
				Array.from(activeRestrictions.entries()).map(([userId, restrictions]) => [userId, Array.from(restrictions)]),
			),
			savedAt: new Date().toISOString(),
		};

		await writeFile(config.persistence.filePath, JSON.stringify(data, null, 2));
	} catch (error) {
		log("error", "Failed to save warning data:", error);
	}
}

/**
 * Saved warning data structure
 */
interface SavedWarningData {
	restrictions: Record<string, FeatureRestriction[]>;
	savedAt: string;
}
