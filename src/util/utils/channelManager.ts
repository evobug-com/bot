import type {
	Guild,
	GuildBasedChannel,
	MessageCreateOptions,
	MessagePayload,
	TextChannel,
	VoiceChannel,
} from "discord.js";
import { DISCORD_CHANNELS, getChannelByConfig } from "../config/channels.js";
import { reportError } from "../config/roles.js";

export class ChannelManager {
	private static channelCache = new Map<string, string>(); // channelKey -> actualChannelId

	/**
	 * Get a channel with automatic fallback and error reporting
	 */
	static getChannel(guild: Guild, channelKey: keyof typeof DISCORD_CHANNELS): GuildBasedChannel | null {
		const channelConfig = DISCORD_CHANNELS[channelKey];
		const cacheKey = `${guild.id}-${channelKey}`;

		// Check cache first
		const cachedId = ChannelManager.channelCache.get(cacheKey);
		if (cachedId) {
			const channel = guild.channels.cache.get(cachedId);
			if (channel) return channel;
		}

		const result = getChannelByConfig(guild, channelConfig);

		if (!result) {
			void reportError(
				guild,
				"Channel Not Found",
				`Channel "${channelConfig.name}" (${channelKey}) not found in guild`,
				{ expectedId: channelConfig.id, channelName: channelConfig.name },
			);
			return null;
		}

		// Update cache
		ChannelManager.channelCache.set(cacheKey, result.channel.id);

		// Report if ID changed
		if (result.updated) {
			void reportError(
				guild,
				"Channel ID Changed",
				`Channel "${channelConfig.name}" has a different ID than expected`,
				{
					expectedId: channelConfig.id,
					actualId: result.channel.id,
					channelName: channelConfig.name,
					action: "Please update the channel configuration",
				},
			);
		}

		return result.channel;
	}

	/**
	 * Get a text channel specifically
	 */
	static getTextChannel(guild: Guild, channelKey: keyof typeof DISCORD_CHANNELS): TextChannel | null {
		const channel = ChannelManager.getChannel(guild, channelKey);

		if (!channel) return null;

		if (!channel.isTextBased() || channel.isThread()) {
			void reportError(
				guild,
				"Invalid Channel Type",
				`Channel "${DISCORD_CHANNELS[channelKey].name}" is not a text channel`,
				{
					channelId: channel.id,
					channelType: channel.type,
					expectedType: "TextChannel",
				},
			);
			return null;
		}

		return channel as TextChannel;
	}

	/**
	 * Get a voice channel specifically
	 */
	static getVoiceChannel(guild: Guild, channelKey: keyof typeof DISCORD_CHANNELS): VoiceChannel | null {
		const channel = ChannelManager.getChannel(guild, channelKey);

		if (!channel) return null;

		if (!channel.isVoiceBased() || channel.isThread()) {
			void reportError(
				guild,
				"Invalid Channel Type",
				`Channel "${DISCORD_CHANNELS[channelKey].name}" is not a voice channel`,
				{
					channelId: channel.id,
					channelType: channel.type,
					expectedType: "VoiceChannel",
				},
			);
			return null;
		}

		return channel as VoiceChannel;
	}

	/**
	 * Send a message to a text channel with error handling
	 */
	static async sendMessage(
		guild: Guild,
		channelKey: keyof typeof DISCORD_CHANNELS,
		message: string | MessageCreateOptions | MessagePayload,
	): Promise<boolean> {
		try {
			const channel = ChannelManager.getTextChannel(guild, channelKey);
			if (!channel) {
				throw new Error(`Channel ${channelKey} not found or not a text channel`);
			}

			await channel.send(message);
			return true;
		} catch (error) {
			const channelConfig = DISCORD_CHANNELS[channelKey];
			await reportError(guild, "Failed to Send Message", `Could not send message to channel "${channelConfig.name}"`, {
				channelKey,
				error: error instanceof Error ? error.message : String(error),
			});
			return false;
		}
	}

	/**
	 * Check if a channel exists in the guild
	 */
	static async exists(guild: Guild, channelKey: keyof typeof DISCORD_CHANNELS): Promise<boolean> {
		const channel = ChannelManager.getChannel(guild, channelKey);
		return channel !== null;
	}

	/**
	 * Clear the cache for a specific guild (useful after channel updates)
	 */
	static clearCache(guildId: string): void {
		const keysToDelete: string[] = [];
		for (const key of ChannelManager.channelCache.keys()) {
			if (key.startsWith(`${guildId}-`)) {
				keysToDelete.push(key);
			}
		}
		keysToDelete.forEach((key) => {
			ChannelManager.channelCache.delete(key);
		});
	}
}
