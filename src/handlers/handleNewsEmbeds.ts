/**
 * News Embed Handler
 *
 * Handles creation of news embeds with AI assistance.
 * Provides preview functionality with regenerate, abort, and submit actions.
 */

import {
	ActionRowBuilder,
	type APIEmbed,
	type ButtonInteraction,
	type Client,
	DangerButtonBuilder,
	Events,
	type Interaction,
	MessageFlags,
	type ModalSubmitInteraction,
	SecondaryButtonBuilder,
	SuccessButtonBuilder,
} from "discord.js";
import { generateAiResponse } from "../util/ai.js";
import { createLogger } from "../util/logger.ts";
import { parseJsonData } from "./handleSendingEmbedMessages.js";

const log = createLogger("NewsEmbed");

interface PendingNews {
	embed: APIEmbed;
	userId: string;
	channelId: string;
	originalContent: string;
	attempts: number;
}

const pendingNews = new Map<string, PendingNews>();

/**
 * Initialize the news embed handler
 */
export const handleNewsEmbeds = async (client: Client<true>) => {
	client.on(Events.InteractionCreate, handleInteractionCreate);
};

/**
 * Handle interaction events for news embeds
 */
const handleInteractionCreate = async (interaction: Interaction) => {
	// Sometimes the interaction is null/undefined, catch it here
	if (interaction == null) return;

	const guild = interaction.guild;
	if (!guild) return;

	if (interaction.isModalSubmit() && interaction.customId === "newsModal") {
		await handleNewsModalSubmit(interaction);
	} else if (interaction.isButton()) {
		await handleNewsButton(interaction);
	}
};

/**
 * Handle news modal submission
 */
async function handleNewsModalSubmit(interaction: ModalSubmitInteraction) {
	const newsContent = interaction.components.getTextInputValue("newsContent");
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		const embed = await generateNewsEmbed(newsContent);

		if (!embed) {
			await interaction.editReply({
				content: "❌ Nepodařilo se vygenerovat novinky. Zkuste to prosím znovu.",
			});
			return;
		}

		const channelId = interaction.channelId;
		if (!channelId) {
			await interaction.editReply({
				content: "❌ Nelze určit kanál pro odeslání.",
			});
			return;
		}

		const pending: PendingNews = {
			userId: interaction.user.id,
			channelId,
			embed: embed,
			originalContent: newsContent,
			attempts: 1,
		};

		const messageId = `${interaction.user.id}_${Date.now()}`;
		pendingNews.set(messageId, pending);

		const buttons = new ActionRowBuilder().addComponents(
			new SecondaryButtonBuilder().setCustomId(`news_regenerate_${messageId}`).setLabel("🔄 Přegenerovat"),
			new DangerButtonBuilder().setCustomId(`news_abort_${messageId}`).setLabel("❌ Zrušit"),
			new SuccessButtonBuilder().setCustomId(`news_submit_${messageId}`).setLabel("✅ Odeslat"),
		);

		await interaction.editReply({
			content: "**Náhled novinek:**",
			embeds: [embed],
			components: [buttons],
		});
	} catch (error) {
		log("error", "Error handling news modal:", error);
		await interaction.editReply({
			content: "❌ Došlo k chybě při zpracování novinek.",
		});
	}
}

/**
 * Handle news button interactions
 */
