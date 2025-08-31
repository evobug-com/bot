// Type exports

// Re-export commonly used Discord.js types for convenience
export {
	ChatInputCommandInteraction,
	Client,
	Collection,
	Events,
	GatewayIntentBits,
	Partials,
} from "discord.js";

// Bot utilities
export * from "./bot/embed-builder.js";
export * from "./bot/time.js";
export * from "./bot/translations.js";
export * from "./config/channels.js";
// Configuration
export * from "./config/roles.js";
export * from "./utils/channelManager.js";
// Utility functions
export * from "./utils/ensure-registered.js";
export * from "./utils/roleManager.js";
