/**
 * Incremental AI Story Generator
 *
 * Generates story content on-demand as the player progresses, reducing token usage.
 * Instead of generating all 16 possible endings upfront, we generate only what's needed:
 * - Layer 1: intro + decision1 (when story starts)
 * - Layer 2: one decision2 branch (after first choice outcome)
 * - Layer 3: one terminal (after second choice outcome)
 */

import { z } from "zod";
import { openrouter } from "../../utils/openrouter";
import { WORK_CONFIG } from "../../services/work/config";

const { aiStoryRewards } = WORK_CONFIG;

// =============================================================================
// Types
// =============================================================================

/** Context passed between generation calls to maintain narrative consistency */
export interface AIStoryContext {
	/** Story title */
	title: string;
	/** Story emoji */
	emoji: string;
	/** Intro narrative */
	introNarrative: string;
	/** First decision narrative and choices */
	decision1: {
		narrative: string;
		choiceX: { label: string; description: string; baseReward: number; riskMultiplier: number };
		choiceY: { label: string; description: string; baseReward: number; riskMultiplier: number };
	};
	/** Path taken so far: "X" or "Y" for first choice, "XS", "XF", "YS", "YF" after outcome */
	pathSoFar: string;
	/** Narrative describing what happened after first choice (success/fail description) */
	firstOutcomeNarrative?: string;
	/** Second decision if generated */
	decision2?: {
		narrative: string;
		choiceX: { label: string; description: string; baseReward: number; riskMultiplier: number };
		choiceY: { label: string; description: string; baseReward: number; riskMultiplier: number };
	};
}

/** Choice schema for validation */
const AIChoiceSchema = z.object({
	label: z.string().min(1).max(25),
	description: z.string().min(1).max(150),
	baseReward: z.number().int().min(aiStoryRewards.minBaseReward).max(aiStoryRewards.maxBaseReward),
	riskMultiplier: z.number().min(aiStoryRewards.minRiskMultiplier).max(aiStoryRewards.maxRiskMultiplier),
});

/** Decision schema */
const AIDecisionSchema = z.object({
	narrative: z.string().min(20).max(400),
	choiceX: AIChoiceSchema,
	choiceY: AIChoiceSchema,
});

/** Terminal schema */
const AITerminalSchema = z.object({
	narrative: z.string().min(30).max(500),
	coinsChange: z.number().int().min(aiStoryRewards.minTerminalCoins).max(aiStoryRewards.maxTerminalCoins),
	isPositiveEnding: z.boolean(),
	xpMultiplier: z.number().min(aiStoryRewards.minXpMultiplier).max(aiStoryRewards.maxXpMultiplier),
});

/** Layer 1 response schema */
const Layer1ResponseSchema = z.object({
	title: z.string().min(5).max(50),
	emoji: z.string().min(1).max(4),
	intro: z.object({ narrative: z.string().min(50).max(500) }),
	decision1: AIDecisionSchema,
});

/** Layer 2 response schema */
const Layer2ResponseSchema = z.object({
	outcomeNarrative: z.string().min(20).max(300),
	decision2: AIDecisionSchema,
});

/** Layer 3 response schema */
const Layer3ResponseSchema = z.object({
	outcomeNarrative: z.string().min(20).max(300),
	terminal: AITerminalSchema,
});

export type Layer1Response = z.infer<typeof Layer1ResponseSchema>;
export type Layer2Response = z.infer<typeof Layer2ResponseSchema>;
export type Layer3Response = z.infer<typeof Layer3ResponseSchema>;

// =============================================================================
// Prompts
// =============================================================================

const LAYER1_PROMPT = `You are a creative writer for a Discord game. Write in CZECH language.

Create a SHORT funny interactive story. Be completely original - invent any scenario you want.

OUTPUT JSON:
{
  "title": "Czech title (max 50 chars)",
  "emoji": "One emoji",
  "intro": { "narrative": "Setup (50-500 chars Czech)" },
  "decision1": {
    "narrative": "Situation requiring choice (20-400 chars Czech)",
    "choiceX": {
      "label": "Option A (max 25 chars)",
      "description": "What happens (max 150 chars)",
      "baseReward": ${aiStoryRewards.minBaseReward}-${aiStoryRewards.maxBaseReward},
      "riskMultiplier": ${aiStoryRewards.minRiskMultiplier}-${aiStoryRewards.maxRiskMultiplier}
    },
    "choiceY": { same structure as choiceX }
  }
}

Higher risk = higher reward. Be funny. Czech only.`;

