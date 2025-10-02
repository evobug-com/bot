import { beforeEach, describe, expect, it, mock } from "bun:test";
import { execute as executeDaily } from "../../commands/daily.ts";
import { execute as executeWork } from "../../commands/work.ts";
import { DISCORD_CHANNELS } from "../../util";
import * as captchaModule from "../../util/captcha.ts";
import { UserFactory, UserStatsFactory } from "../factories/user.factory.ts";
import {
	createMockChannel,
	createMockInteraction,
	type MockChatInputCommandInteraction,
} from "../mocks/discord-mock.ts";
import { createTestORPCClient, type MockORPCClient } from "../mocks/orpc-mock.ts";

// TODO: These tests need to be rewritten for the new anti-cheat system
// The old captcha system (shouldShowCaptcha, getCaptchaDifficulty) has been replaced
// with API-based anti-cheat endpoints that aren't available in test environment
describe.skip("Economy Commands with Captcha", () => {
	let mockClient: MockORPCClient;
	let interaction: MockChatInputCommandInteraction;
	let captchaMocks: any;

	beforeEach(() => {
		const testClient = createTestORPCClient({ seed: 123 });
		mockClient = testClient.mock;

		void mock.module("../../client/client.ts", () => ({
			orpc: testClient.client,
			getDbUser: async () => UserFactory.create({ id: 1, discordId: "123456789" }),
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

		// Reset captcha mocks
		captchaMocks = {
			shouldShowCaptcha: mock(captchaModule.shouldShowCaptcha),
			generateCaptcha: mock(captchaModule.generateCaptcha),
			presentCaptcha: mock(captchaModule.presentCaptcha),
			getCaptchaDifficulty: mock(captchaModule.getCaptchaDifficulty),
			isSuspiciousResponseTime: mock(captchaModule.isSuspiciousResponseTime),
		};
	});

	describe("/work command with captcha", () => {
		it("should successfully claim reward after passing captcha", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.createReadyToClaim(1);
			stats.workCount = 6; // Multiple of 3, should trigger captcha
			stats.suspiciousBehaviorScore = 0;

			// Mock captcha flow
			captchaMocks.shouldShowCaptcha = mock(() => ({ showCaptcha: true, triggerReason: "periodic_check_interval_3" }));
			captchaMocks.getCaptchaDifficulty = mock(() => "easy");
			captchaMocks.generateCaptcha = mock(() => ({
				type: "math",
				question: "3 + 4 = ?",
				correctAnswer: "7",
				options: ["7", "6", "8", "5"],
				embedTitle: "🔐 Ověření - Matematika",
				embedDescription: "Vyřeš tento jednoduchý matematický příklad:",
			}));
			captchaMocks.presentCaptcha = mock(() =>
				Promise.resolve({
					success: true,
					responseTime: 3500,
					attemptedAnswer: "7",
				}),
			);
			captchaMocks.isSuspiciousResponseTime = mock(() => false);

			void mock.module("../../util/captcha.ts", () => captchaMocks);

			// Mock API responses
			mockClient.setCustomResponse("users.stats.user", {
				stats,
				levelProgress: { currentLevel: 1, xpProgress: 50 },
			});

			mockClient.setCustomResponse("users.stats.captcha.log", {
				logged: true,
				isSuspicious: false,
			});

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
			});

			mockClient.setCustomResponse("users.stats.work.claim", {
				updatedStats: { ...stats, coinsCount: stats.coinsCount + 100 },
				message: "Work completed!",
				claimStats: {
					baseCoins: 80,
					baseXp: 40,
					currentLevel: 1,
					levelCoinsBonus: 10,
					levelXpBonus: 5,
					streakCoinsBonus: 0,
					streakXpBonus: 0,
					milestoneCoinsBonus: 0,
					milestoneXpBonus: 0,
					boostMultiplier: 1,
					boostCoinsBonus: 0,
					boostXpBonus: 0,
					isMilestone: false,
					earnedTotalCoins: 100,
					earnedTotalXp: 50,
				},
				levelProgress: {
					xpProgress: 50,
					progressPercentage: 50,
					xpForCurrentLevel: 0,
					xpForNextLevel: 100,
					currentXp: 50,
					xpNeeded: 50,
					currentLevel: 1,
				},
			});

			await executeWork({
				interaction: interaction as any,
				dbUser: user,
			});

			// Verify captcha was shown
			expect(captchaMocks.shouldShowCaptcha).toHaveBeenCalledWith(6, 0, "123456789");
			expect(captchaMocks.presentCaptcha).toHaveBeenCalled();

			// Verify reward was claimed after successful captcha
			const responses = interaction.getResponses();
			expect(responses.length).toBeGreaterThan(0);
			expect(responses[responses.length - 1].embeds).toBeDefined();
		});

		it("should reject reward claim after failing captcha", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.createReadyToClaim(1);
			stats.workCount = 3;
			stats.suspiciousBehaviorScore = 0;

			// Mock captcha failure
			captchaMocks.shouldShowCaptcha = mock(() => ({ showCaptcha: true, triggerReason: "periodic_check_interval_3" }));
			captchaMocks.getCaptchaDifficulty = mock(() => "easy");
			captchaMocks.generateCaptcha = mock(() => ({
				type: "math",
				question: "5 + 3 = ?",
				correctAnswer: "8",
				options: ["8", "7", "9", "6"],
				embedTitle: "🔐 Ověření - Matematika",
				embedDescription: "Vyřeš tento jednoduchý matematický příklad:",
			}));
			captchaMocks.presentCaptcha = mock(() =>
				Promise.resolve({
					success: false,
					responseTime: 2500,
					attemptedAnswer: "7",
					timedOut: false,
				}),
			);

			void mock.module("../../util/captcha.ts", () => captchaMocks);

			// Mock API responses
			mockClient.setCustomResponse("users.stats.user", {
				stats,
				levelProgress: { currentLevel: 1, xpProgress: 50 },
			});

			mockClient.setCustomResponse("users.stats.captcha.log", {
				logged: true,
				isSuspicious: false,
			});

			mockClient.setCustomResponse("users.stats.captcha.failedCount.update", {
				updated: true,
				failedCount: 1,
				isLocked: false,
			});

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
			});

			await executeWork({
				interaction: interaction as any,
				dbUser: user,
			});

			// Verify captcha was shown and failed
			expect(captchaMocks.presentCaptcha).toHaveBeenCalled();

			// Verify error message was shown
			const response = interaction.getLastResponse();
			expect(response.embeds).toBeDefined();
			expect(response.embeds[0].data.title).toContain("Ověření selhalo");
		});

		it("should flag suspicious fast responses", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.createReadyToClaim(1);
			stats.suspiciousBehaviorScore = 40; // Moderate suspicion

			// Mock very fast correct response
			captchaMocks.shouldShowCaptcha = mock(() => ({ showCaptcha: true, triggerReason: "suspicious_score_40" }));
			captchaMocks.getCaptchaDifficulty = mock(() => "medium");
			captchaMocks.generateCaptcha = mock(() => ({
				type: "math",
				question: "12 + 8 = ?",
				correctAnswer: "20",
				options: ["20", "18", "22", "19"],
				embedTitle: "🔐 Ověření - Matematika",
				embedDescription: "Vyřeš tento jednoduchý matematický příklad:",
			}));
			captchaMocks.presentCaptcha = mock(() =>
				Promise.resolve({
					success: true,
					responseTime: 500, // Suspiciously fast
					attemptedAnswer: "20",
				}),
			);
			captchaMocks.isSuspiciousResponseTime = mock(() => true);

			void mock.module("../../util/captcha.ts", () => captchaMocks);

			// Mock API responses
			mockClient.setCustomResponse("users.stats.user", {
				stats,
				levelProgress: { currentLevel: 1, xpProgress: 50 },
			});

			mockClient.setCustomResponse("users.stats.captcha.log", {
				logged: true,
				isSuspicious: true,
			});

			mockClient.setCustomResponse("users.stats.suspiciousScore.update", {
				updated: true,
				newScore: 60,
				isEconomyBanned: false,
			});

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
			});

			mockClient.setCustomResponse("users.stats.work.claim", {
				updatedStats: { ...stats, coinsCount: stats.coinsCount + 100 },
				message: "Work completed!",
				claimStats: {
					baseCoins: 80,
					baseXp: 40,
					currentLevel: 1,
					levelCoinsBonus: 10,
					levelXpBonus: 5,
					streakCoinsBonus: 0,
					streakXpBonus: 0,
					milestoneCoinsBonus: 0,
					milestoneXpBonus: 0,
					boostMultiplier: 1,
					boostCoinsBonus: 0,
					boostXpBonus: 0,
					isMilestone: false,
					earnedTotalCoins: 100,
					earnedTotalXp: 50,
				},
				levelProgress: {
					xpProgress: 50,
					progressPercentage: 50,
					xpForCurrentLevel: 0,
					xpForNextLevel: 100,
					currentXp: 50,
					xpNeeded: 50,
					currentLevel: 1,
				},
			});

			await executeWork({
				interaction: interaction as any,
				dbUser: user,
			});

			// Verify captcha was logged with the fast response time
			expect(mockClient.hasBeenCalledWith("users.stats.captcha.log")).toBe(true);

			// Verify work was claimed successfully despite suspicious response
			expect(mockClient.hasBeenCalledWith("users.stats.work.claim")).toBe(true);
		});

		it("should handle captcha timeout gracefully", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.createReadyToClaim(1);

			// Mock timeout
			captchaMocks.shouldShowCaptcha = mock(() => ({ showCaptcha: true, triggerReason: "random_check" }));
			captchaMocks.getCaptchaDifficulty = mock(() => "easy");
			captchaMocks.generateCaptcha = mock(() => ({
				type: "emoji",
				question: "🎮",
				correctAnswer: "🎮",
				options: ["🎮", "🎯", "🎲", "🎪"],
				embedTitle: "🔐 Ověření - Emoji",
				embedDescription: "Klikni na tlačítko s tímto emoji: 🎮",
			}));
			captchaMocks.presentCaptcha = mock(() =>
				Promise.resolve({
					success: false,
					responseTime: 30000,
					timedOut: true,
				}),
			);

			void mock.module("../../util/captcha.ts", () => captchaMocks);

			// Mock API responses
			mockClient.setCustomResponse("users.stats.user", {
				stats,
				levelProgress: { currentLevel: 1, xpProgress: 50 },
			});

			mockClient.setCustomResponse("users.stats.captcha.log", {
				logged: true,
				isSuspicious: false,
			});

			mockClient.setCustomResponse("users.stats.captcha.failedCount.update", {
				updated: true,
				failedCount: 1,
				isLocked: false,
			});

			mockClient.setCustomResponse("users.stats.work.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
			});

			await executeWork({
				interaction: interaction as any,
				dbUser: user,
			});

			// Verify timeout message
			const response = interaction.getLastResponse();
			expect(response.embeds).toBeDefined();
			expect(response.embeds[0].data.description).toContain("Nestihl jsi odpovědět včas");
		});
	});

	describe("/daily command with captcha", () => {
		it("should show captcha less frequently for daily", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.createReadyToClaim(1);
			stats.dailyStreak = 5; // Will be multiplied by 2 for daily frequency

			// Mock captcha not shown (frequency check)
			captchaMocks.shouldShowCaptcha = mock(() => ({ showCaptcha: false }));

			void mock.module("../../util/captcha.ts", () => captchaMocks);

			// Mock API responses
			mockClient.setCustomResponse("users.stats.user", {
				stats,
				levelProgress: { currentLevel: 1, xpProgress: 50 },
			});

			mockClient.setCustomResponse("users.stats.daily.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
				cooldownEndTime: new Date(Date.now() + 86400000),
			});

			mockClient.setCustomResponse("users.stats.daily.claim", {
				updatedStats: { ...stats, dailyStreak: 6 },
				claimStats: {
					baseCoins: 100,
					baseXp: 50,
					currentLevel: 1,
					levelCoinsBonus: 10,
					levelXpBonus: 5,
					streakCoinsBonus: 30,
					streakXpBonus: 15,
					milestoneCoinsBonus: 50,
					milestoneXpBonus: 25,
					boostMultiplier: 1,
					boostCoinsBonus: 0,
					boostXpBonus: 0,
					isMilestone: false,
					earnedTotalCoins: 190,
					earnedTotalXp: 95,
				},
				levelProgress: {
					xpProgress: 145,
					progressPercentage: 45,
					xpForCurrentLevel: 100,
					xpForNextLevel: 200,
					currentXp: 145,
					xpNeeded: 55,
					currentLevel: 2,
				},
			});

			await executeDaily({
				interaction: interaction as any,
				dbUser: user,
			});

			// Verify captcha frequency check was called with doubled value
			expect(captchaMocks.shouldShowCaptcha).toHaveBeenCalledWith(10, 0, "123456789"); // dailyStreak * 2

			// Verify daily was claimed without captcha
			const response = interaction.getLastResponse();
			expect(response.embeds).toBeDefined();
			expect(response.embeds[0].data.title).toContain("Dávka vyzvednuta");
		});

		it("should preserve streak on successful captcha", async () => {
			const user = UserFactory.create({ id: 1, discordId: "123456789" });
			const stats = UserStatsFactory.createReadyToClaim(1);
			stats.dailyStreak = 10; // Existing streak

			// Mock successful captcha
			captchaMocks.shouldShowCaptcha = mock(() => ({ showCaptcha: true, triggerReason: "periodic_check_interval_5" }));
			captchaMocks.getCaptchaDifficulty = mock(() => "easy");
			captchaMocks.generateCaptcha = mock(() => ({
				type: "word",
				question: "RKOW",
				correctAnswer: "WORK",
				options: ["WORK", "WROK", "WORKS", "OWRK"],
				embedTitle: "🔐 Ověření - Slova",
				embedDescription: "Přeházené písmena: **RKOW**\nNápověda: Co děláš každý den",
			}));
			captchaMocks.presentCaptcha = mock(() =>
				Promise.resolve({
					success: true,
					responseTime: 4500,
					attemptedAnswer: "WORK",
				}),
			);
			captchaMocks.isSuspiciousResponseTime = mock(() => false);

			void mock.module("../../util/captcha.ts", () => captchaMocks);

			// Mock API responses
			mockClient.setCustomResponse("users.stats.user", {
				stats,
				levelProgress: { currentLevel: 1, xpProgress: 50 },
			});

			mockClient.setCustomResponse("users.stats.captcha.log", {
				logged: true,
				isSuspicious: false,
			});

			mockClient.setCustomResponse("users.stats.daily.cooldown", {
				isOnCooldown: false,
				cooldownRemaining: 0,
				cooldownEndTime: new Date(Date.now() + 86400000),
			});

			mockClient.setCustomResponse("users.stats.daily.claim", {
				updatedStats: { ...stats, dailyStreak: 11 }, // Streak incremented
				claimStats: {
					baseCoins: 100,
					baseXp: 50,
					currentLevel: 1,
					levelCoinsBonus: 10,
					levelXpBonus: 5,
					streakCoinsBonus: 55,
					streakXpBonus: 27,
					milestoneCoinsBonus: 0,
					milestoneXpBonus: 0,
					boostMultiplier: 1,
					boostCoinsBonus: 0,
					boostXpBonus: 0,
					isMilestone: false,
					earnedTotalCoins: 165,
					earnedTotalXp: 82,
				},
				levelProgress: {
					xpProgress: 132,
					progressPercentage: 32,
					xpForCurrentLevel: 100,
					xpForNextLevel: 200,
					currentXp: 132,
					xpNeeded: 68,
					currentLevel: 2,
				},
			});

			await executeDaily({
				interaction: interaction as any,
				dbUser: user,
			});

			// Verify captcha was shown
			expect(captchaMocks.presentCaptcha).toHaveBeenCalled();

			// Verify streak was preserved and incremented
			const response = interaction.getLastResponse();
			expect(response.embeds).toBeDefined();
			expect(response.embeds[0].data.description).toContain("11"); // New streak value
		});
	});

	describe("Progressive difficulty", () => {
		it("should increase difficulty based on suspicious score", async () => {
			// Mock setTimeout to avoid delays
			const originalSetTimeout = global.setTimeout;
			global.setTimeout = ((fn: any) => {
				fn();
				return 0;
			}) as any;
			const testCases = [
				{ score: 10, expectedDifficulty: "easy" },
				{ score: 45, expectedDifficulty: "medium" },
				{ score: 80, expectedDifficulty: "hard" },
			];

			for (const testCase of testCases) {
				const user = UserFactory.create({ id: 1, discordId: "123456789" });
				const stats = UserStatsFactory.createReadyToClaim(1);
				stats.suspiciousBehaviorScore = testCase.score;

				captchaMocks.shouldShowCaptcha = mock(() => ({
					showCaptcha: true,
					triggerReason: `suspicious_score_${testCase.score}`,
				}));
				captchaMocks.getCaptchaDifficulty = mock(() => testCase.expectedDifficulty);
				captchaMocks.generateCaptcha = mock(() => ({
					type: "math",
					question: "1 + 1 = ?",
					correctAnswer: "2",
					options: ["2", "1", "3", "4"],
					embedTitle: "🔐 Ověření",
					embedDescription: "Test",
				}));
				captchaMocks.presentCaptcha = mock(() =>
					Promise.resolve({
						success: true,
						responseTime: 3000,
						attemptedAnswer: "2",
					}),
				);

				void mock.module("../../util/captcha.ts", () => captchaMocks);

				// Mock API responses
				mockClient.setCustomResponse("users.stats.user", {
					stats,
					levelProgress: { currentLevel: 1, xpProgress: 50 },
				});

				mockClient.setCustomResponse("users.stats.captcha.log", {
					logged: true,
					isSuspicious: false,
				});

				mockClient.setCustomResponse("users.stats.work.cooldown", {
					isOnCooldown: false,
					cooldownRemaining: 0,
				});

				mockClient.setCustomResponse("users.stats.work.claim", {
					updatedStats: stats,
					message: "Work completed!",
					claimStats: {
						baseCoins: 80,
						baseXp: 40,
						currentLevel: 1,
						levelCoinsBonus: 10,
						levelXpBonus: 5,
						streakCoinsBonus: 0,
						streakXpBonus: 0,
						milestoneCoinsBonus: 0,
						milestoneXpBonus: 0,
						boostMultiplier: 1,
						boostCoinsBonus: 0,
						boostXpBonus: 0,
						isMilestone: false,
						earnedTotalCoins: 90,
						earnedTotalXp: 45,
					},
					levelProgress: {
						xpProgress: 50,
						progressPercentage: 50,
						xpForCurrentLevel: 0,
						xpForNextLevel: 100,
						currentXp: 50,
						xpNeeded: 50,
						currentLevel: 1,
					},
				});

				await executeWork({
					interaction: interaction as any,
					dbUser: user,
				});

				// Verify correct difficulty was used
				expect(captchaMocks.getCaptchaDifficulty).toHaveBeenCalledWith(testCase.score);
				expect(captchaMocks.generateCaptcha).toHaveBeenCalledWith(testCase.expectedDifficulty);
			}

			// Restore original setTimeout
			global.setTimeout = originalSetTimeout;
		});
	});
});
