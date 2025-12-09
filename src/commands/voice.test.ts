import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { APIApplicationCommandSubcommandOption, APIApplicationCommandUserOption } from "discord.js";
import { MessageFlags } from "discord.js";
import {
	createMockGuild,
	createMockInteraction,
	createMockMember,
	MockChatInputCommandInteraction,
	type MockGuild,
	type MockGuildMember,
} from "../test/mocks/discord-mock.ts";
import { data, execute } from "./voice";

// Get the serialized command data
const commandData = data.toJSON();

// Mock voice channel for testing
interface MockVoiceChannel {
	id: string;
	name: string;
	members: Map<string, MockGuildMember>;
	isVoiceBased: () => boolean;
	permissionOverwrites: {
		cache: Map<string, unknown>;
		edit: ReturnType<typeof mock>;
		delete: ReturnType<typeof mock>;
	};
}

function createMockVoiceChannel(guild: MockGuild, id: string, name: string): MockVoiceChannel {
	return {
		id,
		name,
		members: new Map(),
		isVoiceBased: () => true,
		permissionOverwrites: {
			cache: new Map(),
			edit: mock(async () => ({})),
			delete: mock(async () => ({})),
		},
	};
}

describe("voice command", () => {
	describe("command structure", () => {
		it("should have correct command name", () => {
			expect(commandData.name).toBe("voice");
		});

		it("should have Czech localization for name", () => {
			expect(commandData.name_localizations?.cs).toBe("hlas");
		});

		it("should have description", () => {
			expect(commandData.description).toBeDefined();
			expect(commandData.description.length).toBeGreaterThan(0);
		});
	});

	describe("subcommands", () => {
		const subcommands = commandData.options?.filter((opt) => opt.type === 1) ?? [];

		it("should have exactly 5 subcommands", () => {
			expect(subcommands).toHaveLength(5);
		});

		it("should have private subcommand", () => {
			const privateSubcmd = subcommands.find((s) => s.name === "private") as
				| APIApplicationCommandSubcommandOption
				| undefined;

			expect(privateSubcmd).toBeDefined();
			expect(privateSubcmd?.name_localizations?.cs).toBe("soukromý");
			expect(privateSubcmd?.description).toContain("private");
		});

		it("should have public subcommand", () => {
			const publicSubcmd = subcommands.find((s) => s.name === "public") as
				| APIApplicationCommandSubcommandOption
				| undefined;

			expect(publicSubcmd).toBeDefined();
			expect(publicSubcmd?.name_localizations?.cs).toBe("veřejný");
			expect(publicSubcmd?.description).toContain("visible");
		});

		it("should have invite subcommand with required user option", () => {
			const inviteSubcmd = subcommands.find((s) => s.name === "invite") as
				| APIApplicationCommandSubcommandOption
				| undefined;

			expect(inviteSubcmd).toBeDefined();
			expect(inviteSubcmd?.name_localizations?.cs).toBe("pozvat");

			const userOption = inviteSubcmd?.options?.find((o) => o.name === "user") as
				| APIApplicationCommandUserOption
				| undefined;

			expect(userOption).toBeDefined();
			expect(userOption?.required).toBe(true);
			expect(userOption?.type).toBe(6); // USER type
		});

		it("should have kick subcommand with required user option", () => {
			const kickSubcmd = subcommands.find((s) => s.name === "kick") as
				| APIApplicationCommandSubcommandOption
				| undefined;

			expect(kickSubcmd).toBeDefined();
			expect(kickSubcmd?.name_localizations?.cs).toBe("vyhodit");

			const userOption = kickSubcmd?.options?.find((o) => o.name === "user") as
				| APIApplicationCommandUserOption
				| undefined;

			expect(userOption).toBeDefined();
			expect(userOption?.required).toBe(true);
			expect(userOption?.type).toBe(6); // USER type
		});

		it("should have status subcommand", () => {
			const statusSubcmd = subcommands.find((s) => s.name === "status") as
				| APIApplicationCommandSubcommandOption
				| undefined;

			expect(statusSubcmd).toBeDefined();
			expect(statusSubcmd?.name_localizations?.cs).toBe("stav");
			expect(statusSubcmd?.description).toContain("status");
		});
	});

	describe("subcommand order", () => {
		const subcommandNames = commandData.options?.filter((opt) => opt.type === 1).map((s) => s.name) ?? [];

		it("should have subcommands in expected order", () => {
			expect(subcommandNames).toEqual(["private", "public", "invite", "kick", "status"]);
		});
	});

	describe("localizations", () => {
		const subcommands = commandData.options?.filter((opt) => opt.type === 1) ?? [];

		it("should have Czech localizations for all subcommands", () => {
			for (const subcommand of subcommands) {
				expect(subcommand.name_localizations?.cs).toBeDefined();
				expect(subcommand.description_localizations?.cs).toBeDefined();
			}
		});

		it("should have Czech localizations for user options", () => {
			const inviteSubcmd = subcommands.find((s) => s.name === "invite") as
				| APIApplicationCommandSubcommandOption
				| undefined;
			const kickSubcmd = subcommands.find((s) => s.name === "kick") as
				| APIApplicationCommandSubcommandOption
				| undefined;

			const inviteUserOpt = inviteSubcmd?.options?.find((o) => o.name === "user");
			const kickUserOpt = kickSubcmd?.options?.find((o) => o.name === "user");

			expect(inviteUserOpt?.name_localizations?.cs).toBe("uživatel");
			expect(kickUserOpt?.name_localizations?.cs).toBe("uživatel");
		});
	});
});

