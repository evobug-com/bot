/**
 * Story Execution Engine
 *
 * Handles node traversal, chance rolls, reward calculation, and narrative generation
 * for branching stories.
 */

import { orpc } from "../../client/client";
import * as sessionManager from "../../services/storySession";
import type {
	BranchingStory,
	DynamicValue,
	StoryAction,
	StoryActionResult,
	StoryFinalResult,
	StoryNode,
	StorySession,
} from "./types";
import {
	isDecisionNode,
	isIntroNode,
	isOutcomeNode,
	isTerminalNode,
	resolveDynamicValue,
} from "./types";

// Story registry - stores all available stories
const storyRegistry = new Map<string, BranchingStory>();

/**
 * Register a story in the engine
 */
export function registerStory(story: BranchingStory): void {
	storyRegistry.set(story.id, story);
	console.log(`[StoryEngine] Registered story: ${story.id}`);
}

/**
 * Get a story by ID
 */
export function getStory(storyId: string): BranchingStory | undefined {
	return storyRegistry.get(storyId);
}

/**
 * Get all registered story IDs
 */
export function getRegisteredStoryIds(): string[] {
	return Array.from(storyRegistry.keys());
}

/**
 * Calculate base XP for a story based on user level
 * Formula: level * 6 + 50 (same as existing stories)
 */
export function calculateBaseXP(userLevel: number): number {
	return userLevel * 6 + 50;
}

/**
 * Perform a chance roll for an outcome node
 * @param successChance Percentage chance of success (0-100)
 * @returns Object with roll result
 */
export function rollChance(successChance: number): {
	rolled: number;
	needed: number;
	success: boolean;
} {
	const rolled = Math.random() * 100;
	return {
		rolled: Math.round(rolled * 100) / 100,
		needed: successChance,
		success: rolled < successChance,
	};
}

/**
 * Get the current node for a session
 */
export function getCurrentNode(
	session: StorySession,
): StoryNode | undefined {
	const story = storyRegistry.get(session.storyId);
	if (!story) {
		return undefined;
	}
	return story.nodes[session.currentNodeId];
}

/**
 * Helper to get a node with proper error handling
 */
function getNodeOrThrow(story: BranchingStory, nodeId: string): StoryNode {
	const node = story.nodes[nodeId];
	if (!node) {
		throw new Error(`Node not found: ${nodeId}`);
	}
	return node;
}

/**
 * Resolve a dynamic value for a node, caching the result in the session.
 * This ensures that narrative and coinsChange use the same random values.
 */
export function resolveNodeValue<T extends string | number>(
	session: StorySession,
	nodeId: string,
	field: string,
	value: DynamicValue<T>,
): T {
	// Initialize the node's cache if needed
	if (!session.resolvedNodeValues[nodeId]) {
		session.resolvedNodeValues[nodeId] = {};
	}

	// Check if already resolved
	const cached = session.resolvedNodeValues[nodeId][field];
	if (cached !== undefined) {
		return cached as T;
	}

	// Resolve and cache the value
	const resolved = resolveDynamicValue(value);
	session.resolvedNodeValues[nodeId][field] = resolved;

	return resolved;
}

/**
 * Process an intro node - automatically advances to the first decision
 */
function processIntroNode(
	session: StorySession,
	story: BranchingStory,
): StoryActionResult {
	const node = getNodeOrThrow(story, session.currentNodeId);
	if (!isIntroNode(node)) {
		throw new Error(`Expected intro node, got ${node.type}`);
	}

	// Apply any coin change from intro
	if (node.coinsChange !== undefined) {
		session.accumulatedCoins += resolveNodeValue(session, node.id, "coinsChange", node.coinsChange);
	}

	// Advance to the next node (usually first decision)
	session.currentNodeId = node.nextNodeId;
	session.choicesPath.push("intro");
	sessionManager.updateSession(session);

	const nextNode = getNodeOrThrow(story, session.currentNodeId);

	return {
		session,
		currentNode: nextNode,
		narrative: resolveNodeValue(session, node.id, "narrative", node.narrative),
		isComplete: false,
	};
}

/**
 * Process a decision node choice (choiceX or choiceY)
 */
async function processDecisionChoice(
	session: StorySession,
	story: BranchingStory,
	choice: "choiceX" | "choiceY",
): Promise<StoryActionResult> {
	const node = getNodeOrThrow(story, session.currentNodeId);
	if (!isDecisionNode(node)) {
		throw new Error(`Expected decision node, got ${node.type}`);
	}

	const selectedChoice = node.choices[choice];

	// Record the choice for analytics
	session.choicesPath.push(choice);

	// Record the choice with label for summary
	session.choiceHistory.push({
		nodeId: node.id,
		choice,
		label: selectedChoice.label,
	});

	// Move to the outcome node
	session.currentNodeId = selectedChoice.nextNodeId;
	sessionManager.updateSession(session);

	// Process the outcome node immediately (auto-roll)
	return processOutcomeNode(session, story, selectedChoice.riskMultiplier);
}

