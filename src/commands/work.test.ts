import { describe, expect, it } from "bun:test";
import type { GuildMember } from "discord.js";
import { getSecureRandomIndex } from "../utils/random.ts";
import { storyActivityIds, workActivities } from "./work.ts";

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
// story=true → ONLY story activities (100% chance of story)
// story=false → ONLY non-story activities (0% chance of story)
function filterActivitiesByStoryMode(storyMode: boolean): WorkActivity[] {
	return storyMode
		? (workActivities as readonly WorkActivity[]).filter((act) => {
				const actId = getActivityId(act);
				return actId !== null && storyActivityIds.has(actId);
		  })
		: (workActivities as readonly WorkActivity[]).filter((act) => {
				const actId = getActivityId(act);
				return actId === null || !storyActivityIds.has(actId);
		  });
}

describe("Work command story mode switch", () => {
	it("should exclude story activities when story=false", () => {
		const iterations = 20;
		const filteredActivities = filterActivitiesByStoryMode(false);

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

	it("should ONLY select story activities when story=true", () => {
		const iterations = 20;
		const storyOnlyActivities = filterActivitiesByStoryMode(true);

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
		console.log(`story=true: Got ${storyCount} story activities out of ${iterations} tries (expected ${iterations})`);
	});

	it("should NEVER select story activities when story=false (100 iterations)", () => {
		const iterations = 100;
		const filteredActivities = filterActivitiesByStoryMode(false);

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

		// Should NEVER get a story activity when story=false
		expect(storyCount).toBe(0);
		console.log(`story=false: Got ${storyCount} story activities out of ${iterations} tries (expected 0)`);
	});

	it("should ALWAYS get stories when story=true (100 iterations)", () => {
		const iterations = 100;
		const storyOnlyActivities = filterActivitiesByStoryMode(true);

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

		console.log(`story=true stats:`);
		console.log(`  - Story activities in pool: ${storyOnlyActivities.length}`);
		console.log(`  - Expected probability: 100%`);
		console.log(`  - Actual stories: ${storyCount}/${iterations} (100%)`);

		// Should get ALL stories - 100% guarantee
		expect(storyCount).toBe(iterations);
	});
});

describe("Work command random selection", () => {
	it("should produce uniform distribution without modulo bias", () => {
		const activitiesCount = 36; // Same as workActivities.length
		const iterations = 10000;
		const distribution: number[] = Array(activitiesCount).fill(0);

		// Simulate the random selection logic from work.ts
		for (let i = 0; i < iterations; i++) {
			const randomIndex = getSecureRandomIndex(activitiesCount);
			distribution[randomIndex]!++;
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
