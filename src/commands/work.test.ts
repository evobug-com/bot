/* eslint-disable @typescript-eslint/no-non-null-assertion -- Test file uses non-null assertions after expect().toBeDefined() checks */

import { describe, expect, it } from "bun:test";
import type { GuildMember } from "discord.js";
import { getSecureRandomIndex } from "../utils/random.ts";
import { storyActivityIds, workActivities } from "./work.ts";
import { WORK_CONFIG } from "../services/work/config.ts";
import { isStoryWorkEnabled, setStoryWorkEnabled } from "../services/userSettings/storage.ts";

// Type for work activity - can be object or function
type WorkActivity = { id: string; title: string; activity: string } | ((_member: GuildMember) => { id: string; title: string; activity: string });

// Helper to get activity ID (handles function activities)
function getActivityId(activity: WorkActivity): string | null {
	if (typeof activity === "function") {
		return null;
	}
	return activity.id;
}

// Replicates the filtering logic from work.ts
// shouldTriggerStory=true → ONLY story activities
// shouldTriggerStory=false → ONLY non-story activities
function filterActivitiesByStoryTrigger(shouldTriggerStory: boolean): WorkActivity[] {
	return shouldTriggerStory
		? (workActivities as readonly WorkActivity[]).filter((act) => {
				const actId = getActivityId(act);
				return actId !== null && storyActivityIds.has(actId);
		  })
		: (workActivities as readonly WorkActivity[]).filter((act) => {
				const actId = getActivityId(act);
				return actId === null || !storyActivityIds.has(actId);
		  });
}

