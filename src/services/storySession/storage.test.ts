import { describe, expect, it, beforeEach, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { StorySession } from "../../util/storytelling/types";

// Use a test-specific database
const TEST_DB_PATH = join(import.meta.dir, "../../../data/story-sessions-test.sqlite");
const dataDir = join(import.meta.dir, "../../../data");

// Ensure data directory exists
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

// Clean up any existing test database
if (existsSync(TEST_DB_PATH)) {
	unlinkSync(TEST_DB_PATH);
}

// Create test database
const db = new Database(TEST_DB_PATH, { create: true });

// Create table
db.run(`
	CREATE TABLE IF NOT EXISTS story_sessions (
		session_id TEXT PRIMARY KEY,
		discord_user_id TEXT NOT NULL,
		db_user_id INTEGER NOT NULL,
		story_id TEXT NOT NULL,
		current_node_id TEXT NOT NULL,
		accumulated_coins INTEGER NOT NULL DEFAULT 0,
		choices_path TEXT NOT NULL DEFAULT '[]',
		started_at INTEGER NOT NULL,
		last_interaction_at INTEGER NOT NULL,
		message_id TEXT NOT NULL,
		channel_id TEXT NOT NULL,
		guild_id TEXT NOT NULL,
		user_level INTEGER NOT NULL DEFAULT 1
	)
`);

// Create indexes
db.run(`
	CREATE INDEX IF NOT EXISTS idx_story_sessions_discord_user
	ON story_sessions(discord_user_id)
`);

db.run(`
	CREATE INDEX IF NOT EXISTS idx_story_sessions_last_interaction
	ON story_sessions(last_interaction_at)
`);

// Database row type
interface StorySessionRow {
	session_id: string;
	discord_user_id: string;
	db_user_id: number;
	story_id: string;
	current_node_id: string;
	accumulated_coins: number;
	choices_path: string;
	started_at: number;
	last_interaction_at: number;
	message_id: string;
	channel_id: string;
	guild_id: string;
	user_level: number;
}

// Convert database row to StorySession
function rowToSession(row: StorySessionRow): StorySession {
	return {
		sessionId: row.session_id,
		discordUserId: row.discord_user_id,
		dbUserId: row.db_user_id,
		storyId: row.story_id,
		currentNodeId: row.current_node_id,
		accumulatedCoins: row.accumulated_coins,
		choicesPath: JSON.parse(row.choices_path) as string[],
		startedAt: row.started_at,
		lastInteractionAt: row.last_interaction_at,
		messageId: row.message_id,
		channelId: row.channel_id,
		guildId: row.guild_id,
		userLevel: row.user_level,
	};
}

// Test implementation of storage functions using test database
function createSession(session: StorySession): void {
	db.run(
		`
		INSERT INTO story_sessions (
			session_id, discord_user_id, db_user_id, story_id, current_node_id,
			accumulated_coins, choices_path, started_at, last_interaction_at,
			message_id, channel_id, guild_id, user_level
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`,
		[
			session.sessionId,
			session.discordUserId,
			session.dbUserId,
			session.storyId,
			session.currentNodeId,
			session.accumulatedCoins,
			JSON.stringify(session.choicesPath),
			session.startedAt,
			session.lastInteractionAt,
			session.messageId,
			session.channelId,
			session.guildId,
			session.userLevel,
		],
	);
}

function getSession(sessionId: string): StorySession | null {
	const row = db
		.query<StorySessionRow, [string]>(
			"SELECT * FROM story_sessions WHERE session_id = ?",
		)
		.get(sessionId);

	if (!row) {
		return null;
	}

	return rowToSession(row);
}

function getActiveSessionByUser(discordUserId: string): StorySession | null {
	const row = db
		.query<StorySessionRow, [string]>(
			`SELECT * FROM story_sessions
			 WHERE discord_user_id = ?
			 ORDER BY last_interaction_at DESC
			 LIMIT 1`,
		)
		.get(discordUserId);

	if (!row) {
		return null;
	}

	return rowToSession(row);
}

function updateSession(session: StorySession): void {
	db.run(
		`
		UPDATE story_sessions SET
			current_node_id = ?,
			accumulated_coins = ?,
			choices_path = ?,
			last_interaction_at = ?
		WHERE session_id = ?
		`,
		[
			session.currentNodeId,
			session.accumulatedCoins,
			JSON.stringify(session.choicesPath),
			session.lastInteractionAt,
			session.sessionId,
		],
	);
}

function deleteSession(sessionId: string): void {
	db.run("DELETE FROM story_sessions WHERE session_id = ?", [sessionId]);
}

function deleteUserSessions(discordUserId: string): void {
	db.run("DELETE FROM story_sessions WHERE discord_user_id = ?", [
		discordUserId,
	]);
}

function getAllActiveSessions(): StorySession[] {
	const rows = db
		.query<StorySessionRow, []>("SELECT * FROM story_sessions")
		.all();

	return rows.map(rowToSession);
}

function cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
	const cutoffTime = Date.now() - maxAgeMs;

	const result = db.run(
		"DELETE FROM story_sessions WHERE last_interaction_at < ?",
		[cutoffTime],
	);

	return result.changes;
}

