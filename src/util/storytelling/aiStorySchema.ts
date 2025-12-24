import { z } from "zod";
import { WORK_CONFIG } from "../../services/work/config";

const { aiStoryRewards } = WORK_CONFIG;

/**
 * Schema for a single choice in a decision node
 */
const AIChoiceSchema = z.object({
	label: z.string().min(1).max(25),
	description: z.string().min(1).max(150),
	baseReward: z
		.number()
		.int()
		.min(aiStoryRewards.minBaseReward)
		.max(aiStoryRewards.maxBaseReward),
	riskMultiplier: z
		.number()
		.min(aiStoryRewards.minRiskMultiplier)
		.max(aiStoryRewards.maxRiskMultiplier),
});

/**
 * Schema for a decision node (Layer 1 or Layer 2)
 */
const AIDecisionSchema = z.object({
	narrative: z.string().min(20).max(400),
	choiceX: AIChoiceSchema,
	choiceY: AIChoiceSchema,
});

/**
 * Schema for a terminal node (ending)
 */
const AITerminalSchema = z.object({
	narrative: z.string().min(30).max(500),
	coinsChange: z
		.number()
		.int()
		.min(aiStoryRewards.minTerminalCoins)
		.max(aiStoryRewards.maxTerminalCoins),
	isPositiveEnding: z.boolean(),
	xpMultiplier: z
		.number()
		.min(aiStoryRewards.minXpMultiplier)
		.max(aiStoryRewards.maxXpMultiplier),
});

/**
 * Complete AI story response schema
 *
 * Structure:
 * - intro -> decision1
 * - decision1.choiceX -> outcome1X -> (success: decision2X_success, fail: decision2X_fail)
 * - decision1.choiceY -> outcome1Y -> (success: decision2Y_success, fail: decision2Y_fail)
 * - decision2*: Each has choiceX/Y -> outcome -> terminal
 *
 * This gives us the 3-layer structure with ~8-12 terminal nodes.
 */
export const AIStoryResponseSchema = z.object({
	/** Story title (max 50 characters) */
	title: z.string().min(5).max(50),

	/** Single emoji for the story */
	emoji: z.string().min(1).max(4),

	/** Intro narrative (sets up the scenario) */
	intro: z.object({
		narrative: z.string().min(50).max(500),
	}),

	/** First decision point after intro */
	decision1: AIDecisionSchema,

	/**
	 * Second layer decisions - 4 possible paths based on:
	 * - Which choice was made in decision1 (X or Y)
	 * - Whether the outcome succeeded or failed
	 */
	decision2: z.object({
		/** After decision1.choiceX succeeded */
		afterXSuccess: AIDecisionSchema,
		/** After decision1.choiceX failed */
		afterXFail: AIDecisionSchema,
		/** After decision1.choiceY succeeded */
		afterYSuccess: AIDecisionSchema,
		/** After decision1.choiceY failed */
		afterYFail: AIDecisionSchema,
	}),

	/**
	 * Terminal nodes - 8 required endings
	 * Named by path: XS = choiceX + Success, XF = choiceX + Fail, etc.
	 * Then _X or _Y for the second layer choice
	 * Then S or F for success/fail outcome
	 */
	terminals: z.object({
		/** Path: X -> Success -> X -> Success */
		XS_X_S: AITerminalSchema,
		/** Path: X -> Success -> X -> Fail */
		XS_X_F: AITerminalSchema,
		/** Path: X -> Success -> Y -> Success */
		XS_Y_S: AITerminalSchema,
		/** Path: X -> Success -> Y -> Fail */
		XS_Y_F: AITerminalSchema,
		/** Path: X -> Fail -> X -> Success */
		XF_X_S: AITerminalSchema,
		/** Path: X -> Fail -> X -> Fail */
		XF_X_F: AITerminalSchema,
		/** Path: X -> Fail -> Y -> Success */
		XF_Y_S: AITerminalSchema,
		/** Path: X -> Fail -> Y -> Fail */
		XF_Y_F: AITerminalSchema,
		/** Path: Y -> Success -> X -> Success */
		YS_X_S: AITerminalSchema,
		/** Path: Y -> Success -> X -> Fail */
		YS_X_F: AITerminalSchema,
		/** Path: Y -> Success -> Y -> Success */
		YS_Y_S: AITerminalSchema,
		/** Path: Y -> Success -> Y -> Fail */
		YS_Y_F: AITerminalSchema,
		/** Path: Y -> Fail -> X -> Success */
		YF_X_S: AITerminalSchema,
		/** Path: Y -> Fail -> X -> Fail */
		YF_X_F: AITerminalSchema,
		/** Path: Y -> Fail -> Y -> Success */
		YF_Y_S: AITerminalSchema,
		/** Path: Y -> Fail -> Y -> Fail */
		YF_Y_F: AITerminalSchema,
	}),
});

export type AIStoryResponse = z.infer<typeof AIStoryResponseSchema>;
export type AIChoice = z.infer<typeof AIChoiceSchema>;
export type AIDecision = z.infer<typeof AIDecisionSchema>;
export type AITerminal = z.infer<typeof AITerminalSchema>;

/**
 * Validate AI story response
 */
export function validateAIStoryResponse(
	data: unknown,
): { success: true; data: AIStoryResponse } | { success: false; error: string } {
	const result = AIStoryResponseSchema.safeParse(data);
	if (result.success) {
		return { success: true, data: result.data };
	}
	return {
		success: false,
		error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
	};
}

/**
 * Validate that the story has balanced endings
 * (roughly 50-70% positive endings)
 */
export function validateStoryBalance(story: AIStoryResponse): { valid: boolean; reason?: string } {
	const terminals = Object.values(story.terminals);
	const positiveCount = terminals.filter((t) => t.isPositiveEnding).length;
	const total = terminals.length;
	const ratio = positiveCount / total;

	if (ratio < 0.4) {
		return { valid: false, reason: `Too few positive endings (${positiveCount}/${total})` };
	}
	if (ratio > 0.75) {
		return { valid: false, reason: `Too many positive endings (${positiveCount}/${total})` };
	}

	return { valid: true };
}
