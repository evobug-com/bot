import type { Client } from "discord.js";

/**
 * Discord client instance for logging to channels
 * Set this using setLoggerClient() after the client is ready
 */
let discordClient: Client<true> | null = null;

/**
 * Flag to prevent infinite loops when logging Discord send errors
 */
let isLoggingToDiscord = false;

/**
 * Set the Discord client for channel logging
 * Call this after the client is ready
 */
export const setLoggerClient = (client: Client<true>) => {
	discordClient = client;
};

/**
 * Send log to Discord BOT_LOG channels
 * Only logs warnings and errors
 * Uses the existing reportError utility for consistency
 */
const logToDiscord = async (module: string, level: string, message: string, args: unknown[]) => {
	// Only log warnings and errors to Discord
	if (level !== "warn" && level !== "error") return;

	// Don't log to Discord if we're already logging (prevent infinite loops)
	if (isLoggingToDiscord) return;

	// Check if Discord client is available and ready
	if (!discordClient?.isReady()) return;

	isLoggingToDiscord = true;

	try {
		// Dynamically import to avoid circular dependencies
		const { reportError } = await import("./config/roles.js");

		// Format the error type with emoji and level
		const emoji = level === "error" ? "🔴" : "⚠️";
		const errorType = `${emoji} ${level.toUpperCase()} [${module}]`;

		// Prepare details object if args are present
		const details = args.length > 0 ? { args } : undefined;

		// Use the existing reportError function for all guilds
		for (const guild of discordClient.guilds.cache.values()) {
			try {
				await reportError(guild, errorType, message, details);
			} catch (error) {
				// Silently fail for individual guilds to prevent spam
				// Don't log this error to avoid infinite loops
				console.error(`[Logger] Failed to send log to guild ${guild.name}:`, error);
			}
		}
	} catch (error) {
		// Silently fail to prevent infinite loops
		console.error("[Logger] Failed to send log to Discord:", error);
	} finally {
		isLoggingToDiscord = false;
	}
};

export const createLogger = (module: string) => {
	return (level: string, message: string, ...args: unknown[]) => {
		// Always log to console
		if (process.env.NODE_ENV === "development" && level === "debug") {
			console.log(`[${module}] [${level}] ${message}`, ...args);
		} else if (level !== "debug") {
			console.log(`[${module}] [${level}] ${message}`, ...args);
		}

		// Asynchronously log to Discord (don't await to avoid blocking)
		void logToDiscord(module, level, message, args);
	};
};
