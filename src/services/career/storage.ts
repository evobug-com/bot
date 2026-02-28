import { Database } from "bun:sqlite";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { Career, type CareerType } from "./types";

// Database file location (in project root/data directory)
const DB_PATH = join(import.meta.dir, "../../../data/career.sqlite");

// Ensure data directory exists
const dataDir = join(import.meta.dir, "../../../data");
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH, { create: true });

// Create table if not exists
db.run(`
	CREATE TABLE IF NOT EXISTS user_careers (
		discord_id TEXT PRIMARY KEY,
		career TEXT NOT NULL DEFAULT 'clerk',
		selected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	)
`);

export interface UserCareer {
	discordId: string;
	career: CareerType;
	selectedAt: Date;
	updatedAt: Date;
}

/**
 * Valid career values for database validation
 */
const VALID_CAREERS = new Set(Object.values(Career));

function isValidCareer(value: string): value is CareerType {
	return VALID_CAREERS.has(value as CareerType);
}

/**
 * Get user's career by Discord ID.
 * Returns default career (clerk) if user hasn't selected one.
 */
export function getUserCareer(discordId: string): UserCareer {
	const row = db
		.query<{ discord_id: string; career: string; selected_at: string; updated_at: string }, [string]>(
			"SELECT discord_id, career, selected_at, updated_at FROM user_careers WHERE discord_id = ?",
		)
		.get(discordId);

	if (!row) {
		// Return default career
		const now = new Date();
		return {
			discordId,
			career: Career.CLERK, // Default career
			selectedAt: now,
			updatedAt: now,
		};
	}

	// Validate career value from database
	const career = isValidCareer(row.career) ? row.career : Career.CLERK;

	return {
		discordId: row.discord_id,
		career,
		selectedAt: new Date(row.selected_at),
		updatedAt: new Date(row.updated_at),
	};
}

/**
 * Get just the career type for a user (convenience function).
 */
export function getUserCareerType(discordId: string): CareerType {
	return getUserCareer(discordId).career;
}

/**
 * Set user's career.
 * First selection is free, subsequent changes may have restrictions.
 */
export function setUserCareer(discordId: string, career: CareerType): void {
	// Runtime validation (career is already typed, but double-check for safety)
	if (!VALID_CAREERS.has(career)) {
		throw new Error(`Invalid career type: ${String(career)}`);
	}

	db.run(
		`
		INSERT INTO user_careers (discord_id, career, selected_at, updated_at)
		VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT(discord_id) DO UPDATE SET
			career = excluded.career,
			updated_at = CURRENT_TIMESTAMP
		`,
		[discordId, career],
	);
}

/**
 * Check if user has explicitly selected a career (not using default).
 */
export function hasSelectedCareer(discordId: string): boolean {
	const row = db
		.query<{ count: number }, [string]>(
			"SELECT COUNT(*) as count FROM user_careers WHERE discord_id = ?",
		)
		.get(discordId);

	return (row?.count ?? 0) > 0;
}

/**
 * Get career statistics (for admin/analytics).
 */
export function getCareerStats(): Record<CareerType, number> {
	const rows = db
		.query<{ career: string; count: number }, []>(
			"SELECT career, COUNT(*) as count FROM user_careers GROUP BY career",
		)
		.all();

	const stats: Record<CareerType, number> = {
		[Career.CLERK]: 0,
		[Career.DEVELOPER]: 0,
		[Career.SALESPERSON]: 0,
		[Career.ADVENTURER]: 0,
		[Career.SHADOW]: 0,
	};

	for (const row of rows) {
		if (isValidCareer(row.career)) {
			stats[row.career] = row.count;
		}
	}

	return stats;
}
