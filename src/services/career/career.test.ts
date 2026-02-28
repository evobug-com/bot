import { describe, expect, it } from "bun:test";
import {
	Career,
	CAREER_INFO,
	DEFAULT_WEIGHTS,
	CAREER_WEIGHTS,
	getCategoryWeight,
	getCareerWeights,
	getUserCareer,
	getUserCareerType,
	setUserCareer,
	hasSelectedCareer,
	getCareerStats,
} from "./index";
import type { CareerType, CategoryWeights } from "./types";

describe("Career types", () => {
	it("should have 5 career types", () => {
		const careers = Object.values(Career);
		expect(careers.length).toBe(5);
	});

	it("should have correct career values", () => {
		expect(Career.CLERK).toBe("clerk");
		expect(Career.DEVELOPER).toBe("developer");
		expect(Career.SALESPERSON).toBe("salesperson");
		expect(Career.ADVENTURER).toBe("adventurer");
		expect(Career.SHADOW).toBe("shadow");
	});

	it("should have career info for all careers", () => {
		for (const career of Object.values(Career)) {
			const info = CAREER_INFO[career];
			expect(info).toBeDefined();
			expect(info.name).toBeDefined();
			expect(info.czechName).toBeDefined();
			expect(info.description).toBeDefined();
			expect(info.czechDescription).toBeDefined();
			expect(info.emoji).toBeDefined();
		}
	});
});

describe("Career weights", () => {
	it("should have default weights for all categories", () => {
		const categories: (keyof CategoryWeights)[] = [
			"work:office",
			"work:dev",
			"work:misc",
			"work:community",
			"story:work",
			"story:crime",
			"story:adventure",
		];

		for (const category of categories) {
			expect(DEFAULT_WEIGHTS[category]).toBeDefined();
			expect(DEFAULT_WEIGHTS[category]).toBe(1);
		}
	});

	it("should have weights for all career types", () => {
		for (const career of Object.values(Career)) {
			const weights = CAREER_WEIGHTS[career];
			expect(weights).toBeDefined();
			expect(typeof weights["work:office"]).toBe("number");
			expect(typeof weights["work:dev"]).toBe("number");
			expect(typeof weights["story:work"]).toBe("number");
			expect(typeof weights["story:crime"]).toBe("number");
		}
	});

	it("getCategoryWeight should return correct weight for career", () => {
		// Clerk has work:office = 3
		expect(getCategoryWeight(Career.CLERK, "work:office")).toBe(3);

		// Developer has work:dev = 4
		expect(getCategoryWeight(Career.DEVELOPER, "work:dev")).toBe(4);

		// Shadow has story:crime = 4
		expect(getCategoryWeight(Career.SHADOW, "story:crime")).toBe(4);
	});

	it("getCategoryWeight should return 1 for unknown category", () => {
		// Use a type assertion to test with a hypothetical unknown category
		const weight = getCategoryWeight(Career.CLERK, "unknown:category" as keyof CategoryWeights);
		expect(weight).toBe(1);
	});

	it("getCareerWeights should return all weights for a career", () => {
		const weights = getCareerWeights(Career.DEVELOPER);
		expect(weights).toBeDefined();
		expect(weights["work:dev"]).toBe(4);
		expect(weights["work:community"]).toBe(2);
	});

	it("career weights should be balanced", () => {
		// Each career should have some category with weight > 1
		for (const career of Object.values(Career)) {
			const weights = CAREER_WEIGHTS[career];
			const maxWeight = Math.max(...Object.values(weights));
			expect(maxWeight).toBeGreaterThan(1);
		}
	});
});

