/**
 * Story Interactions Handler
 *
 * Handles Discord button interactions for branching story system.
 * Players make choices at decision points via buttons.
 */

import {
	ActionRowBuilder,
	type ButtonInteraction,
	type Client,
	DangerButtonBuilder,
	Events,
	type Interaction,
	MessageFlags,
	PrimaryButtonBuilder,
	SecondaryButtonBuilder,
} from "discord.js";
import * as sessionManager from "../services/storySession";
import * as storyEngine from "../util/storytelling/engine";
import type { StoryAction, StoryActionResult, StorySession } from "../util/storytelling/types";
import { isDecisionNode } from "../util/storytelling/types";
import { createLogger } from "../util/logger";
import { createInteraktivniPribehEmbed } from "../util/messages/embedBuilders";
import { generateStoryImage, logImageGenerationResult } from "../utils/storyImageGenerator";

const log = createLogger("StoryInteractions");

/**
 * Build a summary of the story for public display
 * Shows the full story journey: intro, decisions, outcomes
 */
function buildStorySummary(session: StorySession, result: StoryActionResult): string {
	const parts: string[] = [];

	// Show the full story journey from the journal
	for (const entry of session.storyJournal) {
		if (entry.type === "intro") {
			parts.push(`**📖 Začátek příběhu**`);
			parts.push(entry.narrative);
			parts.push("");
		} else if (entry.type === "decision" && entry.choice && entry.options) {
			const chosenOption = entry.options[entry.choice];
			const otherChoice = entry.choice === "choiceX" ? "choiceY" : "choiceX";
			const otherOption = entry.options[otherChoice];

			parts.push(`**🎯 Rozhodnutí**`);
			parts.push(entry.narrative);
			parts.push("");
			parts.push(`✅ **${chosenOption.label}**`);
			parts.push(`❌ ~~${otherOption.label}~~`);
			parts.push("");
		} else if (entry.type === "outcome") {
			const rollEmoji = entry.rollResult?.success ? "🎲 ✅" : "🎲 ❌";
			parts.push(`**${rollEmoji} Výsledek hodu**`);
			parts.push(entry.narrative);
			if (entry.rollResult) {
				parts.push(`*Hod: ${entry.rollResult.rolled.toFixed(1)} (potřeba < ${entry.rollResult.needed})*`);
			}
			parts.push("");
		}
	}

	// Final result
	parts.push(`**🏁 Konec příběhu**`);
	parts.push(result.narrative);

	return parts.join("\n");
}

// Custom ID prefix for story buttons
const STORY_PREFIX = "story_";

/**
 * Parse a story button custom ID
 * Format: story_{storyId}_{sessionId}_{action}
 * Note: storyId may contain underscores, so we parse from the end
 */
function parseCustomId(customId: string): {
	storyId: string;
	sessionId: string;
	action: StoryAction;
} | null {
	if (!customId.startsWith(STORY_PREFIX)) {
		return null;
	}

	const parts = customId.slice(STORY_PREFIX.length).split("_");
	if (parts.length < 3) {
		return null;
	}

	// Action is always last, sessionId is second-to-last, storyId is everything else
	const action = parts[parts.length - 1];
	const sessionId = parts[parts.length - 2];
	const storyId = parts.slice(0, -2).join("_");

	if (!storyId || !sessionId || !action) {
		return null;
	}

	if (!["choiceX", "choiceY", "cancel", "keepBalance"].includes(action)) {
		return null;
	}

	return {
		storyId,
		sessionId,
		action: action as StoryAction,
	};
}

/**
 * Build custom ID for a story button
 */
export function buildCustomId(
	storyId: string,
	sessionId: string,
	action: StoryAction,
): string {
	return `${STORY_PREFIX}${storyId}_${sessionId}_${action}`;
}

/**
 * Build the button rows for a decision node
 */
