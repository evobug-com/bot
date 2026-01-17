import { describe, expect, it, beforeEach, mock } from "bun:test";
import * as engine from "./engine";
import type { BranchingStory, StoryNode, StorySession } from "./types";
import {
	isDecisionNode,
	isIntroNode,
	isOutcomeNode,
	isTerminalNode,
} from "./types";

// Mock the orpc client
const mockGrant = mock(async () => [null, { success: true }]);
void mock.module("../../client/client", () => ({
	orpc: {
		users: {
			stats: {
				reward: {
					grant: mockGrant,
				},
			},
		},
	},
}));

// Mock session manager
const mockSessions = new Map<string, StorySession>();
void mock.module("../../services/storySession", () => ({
	createSession: mock((params: {
		discordUserId?: string;
		dbUserId?: number;
		storyId?: string;
		startNodeId?: string;
		messageId?: string;
		channelId?: string;
		guildId?: string;
		userLevel?: number;
	}) => {
		const session: StorySession = {
			sessionId: `test-session-${Date.now()}`,
			discordUserId: params.discordUserId ?? "test-user",
			dbUserId: params.dbUserId ?? 1,
			storyId: params.storyId ?? "test-story",
			currentNodeId: params.startNodeId ?? "intro",
			accumulatedCoins: 0,
			choicesPath: [],
			choiceHistory: [],
			storyJournal: [],
			startedAt: Date.now(),
			lastInteractionAt: Date.now(),
			messageId: params.messageId ?? "",
			channelId: params.channelId ?? "",
			guildId: params.guildId ?? "",
			userLevel: params.userLevel ?? 10,
			resolvedNodeValues: {},
		};
		mockSessions.set(session.sessionId, session);
		return session;
	}),
	getSession: mock((sessionId: string) => mockSessions.get(sessionId)),
	updateSession: mock((session: StorySession) => {
		mockSessions.set(session.sessionId, session);
	}),
	deleteSession: mock((sessionId: string) => {
		mockSessions.delete(sessionId);
	}),
	initSessionManager: mock(() => {}),
	cleanupExpiredSessions: mock(() => 0),
}));

// Create a simple test story for testing
const testStory: BranchingStory = {
	id: "test_story",
	title: "Test Story",
	emoji: "🧪",
	startNodeId: "intro",
	nodes: {
		intro: {
			id: "intro",
			type: "intro",
			narrative: "This is the intro.",
			nextNodeId: "decision_1",
		} as StoryNode,
		decision_1: {
			id: "decision_1",
			type: "decision",
			narrative: "Make a choice.",
			choices: {
				choiceX: {
					id: "choiceX",
					label: "Option A",
					description: "Choose A",
					baseReward: 100,
					riskMultiplier: 1.0,
					nextNodeId: "outcome_a",
				},
				choiceY: {
					id: "choiceY",
					label: "Option B",
					description: "Choose B",
					baseReward: 50,
					riskMultiplier: 0.8,
					nextNodeId: "outcome_b",
				},
			},
		} as StoryNode,
		outcome_a: {
			id: "outcome_a",
			type: "outcome",
			narrative: "Rolling for A...",
			successChance: 70,
			successNodeId: "terminal_success_a",
			failNodeId: "terminal_fail_a",
		} as StoryNode,
		outcome_b: {
			id: "outcome_b",
			type: "outcome",
			narrative: "Rolling for B...",
			successChance: 70,
			successNodeId: "terminal_success_b",
			failNodeId: "terminal_fail_b",
		} as StoryNode,
		terminal_success_a: {
			id: "terminal_success_a",
			type: "terminal",
			narrative: "You succeeded with A!",
			coinsChange: 500,
			isPositiveEnding: true,
			xpMultiplier: 1.5,
		} as StoryNode,
		terminal_fail_a: {
			id: "terminal_fail_a",
			type: "terminal",
			narrative: "You failed with A.",
			coinsChange: -100,
			isPositiveEnding: false,
			xpMultiplier: 0.7,
		} as StoryNode,
		terminal_success_b: {
			id: "terminal_success_b",
			type: "terminal",
			narrative: "You succeeded with B!",
			coinsChange: 200,
			isPositiveEnding: true,
			xpMultiplier: 1.2,
		} as StoryNode,
		terminal_fail_b: {
			id: "terminal_fail_b",
			type: "terminal",
			narrative: "You failed with B.",
			coinsChange: -50,
			isPositiveEnding: false,
			xpMultiplier: 0.8,
		} as StoryNode,
	},
	expectedPaths: 4,
	averageReward: 137.5,
	maxPossibleReward: 500,
	minPossibleReward: -100,
};

