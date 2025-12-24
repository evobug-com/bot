import { Database } from "bun:sqlite";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

// Database file location (in project root/data directory)
const DB_PATH = join(import.meta.dir, "../../../data/work-settings.sqlite");

// Ensure data directory exists
const dataDir = join(import.meta.dir, "../../../data");
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH, { create: true });

// Create table if not exists - single row for global settings
db.run(`
	CREATE TABLE IF NOT EXISTS work_settings (
		id INTEGER PRIMARY KEY CHECK (id = 1),
		ai_story_enabled INTEGER NOT NULL DEFAULT 0,
		story_chance_percent INTEGER NOT NULL DEFAULT 20,
		updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`);

// Ensure default row exists
db.run(`
	INSERT OR IGNORE INTO work_settings (id, ai_story_enabled, story_chance_percent)
	VALUES (1, 0, 20)
`);

export interface WorkSettings {
	aiStoryEnabled: boolean;
	storyChancePercent: number;
}

/**
 * Get global work settings
 */
export function getWorkSettings(): WorkSettings {
	const row = db
		.query<{ ai_story_enabled: number; story_chance_percent: number }, []>(
			"SELECT ai_story_enabled, story_chance_percent FROM work_settings WHERE id = 1",
		)
		.get();

	if (!row) {
		// Return defaults (shouldn't happen due to INSERT OR IGNORE above)
		return {
			aiStoryEnabled: false,
			storyChancePercent: 20,
		};
	}

	return {
		aiStoryEnabled: row.ai_story_enabled === 1,
		storyChancePercent: row.story_chance_percent,
	};
}

/**
 * Set AI story enabled/disabled
 */
export function setAIStoryEnabled(enabled: boolean): void {
	db.run(
		`UPDATE work_settings SET ai_story_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
		[enabled ? 1 : 0],
	);
}

/**
 * Set story chance percentage (0-100)
 */
export function setStoryChancePercent(percent: number): void {
	const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
	db.run(
		`UPDATE work_settings SET story_chance_percent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
		[clampedPercent],
	);
}

/**
 * Check if AI story is enabled
 */
export function isAIStoryEnabled(): boolean {
	return getWorkSettings().aiStoryEnabled;
}

/**
 * Get story chance percent
 */
export function getStoryChancePercent(): number {
	return getWorkSettings().storyChancePercent;
}
