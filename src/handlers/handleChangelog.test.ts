/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/unbound-method -- Test patterns */
import { afterEach, beforeEach, describe, expect, it, mock, type Mock } from "bun:test";
import type { Client, EmbedBuilder, Guild, TextChannel } from "discord.js";
import { createChangelogEmbed, getNewEntries, handleChangelog, parseChangelog } from "./handleChangelog.ts";

interface SendOptions {
	embeds: EmbedBuilder[];
}

const SAMPLE_CHANGELOG = `# Changelog

All notable changes to Allcom Bot will be documented in this file.

## [1.2.0] - 2024-12-26

### Added
- New voice command support
- Improved error handling

### Fixed
- Resolved connection issues

## [1.1.0] - 2024-12-25

### Added
- Initial changelog feature
- Docker support

### Changed
- Switched to new API provider

## [1.0.0] - 2024-12-20

### Added
- First release
`;

describe("Changelog Handler", () => {
	let mockClient: Client<true>;
	let mockGuild: Guild;
	let mockChannel: TextChannel;
	let mockSend: Mock<(options: unknown) => Promise<{ id: string }>>;
	let mockExistsSync: Mock<(path: string) => boolean>;
	let mockReadFileSync: Mock<(path: string) => string>;
	let mockWriteFileSync: Mock<(path: string, data: string) => void>;

	beforeEach(() => {
		// Mock send function
		mockSend = mock(async () => ({ id: "message-id" }));

		// Mock channel
		mockChannel = {
			id: "1380666049992720555",
			name: "✍︱071︱bot-news",
			isSendable: () => true,
			send: mockSend as unknown as TextChannel["send"],
		} as unknown as TextChannel;

		// Create a proper Collection-like Map with find method
		const channelCache = new Map([["1380666049992720555", mockChannel]]);
		(channelCache as unknown as { find: (predicate: (value: TextChannel) => boolean) => TextChannel | undefined }).find = (predicate) => {
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

		// Mock file system
		mockExistsSync = mock((path: string) => {
			if (path.includes("CHANGELOG.md")) return true;
			if (path.includes("last-changelog.json")) return false;
			return false;
		});
		mockReadFileSync = mock((path: string) => {
			if (path.includes("CHANGELOG.md")) return SAMPLE_CHANGELOG;
			return "{}";
		});
		mockWriteFileSync = mock(() => {});

		// Mock modules
		void mock.module("node:fs", () => ({
			existsSync: mockExistsSync,
			readFileSync: mockReadFileSync,
			writeFileSync: mockWriteFileSync,
		}));
	});

	afterEach(() => {
		mock.restore();
	});

	describe("parseChangelog", () => {
		it("should parse CHANGELOG.md into structured entries", () => {
			const entries = parseChangelog();

			expect(entries).toHaveLength(3);
			expect(entries[0]?.version).toBe("1.2.0");
			expect(entries[0]?.date).toBe("2024-12-26");
			expect(entries[1]?.version).toBe("1.1.0");
			expect(entries[2]?.version).toBe("1.0.0");
		});

		it("should parse sections correctly", () => {
			const entries = parseChangelog();

			const v120 = entries[0];
			expect(v120?.sections).toHaveLength(2);
			expect(v120?.sections[0]?.type).toBe("Added");
			expect(v120?.sections[0]?.items).toContain("New voice command support");
			expect(v120?.sections[1]?.type).toBe("Fixed");
		});

		it("should return empty array if CHANGELOG.md not found", () => {
			mockExistsSync = mock(() => false);
			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			const entries = parseChangelog();
			expect(entries).toHaveLength(0);
		});
	});

	describe("getNewEntries", () => {
		it("should return only latest entry on first run", () => {
			const entries = parseChangelog();
			const newEntries = getNewEntries(entries, null);

			expect(newEntries).toHaveLength(1);
			expect(newEntries[0]?.version).toBe("1.2.0");
		});

		it("should return entries newer than last sent version", () => {
			const entries = parseChangelog();
			const newEntries = getNewEntries(entries, "1.0.0");

			expect(newEntries).toHaveLength(2);
			expect(newEntries[0]?.version).toBe("1.2.0");
			expect(newEntries[1]?.version).toBe("1.1.0");
		});

		it("should return empty array if already on latest", () => {
			const entries = parseChangelog();
			const newEntries = getNewEntries(entries, "1.2.0");

			expect(newEntries).toHaveLength(0);
		});

		it("should return latest if last version not found", () => {
			const entries = parseChangelog();
			const newEntries = getNewEntries(entries, "0.5.0");

			expect(newEntries).toHaveLength(1);
			expect(newEntries[0]?.version).toBe("1.2.0");
		});
	});

	describe("createChangelogEmbed", () => {
		it("should create properly formatted embed", () => {
			const entries = parseChangelog();
			const embed = createChangelogEmbed([entries[0]!]);
			const embedData = embed.toJSON();

			expect(embedData.title).toBe("📝 Changelog - Nové změny v botu");
			expect(embedData.color).toBe(0x0099ff);
			expect(embedData.footer?.text).toBe("Allcom Bot");
		});

		it("should include version and date", () => {
			const entries = parseChangelog();
			const embed = createChangelogEmbed([entries[0]!]);
			const embedData = embed.toJSON();

			expect(embedData.description).toContain("**Verze 1.2.0** (2024-12-26)");
		});

		it("should display Added section with correct emoji", () => {
			const entries = parseChangelog();
			const embed = createChangelogEmbed([entries[0]!]);
			const embedData = embed.toJSON();

			expect(embedData.description).toContain("🚀 **Nové funkce**");
			expect(embedData.description).toContain("• New voice command support");
		});

		it("should display Fixed section with correct emoji", () => {
			const entries = parseChangelog();
			const embed = createChangelogEmbed([entries[0]!]);
			const embedData = embed.toJSON();

			expect(embedData.description).toContain("🐛 **Opravy**");
			expect(embedData.description).toContain("• Resolved connection issues");
		});

		it("should display Changed section with correct emoji", () => {
			const entries = parseChangelog();
			const embed = createChangelogEmbed([entries[1]!]);
			const embedData = embed.toJSON();

			expect(embedData.description).toContain("🔄 **Změny**");
			expect(embedData.description).toContain("• Switched to new API provider");
		});

		it("should handle multiple entries", () => {
			const entries = parseChangelog();
			const embed = createChangelogEmbed([entries[0]!, entries[1]!]);
			const embedData = embed.toJSON();

			expect(embedData.description).toContain("**Verze 1.2.0**");
			expect(embedData.description).toContain("**Verze 1.1.0**");
		});
	});

	describe("First run (no previous changelog)", () => {
		it("should send changelog on first run", async () => {
			await handleChangelog(mockClient);

			expect(mockChannel.send).toHaveBeenCalled();
			expect(mockWriteFileSync).toHaveBeenCalled();
		});

		it("should handle missing CHANGELOG.md gracefully", async () => {
			mockExistsSync = mock(() => false);

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await expect(Promise.resolve(handleChangelog(mockClient))).resolves.toBeUndefined();
			expect(mockChannel.send).not.toHaveBeenCalled();
		});
	});

	describe("Duplicate prevention", () => {
		it("should not send changelog if already sent for current version", async () => {
			mockExistsSync = mock((path: string) => {
				if (path.includes("CHANGELOG.md")) return true;
				if (path.includes("last-changelog.json")) return true;
				return false;
			});
			mockReadFileSync = mock((path: string) => {
				if (path.includes("CHANGELOG.md")) return SAMPLE_CHANGELOG;
				return JSON.stringify({
					lastVersion: "1.2.0",
					sentAt: new Date().toISOString(),
				});
			});

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			expect(mockChannel.send).not.toHaveBeenCalled();
		});

		it("should send changelog if version changed", async () => {
			mockExistsSync = mock((path: string) => {
				if (path.includes("CHANGELOG.md")) return true;
				if (path.includes("last-changelog.json")) return true;
				return false;
			});
			mockReadFileSync = mock((path: string) => {
				if (path.includes("CHANGELOG.md")) return SAMPLE_CHANGELOG;
				return JSON.stringify({
					lastVersion: "1.0.0",
					sentAt: new Date().toISOString(),
				});
			});

			void mock.module("node:fs", () => ({
				existsSync: mockExistsSync,
				readFileSync: mockReadFileSync,
				writeFileSync: mockWriteFileSync,
			}));

			await handleChangelog(mockClient);

			expect(mockChannel.send).toHaveBeenCalled();
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

			const channelCache2 = new Map([["1380666049992720555", mockChannel2]]);
			(channelCache2 as unknown as { find: (predicate: (value: TextChannel) => boolean) => TextChannel | undefined }).find = (predicate) => {
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
			(mockClient.guilds as unknown as { values: () => Generator<Guild> }).values = function* () {
				yield mockGuild;
				yield mockGuild2;
			};

			await handleChangelog(mockClient);

			expect(mockChannel.send).toHaveBeenCalled();
			expect(mockChannel2.send).toHaveBeenCalled();
		});
	});

	describe("Channel not found", () => {
		it("should handle missing bot-news channel gracefully", async () => {
			const emptyChannelCache = new Map();
			(emptyChannelCache as unknown as { find: () => undefined }).find = () => undefined;

			const mockGuildNoChannel = {
				id: "guild-no-channel",
				name: "Guild Without Channel",
				channels: {
					cache: emptyChannelCache,
				},
			} as unknown as Guild;

			mockClient.guilds.cache.clear();
			mockClient.guilds.cache.set("guild-no-channel", mockGuildNoChannel);
			(mockClient.guilds as unknown as { values: () => Generator<Guild> }).values = function* () {
				yield mockGuildNoChannel;
			};

			await expect(handleChangelog(mockClient)).resolves.toBeUndefined();
		});
	});

	describe("Embed structure", () => {
		it("should create properly formatted embed with all sections", async () => {
			await handleChangelog(mockClient);

			const callArgs = mockSend.mock.calls[0]?.[0] as SendOptions;
			const sentEmbed = callArgs.embeds[0];
			expect(sentEmbed).toBeDefined();
			const embedData = sentEmbed!.toJSON();
			expect(embedData.title).toBe("📝 Changelog - Nové změny v botu");
			expect(embedData.color).toBe(0x0099ff);
			expect(embedData.footer?.text).toBe("Allcom Bot");
			expect(embedData.description).toContain("New voice command support");
		});
	});
});
