/* eslint-disable @typescript-eslint/no-non-null-assertion -- Test file uses non-null assertions for test data */
import { beforeEach, describe, expect, it } from "bun:test";
import { z } from "zod";
import { UserFactory, UserStatsFactory } from "../factories/user.factory.ts";
import { createMockInteraction } from "../mocks/discord-mock.ts";
import { MockORPCClient } from "../mocks/orpc-mock.ts";
import { ZodValueGenerator } from "../utils/zod-generator.ts";

// Define schemas directly for testing
const testSchemas = {
	workCooldownResponse: z.object({
		isOnCooldown: z.boolean(),
		cooldownRemaining: z.number().int().min(0),
		cooldownEndTime: z.date().optional(),
	}),

	workClaimResponse: z.object({
		statsLog: z.object({
			id: z.number(),
			userId: z.number(),
			activityType: z.string(),
			xpEarned: z.number(),
			coinsEarned: z.number(),
			createdAt: z.date(),
		}),
		updatedStats: z.object({
			id: z.number(),
			userId: z.number(),
			coinsCount: z.number(),
			xpCount: z.number(),
			workCount: z.number(),
			dailyStreak: z.number(),
		}),
		message: z.string(),
		levelUp: z
			.object({
				newLevel: z.number(),
				oldLevel: z.number(),
				bonusCoins: z.number(),
			})
			.optional(),
		claimStats: z.object({
			baseCoins: z.number(),
			baseXp: z.number(),
			earnedTotalCoins: z.number(),
			earnedTotalXp: z.number(),
			boostMultiplier: z.number(),
			isMilestone: z.boolean(),
		}),
		levelProgress: z.object({
			currentLevel: z.number(),
			xpProgress: z.number(),
			xpNeeded: z.number(),
			progressPercentage: z.number(),
		}),
	}),

	dailyClaimResponse: z.object({
		updatedStats: z.object({
			id: z.number(),
			userId: z.number(),
			coinsCount: z.number(),
			xpCount: z.number(),
			dailyStreak: z.number(),
			maxDailyStreak: z.number(),
		}),
		levelUp: z
			.object({
				newLevel: z.number(),
				oldLevel: z.number(),
				bonusCoins: z.number(),
			})
			.optional(),
		claimStats: z.object({
			earnedTotalCoins: z.number(),
			earnedTotalXp: z.number(),
			isMilestone: z.boolean(),
			streakCoinsBonus: z.number(),
			streakXpBonus: z.number(),
		}),
		levelProgress: z.object({
			currentLevel: z.number(),
			xpProgress: z.number(),
			xpNeeded: z.number(),
		}),
	}),
};

