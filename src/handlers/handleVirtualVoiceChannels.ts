/**
 * Virtual Voice Channels Handler
 *
 * This module manages temporary voice channels that are automatically created when users
 * join a designated trigger channel. These channels are personalized, numbered, and
 * automatically deleted when empty.
 *
 * Features:
 * - Auto-creation when joining trigger channel
 * - Auto-deletion when empty
 * - Persistent numbering system (202-299)
 * - Channel name pattern enforcement
 * - Multi-guild support with isolated channel pools
 * - Persistence across bot restarts
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type BaseChannel,
	ChannelType,
	type Client,
	type Collection,
	Events,
	type Guild,
	type OverwriteResolvable,
	OverwriteType,
	PermissionFlagsBits,
	type VoiceChannel,
	type VoiceState,
} from "discord.js";
import { ChannelManager, RoleManager, reportError } from "../util";
import { createLogger } from "../util/logger.ts";

const log = createLogger("VirtualVoiceChannels");

/**
 * Configuration for virtual voice channels feature
 * All configurable settings in one place for easy management
 */
const config = {
	/**
	 * Prefix for all virtual voice channels (speech bubble emoji)
	 * Format: 🗯|{number}︱{username}
	 */
	channelPrefix: `🗯︱`,

	/** Channel numbering range for organization and sorting */
	numbering: {
		min: 202,
		max: 299,
	},

	/** Persistence settings */
	persistence: {
		/** Path to file for channel data across restarts */
		filePath: join(__dirname, "../../virtual_voice_channels.json"),
	},

	/** Permission settings */
	permissions: {
		/** Whether to allow verified users to view/join */
		allowVerified: true,
		/** Whether to give owner full channel management permissions */
		ownerFullControl: true,
	},

	/** Channel behavior settings */
	behavior: {
		/** Whether to auto-delete empty channels */
		autoDeleteEmpty: true,
		/** Whether to enforce naming pattern */
		enforceNamingPattern: true,
	},
} as const;

/**
 * Maps to track virtual voice channels across multiple guilds
 * Structure: guildId -> channelId -> VirtualVoiceChannelData
 * Each guild maintains its own isolated pool of virtual voice channels
 */
const virtualVoiceChannelsByGuild: Map<string, Map<string, VirtualVoiceChannelData>> = new Map();

/**
 * Initialize the virtual voice channels system
 * Sets up event listeners and loads existing channel data from persistence
 *
 * @param client - Discord client instance
 */
export const handleVirtualVoiceChannels = async (client: Client<true>) => {
	await loadExistingChannels(client);
	client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);
	client.on(Events.ChannelUpdate, handleChannelUpdate);
};

/**
 * Find the trigger channel for creating temporary voice channels
 * Users joining this channel will automatically get their own temporary channel
 *
 * @param guild - The guild to search in
 * @returns The trigger channel or null if not found
 */
async function findTriggerChannel(guild: Guild) {
	// Use ChannelManager to get the trigger channel with proper multi-guild support
	try {
		return ChannelManager.getChannel(guild, "VOICE_CREATE_TRIGGER");
	} catch (error) {
		log("error", "Failed to get trigger channel:", error);
		return null;
	}
}

/**
 * Handle voice state updates to manage temporary channel creation and deletion
 *
 * Triggers:
 * - Creates a new channel when user joins the trigger channel
 * - Deletes empty channels when users leave
 *
 * @param oldState - Previous voice state
 * @param newState - New voice state
 */
async function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
	const { guild } = newState;
	if (!guild) return;

	const triggerChannel = await findTriggerChannel(guild);
	if (!triggerChannel) {
		log("error", "Trigger channel not found for guild", guild.id);
		return;
	}

	// Check if user joined the trigger channel
	if (newState.channelId === triggerChannel.id && oldState.channelId !== triggerChannel.id) {
		await createVirtualVoiceChannel(newState);
	}

	// Check if user left a voice channel
	if (oldState.channelId && oldState.channelId !== newState.channelId) {
		await checkAndDeleteEmptyChannel(oldState.channelId, guild);
	}
}