/**
 * Process an outcome node - performs the 70/30 roll
 */
async function processOutcomeNode(
	session: StorySession,
	story: BranchingStory,
	riskMultiplier: number = 1.0,
): Promise<StoryActionResult> {
	const node = getNodeOrThrow(story, session.currentNodeId);
	if (!isOutcomeNode(node)) {
		throw new Error(`Expected outcome node, got ${node.type}`);
	}

	// Calculate actual success chance
	const baseChance = node.successChance;
	const actualChance = Math.min(95, Math.max(5, baseChance / riskMultiplier));

	// Perform the roll
	const rollResult = rollChance(actualChance);

	// Apply any coin change from this node
	if (node.coinsChange !== undefined) {
		session.accumulatedCoins += resolveNodeValue(session, node.id, "coinsChange", node.coinsChange);
	}

	// Determine next node based on roll
	const nextNodeId = rollResult.success ? node.successNodeId : node.failNodeId;
	session.currentNodeId = nextNodeId;
	session.choicesPath.push(rollResult.success ? "success" : "fail");
	sessionManager.updateSession(session);

	const nextNode = getNodeOrThrow(story, nextNodeId);
	const resolvedNarrative = resolveNodeValue(session, node.id, "narrative", node.narrative);

	// Check if next node is terminal or another decision
	if (isTerminalNode(nextNode)) {
		return processTerminalNode(session, story, resolvedNarrative, rollResult);
	}

	return {
		session,
		currentNode: nextNode,
		narrative: resolvedNarrative,
		isComplete: false,
		rollResult,
	};
}

/**
 * Process a terminal node - finalize the story
 */
async function processTerminalNode(
	session: StorySession,
	story: BranchingStory,
	precedingNarrative: string = "",
	rollResult?: { rolled: number; needed: number; success: boolean },
): Promise<StoryActionResult> {
	const node = getNodeOrThrow(story, session.currentNodeId);
	if (!isTerminalNode(node)) {
		throw new Error(`Expected terminal node, got ${node.type}`);
	}

	// Apply final coin change
	if (node.coinsChange !== undefined) {
		session.accumulatedCoins += resolveNodeValue(session, node.id, "coinsChange", node.coinsChange);
	}

	// Calculate final rewards
	const baseXP = calculateBaseXP(session.userLevel);
	const finalXP = Math.round(baseXP * node.xpMultiplier);
	const finalCoins = session.accumulatedCoins;

	// Apply rewards via API
	const [rewardError] = await orpc.users.stats.reward.grant({
		userId: session.dbUserId,
		coins: finalCoins,
		xp: finalXP,
		activityType: `${story.id}_${node.id}`,
		notes: `Story: ${story.title} - ${node.isPositiveEnding ? "Positive" : "Negative"} ending`,
	});

	if (rewardError) {
		console.error("[StoryEngine] Failed to grant rewards:", rewardError);
	}

	const finalResult: StoryFinalResult = {
		totalCoins: finalCoins,
		xpEarned: finalXP,
		isPositiveEnding: node.isPositiveEnding,
		terminalNodeId: node.id,
		pathTaken: [...session.choicesPath],
	};

	// Delete the session
	sessionManager.deleteSession(session.sessionId);

	// Build final narrative with summary
	const coinSign = finalCoins >= 0 ? "+" : "";
	const resolvedTerminalNarrative = resolveNodeValue(session, node.id, "narrative", node.narrative);
	const narrative = `${precedingNarrative}\n\n${resolvedTerminalNarrative}\n\n**Celková bilance:** ${coinSign}${finalCoins} mincí, +${finalXP} XP`;

	return {
		session,
		currentNode: node,
		narrative,
		isComplete: true,
		finalResult,
		rollResult,
	};
}

/**
 * Handle "Keep Balance" action - cash out current accumulated coins
 */
async function processKeepBalance(
	session: StorySession,
	story: BranchingStory,
): Promise<StoryActionResult> {
	const currentNode = getNodeOrThrow(story, session.currentNodeId);

	// Calculate rewards based on accumulated coins
	const baseXP = calculateBaseXP(session.userLevel);
	const finalXP = Math.round(baseXP * 0.75); // 75% XP for early exit
	const finalCoins = session.accumulatedCoins;

	// Apply rewards via API
	const [rewardError] = await orpc.users.stats.reward.grant({
		userId: session.dbUserId,
		coins: finalCoins,
		xp: finalXP,
		activityType: `${story.id}_keep_balance`,
		notes: `Story: ${story.title} - Early exit (Keep Balance)`,
	});

	if (rewardError) {
		console.error("[StoryEngine] Failed to grant rewards:", rewardError);
	}

	const finalResult: StoryFinalResult = {
		totalCoins: finalCoins,
		xpEarned: finalXP,
		isPositiveEnding: finalCoins >= 0,
		terminalNodeId: "keep_balance",
		pathTaken: [...session.choicesPath, "keepBalance"],
	};

	// Delete the session
	sessionManager.deleteSession(session.sessionId);

	// Build narrative
	const coinSign = finalCoins >= 0 ? "+" : "";
	const narrative = `💰 **Ponecháváš si aktuální zůstatek**

Rozhodl ses ukončit příběh a ponechat si ${coinSign}${finalCoins} mincí.

**Celková bilance:** ${coinSign}${finalCoins} mincí, +${finalXP} XP`;

	return {
		session,
		currentNode,
		narrative,
		isComplete: true,
		finalResult,
	};
}