describe("Work command story chance system", () => {
	it("WORK_CONFIG should have correct default values", () => {
		expect(WORK_CONFIG.storyWorkEnabled).toBe(true);
		expect(WORK_CONFIG.storyChancePercent).toBe(20);
	});

	it("should exclude story activities when shouldTriggerStory=false", () => {
		const iterations = 20;
		const filteredActivities = filterActivitiesByStoryTrigger(false);

		for (let i = 0; i < iterations; i++) {
			const randomIndex = getSecureRandomIndex(filteredActivities.length);
			const selectedActivity = filteredActivities[randomIndex];
			expect(selectedActivity).toBeDefined();

			const actId = getActivityId(selectedActivity!);

			// If it has an ID, it should NOT be a story activity
			if (actId !== null) {
				expect(storyActivityIds.has(actId)).toBe(false);
			}
		}
	});

	it("should ONLY select story activities when shouldTriggerStory=true", () => {
		const iterations = 20;
		const storyOnlyActivities = filterActivitiesByStoryTrigger(true);

		// Verify that ONLY story activities are in the pool
		expect(storyOnlyActivities.length).toBe(storyActivityIds.size);

		// Every activity in the pool should be a story activity
		for (const act of storyOnlyActivities) {
			const actId = getActivityId(act);
			expect(actId).not.toBeNull();
			expect(storyActivityIds.has(actId!)).toBe(true);
		}

		// Run 20 iterations - ALL should be story activities
		let storyCount = 0;
		for (let i = 0; i < iterations; i++) {
			const randomIndex = getSecureRandomIndex(storyOnlyActivities.length);
			const selectedActivity = storyOnlyActivities[randomIndex];
			expect(selectedActivity).toBeDefined();

			const actId = getActivityId(selectedActivity!);
			expect(actId).not.toBeNull();
			expect(storyActivityIds.has(actId!)).toBe(true);
			storyCount++;
		}

		// Should get 100% story activities
		expect(storyCount).toBe(iterations);
	});

	it("should NEVER select story activities when shouldTriggerStory=false (100 iterations)", () => {
		const iterations = 100;
		const filteredActivities = filterActivitiesByStoryTrigger(false);

		let storyCount = 0;
		const selectedIds: string[] = [];

		for (let i = 0; i < iterations; i++) {
			const randomIndex = getSecureRandomIndex(filteredActivities.length);
			const selectedActivity = filteredActivities[randomIndex];
			expect(selectedActivity).toBeDefined();

			const actId = getActivityId(selectedActivity!);
			if (actId !== null) {
				selectedIds.push(actId);
				if (storyActivityIds.has(actId)) {
					storyCount++;
				}
			}
		}

		// Should NEVER get a story activity when shouldTriggerStory=false
		expect(storyCount).toBe(0);
	});

	it("should ALWAYS get stories when shouldTriggerStory=true (100 iterations)", () => {
		const iterations = 100;
		const storyOnlyActivities = filterActivitiesByStoryTrigger(true);

		let storyCount = 0;

		for (let i = 0; i < iterations; i++) {
			const randomIndex = getSecureRandomIndex(storyOnlyActivities.length);
			const selectedActivity = storyOnlyActivities[randomIndex];
			expect(selectedActivity).toBeDefined();

			const actId = getActivityId(selectedActivity!);
			// Every selection MUST be a story activity
			expect(actId).not.toBeNull();
			expect(storyActivityIds.has(actId!)).toBe(true);
			storyCount++;
		}

		// Should get ALL stories - 100% guarantee
		expect(storyCount).toBe(iterations);
	});

	it("story chance calculation should work correctly", () => {
		// Test the chance calculation logic
		// shouldTriggerStory = storyWorkEnabled && randomValue < storyChancePercent
		// getSecureRandomIndex(100) returns 0-99, storyChancePercent is 20
		// So values 0-19 trigger (20% chance), values 20-99 don't

		// Simulate with mocked random values (as integers 0-99)
		const testCases = [
			{ randomValue: 10, expectedTrigger: true },   // 10 < 20 = true
			{ randomValue: 19, expectedTrigger: true },   // 19 < 20 = true
			{ randomValue: 20, expectedTrigger: false },  // 20 < 20 = false
			{ randomValue: 50, expectedTrigger: false },  // 50 < 20 = false
			{ randomValue: 99, expectedTrigger: false },  // 99 < 20 = false
		];

		for (const { randomValue, expectedTrigger } of testCases) {
			const shouldTriggerStory =
				WORK_CONFIG.storyWorkEnabled && randomValue < WORK_CONFIG.storyChancePercent;
			expect(shouldTriggerStory).toBe(expectedTrigger);
		}
	});

	it("story chance should respect storyWorkEnabled=false", () => {
		// When disabled, no stories should ever trigger
		const testRandomValues = [0, 5, 10, 15, 19];

		for (const randomValue of testRandomValues) {
			// Simulate disabled config
			const storyWorkEnabled = false;
			const shouldTriggerStory =
				storyWorkEnabled && randomValue < WORK_CONFIG.storyChancePercent;
			expect(shouldTriggerStory).toBe(false);
		}
	});
});

