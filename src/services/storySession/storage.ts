/**
 * Story Session SQLite Storage
 *
 * Provides persistence for active story sessions across bot restarts.
 * Uses the same pattern as userSettings storage.
 */

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { StorySession } from "../../util/storytelling/types";

// Database file location (in project root/data directory)
const DB_PATH = join(import.meta.dir, "../../../data/story-sessions.sqlite");

// Ensure data directory exists
const dataDir = join(import.meta.dir, "../../../data");
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH, { create: true });

// Create table if not exists
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

// Create index on discord_user_id for fast lookups
db.run(`
	CREATE INDEX IF NOT EXISTS idx_story_sessions_discord_user
	ON story_sessions(discord_user_id)
`);

// Create index on last_interaction_at for cleanup queries
db.run(`
	CREATE INDEX IF NOT EXISTS idx_story_sessions_last_interaction
	ON story_sessions(last_interaction_at)
`);

/**
 * Database row type
 */
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

/**
 * Convert database row to StorySession
 */
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

/**
 * Create a new story session
 */
export function createSession(session: StorySession): void {
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

/**
 * Get a session by session ID
 */
export function getSession(sessionId: string): StorySession | null {
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

/**
 * Get active session for a Discord user
 * Returns the most recent active session if multiple exist
 */
export function getActiveSessionByUser(
	discordUserId: string,
): StorySession | null {
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

/**
 * Update session state (called on every interaction)
 */
export function updateSession(session: StorySession): void {
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

/**
 * Delete a session (called when story completes or is cancelled)
 */
export function deleteSession(sessionId: string): void {
	db.run("DELETE FROM story_sessions WHERE session_id = ?", [sessionId]);
}

/**
 * Delete all sessions for a user (for cleanup)
 */
export function deleteUserSessions(discordUserId: string): void {
	db.run("DELETE FROM story_sessions WHERE discord_user_id = ?", [
		discordUserId,
	]);
}

/**
 * Get all active sessions (for bot startup recovery)
 */
export function getAllActiveSessions(): StorySession[] {
	const rows = db
		.query<StorySessionRow, []>("SELECT * FROM story_sessions")
		.all();

	return rows.map(rowToSession);
}

/**
 * Clean up expired sessions (older than maxAgeMs)
 * Default: 24 hours
 */
export function cleanupExpiredSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
	const cutoffTime = Date.now() - maxAgeMs;

	const result = db.run(
		"DELETE FROM story_sessions WHERE last_interaction_at < ?",
		[cutoffTime],
	);

	return result.changes;
}

/**
 * Check if user has an active session
 */
export function hasActiveSession(discordUserId: string): boolean {
	const row = db
		.query<{ count: number }, [string]>(
			"SELECT COUNT(*) as count FROM story_sessions WHERE discord_user_id = ?",
		)
		.get(discordUserId);

	return row !== null && row.count > 0;
}

/**
 * Get session by message ID (for button interactions)
 */
export function getSessionByMessage(messageId: string): StorySession | null {
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