describe("Career storage", () => {
	const getTestUserId = () => `test-career-${Date.now()}-${Math.random().toString(36).slice(2)}`;

	it("should return default career (clerk) for new user", () => {
		const userId = getTestUserId();
		const career = getUserCareer(userId);

		expect(career.discordId).toBe(userId);
		expect(career.career).toBe(Career.CLERK);
	});

	it("getUserCareerType should return career type directly", () => {
		const userId = getTestUserId();
		const careerType = getUserCareerType(userId);

		expect(careerType).toBe(Career.CLERK);
	});

	it("hasSelectedCareer should return false for new user", () => {
		const userId = getTestUserId();
		expect(hasSelectedCareer(userId)).toBe(false);
	});

	it("should save and retrieve career", () => {
		const userId = getTestUserId();

		// Initially no explicit selection
		expect(hasSelectedCareer(userId)).toBe(false);

		// Set career
		setUserCareer(userId, Career.DEVELOPER);

		// Should now have explicit selection
		expect(hasSelectedCareer(userId)).toBe(true);

		// Should return developer
		const career = getUserCareer(userId);
		expect(career.career).toBe(Career.DEVELOPER);
	});

	it("should allow changing career", () => {
		const userId = getTestUserId();

		setUserCareer(userId, Career.CLERK);
		expect(getUserCareerType(userId)).toBe(Career.CLERK);

		setUserCareer(userId, Career.SHADOW);
		expect(getUserCareerType(userId)).toBe(Career.SHADOW);

		setUserCareer(userId, Career.ADVENTURER);
		expect(getUserCareerType(userId)).toBe(Career.ADVENTURER);
	});

	it("should not affect other users when changing career", () => {
		const user1 = getTestUserId();
		const user2 = getTestUserId();

		setUserCareer(user1, Career.DEVELOPER);
		setUserCareer(user2, Career.SALESPERSON);

		expect(getUserCareerType(user1)).toBe(Career.DEVELOPER);
		expect(getUserCareerType(user2)).toBe(Career.SALESPERSON);
	});

	it("getCareerStats should return counts per career", () => {
		const stats = getCareerStats();

		// Should have an entry for each career type
		expect(Career.CLERK in stats).toBe(true);
		expect(Career.DEVELOPER in stats).toBe(true);
		expect(Career.SALESPERSON in stats).toBe(true);
		expect(Career.ADVENTURER in stats).toBe(true);
		expect(Career.SHADOW in stats).toBe(true);

		// All values should be numbers >= 0
		for (const count of Object.values(stats)) {
			expect(typeof count).toBe("number");
			expect(count).toBeGreaterThanOrEqual(0);
		}
	});

	it("should throw error for invalid career type", () => {
		const userId = getTestUserId();

		expect(() => {
			setUserCareer(userId, "invalid" as CareerType);
		}).toThrow();
	});
});

describe("Career influence on activity selection", () => {
	it("clerk should have higher office weight than developer", () => {
		const clerkWeight = getCategoryWeight(Career.CLERK, "work:office");
		const devWeight = getCategoryWeight(Career.DEVELOPER, "work:office");

		expect(clerkWeight).toBeGreaterThan(devWeight);
	});

	it("developer should have higher dev weight than clerk", () => {
		const clerkWeight = getCategoryWeight(Career.CLERK, "work:dev");
		const devWeight = getCategoryWeight(Career.DEVELOPER, "work:dev");

		expect(devWeight).toBeGreaterThan(clerkWeight);
	});

	it("shadow should have higher crime weight than other careers", () => {
		const shadowCrime = getCategoryWeight(Career.SHADOW, "story:crime");
		const clerkCrime = getCategoryWeight(Career.CLERK, "story:crime");
		const devCrime = getCategoryWeight(Career.DEVELOPER, "story:crime");

		expect(shadowCrime).toBeGreaterThan(clerkCrime);
		expect(shadowCrime).toBeGreaterThan(devCrime);
	});

	it("adventurer should have higher adventure weight", () => {
		const adventurerAdventure = getCategoryWeight(Career.ADVENTURER, "story:adventure");
		const clerkAdventure = getCategoryWeight(Career.CLERK, "story:adventure");

		expect(adventurerAdventure).toBeGreaterThan(clerkAdventure);
	});
});