/**
 * Handle "Cancel" action - exit story, run normal work instead
 * Returns null to indicate the caller should run a normal work activity
 */
export function processCancel(session: StorySession): null {
	// Delete the session without granting any story rewards
	sessionManager.deleteSession(session.sessionId);
	return null;
}

/**
 * Main entry point: Process a story action
 */
export async function processAction(
	session: StorySession,
	action: StoryAction,
): Promise<StoryActionResult | null> {
	const story = storyRegistry.get(session.storyId);
	if (!story) {
		throw new Error(`Story not found: ${session.storyId}`);
	}

	const currentNode = story.nodes[session.currentNodeId];
	if (!currentNode) {
		throw new Error(`Node not found: ${session.currentNodeId}`);
	}

	switch (action) {
		case "choiceX":
		case "choiceY":
			if (!isDecisionNode(currentNode)) {
				throw new Error(`Cannot make choice on ${currentNode.type} node`);
			}
			return processDecisionChoice(session, story, action);

		case "keepBalance":
			return processKeepBalance(session, story);

		case "cancel":
			return processCancel(session);
	}
}

/**
 * Start a new story session
 */
export async function startStory(
	storyId: string,
	params: {
		discordUserId: string;
		dbUserId: number;
		messageId: string;
		channelId: string;
		guildId: string;
		userLevel: number;
	},
): Promise<StoryActionResult> {
	const story = storyRegistry.get(storyId);
	if (!story) {
		throw new Error(`Story not found: ${storyId}`);
	}

	// Create new session
	const session = sessionManager.createSession({
		...params,
		storyId,
		startNodeId: story.startNodeId,
	});

	// Process the intro node
	return processIntroNode(session, story);
}

/**
 * Get story and node for rendering buttons
 */
export function getStoryContext(session: StorySession): {
	story: BranchingStory;
	currentNode: StoryNode;
} | null {
	const story = storyRegistry.get(session.storyId);
	if (!story) {
		return null;
	}

	const currentNode = story.nodes[session.currentNodeId];
	if (!currentNode) {
		return null;
	}

	return { story, currentNode };
}

/**
 * Validate a story's node graph
 * Returns list of errors, empty if valid
 */
export function validateStory(story: BranchingStory): string[] {
	const errors: string[] = [];

	// Check start node exists
	if (!story.nodes[story.startNodeId]) {
		errors.push(`Start node '${story.startNodeId}' not found`);
	}

	// Check all node references are valid
	for (const [nodeId, node] of Object.entries(story.nodes)) {
		if (isIntroNode(node)) {
			if (!story.nodes[node.nextNodeId]) {
				errors.push(`Intro node '${nodeId}' references missing node '${node.nextNodeId}'`);
			}
		}

		if (isDecisionNode(node)) {
			if (!story.nodes[node.choices.choiceX.nextNodeId]) {
				errors.push(`Decision node '${nodeId}' choiceX references missing node`);
			}
			if (!story.nodes[node.choices.choiceY.nextNodeId]) {
				errors.push(`Decision node '${nodeId}' choiceY references missing node`);
			}
		}

		if (isOutcomeNode(node)) {
			if (!story.nodes[node.successNodeId]) {
				errors.push(`Outcome node '${nodeId}' success references missing node`);
			}
			if (!story.nodes[node.failNodeId]) {
				errors.push(`Outcome node '${nodeId}' fail references missing node`);
			}
		}
	}

	// Count terminal nodes
	const terminals = Object.values(story.nodes).filter(isTerminalNode);
	if (terminals.length < 8) {
		errors.push(`Story has only ${terminals.length} terminal nodes (minimum 8)`);
	}

	// Check 70/30 balance
	const positiveTerminals = terminals.filter((t) => t.isPositiveEnding);
	const ratio = positiveTerminals.length / terminals.length;
	if (ratio < 0.6 || ratio > 0.8) {
		errors.push(`Positive ending ratio is ${(ratio * 100).toFixed(0)}% (should be 60-80%)`);
	}

	return errors;
}
