/**
 * Story Session Manager
 *
 * Provides in-memory caching with SQLite persistence for story sessions.
 * Sessions are loaded from SQLite on startup and cached in memory for fast access.
 */

import { randomUUID } from "node:crypto";
import type { StorySession } from "../../util/storytelling/types";
import * as storage from "./storage";

// In-memory cache for fast access
const sessionCache = new Map<string, StorySession>();

// Index by Discord user ID for quick lookups
const userSessionIndex = new Map<string, string>();

// Index by message ID for button interactions
const messageSessionIndex = new Map<string, string>();

/**
 * Initialize the session manager - load existing sessions from SQLite
 * Should be called on bot startup
 */
export function initSessionManager(): void {
	// Clean up expired sessions first
	const cleaned = storage.cleanupExpiredSessions();
	if (cleaned > 0) {
		console.log(`[StorySession] Cleaned up ${cleaned} expired sessions`);
	}

	// Load all active sessions into memory
	const sessions = storage.getAllActiveSessions();
	for (const session of sessions) {
		sessionCache.set(session.sessionId, session);
		userSessionIndex.set(session.discordUserId, session.sessionId);
		messageSessionIndex.set(session.messageId, session.sessionId);
	}

	console.log(`[StorySession] Loaded ${sessions.length} active sessions`);
}

/**
 * Create a new story session
 */
export function createSession(params: {
	discordUserId: string;
	dbUserId: number;
	storyId: string;
	startNodeId: string;
	messageId: string;
	channelId: string;
	guildId: string;
	userLevel: number;
}): StorySession {
	// Delete any existing session for this user
	const existingSessionId = userSessionIndex.get(params.discordUserId);
	if (existingSessionId) {
		deleteSession(existingSessionId);
	}

	const now = Date.now();
	const session: StorySession = {
		sessionId: randomUUID(),
		discordUserId: params.discordUserId,
		dbUserId: params.dbUserId,
		storyId: params.storyId,
		currentNodeId: params.startNodeId,
		accumulatedCoins: 0,
		choicesPath: [],
		choiceHistory: [],
		storyJournal: [],
		startedAt: now,
		lastInteractionAt: now,
		messageId: params.messageId,
		channelId: params.channelId,
		guildId: params.guildId,
		userLevel: params.userLevel,
		resolvedNodeValues: {},
	};

	// Save to SQLite
	storage.createSession(session);

	// Update cache
	sessionCache.set(session.sessionId, session);
	userSessionIndex.set(session.discordUserId, session.sessionId);
	messageSessionIndex.set(session.messageId, session.sessionId);

	return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): StorySession | null {
	// Check cache first
	const cached = sessionCache.get(sessionId);
	if (cached) {
		return cached;
	}

	// Fall back to SQLite
	const session = storage.getSession(sessionId);
	if (session) {
		// Update cache
		sessionCache.set(session.sessionId, session);
		userSessionIndex.set(session.discordUserId, session.sessionId);
		messageSessionIndex.set(session.messageId, session.sessionId);
	}

	return session;
}

/**
 * Get active session for a Discord user
 */
export function getSessionByUser(discordUserId: string): StorySession | null {
	// Check index first
	const sessionId = userSessionIndex.get(discordUserId);
	if (sessionId) {
		return sessionCache.get(sessionId) ?? null;
	}

	// Fall back to SQLite
	const session = storage.getActiveSessionByUser(discordUserId);
	if (session) {
		// Update cache
		sessionCache.set(session.sessionId, session);
		userSessionIndex.set(session.discordUserId, session.sessionId);
		messageSessionIndex.set(session.messageId, session.sessionId);
	}

	return session;
}

/**
 * Get session by message ID (for button interactions)
 */
export function getSessionByMessage(messageId: string): StorySession | null {
	// Check index first
	const sessionId = messageSessionIndex.get(messageId);
	if (sessionId) {
		return sessionCache.get(sessionId) ?? null;
	}

	// Fall back to SQLite
	const session = storage.getSessionByMessage(messageId);
	if (session) {
		// Update cache
		sessionCache.set(session.sessionId, session);
		userSessionIndex.set(session.discordUserId, session.sessionId);
		messageSessionIndex.set(session.messageId, session.sessionId);
	}

	return session;
}

/**
 * Update session state
 */
export function updateSession(session: StorySession): void {
	// Update last interaction time
	session.lastInteractionAt = Date.now();

	// Save to SQLite
	storage.updateSession(session);

	// Update cache
	sessionCache.set(session.sessionId, session);
}

/**
 * Add a choice to the session's path and update node
 */
export function advanceSession(
	session: StorySession,
	choice: string,
	nextNodeId: string,
	coinsChange: number,
): void {
	session.choicesPath.push(choice);
	session.currentNodeId = nextNodeId;
	session.accumulatedCoins += coinsChange;
	session.lastInteractionAt = Date.now();

	// Save to SQLite
	storage.updateSession(session);

	// Update cache
	sessionCache.set(session.sessionId, session);
}

/**
 * Delete a session (when story completes or is cancelled)
 */
export function deleteSession(sessionId: string): void {
	const session = sessionCache.get(sessionId);

	// Remove from SQLite
	storage.deleteSession(sessionId);

	// Remove from cache and indexes
	sessionCache.delete(sessionId);
	if (session) {
		userSessionIndex.delete(session.discordUserId);
		messageSessionIndex.delete(session.messageId);
	}
}

/**
 * Check if user has an active session
 */
export function hasActiveSession(discordUserId: string): boolean {
	return userSessionIndex.has(discordUserId);
}

/**
 * Get all active sessions (for debugging/admin)
 */
export function getAllSessions(): StorySession[] {
	return Array.from(sessionCache.values());
}

/**
 * Get session count
 */
export function getSessionCount(): number {
	return sessionCache.size;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(maxAgeMs?: number): number {
	const cleaned = storage.cleanupExpiredSessions(maxAgeMs);

	// Also clean up memory cache
	const now = Date.now();
	const maxAge = maxAgeMs ?? 24 * 60 * 60 * 1000;
	const cutoff = now - maxAge;

	for (const [sessionId, session] of sessionCache) {
		if (session.lastInteractionAt < cutoff) {
			sessionCache.delete(sessionId);
			userSessionIndex.delete(session.discordUserId);
			messageSessionIndex.delete(session.messageId);
		}
	}

	return cleaned;
}

// Re-export types
export type { StorySession };
