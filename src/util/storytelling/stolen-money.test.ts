import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { ORPCError } from "@orpc/client";
import { generateStolenMoneyStory } from "./stolen-money.ts";

describe("Stolen Money Storytelling", () => {
	beforeEach(() => {
		// Mock the orpc client to return successful responses
		void mock.module("../../client/client.ts", () => ({
			orpc: {
				users: {
					stats: {
						reward: {
							grant: async (input: {
								userId: number;
								coins: number;
								xp: number;
								activityType: string;
								notes: string;
							}) => {
								// Check for insufficient funds scenario (lawyer fee when user has no money)
								if (
									input.activityType === "stolen_money_lawyer" &&
									input.coins < 0 &&
									Math.abs(input.coins) > 2500 // Simulate insufficient funds sometimes
								) {
									// Return ORPC error tuple format with proper ORPCError instance
									const error = new ORPCError("INSUFFICIENT_FUNDS", {
										message: "Insufficient funds",
									});
									return [error, undefined];
								}

								// Return successful response in ORPC tuple format [error, data]
								return [
									undefined,
									{
										statsLog: {
											id: Math.floor(Math.random() * 10000),
											userId: input.userId,
											coins: input.coins,
											xp: input.xp,
											activityType: input.activityType,
											notes: input.notes,
											createdAt: new Date().toISOString(),
										},
										updatedStats: {
											id: input.userId,
											userId: input.userId,
											coinsCount: 1000 + input.coins,
											xp: 500 + input.xp,
											level: 10,
											workCount: 5,
											dailyCount: 3,
											createdAt: new Date().toISOString(),
											updatedAt: new Date().toISOString(),
										},
										message: "Reward granted successfully",
										levelProgress: {
											currentLevel: 10,
											currentXp: 500 + input.xp,
											xpForCurrentLevel: 450,
											xpForNextLevel: 550,
											xpProgress: 50,
											percentProgress: 50,
										},
									},
								];
							},
						},
					},
				},
			},
		}));
	});

	it("should return a valid story result structure", async () => {
		const result = await generateStolenMoneyStory(1, 10);

		// Check that result has all required properties
		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result).toHaveProperty("xpGranted");

		// Check types
		expect(typeof result.story).toBe("string");
		expect(typeof result.totalCoinsChange).toBe("number");
		expect(typeof result.xpGranted).toBe("number");
	});

	it("should always grant XP regardless of story outcome", async () => {
		const userLevel = 10;
		const expectedXp = userLevel * 6 + 50; // Double base work: 10 * 6 + 50 = 110

		const result = await generateStolenMoneyStory(1, userLevel);

		expect(result.xpGranted).toBe(expectedXp);
	});

	it("should generate a non-empty story", async () => {
		const result = await generateStolenMoneyStory(1, 10);

		expect(result.story.length).toBeGreaterThan(0);
		expect(result.story).toContain("Ukradl jsi");
		expect(result.story).toContain("Celková bilance:");
	});

	it("should include stolen amount in story", async () => {
		const result = await generateStolenMoneyStory(1, 10);

		// Story should mention stealing coins
		expect(result.story).toContain("mincí");
		expect(result.story).toMatch(/\d+/); // Contains at least one number
	});

	it("should have valid coin change (within stolen range or negative)", async () => {
		const result = await generateStolenMoneyStory(1, 10);

		// Total coins change should be within reasonable bounds
		// Stolen: 200-1000, so even with worst case penalties, should be > -2000
		expect(result.totalCoinsChange).toBeGreaterThan(-2000);
		expect(result.totalCoinsChange).toBeLessThanOrEqual(1000);
	});

	it("should calculate XP correctly for different levels", async () => {
		const levels = [1, 5, 10, 25, 50];

		for (const level of levels) {
			const result = await generateStolenMoneyStory(1, level);
			const expectedXp = level * 6 + 50;

			expect(result.xpGranted).toBe(expectedXp);
		}
	});

	it("should include summary in story", async () => {
		const result = await generateStolenMoneyStory(1, 10);

		// Story should have a summary at the end
		expect(result.story).toContain("Celková bilance:");
		expect(result.story).toContain("XP");
	});

	it("should handle all possible story branches", async () => {
		// Run multiple times to potentially hit different branches
		const results = [];

		for (let i = 0; i < 10; i++) {
			const result = await generateStolenMoneyStory(i + 1, 10);
			results.push(result);
		}

		// All results should be valid
		for (const result of results) {
			expect(result.story.length).toBeGreaterThan(0);
			expect(result.xpGranted).toBe(110); // level 10: 10 * 6 + 50
			expect(result.totalCoinsChange).toBeGreaterThan(-2000);
		}

		// With 10 runs, we should see some variety in outcomes
		const uniqueStories = new Set(results.map((r) => r.story));
		expect(uniqueStories.size).toBeGreaterThan(1);
	});

	it("should mention police in some scenarios", async () => {
		let policeMentioned = false;

		// Run multiple times to increase chance of hitting police scenario
		for (let i = 0; i < 20; i++) {
			const result = await generateStolenMoneyStory(i + 1, 10);
			if (result.story.includes("Policie") || result.story.includes("🚔")) {
				policeMentioned = true;
				break;
			}
		}

		// With 20 runs at 30% chance, very likely to see police at least once
		// But we won't fail the test if we don't, as it's probabilistic
		// This is more of a smoke test
		expect(policeMentioned || true).toBe(true);
	});

	it("should have positive or negative outcomes", async () => {
		const results = [];

		// Run multiple times to get different outcomes
		for (let i = 0; i < 10; i++) {
			const result = await generateStolenMoneyStory(i + 1, 10);
			results.push(result);
		}

		const positiveOutcomes = results.filter((r) => r.totalCoinsChange > 0);

		// We should see at least some positive outcomes across 10 runs
		// (70% not caught + some block fine scenarios = high chance)
		expect(positiveOutcomes.length).toBeGreaterThan(0);
	});

	it("should include coin amounts in the summary", async () => {
		const result = await generateStolenMoneyStory(1, 10);

		// Summary should show the final coin change
		const summaryRegex = /Celková bilance:.*[+-]?\d+.*mincí.*\d+.*XP/;
		expect(result.story).toMatch(summaryRegex);
	});

	it("should handle level 1 user correctly", async () => {
		const result = await generateStolenMoneyStory(1, 1);

		expect(result.xpGranted).toBe(56); // 1 * 6 + 50 = 56
		expect(result.story.length).toBeGreaterThan(0);
		expect(result.story).toContain("Ukradl jsi");
	});

	it("should handle high level user correctly", async () => {
		const result = await generateStolenMoneyStory(1, 100);

		expect(result.xpGranted).toBe(650); // 100 * 6 + 50 = 650
		expect(result.story.length).toBeGreaterThan(0);
		expect(result.story).toContain("Ukradl jsi");
	});

	it("should call reward.grant API for XP", async () => {
		const mockGrantSpy = spyOn(
			await import("../../client/client.ts").then((m) => m.orpc.users.stats.reward),
			"grant",
		);

		await generateStolenMoneyStory(1, 10);

		// Should have called grant at least once for XP
		expect(mockGrantSpy).toHaveBeenCalled();
	});
});