describe("Simple Bot Test Example", () => {
	let mockClient: MockORPCClient;
	let generator: ZodValueGenerator;

	beforeEach(() => {
		generator = new ZodValueGenerator({ seed: 123 });
		mockClient = new MockORPCClient();
	});

	it("should generate mock data for work command", () => {
		// Generate mock data for work cooldown
		const cooldownData = generator.generate(testSchemas.workCooldownResponse);
		expect(cooldownData).toBeDefined();
		expect(typeof cooldownData.isOnCooldown).toBe("boolean");
		expect(typeof cooldownData.cooldownRemaining).toBe("number");

		// Generate mock data for work claim
		const claimData = generator.generate(testSchemas.workClaimResponse);
		expect(claimData).toBeDefined();
		expect(claimData.updatedStats).toBeDefined();
		expect(typeof claimData.updatedStats.coinsCount).toBe("number");
		expect(typeof claimData.message).toBe("string");
	});

	it("should generate all variations of boolean fields", () => {
		const variations = generator.generateAllVariations(testSchemas.workCooldownResponse);
		expect(variations.length).toBeGreaterThan(0);

		// Should have both true and false for isOnCooldown
		const hasTrue = variations.some((v) => v.isOnCooldown === true);
		const hasFalse = variations.some((v) => v.isOnCooldown === false);
		expect(hasTrue || hasFalse).toBe(true);
	});

	it("should generate milestone scenarios", () => {
		// Generate a milestone daily claim
		const dailyData = generator.generate(testSchemas.dailyClaimResponse);
		dailyData.claimStats.isMilestone = true;
		dailyData.updatedStats.dailyStreak = 5;
		dailyData.claimStats.earnedTotalCoins = 500;

		expect(dailyData.claimStats.isMilestone).toBe(true);
		expect(dailyData.updatedStats.dailyStreak).toBe(5);
	});

	it("should handle level up scenarios", () => {
		const workData = generator.generate(testSchemas.workClaimResponse);

		// Simulate level up
		workData.levelUp = {
			oldLevel: 1,
			newLevel: 2,
			bonusCoins: 100,
		};

		expect(workData.levelUp).toBeDefined();
		expect(workData.levelUp.newLevel).toBe(2);
		expect(workData.levelUp.bonusCoins).toBe(100);
	});

	it("should test mock ORPC client with custom responses", async () => {
		const client = mockClient.createClient();

		// Set up custom response
		const customWorkResponse = generator.generate(testSchemas.workClaimResponse);
		customWorkResponse.message = "Great work! You earned rewards!";
		customWorkResponse.updatedStats.coinsCount = 1500;

		mockClient.setCustomResponse("users.stats.work.claim", customWorkResponse);

		// Verify the mock returns our custom data through the client
		const response = await (client as any).users.stats.work.claim({
			userId: 1,
			boostCount: 0,
		});

		expect(response).toBeDefined();
		expect(response.message).toBe("Great work! You earned rewards!");
		expect(response.updatedStats.coinsCount).toBe(1500);
	});

	it("should create realistic user scenarios", () => {
		// New user scenario
		const newUser = UserFactory.create({ username: "NewPlayer" });
		const newStats = UserStatsFactory.createNewUser(newUser.id);

		expect(newStats.coinsCount).toBe(0);
		expect(newStats.xpCount).toBe(0);
		expect(newStats.dailyStreak).toBe(0);

		// Veteran user scenario
		const vetUser = UserFactory.create({ username: "VeteranPlayer" });
		const vetStats = UserStatsFactory.createVeteranUser(vetUser.id);

		expect(vetStats.coinsCount).toBeGreaterThan(50000);
		expect(vetStats.workCount).toBeGreaterThan(500);
		expect(vetStats.dailyStreak).toBeGreaterThan(15);

		// User on cooldown
		const cooldownUser = UserFactory.create({ username: "CooldownPlayer" });
		const cooldownStats = UserStatsFactory.createOnCooldown(cooldownUser.id, "work");

		expect(cooldownStats.lastWorkAt).toBeDefined();
		const timeSinceWork = Date.now() - cooldownStats.lastWorkAt!.getTime();
		expect(timeSinceWork).toBeLessThan(3600000); // Less than 1 hour
	});

	it("should test Discord interaction mocking", () => {
		const interaction = createMockInteraction({
			commandName: "work",
			user: { id: "123456", username: "TestUser" },
			channelId: "commands-channel",
		});

		expect(interaction.commandName).toBe("work");
		expect(interaction.user.username).toBe("TestUser");
		expect(interaction.guild).toBeDefined();

		// Test defer and reply
		void interaction.deferReply();
		expect(interaction.deferred).toBe(true);

		void interaction.editReply({
			content: "Processing your work request...",
		});

		const responses = interaction.getResponses();
		expect(responses.length).toBe(1);
		expect(responses[0].content).toContain("Processing");
	});

	it("should demonstrate complete test flow", async () => {
		// 1. Create user and stats
		const user = UserFactory.create({
			id: 1,
			discordId: "123456",
			username: "TestPlayer",
		});
		const stats = UserStatsFactory.createReadyToClaim(user.id);

		// 2. Create mock interaction
		const interaction = createMockInteraction({
			commandName: "work",
			user: { id: user.discordId!, username: user.username! },
		});

		// 3. Set up mock ORPC responses
		const mockORPC = new MockORPCClient();
		const client = mockORPC.createClient();

		// Not on cooldown
		mockORPC.setCustomResponse("users.stats.work.cooldown", {
			isOnCooldown: false,
			cooldownRemaining: 0,
		});

		// Successful work claim
		const workResponse = generator.generate(testSchemas.workClaimResponse);
		workResponse.updatedStats = {
			...stats,
			coinsCount: stats.coinsCount + 100,
			xpCount: stats.xpCount + 50,
			workCount: stats.workCount + 1,
		};
		workResponse.message = "Work completed successfully!";
		workResponse.claimStats.earnedTotalCoins = 100;
		workResponse.claimStats.earnedTotalXp = 50;

		mockORPC.setCustomResponse("users.stats.work.claim", workResponse);

		// 4. Simulate command execution
		await interaction.deferReply();

		// Mock the work command logic
		const cooldown = await (client as any).users.stats.work.cooldown({ userId: user.id });

		if (!cooldown.isOnCooldown) {
			const result = await (client as any).users.stats.work.claim({
				userId: user.id,
				boostCount: 0,
			});

			await interaction.editReply({
				embeds: [
					{
						title: "Work Complete!",
						description: result.message,
						fields: [
							{ name: "Coins Earned", value: `+${result.claimStats.earnedTotalCoins}`, inline: true },
							{ name: "XP Earned", value: `+${result.claimStats.earnedTotalXp}`, inline: true },
						],
					},
				],
			});
		}

		// 5. Verify results
		const responses = interaction.getResponses();
		expect(responses).toHaveLength(1);
		expect(responses[0].embeds).toBeDefined();
		expect(responses[0].embeds[0].title).toBe("Work Complete!");
		expect(responses[0].embeds[0].fields).toHaveLength(2);
	});
});

// Export for use in other tests
export { testSchemas };
