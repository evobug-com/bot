import { openrouter } from "../../utils/openrouter";
import type { BranchingStory } from "./types";
import { validateAIStoryResponse, validateStoryBalance } from "./aiStorySchema";
import { buildStoryFromAIResponse } from "./aiStoryBuilder";
import { WORK_CONFIG } from "../../services/work/config";

const { aiStoryRewards } = WORK_CONFIG;

const SYSTEM_PROMPT = `You are a creator of funny interactive office stories for a Discord game.
Write ALL story content in CZECH language. Be humorous, sarcastic, but work-appropriate.

GENERATE A STORY IN THIS JSON FORMAT:
{
  "title": "Short story title in Czech (max 50 chars)",
  "emoji": "Single emoji representing the story",
  "intro": {
    "narrative": "Opening situation that draws the player in (50-500 chars, in Czech)"
  },
  "decision1": {
    "narrative": "Description of the first decision point (20-400 chars, in Czech)",
    "choiceX": {
      "label": "Button text A (max 25 chars, in Czech)",
      "description": "Description of choice A (max 150 chars, in Czech)",
      "baseReward": integer (MUST be ${aiStoryRewards.minBaseReward}-${aiStoryRewards.maxBaseReward}, e.g. 150, 250, 400),
      "riskMultiplier": decimal (MUST be ${aiStoryRewards.minRiskMultiplier}-${aiStoryRewards.maxRiskMultiplier}, e.g. 0.7, 1.0, 1.3)
    },
    "choiceY": { ... same structure ... }
  },
  "decision2": {
    "afterXSuccess": { ... decision structure for when choice X succeeds ... },
    "afterXFail": { ... decision structure for when choice X fails ... },
    "afterYSuccess": { ... decision structure for when choice Y succeeds ... },
    "afterYFail": { ... decision structure for when choice Y fails ... }
  },
  "terminals": {
    "XS_X_S": { "narrative": "Story ending (30-500 chars, in Czech)", "coinsChange": integer (MUST be ${aiStoryRewards.minTerminalCoins} to ${aiStoryRewards.maxTerminalCoins}), "isPositiveEnding": true/false, "xpMultiplier": decimal (${aiStoryRewards.minXpMultiplier}-${aiStoryRewards.maxXpMultiplier}) },
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

STRICT NUMBER RULES (MUST be followed!):
- baseReward: integers ONLY, range ${aiStoryRewards.minBaseReward}-${aiStoryRewards.maxBaseReward} (e.g. 150, 300, 450)
- riskMultiplier: decimals ONLY, range ${aiStoryRewards.minRiskMultiplier}-${aiStoryRewards.maxRiskMultiplier} (e.g. 0.6, 1.0, 1.4)
- coinsChange: integers ONLY, range ${aiStoryRewards.minTerminalCoins} to ${aiStoryRewards.maxTerminalCoins} (e.g. -300, 0, 400)
- xpMultiplier: decimals ONLY, range ${aiStoryRewards.minXpMultiplier}-${aiStoryRewards.maxXpMultiplier} (e.g. 0.8, 1.5)

STORY RULES:
1. The story must be funny and entertaining
2. Topics: office, IT, coworkers, meetings, deadlines, team building, coffee, printer, email, home office
3. Positive endings have positive coinsChange, negative endings have negative coinsChange
4. Approximately 50-60% of endings should be positive
5. Riskier choices (higher riskMultiplier) should have higher baseReward
6. ALL text content (title, narratives, labels, descriptions) MUST be in Czech

Generate one complete story.`;

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
		const response = await openrouter.chat.completions.create({
			model: "google/gemini-3-flash-preview",
			messages: [
				{ role: "system", content: SYSTEM_PROMPT },
				{ role: "user", content: "Generate a new interactive story in JSON format." },
			],
			response_format: { type: "json_object" },
			temperature: 0.9,
			max_tokens: 8000,
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			return {
				story: null,
				error: "Empty response from AI",
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
			? (usage.prompt_tokens * 0.1 + usage.completion_tokens * 0.4) / 1_000_000
			: 0;

		console.log(
			`[AIStory] Generated story "${story.title}" - ${usage?.total_tokens ?? 0} tokens, $${estimatedCost.toFixed(6)}`,
		);

		return {
			story,
			usage: usage
				? {
						promptTokens: usage.prompt_tokens,
						completionTokens: usage.completion_tokens,
						totalTokens: usage.total_tokens,
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
