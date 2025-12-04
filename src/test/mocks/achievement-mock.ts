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

	void mock.module("../../client/client.ts", () => ({
		dbUserExists: mockDbUserExists,
		getDbUser: mockGetDbUser,
		orpc: testClient.client,
	}));

	void mock.module("../../util", () => ({
		DISCORD_CHANNELS,
		reportError: mock(),
	}));

	void mock.module("node:fs/promises", () => ({
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

	// Also create BOT_LOG channel (may be used by other achievements for error reporting)
	const mockBotLogChannel = createMockChannel(mockGuild, DISCORD_CHANNELS.BOT_LOG.id, "bot-log");
	mockBotLogChannel.isTextBased = () => true;
	mockBotLogChannel.send = mock().mockResolvedValue({
		id: "message-id",
		components: [],
	});

	mockGuild.channels.cache.set(DISCORD_CHANNELS.BOT_LOG.id, mockBotLogChannel);

	// Create test member
	const testMember = createMockMember(mockGuild, {
		user: { id: "test-user-id", username: "TestUser" },
	});

	// Mock user.fetch to return user with primaryGuild data
	const mockUserFetch = mock().mockImplementation(async () => {
		return testMember.user;
	});
	(testMember.user as any).fetch = mockUserFetch;

	// Set up members - fetch can be called with a discordId string or no args
	const membersMap = new Map();
	membersMap.set("test-user-id", testMember);
	const membersFetchMock = mock().mockImplementation(async (idOrOptions?: string | object) => {
		if (typeof idOrOptions === "string") {
			// Called with a specific discordId - return the member if found
			if (idOrOptions === "test-user-id") {
				return testMember;
			}
			throw new Error("Member not found");
		}
		// Called without args or with options - return all members
		return membersMap;
	});
	mockGuild.members = {
		cache: membersMap,
		fetch: membersFetchMock,
	};

	// Set up default response for getAllDiscordIds
	orpcMock.setCustomResponse("users.getAllDiscordIds", [
		{ id: 123, discordId: "test-user-id" },
	]);

	// Set up premium subscriber role (booster role) with members - kept for backwards compatibility
	const boosterMembersMap = new Map();
	boosterMembersMap.set("test-user-id", testMember);
	const premiumSubscriberRole = {
		id: "booster-role-id",
		name: "Server Booster",
		members: boosterMembersMap,
	};
	mockGuild.roles.premiumSubscriberRole = premiumSubscriberRole;

	const guildsCache = new Map([["test-guild-id", mockGuild]]);
	(guildsCache as any).first = () => mockGuild;

	const eventListeners = new Map<string, Array<(...args: any[]) => void>>();

	const mockClient = {
		guilds: {
			cache: guildsCache,
			first: () => mockGuild,
		},
		on: (event: string, listener: (...args: any[]) => void) => {
			if (!eventListeners.has(event)) {
				eventListeners.set(event, []);
			}
			eventListeners.get(event)?.push(listener);
			return mockClient;
		},
		emit: (event: string, ...args: any[]) => {
			const listeners = eventListeners.get(event);
			if (listeners) {
				for (const listener of listeners) {
					listener(...args);
				}
			}
			return true;
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
