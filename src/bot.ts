import {Client, Events, GatewayIntentBits, MessageFlags} from "discord.js";
import { handleAchievements } from "./handlers/handleAchievements.ts";
import { handleActivityPoints, trackCommandUsage } from "./handlers/handleActivityPoints.ts";
import { handleAntibotRooms } from "./handlers/handleAntibotRooms.ts";
import { handleChangelog } from "./handlers/handleChangelog.ts";
import { handleCommandsForRoom } from "./handlers/handleCommandsForRoom.ts";
import { handleMediaForum } from "./handlers/handleMediaForum.ts";
import { handleMessageLogging } from "./handlers/handleMessageLogging.ts";
import { handleMessageModeration } from "./handlers/handleMessageModeration.ts";
import { handleNewsEmbeds } from "./handlers/handleNewsEmbeds.ts";
import { handleRulesVerification } from "./handlers/handleRulesVerification.ts";
import { handleSendingEmbedMessages } from "./handlers/handleSendingEmbedMessages.ts";
import { handleStreamingNotifications } from "./handlers/handleStreamingNotifications.ts";
import { handleTicketSystem } from "./handlers/handleTicketSystem.ts";
import { handleVirtualVoiceChannels } from "./handlers/handleVirtualVoiceChannels.ts";
import { handleVoiceConnections } from "./handlers/handleVoiceConnections.ts";
import { handleWarningSystem } from "./handlers/handleWarningSystem.ts";
import { initStoryInteractions } from "./handlers/handleStoryInteractions.ts";
import { ensureUserRegistered, reportError } from "./util";
import { getCommand, registerCommands } from "./util/commands.ts";
import { createLogger, setLoggerClient } from "./util/logger.ts";

const log = createLogger("Bot");

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
	],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async (readyClient) => {
	log("info", `Ready! Logged in as ${readyClient.user.tag}`);
	log("info", "Available guilds:", readyClient.guilds.cache.map((guild) => guild.name).join(", "));

	// Initialize logger with Discord client for channel logging
	setLoggerClient(readyClient);

	// Register commands for all guilds
	readyClient.guilds.cache.forEach((guild) => {
		void registerCommands(guild);
	});

	// Initialize all handlers and wait for them to complete
	log("info", "Initializing handlers...");

	// Initialize synchronous handlers first
	initStoryInteractions(readyClient);

	await Promise.all([
		handleChangelog(readyClient),
		handleVirtualVoiceChannels(readyClient),
		handleRulesVerification(readyClient),
		handleWarningSystem(readyClient),
		handleAntibotRooms(readyClient),
		handleMediaForum(readyClient),
		handleMessageLogging(readyClient),
		handleMessageModeration(readyClient),
		handleAchievements(readyClient),
		handleActivityPoints(readyClient),
		handleSendingEmbedMessages(readyClient),
		handleNewsEmbeds(readyClient),
		handleStreamingNotifications(readyClient),
		handleCommandsForRoom(readyClient),
		handleVoiceConnections(readyClient),
		handleTicketSystem(readyClient),
	]);
	log("info", "All handlers initialized successfully");

	// Heartbeat monitor - check if gateway is alive every 5 minutes
	setInterval(() => {
		const ping = readyClient.ping;
		if (ping === null || ping === -1) {
			log("error", `Gateway heartbeat failed (ping: ${ping}), forcing restart...`);
			process.exit(1); // Let Docker restart the container
		}
		log("debug", `Gateway heartbeat OK, ping: ${ping}ms`);
	}, 5 * 60 * 1000);

	// Notify PM2 that the bot is ready (if running under PM2)
	if (process.send) {
		process.send('ready');
		log("info", "Sent ready signal to PM2");
	}
});

client.on(Events.Warn, async (warn) => {
	if (warn == null) {
		log("warn", "Discord.js Warn event triggered with null/undefined warning");
		return;
	}
	log("warn", "Discord.js Warning:", warn);
});

client.on(Events.Error, async (error) => {
	if (error == null) {
		log("error", "Discord.js Error event triggered with null/undefined error");
		return;
	}

	// Skip reporting InteractionAlreadyReplied errors - these are handled in handleStoryInteractions
	const isInteractionAlreadyReplied = error.name === "InteractionAlreadyReplied" ||
		error.message?.includes("reply to this interaction has already been sent");

	if (isInteractionAlreadyReplied) {
		log("debug", "Suppressed InteractionAlreadyReplied error (handled by story system)");
		return;
	}

	log("error", "Discord.js Error:", {
		message: error.message,
		name: error.name,
		stack: error.stack,
	});

	// Report critical errors to bot-info channel in all guilds
	await Promise.all(
		[...client.guilds.cache.values()].map(async (guild) => {
			try {
				await reportError(guild, "Discord.js Client Error", error.message, {
					errorName: error.name,
					stack: error.stack?.substring(0, 1000), // Limit stack trace length
				});
			} catch (reportErr) {
				log("error", "Failed to report error to guild:", reportErr);
			}
		})
	);
});

// Register commands per each guild and when bot is added to a guild
client.on(Events.GuildCreate, async (guild) => {
	log("info", `Joined a new guild: ${guild.name} (ID: ${guild.id})`);
	void registerCommands(guild);
});

client.on(Events.GuildDelete, async (guild) => {
	log("info", `Left a guild: ${guild.name} (ID: ${guild.id})`);
});