// Helper to get node with type assertion for tests
function getTestNode(nodes: Record<string, StoryNode>, id: string): StoryNode {
	const node = nodes[id];
	if (!node) throw new Error(`Test node not found: ${id}`);
	return node;
}

describe("Story Engine", () => {
	beforeEach(() => {
		mockSessions.clear();
		mockGrant.mockClear();
		// Register test story
		engine.registerStory(testStory);
	});

	describe("registerStory", () => {
		it("should register a story", () => {
			const story = engine.getStory("test_story");
			expect(story).toBeDefined();
			expect(story?.id).toBe("test_story");
			expect(story?.title).toBe("Test Story");
		});

		it("should return undefined for unregistered story", () => {
			const story = engine.getStory("nonexistent");
			expect(story).toBeUndefined();
		});
	});

	describe("getRegisteredStoryIds", () => {
		it("should return all registered story IDs", () => {
			const ids = engine.getRegisteredStoryIds();
			expect(ids).toContain("test_story");
		});
	});

	describe("calculateBaseXP", () => {
		it("should calculate XP based on user level", () => {
			expect(engine.calculateBaseXP(1)).toBe(56); // 1 * 6 + 50
			expect(engine.calculateBaseXP(10)).toBe(110); // 10 * 6 + 50
			expect(engine.calculateBaseXP(50)).toBe(350); // 50 * 6 + 50
		});
	});

	describe("rollChance", () => {
		it("should return roll result with correct structure", () => {
			const result = engine.rollChance(70);
			expect(result).toHaveProperty("rolled");
			expect(result).toHaveProperty("needed");
			expect(result).toHaveProperty("success");
			expect(result.needed).toBe(70);
			expect(typeof result.rolled).toBe("number");
			expect(typeof result.success).toBe("boolean");
		});

		it("should always succeed with 100% chance", () => {
			// Test multiple times to verify
			for (let i = 0; i < 100; i++) {
				const result = engine.rollChance(100);
				expect(result.success).toBe(true);
			}
		});

		it("should always fail with 0% chance", () => {
			// Test multiple times to verify
			for (let i = 0; i < 100; i++) {
				const result = engine.rollChance(0);
				expect(result.success).toBe(false);
			}
		});

		it("should have rolled value between 0 and 100", () => {
			for (let i = 0; i < 100; i++) {
				const result = engine.rollChance(50);
				expect(result.rolled).toBeGreaterThanOrEqual(0);
				expect(result.rolled).toBeLessThanOrEqual(100);
			}
		});
	});

	describe("Type guards", () => {
		it("isIntroNode should identify intro nodes", () => {
			const introNode = getTestNode(testStory.nodes, "intro");
			const decisionNode = getTestNode(testStory.nodes, "decision_1");
			expect(isIntroNode(introNode)).toBe(true);
			expect(isIntroNode(decisionNode)).toBe(false);
		});

		it("isDecisionNode should identify decision nodes", () => {
			const decisionNode = getTestNode(testStory.nodes, "decision_1");
			const introNode = getTestNode(testStory.nodes, "intro");
			expect(isDecisionNode(decisionNode)).toBe(true);
			expect(isDecisionNode(introNode)).toBe(false);
		});

		it("isOutcomeNode should identify outcome nodes", () => {
			const outcomeNode = getTestNode(testStory.nodes, "outcome_a");
			const decisionNode = getTestNode(testStory.nodes, "decision_1");
			expect(isOutcomeNode(outcomeNode)).toBe(true);
			expect(isOutcomeNode(decisionNode)).toBe(false);
		});

		it("isTerminalNode should identify terminal nodes", () => {
			const terminalNode = getTestNode(testStory.nodes, "terminal_success_a");
			const outcomeNode = getTestNode(testStory.nodes, "outcome_a");
			expect(isTerminalNode(terminalNode)).toBe(true);
			expect(isTerminalNode(outcomeNode)).toBe(false);
		});
	});

	describe("validateStory", () => {
		it("should validate a correct story with no errors", () => {
			// Create a story that passes validation
			const validStory: BranchingStory = {
				id: "valid_story",
				title: "Valid Story",
				emoji: "✅",
				startNodeId: "intro",
				nodes: {
					intro: {
						id: "intro",
						type: "intro",
						narrative: "Intro",
						nextNodeId: "decision_1",
					} as StoryNode,
					decision_1: {
						id: "decision_1",
						type: "decision",
						narrative: "Choose",
						choices: {
							choiceX: {
								id: "choiceX",
								label: "A",
								description: "A",
								baseReward: 100,
								riskMultiplier: 1.0,
								nextNodeId: "outcome_1",
							},
							choiceY: {
								id: "choiceY",
								label: "B",
								description: "B",
								baseReward: 100,
								riskMultiplier: 1.0,
								nextNodeId: "outcome_2",
							},
						},
					} as StoryNode,
					outcome_1: {
						id: "outcome_1",
						type: "outcome",
						narrative: "Rolling...",
						successChance: 70,
						successNodeId: "terminal_1",
						failNodeId: "terminal_2",
					} as StoryNode,
					outcome_2: {
						id: "outcome_2",
						type: "outcome",
						narrative: "Rolling...",
						successChance: 70,
						successNodeId: "terminal_3",
						failNodeId: "terminal_4",
					} as StoryNode,
					// 8 terminal nodes to pass minimum requirement
					terminal_1: { id: "terminal_1", type: "terminal", narrative: "T1", coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 } as StoryNode,
					terminal_2: { id: "terminal_2", type: "terminal", narrative: "T2", coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 } as StoryNode,
					terminal_3: { id: "terminal_3", type: "terminal", narrative: "T3", coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 } as StoryNode,
					terminal_4: { id: "terminal_4", type: "terminal", narrative: "T4", coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 } as StoryNode,
					terminal_5: { id: "terminal_5", type: "terminal", narrative: "T5", coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 } as StoryNode,
					terminal_6: { id: "terminal_6", type: "terminal", narrative: "T6", coinsChange: 100, isPositiveEnding: true, xpMultiplier: 1.0 } as StoryNode,
					terminal_7: { id: "terminal_7", type: "terminal", narrative: "T7", coinsChange: -100, isPositiveEnding: false, xpMultiplier: 1.0 } as StoryNode,
					terminal_8: { id: "terminal_8", type: "terminal", narrative: "T8", coinsChange: -100, isPositiveEnding: false, xpMultiplier: 1.0 } as StoryNode,
				},
				expectedPaths: 8,
				averageReward: 100,
				maxPossibleReward: 100,
				minPossibleReward: -100,
			};

			const errors = engine.validateStory(validStory);
			// Should have at most warnings about positive ending ratio
			const criticalErrors = errors.filter(e => !e.includes("ratio"));
			expect(criticalErrors.length).toBe(0);
		});

		it("should detect missing start node", () => {
			const brokenStory: BranchingStory = {
				id: "broken",
				title: "Broken",
				emoji: "❌",
				startNodeId: "missing_intro",
				nodes: {},
				expectedPaths: 0,
				averageReward: 0,
				maxPossibleReward: 0,
				minPossibleReward: 0,
			};

			const errors = engine.validateStory(brokenStory);
			expect(errors.some(e => e.includes("Start node"))).toBe(true);
		});

		it("should detect missing node references in intro", () => {
			const brokenStory: BranchingStory = {
				id: "broken",
				title: "Broken",
				emoji: "❌",
				startNodeId: "intro",
				nodes: {
					intro: {
						id: "intro",
						type: "intro",
						narrative: "Intro",
						nextNodeId: "missing_node",
					} as StoryNode,
				},
				expectedPaths: 0,
				averageReward: 0,
				maxPossibleReward: 0,
				minPossibleReward: 0,
			};

			const errors = engine.validateStory(brokenStory);
			expect(errors.some(e => e.includes("missing node"))).toBe(true);
		});

		it("should detect too few terminal nodes", () => {
			const errors = engine.validateStory(testStory);
			// testStory only has 4 terminals, minimum is 8
			expect(errors.some(e => e.includes("terminal nodes"))).toBe(true);
		});
	});

	describe("getStoryContext", () => {
		it("should return story and current node", () => {
			const session: StorySession = {
				sessionId: "test-1",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "decision_1",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
			storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			const context = engine.getStoryContext(session);
			expect(context).not.toBeNull();
			expect(context?.story.id).toBe("test_story");
			expect(context?.currentNode.id).toBe("decision_1");
		});

		it("should return null for invalid story", () => {
			const session: StorySession = {
				sessionId: "test-2",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "nonexistent",
				currentNodeId: "intro",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
			storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			const context = engine.getStoryContext(session);
			expect(context).toBeNull();
		});

		it("should return null for invalid node", () => {
			const session: StorySession = {
				sessionId: "test-3",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "nonexistent_node",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
			storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			const context = engine.getStoryContext(session);
			expect(context).toBeNull();
		});
	});

	describe("processCancel", () => {
		it("should return null and delete session", () => {
			const session: StorySession = {
				sessionId: "cancel-test",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "decision_1",
				accumulatedCoins: 100,
				choicesPath: ["intro"],
				choiceHistory: [],
			storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};
			mockSessions.set(session.sessionId, session);

			const result = engine.processCancel(session);
			expect(result).toBeNull();
		});
	});

	describe("canResumeSession", () => {
		it("should return true when session is at a decision node", () => {
			const session: StorySession = {
				sessionId: "resume-test-1",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "decision_1",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
				storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			expect(engine.canResumeSession(session)).toBe(true);
		});

		it("should return false when session is at an intro node", () => {
			const session: StorySession = {
				sessionId: "resume-test-2",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "intro",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
				storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			expect(engine.canResumeSession(session)).toBe(false);
		});

		it("should return false when session is at an outcome node", () => {
			const session: StorySession = {
				sessionId: "resume-test-3",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "outcome_a",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
				storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			expect(engine.canResumeSession(session)).toBe(false);
		});

		it("should return false when session is at a terminal node", () => {
			const session: StorySession = {
				sessionId: "resume-test-4",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "terminal_success_a",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
				storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			expect(engine.canResumeSession(session)).toBe(false);
		});

		it("should return false when story does not exist", () => {
			const session: StorySession = {
				sessionId: "resume-test-5",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "nonexistent_story",
				currentNodeId: "decision_1",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
				storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			expect(engine.canResumeSession(session)).toBe(false);
		});

		it("should return false when node does not exist in story", () => {
			const session: StorySession = {
				sessionId: "resume-test-6",
				discordUserId: "user-1",
				dbUserId: 1,
				storyId: "test_story",
				currentNodeId: "nonexistent_node",
				accumulatedCoins: 0,
				choicesPath: [],
				choiceHistory: [],
				storyJournal: [],
				startedAt: Date.now(),
				lastInteractionAt: Date.now(),
				messageId: "",
				channelId: "",
				guildId: "",
				userLevel: 10,
				resolvedNodeValues: {},
			};

			expect(engine.canResumeSession(session)).toBe(false);
		});
	});
});

describe("Story Engine - Stolen Money Branching", () => {
	// Import and test the actual story
	it("should have stolen_money_branching story registered after import", async () => {
		// Import the story (this registers it)
		await import("./stories/stolen-money-branching");

		const story = engine.getStory("stolen_money_branching");
		expect(story).toBeDefined();
		expect(story?.title).toBe("Ukradené peníze");
		expect(story?.emoji).toBe("💰");
	});

	it("should have correct number of endings", async () => {
		await import("./stories/stolen-money-branching");
		const story = engine.getStory("stolen_money_branching");
		expect(story).toBeDefined();
		if (!story) return;

		const terminals = Object.values(story.nodes).filter(n => n.type === "terminal");
		expect(terminals.length).toBe(11); // 8 positive + 3 negative
	});

	it("should have ~70% positive endings", async () => {
		await import("./stories/stolen-money-branching");
		const story = engine.getStory("stolen_money_branching");
		expect(story).toBeDefined();
		if (!story) return;

		const terminals = Object.values(story.nodes).filter(n => n.type === "terminal");
		const positive = terminals.filter(t => isTerminalNode(t) && t.isPositiveEnding);
		const ratio = positive.length / terminals.length;

		expect(ratio).toBeGreaterThanOrEqual(0.6);
		expect(ratio).toBeLessThanOrEqual(0.8);
	});

	it("should have all nodes reachable from start", async () => {
		await import("./stories/stolen-money-branching");
		const story = engine.getStory("stolen_money_branching");
		expect(story).toBeDefined();
		if (!story) return;

		// BFS to find all reachable nodes
		const visited = new Set<string>();
		const queue = [story.startNodeId];

		while (queue.length > 0) {
			const nodeId = queue.shift();
			if (!nodeId || visited.has(nodeId)) continue;
			visited.add(nodeId);

			const node = story.nodes[nodeId];
			if (!node) continue;

			if (isIntroNode(node)) {
				queue.push(node.nextNodeId);
			} else if (isDecisionNode(node)) {
				queue.push(node.choices.choiceX.nextNodeId);
				queue.push(node.choices.choiceY.nextNodeId);
			} else if (isOutcomeNode(node)) {
				queue.push(node.successNodeId);
				queue.push(node.failNodeId);
			}
		}

		// All non-orphan nodes should be reachable
		const allNodeIds = Object.keys(story.nodes);
		for (const nodeId of allNodeIds) {
			expect(visited.has(nodeId)).toBe(true);
		}
	});
});

// Import work command to register all stories
import "../../commands/work";

/**
 * Comprehensive validation of all branching stories
 * Simulates the actual engine flow to ensure all paths work correctly
 */
describe("All Branching Stories - Engine Flow Validation", () => {
	// Helper to get node
	function getNode(story: BranchingStory, nodeId: string): StoryNode | undefined {
		return story.nodes[nodeId];
	}

	/**
	 * Simulates the engine flow for a path through the story
	 * Returns error message if flow would fail, null if OK
	 */
	function simulateEnginePath(
		story: BranchingStory,
		path: string[],
	): { error: string | null; reachedTerminal: boolean } {
		let currentNodeId = story.startNodeId;
		const pathCopy = [...path];

		for (let i = 0; i < 100; i++) {
			const node = getNode(story, currentNodeId);
			if (!node) {
				return { error: `Node not found: ${currentNodeId}`, reachedTerminal: false };
			}

			if (isTerminalNode(node)) {
				return { error: null, reachedTerminal: true };
			}

			if (isIntroNode(node)) {
				currentNodeId = node.nextNodeId;
				continue;
			}

			if (isDecisionNode(node)) {
				const choice = pathCopy.shift();
				if (!choice || (choice !== "choiceX" && choice !== "choiceY")) {
					return { error: `Expected choice at decision ${node.id}`, reachedTerminal: false };
				}

				const selectedChoice = node.choices[choice];
				const nextNode = getNode(story, selectedChoice.nextNodeId);

				if (!nextNode) {
					return { error: `Decision ${node.id} ${choice} points to missing node`, reachedTerminal: false };
				}

				// Engine handles direct terminal (deterministic choice)
				if (isTerminalNode(nextNode)) {
					return { error: null, reachedTerminal: true };
				}

				if (isOutcomeNode(nextNode)) {
					currentNodeId = selectedChoice.nextNodeId;
					continue;
				}

				return {
					error: `Decision ${node.id} ${choice} points to invalid type: ${nextNode.type}`,
					reachedTerminal: false,
				};
			}

			if (isOutcomeNode(node)) {
				const roll = pathCopy.shift();
				if (!roll || (roll !== "success" && roll !== "fail")) {
					return { error: `Expected roll at outcome ${node.id}`, reachedTerminal: false };
				}

				const nextNodeId = roll === "success" ? node.successNodeId : node.failNodeId;
				const nextNode = getNode(story, nextNodeId);

				if (!nextNode) {
					return { error: `Outcome ${node.id} ${roll} points to missing node`, reachedTerminal: false };
				}

				if (isTerminalNode(nextNode)) {
					return { error: null, reachedTerminal: true };
				}

				if (isDecisionNode(nextNode)) {
					currentNodeId = nextNodeId;
					continue;
				}

				return {
					error: `Outcome ${node.id} ${roll} points to invalid type: ${nextNode.type}`,
					reachedTerminal: false,
				};
			}

			return { error: `Unknown node type at ${currentNodeId}`, reachedTerminal: false };
		}

		return { error: "Max iterations - infinite loop", reachedTerminal: false };
	}

	/**
	 * Generate all possible paths through a story
	 */
	function generateAllPaths(story: BranchingStory): string[][] {
		const paths: string[][] = [];

		function traverse(nodeId: string, currentPath: string[]): void {
			const node = getNode(story, nodeId);
			if (!node) return;

			if (isTerminalNode(node)) {
				paths.push([...currentPath]);
				return;
			}

			if (isIntroNode(node)) {
				traverse(node.nextNodeId, currentPath);
			}

			if (isDecisionNode(node)) {
				const choiceXNext = getNode(story, node.choices.choiceX.nextNodeId);
				const choiceYNext = getNode(story, node.choices.choiceY.nextNodeId);

				if (choiceXNext) {
					if (isTerminalNode(choiceXNext)) {
						paths.push([...currentPath, "choiceX"]);
					} else if (isOutcomeNode(choiceXNext)) {
						traverse(node.choices.choiceX.nextNodeId, [...currentPath, "choiceX"]);
					}
				}

				if (choiceYNext) {
					if (isTerminalNode(choiceYNext)) {
						paths.push([...currentPath, "choiceY"]);
					} else if (isOutcomeNode(choiceYNext)) {
						traverse(node.choices.choiceY.nextNodeId, [...currentPath, "choiceY"]);
					}
				}
			}

			if (isOutcomeNode(node)) {
				traverse(node.successNodeId, [...currentPath, "success"]);
				traverse(node.failNodeId, [...currentPath, "fail"]);
			}
		}

		traverse(story.startNodeId, []);
		return paths;
	}

	// Get all registered story IDs (registered by work command import above)
	const storyIds = engine.getRegisteredStoryIds().filter(id => id !== "test_story");

	for (const storyId of storyIds) {
		describe(storyId, () => {
			it("should have all paths reach terminal nodes correctly", () => {
				const story = engine.getStory(storyId);

				expect(story).toBeDefined();
				if (!story) return;

				const allPaths = generateAllPaths(story);
				expect(allPaths.length).toBeGreaterThan(0);

				const failures: string[] = [];

				for (const path of allPaths) {
					const result = simulateEnginePath(story, [...path]);
					if (result.error || !result.reachedTerminal) {
						failures.push(`Path [${path.join(" -> ")}]: ${result.error ?? "Did not reach terminal"}`);
					}
				}

				if (failures.length > 0) {
					throw new Error(`Story ${storyId} has ${failures.length} failing paths:\n${failures.join("\n")}`);
				}
			});

			it("should have at least 8 terminal nodes", () => {
				const story = engine.getStory(storyId);

				expect(story).toBeDefined();
				if (!story) return;

				const terminals = Object.values(story.nodes).filter(n => n.type === "terminal");
				expect(terminals.length).toBeGreaterThanOrEqual(8);
			});

			it("should have reasonable positive/negative ending balance", () => {
				const story = engine.getStory(storyId);

				expect(story).toBeDefined();
				if (!story) return;

				const terminals = Object.values(story.nodes).filter(n => n.type === "terminal");
				const positive = terminals.filter(t => isTerminalNode(t) && t.isPositiveEnding);
				const ratio = positive.length / terminals.length;

				// Allow 50-85% positive endings (some stories have more dramatic negative paths)
				expect(ratio).toBeGreaterThanOrEqual(0.5);
				expect(ratio).toBeLessThanOrEqual(0.85);
			});
		});
	}
});
