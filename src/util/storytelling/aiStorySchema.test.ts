import { describe, test, expect } from "bun:test";
import { validateAIStoryResponse, validateStoryBalance, type AIStoryResponse } from "./aiStorySchema";

// Helper to create a valid AI story response for testing
function createValidStoryResponse(): AIStoryResponse {
	return {
		title: "Testovací příběh",
		emoji: "🧪",
		intro: {
			narrative: "Toto je úvodní text příběhu, který má dostatečnou délku pro validaci schématu.",
		},
		decision1: {
			narrative: "První rozhodnutí v příběhu - máš dvě možnosti.",
			choiceX: {
				label: "Volba A",
				description: "Popis volby A - bezpečnější varianta",
				baseReward: 200,
				riskMultiplier: 1.0,
			},
			choiceY: {
				label: "Volba B",
				description: "Popis volby B - riskantnější varianta",
				baseReward: 300,
				riskMultiplier: 1.2,
			},
		},
		decision2: {
			afterXSuccess: {
				narrative: "Volba X uspěla! Nyní máš další rozhodnutí před sebou.",
				choiceX: { label: "XS-X", description: "Pokračovat bezpečně", baseReward: 150, riskMultiplier: 0.8 },
				choiceY: { label: "XS-Y", description: "Riskovat více", baseReward: 250, riskMultiplier: 1.1 },
			},
			afterXFail: {
				narrative: "Volba X selhala! Ale máš ještě šanci to napravit.",
				choiceX: { label: "XF-X", description: "Opatrný přístup", baseReward: 150, riskMultiplier: 0.8 },
				choiceY: { label: "XF-Y", description: "Odvážný přístup", baseReward: 250, riskMultiplier: 1.1 },
			},
			afterYSuccess: {
				narrative: "Volba Y uspěla! Teď můžeš pokračovat dál.",
				choiceX: { label: "YS-X", description: "Konzervativní cesta", baseReward: 150, riskMultiplier: 0.8 },
				choiceY: { label: "YS-Y", description: "Agresivní cesta", baseReward: 250, riskMultiplier: 1.1 },
			},
			afterYFail: {
				narrative: "Volba Y selhala! Ještě můžeš situaci zachránit.",
				choiceX: { label: "YF-X", description: "Defenzivní akce", baseReward: 150, riskMultiplier: 0.8 },
				choiceY: { label: "YF-Y", description: "Ofenzivní akce", baseReward: 250, riskMultiplier: 1.1 },
			},
		},
		terminals: {
			XS_X_S: { narrative: "Konec po cestě XS-X-S. Gratulujeme k úspěchu!", coinsChange: 300, isPositiveEnding: true, xpMultiplier: 1.5 },
			XS_X_F: { narrative: "Konec po cestě XS-X-F. Bohužel, tentokrát to nevyšlo.", coinsChange: -100, isPositiveEnding: false, xpMultiplier: 0.7 },
			XS_Y_S: { narrative: "Konec po cestě XS-Y-S. Skvělý výsledek!", coinsChange: 400, isPositiveEnding: true, xpMultiplier: 1.8 },
			XS_Y_F: { narrative: "Konec po cestě XS-Y-F. Škoda, měl jsi smůlu.", coinsChange: -200, isPositiveEnding: false, xpMultiplier: 0.6 },
			XF_X_S: { narrative: "Konec po cestě XF-X-S. Překvapivý úspěch!", coinsChange: 200, isPositiveEnding: true, xpMultiplier: 1.3 },
			XF_X_F: { narrative: "Konec po cestě XF-X-F. Bohužel to nedopadlo.", coinsChange: -150, isPositiveEnding: false, xpMultiplier: 0.8 },
			XF_Y_S: { narrative: "Konec po cestě XF-Y-S. Výborná práce!", coinsChange: 350, isPositiveEnding: true, xpMultiplier: 1.6 },
			XF_Y_F: { narrative: "Konec po cestě XF-Y-F. Příště to vyjde lépe.", coinsChange: -50, isPositiveEnding: false, xpMultiplier: 0.9 },
			YS_X_S: { narrative: "Konec po cestě YS-X-S. Super výsledek, gratuluji!", coinsChange: 250, isPositiveEnding: true, xpMultiplier: 1.4 },
			YS_X_F: { narrative: "Konec po cestě YS-X-F. Nevadí, stane se to.", coinsChange: -80, isPositiveEnding: false, xpMultiplier: 0.75 },
			YS_Y_S: { narrative: "Konec po cestě YS-Y-S. Perfektní výkon!", coinsChange: 500, isPositiveEnding: true, xpMultiplier: 2.0 },
			YS_Y_F: { narrative: "Konec po cestě YS-Y-F. Další pokus příště.", coinsChange: -120, isPositiveEnding: false, xpMultiplier: 0.65 },
			YF_X_S: { narrative: "Konec po cestě YF-X-S. Dobrá práce nakonec!", coinsChange: 180, isPositiveEnding: true, xpMultiplier: 1.2 },
			YF_X_F: { narrative: "Konec po cestě YF-X-F. Stane se, zkus to znovu.", coinsChange: -90, isPositiveEnding: false, xpMultiplier: 0.85 },
			YF_Y_S: { narrative: "Konec po cestě YF-Y-S. Hurá, výhra je tvá!", coinsChange: 280, isPositiveEnding: true, xpMultiplier: 1.35 },
			YF_Y_F: { narrative: "Konec po cestě YF-Y-F. Konec příběhu, smůla.", coinsChange: -180, isPositiveEnding: false, xpMultiplier: 0.55 },
		},
	};
}

