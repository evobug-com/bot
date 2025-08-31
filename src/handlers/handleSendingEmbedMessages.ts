/**
 * Embed Message Handler
 *
 * This module handles the creation and sending of rich embed messages through modal interactions.
 * It allows administrators to send custom formatted embed messages to any channel by submitting
 * JSON data through a Discord modal.
 *
 * Features:
 * - Parse JSON input from modal submissions
 * - Support for single embeds or multiple embeds
 * - Support for full message options (content + embeds)
 * - Error handling with user feedback
 * - Ephemeral responses for privacy
 *
 * JSON Input Formats:
 * 1. Single embed object: { "title": "...", "description": "..." }
 * 2. Message with embeds: { "embeds": [{ ... }], "content": "..." }
 */

import {
	type Client,
	EmbedBuilder,
	Events,
	type Interaction,
	type MessageCreateOptions,
	MessageFlags,
	type MessagePayload,
} from "discord.js";
import { createLogger } from "../util/logger.ts";

const log = createLogger("EmbedMessages");

/**
 * Initialize the embed message handler
 * Sets up event listeners for modal interactions that create embed messages
 *
 * @param client - Discord client instance
 */
export const handleSendingEmbedMessages = async (client: Client<true>) => {
	client.on(Events.InteractionCreate, handleInteractionCreate);
};

/**
 * Handle interaction create events for embed message modals
 *
 * Processes modal submissions containing JSON data and sends the resulting
 * embed messages to the channel where the interaction occurred.
 *
 * Triggers:
 * - Modal submission with customId 'sendEmbedModal'
 *
 * Requirements:
 * - Must be in a guild
 * - Must have a valid channel
 * - Channel must support sending messages
 *
 * @param interaction - The interaction event from Discord
 */
const handleInteractionCreate = async (interaction: Interaction) => {
	const guild = interaction.guild;
	if (!guild) return;

	if (!interaction.isModalSubmit()) return;
	if (!interaction.channelId) return;

	if (interaction.customId === "sendEmbedModal") {
		const channel = guild.channels.cache.get(interaction.channelId);
		if (!channel) return;
		if (!channel.isSendable()) return;

		const json = interaction.fields.getTextInputValue("embedContent");

		try {
			await channel.send(parseJsonData(json));
			await interaction.reply({
				content: "Embed message sent successfully!",
				flags: MessageFlags.Ephemeral,
			});
			log("info", "Embed message sent successfully");
		} catch (error) {
			log("error", "Error sending embed message:", error);
			await interaction.reply({
				content: "Error: " + error,
				flags: MessageFlags.Ephemeral,
			});
		}
	}
};

/**
 * Parse JSON data into Discord message options
 *
 * Supports two input formats:
 * 1. Full message options with 'embeds' array property
 *    Example: { "embeds": [{ "title": "Hello" }], "content": "Message text" }
 *
 * 2. Single embed object (will be wrapped in message options)
 *    Example: { "title": "Hello", "description": "World" }
 *
 * @param json - JSON string containing embed or message data
 * @returns Formatted message options ready to send
 * @throws Error if JSON is invalid or cannot be parsed
 */
export function parseJsonData(json: string): MessageCreateOptions | MessagePayload | string {
	const parsedJson = JSON.parse(json);

	// If there is 'embeds' array, then the json message is options
	if (parsedJson.embeds && Array.isArray(parsedJson.embeds)) {
		return parsedJson;
	}

	// Otherwise we assume, it is content of a single embed message
	const embed = new EmbedBuilder(parsedJson);
	return { embeds: [embed] };
}