function buildLayer2Prompt(context: AIStoryContext, wasSuccess: boolean): string {
	const choiceMade = context.pathSoFar === "X" ? context.decision1.choiceX : context.decision1.choiceY;
	const outcome = wasSuccess ? "SUCCEEDED" : "FAILED";

	return `Continue this story. The player made a choice and the outcome was determined.
Write ALL content in CZECH language.

STORY SO FAR:
Title: ${context.title} ${context.emoji}
Intro: ${context.introNarrative}
Decision: ${context.decision1.narrative}
Player chose: "${choiceMade.label}" - ${choiceMade.description}
Outcome: ${outcome}

Generate the NEXT PART: a brief outcome narrative and the second decision point.

JSON FORMAT:
{
  "outcomeNarrative": "What happened after the ${outcome.toLowerCase()} (20-300 chars, Czech)",
  "decision2": {
    "narrative": "Second decision description (20-400 chars, Czech)",
    "choiceX": {
      "label": "Button A (max 25 chars, Czech)",
      "description": "What happens (max 150 chars, Czech)",
      "baseReward": integer ${aiStoryRewards.minBaseReward}-${aiStoryRewards.maxBaseReward},
      "riskMultiplier": decimal ${aiStoryRewards.minRiskMultiplier}-${aiStoryRewards.maxRiskMultiplier}
    },
    "choiceY": { same structure }
  }
}

RULES:
- Continue the narrative naturally from the ${outcome.toLowerCase()}
- Be funny and consistent with the story theme
- ALL text in Czech`;
}

function buildLayer3Prompt(context: AIStoryContext, wasSuccess: boolean): string {
	const fullPath = context.pathSoFar; // e.g., "XS" or "YF"
	const firstChoice = fullPath[0] === "X" ? context.decision1.choiceX : context.decision1.choiceY;
	const secondChoice = context.decision2
		? (fullPath.endsWith("X") ? context.decision2.choiceX : context.decision2.choiceY)
		: { label: "unknown", description: "unknown" };
	const outcome = wasSuccess ? "SUCCEEDED" : "FAILED";

	return `Finish this story with a final ending.
Write ALL content in CZECH language.

STORY SO FAR:
Title: ${context.title} ${context.emoji}
Intro: ${context.introNarrative}
First decision: Player chose "${firstChoice.label}"
After first outcome: ${context.firstOutcomeNarrative ?? "..."}
Second decision: ${context.decision2?.narrative ?? "..."}
Player chose: "${secondChoice.label}"
Final outcome: ${outcome}

Generate the ENDING: outcome narrative and terminal (final result).

JSON FORMAT:
{
  "outcomeNarrative": "What happened in the final moment (20-300 chars, Czech)",
  "terminal": {
    "narrative": "Story ending (30-500 chars, Czech)",
    "coinsChange": integer ${aiStoryRewards.minTerminalCoins} to ${aiStoryRewards.maxTerminalCoins},
    "isPositiveEnding": true/false,
    "xpMultiplier": decimal ${aiStoryRewards.minXpMultiplier}-${aiStoryRewards.maxXpMultiplier}
  }
}

RULES:
- ${wasSuccess ? "This should generally be a POSITIVE ending (positive coinsChange)" : "This should generally be a NEGATIVE ending (negative coinsChange)"}
- Be funny and give a satisfying conclusion
- ALL text in Czech`;
}

// =============================================================================
// Generation Functions
// =============================================================================

