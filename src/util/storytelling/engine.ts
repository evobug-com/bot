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
	AIStoryContext,
} from "./types";
import {
	isDecisionNode,
	isIntroNode,
	isOutcomeNode,
	isTerminalNode,
	resolveDynamicValue,
} from "./types";
import {
	generateLayer2,
	generateLayer3,
	addLayer2ToStory,
	addLayer3ToStory,
} from "./aiStoryGeneratorIncremental";

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
 * Register a dynamic (AI-generated) story temporarily
 * These stories are cleaned up after the session ends
 */
export function registerDynamicStory(story: BranchingStory): void {
	storyRegistry.set(story.id, story);
	console.log(`[StoryEngine] Registered dynamic story: ${story.id}`);
}

/**
 * Unregister a story from the engine (for cleanup of AI stories)
 */
export function unregisterStory(storyId: string): void {
	if (storyRegistry.delete(storyId)) {
		console.log(`[StoryEngine] Unregistered story: ${storyId}`);
	}
}

/**
 * Check if a story ID is a dynamic (AI-generated) story
 */
export function isDynamicStory(storyId: string): boolean {
	return storyId.startsWith("ai_");
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
 * Generate Layer 2 nodes on-demand for incremental AI stories
 * Called after first outcome roll when the decision2 node doesn't exist
 */
async function ensureLayer2Generated(
	session: StorySession,
	story: BranchingStory,
	path: "XS" | "XF" | "YS" | "YF",
): Promise<void> {
	// Skip if not an incremental AI story
	if (!session.isIncrementalAI || !session.aiContext) {
		return;
	}

	const decision2Id = `decision2_${path}`;
	// Skip if already generated
	if (story.nodes[decision2Id]) {
		return;
	}

	console.log(`[StoryEngine] Generating Layer 2 for path: ${path}`);

	const choice = path[0] as "X" | "Y";
	const wasSuccess = path[1] === "S";

	const result = await generateLayer2(session.aiContext, choice, wasSuccess);

	if (!result.success || !result.data || !result.context) {
		throw new Error(`Failed to generate Layer 2: ${result.error}`);
	}

	// Update session context
	session.aiContext = result.context;
	sessionManager.updateSession(session);

	// Add Layer 2 nodes to story
	addLayer2ToStory(story, result.data, path);
}

/**
 * Generate Layer 3 terminal on-demand for incremental AI stories
 * Called after second outcome roll when the terminal node doesn't exist
 */
async function ensureLayer3Generated(
	session: StorySession,
	story: BranchingStory,
	path: string, // e.g., "XS_X_S" or "YF_Y_F"
): Promise<void> {
	// Skip if not an incremental AI story
	if (!session.isIncrementalAI || !session.aiContext) {
		return;
	}

	const terminalId = `terminal_${path}`;
	// Skip if already generated
	if (story.nodes[terminalId]) {
		return;
	}

	console.log(`[StoryEngine] Generating Layer 3 for path: ${path}`);

	// Parse the path to determine the second choice and outcome
	const parts = path.split("_");
	const choice = parts[1] as "X" | "Y";
	const wasSuccess = parts[2] === "S";

	// Update context with second choice before generating
	const updatedContext: AIStoryContext = {
		...session.aiContext,
		pathSoFar: session.aiContext.pathSoFar + choice,
	};

	const result = await generateLayer3(updatedContext, choice, wasSuccess);

	if (!result.success || !result.data) {
		throw new Error(`Failed to generate Layer 3: ${result.error}`);
	}

	// Add terminal node to story
	addLayer3ToStory(story, result.data, path);
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

	const introNarrative = resolveNodeValue(session, node.id, "narrative", node.narrative);

	// Record intro in story journal
	session.storyJournal.push({
		type: "intro",
		narrative: introNarrative,
	});

	// Advance to the next node (usually first decision)
	session.currentNodeId = node.nextNodeId;
	session.choicesPath.push("intro");
	sessionManager.updateSession(session);

	const nextNode = getNodeOrThrow(story, session.currentNodeId);

	return {
		session,
		currentNode: nextNode,
		narrative: introNarrative,
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
	const decisionNarrative = resolveNodeValue(session, node.id, "narrative", node.narrative);

	// Record the choice for analytics
	session.choicesPath.push(choice);

	// Record the choice with full context for public summary
	session.choiceHistory.push({
		nodeId: node.id,
		narrative: decisionNarrative,
		choice,
		options: {
			choiceX: {
				label: node.choices.choiceX.label,
				description: node.choices.choiceX.description,
			},
			choiceY: {
				label: node.choices.choiceY.label,
				description: node.choices.choiceY.description,
			},
		},
	});

	// Record decision in story journal
	session.storyJournal.push({
		type: "decision",
		narrative: decisionNarrative,
		choice,
		options: {
			choiceX: {
				label: node.choices.choiceX.label,
				description: node.choices.choiceX.description,
			},
			choiceY: {
				label: node.choices.choiceY.label,
				description: node.choices.choiceY.description,
			},
		},
	});

	// Move to the next node
	session.currentNodeId = selectedChoice.nextNodeId;
	sessionManager.updateSession(session);

	const nextNode = getNodeOrThrow(story, selectedChoice.nextNodeId);

	// Handle direct terminal (no outcome roll - deterministic choice)
	if (isTerminalNode(nextNode)) {
		return processTerminalNode(session, story, decisionNarrative);
	}

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

	// For incremental AI stories, generate the next layer on-demand
	if (session.isIncrementalAI) {
		// Check if this is a Layer 1 outcome (outcome1X or outcome1Y)
		if (node.id === "outcome1X" || node.id === "outcome1Y") {
			const choice = node.id === "outcome1X" ? "X" : "Y";
			const path = `${choice}${rollResult.success ? "S" : "F"}` as "XS" | "XF" | "YS" | "YF";
			await ensureLayer2Generated(session, story, path);
		}
		// Check if this is a Layer 2 outcome (outcome2_XX_X or outcome2_XX_Y)
		else if (node.id.startsWith("outcome2_")) {
			// Parse: outcome2_XS_X → path = XS, choice = X
			const parts = node.id.split("_");
			const layer1Path = parts[1]; // XS, XF, YS, or YF
			const choice2 = parts[2]; // X or Y
			const terminalPath = `${layer1Path}_${choice2}_${rollResult.success ? "S" : "F"}`;
			await ensureLayer3Generated(session, story, terminalPath);
		}
	}

	const nextNode = getNodeOrThrow(story, nextNodeId);
	const resolvedNarrative = resolveNodeValue(session, node.id, "narrative", node.narrative);

	// Record outcome in story journal
	session.storyJournal.push({
		type: "outcome",
		narrative: resolvedNarrative,
		rollResult,
	});

	sessionManager.updateSession(session);

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

	// Clean up dynamic (AI-generated) stories from registry
	if (isDynamicStory(story.id)) {
		unregisterStory(story.id);
	}

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

	// Clean up dynamic (AI-generated) stories from registry
	if (isDynamicStory(story.id)) {
		unregisterStory(story.id);
	}

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

	// Clean up dynamic (AI-generated) stories from registry
	if (isDynamicStory(session.storyId)) {
		unregisterStory(session.storyId);
	}

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
 * Result of starting an incremental AI story
 */
export interface IncrementalAIStoryResult {
	success: boolean;
	result?: StoryActionResult;
	error?: string;
	usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

/**
 * Start a new incrementally-generated AI story
 * Only generates Layer 1 (intro + decision1) - subsequent layers are generated on-demand
 */
export async function startIncrementalAIStory(
	params: {
		discordUserId: string;
		dbUserId: number;
		messageId: string;
		channelId: string;
		guildId: string;
		userLevel: number;
	},
): Promise<IncrementalAIStoryResult> {
	// Import here to avoid circular dependency issues
	const { generateLayer1, buildStoryFromLayer1 } = await import("./aiStoryGeneratorIncremental");

	// Generate Layer 1
	const layer1Result = await generateLayer1();
	if (!layer1Result.success || !layer1Result.data || !layer1Result.context) {
		return {
			success: false,
			error: layer1Result.error ?? "Failed to generate story",
			usage: layer1Result.usage,
		};
	}

	// Build story from Layer 1
	const storyId = `ai_incr_${Date.now()}`;
	const story = buildStoryFromLayer1(layer1Result.data, storyId);

	// Register the story
	registerDynamicStory(story);

	// Create session with AI context
	const session = sessionManager.createSession({
		...params,
		storyId,
		startNodeId: story.startNodeId,
		isIncrementalAI: true,
		aiContext: layer1Result.context,
	});

	// Process the intro node
	const result = processIntroNode(session, story);

	console.log(`[StoryEngine] Started incremental AI story "${story.title}" for user ${params.discordUserId}`);

	return {
		success: true,
		result,
		usage: layer1Result.usage,
	};
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
