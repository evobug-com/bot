import { describe, expect, it } from "bun:test";
import type { APIApplicationCommandStringOption } from "discord.js";
import { ChannelType } from "discord.js";
import {
	createMockGuild,
	createMockInteraction,
	MockChatInputCommandInteraction,
	type MockGuild,
} from "../test/mocks/discord-mock.ts";
import { data, execute } from "./export-rooms.ts";

// Get the serialized command data
const commandData = data.toJSON();

// Helper to create mock channels with different types
interface MockChannelOptions {
	id: string;
	name: string;
	type: ChannelType;
	topic?: string | null;
	parentId?: string | null;
	position?: number;
}

function createMockChannel(guild: MockGuild, options: MockChannelOptions) {
	return {
		id: options.id,
		name: options.name,
		type: options.type,
		topic: options.topic ?? null,
		parentId: options.parentId ?? null,
		position: options.position ?? 0,
		guild,
	};
}

describe("export-rooms command", () => {
	describe("command structure", () => {
		it("should have correct command name", () => {
			expect(commandData.name).toBe("export-rooms");
		});

		it("should have Czech localization for name", () => {
			expect(commandData.name_localizations?.cs).toBe("exportuj-místnosti");
		});

		it("should have description", () => {
			expect(commandData.description).toBeDefined();
			expect(commandData.description.length).toBeGreaterThan(0);
		});

		it("should require ManageChannels permission", () => {
			// ManageChannels = 1 << 4 = 16
			expect(commandData.default_member_permissions).toBe("16");
		});
	});

	describe("options", () => {
		const options = commandData.options ?? [];

		it("should have format option", () => {
			const formatOption = options.find((o) => o.name === "format") as APIApplicationCommandStringOption | undefined;

			expect(formatOption).toBeDefined();
			expect(formatOption?.required).toBeFalsy();
			expect(formatOption?.choices).toHaveLength(3);
			expect(formatOption?.choices?.map((c) => c.value)).toEqual(["csv", "json", "text"]);
		});

		it("should have type filter option", () => {
			const typeOption = options.find((o) => o.name === "type") as APIApplicationCommandStringOption | undefined;

			expect(typeOption).toBeDefined();
			expect(typeOption?.required).toBeFalsy();
			expect(typeOption?.choices).toHaveLength(5);
			expect(typeOption?.choices?.map((c) => c.value)).toEqual(["all", "text", "voice", "category", "forum"]);
		});

		it("should have Czech localizations for options", () => {
			const formatOption = options.find((o) => o.name === "format");
			const typeOption = options.find((o) => o.name === "type");

			expect(formatOption?.name_localizations?.cs).toBe("formát");
			expect(typeOption?.name_localizations?.cs).toBe("typ");
		});
	});
});