/**
 * Handle channel updates to enforce naming patterns on virtual voice channels
 *
 * Ensures virtual voice channels maintain their required prefix format:
 * 🗯|{number}︱{custom_name}
 *
 * If a user removes the prefix, it will be automatically restored
 *
 * @param oldChannel - Channel state before update
 * @param newChannel - Channel state after update
 */
const handleChannelUpdate = async (oldChannel: BaseChannel, newChannel: BaseChannel): Promise<void> => {
	// We care only about voice channels
	if (!oldChannel.isVoiceBased() || !newChannel.isVoiceBased()) return;

	// We care only if name changed
	if (oldChannel.name === newChannel.name) return;

	const guild = newChannel.guild;
	if (!guild) return;

	const guildChannels = virtualVoiceChannelsByGuild.get(guild.id);
	if (!guildChannels) return;

	const virtualChannelData = guildChannels.get(newChannel.id);
	// If a channel is not a virtual voice channel, we don't care. (we assume the virtual voice channels are up to date)
	if (!virtualChannelData) return;

	const expectedPrefix = `${config.channelPrefix}${virtualChannelData.channelNumber}︱`;

	// Check if the name still has the correct prefix
	if (!newChannel.name.startsWith(expectedPrefix)) {
		// Only enforce if configured to do so
		if (config.behavior.enforceNamingPattern) {
			// Restore the prefix while keeping any custom part
			const customPart = newChannel.name.replace(/^🗯︱\d+︱/, "");
			const restoredName = `${expectedPrefix}${customPart}`;

			try {
				await newChannel.setName(restoredName, "Enforcing channel naming pattern");
				log("info", `Restored channel name to: ${restoredName}`);
			} catch (error) {
				log("error", "Failed to restore channel name:", error);
			}
		}
	}
};

/**
 * Load existing temporary channels from persistence and scan guilds for channels
 *
 * This function:
 * 1. Loads saved channel data from JSON file
 * 2. Scans all guilds for existing temporary channels (handles desyncs)
 * 3. Rebuilds the in-memory channel tracking maps
 * 4. Cleans up non-existent channels from persistence
 * 5. Deletes empty virtual voice channels
 *
 * @param client - Discord client to scan guilds from
 */
async function loadExistingChannels(client: Client<true>) {
	try {
		const data = await readFile(config.persistence.filePath, "utf-8");
		const savedData = JSON.parse(data) as SavedChannelData;

		// Load data per guild
		for (const [guildId, channels] of Object.entries(savedData)) {
			const guildChannels = new Map<string, VirtualVoiceChannelData>();
			for (const [channelId, channelData] of Object.entries(channels)) {
				guildChannels.set(channelId, {
					...channelData,
					createdAt: new Date(channelData.createdAt),
				});
			}
			virtualVoiceChannelsByGuild.set(guildId, guildChannels);
		}
	} catch (error) {
		log("error", "Failed to load channels:", error);
		// File doesn't exist or is invalid
		virtualVoiceChannelsByGuild.clear();
	}

	// Track whether we need to save changes
	let needsSave = false;

	// Scan all guilds for existing temp channels and clean up
	const fetchChannelsPromises: Promise<void>[] = [];
	client.guilds.cache.forEach((guild) => {
		fetchChannelsPromises.push(
			(async () => {
				// Ensure we have a map for this guild
				if (!virtualVoiceChannelsByGuild.has(guild.id)) {
					virtualVoiceChannelsByGuild.set(guild.id, new Map());
				}
				const guildChannels = virtualVoiceChannelsByGuild.get(guild.id);
				if (!guildChannels) throw new Error("This should never happen");

				const channels = await guild.channels.fetch();

				// First, clean up non-existent channels from our tracking
				const channelsToRemove: string[] = [];
				for (const [channelId, _channelData] of guildChannels) {
					const channel = channels.get(channelId);
					if (!channel) {
						// Channel doesn't exist in Discord anymore
						channelsToRemove.push(channelId);
						log("info", `Removing non-existent channel ${channelId} from tracking`);
						needsSave = true;
					} else if (channel.isVoiceBased() && channel.name.startsWith(config.channelPrefix)) {
						// Channel exists and is a virtual voice channel
						// Check if it's empty and should be deleted
						const voiceChannel = channel as VoiceChannel;
						if (voiceChannel.members.size === 0 && config.behavior.autoDeleteEmpty) {
							try {
								await voiceChannel.delete("Cleaning up empty virtual voice channel on startup");
								channelsToRemove.push(channelId);
								log("info", `Deleted empty virtual voice channel: ${voiceChannel.name}`);
								needsSave = true;
							} catch (error) {
								log("error", `Failed to delete empty channel ${voiceChannel.name}:`, error);
							}
						}
					}
				}

				// Remove non-existent and deleted channels from tracking
				for (const channelId of channelsToRemove) {
					guildChannels.delete(channelId);
				}

				// Look for existing virtual voice channels in case of desync
				channels.forEach((channel) => {
					if (channel == null) return;

					if (channel.isVoiceBased() && channel.name.startsWith(config.channelPrefix)) {
						const match = channel.name.match(new RegExp(`^${config.channelPrefix}(\\d+)︱`));
						if (match) {
							// Only add if not already tracked
							if (!guildChannels.has(channel.id)) {
								guildChannels.set(channel.id, {
									id: channel.id,
									guildId: guild.id,
									ownerId: channel.members.first()?.id || "",
									channelNumber: parseInt(match[1] as string, 10),
									createdAt: new Date(),
								});
								needsSave = true;
							}
						}
					}
				});
			})(),
		);
	});
	await Promise.all(fetchChannelsPromises);

	// Save if we made any changes
	if (needsSave) {
		await saveVirtualVoiceChannels();
		log("info", "Updated virtual voice channels persistence after cleanup");
	}
}