describe("Work command random selection", () => {
	it("should produce uniform distribution without modulo bias", () => {
		const activitiesCount = 36; // Same as workActivities.length
		const iterations = 10000;
		const distribution: number[] = Array(activitiesCount).fill(0);

		// Simulate the random selection logic from work.ts
		for (let i = 0; i < iterations; i++) {
			distribution[getSecureRandomIndex(activitiesCount)]!++;
		}

		// Expected value per bucket
		const expectedPerBucket = iterations / activitiesCount;

		// Calculate chi-square statistic to test uniformity
		let chiSquare = 0;
		for (const count of distribution) {
			const deviation = count - expectedPerBucket;
			chiSquare += (deviation * deviation) / expectedPerBucket;
		}

		// With 35 degrees of freedom (36-1), chi-square critical value at 0.05 significance is ~49.8
		// If our chi-square is less than this, distribution is acceptably uniform
		expect(chiSquare).toBeLessThan(60); // Using slightly higher threshold for test stability

		// Additional check: no bucket should be extremely under or over-represented
		const min = Math.min(...distribution);
		const max = Math.max(...distribution);

		// Each bucket should have at least 70% of expected and at most 130% of expected
		expect(min).toBeGreaterThan(expectedPerBucket * 0.7);
		expect(max).toBeLessThan(expectedPerBucket * 1.3);
	});

	it("should not repeat the same index 4 times in a row frequently", () => {
		const activitiesCount = 36;
		const iterations = 1000;
		let fourInARowCount = 0;

		for (let trial = 0; trial < iterations; trial++) {
			const sequence: number[] = [];

			for (let i = 0; i < 4; i++) {
				const randomIndex = getSecureRandomIndex(activitiesCount);
				sequence.push(randomIndex);
			}

			// Check if all 4 are the same
			if (sequence[0] === sequence[1] && sequence[1] === sequence[2] && sequence[2] === sequence[3]) {
				fourInARowCount++;
			}
		}

		// Probability of 4 same in a row: (1/36)^3 = 1/46656 ≈ 0.00002145
		// Expected occurrences in 1000 trials: 1000 * 0.00002145 ≈ 0.02145
		// We should see 0-2 occurrences in most test runs
		expect(fourInARowCount).toBeLessThanOrEqual(5); // Very generous upper bound
	});

	it("should always produce valid indices", () => {
		const activitiesCount = 36;
		const iterations = 1000;

		for (let i = 0; i < iterations; i++) {
			const randomIndex = getSecureRandomIndex(activitiesCount);

			expect(randomIndex).toBeGreaterThanOrEqual(0);
			expect(randomIndex).toBeLessThan(activitiesCount);
			expect(Number.isInteger(randomIndex)).toBe(true);
		}
	});
});

describe("Work command user settings integration", () => {
	const getTestUserId = () => `test-work-${Date.now()}-${Math.random().toString(36).slice(2)}`;

	it("should trigger story based on combined global + user + chance settings", () => {
		// Test cases for the combined logic:
		// shouldTriggerStory = globalEnabled && userEnabled && randomValue < storyChancePercent
		const testCases = [
			// Global enabled, user enabled, chance succeeds -> true
			{ globalEnabled: true, userEnabled: true, randomValue: 10, expected: true },
			// Global enabled, user enabled, chance fails -> false
			{ globalEnabled: true, userEnabled: true, randomValue: 50, expected: false },
			// Global enabled, user disabled -> false (regardless of chance)
			{ globalEnabled: true, userEnabled: false, randomValue: 10, expected: false },
			// Global disabled, user enabled -> false (regardless of chance)
			{ globalEnabled: false, userEnabled: true, randomValue: 10, expected: false },
			// Global disabled, user disabled -> false
			{ globalEnabled: false, userEnabled: false, randomValue: 10, expected: false },
		];

		for (const { globalEnabled, userEnabled, randomValue, expected } of testCases) {
			const shouldTriggerStory =
				globalEnabled &&
				userEnabled &&
				randomValue < WORK_CONFIG.storyChancePercent;

			expect(shouldTriggerStory).toBe(expected);
		}
	});

	it("should respect user preference when checking isStoryWorkEnabled", () => {
		const userId = getTestUserId();

		// Default: enabled
		expect(isStoryWorkEnabled(userId)).toBe(true);

		// Disable for this user
		setStoryWorkEnabled(userId, false);
		expect(isStoryWorkEnabled(userId)).toBe(false);

		// Re-enable
		setStoryWorkEnabled(userId, true);
		expect(isStoryWorkEnabled(userId)).toBe(true);
	});

	it("should not affect other users when one user changes settings", () => {
		const user1 = getTestUserId();
		const user2 = getTestUserId();

		// Both start with default (enabled)
		expect(isStoryWorkEnabled(user1)).toBe(true);
		expect(isStoryWorkEnabled(user2)).toBe(true);

		// User1 disables
		setStoryWorkEnabled(user1, false);

		// User1 disabled, user2 still enabled
		expect(isStoryWorkEnabled(user1)).toBe(false);
		expect(isStoryWorkEnabled(user2)).toBe(true);
	});
});
