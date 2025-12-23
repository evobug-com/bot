/**
 * Branching Story System Types
 *
 * This module defines the type system for Mass Effect-style branching narratives.
 * Stories are represented as directed graphs where nodes represent narrative moments
 * and edges represent player choices or chance-based outcomes.
 */

// =============================================================================
// Node Types
// =============================================================================

/**
 * Types of nodes in the story graph
 * - intro: Starting node, sets up the scenario
 * - decision: Player makes a choice between X and Y
 * - outcome: 70/30 chance roll determines success/failure
 * - terminal: Story ends, final rewards applied
 */
export type StoryNodeType = "intro" | "decision" | "outcome" | "terminal";

/**
 * A player choice at a decision node
 */
export interface StoryChoice {
	/** Identifier for this choice */
	id: "choiceX" | "choiceY";
	/** Button label text (max 25 characters) */
	label: string;
	/** Description shown below narrative explaining the choice */
	description: string;
	/** Base coin reward if this path succeeds */
	baseReward: number;
	/**
	 * Modifies success chance: 1.0 = normal (70%), 0.8 = easier (76%), 1.2 = harder (58%)
	 * Formula: successChance = 70 / riskMultiplier
	 */
	riskMultiplier: number;
	/** ID of the next node after choosing this option */
	nextNodeId: string;
}

/**
 * Dynamic value type - can be a static value or a function that generates one
 * Use functions for randomization (e.g., vote counts, variable rewards)
 */
export type DynamicValue<T> = T | (() => T);

/**
 * Helper to resolve a dynamic value (call if function, return if static)
 */
export function resolveDynamicValue<T>(value: DynamicValue<T>): T {
	return typeof value === "function" ? (value as () => T)() : value;
}

/**
 * Random integer generator for dynamic story content
 * Use in narrative functions for random values (vote counts, amounts, etc.)
 */
export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Base properties shared by all node types
 */
interface BaseStoryNode {
	/** Unique identifier within this story */
	id: string;
	/** Node type determines behavior and available properties */
	type: StoryNodeType;
	/** Narrative text shown to player (supports markdown). Can be a function for dynamic content. */
	narrative: DynamicValue<string>;
	/** Immediate coin change when entering this node (optional). Can be a function for randomization. */
	coinsChange?: DynamicValue<number>;
}

/**
 * Intro node - story beginning
 */
export interface IntroNode extends BaseStoryNode {
	type: "intro";
	/** ID of the first decision node */
	nextNodeId: string;
}

/**
 * Decision node - player chooses between two options
 */
export interface DecisionNode extends BaseStoryNode {
	type: "decision";
	/** The two choices available to the player */
	choices: {
		choiceX: StoryChoice;
		choiceY: StoryChoice;
	};
}

/**
 * Outcome node - resolves a 70/30 chance roll
 */
export interface OutcomeNode extends BaseStoryNode {
	type: "outcome";
	/** Success probability (default 70, modified by choice's riskMultiplier) */
	successChance: number;
	/** Node ID if roll succeeds */
	successNodeId: string;
	/** Node ID if roll fails */
	failNodeId: string;
}

/**
 * Terminal node - story ending
 */
export interface TerminalNode extends BaseStoryNode {
	type: "terminal";
	/** Whether this is a positive ending (for 70/30 balance tracking) */
	isPositiveEnding: boolean;
	/** XP multiplier for this ending (1.0 = base, 2.0 = double) */
	xpMultiplier: number;
}

/**
 * Union type for all node types
 */
export type StoryNode = IntroNode | DecisionNode | OutcomeNode | TerminalNode;

// =============================================================================
// Story Definition
// =============================================================================

/**
 * Complete branching story definition
 */
export interface BranchingStory {
	/** Unique story identifier */
	id: string;
	/** Display title */
	title: string;
	/** Emoji shown with the story */
	emoji: string;
	/** ID of the starting node */
	startNodeId: string;
	/** All nodes in the story graph */
	nodes: Record<string, StoryNode>;

	// Balance metadata for verification
	/** Expected number of unique paths through the story */
	expectedPaths: number;
	/** Target average coin reward */
	averageReward: number;
	/** Maximum possible coin gain */
	maxPossibleReward: number;
	/** Maximum possible coin loss (negative number) */
	minPossibleReward: number;
}