/**
 * Save current virtual voice channel state to persistence file
 *
 * Saves all virtual voice channels across all guilds to a JSON file
 * to survive bot restarts and maintain channel ownership
 */
async function saveVirtualVoiceChannels() {
	try {
		const data: SavedChannelData = {};

		// Save data organized by guild
		for (const [guildId, guildChannels] of virtualVoiceChannelsByGuild) {
			data[guildId] = {};
			for (const [channelId, channelData] of guildChannels) {
				data[guildId][channelId] = {
					...channelData,
					createdAt: channelData.createdAt.toISOString(),
				};
			}
		}

		await writeFile(config.persistence.filePath, JSON.stringify(data, null, 2));
	} catch (error) {
		log("error", "Failed to save channels:", error);
	}
}
/**
 * Generate permission overwrites for a new virtual voice channel
 *
 * Permissions:
 * - Owner: Full control (manage, move members, etc.)
 * - Verified users: Can view and join
 * - Everyone else: Cannot view
 *
 * @param state - Voice state of the channel creator
 * @returns Array of permission overwrites
 */
async function getVirtualVoiceChannelPermissions(state: VoiceState): Promise<readonly OverwriteResolvable[]> {
	const everyoneRole = await RoleManager.getRole(state.guild, "EVERYONE");
	if (!everyoneRole) {
		log("error", "Everyone role not found in guild", state.guild.id);
		await reportError(state.guild, "getVirtualVoiceChannelPermissions", "Everyone role not found in guild");
		return [];
	}

	const verifiedRole = await RoleManager.getRole(state.guild, "VERIFIED");
	if (!verifiedRole) {
		log("error", "Verified role not found in guild", state.guild.id);
		await reportError(state.guild, "getVirtualVoiceChannelPermissions", "Verified role not found in guild");
		return [];
	}

	const permissions: OverwriteResolvable[] = [
		{
			// Deny everyone by default
			id: everyoneRole.id,
			type: OverwriteType.Role,
			deny: [PermissionFlagsBits.ViewChannel],
		},
	];

	// Add owner permissions if configured
	if (state.member?.id) {
		if (config.permissions.ownerFullControl) {
			permissions.push({
				// Give owner full control
				id: state.member.id,
				type: OverwriteType.Member,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.Connect,
					PermissionFlagsBits.ManageChannels,
					PermissionFlagsBits.MoveMembers,
					PermissionFlagsBits.MuteMembers,
					PermissionFlagsBits.DeafenMembers,
					PermissionFlagsBits.Stream,
					PermissionFlagsBits.Speak,
				],
			});
		} else {
			// Basic owner permissions only
			permissions.push({
				id: state.member.id,
				type: OverwriteType.Member,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.Connect,
					PermissionFlagsBits.Stream,
					PermissionFlagsBits.Speak,
				],
			});
		}
	}

	// Add verified role permissions if configured
	if (config.permissions.allowVerified) {
		permissions.push({
			// Give Verified access
			id: verifiedRole.id,
			type: OverwriteType.Role,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.Connect,
				PermissionFlagsBits.Stream,
				PermissionFlagsBits.Speak,
			],
		});
	}

	return permissions;
}