describe("voice command execution", () => {
	let mockGuild: MockGuild;
	let mockMember: MockGuildMember;
	let mockVoiceChannel: MockVoiceChannel;
	let mockInteraction: MockChatInputCommandInteraction;

	// Store mocks for handler functions
	let mockGetChannelOwner: ReturnType<typeof mock>;
	let mockIsVirtualVoiceChannel: ReturnType<typeof mock>;
	let mockIsChannelPrivate: ReturnType<typeof mock>;
	let mockMakeChannelPrivate: ReturnType<typeof mock>;
	let mockMakeChannelPublic: ReturnType<typeof mock>;
	let mockInviteUserToChannel: ReturnType<typeof mock>;
	let mockKickUserFromChannel: ReturnType<typeof mock>;

	beforeEach(() => {
		// Create mock guild and member
		mockGuild = createMockGuild({
			id: "test-guild-id",
			name: "Test Guild",
		});

		mockMember = createMockMember(mockGuild, {
			user: { id: "test-user-id", username: "TestUser" },
		});

		// Create mock voice channel
		mockVoiceChannel = createMockVoiceChannel(mockGuild, "test-voice-channel-id", "🗯︱202︱TestUser");
		mockVoiceChannel.members.set("test-user-id", mockMember);

		// Set up member with voice state
		(mockMember as any).voice = {
			channel: mockVoiceChannel,
		};

		// Create handler mocks
		mockGetChannelOwner = mock(() => "test-user-id");
		mockIsVirtualVoiceChannel = mock(() => true);
		mockIsChannelPrivate = mock(async () => false);
		mockMakeChannelPrivate = mock(async () => {});
		mockMakeChannelPublic = mock(async () => {});
		mockInviteUserToChannel = mock(async () => {});
		mockKickUserFromChannel = mock(async () => {});

		// Mock the handler module
		void mock.module("../handlers/handleVirtualVoiceChannels.ts", () => ({
			getChannelOwner: mockGetChannelOwner,
			isVirtualVoiceChannel: mockIsVirtualVoiceChannel,
			isChannelPrivate: mockIsChannelPrivate,
			makeChannelPrivate: mockMakeChannelPrivate,
			makeChannelPublic: mockMakeChannelPublic,
			inviteUserToChannel: mockInviteUserToChannel,
			kickUserFromChannel: mockKickUserFromChannel,
		}));
	});

	afterEach(() => {
		mock.restore();
	});

	describe("/voice private", () => {
		it("should fail when user is not in a voice channel", async () => {
			// Member not in voice channel
			(mockMember as any).voice = { channel: null };

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "private" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockInteraction.replied).toBe(true);
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Musíš být v hlasovém kanálu");
			expect(response.flags).toBe(MessageFlags.Ephemeral);
		});

		it("should fail when channel is not a virtual voice channel", async () => {
			mockIsVirtualVoiceChannel.mockReturnValue(false);

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "private" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockInteraction.replied).toBe(true);
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("pouze v dočasných hlasových kanálech");
		});

		it("should fail when user is not the channel owner", async () => {
			mockGetChannelOwner.mockReturnValue("different-user-id");

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "private" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockInteraction.replied).toBe(true);
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Nejsi vlastníkem");
		});

		it("should make channel private successfully", async () => {
			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "private" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockInteraction.deferred).toBe(true);
			expect(mockMakeChannelPrivate).toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("soukromý");
		});

		it("should show message when channel is already private", async () => {
			mockIsChannelPrivate.mockResolvedValue(true);

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "private" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockMakeChannelPrivate).not.toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("už je soukromý");
		});
	});

	describe("/voice public", () => {
		it("should make channel public successfully", async () => {
			mockIsChannelPrivate.mockResolvedValue(true);

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "public" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockMakeChannelPublic).toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("veřejný");
		});

		it("should show message when channel is already public", async () => {
			mockIsChannelPrivate.mockResolvedValue(false);

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "public" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockMakeChannelPublic).not.toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("už je veřejný");
		});
	});

	describe("/voice invite", () => {
		it("should invite user successfully", async () => {
			const targetUser = { id: "target-user-id", username: "TargetUser", bot: false };

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "invite", user: targetUser },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockInviteUserToChannel).toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("pozván");
		});

		it("should fail when trying to invite yourself", async () => {
			const targetUser = { id: "test-user-id", username: "TestUser", bot: false };

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "invite", user: targetUser },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockInviteUserToChannel).not.toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Nemůžeš pozvat sám sebe");
		});

		it("should fail when trying to invite a bot", async () => {
			const targetUser = { id: "bot-user-id", username: "BotUser", bot: true };

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "invite", user: targetUser },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockInviteUserToChannel).not.toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Nemůžeš pozvat bota");
		});
	});

	describe("/voice kick", () => {
		it("should kick user successfully", async () => {
			const targetUser = { id: "target-user-id", username: "TargetUser", bot: false };
			const targetMember = createMockMember(mockGuild, { user: targetUser });
			(targetMember as any).voice = { setChannel: mock(async () => {}) };
			mockVoiceChannel.members.set("target-user-id", targetMember);

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "kick", user: targetUser },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockKickUserFromChannel).toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("vyhozen");
		});

		it("should fail when trying to kick yourself", async () => {
			const targetUser = { id: "test-user-id", username: "TestUser", bot: false };

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "kick", user: targetUser },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockKickUserFromChannel).not.toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Nemůžeš vyhodit sám sebe");
		});

		it("should fail when user is not in the channel", async () => {
			const targetUser = { id: "not-in-channel-id", username: "NotInChannel", bot: false };

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "kick", user: targetUser },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			expect(mockKickUserFromChannel).not.toHaveBeenCalled();
			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("není v tomto kanálu");
		});
	});

	describe("/voice status", () => {
		it("should show private status", async () => {
			mockIsChannelPrivate.mockResolvedValue(true);

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "status" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Soukromý");
		});

		it("should show public status", async () => {
			mockIsChannelPrivate.mockResolvedValue(false);

			mockInteraction = createMockInteraction({
				guildId: "test-guild-id",
				user: { id: "test-user-id", username: "TestUser" },
				options: { subcommand: "status" },
			});
			(mockInteraction as any).member = mockMember;

			await execute({
				interaction: mockInteraction as any,
				dbUser: { id: 1, discordId: "test-user-id" } as any,
			});

			const response = mockInteraction.getLastResponse();
			expect(response.content).toContain("Veřejný");
		});
	});
});
