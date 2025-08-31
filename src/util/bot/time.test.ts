import { describe, expect, it } from "bun:test";
import {
	formatCooldownWithTranslations as formatCooldown,
	formatNextAvailableWithTranslations as formatNextAvailable,
	formatNextAvailableSimple,
	formatTimeRemaining,
	formatTimestamp,
	getSecondsUntilNextCooldown,
	isValidTimestamp,
	type TimeTranslations,
} from "./time.js";

const mockTranslations: TimeTranslations = {
	time_seconds: (count) => `${count} seconds`,
	time_minutes: (count) => `${count} minutes`,
	time_hours: (count) => `${count} hours`,
	time_tomorrow: "tomorrow",
	time_in: (time) => `in ${time}`,
};

describe("time utilities", () => {
	describe("formatCooldown", () => {
		it("formats seconds correctly", () => {
			expect(formatCooldown(30, mockTranslations)).toBe("30 seconds");
			expect(formatCooldown(59, mockTranslations)).toBe("59 seconds");
		});

		it("formats minutes correctly", () => {
			expect(formatCooldown(60, mockTranslations)).toBe("1 minutes");
			expect(formatCooldown(90, mockTranslations)).toBe("2 minutes");
			expect(formatCooldown(3599, mockTranslations)).toBe("60 minutes");
		});

		it("formats hours correctly", () => {
			expect(formatCooldown(3600, mockTranslations)).toBe("1 hours");
			expect(formatCooldown(7200, mockTranslations)).toBe("2 hours");
		});
	});

	describe("formatNextAvailable", () => {
		it("returns tomorrow when no cooldown end time", () => {
			expect(formatNextAvailable(null, mockTranslations)).toBe("tomorrow");
		});

		it("returns now when cooldown has ended", () => {
			const past = new Date(Date.now() - 1000).toISOString();
			expect(formatNextAvailable(past, mockTranslations)).toBe("now");
		});

		it("formats future time correctly", () => {
			const future = new Date(Date.now() + 3661000).toISOString(); // ~1 hour
			const result = formatNextAvailable(future, mockTranslations);
			expect(result).toContain("in");
			expect(result).toContain("hours");
		});
	});

	describe("formatNextAvailableSimple", () => {
		it("returns Czech 'nyní' for zero or negative seconds", () => {
			expect(formatNextAvailableSimple(0)).toBe("nyní");
			expect(formatNextAvailableSimple(-10)).toBe("nyní");
		});

		it("formats Czech seconds correctly", () => {
			expect(formatNextAvailableSimple(1)).toBe("za 1 sekundu");
			expect(formatNextAvailableSimple(3)).toBe("za 3 sekundy");
			expect(formatNextAvailableSimple(10)).toBe("za 10 sekund");
		});

		it("formats Czech minutes correctly", () => {
			expect(formatNextAvailableSimple(60)).toBe("za 1 minutu");
			expect(formatNextAvailableSimple(180)).toBe("za 3 minuty");
			expect(formatNextAvailableSimple(600)).toBe("za 10 minut");
		});

		it("formats Czech hours correctly", () => {
			expect(formatNextAvailableSimple(3600)).toBe("za 1 hodinu");
			expect(formatNextAvailableSimple(10800)).toBe("za 3 hodiny");
			expect(formatNextAvailableSimple(36000)).toBe("za 10 hodin");
		});
	});

	describe("formatTimeRemaining", () => {
		it("returns 0h 0m 0s for zero or negative", () => {
			expect(formatTimeRemaining(0)).toBe("0h 0m 0s");
			expect(formatTimeRemaining(-10)).toBe("0h 0m 0s");
		});

		it("formats seconds only", () => {
			expect(formatTimeRemaining(45)).toBe("45s");
		});

		it("formats minutes and seconds", () => {
			expect(formatTimeRemaining(125)).toBe("2m 5s");
		});

		it("formats hours, minutes and seconds", () => {
			expect(formatTimeRemaining(3665)).toBe("1h 1m 5s");
		});
	});

	describe("isValidTimestamp", () => {
		it("returns true for valid timestamps", () => {
			expect(isValidTimestamp("2024-01-15T10:00:00Z")).toBe(true);
			expect(isValidTimestamp(new Date().toISOString())).toBe(true);
		});

		it("returns false for invalid timestamps", () => {
			expect(isValidTimestamp("invalid")).toBe(false);
			expect(isValidTimestamp("")).toBe(false);
		});
	});

	describe("formatTimestamp", () => {
		it("formats date only by default", () => {
			const date = "2024-01-15T10:30:45Z";
			const result = formatTimestamp(date);
			expect(result).toContain("1");
			expect(result).toContain("15");
			expect(result).toContain("2024");
		});

		it("includes time when requested", () => {
			const date = "2024-01-15T10:30:45Z";
			const result = formatTimestamp(date, true);
			expect(result.length).toBeGreaterThan(formatTimestamp(date).length);
		});
	});

	describe("getSecondsUntilNextCooldown", () => {
		it("returns 0 for past times", () => {
			const past = new Date(Date.now() - 10000).toISOString();
			expect(getSecondsUntilNextCooldown(past)).toBe(0);
		});

		it("returns positive seconds for future times", () => {
			const future = new Date(Date.now() + 10000).toISOString();
			const seconds = getSecondsUntilNextCooldown(future);
			expect(seconds).toBeGreaterThan(8);
			expect(seconds).toBeLessThanOrEqual(10);
		});
	});
});