/**
 * Create a new virtual voice channel for a user
 *
 * Process:
 * 1. Find an available channel number (202-299)
 * 2. Create channel with owner permissions
 * 3. Move user to their new channel
 * 4. Track channel in memory and persistence
 *
 * @param state - Voice state of the user who triggered creation
 */
async function createVirtualVoiceChannel(state: VoiceState) {
	const member = state.member;
	if (!member || !state.guild) return;

	try {
		// Find available channel number
		const channelNumber = findAvailableNumber(state.guild);
		const channelName = `${config.channelPrefix}${channelNumber}︱${member.user.username}`;

		// Build permission overwrites
		const permissionOverwrites = await getVirtualVoiceChannelPermissions(state);

		// Calculate position
		const position = await calculateChannelPosition(state.guild, state.channel?.parent?.id || null, channelNumber);

		// Create the channel
		const virtualChannel = await state.guild.channels.create({
			name: channelName,
			type: ChannelType.GuildVoice,
			parent: state.channel?.parent,
			permissionOverwrites,
			position,
		});

		// Track the channel for this guild
		if (!virtualVoiceChannelsByGuild.has(state.guild.id)) {
			virtualVoiceChannelsByGuild.set(state.guild.id, new Map());
		}
		const guildChannels = virtualVoiceChannelsByGuild.get(state.guild.id) ?? new Map();
		guildChannels.set(virtualChannel.id, {
			id: virtualChannel.id,
			guildId: state.guild.id,
			ownerId: member.id,
			channelNumber,
			createdAt: new Date(),
		});
		await saveVirtualVoiceChannels();

		// Move user to the new channel
		await member.voice.setChannel(virtualChannel);

		log("info", `Created virtual voice channel: ${channelName}`);
	} catch (error) {
		log("error", "Failed to create virtual voice channel:", error);
	}
}

/**
 * Calculate the position for a new virtual voice channel based on its number
 *
 * Channels are sorted numerically within their category:
 * - Permanent channels first (201, trigger)
 * - Virtual voice channels sorted by number (202-299)
 *
 * @param guild - Guild containing the channels
 * @param parentId - Parent category ID
 * @param channelNumber - Number assigned to the new channel
 * @returns Calculated position for the channel
 */
async function calculateChannelPosition(guild: Guild, parentId: string | null, channelNumber: number) {
	const voiceChatChatChannel = ChannelManager.getChannel(guild, "VOICE_CHATCHAT");
	if (!voiceChatChatChannel) {
		log("error", "VOICE_CHATCHAT channel not found in guild", guild.id);
		await reportError(guild, "calculateChannelPosition", "VOICE_CHATCHAT channel not found in guild");
		return 0;
	}

	const voiceCreateTriggerChannel = ChannelManager.getChannel(guild, "VOICE_CREATE_TRIGGER");
	if (!voiceCreateTriggerChannel) {
		log("error", "VOICE_CREATE_TRIGGER channel not found in guild", guild.id);
		await reportError(guild, "calculateChannelPosition", "VOICE_CREATE_TRIGGER channel not found in guild");
		return 0;
	}

	const voiceChannelsInCategory = guild.channels.cache
		.filter((ch) => ch.isVoiceBased() && ch.parentId === parentId)
		.sort((a, b) => (a as VoiceChannel).position - (b as VoiceChannel).position) as Collection<string, VoiceChannel>;

	// Find numbered channels
	const numberedChannels: { channel: VoiceChannel; number: number }[] = [];

	for (const channel of voiceChannelsInCategory.values()) {
		// Skip permanent channels
		if (channel.id === voiceChatChatChannel.id || channel.id === voiceCreateTriggerChannel.id) {
			continue;
		}

		const match = channel.name.match(new RegExp(`^${config.channelPrefix}(\\d+)︱`));
		if (match) {
			const existingNumber = parseInt(match[1] as string, 10);
			numberedChannels.push({ channel, number: existingNumber });
		}
	}

	// Sort by number
	numberedChannels.sort((a, b) => a.number - b.number);

	// Find position
	let position = 2; // After permanent channels

	for (const { channel, number } of numberedChannels) {
		if (channelNumber < number) {
			return channel.position;
		}
		position = channel.position + 1;
	}

	return position;
}