// Gateway connection monitoring
client.on(Events.Invalidated, () => {
	log("error", "Client session invalidated, forcing restart...");
	process.exit(1); // Let Docker restart the container
});

// Debug event to catch WebSocket lifecycle messages
client.on(Events.Debug, (message) => {
	// Only log WebSocket-related debug messages
	if (message.includes("[WS]") || message.includes("Heartbeat")) {
		log("debug", message);
	}
});

// Handle commands
client.on(Events.InteractionCreate, async (interaction) => {
	// Sometimes the interaction is null/undefined, catch it here
	if (interaction == null) return;

	if (!interaction.isChatInputCommand()) return;
	if (!interaction.guild) return;

	const command = getCommand(interaction.commandName);
	if (!command) return;

	try {
		// Before executing the command, ensure the user is registered
		const result = await ensureUserRegistered(interaction.guild, interaction.user.id);
		if (!result.success) {
			log("error", `Failed to verify user ${interaction.user.id}:`, result.error);
			// Send error message to user
			const errorContent = `❌ Nepodařilo se ověřit uživatele: ${result.error}`;
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply({ content: errorContent }).catch((err: unknown) => {
					log("error", "Failed to send user verification error message:", err);
				});
			} else {
				await interaction.reply({ content: errorContent, flags: MessageFlags.Ephemeral }).catch((err: unknown) => {
					log("error", "Failed to send user verification error message:", err);
				});
			}
			return;
		}

		await command.execute({
			interaction,
			dbUser: result.user,
		});

		// Track command usage for activity points (fire and forget, don't block command execution)
		void trackCommandUsage(interaction.user.id, result.user.id);
	} catch (error) {
		log("error", `Error executing command ${interaction.commandName}:`, error);

		// Attempt to send error message to user
		try {
			const errorContent = "❌ Při provádění příkazu došlo k chybě. Zkuste to prosím později.";
			if (interaction.deferred || interaction.replied) {
				await interaction.editReply({ content: errorContent });
			} else {
				await interaction.reply({ content: errorContent, flags: MessageFlags.Ephemeral });
			}
		} catch (replyError) {
			log("error", "Failed to send error message to user:", replyError);
		}
	}
});

// Global error handlers
process.on('unhandledRejection', async (reason, promise) => {
	if (reason == null) {
		log("error", "Unhandled promise rejection with null/undefined reason", { promise });
		return;
	}

	// Convert reason to string safely
	const reasonString = reason instanceof Error
		? reason.message
		: typeof reason === 'string'
			? reason
			: JSON.stringify(reason);

	const error = reason instanceof Error ? reason : new Error(reasonString);

	log("error", "Unhandled promise rejection:", {
		message: error.message,
		name: error.name,
		stack: error.stack,
		reason: reasonString,
	});

	// Report to all guilds if client is ready
	if (client.isReady()) {
		await Promise.all(
			[...client.guilds.cache.values()].map(async (guild) => {
				try {
					await reportError(guild, "Unhandled Promise Rejection", error.message, {
						errorName: error.name,
						stack: error.stack?.substring(0, 1000),
						reason: reasonString.substring(0, 500),
					});
				} catch (reportErr) {
					log("error", "Failed to report unhandled rejection to guild:", reportErr);
				}
			})
		);
	}
});

process.on('uncaughtException', async (error, origin) => {
	if (error == null) {
		log("error", "Uncaught exception with null/undefined error", { origin });
		process.exit(1);
		return;
	}

	// Silently ignore harmless discord.js packet parsing error
	const isDiscordPacketError = error.message?.includes("evaluating 'packet.t'") ||
		error.message?.includes("evaluating 'packet.d'");
	if (isDiscordPacketError) {
		return;
	}

	log("error", "Uncaught exception:", {
		message: error.message,
		name: error.name,
		stack: error.stack,
		origin,
	});

	// Report to all guilds if client is ready
	if (client.isReady()) {
		const reportPromises = Array.from(client.guilds.cache.values()).map(async (guild) => {
			try {
				await reportError(
					guild,
					"Uncaught Exception",
					error.message,
					{
						errorName: error.name,
						stack: error.stack?.substring(0, 1000),
						origin,
					}
				);
			} catch (reportErr) {
				log("error", "Failed to report uncaught exception to guild:", reportErr);
			}
		});

		// Wait for all error reports to complete (with timeout)
		await Promise.race([
			Promise.all(reportPromises),
			new Promise((resolve) => setTimeout(resolve, 3000)) // 3 second timeout
		]);
	}

	// Exit process for uncaught exceptions after reporting
	log("error", "Exiting process due to uncaught exception");
	process.exit(1);
});

// Handle process termination signals
process.on('SIGINT', async () => {
	log("info", "Received SIGINT signal, shutting down gracefully...");
	try {
		await client.destroy();
		log("info", "Discord client destroyed successfully");
	} catch (error) {
		log("error", "Error during client cleanup:", error);
	}
	process.exit(0);
});

process.on('SIGTERM', async () => {
	log("info", "Received SIGTERM signal, shutting down gracefully...");
	try {
		await client.destroy();
		log("info", "Discord client destroyed successfully");
	} catch (error) {
		log("error", "Error during client cleanup:", error);
	}
	process.exit(0);
});

// Log in to Discord with your client's token
void client.login(process.env.DISCORD_TOKEN);