interface GenerationResult<T> {
	success: boolean;
	data?: T;
	error?: string;
	usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

async function callOpenRouter<T>(
	prompt: string,
	userMessage: string,
	schema: z.ZodType<T>,
): Promise<GenerationResult<T>> {
	if (!openrouter) {
		return { success: false, error: "OpenRouter API key not configured" };
	}

	try {
		const response = await openrouter.chat.completions.create({
			model: "google/gemini-3-flash-preview",
			messages: [
				{ role: "system", content: prompt },
				{ role: "user", content: userMessage },
			],
			response_format: { type: "json_object" },
			temperature: 1.5, // High creativity for varied stories
			max_tokens: 2000,
		});

		const content = response.choices[0]?.message?.content;
		if (!content) {
			return { success: false, error: "Empty response from AI" };
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(content);
		} catch {
			return { success: false, error: `Failed to parse JSON: ${content.substring(0, 100)}...` };
		}

		const validation = schema.safeParse(parsed);
		if (!validation.success) {
			const errors = validation.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
			return { success: false, error: `Invalid structure: ${errors}` };
		}

		const usage = response.usage;
		console.log(`[AIStory] Generated layer - ${usage?.total_tokens ?? 0} tokens`);

		return {
			success: true,
			data: validation.data,
			usage: usage ? {
				promptTokens: usage.prompt_tokens,
				completionTokens: usage.completion_tokens,
				totalTokens: usage.total_tokens,
			} : undefined,
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error("[AIStory] Generation failed:", msg);
		return { success: false, error: msg };
	}
}

/**
 * Generate Layer 1: intro + decision1
 * Called when starting a new AI story
 */
export async function generateLayer1(): Promise<GenerationResult<Layer1Response> & { context?: AIStoryContext }> {
	const result = await callOpenRouter(LAYER1_PROMPT, "Generate a new story.", Layer1ResponseSchema);

	if (!result.success || !result.data) {
		return result;
	}

	const context: AIStoryContext = {
		title: result.data.title,
		emoji: result.data.emoji,
		introNarrative: result.data.intro.narrative,
		decision1: result.data.decision1,
		pathSoFar: "",
	};

	return { ...result, context };
}

/**
 * Generate Layer 2: outcome narrative + decision2
 * Called after player makes first choice and outcome is determined
 */
export async function generateLayer2(
	context: AIStoryContext,
	choice: "X" | "Y",
	wasSuccess: boolean,
): Promise<GenerationResult<Layer2Response> & { context?: AIStoryContext }> {
	// Update path
	const updatedContext = { ...context, pathSoFar: choice };
	const prompt = buildLayer2Prompt(updatedContext, wasSuccess);

	const result = await callOpenRouter(prompt, "Continue the story.", Layer2ResponseSchema);

	if (!result.success || !result.data) {
		return result;
	}

	// Update context with new data
	const newContext: AIStoryContext = {
		...updatedContext,
		pathSoFar: `${choice}${wasSuccess ? "S" : "F"}`,
		firstOutcomeNarrative: result.data.outcomeNarrative,
		decision2: result.data.decision2,
	};

	return { ...result, context: newContext };
}

/**
 * Generate Layer 3: outcome narrative + terminal
 * Called after player makes second choice and outcome is determined
 */
export async function generateLayer3(
	context: AIStoryContext,
	choice: "X" | "Y",
	wasSuccess: boolean,
): Promise<GenerationResult<Layer3Response>> {
	// Temporarily add second choice to context for prompt building
	const tempContext = { ...context };
	const prompt = buildLayer3Prompt(tempContext, wasSuccess);

	return callOpenRouter(prompt, "Finish the story.", Layer3ResponseSchema);
}

// =============================================================================
// Story Building Functions
// =============================================================================

import type { BranchingStory, StoryNode, IntroNode, DecisionNode, OutcomeNode, TerminalNode } from "./types";

/**
 * Build initial story structure from Layer 1 response
 * Creates intro, decision1, and placeholder outcome nodes
 */
export function buildStoryFromLayer1(layer1: Layer1Response, storyId: string): BranchingStory {
	const nodes: Record<string, StoryNode> = {};

	// Intro node
	const introNode: IntroNode = {
		id: "intro",
		type: "intro",
		narrative: layer1.intro.narrative,
		nextNodeId: "decision1",
	};
	nodes.intro = introNode;

	// Decision 1 node
	const decision1Node: DecisionNode = {
		id: "decision1",
		type: "decision",
		narrative: layer1.decision1.narrative,
		choices: {
			choiceX: {
				id: "choiceX",
				label: layer1.decision1.choiceX.label,
				description: layer1.decision1.choiceX.description,
				baseReward: layer1.decision1.choiceX.baseReward,
				riskMultiplier: layer1.decision1.choiceX.riskMultiplier,
				nextNodeId: "outcome1X",
			},
			choiceY: {
				id: "choiceY",
				label: layer1.decision1.choiceY.label,
				description: layer1.decision1.choiceY.description,
				baseReward: layer1.decision1.choiceY.baseReward,
				riskMultiplier: layer1.decision1.choiceY.riskMultiplier,
				nextNodeId: "outcome1Y",
			},
		},
	};
	nodes.decision1 = decision1Node;

	// Outcome nodes for first decision (placeholders - nextNodeIds will be filled by Layer 2)
	const outcome1X: OutcomeNode = {
		id: "outcome1X",
		type: "outcome",
		narrative: "...", // Will be replaced by Layer 2
		successChance: 70 / layer1.decision1.choiceX.riskMultiplier,
		successNodeId: "decision2_XS", // Placeholder
		failNodeId: "decision2_XF", // Placeholder
	};
	nodes.outcome1X = outcome1X;

	const outcome1Y: OutcomeNode = {
		id: "outcome1Y",
		type: "outcome",
		narrative: "...", // Will be replaced by Layer 2
		successChance: 70 / layer1.decision1.choiceY.riskMultiplier,
		successNodeId: "decision2_YS", // Placeholder
		failNodeId: "decision2_YF", // Placeholder
	};
	nodes.outcome1Y = outcome1Y;

	return {
		id: storyId,
		title: layer1.title,
		emoji: layer1.emoji,
		startNodeId: "intro",
		nodes,
		expectedPaths: 16,
		averageReward: 200,
		maxPossibleReward: 600,
		minPossibleReward: -400,
	};
}

/**
 * Add Layer 2 nodes to an existing story
 * Called after first outcome is determined
 */
export function addLayer2ToStory(
	story: BranchingStory,
	layer2: Layer2Response,
	path: "XS" | "XF" | "YS" | "YF",
): void {
	const decision2Id = `decision2_${path}`;

	// Update the outcome node narrative
	const outcomeNodeId = path.startsWith("X") ? "outcome1X" : "outcome1Y";
	const outcomeNode = story.nodes[outcomeNodeId] as OutcomeNode;
	if (outcomeNode) {
		outcomeNode.narrative = layer2.outcomeNarrative;
	}

	// Create decision 2 node
	const decision2Node: DecisionNode = {
		id: decision2Id,
		type: "decision",
		narrative: layer2.decision2.narrative,
		choices: {
			choiceX: {
				id: "choiceX",
				label: layer2.decision2.choiceX.label,
				description: layer2.decision2.choiceX.description,
				baseReward: layer2.decision2.choiceX.baseReward,
				riskMultiplier: layer2.decision2.choiceX.riskMultiplier,
				nextNodeId: `outcome2_${path}_X`,
			},
			choiceY: {
				id: "choiceY",
				label: layer2.decision2.choiceY.label,
				description: layer2.decision2.choiceY.description,
				baseReward: layer2.decision2.choiceY.baseReward,
				riskMultiplier: layer2.decision2.choiceY.riskMultiplier,
				nextNodeId: `outcome2_${path}_Y`,
			},
		},
	};
	story.nodes[decision2Id] = decision2Node;

	// Create outcome nodes for second decision (placeholders)
	const outcome2X: OutcomeNode = {
		id: `outcome2_${path}_X`,
		type: "outcome",
		narrative: "...",
		successChance: 70 / layer2.decision2.choiceX.riskMultiplier,
		successNodeId: `terminal_${path}_X_S`,
		failNodeId: `terminal_${path}_X_F`,
	};
	story.nodes[outcome2X.id] = outcome2X;

	const outcome2Y: OutcomeNode = {
		id: `outcome2_${path}_Y`,
		type: "outcome",
		narrative: "...",
		successChance: 70 / layer2.decision2.choiceY.riskMultiplier,
		successNodeId: `terminal_${path}_Y_S`,
		failNodeId: `terminal_${path}_Y_F`,
	};
	story.nodes[outcome2Y.id] = outcome2Y;
}

/**
 * Add Layer 3 terminal to an existing story
 * Called after second outcome is determined
 */
export function addLayer3ToStory(
	story: BranchingStory,
	layer3: Layer3Response,
	path: string, // e.g., "XS_X_S" or "YF_Y_F"
): void {
	const terminalId = `terminal_${path}`;

	// Parse path to find outcome node
	const parts = path.split("_");
	const layer1Path = parts[0]; // "XS", "XF", "YS", "YF"
	const choice2 = parts[1]; // "X" or "Y"
	const outcomeNodeId = `outcome2_${layer1Path}_${choice2}`;

	// Update the outcome node narrative
	const outcomeNode = story.nodes[outcomeNodeId] as OutcomeNode | undefined;
	if (outcomeNode) {
		outcomeNode.narrative = layer3.outcomeNarrative;
	}

	// Create terminal node
	const terminalNode: TerminalNode = {
		id: terminalId,
		type: "terminal",
		narrative: layer3.terminal.narrative,
		coinsChange: layer3.terminal.coinsChange,
		isPositiveEnding: layer3.terminal.isPositiveEnding,
		xpMultiplier: layer3.terminal.xpMultiplier,
	};
	story.nodes[terminalId] = terminalNode;
}
