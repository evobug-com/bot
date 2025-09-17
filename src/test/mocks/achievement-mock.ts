import { mock } from "bun:test";
import type { Client, Guild, GuildMember } from "discord.js";
import { DISCORD_CHANNELS } from "../../util";
import { createMockChannel, createMockGuild, createMockMember } from "./discord-mock.ts";
import { createTestORPCClient, type MockORPCClient } from "./orpc-mock.ts";

export interface AchievementTestSetup {
	mockClient: Client<true>;
	mockGuild: Guild;
	mockChannel: any;
	orpcMock: MockORPCClient;
	testMember: GuildMember;
	mockSetTimeout: ReturnType<typeof mock>;
	mockSetInterval: ReturnType<typeof mock>;
	mockConsoleLog: ReturnType<typeof mock>;
	mockConsoleError: ReturnType<typeof mock>;
	mockReadFile: ReturnType<typeof mock>;
	mockWriteFile: ReturnType<typeof mock>;
	mockMkdir: ReturnType<typeof mock>;
}

export function createAchievementTestSetup(): AchievementTestSetup {
	// Create mocks
	const mockSetTimeout = mock();
	const mockSetInterval = mock();
	const mockConsoleLog = mock();
	const mockConsoleError = mock();
	const mockReadFile = mock();
	const mockWriteFile = mock();
	const mockMkdir = mock();

	// Replace global functions
	global.setTimeout = mockSetTimeout as any;
	global.setInterval = mockSetInterval as any;
	console.log = mockConsoleLog;
	console.error = mockConsoleError;

	// Create ORPC mock
	const testClient = createTestORPCClient({ seed: 123 });
	const orpcMock = testClient.mock;

	// Mock modules
	const mockDbUserExists = mock();
	const mockGetDbUser = mock();
	mockDbUserExists.mockResolvedValue(true);
	mockGetDbUser.mockImplementation((guild: any, member: any) => {
		// Return different user IDs based on member ID
		const userId = member?.user?.id || member?.id;
		if (userId === "user-2") {
			return Promise.resolve({ id: 456, discordId: "user-2" });
		}
		return Promise.resolve({ id: 123, discordId: "test-user-id" });
	});

	mock.module("../../client/client.ts", () => ({
		dbUserExists: mockDbUserExists,
		getDbUser: mockGetDbUser,
		orpc: testClient.client,
	}));

	mock.module("../../util", () => ({
		DISCORD_CHANNELS,
		reportError: mock(),
	}));

	mock.module("node:fs/promises", () => ({
		readFile: mockReadFile,
		writeFile: mockWriteFile,
		mkdir: mockMkdir,
	}));

	// Create test objects
	const mockGuild = createMockGuild({
		id: "test-guild-id",
		name: "Test Guild",
	});

	// Create COMMANDS channel (used by serverTagStreak)
	const mockChannel = createMockChannel(mockGuild, DISCORD_CHANNELS.COMMANDS.id, "commands");
	mockChannel.isTextBased = () => true;
	mockChannel.send = mock().mockResolvedValue({
		id: "message-id",
		components: [],
	});

	mockGuild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, mockChannel);

	// Also create BOT_INFO channel (may be used by other achievements)
	const mockBotInfoChannel = createMockChannel(mockGuild, DISCORD_CHANNELS.BOT_INFO.id, "bot-info");
	mockBotInfoChannel.isTextBased = () => true;
	mockBotInfoChannel.send = mock().mockResolvedValue({
		id: "message-id",
		components: [],
	});

	mockGuild.channels.cache.set(DISCORD_CHANNELS.BOT_INFO.id, mockBotInfoChannel);

	// Create test member
	const testMember = createMockMember(mockGuild, {
		user: { id: "test-user-id", username: "TestUser" },
	});

	// Set up members
	const membersMap = new Map();
	membersMap.set("test-user-id", testMember);
	mockGuild.members = {
		cache: membersMap,
		fetch: mock().mockResolvedValue(undefined),
	};

	const guildsCache = new Map([["test-guild-id", mockGuild]]);
	(guildsCache as any).first = () => mockGuild;

	const mockClient = {
		guilds: {
			cache: guildsCache,
			first: () => mockGuild,
		},
	} as unknown as Client<true>;

	// Set up default file operations
	mockMkdir.mockResolvedValue(undefined);
	mockWriteFile.mockResolvedValue(undefined);
	mockReadFile.mockRejectedValue(new Error("File not found"));

	return {
		mockClient,
		mockGuild: mockGuild as any,
		mockChannel,
		orpcMock,
		testMember: testMember as any,
		mockSetTimeout,
		mockSetInterval,
		mockConsoleLog,
		mockConsoleError,
		mockReadFile,
		mockWriteFile,
		mockMkdir,
	};
}

export function restoreGlobalFunctions() {
	// Store these somewhere accessible or pass them through
	if (typeof global !== "undefined") {
		// Restore originals if they were stored
		// This is a simplified version - in real implementation you'd store originals
	}
}
