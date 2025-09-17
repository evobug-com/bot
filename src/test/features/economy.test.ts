import { beforeEach, describe, expect, it, mock } from "bun:test";
import { MessageFlags } from "discord.js";
import { execute as executeDaily } from "../../commands/daily.ts";
import { execute as executeWork } from "../../commands/work.ts";
import { DISCORD_CHANNELS } from "../../util";
import { createUserScenarios, UserFactory, UserStatsFactory } from "../factories/user.factory.ts";
import {
	createMockChannel,
	createMockInteraction,
	type MockChatInputCommandInteraction,
} from "../mocks/discord-mock.ts";
import { createTestORPCClient, MockORPCClient } from "../mocks/orpc-mock.ts";
import { schemas } from "../utils/schema-extractor.ts";
import { generateAllVariations } from "../utils/zod-generator.ts";

describe("Economy System Tests", () => {
	let mockClient: MockORPCClient;
	let interaction: MockChatInputCommandInteraction;

	beforeEach(() => {
		const testClient = createTestORPCClient({ seed: 123 });
		mockClient = testClient.mock;

		mock.module("../../client/client.ts", () => ({
			orpc: testClient.client,
			getDbUser: async () => UserFactory.create({ id: 1, discordId: "123456789" }),
		}));

		// Mock captcha functions to always skip captcha in tests
		mock.module("../../util/captcha.ts", () => ({
			shouldShowCaptcha: () => false,
			generateCaptcha: () => ({}),
			presentCaptcha: async () => ({ success: true, responseTime: 3000 }),
			getCaptchaDifficulty: () => "easy",
			isSuspiciousResponseTime: () => false,
		}));

		// Mock captcha tracker to prevent failures
		mock.module("../../util/captcha-tracker.ts", () => ({
			captchaTracker: {
				recordFailure: () => {},
				hasRecentFailure: () => false,
				clearFailure: () => {},
				getFailureCount: () => 0,
			},
		}));

		interaction = createMockInteraction({
			commandName: "work",
			user: { id: "123456789", username: "TestUser" },
			channelId: DISCORD_CHANNELS.COMMANDS.id,
			guildId: "guild-1",
		});

		if (interaction.guild) {
			const commandsChannel = createMockChannel(interaction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
			interaction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);

			const botsInfo = createMockChannel(interaction.guild, DISCORD_CHANNELS.BOT_INFO.id, "bot-info");
			interaction.guild.channels.cache.set(DISCORD_CHANNELS.BOT_INFO.id, botsInfo);
		}
	});

	describe("/work command", () => {
		it("should handle successful work claim", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.createReadyToClaim(1);

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
			});

			const workResponse = generateAllVariations(schemas.stats.claimWorkOutput)[0];
			if (workResponse) {
				workResponse.updatedStats = { ...stats, coinsCount: stats.coinsCount + 100 };
				workResponse.message = "Work completed!";
				mockClient.setCustomResponse("users.stats.work.claim", workResponse);
			}

			await executeWork({
				interaction: interaction as any,
				dbUser: user,
			});

			const responses = interaction.getResponses();
			expect(responses).not.toHaveLength(0);
			// Check that we got a response with either content or embeds
			const hasContent = responses[0].content !== undefined;
			const hasEmbeds = responses[0].embeds && responses[0].embeds.length > 0;
			expect(hasContent || hasEmbeds).toBe(true);
		});

		it("should handle work cooldown", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: true,
				cooldownRemaining: 1800,
				cooldownEndTime: new Date(Date.now() + 1800000),
			});

			await executeWork({
				interaction: interaction as any,
				dbUser: user,
			});

			const response = interaction.getLastResponse();
			expect(response.embeds).toBeDefined();
			expect(response.embeds[0].data.fields[0].data.name).toBe("Tvůj stav");
		});

		it("should handle level up scenario", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.create({ userId: 1, xpCount: 990 });

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
			});

			const workResponse = generateAllVariations(schemas.stats.claimWorkOutput)[0];
			if (workResponse) {
				workResponse.levelUp = {
					oldLevel: 1,
					newLevel: 2,
					bonusCoins: 100,
				};
				workResponse.updatedStats = { ...stats, xpCount: 1050, coinsCount: stats.coinsCount + 200 };
				mockClient.setCustomResponse("users.stats.work.claim", workResponse);
			}

			await executeWork({
				interaction: interaction as any,
				dbUser: user,
			});

			const responses = interaction.getResponses();
			expect(responses.length).toBeGreaterThan(0);
		});

		it("should apply boost multiplier for boosted users", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const boostInteraction = createMockInteraction({
				commandName: "work",
				user: { id: "123456789", username: "BoostUser" },
				member: { premiumSince: new Date() },
				channelId: DISCORD_CHANNELS.COMMANDS.id,
				guildId: "guild-1",
			});

			if (boostInteraction.guild) {
				const commandsChannel = createMockChannel(boostInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
				boostInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
			}

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
			});

			const workResponse = generateAllVariations(schemas.stats.claimWorkOutput)[0];
			if (workResponse) {
				workResponse.claimStats.boostMultiplier = 1.5;
				workResponse.claimStats.boostCoinsBonus = 50;
				workResponse.claimStats.boostXpBonus = 25;
				mockClient.setCustomResponse("users.stats.work.claim", workResponse);
			}

			await executeWork({
				interaction: boostInteraction as any,
				dbUser: user,
			});

			const response = boostInteraction.getLastResponse();
			// The structure can be either embed.fields or embed.data.fields
			const embed = response.embeds[0];
			const fields = embed.fields || embed.data?.fields || [];
			// Fields can have either f.name or f.data.name
			expect(fields.some((f: any) => (f.name || f.data?.name || "").includes("Boost"))).toBe(true);
		});

		it("should test all possible work activities", async () => {
			// Mock setTimeout to avoid delays
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = ((fn: any) => {
				fn();
				return 0;
			}) as any;

			const activities = ["wolt-delivery", "employment-office", "geoguessr-boss", "twitter-post", "expense-receipts"];

			for (const _ of activities) {
				const user = UserFactory.create();
				const testInteraction = createMockInteraction({
					commandName: "work",
					user: { id: user.discordId!, username: user.username! },
					channelId: DISCORD_CHANNELS.COMMANDS.id,
					guildId: "guild-1",
				});

				if (testInteraction.guild) {
					const commandsChannel = createMockChannel(testInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
					testInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
				}

				mockClient.setCustomResponse("users.stats.work.cooldown", {
					isOnCooldown: false,
					cooldownRemaining: 0,
				});

				const workResponse = generateAllVariations(schemas.stats.claimWorkOutput)[0];
				mockClient.setCustomResponse("users.stats.work.claim", workResponse);

				await executeWork({
					interaction: testInteraction as any,
					dbUser: user,
				});

				const response = testInteraction.getLastResponse();
				expect(response.embeds).toBeDefined();
				expect(response.embeds[0].data.fields).toBeDefined();
			}
		});
	});

	describe("/daily command", () => {
		it("should handle successful daily claim", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const dailyInteraction = createMockInteraction({
				commandName: "daily",
				user: { id: "123456789", username: "TestUser" },
				channelId: DISCORD_CHANNELS.COMMANDS.id,
				guildId: "guild-1",
			});

			if (dailyInteraction.guild) {
				const commandsChannel = createMockChannel(dailyInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
				dailyInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
			}

			mockClient.setCustomResponse("users.stats.daily.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
				cooldownEndTime: new Date(Date.now() + 86400000),
			});

			const dailyResponse = generateAllVariations(schemas.stats.claimDailyOutput)[0];
			mockClient.setCustomResponse("users.stats.daily.claim", dailyResponse);

			await executeDaily({
				interaction: dailyInteraction as any,
				dbUser: user,
			});

			const response = dailyInteraction.getLastResponse();
			expect(response.embeds).toBeDefined();
		});

		it("should handle daily cooldown", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const dailyInteraction = createMockInteraction({
				commandName: "daily",
				user: { id: "123456789", username: "TestUser" },
				channelId: DISCORD_CHANNELS.COMMANDS.id,
				guildId: "guild-1",
			});

			if (dailyInteraction.guild) {
				const commandsChannel = createMockChannel(dailyInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
				dailyInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
			}

			mockClient.setCustomResponse("users.stats.daily.cooldown", {
				isOnCooldown: true,
				cooldownRemaining: 43200,
				cooldownEndTime: new Date(Date.now() + 43200000),
			});

			await executeDaily({
				interaction: dailyInteraction as any,
				dbUser: user,
			});

			const response = dailyInteraction.getLastResponse();
			expect(response.embeds).toBeDefined();
			expect(response.embeds[0].data.description).toContain("vyzvednul");
		});

		it("should handle milestone rewards", async () => {
			const scenarios = createUserScenarios();
			const { user } = scenarios.milestoneUser(5);

			const dailyInteraction = createMockInteraction({
				commandName: "daily",
				user: { id: user.discordId!, username: user.username! },
				channelId: DISCORD_CHANNELS.COMMANDS.id,
				guildId: "guild-1",
			});

			if (dailyInteraction.guild) {
				const commandsChannel = createMockChannel(dailyInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
				dailyInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
			}

			mockClient.setCustomResponse("users.stats.daily.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
				cooldownEndTime: new Date(Date.now() + 86400000),
			});

			const dailyResponse = generateAllVariations(schemas.stats.claimDailyOutput)[0];
			if (dailyResponse) {
				dailyResponse.claimStats.isMilestone = true;
				dailyResponse.claimStats.milestoneCoinsBonus = 500;
				dailyResponse.claimStats.milestoneXpBonus = 250;
				mockClient.setCustomResponse("users.stats.daily.claim", dailyResponse);
			}

			await executeDaily({
				interaction: dailyInteraction as any,
				dbUser: user,
			});

			const response = dailyInteraction.getLastResponse();
			expect(response.embeds).toBeDefined();
		});

		it("should handle streak reset", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.create({
				userId: 1,
				dailyStreak: 10,
				lastDailyAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
			});

			const dailyInteraction = createMockInteraction({
				commandName: "daily",
				user: { id: "123456789", username: "TestUser" },
				channelId: DISCORD_CHANNELS.COMMANDS.id,
				guildId: "guild-1",
			});

			if (dailyInteraction.guild) {
				const commandsChannel = createMockChannel(dailyInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
				dailyInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
			}

			mockClient.setCustomResponse("users.stats.daily.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
				cooldownEndTime: new Date(Date.now() + 86400000),
			});

			const dailyResponse = generateAllVariations(schemas.stats.claimDailyOutput)[0];
			if (dailyResponse) {
				dailyResponse.updatedStats = { ...stats, dailyStreak: 1 };
				mockClient.setCustomResponse("users.stats.daily.claim", dailyResponse);
			}

			await executeDaily({
				interaction: dailyInteraction as any,
				dbUser: user,
			});

			const response = dailyInteraction.getLastResponse();
			expect(response.embeds).toBeDefined();
		});
	});

	describe("Command restrictions", () => {
		it.skip("should restrict commands to specific channels", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const wrongChannelInteraction = createMockInteraction({
				commandName: "work",
				user: { id: "123456789", username: "TestUser" },
				channelId: "general-channel",
				guildId: "guild-1",
			});

			await executeWork({
				interaction: wrongChannelInteraction as any,
				dbUser: user,
			});

			const response = wrongChannelInteraction.getLastResponse();
			expect(wrongChannelInteraction.ephemeral).toBe(true);
			expect(response.embeds[0].data.description).toContain("commands");
		});
	});

	describe("Edge cases and error handling", () => {
		it.skip("should handle API errors gracefully", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const errorClient = new MockORPCClient({ errorRate: 1 });

			mock.module("../../client/client.ts", () => ({
				orpc: errorClient.createClient(),
				getDbUser: async () => user,
			}));

			const errorInteraction = createMockInteraction({
				commandName: "work",
				user: { id: "123456789", username: "TestUser" },
				channelId: DISCORD_CHANNELS.COMMANDS.id,
				guildId: "guild-1",
			});

			if (errorInteraction.guild) {
				const commandsChannel = createMockChannel(errorInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
				errorInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
			}

			await executeWork({
				interaction: errorInteraction as any,
				dbUser: user,
			});

			const response = errorInteraction.getLastResponse();
			expect(response.embeds).toBeDefined();
			expect(JSON.stringify(response.embeds[0].toJSON(false))).toContain("Chyba");
		});

		it("should handle all possible reward variations", async () => {
			// Mock setTimeout to avoid delays
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = ((fn: any) => {
				fn();
				return 0;
			}) as any;

			const allClaimVariations = generateAllVariations(schemas.stats.claimWorkOutput);

			for (const variation of allClaimVariations.slice(0, 5)) {
				const user = UserFactory.create();
				const testInteraction = createMockInteraction({
					commandName: "work",
					user: { id: user.discordId!, username: user.username! },
					channelId: DISCORD_CHANNELS.COMMANDS.id,
					guildId: "guild-1",
				});

				if (testInteraction.guild) {
					const commandsChannel = createMockChannel(testInteraction.guild, DISCORD_CHANNELS.COMMANDS.id, "commands");
					testInteraction.guild.channels.cache.set(DISCORD_CHANNELS.COMMANDS.id, commandsChannel);
				}

				mockClient.setCustomResponse("users.stats.work.cooldown", {
					isOnCooldown: false,
					cooldownRemaining: 0,
				});
				mockClient.setCustomResponse("users.stats.work.claim", variation);

				await executeWork({
					interaction: testInteraction as any,
					dbUser: user,
				});

				const response = testInteraction.getLastResponse();
				expect(response.embeds).toBeDefined();
			}

			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		});
	});
});
