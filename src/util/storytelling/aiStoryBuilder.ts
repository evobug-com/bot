import type { BranchingStory, StoryNode, IntroNode, DecisionNode, OutcomeNode, TerminalNode, StoryChoice } from "./types";
import type { AIStoryResponse, AIChoice } from "./aiStorySchema";

/**
 * Build a BranchingStory from a validated AI response
 *
 * The AI generates a simplified structure that we expand into the full
 * node graph with proper IDs and references.
 */
export function buildStoryFromAIResponse(response: AIStoryResponse): BranchingStory {
	const storyId = `ai_${Date.now()}`;
	const nodes: Record<string, StoryNode> = {};

	// =========================================================================
	// INTRO NODE
	// =========================================================================
	const introNode: IntroNode = {
		id: "intro",
		type: "intro",
		narrative: response.intro.narrative,
		nextNodeId: "decision_1",
	};
	nodes.intro = introNode;

	// =========================================================================
	// DECISION 1 (Layer 1)
	// =========================================================================
	const decision1Node: DecisionNode = {
		id: "decision_1",
		type: "decision",
		narrative: response.decision1.narrative,
		choices: {
			choiceX: buildChoice("choiceX", response.decision1.choiceX, "outcome_1X"),
			choiceY: buildChoice("choiceY", response.decision1.choiceY, "outcome_1Y"),
		},
	};
	nodes.decision_1 = decision1Node;

	// =========================================================================
	// OUTCOME NODES (Layer 1 -> Layer 2 transitions)
	// =========================================================================

	// Outcome for decision1.choiceX
	const outcome1X: OutcomeNode = {
		id: "outcome_1X",
		type: "outcome",
		narrative: "Čekáš na výsledek...",
		successChance: 70,
		successNodeId: "decision_2_XS",
		failNodeId: "decision_2_XF",
	};
	nodes.outcome_1X = outcome1X;

	// Outcome for decision1.choiceY
	const outcome1Y: OutcomeNode = {
		id: "outcome_1Y",
		type: "outcome",
		narrative: "Čekáš na výsledek...",
		successChance: 70,
		successNodeId: "decision_2_YS",
		failNodeId: "decision_2_YF",
	};
	nodes.outcome_1Y = outcome1Y;

	// =========================================================================
	// DECISION 2 NODES (Layer 2 - 4 variants)
	// =========================================================================

	// After X -> Success
	const decision2XS: DecisionNode = {
		id: "decision_2_XS",
		type: "decision",
		narrative: response.decision2.afterXSuccess.narrative,
		choices: {
			choiceX: buildChoice("choiceX", response.decision2.afterXSuccess.choiceX, "outcome_2_XS_X"),
			choiceY: buildChoice("choiceY", response.decision2.afterXSuccess.choiceY, "outcome_2_XS_Y"),
		},
	};
	nodes.decision_2_XS = decision2XS;

	// After X -> Fail
	const decision2XF: DecisionNode = {
		id: "decision_2_XF",
		type: "decision",
		narrative: response.decision2.afterXFail.narrative,
		choices: {
			choiceX: buildChoice("choiceX", response.decision2.afterXFail.choiceX, "outcome_2_XF_X"),
			choiceY: buildChoice("choiceY", response.decision2.afterXFail.choiceY, "outcome_2_XF_Y"),
		},
	};
	nodes.decision_2_XF = decision2XF;

	// After Y -> Success
	const decision2YS: DecisionNode = {
		id: "decision_2_YS",
		type: "decision",
		narrative: response.decision2.afterYSuccess.narrative,
		choices: {
			choiceX: buildChoice("choiceX", response.decision2.afterYSuccess.choiceX, "outcome_2_YS_X"),
			choiceY: buildChoice("choiceY", response.decision2.afterYSuccess.choiceY, "outcome_2_YS_Y"),
		},
	};
	nodes.decision_2_YS = decision2YS;

	// After Y -> Fail
	const decision2YF: DecisionNode = {
		id: "decision_2_YF",
		type: "decision",
		narrative: response.decision2.afterYFail.narrative,
		choices: {
			choiceX: buildChoice("choiceX", response.decision2.afterYFail.choiceX, "outcome_2_YF_X"),
			choiceY: buildChoice("choiceY", response.decision2.afterYFail.choiceY, "outcome_2_YF_Y"),
		},
	};
	nodes.decision_2_YF = decision2YF;

	// =========================================================================
	// OUTCOME NODES (Layer 2 -> Terminal transitions)
	// =========================================================================

	// 8 outcome nodes for layer 2 decisions
	const layer2Outcomes: Array<{ id: string; successTerminal: string; failTerminal: string }> = [
		{ id: "outcome_2_XS_X", successTerminal: "terminal_XS_X_S", failTerminal: "terminal_XS_X_F" },
		{ id: "outcome_2_XS_Y", successTerminal: "terminal_XS_Y_S", failTerminal: "terminal_XS_Y_F" },
		{ id: "outcome_2_XF_X", successTerminal: "terminal_XF_X_S", failTerminal: "terminal_XF_X_F" },
		{ id: "outcome_2_XF_Y", successTerminal: "terminal_XF_Y_S", failTerminal: "terminal_XF_Y_F" },
		{ id: "outcome_2_YS_X", successTerminal: "terminal_YS_X_S", failTerminal: "terminal_YS_X_F" },
		{ id: "outcome_2_YS_Y", successTerminal: "terminal_YS_Y_S", failTerminal: "terminal_YS_Y_F" },
		{ id: "outcome_2_YF_X", successTerminal: "terminal_YF_X_S", failTerminal: "terminal_YF_X_F" },
		{ id: "outcome_2_YF_Y", successTerminal: "terminal_YF_Y_S", failTerminal: "terminal_YF_Y_F" },
	];

	for (const outcome of layer2Outcomes) {
		const outcomeNode: OutcomeNode = {
			id: outcome.id,
			type: "outcome",
			narrative: "Výsledek se blíží...",
			successChance: 70,
			successNodeId: outcome.successTerminal,
			failNodeId: outcome.failTerminal,
		};
		nodes[outcome.id] = outcomeNode;
	}

	// =========================================================================
	// TERMINAL NODES (16 endings)
	// =========================================================================

	const terminalMappings: Array<{ nodeId: string; terminalKey: keyof typeof response.terminals }> = [
		{ nodeId: "terminal_XS_X_S", terminalKey: "XS_X_S" },
		{ nodeId: "terminal_XS_X_F", terminalKey: "XS_X_F" },
		{ nodeId: "terminal_XS_Y_S", terminalKey: "XS_Y_S" },
		{ nodeId: "terminal_XS_Y_F", terminalKey: "XS_Y_F" },
		{ nodeId: "terminal_XF_X_S", terminalKey: "XF_X_S" },
		{ nodeId: "terminal_XF_X_F", terminalKey: "XF_X_F" },
		{ nodeId: "terminal_XF_Y_S", terminalKey: "XF_Y_S" },
		{ nodeId: "terminal_XF_Y_F", terminalKey: "XF_Y_F" },
		{ nodeId: "terminal_YS_X_S", terminalKey: "YS_X_S" },
		{ nodeId: "terminal_YS_X_F", terminalKey: "YS_X_F" },
		{ nodeId: "terminal_YS_Y_S", terminalKey: "YS_Y_S" },
		{ nodeId: "terminal_YS_Y_F", terminalKey: "YS_Y_F" },
		{ nodeId: "terminal_YF_X_S", terminalKey: "YF_X_S" },
		{ nodeId: "terminal_YF_X_F", terminalKey: "YF_X_F" },
		{ nodeId: "terminal_YF_Y_S", terminalKey: "YF_Y_S" },
		{ nodeId: "terminal_YF_Y_F", terminalKey: "YF_Y_F" },
	];

	for (const mapping of terminalMappings) {
		const terminalData = response.terminals[mapping.terminalKey];
		const terminalNode: TerminalNode = {
			id: mapping.nodeId,
			type: "terminal",
			narrative: terminalData.narrative,
			coinsChange: terminalData.coinsChange,
			isPositiveEnding: terminalData.isPositiveEnding,
			xpMultiplier: terminalData.xpMultiplier,
		};
		nodes[mapping.nodeId] = terminalNode;
	}

	// =========================================================================
	// CALCULATE BALANCE METADATA
	// =========================================================================

	// Use the AI response terminal data directly (guaranteed to be numbers, not functions)
	const terminalCoins = Object.values(response.terminals).map((t) => t.coinsChange);

	const avgReward = Math.round(terminalCoins.reduce((a, b) => a + b, 0) / terminalCoins.length);
	const maxReward = Math.max(...terminalCoins);
	const minReward = Math.min(...terminalCoins);

	return {
		id: storyId,
		title: response.title,
		emoji: response.emoji,
		startNodeId: "intro",
		nodes,
		expectedPaths: 32, // 2^5 paths through 5 decision points (simplified)
		averageReward: avgReward,
		maxPossibleReward: maxReward,
		minPossibleReward: minReward,
	};
}

/**
 * Build a StoryChoice from AI choice data
 */
function buildChoice(id: "choiceX" | "choiceY", choice: AIChoice, nextNodeId: string): StoryChoice {
	return {
		id,
		label: choice.label,
		description: choice.description,
		baseReward: choice.baseReward,
		riskMultiplier: choice.riskMultiplier,
		nextNodeId,
	};
}
