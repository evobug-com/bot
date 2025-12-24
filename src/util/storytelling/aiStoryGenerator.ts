import { OpenRouter } from "@openrouter/sdk";
import type { BranchingStory } from "./types";
import { validateAIStoryResponse, validateStoryBalance } from "./aiStorySchema";
import { buildStoryFromAIResponse } from "./aiStoryBuilder";
import { WORK_CONFIG } from "../../services/work/config";

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

const openrouter = openrouterApiKey
	? new OpenRouter({
			apiKey: openrouterApiKey,
		})
	: null;

const { aiStoryRewards } = WORK_CONFIG;

const SYSTEM_PROMPT = `Jsi tvůrce vtipných interaktivních příběhů z kancelářského prostředí pro Discord hru.
Piš POUZE v češtině. Buď humorný, sarkastický, ale vhodný pro práci.

GENERUJ PŘÍBĚH V TOMTO JSON FORMÁTU:
{
  "title": "Krátký název příběhu (max 50 znaků)",
  "emoji": "Jeden emoji reprezentující příběh",
  "intro": {
    "narrative": "Úvodní situace, která vtáhne hráče do příběhu (50-500 znaků)"
  },
  "decision1": {
    "narrative": "Popis první rozhodovací situace (20-400 znaků)",
    "choiceX": {
      "label": "Text tlačítka A (max 25 znaků)",
      "description": "Popis volby A (max 150 znaků)",
      "baseReward": číslo ${aiStoryRewards.minBaseReward}-${aiStoryRewards.maxBaseReward},
      "riskMultiplier": číslo ${aiStoryRewards.minRiskMultiplier}-${aiStoryRewards.maxRiskMultiplier} (nižší = jednodušší)
    },
    "choiceY": { ... stejná struktura ... }
  },
  "decision2": {
    "afterXSuccess": { ... decision struktura pro když volba X uspěje ... },
    "afterXFail": { ... decision struktura pro když volba X selže ... },
    "afterYSuccess": { ... decision struktura pro když volba Y uspěje ... },
    "afterYFail": { ... decision struktura pro když volba Y selže ... }
  },
  "terminals": {
    "XS_X_S": { "narrative": "Konec příběhu (30-500 znaků)", "coinsChange": ${aiStoryRewards.minTerminalCoins} až ${aiStoryRewards.maxTerminalCoins}, "isPositiveEnding": true/false, "xpMultiplier": ${aiStoryRewards.minXpMultiplier}-${aiStoryRewards.maxXpMultiplier} },
    "XS_X_F": { ... },
    "XS_Y_S": { ... },
    "XS_Y_F": { ... },
    "XF_X_S": { ... },
    "XF_X_F": { ... },
    "XF_Y_S": { ... },
    "XF_Y_F": { ... },
    "YS_X_S": { ... },
    "YS_X_F": { ... },
    "YS_Y_S": { ... },
    "YS_Y_F": { ... },
    "YF_X_S": { ... },
    "YF_X_F": { ... },
    "YF_Y_S": { ... },
    "YF_Y_F": { ... }
  }
}

PRAVIDLA:
1. Příběh musí být vtipný a zábavný
2. Témata: kancelář, IT, kolegové, schůzky, deadlines, teambuilding, káva, tiskárna, email, home office
3. Pozitivní konce mají kladné coinsChange, negativní záporné
4. Přibližně 50-60% konců by mělo být pozitivních
5. Rizikovější volby (vyšší riskMultiplier) by měly mít vyšší baseReward
6. Všechny texty MUSÍ být v češtině

Vygeneruj jeden kompletní příběh.`;

export interface AIStoryResult {
	story: BranchingStory | null;
	error?: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		estimatedCost: number;
	};
}

/**
 * Generate an AI story using OpenRouter
 */
export async function generateAIStory(): Promise<AIStoryResult> {
	if (!openrouter) {
		return {
			story: null,
			error: "OpenRouter API key not configured",
		};
	}

	try {
		const response = await openrouter.chat.send({
			model: "google/gemini-3-flash-preview",
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: "Vygeneruj nový interaktivní příběh v JSON formátu." },
			],
			responseFormat: { type: "json_object" },
			temperature: 0.9, // Higher for more creative stories
			maxTokens: 8000, // Stories can be long
		});

		const rawContent = response.choices?.[0]?.message?.content;
		if (!rawContent) {
			return {
				story: null,
				error: "Empty response from AI",
			};
		}

		// Extract text content (can be string or array of content items)
		let content: string;
		if (typeof rawContent === "string") {
			content = rawContent;
		} else if (Array.isArray(rawContent)) {
			// Extract text from content items
			const textItems = rawContent
				.filter((item): item is { type: "text"; text: string } => item.type === "text")
				.map((item) => item.text);
			content = textItems.join("");
		} else {
			return {
				story: null,
				error: "Unexpected content format from AI",
			};
		}

		// Parse JSON
		let parsedJson: unknown;
		try {
			parsedJson = JSON.parse(content);
		} catch {
			return {
				story: null,
				error: `Failed to parse AI response as JSON: ${content.substring(0, 200)}...`,
			};
		}

		// Validate with Zod schema
		const validationResult = validateAIStoryResponse(parsedJson);
		if (!validationResult.success) {
			return {
				story: null,
				error: `Invalid story structure: ${validationResult.error}`,
			};
		}

		// Validate story balance
		const balanceResult = validateStoryBalance(validationResult.data);
		if (!balanceResult.valid) {
			console.warn(`[AIStory] Story balance warning: ${balanceResult.reason}`);
			// Don't fail, just warn - the story is still valid
		}

		// Build the BranchingStory
		const story = buildStoryFromAIResponse(validationResult.data);

		// Calculate usage and cost
		const usage = response.usage;
		const estimatedCost = usage
			? (usage.promptTokens * 0.1 + usage.completionTokens * 0.4) / 1_000_000
			: 0;

		console.log(
			`[AIStory] Generated story "${story.title}" - ${usage?.totalTokens ?? 0} tokens, $${estimatedCost.toFixed(6)}`,
		);

		return {
			story,
			usage: usage
				? {
						promptTokens: usage.promptTokens,
						completionTokens: usage.completionTokens,
						totalTokens: usage.totalTokens,
						estimatedCost,
					}
				: undefined,
		};
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error("[AIStory] Generation failed:", errorMessage);
		return {
			story: null,
			error: errorMessage,
		};
	}
}
