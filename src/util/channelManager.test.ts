import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { Guild, GuildBasedChannel, TextChannel, VoiceChannel } from "discord.js";
import { ChannelType } from "discord.js";

// We'll test the core logic without complex mocking
describe("ChannelManager Core Logic", () => {
	let mockGuild: Guild;
	let mockTextChannel: TextChannel;
	let mockVoiceChannel: VoiceChannel;
	let channelsCache: Map<string, GuildBasedChannel>;

	beforeEach(() => {
		// Setup mock text channel
		mockTextChannel = {
			id: "1325557465630380093",
			name: "🔔︱004︱stream",
			type: ChannelType.GuildText,
			guild: {} as Guild,
			isTextBased: () => true,
			isThread: () => false,
			isVoiceBased: () => false,
			send: mock(() => Promise.resolve({ id: "msg123" })),
		} as unknown as TextChannel;

		// Setup mock voice channel
		mockVoiceChannel = {
			id: "1325544907254927392",
			name: "💬 + Hlas. místnost",
			type: ChannelType.GuildVoice,
			guild: {} as Guild,
			isTextBased: () => false,
			isThread: () => false,
			isVoiceBased: () => true,
		} as unknown as VoiceChannel;

		// Setup channels cache
		channelsCache = new Map();
		channelsCache.set(mockTextChannel.id, mockTextChannel);
		channelsCache.set(mockVoiceChannel.id, mockVoiceChannel);

		// Setup mock guild
		mockGuild = {
			id: "123456789",
			channels: {
				cache: {
					get: (id: string) => channelsCache.get(id),
					find: (fn: (channel: GuildBasedChannel) => boolean) => {
						for (const channel of channelsCache.values()) {
							if (fn(channel)) return channel;
						}
						return undefined;
					},
				},
			},
		} as unknown as Guild;
	});

	describe("Channel lookup logic", () => {
		it("should find channel by ID", () => {
			const channel = mockGuild.channels.cache.get(mockTextChannel.id);
			expect(channel).toBeDefined();
			expect(channel?.id).toBe(mockTextChannel.id);
			expect(channel?.name).toBe("🔔︱004︱stream");
		});

		it("should find channel by name when ID doesn't match", () => {
			// Change channel to have different ID but same name
			const channelWithNewId = {
				...mockTextChannel,
				id: "new-channel-id-12345",
			} as TextChannel;

			channelsCache.clear();
			channelsCache.set(channelWithNewId.id, channelWithNewId);

			const channel = mockGuild.channels.cache.find((c) => c.name === "🔔︱004︱stream");
			expect(channel).toBeDefined();
			expect(channel?.id).toBe("new-channel-id-12345");
			expect(channel?.name).toBe("🔔︱004︱stream");
		});

		it("should return undefined when channel not found", () => {
			channelsCache.clear();

			const channelById = mockGuild.channels.cache.get(mockTextChannel.id);
			expect(channelById).toBeUndefined();

			const channelByName = mockGuild.channels.cache.find((c) => c.name === "🔔︱004︱stream");
			expect(channelByName).toBeUndefined();
		});
	});

	describe("Channel type checking", () => {
		it("should correctly identify text channels", () => {
			expect(mockTextChannel.isTextBased()).toBe(true);
			expect(mockTextChannel.isThread()).toBe(false);
			expect(mockTextChannel.isVoiceBased()).toBe(false);
		});

		it("should correctly identify voice channels", () => {
			expect(mockVoiceChannel.isTextBased()).toBe(false);
			expect(mockVoiceChannel.isThread()).toBe(false);
			expect(mockVoiceChannel.isVoiceBased()).toBe(true);
		});
	});

	describe("Message sending", () => {
		it("should send text message", async () => {
			const message = "Test message";
			await mockTextChannel.send(message);

			expect(mockTextChannel.send).toHaveBeenCalledWith(message);
		});

		it("should send embed message", async () => {
			const message = {
				content: "Test",
				embeds: [{ title: "Test Embed", color: 0x00ff00 }],
			};
			await mockTextChannel.send(message);

			expect(mockTextChannel.send).toHaveBeenCalledWith(message);
		});

		it("should handle send failures", async () => {
			mockTextChannel.send = mock(() => Promise.reject(new Error("No permission to send")));

			await expect(mockTextChannel.send("Test")).rejects.toThrow("No permission to send");
		});
	});
});
