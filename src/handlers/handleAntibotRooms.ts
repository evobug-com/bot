/**
 * Anti-Bot Rooms Handler
 *
 * This module monitors messages in anti-bot category channels and automatically
 * assigns the ANTIBOT role to users who write in those channels. Messages are
 * immediately deleted to keep the anti-bot rooms clean.
 *
 * Features:
 * - Auto-assigns ANTIBOT role on message
 * - Deletes messages immediately
 * - Caches category channels for performance
 * - Comprehensive error handling and logging
 * - Ignores bot messages and system messages
 */

import { ChannelType, type Client, Events, type Message, type OmitPartialGroupDMChannel } from "discord.js";
import { ChannelManager, RoleManager, reportError } from "../util";
import { createLogger } from "../util/logger.ts";

const log = createLogger("AntibotRooms");

/**
 * Configuration for anti-bot rooms handler
 */
const config = {
	/** Whether to delete messages after processing */
	deleteMessages: true,
	/** Cache TTL in milliseconds (5 minutes) */
	cacheTTL: 5 * 60 * 1000,
} as const;

/**
 * Cache for tracking which channels are in the anti-bot category
 * Structure: channelId -> { isAntibot: boolean, cachedAt: number }
 */
const channelCache = new Map<string, { isAntibot: boolean; cachedAt: number }>();

/**
 * Initialize the anti-bot rooms handler
 * Sets up event listeners for message creation in anti-bot category channels
 *
 * @param client - Discord client instance
 */
export const handleAntibotRooms = async (client: Client<true>) => {
	log("info", "Initializing anti-bot rooms handler");
	client.on(Events.MessageCreate, handleMessageCreate);

	// Clear cache periodically to handle channel moves
	setInterval(() => {
		const now = Date.now();
		for (const [channelId, data] of channelCache.entries()) {
			if (now - data.cachedAt > config.cacheTTL) {
				channelCache.delete(channelId);
			}
		}
	}, config.cacheTTL);
};

/**
 * Handle message creation events
 * Assigns ANTIBOT role to users who write in anti-bot category channels
 *
 * @param message - The created message
 */
async function handleMessageCreate(message: OmitPartialGroupDMChannel<Message<boolean>>) {
	// Ignore messages without guild context
	if (!message.guild || !message.member) return;

	// Ignore bot messages
	if (message.author.bot) return;

	// Ignore system messages
	if (message.system) return;

	try {
		// Check if the message is in an anti-bot category channel
		const isAntibotChannel = await isInAntibotCategory(message as OmitPartialGroupDMChannel<Message<true>>);
		if (!isAntibotChannel) return;

		log("info", `User ${message.author.tag} (${message.author.id}) wrote in anti-bot channel ${message.channel.id}`);

		// Check if user already has the ANTIBOT role
		const hasRole = await RoleManager.hasRole(message.member, "ANTIBOT");

		if (!hasRole) {
			// First, remove verified roles if present
			const hasVerified = await RoleManager.hasRole(message.member, "VERIFIED");
			const hasPartiallyVerified = await RoleManager.hasRole(message.member, "PARTIALLY_VERIFIED");

			if (hasVerified) {
				const removed = await RoleManager.removeRole(message.member, "VERIFIED");
				if (removed) {
					log("info", `Removed VERIFIED role from user ${message.author.tag} (${message.author.id})`);
				}
			}

			if (hasPartiallyVerified) {
				const removed = await RoleManager.removeRole(message.member, "PARTIALLY_VERIFIED");
				if (removed) {
					log("info", `Removed PARTIALLY_VERIFIED role from user ${message.author.tag} (${message.author.id})`);
				}
			}

			// Assign the ANTIBOT role
			const roleAdded = await RoleManager.addRole(message.member, "ANTIBOT");

			if (roleAdded) {
				log("info", `Assigned ANTIBOT role to user ${message.author.tag} (${message.author.id})`);
			} else {
				log("error", `Failed to assign ANTIBOT role to user ${message.author.tag} (${message.author.id})`);
			}
		}

		// Delete the message to keep anti-bot rooms clean
		if (config.deleteMessages && message.deletable) {
			try {
				await message.delete();
				log("info", `Deleted message from ${message.author.tag} in anti-bot channel`);
			} catch (error) {
				log("error", "Failed to delete message:", error);
				await reportError(
					message.guild,
					"Anti-Bot Message Deletion Failed",
					`Could not delete message from ${message.author.tag} in anti-bot channel`,
					{
						userId: message.author.id,
						channelId: message.channel.id,
						error: error instanceof Error ? error.message : String(error),
					},
				);
			}
		}
	} catch (error) {
		log("error", "Error processing message in anti-bot handler:", error);
		await reportError(message.guild, "Anti-Bot Handler Error", `Error processing message from ${message.author.tag}`, {
			userId: message.author.id,
			channelId: message.channel.id,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

/**
 * Check if a message is in a channel within the anti-bot category
 * Uses caching for performance optimization
 *
 * @param message - The message to check
 * @returns True if the message is in an anti-bot category channel
 */
async function isInAntibotCategory(message: OmitPartialGroupDMChannel<Message<true>>): Promise<boolean> {
	const channelId = message.channel.id;

	// Check cache first
	const cached = channelCache.get(channelId);
	if (cached && Date.now() - cached.cachedAt < config.cacheTTL) {
		return cached.isAntibot;
	}

	// Get the anti-bot category
	const antibotCategory = ChannelManager.getChannel(message.guild, "ANTIBOT_CATEGORY");
	if (!antibotCategory) {
		log("error", "Anti-bot category not found in guild", message.guild.id);
		// Cache negative result
		channelCache.set(channelId, { isAntibot: false, cachedAt: Date.now() });
		return false;
	}

	// Check if the channel's parent is the anti-bot category
	let isAntibot = false;

	if (message.channel.type === ChannelType.GuildText || message.channel.type === ChannelType.GuildVoice) {
		isAntibot = message.channel.parentId === antibotCategory.id;
	}

	// Cache the result
	channelCache.set(channelId, { isAntibot, cachedAt: Date.now() });

	return isAntibot;
}