// =============================================================================
// Session Types
// =============================================================================

/**
 * A recorded choice with full context for public summary
 */
export interface ChoiceHistoryEntry {
	/** Node ID where the choice was made */
	nodeId: string;
	/** The narrative shown at this decision point */
	narrative: string;
	/** Choice identifier (choiceX or choiceY) */
	choice: "choiceX" | "choiceY";
	/** Both options that were available */
	options: {
		choiceX: { label: string; description: string };
		choiceY: { label: string; description: string };
	};
}

/**
 * Types of journal entries for the story
 */
export type StoryJournalType = "intro" | "decision" | "outcome";

/**
 * A journal entry recording what happened in the story
 */
export interface StoryJournalEntry {
	/** Type of story event */
	type: StoryJournalType;
	/** The narrative text shown to the player */
	narrative: string;
	/** For decision: which choice was made */
	choice?: "choiceX" | "choiceY";
	/** For decision: both options that were available */
	options?: {
		choiceX: { label: string; description: string };
		choiceY: { label: string; description: string };
	};
	/** For outcome: the roll result */
	rollResult?: {
		rolled: number;
		needed: number;
		success: boolean;
	};
}

/**
 * Active story session for a player
 */
export interface StorySession {
	/** Unique session identifier */
	sessionId: string;
	/** Discord user ID */
	discordUserId: string;
	/** Database user ID */
	dbUserId: number;
	/** ID of the story being played */
	storyId: string;
	/** Current node in the story */
	currentNodeId: string;
	/** Accumulated coin change (can be negative) */
	accumulatedCoins: number;
	/** Path of choices made (for analytics) */
	choicesPath: string[];
	/** History of choices with human-readable labels (for summary) */
	choiceHistory: ChoiceHistoryEntry[];
	/** Full story journal with all narratives (intro, decisions, outcomes) */
	storyJournal: StoryJournalEntry[];
	/** Session start timestamp */
	startedAt: number;
	/** Last interaction timestamp */
	lastInteractionAt: number;
	/** Discord message ID (for updates) */
	messageId: string;
	/** Discord channel ID */
	channelId: string;
	/** Discord guild ID */
	guildId: string;
	/** User level at story start (for XP calculation) */
	userLevel: number;
	/**
	 * Cached resolved values for dynamic node content.
	 * Maps nodeId -> fieldName -> resolved value.
	 * Ensures narrative and coinsChange use the same random values.
	 */
	resolvedNodeValues: Record<string, Record<string, string | number>>;
}

// =============================================================================
// Engine Types
// =============================================================================

/**
 * Result of processing a story action
 */
export interface StoryActionResult {
	/** Updated session state */
	session: StorySession;
	/** Current node after action */
	currentNode: StoryNode;
	/** Narrative text to display */
	narrative: string;
	/** Whether the story has ended */
	isComplete: boolean;
	/** Final result if story is complete */
	finalResult?: StoryFinalResult;
	/** Roll result if an outcome node was processed */
	rollResult?: {
		rolled: number;
		needed: number;
		success: boolean;
	};
}

/**
 * Final result when a story completes
 */
export interface StoryFinalResult {
	/** Total coins gained/lost */
	totalCoins: number;
	/** XP earned */
	xpEarned: number;
	/** Whether it was a positive ending */
	isPositiveEnding: boolean;
	/** Terminal node ID reached */
	terminalNodeId: string;
	/** Complete path taken through the story */
	pathTaken: string[];
}

/**
 * Button actions for story interactions
 */
export type StoryAction = "choiceX" | "choiceY" | "cancel" | "keepBalance";

// =============================================================================
// Type Guards
// =============================================================================

export function isIntroNode(node: StoryNode): node is IntroNode {
	return node.type === "intro";
}

export function isDecisionNode(node: StoryNode): node is DecisionNode {
	return node.type === "decision";
}

export function isOutcomeNode(node: StoryNode): node is OutcomeNode {
	return node.type === "outcome";
}

export function isTerminalNode(node: StoryNode): node is TerminalNode {
	return node.type === "terminal";
}
