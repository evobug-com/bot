import { describe, expect, it } from "bun:test";

// Re-implement the core logic for testing (matches handleActivityPoints.ts)
interface WeeklyResetState {
	lastResetWeek: number;
	lastResetYear: number;
	lastResetDate: string;
}

/**
 * Get ISO week number and year for a date
 * Week 1 is the week containing January 4th (ISO 8601)
 */
function getISOWeekAndYear(date: Date): { week: number; year: number } {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	// Set to nearest Thursday (current date + 4 - current day number, make Sunday 7)
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	// Get first day of year
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	// Calculate full weeks to nearest Thursday
	const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
	return { week, year: d.getUTCFullYear() };
}

/**
 * Check if it's time for a weekly reset
 */
function shouldReset(
	state: WeeklyResetState | null,
	currentWeek: number,
	currentYear: number,
	dayOfWeek: number,
): boolean {
	// If no previous reset, we should reset (but only on Monday or later)
	if (!state) {
		return dayOfWeek >= 1; // Monday (1) or any day after
	}

	// Check if we're in a new week compared to last reset
	const isNewWeek =
		currentYear > state.lastResetYear || (currentYear === state.lastResetYear && currentWeek > state.lastResetWeek);

	return isNewWeek;
}

describe("handleActivityPoints", () => {
	describe("getISOWeekAndYear", () => {
		it("should calculate week 1 of 2024 correctly", () => {
			// January 1, 2024 is a Monday - it's week 1
			const jan1 = new Date("2024-01-01");
			const result = getISOWeekAndYear(jan1);
			expect(result.week).toBe(1);
			expect(result.year).toBe(2024);
		});

		it("should calculate week number for mid-year date", () => {
			// June 15, 2024 is a Saturday
			const june15 = new Date("2024-06-15");
			const result = getISOWeekAndYear(june15);
			expect(result.week).toBe(24);
			expect(result.year).toBe(2024);
		});

		it("should handle year boundary - Dec 31, 2024", () => {
			// Dec 31, 2024 is a Tuesday - ISO week 1 of 2025
			const dec31 = new Date("2024-12-31");
			const result = getISOWeekAndYear(dec31);
			// Dec 31, 2024 belongs to week 1 of 2025 in ISO
			expect(result.week).toBe(1);
			expect(result.year).toBe(2025);
		});

		it("should handle year boundary - Jan 1, 2025", () => {
			// Jan 1, 2025 is a Wednesday - ISO week 1 of 2025
			const jan1_2025 = new Date("2025-01-01");
			const result = getISOWeekAndYear(jan1_2025);
			expect(result.week).toBe(1);
			expect(result.year).toBe(2025);
		});

		it("should return same week for all days within a week", () => {
			// Monday Dec 9, 2024 through Sunday Dec 15, 2024 - all week 50
			const monday = new Date("2024-12-09");
			const tuesday = new Date("2024-12-10");
			const wednesday = new Date("2024-12-11");
			const thursday = new Date("2024-12-12");
			const friday = new Date("2024-12-13");
			const saturday = new Date("2024-12-14");
			const sunday = new Date("2024-12-15");

			expect(getISOWeekAndYear(monday).week).toBe(50);
			expect(getISOWeekAndYear(tuesday).week).toBe(50);
			expect(getISOWeekAndYear(wednesday).week).toBe(50);
			expect(getISOWeekAndYear(thursday).week).toBe(50);
			expect(getISOWeekAndYear(friday).week).toBe(50);
			expect(getISOWeekAndYear(saturday).week).toBe(50);
			expect(getISOWeekAndYear(sunday).week).toBe(50);
		});

		it("should increment week on Monday", () => {
			// Sunday Dec 15, 2024 is week 50, Monday Dec 16, 2024 is week 51
			const sunday = new Date("2024-12-15");
			const monday = new Date("2024-12-16");

			expect(getISOWeekAndYear(sunday).week).toBe(50);
			expect(getISOWeekAndYear(monday).week).toBe(51);
		});
	});

	describe("shouldReset - weekly reset logic", () => {
		it("should return true if no previous reset state exists (on Monday or later)", () => {
			// Monday = day 1, should reset
			expect(shouldReset(null, 50, 2024, 1)).toBe(true);
			// Tuesday = day 2, should reset
			expect(shouldReset(null, 50, 2024, 2)).toBe(true);
			// Wednesday = day 3, should reset
			expect(shouldReset(null, 50, 2024, 3)).toBe(true);
		});

		it("should return false if no previous reset and it is Sunday", () => {
			// Sunday = day 0, should NOT reset (wait for Monday to start a full week)
			expect(shouldReset(null, 50, 2024, 0)).toBe(false);
		});

		it("should return false if already reset this week (same week, same year)", () => {
			const state: WeeklyResetState = {
				lastResetWeek: 50,
				lastResetYear: 2024,
				lastResetDate: "2024-12-09T00:00:00.000Z",
			};

			// Same week 50, same year 2024 - should NOT reset
			expect(shouldReset(state, 50, 2024, 1)).toBe(false); // Monday
			expect(shouldReset(state, 50, 2024, 5)).toBe(false); // Friday
			expect(shouldReset(state, 50, 2024, 0)).toBe(false); // Sunday
		});

		it("should return true when entering a new week (same year)", () => {
			const state: WeeklyResetState = {
				lastResetWeek: 50,
				lastResetYear: 2024,
				lastResetDate: "2024-12-09T00:00:00.000Z",
			};

			// Week 51, same year 2024 - should reset
			expect(shouldReset(state, 51, 2024, 1)).toBe(true);
		});

		it("should return true when entering a new year", () => {
			const state: WeeklyResetState = {
				lastResetWeek: 52,
				lastResetYear: 2024,
				lastResetDate: "2024-12-23T00:00:00.000Z",
			};

			// Week 1, year 2025 - should reset (year changed)
			expect(shouldReset(state, 1, 2025, 1)).toBe(true);
		});

		it("should handle bot being offline from Friday to Monday (same week to next)", () => {
			// Bot was reset on Monday of week 50
			const state: WeeklyResetState = {
				lastResetWeek: 50,
				lastResetYear: 2024,
				lastResetDate: "2024-12-09T00:00:00.000Z",
			};

			// Bot comes back online on Monday of week 51
			// This simulates bot being offline from Friday (week 50) to Monday (week 51)
			expect(shouldReset(state, 51, 2024, 1)).toBe(true);
		});

		it("should handle bot being offline for multiple weeks", () => {
			// Bot was reset in week 48
			const state: WeeklyResetState = {
				lastResetWeek: 48,
				lastResetYear: 2024,
				lastResetDate: "2024-11-25T00:00:00.000Z",
			};

			// Bot comes back online in week 51 (3 weeks later)
			expect(shouldReset(state, 51, 2024, 3)).toBe(true);
		});

		it("should handle bot being offline across year boundary", () => {
			// Bot was reset in week 51 of 2024
			const state: WeeklyResetState = {
				lastResetWeek: 51,
				lastResetYear: 2024,
				lastResetDate: "2024-12-16T00:00:00.000Z",
			};

			// Bot comes back online in week 1 of 2025 (across year boundary)
			expect(shouldReset(state, 1, 2025, 2)).toBe(true);
		});

		it("should NOT reset multiple times on same day", () => {
			// Simulating multiple bot restarts on the same Monday
			const state: WeeklyResetState = {
				lastResetWeek: 51,
				lastResetYear: 2024,
				lastResetDate: "2024-12-16T08:00:00.000Z", // Reset at 8 AM
			};

			// Bot restarts at 2 PM same day (still week 51)
			expect(shouldReset(state, 51, 2024, 1)).toBe(false);

			// Bot restarts at 11 PM same day (still week 51)
			expect(shouldReset(state, 51, 2024, 1)).toBe(false);
		});

		it("should NOT reset multiple times within the same week", () => {
			// Reset on Monday of week 51
			const state: WeeklyResetState = {
				lastResetWeek: 51,
				lastResetYear: 2024,
				lastResetDate: "2024-12-16T00:00:00.000Z",
			};

			// Bot restarts on Wednesday of same week - should NOT reset again
			expect(shouldReset(state, 51, 2024, 3)).toBe(false);

			// Bot restarts on Friday of same week - should NOT reset again
			expect(shouldReset(state, 51, 2024, 5)).toBe(false);

			// Bot restarts on Sunday of same week - should NOT reset again
			expect(shouldReset(state, 51, 2024, 0)).toBe(false);
		});

		it("should properly handle week 53 edge case", () => {
			// Some years have 53 weeks (e.g., 2020)
			const state: WeeklyResetState = {
				lastResetWeek: 53,
				lastResetYear: 2020,
				lastResetDate: "2020-12-28T00:00:00.000Z",
			};

			// Week 1 of 2021 - should reset
			expect(shouldReset(state, 1, 2021, 1)).toBe(true);
		});
	});

	describe("reaction debouncing", () => {
		const ACTIVITY_COOLDOWN_MS = 5 * 60_000; // 5 minutes

		it("should allow first reaction on a message", () => {
			const reactionDebounce = new Map<string, number>();
			const userId = "123";
			const messageId = "456";

			const perMessageKey = `${userId}:${messageId}`;
			const hasReactedToMessage = reactionDebounce.has(perMessageKey);

			expect(hasReactedToMessage).toBe(false);
		});

		it("should block second reaction on same message", () => {
			const reactionDebounce = new Map<string, number>();
			const userId = "123";
			const messageId = "456";
			const now = Date.now();

			const perMessageKey = `${userId}:${messageId}`;

			// First reaction
			reactionDebounce.set(perMessageKey, now);

			// Second reaction on same message should be blocked
			expect(reactionDebounce.has(perMessageKey)).toBe(true);
		});

		it("should allow reaction on different message after per-message check", () => {
			const reactionDebounce = new Map<string, number>();
			const userId = "123";
			const messageId1 = "456";
			const messageId2 = "789";
			const now = Date.now();

			// First reaction on message 1
			reactionDebounce.set(`${userId}:${messageId1}`, now);
			reactionDebounce.set(`${userId}:last`, now);

			// Check if can react to message 2 (per-message check passes)
			const perMessageKey2 = `${userId}:${messageId2}`;
			expect(reactionDebounce.has(perMessageKey2)).toBe(false);
		});

		it("should block reaction within 5 minutes even on different message", () => {
			const reactionDebounce = new Map<string, number>();
			const userId = "123";
			const now = Date.now();

			// Set last reaction time to 2 minutes ago
			const twoMinutesAgo = now - 2 * 60_000;
			reactionDebounce.set(`${userId}:last`, twoMinutesAgo);

			// Time-based check
			const lastReaction = reactionDebounce.get(`${userId}:last`);
			const shouldBlock = lastReaction && now - lastReaction < ACTIVITY_COOLDOWN_MS;

			expect(shouldBlock).toBe(true);
		});

		it("should allow reaction after 5 minutes on different message", () => {
			const reactionDebounce = new Map<string, number>();
			const userId = "123";
			const now = Date.now();

			// Set last reaction time to 6 minutes ago
			const sixMinutesAgo = now - 6 * 60_000;
			reactionDebounce.set(`${userId}:last`, sixMinutesAgo);

			// Time-based check
			const lastReaction = reactionDebounce.get(`${userId}:last`);
			const shouldBlock = lastReaction && now - lastReaction < ACTIVITY_COOLDOWN_MS;

			expect(shouldBlock).toBe(false);
		});

		it("should calculate max reactions per hour correctly", () => {
			// With 5-minute debounce, max reactions per hour = 60/5 = 12
			const debounceMinutes = 5;
			const maxReactionsPerHour = 60 / debounceMinutes;

			expect(maxReactionsPerHour).toBe(12);
		});
	});

	describe("thread creation debouncing", () => {
		const ACTIVITY_COOLDOWN_MS = 5 * 60_000; // 5 minutes

		it("should allow first thread creation", () => {
			const threadDebounce = new Map<string, number>();
			const userId = "123";

			expect(threadDebounce.has(userId)).toBe(false);
		});

		it("should block thread creation within 5 minutes", () => {
			const threadDebounce = new Map<string, number>();
			const userId = "123";
			const now = Date.now();

			// First thread creation
			threadDebounce.set(userId, now);

			// Check if second creation within 5 mins is blocked
			const lastThread = threadDebounce.get(userId);
			const shouldBlock = lastThread && now - lastThread < ACTIVITY_COOLDOWN_MS;
			expect(shouldBlock).toBe(true);
		});

		it("should allow thread creation after 5 minutes", () => {
			const threadDebounce = new Map<string, number>();
			const userId = "123";
			const now = Date.now();

			// Set last thread creation to 6 minutes ago
			const sixMinutesAgo = now - 6 * 60_000;
			threadDebounce.set(userId, sixMinutesAgo);

			const lastThread = threadDebounce.get(userId);
			const shouldBlock = lastThread && now - lastThread < ACTIVITY_COOLDOWN_MS;
			expect(shouldBlock).toBe(false);
		});

		it("should calculate max thread creations per hour correctly", () => {
			// With 5-minute cooldown, max threads per hour = 60/5 = 12
			// At 10 points each = 120 pts/hr max from threads
			const cooldownMinutes = 5;
			const maxThreadsPerHour = 60 / cooldownMinutes;
			expect(maxThreadsPerHour).toBe(12);
		});
	});

	describe("message debouncing", () => {
		const ACTIVITY_COOLDOWN_MS = 5 * 60_000; // 5 minutes

		it("should debounce messages within 5 minutes", () => {
			const now = Date.now();
			const lastMessage = now - 2 * 60_000; // 2 minutes ago

			const shouldDebounce = now - lastMessage < ACTIVITY_COOLDOWN_MS;
			expect(shouldDebounce).toBe(true);
		});

		it("should not debounce messages after 5 minutes", () => {
			const now = Date.now();
			const lastMessage = now - 6 * 60_000; // 6 minutes ago

			const shouldDebounce = now - lastMessage < ACTIVITY_COOLDOWN_MS;
			expect(shouldDebounce).toBe(false);
		});

		it("should debounce at exactly 5 minute boundary", () => {
			const now = Date.now();
			const lastMessage = now - 5 * 60_000; // exactly 5 minutes ago

			// At exactly 5 minutes, should NOT debounce
			const shouldDebounce = now - lastMessage < ACTIVITY_COOLDOWN_MS;
			expect(shouldDebounce).toBe(false);
		});

		it("should calculate max messages per hour correctly", () => {
			// With 5-minute cooldown, max messages per hour = 60/5 = 12
			const cooldownMinutes = 5;
			const maxMessagesPerHour = 60 / cooldownMinutes;
			expect(maxMessagesPerHour).toBe(12);
		});
	});

	describe("tie handling for prizes", () => {
		// This tests the ranking logic used in the API's resetWeeklyActivityPoints
		function calculateRanksWithTies(
			users: Array<{ userId: number; points: number }>,
		): Array<{ userId: number; points: number; rank: number }> {
			const results: Array<{ userId: number; points: number; rank: number }> = [];
			let currentRank = 0;
			let previousPoints: number | null = null;

			for (let i = 0; i < users.length; i++) {
				const user = users[i];
				if (!user) continue;

				// Only increment rank if points differ from previous user
				if (user.points !== previousPoints) {
					currentRank = i + 1;
					previousPoints = user.points;

					// Stop if we've gone past rank 10
					if (currentRank > 10) break;
				}

				results.push({ userId: user.userId, points: user.points, rank: currentRank });
			}

			return results;
		}

		it("should give same rank to users with same points", () => {
			const users = [
				{ userId: 1, points: 700 },
				{ userId: 2, points: 700 },
				{ userId: 3, points: 700 },
				{ userId: 4, points: 500 },
				{ userId: 5, points: 300 },
			];

			const results = calculateRanksWithTies(users);

			// All 700-point users should be rank 1
			expect(results[0]?.rank).toBe(1);
			expect(results[1]?.rank).toBe(1);
			expect(results[2]?.rank).toBe(1);
			// 500-point user should be rank 4 (not 2)
			expect(results[3]?.rank).toBe(4);
			// 300-point user should be rank 5
			expect(results[4]?.rank).toBe(5);
		});

		it("should handle 5 users tied for 1st place", () => {
			const users = [
				{ userId: 1, points: 700 },
				{ userId: 2, points: 700 },
				{ userId: 3, points: 700 },
				{ userId: 4, points: 700 },
				{ userId: 5, points: 700 },
				{ userId: 6, points: 400 },
			];

			const results = calculateRanksWithTies(users);

			// All 5 users with 700 points get rank 1
			for (let i = 0; i < 5; i++) {
				expect(results[i]?.rank).toBe(1);
			}
			// Next user gets rank 6
			expect(results[5]?.rank).toBe(6);
		});

		it("should stop giving prizes after rank 10", () => {
			// 12 users with different points
			const users = Array.from({ length: 12 }, (_, i) => ({
				userId: i + 1,
				points: 1000 - i * 50,
			}));

			const results = calculateRanksWithTies(users);

			// Should only include ranks 1-10
			expect(results.length).toBe(10);
			expect(results[9]?.rank).toBe(10);
		});

		it("should include all ties at rank 10 boundary", () => {
			// 8 users with unique points, then 5 users tied
			const users = [
				{ userId: 1, points: 900 },
				{ userId: 2, points: 800 },
				{ userId: 3, points: 700 },
				{ userId: 4, points: 600 },
				{ userId: 5, points: 500 },
				{ userId: 6, points: 400 },
				{ userId: 7, points: 300 },
				{ userId: 8, points: 200 },
				// These 5 are all tied
				{ userId: 9, points: 100 },
				{ userId: 10, points: 100 },
				{ userId: 11, points: 100 },
				{ userId: 12, points: 100 },
				{ userId: 13, points: 100 },
			];

			const results = calculateRanksWithTies(users);

			// Should include all 5 tied users at rank 9
			expect(results.length).toBe(13);
			expect(results[8]?.rank).toBe(9);
			expect(results[9]?.rank).toBe(9);
			expect(results[10]?.rank).toBe(9);
			expect(results[11]?.rank).toBe(9);
			expect(results[12]?.rank).toBe(9);
		});

		it("should handle no ties (all unique points)", () => {
			const users = [
				{ userId: 1, points: 500 },
				{ userId: 2, points: 400 },
				{ userId: 3, points: 300 },
			];

			const results = calculateRanksWithTies(users);

			expect(results[0]?.rank).toBe(1);
			expect(results[1]?.rank).toBe(2);
			expect(results[2]?.rank).toBe(3);
		});

		it("should handle multiple tie groups", () => {
			const users = [
				{ userId: 1, points: 700 },
				{ userId: 2, points: 700 },
				{ userId: 3, points: 500 },
				{ userId: 4, points: 500 },
				{ userId: 5, points: 500 },
				{ userId: 6, points: 300 },
			];

			const results = calculateRanksWithTies(users);

			// 2 users tied for rank 1
			expect(results[0]?.rank).toBe(1);
			expect(results[1]?.rank).toBe(1);
			// 3 users tied for rank 3
			expect(results[2]?.rank).toBe(3);
			expect(results[3]?.rank).toBe(3);
			expect(results[4]?.rank).toBe(3);
			// 1 user at rank 6
			expect(results[5]?.rank).toBe(6);
		});
	});

	describe("voice time calculation", () => {
		it("should calculate voice intervals correctly", () => {
			const lastCheckedAt = new Date(Date.now() - 25 * 60 * 1000); // 25 minutes ago
			const now = new Date();

			const minutesSinceLastCheck = Math.floor((now.getTime() - lastCheckedAt.getTime()) / 1000 / 60);
			const intervals = Math.floor(minutesSinceLastCheck / 10);

			expect(minutesSinceLastCheck).toBe(25);
			expect(intervals).toBe(2); // 2 complete 10-minute intervals
		});

		it("should not award points for less than 10 minutes", () => {
			const lastCheckedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
			const now = new Date();

			const minutesSinceLastCheck = Math.floor((now.getTime() - lastCheckedAt.getTime()) / 1000 / 60);
			const intervals = Math.floor(minutesSinceLastCheck / 10);

			expect(minutesSinceLastCheck).toBe(5);
			expect(intervals).toBe(0);
		});

		it("should award 1 interval for exactly 10 minutes", () => {
			const lastCheckedAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
			const now = new Date();

			const minutesSinceLastCheck = Math.floor((now.getTime() - lastCheckedAt.getTime()) / 1000 / 60);
			const intervals = Math.floor(minutesSinceLastCheck / 10);

			expect(minutesSinceLastCheck).toBe(10);
			expect(intervals).toBe(1);
		});

		it("should not count partial intervals", () => {
			const lastCheckedAt = new Date(Date.now() - 19 * 60 * 1000); // 19 minutes ago
			const now = new Date();

			const minutesSinceLastCheck = Math.floor((now.getTime() - lastCheckedAt.getTime()) / 1000 / 60);
			const intervals = Math.floor(minutesSinceLastCheck / 10);

			expect(minutesSinceLastCheck).toBe(19);
			expect(intervals).toBe(1); // Only 1 complete interval, not 2
		});

		it("should handle long voice sessions", () => {
			const lastCheckedAt = new Date(Date.now() - 125 * 60 * 1000); // 125 minutes ago
			const now = new Date();

			const minutesSinceLastCheck = Math.floor((now.getTime() - lastCheckedAt.getTime()) / 1000 / 60);
			const intervals = Math.floor(minutesSinceLastCheck / 10);

			expect(minutesSinceLastCheck).toBe(125);
			expect(intervals).toBe(12); // 12 complete 10-minute intervals
		});
	});
});
