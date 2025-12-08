import { describe, expect, it } from "bun:test";
import { getSecureRandomIndex } from "../utils/random.ts";

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