/**
 * Find the next available channel number for a guild
 *
 * Scans both in-memory tracking and actual Discord channels
 * to find unused numbers between minChannelNumber and maxChannelNumber
 *
 * @param guild - Guild to check for available numbers
 * @returns First available number, or minChannelNumber if all taken
 */
function findAvailableNumber(guild: Guild): number {
	const usedNumbers = new Set<number>();

	// Collect all used numbers for this specific guild
	const guildChannels = virtualVoiceChannelsByGuild.get(guild.id);
	if (guildChannels) {
		for (const data of guildChannels.values()) {
			usedNumbers.add(data.channelNumber);
		}
	}

	// Also check existing channels in case of desync
	guild.channels.cache.forEach((channel) => {
		if (channel.isVoiceBased() && channel.name.startsWith(config.channelPrefix)) {
			const match = channel.name.match(new RegExp(`^${config.channelPrefix}(\\d+)︱`));
			if (match) {
				usedNumbers.add(parseInt(match[1] as string, 10));
			}
		}
	});

	// Find first available number
	for (let num = config.numbering.min; num <= config.numbering.max; num++) {
		if (!usedNumbers.has(num)) {
			return num;
		}
	}

	// All numbers taken, return minimum // TODO: What should we do here?
	return config.numbering.min;
}

/**
 * Check if a virtual voice channel is empty and delete it if so
 *
 * Called when users leave voice channels to clean up empty virtual voice channels
 *
 * @param channelId - ID of the channel to check
 * @param guild - Guild containing the channel
 */
async function checkAndDeleteEmptyChannel(channelId: string, guild: Guild) {
	const guildChannels = virtualVoiceChannelsByGuild.get(guild.id);
	if (!guildChannels) return;

	const virtualChannelData = guildChannels.get(channelId);
	if (!virtualChannelData) return;

	const channel = guild.channels.cache.get(channelId) as VoiceChannel;
	if (!channel || !channel.isVoiceBased()) return;

	// Check if channel is empty
	if (channel.members.size === 0) {
		// Only delete if auto-delete is enabled
		if (config.behavior.autoDeleteEmpty) {
			await deleteVirtualVoiceChannel(channel);
		}
	}
}

/**
 * Delete a virtual voice channel and clean up tracking data
 *
 * Removes channel from:
 * - Discord server
 * - In-memory tracking
 * - Persistence file
 *
 * @param channel - Voice channel to delete
 */
async function deleteVirtualVoiceChannel(channel: VoiceChannel) {
	try {
		const channelName = channel.name;
		const guildId = channel.guild.id;

		await channel.delete("Virtual Voice Channel is empty");

		// Remove from the correct guild's map
		const guildChannels = virtualVoiceChannelsByGuild.get(guildId);
		if (guildChannels) {
			guildChannels.delete(channel.id);
		}

		await saveVirtualVoiceChannels();

		log("info", `Deleted empty virtual voice channel: ${channelName} in guild ${guildId}`);
	} catch (error) {
		log("error", "Failed to delete virtual voice channel:", error);
	}
}

/**
 * Data structure for tracking virtual voice channels
 */
interface VirtualVoiceChannelData {
	/** Discord channel ID */
	id: string;
	/** Guild ID this channel belongs to */
	guildId: string;
	/** User ID of the channel owner */
	ownerId: string;
	/** Assigned number (202-299) for sorting and identification */
	channelNumber: number;
	/** Timestamp when channel was created */
	createdAt: Date;
}

/**
 * Structure for persisting channel data to JSON file
 * Organized by guild ID for multi-guild support
 */
interface SavedChannelData {
	/** Channels organized by guild */
	[guildId: string]: {
		/** Channel data by channel ID */
		[channelId: string]: Omit<VirtualVoiceChannelData, "createdAt"> & { createdAt: string };
	};
}
