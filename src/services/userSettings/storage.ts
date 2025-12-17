import { Database } from "bun:sqlite";
import { join } from "node:path";

// Database file location (in project root/data directory)
const DB_PATH = join(import.meta.dir, "../../../data/user-settings.sqlite");

// Ensure data directory exists
import { mkdirSync, existsSync } from "node:fs";
const dataDir = join(import.meta.dir, "../../../data");
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH, { create: true });

// Create table if not exists
db.run(`
	CREATE TABLE IF NOT EXISTS user_settings (
		discord_id TEXT PRIMARY KEY,
		story_work_enabled INTEGER NOT NULL DEFAULT 1,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`);

export interface UserSettings {
	discordId: string;
	storyWorkEnabled: boolean;
}

/**
 * Get user settings by Discord ID
 * Returns default settings if user has no custom settings
 */
export function getUserSettings(discordId: string): UserSettings {
	const row = db
		.query<{ discord_id: string; story_work_enabled: number }, [string]>(
			"SELECT discord_id, story_work_enabled FROM user_settings WHERE discord_id = ?",
		)
		.get(discordId);

	if (!row) {
		// Return defaults
		return {
			discordId,
			storyWorkEnabled: true, // Default: stories enabled
		};
	}

	return {
		discordId: row.discord_id,
		storyWorkEnabled: row.story_work_enabled === 1,
	};
}

/**
 * Update user setting for story work
 */
export function setStoryWorkEnabled(discordId: string, enabled: boolean): void {
	db.run(
		`
		INSERT INTO user_settings (discord_id, story_work_enabled, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(discord_id) DO UPDATE SET
			story_work_enabled = excluded.story_work_enabled,
			updated_at = CURRENT_TIMESTAMP
		`,
		[discordId, enabled ? 1 : 0],
	);
}

/**
 * Check if user has story work enabled
 * Convenience function for quick checks
 */
export function isStoryWorkEnabled(discordId: string): boolean {
	return getUserSettings(discordId).storyWorkEnabled;
}