export function buildDecisionButtons(
	storyId: string,
	sessionId: string,
	choiceXLabel: string,
	choiceYLabel: string,
	accumulatedCoins: number,
): ActionRowBuilder[] {
	const choiceXButton = new PrimaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "choiceX"))
		.setLabel(`🎲 ${choiceXLabel}`)
		.setDisabled(false);

	const choiceYButton = new PrimaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "choiceY"))
		.setLabel(`🎲 ${choiceYLabel}`)
		.setDisabled(false);

	const cancelButton = new DangerButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "cancel"))
		.setLabel("❌ Zrušit příběh")
		.setDisabled(false);

	const coinSign = accumulatedCoins >= 0 ? "+" : "";
	const keepBalanceButton = new SecondaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "keepBalance"))
		.setLabel(`💰 Ponechat (${coinSign}${accumulatedCoins})`)
		.setDisabled(false);

	const row1 = new ActionRowBuilder().addComponents(
		choiceXButton,
		choiceYButton,
	);

	const row2 = new ActionRowBuilder().addComponents(
		cancelButton,
		keepBalanceButton,
	);

	return [row1, row2];
}

/**
 * Build disabled buttons (for completed stories)
 */
export function buildDisabledButtons(
	storyId: string,
	sessionId: string,
): ActionRowBuilder[] {
	const choiceXButton = new PrimaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "choiceX"))
		.setLabel("🎲 Volba A")
		.setDisabled(true);

	const choiceYButton = new PrimaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "choiceY"))
		.setLabel("🎲 Volba B")
		.setDisabled(true);

	const cancelButton = new DangerButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "cancel"))
		.setLabel("❌ Zrušit příběh")
		.setDisabled(true);

	const keepBalanceButton = new SecondaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "keepBalance"))
		.setLabel("💰 Ponechat")
		.setDisabled(true);

	const row1 = new ActionRowBuilder().addComponents(
		choiceXButton,
		choiceYButton,
	);

	const row2 = new ActionRowBuilder().addComponents(
		cancelButton,
		keepBalanceButton,
	);

	return [row1, row2];
}

/**
 * Handle a story button interaction
 */