async function handleNewsButton(interaction: ButtonInteraction) {
	const parts = interaction.customId.split("_");
	const action = parts[0];
	const type = parts[1];
	const messageId = parts.slice(2).join("_"); // Rejoin the rest as messageId

	if (action !== "news") return;

	const pending = messageId ? pendingNews.get(messageId) : undefined;
	if (!pending || pending.userId !== interaction.user.id) {
		await interaction.reply({
			content: "❌ Tato akce již není dostupná.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	switch (type) {
		case "regenerate":
			await handleRegenerate(interaction, messageId || "", pending);
			break;
		case "abort":
			await handleAbort(interaction, messageId || "");
			break;
		case "submit":
			await handleSubmit(interaction, messageId || "", pending);
			break;
	}
}

/**
 * Handle regenerate action
 */
async function handleRegenerate(interaction: ButtonInteraction, messageId: string, pending: PendingNews) {
	// First, disable all buttons immediately
	const disabledButtons = new ActionRowBuilder().addComponents(
		new SecondaryButtonBuilder()
			.setCustomId(`news_regenerate_${messageId}`)
			.setLabel("🔄 Přegenerování...")
			.setDisabled(true),
		new DangerButtonBuilder().setCustomId(`news_abort_${messageId}`).setLabel("❌ Zrušit").setDisabled(true),
		new SuccessButtonBuilder().setCustomId(`news_submit_${messageId}`).setLabel("✅ Odeslat").setDisabled(true),
	);

	await interaction.update({
		components: [disabledButtons],
	});

	const newEmbed = await generateNewsEmbed(
		pending.originalContent,
		`
    User doesn't like the current output and clicked on regenerate button. They expect the output to be dramatically changed.
    <current-output>
        ${JSON.stringify(pending.embed, null, 2)}
    </current-output>
    `,
	);

	if (!newEmbed) {
		await interaction.editReply({
			content: "❌ Nepodařilo se přegenerovat novinky.",
			embeds: [],
			components: [],
		});
		pendingNews.delete(messageId);
		return;
	}

	pending.embed = newEmbed;
	pending.attempts++;

	const buttons = new ActionRowBuilder().addComponents(
		new SecondaryButtonBuilder()
			.setCustomId(`news_regenerate_${messageId}`)
			.setLabel(`🔄 Přegenerovat (${pending.attempts})`)
			.setDisabled(pending.attempts >= 5),
		new DangerButtonBuilder().setCustomId(`news_abort_${messageId}`).setLabel("❌ Zrušit"),
		new SuccessButtonBuilder().setCustomId(`news_submit_${messageId}`).setLabel("✅ Odeslat"),
	);

	await interaction.editReply({
		content: `**Náhled novinek (pokus ${pending.attempts}):**`,
		embeds: [newEmbed],
		components: [buttons],
	});
}

/**
 * Handle abort action
 */
async function handleAbort(interaction: ButtonInteraction, messageId: string) {
	pendingNews.delete(messageId);

	await interaction.update({
		content: "❌ Vytváření novinek bylo zrušeno.",
		embeds: [],
		components: [],
	});
}

/**
 * Handle submit action
 */
async function handleSubmit(interaction: ButtonInteraction, messageId: string, pending: PendingNews) {
	// First, disable all buttons immediately
	const disabledButtons = new ActionRowBuilder().addComponents(
		new SecondaryButtonBuilder()
			.setCustomId(`news_regenerate_${messageId}`)
			.setLabel("🔄 Přegenerovat")
			.setDisabled(true),
		new DangerButtonBuilder().setCustomId(`news_abort_${messageId}`).setLabel("❌ Zrušit").setDisabled(true),
		new SuccessButtonBuilder().setCustomId(`news_submit_${messageId}`).setLabel("📤 Odesílání...").setDisabled(true),
	);

	await interaction.update({
		content: "**Odesílání novinek...**",
		components: [disabledButtons],
	});

	const guild = interaction.guild;
	if (!guild) {
		await interaction.editReply({
			content: "❌ Tato akce je dostupná pouze na serveru.",
			embeds: [],
			components: [],
		});
		pendingNews.delete(messageId);
		return;
	}
	const channel = guild.channels.cache.get(pending.channelId);

	if (!channel || !channel.isSendable()) {
		await interaction.editReply({
			content: "❌ Nelze odeslat do tohoto kanálu.",
			embeds: [],
			components: [],
		});
		pendingNews.delete(messageId);
		return;
	}

	try {
		await channel.send({
			embeds: [pending.embed],
		});

		await interaction.editReply({
			content: "✅ Novinky byly úspěšně odeslány!",
			embeds: [],
			components: [],
		});

		pendingNews.delete(messageId);
		log("info", "News embed sent successfully");
	} catch (error) {
		log("error", "Error sending news embed:", error);
		await interaction.editReply({
			content: "❌ Nepodařilo se odeslat novinky.",
			embeds: [],
			components: [],
		});
		pendingNews.delete(messageId);
	}
}

/**
 * Generate news embed using AI
 */
async function generateNewsEmbed(
	content: string,
	sysPrompt: string = "",
): Promise<{
	title: string;
	color: number;
	description: string;
	footer: { text: string };
}> {
	const systemTemplate = sysPrompt
		? `
<system>
${sysPrompt}
</system>
    `
		: "";

	const prompt = `You are a JSON generator. Generate ONLY raw JSON text based on the following input. This is a Discord [EMBED MESSAGE] for news/updates.
${systemTemplate}
<instructions>
CRITICAL: DO NOT ASK ANY QUESTIONS. Make all decisions automatically based on these rules.
</instructions>

<input>
${content}
</input>

<requirements>
- Title: Create a title that summarizes the changes, in Czech language (max 64 characters)
- Color: 39423 (blue hex #0099ff)
- Description: Formatted list of changes, in Czech language
- Footer text: "Allcom"
- Timestamp: Use current ISO8601 timestamp
- Do not load any files or use any external APIs
</requirements>

<fields_to_include>
- title (required): Summary title in Czech
- color (required): 39423
- description (required): Formatted changes in Czech
- footer (required): {"text": "Allcom"}
</fields_to_include>

<fields_to_omit>
- type, url, image, thumbnail, video, provider, author, fields
</fields_to_omit>

<rules>
1. Output ONLY the JSON object
2. No explanations or text before/after
3. No markdown code blocks
4. No questions or clarifications
5. Make all decisions automatically
6. Just pure JSON that starts with { and ends with }
7. If any information is unclear, make a reasonable assumption
</rules>

<example_output>
{
  "title": "Kompletní refactor!",
  "color": 39423,
  "description": "🚀 **Nové funkce**\n• Přidána možnost...\n\n🐛 **Opravy chyb**\n• Opraven problém...",
  "footer": {"text": "Allcom"}
}
</example_output>

<output_format>JSON_ONLY</output_format>
<response_mode>IMMEDIATE</response_mode>
<questions_allowed>NONE</questions_allowed>

Generate the JSON now:`;

	const response = await generateAiResponse(prompt);
	log("debug", "AI response for news embed:\n", response);

	// If one of the following fields is missing, return null: title, color, description, footer
	if (response.title == null || response.color == null || response.description == null || response.footer == null) {
		log("warn", "Missing required fields in AI response:", response);
		throw new Error("Missing required fields in AI response");
	}

	return response as Required<{
		title: string;
		color: number;
		description: string;
		footer: { text: string };
	}>;
}

/**
 * Export parseJsonData for shared use
 */
export { parseJsonData };
