import { describe, expect, it } from "bun:test";
import { getSecureRandomIndex } from "./random.ts";

describe("getSecureRandomIndex", () => {
	it("should return 0 for length <= 1", () => {
		expect(getSecureRandomIndex(0)).toBe(0);
		expect(getSecureRandomIndex(1)).toBe(0);
		expect(getSecureRandomIndex(-5)).toBe(0);
	});

	it("should always return valid indices within bounds", () => {
		const lengths = [2, 5, 10, 36, 100, 1000];

		for (const length of lengths) {
			for (let i = 0; i < 100; i++) {
				const index = getSecureRandomIndex(length);
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(length);
				expect(Number.isInteger(index)).toBe(true);
			}
		}
	});

	it("should produce uniform distribution", () => {
		const length = 10;
		const iterations = 10000;
		const distribution: number[] = Array(length).fill(0);

		for (let i = 0; i < iterations; i++) {
			const index = getSecureRandomIndex(length);
			distribution[index]!++;
		}

		const expectedPerBucket = iterations / length;

		// Chi-square test for uniformity
		let chiSquare = 0;
		for (const count of distribution) {
			const deviation = count - expectedPerBucket;
			chiSquare += (deviation * deviation) / expectedPerBucket;
		}

		// With 9 degrees of freedom, critical value at 0.05 is ~16.9
		expect(chiSquare).toBeLessThan(25);
	});

	it("should handle edge case of length 2 (coin flip)", () => {
		const iterations = 1000;
		let zeros = 0;
		let ones = 0;

		for (let i = 0; i < iterations; i++) {
			const result = getSecureRandomIndex(2);
			if (result === 0) zeros++;
			else ones++;
		}

		// Should be roughly 50/50, allow 40-60% range
		expect(zeros).toBeGreaterThan(iterations * 0.4);
		expect(zeros).toBeLessThan(iterations * 0.6);
		expect(ones).toBeGreaterThan(iterations * 0.4);
		expect(ones).toBeLessThan(iterations * 0.6);
	});
});