describe("export-rooms command execution", () => {
	function createGuildWithChannels(): MockGuild {
		const mockGuild = createMockGuild({
			id: "test-guild-id",
			name: "Test Guild",
		});

		// Create mock channels
		const channels = new Map();

		// Category
		channels.set(
			"cat-1",
			createMockChannel(mockGuild, {
				id: "cat-1",
				name: "General",
				type: ChannelType.GuildCategory,
				position: 0,
			}),
		);

		// Text channels
		channels.set(
			"text-1",
			createMockChannel(mockGuild, {
				id: "text-1",
				name: "general-chat",
				type: ChannelType.GuildText,
				topic: "General discussion",
				parentId: "cat-1",
				position: 0,
			}),
		);

		channels.set(
			"text-2",
			createMockChannel(mockGuild, {
				id: "text-2",
				name: "announcements",
				type: ChannelType.GuildAnnouncement,
				topic: "Important announcements",
				parentId: "cat-1",
				position: 1,
			}),
		);

		// Voice channel
		channels.set(
			"voice-1",
			createMockChannel(mockGuild, {
				id: "voice-1",
				name: "Voice Chat",
				type: ChannelType.GuildVoice,
				parentId: "cat-1",
				position: 2,
			}),
		);

		// Forum channel
		channels.set(
			"forum-1",
			createMockChannel(mockGuild, {
				id: "forum-1",
				name: "help-forum",
				type: ChannelType.GuildForum,
				topic: "Ask for help here",
				position: 3,
			}),
		);

		mockGuild.channels.cache = channels;
		// Add values method to make it iterable
		channels.values = function () {
			return [...this.entries()].map(([_, v]) => v)[Symbol.iterator]();
		};
		channels.get = function (key: string) {
			for (const [k, v] of this.entries()) {
				if (k === key) return v;
			}
			return undefined;
		};

		return mockGuild;
	}

	describe("text format (default)", () => {
		it("should export channels in text format by default", async () => {
			const mockGuild = createGuildWithChannels();
			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: {},
			});
			(mockInteraction as MockChatInputCommandInteraction & { guild: MockGuild }).guild = mockGuild;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			expect(mockInteraction.deferred).toBe(true);
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Exported");
			expect(response.files).toHaveLength(1);
			expect(response.files[0].name).toBe("channels.txt");
		});
	});

	describe("csv format", () => {
		it("should export channels in CSV format", async () => {
			const mockGuild = createGuildWithChannels();
			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { format: "csv" },
			});
			(mockInteraction as MockChatInputCommandInteraction & { guild: MockGuild }).guild = mockGuild;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			const response = mockInteraction.getLastResponse();
			expect(response.files[0].name).toBe("channels.csv");

			const content = response.files[0].attachment.toString("utf-8");
			expect(content).toContain("Name,Type,Category,Description");
		});
	});

	describe("json format", () => {
		it("should export channels in JSON format", async () => {
			const mockGuild = createGuildWithChannels();
			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { format: "json" },
			});
			(mockInteraction as MockChatInputCommandInteraction & { guild: MockGuild }).guild = mockGuild;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			const response = mockInteraction.getLastResponse();
			expect(response.files[0].name).toBe("channels.json");

			const content = response.files[0].attachment.toString("utf-8");
			const parsed = JSON.parse(content) as { name: string; type: string }[];
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed.length).toBeGreaterThan(0);
			expect(parsed[0]).toHaveProperty("name");
			expect(parsed[0]).toHaveProperty("type");
		});
	});

	describe("type filtering", () => {
		it("should filter by text channels", async () => {
			const mockGuild = createGuildWithChannels();
			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { format: "json", type: "text" },
			});
			(mockInteraction as MockChatInputCommandInteraction & { guild: MockGuild }).guild = mockGuild;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			const response = mockInteraction.getLastResponse();
			const content = response.files[0].attachment.toString("utf-8");
			const parsed = JSON.parse(content) as { type: string }[];

			for (const channel of parsed) {
				expect(["Text", "Announcement"]).toContain(channel.type);
			}
		});

		it("should filter by voice channels", async () => {
			const mockGuild = createGuildWithChannels();
			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { format: "json", type: "voice" },
			});
			(mockInteraction as MockChatInputCommandInteraction & { guild: MockGuild }).guild = mockGuild;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			const response = mockInteraction.getLastResponse();
			const content = response.files[0].attachment.toString("utf-8");
			const parsed = JSON.parse(content) as { type: string }[];

			for (const channel of parsed) {
				expect(["Voice", "Stage"]).toContain(channel.type);
			}
		});

		it("should filter by category", async () => {
			const mockGuild = createGuildWithChannels();
			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { format: "json", type: "category" },
			});
			(mockInteraction as MockChatInputCommandInteraction & { guild: MockGuild }).guild = mockGuild;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			const response = mockInteraction.getLastResponse();
			const content = response.files[0].attachment.toString("utf-8");
			const parsed = JSON.parse(content) as { type: string }[];

			for (const channel of parsed) {
				expect(channel.type).toBe("Category");
			}
		});
	});

	describe("error handling", () => {
		it("should fail when used outside a guild", async () => {
			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: {},
			});
			// Simulate no guild
			(mockInteraction as MockChatInputCommandInteraction & { guild: null }).guild = null;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("only be used in a server");
		});

		it("should handle empty channel list with filter", async () => {
			const mockGuild = createMockGuild({
				id: "test-guild-id",
				name: "Test Guild",
			});
			// Empty channels cache
			mockGuild.channels.cache = new Map();
			mockGuild.channels.cache.values = function () {
				return [][Symbol.iterator]();
			};

			const mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { type: "voice" },
			});
			(mockInteraction as MockChatInputCommandInteraction & { guild: MockGuild }).guild = mockGuild;

			await execute({
				interaction: mockInteraction as unknown as Parameters<typeof execute>[0]["interaction"],
				dbUser: { id: 1, discordId: "test-user-id" } as Parameters<typeof execute>[0]["dbUser"],
			});

			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("No channels found");
		});
	});
});