function hasActiveSession(discordUserId: string): boolean {
	const row = db
		.query<{ count: number }, [string]>(
			"SELECT COUNT(*) as count FROM story_sessions WHERE discord_user_id = ?",
		)
		.get(discordUserId);

	return row !== null && row.count > 0;
}

function getSessionByMessage(messageId: string): StorySession | null {
	const row = db
		.query<StorySessionRow, [string]>(
			"SELECT * FROM story_sessions WHERE message_id = ?",
		)
		.get(messageId);

	if (!row) {
		return null;
	}

	return rowToSession(row);
}

// Helper to create a test session
function createTestSession(overrides: Partial<StorySession> = {}): StorySession {
	const now = Date.now();
	return {
		sessionId: `test-${now}-${Math.random().toString(36).substring(7)}`,
		discordUserId: "123456789",
		dbUserId: 1,
		storyId: "test_story",
		currentNodeId: "intro",
		accumulatedCoins: 0,
		choicesPath: [],
		startedAt: now,
		lastInteractionAt: now,
		messageId: "msg-123",
		channelId: "channel-456",
		guildId: "guild-789",
		userLevel: 10,
		...overrides,
	};
}

describe("Story Session Storage", () => {
	beforeEach(() => {
		// Clear all sessions before each test
		db.run("DELETE FROM story_sessions");
	});

	afterAll(() => {
		// Close database and clean up
		db.close();
		if (existsSync(TEST_DB_PATH)) {
			unlinkSync(TEST_DB_PATH);
		}
	});

	describe("createSession", () => {
		it("should create a new session", () => {
			const session = createTestSession();
			createSession(session);

			const retrieved = getSession(session.sessionId);
			expect(retrieved).not.toBeNull();
			expect(retrieved?.sessionId).toBe(session.sessionId);
			expect(retrieved?.discordUserId).toBe(session.discordUserId);
			expect(retrieved?.storyId).toBe(session.storyId);
		});

		it("should preserve all session fields", () => {
			const session = createTestSession({
				accumulatedCoins: 500,
				choicesPath: ["intro", "choiceX", "success"],
				userLevel: 25,
			});
			createSession(session);

			const retrieved = getSession(session.sessionId);
			expect(retrieved?.accumulatedCoins).toBe(500);
			expect(retrieved?.choicesPath).toEqual(["intro", "choiceX", "success"]);
			expect(retrieved?.userLevel).toBe(25);
		});
	});

	describe("getSession", () => {
		it("should return null for non-existent session", () => {
			const session = getSession("nonexistent");
			expect(session).toBeNull();
		});

		it("should return the correct session", () => {
			const session1 = createTestSession({ sessionId: "session-1" });
			const session2 = createTestSession({ sessionId: "session-2" });
			createSession(session1);
			createSession(session2);

			const retrieved = getSession("session-1");
			expect(retrieved?.sessionId).toBe("session-1");
		});
	});

	describe("getActiveSessionByUser", () => {
		it("should return null for user with no sessions", () => {
			const session = getActiveSessionByUser("nonexistent-user");
			expect(session).toBeNull();
		});

		it("should return most recent session for user", () => {
			const now = Date.now();
			const oldSession = createTestSession({
				sessionId: "old-session",
				discordUserId: "user-1",
				lastInteractionAt: now - 10000,
			});
			const newSession = createTestSession({
				sessionId: "new-session",
				discordUserId: "user-1",
				lastInteractionAt: now,
			});

			createSession(oldSession);
			createSession(newSession);

			const retrieved = getActiveSessionByUser("user-1");
			expect(retrieved?.sessionId).toBe("new-session");
		});
	});

	describe("updateSession", () => {
		it("should update session fields", () => {
			const session = createTestSession();
			createSession(session);

			session.currentNodeId = "decision_2";
			session.accumulatedCoins = 300;
			session.choicesPath = ["intro", "choiceX"];
			session.lastInteractionAt = Date.now() + 1000;
			updateSession(session);

			const retrieved = getSession(session.sessionId);
			expect(retrieved?.currentNodeId).toBe("decision_2");
			expect(retrieved?.accumulatedCoins).toBe(300);
			expect(retrieved?.choicesPath).toEqual(["intro", "choiceX"]);
		});
	});

	describe("deleteSession", () => {
		it("should delete a session", () => {
			const session = createTestSession();
			createSession(session);

			deleteSession(session.sessionId);

			const retrieved = getSession(session.sessionId);
			expect(retrieved).toBeNull();
		});

		it("should not affect other sessions", () => {
			const session1 = createTestSession({ sessionId: "session-1" });
			const session2 = createTestSession({ sessionId: "session-2" });
			createSession(session1);
			createSession(session2);

			deleteSession("session-1");

			expect(getSession("session-1")).toBeNull();
			expect(getSession("session-2")).not.toBeNull();
		});
	});

	describe("deleteUserSessions", () => {
		it("should delete all sessions for a user", () => {
			const session1 = createTestSession({ sessionId: "s1", discordUserId: "user-1" });
			const session2 = createTestSession({ sessionId: "s2", discordUserId: "user-1" });
			const session3 = createTestSession({ sessionId: "s3", discordUserId: "user-2" });
			createSession(session1);
			createSession(session2);
			createSession(session3);

			deleteUserSessions("user-1");

			expect(getSession("s1")).toBeNull();
			expect(getSession("s2")).toBeNull();
			expect(getSession("s3")).not.toBeNull();
		});
	});

	describe("getAllActiveSessions", () => {
		it("should return empty array when no sessions", () => {
			const sessions = getAllActiveSessions();
			expect(sessions).toEqual([]);
		});

		it("should return all sessions", () => {
			createSession(createTestSession({ sessionId: "s1" }));
			createSession(createTestSession({ sessionId: "s2" }));
			createSession(createTestSession({ sessionId: "s3" }));

			const sessions = getAllActiveSessions();
			expect(sessions.length).toBe(3);
		});
	});

	describe("cleanupExpiredSessions", () => {
		it("should delete sessions older than maxAge", () => {
			const now = Date.now();
			const oldSession = createTestSession({
				sessionId: "old",
				lastInteractionAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
			});
			const newSession = createTestSession({
				sessionId: "new",
				lastInteractionAt: now,
			});
			createSession(oldSession);
			createSession(newSession);

			const deleted = cleanupExpiredSessions(60 * 60 * 1000); // 1 hour max age
			expect(deleted).toBe(1);

			expect(getSession("old")).toBeNull();
			expect(getSession("new")).not.toBeNull();
		});

		it("should return count of deleted sessions", () => {
			const now = Date.now();
			const veryOld = now - 48 * 60 * 60 * 1000; // 48 hours ago

			createSession(createTestSession({ sessionId: "s1", lastInteractionAt: veryOld }));
			createSession(createTestSession({ sessionId: "s2", lastInteractionAt: veryOld }));
			createSession(createTestSession({ sessionId: "s3", lastInteractionAt: now }));

			const deleted = cleanupExpiredSessions(24 * 60 * 60 * 1000); // 24 hours max age
			expect(deleted).toBe(2);
		});
	});

	describe("hasActiveSession", () => {
		it("should return false for user with no sessions", () => {
			expect(hasActiveSession("nonexistent")).toBe(false);
		});

		it("should return true for user with session", () => {
			createSession(createTestSession({ discordUserId: "user-1" }));
			expect(hasActiveSession("user-1")).toBe(true);
		});
	});

	describe("getSessionByMessage", () => {
		it("should return null for non-existent message", () => {
			const session = getSessionByMessage("nonexistent-msg");
			expect(session).toBeNull();
		});

		it("should return session by message ID", () => {
			const session = createTestSession({ messageId: "msg-12345" });
			createSession(session);

			const retrieved = getSessionByMessage("msg-12345");
			expect(retrieved).not.toBeNull();
			expect(retrieved?.sessionId).toBe(session.sessionId);
		});
	});

	describe("choicesPath JSON serialization", () => {
		it("should correctly serialize and deserialize empty array", () => {
			const session = createTestSession({ choicesPath: [] });
			createSession(session);

			const retrieved = getSession(session.sessionId);
			expect(retrieved?.choicesPath).toEqual([]);
		});

		it("should correctly serialize and deserialize complex path", () => {
			const complexPath = [
				"intro",
				"choiceX",
				"success",
				"choiceY",
				"fail",
				"choiceX",
				"success",
				"terminal",
			];
			const session = createTestSession({ choicesPath: complexPath });
			createSession(session);

			const retrieved = getSession(session.sessionId);
			expect(retrieved?.choicesPath).toEqual(complexPath);
		});
	});

	describe("negative coins handling", () => {
		it("should handle negative accumulated coins", () => {
			const session = createTestSession({ accumulatedCoins: -500 });
			createSession(session);

			const retrieved = getSession(session.sessionId);
			expect(retrieved?.accumulatedCoins).toBe(-500);
		});

		it("should update to negative coins correctly", () => {
			const session = createTestSession({ accumulatedCoins: 100 });
			createSession(session);

			session.accumulatedCoins = -200;
			updateSession(session);

			const retrieved = getSession(session.sessionId);
			expect(retrieved?.accumulatedCoins).toBe(-200);
		});
	});
});