describe("AI Story Schema", () => {
	describe("validateAIStoryResponse", () => {
		test("accepts valid story response", () => {
			const story = createValidStoryResponse();
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(true);
		});

		test("rejects missing title", () => {
			const story = createValidStoryResponse();
			// @ts-expect-error - intentionally removing required field
			delete story.title;
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects title too long", () => {
			const story = createValidStoryResponse();
			story.title = "A".repeat(60);
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects intro narrative too short", () => {
			const story = createValidStoryResponse();
			story.intro.narrative = "Short";
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects baseReward below minimum", () => {
			const story = createValidStoryResponse();
			story.decision1.choiceX.baseReward = 50; // Below 100 minimum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects baseReward above maximum", () => {
			const story = createValidStoryResponse();
			story.decision1.choiceX.baseReward = 600; // Above 500 maximum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects riskMultiplier below minimum", () => {
			const story = createValidStoryResponse();
			story.decision1.choiceX.riskMultiplier = 0.3; // Below 0.5 minimum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects riskMultiplier above maximum", () => {
			const story = createValidStoryResponse();
			story.decision1.choiceX.riskMultiplier = 2.0; // Above 1.5 maximum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects terminal coinsChange below minimum", () => {
			const story = createValidStoryResponse();
			story.terminals.XS_X_S.coinsChange = -500; // Below -400 minimum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects terminal coinsChange above maximum", () => {
			const story = createValidStoryResponse();
			story.terminals.XS_X_S.coinsChange = 700; // Above 600 maximum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects xpMultiplier below minimum", () => {
			const story = createValidStoryResponse();
			story.terminals.XS_X_S.xpMultiplier = 0.3; // Below 0.5 minimum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects xpMultiplier above maximum", () => {
			const story = createValidStoryResponse();
			story.terminals.XS_X_S.xpMultiplier = 2.5; // Above 2.0 maximum
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});

		test("rejects choice label too long", () => {
			const story = createValidStoryResponse();
			story.decision1.choiceX.label = "A".repeat(30); // Over 25 character limit
			const result = validateAIStoryResponse(story);
			expect(result.success).toBe(false);
		});
	});

	describe("validateStoryBalance", () => {
		test("accepts balanced story (50% positive)", () => {
			const story = createValidStoryResponse();
			// 8 positive, 8 negative = 50%
			const result = validateStoryBalance(story);
			expect(result.valid).toBe(true);
		});

		test("rejects story with too few positive endings", () => {
			const story = createValidStoryResponse();
			// Set most endings to negative
			story.terminals.XS_X_S.isPositiveEnding = false;
			story.terminals.XS_Y_S.isPositiveEnding = false;
			story.terminals.XF_X_S.isPositiveEnding = false;
			story.terminals.XF_Y_S.isPositiveEnding = false;
			story.terminals.YS_X_S.isPositiveEnding = false;
			story.terminals.YS_Y_S.isPositiveEnding = false;
			story.terminals.YF_X_S.isPositiveEnding = false;
			story.terminals.YF_Y_S.isPositiveEnding = false;
			// Now all 16 are negative = 0% positive
			const result = validateStoryBalance(story);
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("Too few positive endings");
		});

		test("rejects story with too many positive endings", () => {
			const story = createValidStoryResponse();
			// Set most endings to positive
			story.terminals.XS_X_F.isPositiveEnding = true;
			story.terminals.XS_Y_F.isPositiveEnding = true;
			story.terminals.XF_X_F.isPositiveEnding = true;
			story.terminals.XF_Y_F.isPositiveEnding = true;
			story.terminals.YS_X_F.isPositiveEnding = true;
			story.terminals.YS_Y_F.isPositiveEnding = true;
			story.terminals.YF_X_F.isPositiveEnding = true;
			story.terminals.YF_Y_F.isPositiveEnding = true;
			// Now all 16 are positive = 100% positive
			const result = validateStoryBalance(story);
			expect(result.valid).toBe(false);
			expect(result.reason).toContain("Too many positive endings");
		});
	});
});
