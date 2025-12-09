/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/unbound-method, @typescript-eslint/await-thenable -- Test patterns */
import { afterEach, beforeEach, describe, expect, it, mock, type Mock } from "bun:test";
import type { Client, EmbedBuilder, Guild, TextChannel } from "discord.js";
import { handleChangelog } from "./handleChangelog.ts";

interface SendOptions {
	embeds: EmbedBuilder[];
}

describe("Changelog Handler", () => {
	let mockClient: Client<true>;
	let mockGuild: Guild;
	let mockChannel: TextChannel;
	let mockSend: Mock<(options: unknown) => Promise<{ id: string }>>;
	let mockExecSync: Mock<(cmd: string) => string>;
	let mockExistsSync: Mock<(path: string) => boolean>;
	let mockReadFileSync: Mock<(path: string) => string>;
	let mockWriteFileSync: Mock<(path: string, data: string) => void>;

	beforeEach(() => {
		// Mock send function
		mockSend = mock(async () => ({ id: "message-id" }));

		// Mock channel
		mockChannel = {
			id: "1380666049992720555", // Use the actual dev channel ID from channels.ts
			name: "✍︱071︱bot-news",
			isSendable: () => true,
			send: mockSend as unknown as TextChannel["send"],
		} as unknown as TextChannel;

		// Create a proper Collection-like Map with find method
		const channelCache = new Map([["1380666049992720555", mockChannel]]);
		(channelCache as any).find = (predicate: any) => {
			for (const [, value] of channelCache) {
				if (predicate(value)) return value;
			}
			return undefined;
		};

		// Mock guild
		mockGuild = {
			id: "guild-id",
			name: "Test Guild",
			channels: {
				cache: channelCache,
			},
		} as unknown as Guild;

		// Mock client
		mockClient = {
			guilds: {
				cache: new Map([["guild-id", mockGuild]]),
				values: function* () {
					yield mockGuild;
				},
			},
		} as unknown as Client<true>;

		// Mock git commands
		mockExecSync = mock((cmd: string) => {
			if (cmd.includes("rev-parse HEAD")) {
				return "abc123def456";
			}
			if (cmd.includes("git log")) {
				return "abc123|feat: add new feature\ndef456|fix: fix bug\nghi789|chore: update deps";
			}
			return "";
		});

		// Mock file system
		mockExistsSync = mock(() => false);
		mockReadFileSync = mock(() => "{}");
		mockWriteFileSync = mock(() => {});

		// Mock modules
		void mock.module("node:child_process", () => ({
			execSync: mockExecSync,
		}));

		void mock.module("node:fs", () => ({
			existsSync: mockExistsSync,
			readFileSync: mockReadFileSync,
			writeFileSync: mockWriteFileSync,
		}));
	});

	afterEach(() => {
		mock.restore();
	});

	describe("First run (no previous changelog)", () => {
		it("should send changelog on first run", async () => {
			mockExistsSync = mock(() => false);

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(mockChannel.send).toHaveBeenCalled();
			expect(mockWriteFileSync).toHaveBeenCalled();
		});

		it("should handle git command errors gracefully", async () => {
			mockExecSync = mock(() => {
				throw new Error("Git command failed");
			});

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			// Should not throw - wrapped in Promise.resolve to satisfy await-thenable
			await expect(Promise.resolve(handleChangelog(mockClient))).resolves.toBeUndefined();
		});
	});

	describe("Commit categorization", () => {
		it("should categorize feat commits correctly", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123|feat: add changelog system\ndef456|feat(bot): add new command";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			const callArgs = mockSend.mock.calls[0]?.[0] as SendOptions;
			const sentEmbed = callArgs.embeds[0];
			expect(sentEmbed).toBeDefined();
			const embedData = sentEmbed!.toJSON();
			expect(embedData.description).toContain("🚀 **Nové funkce**");
			expect(embedData.description).toContain("add changelog system");
		});

		it("should categorize fix commits correctly", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123|fix: resolve error handling\ndef456|fix(api): fix validation";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			const callArgs = mockSend.mock.calls[0]?.[0] as SendOptions;
			const sentEmbed = callArgs.embeds[0];
			expect(sentEmbed).toBeDefined();
			const embedData = sentEmbed!.toJSON();
			expect(embedData.description).toContain("🐛 **Opravy**");
			expect(embedData.description).toContain("resolve error handling");
		});

		it("should categorize chore commits correctly", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123|chore: update dependencies\ndef456|chore(deps): bump version";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			const callArgs = mockSend.mock.calls[0]?.[0] as SendOptions;
			const sentEmbed = callArgs.embeds[0];
			expect(sentEmbed).toBeDefined();
			const embedData = sentEmbed!.toJSON();
			expect(embedData.description).toContain("🔧 **Údržba**");
			expect(embedData.description).toContain("update dependencies");
		});

		it("should categorize other commits correctly", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123|docs: update README\ndef456|refactor: improve code structure";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			const callArgs = mockSend.mock.calls[0]?.[0] as SendOptions;
			const sentEmbed = callArgs.embeds[0];
			expect(sentEmbed).toBeDefined();
			const embedData = sentEmbed!.toJSON();
			expect(embedData.description).toContain("📦 **Ostatní změny**");
		});

		it("should handle mixed commit types", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123|feat: add feature\ndef456|fix: fix bug\nghi789|chore: update\njkl012|docs: update docs";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			const callArgs = mockSend.mock.calls[0]?.[0] as SendOptions;
			const sentEmbed = callArgs.embeds[0];
			expect(sentEmbed).toBeDefined();
			const embedData = sentEmbed!.toJSON();
			expect(embedData.description).toContain("🚀 **Nové funkce**");
			expect(embedData.description).toContain("🐛 **Opravy**");
			expect(embedData.description).toContain("🔧 **Údržba**");
			expect(embedData.description).toContain("📦 **Ostatní změny**");
		});
	});

	describe("Duplicate prevention", () => {
		it("should not send changelog if already sent for current commit", async () => {
			const currentHash = "abc123def456";

			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return currentHash;
				}
				return "";
			});

			mockExistsSync = mock(() => true);
			mockReadFileSync = mock(() =>
				JSON.stringify({
					lastCommitHash: currentHash,
					sentAt: new Date().toISOString(),
				}),
			);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			expect(mockChannel.send).not.toHaveBeenCalled();
		});

		it("should send changelog if commit hash changed", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit999";
				}
				if (cmd.includes("git log")) {
					return "newcommit999|feat: new feature";
				}
				return "";
			});

			mockExistsSync = mock(() => true);
			mockReadFileSync = mock(() =>
				JSON.stringify({
					lastCommitHash: "oldcommit123",
					sentAt: new Date().toISOString(),
				}),
			);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			expect(mockChannel.send).toHaveBeenCalled();
		});
	});

	describe("No new commits", () => {
		it("should update hash but not send if no new commits", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "currentcommit123";
				}
				if (cmd.includes("git log")) {
					return ""; // No commits
				}
				return "";
			});

			mockExistsSync = mock(() => true);
			mockReadFileSync = mock(() =>
				JSON.stringify({
					lastCommitHash: "oldcommit123",
					sentAt: new Date().toISOString(),
				}),
			);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			expect(mockChannel.send).not.toHaveBeenCalled();
			expect(mockWriteFileSync).toHaveBeenCalledWith(
				expect.stringContaining("last-changelog.json"),
				expect.stringContaining("currentcommit123"),
			);
		});
	});

	describe("Multiple guilds", () => {
		it("should send changelog to all guilds", async () => {
			const mockChannel2 = {
				id: "1380666049992720555",
				name: "✍︱071︱bot-news",
				isSendable: () => true,
				send: mock(async () => ({ id: "message-id-2" })),
			} as unknown as TextChannel;

			// Create a proper Collection-like Map with find method for second guild
			const channelCache2 = new Map([["1380666049992720555", mockChannel2]]);
			(channelCache2 as any).find = (predicate: any) => {
				for (const [, value] of channelCache2) {
					if (predicate(value)) return value;
				}
				return undefined;
			};

			const mockGuild2 = {
				id: "guild-id-2",
				name: "Test Guild 2",
				channels: {
					cache: channelCache2,
				},
			} as unknown as Guild;

			mockClient.guilds.cache.set("guild-id-2", mockGuild2);
			(mockClient.guilds as any).values = function* () {
				yield mockGuild;
				yield mockGuild2;
			};

			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123|feat: add new feature";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			expect(mockChannel.send).toHaveBeenCalled();
			expect(mockChannel2.send).toHaveBeenCalled();
		});
	});

	describe("Channel not found", () => {
		it("should handle missing bot-news channel gracefully", async () => {
			// Create an empty Collection-like Map with find method
			const emptyChannelCache = new Map();
			(emptyChannelCache as any).find = () => undefined;

			const mockGuildNoChannel = {
				id: "guild-no-channel",
				name: "Guild Without Channel",
				channels: {
					cache: emptyChannelCache,
				},
			} as unknown as Guild;

			mockClient.guilds.cache.clear();
			mockClient.guilds.cache.set("guild-no-channel", mockGuildNoChannel);
			(mockClient.guilds as any).values = function* () {
				yield mockGuildNoChannel;
			};

			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123|feat: add new feature";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			// Should not throw
			await expect(handleChangelog(mockClient)).resolves.toBeUndefined();
		});
	});

	describe("Embed structure", () => {
		it("should create properly formatted embed", async () => {
			mockExecSync = mock((cmd: string) => {
				if (cmd.includes("rev-parse HEAD")) {
					return "newcommit123";
				}
				if (cmd.includes("git log")) {
					return "abc123def|feat: add changelog system";
				}
				return "";
			});

			mockExistsSync = mock(() => false);

			void mock.module("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			const callArgs = mockSend.mock.calls[0]?.[0] as SendOptions;
			const sentEmbed = callArgs.embeds[0];
			expect(sentEmbed).toBeDefined();
			const embedData = sentEmbed!.toJSON();
			expect(embedData.title).toBe("📝 Changelog - Nové změny v botu");
			expect(embedData.color).toBe(0x0099ff);
			expect(embedData.footer?.text).toBe("Allcom Bot");
			expect(embedData.description).toContain("add changelog system");
			expect(embedData.description).toContain("[`abc123d`](https://github.com/evobug-com/bot/commit/abc123def");
		});
	});
});
