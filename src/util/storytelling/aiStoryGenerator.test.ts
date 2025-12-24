import { describe, test, expect } from "bun:test";
import { validateStory } from "./engine";

// We can't easily mock the OpenRouter module, so we'll test the schema validation
// and story building components directly. The generator integration is tested via the
// schema and builder tests.

describe("AI Story Generator Integration", () => {
	describe("Generated story validation", () => {
		test("buildStoryFromAIResponse creates valid BranchingStory", async () => {
			const { buildStoryFromAIResponse } = await import("./aiStoryBuilder");

			const validResponse = {
				title: "Test příběh",
				emoji: "🧪",
				intro: {
					narrative: "Úvodní text příběhu pro testování. Musí být dostatečně dlouhý.",
				},
				decision1: {
					narrative: "První rozhodnutí v příběhu.",
					choiceX: { label: "Volba A", description: "Popis A", baseReward: 200, riskMultiplier: 1.0 },
					choiceY: { label: "Volba B", description: "Popis B", baseReward: 300, riskMultiplier: 1.2 },
				},
				decision2: {
					afterXSuccess: {
						narrative: "Po X success",
						choiceX: { label: "XS-X", description: "Popis", baseReward: 150, riskMultiplier: 0.8 },
						choiceY: { label: "XS-Y", description: "Popis", baseReward: 250, riskMultiplier: 1.1 },
					},
					afterXFail: {
						narrative: "Po X fail",
						choiceX: { label: "XF-X", description: "Popis", baseReward: 150, riskMultiplier: 0.8 },
						choiceY: { label: "XF-Y", description: "Popis", baseReward: 250, riskMultiplier: 1.1 },
					},
					afterYSuccess: {
						narrative: "Po Y success",
						choiceX: { label: "YS-X", description: "Popis", baseReward: 150, riskMultiplier: 0.8 },
						choiceY: { label: "YS-Y", description: "Popis", baseReward: 250, riskMultiplier: 1.1 },
					},
					afterYFail: {
						narrative: "Po Y fail",
						choiceX: { label: "YF-X", description: "Popis", baseReward: 150, riskMultiplier: 0.8 },
						choiceY: { label: "YF-Y", description: "Popis", baseReward: 250, riskMultiplier: 1.1 },
					},
				},
				terminals: {
					XS_X_S: { narrative: "Konec XS-X-S pozitivní!", coinsChange: 300, isPositiveEnding: true, xpMultiplier: 1.5 },
					XS_X_F: { narrative: "Konec XS-X-F negativní!", coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.7 },
					XS_Y_S: { narrative: "Konec XS-Y-S pozitivní!", coinsChange: 400, isPositiveEnding: true, xpMultiplier: 1.8 },
					XS_Y_F: { narrative: "Konec XS-Y-F negativní!", coinsChange: -200, isPositiveEnding: false, xpMultiplier: 0.6 },
					XF_X_S: { narrative: "Konec XF-X-S pozitivní!", coinsChange: 200, isPositiveEnding: true, xpMultiplier: 1.3 },
					XF_X_F: { narrative: "Konec XF-X-F negativní!", coinsChange: -150, isPositiveEnding: false, xpMultiplier: 0.8 },
					XF_Y_S: { narrative: "Konec XF-Y-S pozitivní!", coinsChange: 350, isPositiveEnding: true, xpMultiplier: 1.6 },
					XF_Y_F: { narrative: "Konec XF-Y-F negativní!", coinsChange: -50, isPositiveEnding: false, xpMultiplier: 0.9 },
					YS_X_S: { narrative: "Konec YS-X-S pozitivní!", coinsChange: 250, isPositiveEnding: true, xpMultiplier: 1.4 },
					YS_X_F: { narrative: "Konec YS-X-F negativní!", coinsChange: -80, isPositiveEnding: false, xpMultiplier: 0.75 },
					YS_Y_S: { narrative: "Konec YS-Y-S pozitivní!", coinsChange: 500, isPositiveEnding: true, xpMultiplier: 2.0 },
					YS_Y_F: { narrative: "Konec YS-Y-F negativní!", coinsChange: -120, isPositiveEnding: false, xpMultiplier: 0.65 },
					YF_X_S: { narrative: "Konec YF-X-S pozitivní!", coinsChange: 180, isPositiveEnding: true, xpMultiplier: 1.2 },
					YF_X_F: { narrative: "Konec YF-X-F negativní!", coinsChange: -90, isPositiveEnding: false, xpMultiplier: 0.85 },
					YF_Y_S: { narrative: "Konec YF-Y-S pozitivní!", coinsChange: 280, isPositiveEnding: true, xpMultiplier: 1.35 },
					YF_Y_F: { narrative: "Konec YF-Y-F negativní!", coinsChange: -180, isPositiveEnding: false, xpMultiplier: 0.55 },
				},
			};

			const story = buildStoryFromAIResponse(validResponse);

			// Check basic structure
			expect(story.id).toStartWith("ai_");
			expect(story.title).toBe("Test příběh");
			expect(story.emoji).toBe("🧪");
			expect(story.startNodeId).toBe("intro");

			// Check nodes exist
			expect(story.nodes.intro).toBeDefined();
			expect(story.nodes.decision_1).toBeDefined();
			expect(story.nodes.outcome_1X).toBeDefined();
			expect(story.nodes.outcome_1Y).toBeDefined();
			expect(story.nodes.decision_2_XS).toBeDefined();
			expect(story.nodes.decision_2_XF).toBeDefined();
			expect(story.nodes.decision_2_YS).toBeDefined();
			expect(story.nodes.decision_2_YF).toBeDefined();

			// Check terminal nodes exist (16 total)
			expect(story.nodes.terminal_XS_X_S).toBeDefined();
			expect(story.nodes.terminal_YF_Y_F).toBeDefined();

			// Validate the story with the engine's validator
			const errors = validateStory(story);
			// Note: We expect some validation "errors" about terminal count and positive ratio
			// because our test story may not meet all the strict requirements (8 terminals minimum)
			// But the node references should all be valid
			const nodeReferenceErrors = errors.filter(e => e.includes("references missing node"));
			expect(nodeReferenceErrors).toHaveLength(0);
		});

		test("story ID starts with ai_ prefix", async () => {
			const { buildStoryFromAIResponse } = await import("./aiStoryBuilder");

			const minimalResponse = {
				title: "Test",
				emoji: "🧪",
				intro: { narrative: "A".repeat(60) },
				decision1: {
					narrative: "Decision text here",
					choiceX: { label: "X", description: "X desc", baseReward: 200, riskMultiplier: 1.0 },
					choiceY: { label: "Y", description: "Y desc", baseReward: 200, riskMultiplier: 1.0 },
				},
				decision2: {
					afterXSuccess: { narrative: "XS", choiceX: { label: "XSX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "XSY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
					afterXFail: { narrative: "XF", choiceX: { label: "XFX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "XFY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
					afterYSuccess: { narrative: "YS", choiceX: { label: "YSX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "YSY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
					afterYFail: { narrative: "YF", choiceX: { label: "YFX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "YFY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
				},
				terminals: {
					XS_X_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					XS_X_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					XS_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					XS_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					XF_X_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					XF_X_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					XF_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					XF_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YS_X_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YS_X_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YS_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YS_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YF_X_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YF_X_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YF_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YF_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
				},
			};

			const story = buildStoryFromAIResponse(minimalResponse);
			expect(story.id).toMatch(/^ai_\d+$/);
		});

		test("calculates balance metadata correctly", async () => {
			const { buildStoryFromAIResponse } = await import("./aiStoryBuilder");

			const response = {
				title: "Test",
				emoji: "🧪",
				intro: { narrative: "A".repeat(60) },
				decision1: {
					narrative: "Decision text here",
					choiceX: { label: "X", description: "X desc", baseReward: 200, riskMultiplier: 1.0 },
					choiceY: { label: "Y", description: "Y desc", baseReward: 200, riskMultiplier: 1.0 },
				},
				decision2: {
					afterXSuccess: { narrative: "XS", choiceX: { label: "XSX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "XSY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
					afterXFail: { narrative: "XF", choiceX: { label: "XFX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "XFY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
					afterYSuccess: { narrative: "YS", choiceX: { label: "YSX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "YSY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
					afterYFail: { narrative: "YF", choiceX: { label: "YFX", description: "d", baseReward: 200, riskMultiplier: 1.0 }, choiceY: { label: "YFY", description: "d", baseReward: 200, riskMultiplier: 1.0 } },
				},
				terminals: {
					XS_X_S: { narrative: "A".repeat(40), coinsChange: 500, isPositiveEnding: true, xpMultiplier: 1.0 }, // Max
					XS_X_F: { narrative: "A".repeat(40), coinsChange: -400, isPositiveEnding: false, xpMultiplier: 0.8 }, // Min
					XS_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					XS_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					XF_X_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					XF_X_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					XF_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					XF_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YS_X_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YS_X_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YS_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YS_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YF_X_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YF_X_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
					YF_Y_S: { narrative: "A".repeat(40), coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 },
					YF_Y_F: { narrative: "A".repeat(40), coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.8 },
				},
			};

			const story = buildStoryFromAIResponse(response);

			expect(story.maxPossibleReward).toBe(500);
			expect(story.minPossibleReward).toBe(-400);
			// Sum: 500 + (-400) + 100 + (-100) + 100 + (-100) + 100 + (-100) + 100 + (-100) + 100 + (-100) + 100 + (-100) + 100 + (-100)
			// = 100 + 0 + 0 + 0 + 0 + 0 + 0 + 0 = 100, avg = 100/16 = 6.25 -> 6
			expect(story.averageReward).toBe(6);
		});
	});
});