async function handleStoryButton(interaction: ButtonInteraction): Promise<void> {
	const parsed = parseCustomId(interaction.customId);
	if (!parsed) {
		return;
	}

	const { sessionId, action } = parsed;

	// Get the session
	const session = sessionManager.getSession(sessionId);
	if (!session) {
		await interaction.reply({
			content: "❌ Tento příběh již vypršel nebo byl dokončen.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Verify the user owns this session
	if (session.discordUserId !== interaction.user.id) {
		await interaction.reply({
			content: "❌ Tento příběh patří jinému hráči.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	try {
		// For incremental AI stories, defer immediately since generation takes time
		if (session.isIncrementalAI) {
			await interaction.deferUpdate();
		}

		// Get story for title/emoji
		const story = storyEngine.getStory(session.storyId);
		const storyTitle = story ? `${story.emoji} ${story.title}` : "📖 Příběh";

		// Process the action (may generate new nodes for incremental AI stories)
		const result = await storyEngine.processAction(session, action);

		// Helper to update message (use editReply if deferred, update otherwise)
		const updateMessage = session.isIncrementalAI
			? async (opts: Parameters<typeof interaction.editReply>[0]) => interaction.editReply(opts)
			: async (opts: Parameters<typeof interaction.update>[0]) => interaction.update(opts);

		if (result === null) {
			// Cancel action - story was cancelled, user should get normal work
			// The work command will handle this when triggered again
			const cancelEmbed = createInteraktivniPribehEmbed()
				.setTitle("❌ Příběh zrušen")
				.setDescription("Příběh byl zrušen. Použij `/work` pro normální práci.")
				.setFooter({ text: "Konec příběhu" });

			await updateMessage({
				embeds: [cancelEmbed],
				components: [],
			});
			return;
		}

		// Build the response
		if (result.isComplete) {
			// Story completed - update ephemeral to show completion status
			const completedEmbed = createInteraktivniPribehEmbed()
				.setTitle("✅ Příběh dokončen")
				.setDescription("Výsledek byl odeslán do kanálu.")
				.setFooter({ text: "Konec příběhu" });

			await updateMessage({
				embeds: [completedEmbed],
				components: [],
			});

			// Send PUBLIC message with summary for everyone to see
			if (interaction.channel && "send" in interaction.channel) {
				const summaryEmbed = createInteraktivniPribehEmbed()
					.setTitle(storyTitle)
					.setDescription(buildStorySummary(session, result))
					.setFooter({ text: `${interaction.user.displayName} dokončil příběh` });

				// Generate meme image for the story (async, don't block)
				if (story) {
					generateStoryImage(story, session, result, interaction.user.displayName)
						.then((imageResult) => {
							// Log the result for debugging/monitoring
							logImageGenerationResult(imageResult);

							// If we got an image, send it as a follow-up
							if (imageResult.imageUrl && interaction.channel && "send" in interaction.channel) {
								// For base64 images, we need to send as attachment
								if (imageResult.imageUrl.startsWith("data:image")) {
									const base64Data = imageResult.imageUrl.split(",")[1];
									if (base64Data) {
										const buffer = Buffer.from(base64Data, "base64");
										interaction.channel.send({
											files: [{
												attachment: buffer,
												name: "story-meme.png",
											}],
										}).catch((err: unknown) => {
											log("error", `Failed to send image: ${String(err)}`);
										});
									}
								} else {
									// Regular URL - set as embed image
									const imageEmbed = createInteraktivniPribehEmbed()
										.setTitle("🎨 Meme z příběhu")
										.setImage(imageResult.imageUrl)
										.setFooter({ text: `${interaction.user.displayName}` });

									interaction.channel.send({
										embeds: [imageEmbed],
									}).catch((err: unknown) => {
										log("error", `Failed to send image embed: ${String(err)}`);
									});
								}
							}
						})
						.catch((err: unknown) => {
							log("error", `Image generation failed: ${String(err)}`);
						});
				}

				await interaction.channel.send({
					embeds: [summaryEmbed],
				});
			}
		} else {
			// Story continues - show new narrative with buttons
			const context = storyEngine.getStoryContext(result.session);
			if (!context || !isDecisionNode(context.currentNode)) {
				// Something went wrong - shouldn't happen
				const errorEmbed = createInteraktivniPribehEmbed()
					.setTitle(storyTitle)
					.setDescription(`${result.narrative}\n\n⚠️ Chyba: Neočekávaný stav příběhu.`)
					.setFooter({ text: "Chyba" });

				await updateMessage({
					embeds: [errorEmbed],
					components: [],
				});
				return;
			}

			const buttons = buildDecisionButtons(
				result.session.storyId,
				result.session.sessionId,
				context.currentNode.choices.choiceX.label,
				context.currentNode.choices.choiceY.label,
				result.session.accumulatedCoins,
			);

			// Build narrative with roll result if present
			let fullNarrative = result.narrative;
			if (result.rollResult) {
				const rollEmoji = result.rollResult.success ? "✅" : "❌";
				fullNarrative += `\n\n${rollEmoji} *Hod: ${result.rollResult.rolled.toFixed(1)} (potřeba < ${result.rollResult.needed})*`;
			}

			// Add the next decision narrative
			fullNarrative += `\n\n${storyEngine.resolveNodeValue(result.session, context.currentNode.id, "narrative", context.currentNode.narrative)}`;

			// Show choice descriptions
			fullNarrative += `\n\n**${context.currentNode.choices.choiceX.label}**: ${context.currentNode.choices.choiceX.description}`;
			fullNarrative += `\n**${context.currentNode.choices.choiceY.label}**: ${context.currentNode.choices.choiceY.description}`;

			const continueEmbed = createInteraktivniPribehEmbed()
				.setTitle(storyTitle)
				.setDescription(fullNarrative)
				.setFooter({ text: "Vyber si svou cestu..." });

			await updateMessage({
				embeds: [continueEmbed],
				components: buttons.map((row) => row.toJSON()),
			});
		}
	} catch (error) {
		log("error", `Error processing story action: ${error instanceof Error ? error.message : String(error)}`);
		await interaction.reply({
			content: "❌ Nastala chyba při zpracování akce. Zkus to prosím znovu.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Handle all interactions and route to story handler if applicable
 */
async function handleInteractionCreate(interaction: Interaction): Promise<void> {
	if (interaction.isButton()) {
		const customId = interaction.customId;
		if (customId.startsWith(STORY_PREFIX)) {
			await handleStoryButton(interaction);
		}
	}
}

/**
 * Initialize the story interaction handler
 */
export function initStoryInteractions(client: Client<true>): void {
	// Initialize session manager (load from SQLite)
	sessionManager.initSessionManager();

	// Register event listener
	client.on(Events.InteractionCreate, handleInteractionCreate);

	// Cleanup expired sessions periodically (every 30 minutes)
	setInterval(() => {
		const cleaned = sessionManager.cleanupExpiredSessions();
		if (cleaned > 0) {
			log("info", `Cleaned up ${cleaned} expired story sessions`);
		}
	}, 30 * 60 * 1000);

	log("info", "Story interaction handler initialized");
}
