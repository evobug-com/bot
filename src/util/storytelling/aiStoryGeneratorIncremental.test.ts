import { describe, expect, it } from "bun:test";
import {
	STORY_SETTINGS,
	STORY_TWISTS,
	STORY_ROLES,
	generateStoryDNA,
	buildLayer1Prompt,
	pickRandomWords,
	calculateRandomCoins,
	calculateRandomXpMultiplier,
} from "./aiStoryGeneratorIncremental";

// =============================================================================
// Story DNA arrays
// =============================================================================

describe("Story DNA arrays", () => {
	it("STORY_SETTINGS has at least 20 entries, all non-empty", () => {
		expect(STORY_SETTINGS.length).toBeGreaterThanOrEqual(20);
		for (const s of STORY_SETTINGS) {
			expect(s.trim().length).toBeGreaterThan(0);
		}
	});

	it("STORY_TWISTS has at least 15 entries, all non-empty", () => {
		expect(STORY_TWISTS.length).toBeGreaterThanOrEqual(15);
		for (const t of STORY_TWISTS) {
			expect(t.trim().length).toBeGreaterThan(0);
		}
	});

	it("STORY_ROLES has at least 20 entries, all non-empty", () => {
		expect(STORY_ROLES.length).toBeGreaterThanOrEqual(20);
		for (const r of STORY_ROLES) {
			expect(r.trim().length).toBeGreaterThan(0);
		}
	});

	it("STORY_SETTINGS has no duplicates", () => {
		const unique = new Set(STORY_SETTINGS);
		expect(unique.size).toBe(STORY_SETTINGS.length);
	});

	it("STORY_TWISTS has no duplicates", () => {
		const unique = new Set(STORY_TWISTS);
		expect(unique.size).toBe(STORY_TWISTS.length);
	});

	it("STORY_ROLES has no duplicates", () => {
		const unique = new Set(STORY_ROLES);
		expect(unique.size).toBe(STORY_ROLES.length);
	});
});

// =============================================================================
// generateStoryDNA
// =============================================================================

describe("generateStoryDNA", () => {
	it("returns object with all 3 non-empty fields", () => {
		const dna = generateStoryDNA();
		expect(dna.setting.length).toBeGreaterThan(0);
		expect(dna.twist.length).toBeGreaterThan(0);
		expect(dna.role.length).toBeGreaterThan(0);
	});

	it("returns values from the defined arrays", () => {
		const dna = generateStoryDNA();
		expect(STORY_SETTINGS).toContain(dna.setting);
		expect(STORY_TWISTS).toContain(dna.twist);
		expect(STORY_ROLES).toContain(dna.role);
	});
});

// =============================================================================
// buildLayer1Prompt
// =============================================================================

describe("buildLayer1Prompt", () => {
	const testDNA = {
		setting: "na opuštěné vesmírné stanici",
		twist: "kde se porouchala veškerá technika",
		role: "vyděšený účetní",
	};
	const testWords = {
		nouns: ["kočka", "stůl", "raketa", "brýle", "dort"],
		verbs: ["utéct", "skočit"],
	};

	it("contains the DNA setting, twist, and role", () => {
		const prompt = buildLayer1Prompt(testDNA, testWords, []);
		expect(prompt).toContain(testDNA.setting);
		expect(prompt).toContain(testDNA.twist);
		expect(prompt).toContain(testDNA.role);
	});

	it("contains MUST language for word requirements", () => {
		const prompt = buildLayer1Prompt(testDNA, testWords, []);
		expect(prompt).toContain("MUST");
		expect(prompt).toContain("at least 5");
		expect(prompt).toContain("at least 1");
	});

	it("contains the random words in the prompt", () => {
		const prompt = buildLayer1Prompt(testDNA, testWords, []);
		for (const noun of testWords.nouns) {
			expect(prompt).toContain(noun);
		}
		for (const verb of testWords.verbs) {
			expect(prompt).toContain(verb);
		}
	});

	it("includes user facts section when facts provided", () => {
		const facts = ["miluje pizzu", "bojí se pavouků"];
		const prompt = buildLayer1Prompt(testDNA, testWords, facts);
		expect(prompt).toContain("miluje pizzu");
		expect(prompt).toContain("bojí se pavouků");
		expect(prompt).toContain("traits");
	});

	it("excludes user facts section when no facts", () => {
		const prompt = buildLayer1Prompt(testDNA, testWords, []);
		expect(prompt).not.toContain("traits");
	});

	it("handles empty words gracefully", () => {
		const prompt = buildLayer1Prompt(testDNA, { nouns: [], verbs: [] }, []);
		expect(prompt).toContain(testDNA.setting);
		expect(prompt).not.toContain("REQUIRED ELEMENTS");
	});
});

// =============================================================================
// pickRandomWords
// =============================================================================

describe("pickRandomWords", () => {
	it("picks the requested number of words", () => {
		const words = ["a", "b", "c", "d", "e"];
		const picked = pickRandomWords(words, 3);
		expect(picked).toHaveLength(3);
	});

	it("returns no duplicates", () => {
		const words = ["a", "b", "c", "d", "e", "f", "g", "h"];
		const picked = pickRandomWords(words, 5);
		const unique = new Set(picked);
		expect(unique.size).toBe(picked.length);
	});

	it("returns empty array for empty input", () => {
		const picked = pickRandomWords([], 5);
		expect(picked).toHaveLength(0);
	});

	it("caps at available count when requesting more than available", () => {
		const words = ["a", "b"];
		const picked = pickRandomWords(words, 10);
		expect(picked).toHaveLength(2);
	});

	it("returns all words from the source array", () => {
		const words = ["alpha", "beta", "gamma"];
		const picked = pickRandomWords(words, 3);
		for (const w of picked) {
			expect(words).toContain(w);
		}
	});
});

// =============================================================================
// calculateRandomCoins
// =============================================================================

describe("calculateRandomCoins", () => {
	it("returns positive value for success", () => {
		for (let i = 0; i < 20; i++) {
			const coins = calculateRandomCoins(true);
			expect(coins).toBeGreaterThanOrEqual(100);
		}
	});

	it("returns zero or negative for failure", () => {
		for (let i = 0; i < 20; i++) {
			const coins = calculateRandomCoins(false);
			expect(coins).toBeLessThanOrEqual(0);
		}
	});
});

// =============================================================================
// calculateRandomXpMultiplier
// =============================================================================

describe("calculateRandomXpMultiplier", () => {
	it("returns >= 1.0 for success", () => {
		for (let i = 0; i < 20; i++) {
			const mult = calculateRandomXpMultiplier(true);
			expect(mult).toBeGreaterThanOrEqual(1.0);
		}
	});

	it("returns < 1.0 or equal for failure (within valid range)", () => {
		for (let i = 0; i < 20; i++) {
			const mult = calculateRandomXpMultiplier(false);
			expect(mult).toBeLessThanOrEqual(1.0);
			expect(mult).toBeGreaterThanOrEqual(0.1);
		}
	});
});
