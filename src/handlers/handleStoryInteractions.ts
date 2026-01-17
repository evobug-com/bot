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

// Custom ID prefixes for resume/abandon buttons
const RESUME_PREFIX = "story_resume_";
const ABANDON_PREFIX = "story_abandon_";

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
 * Build buttons showing processing state
 * The clicked button shows ⏳ prefix, all buttons are disabled
 */
export function buildProcessingButtons(
	storyId: string,
	sessionId: string,
	choiceXLabel: string,
	choiceYLabel: string,
	clickedAction: StoryAction,
	accumulatedCoins: number,
): ActionRowBuilder[] {
	const isChoiceX = clickedAction === "choiceX";
	const isChoiceY = clickedAction === "choiceY";
	const isCancel = clickedAction === "cancel";
	const isKeepBalance = clickedAction === "keepBalance";

	const choiceXButton = new PrimaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "choiceX"))
		.setLabel(isChoiceX ? `⏳ ${choiceXLabel}` : `🎲 ${choiceXLabel}`)
		.setDisabled(true);

	const choiceYButton = new PrimaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "choiceY"))
		.setLabel(isChoiceY ? `⏳ ${choiceYLabel}` : `🎲 ${choiceYLabel}`)
		.setDisabled(true);

	const cancelButton = new DangerButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "cancel"))
		.setLabel(isCancel ? "⏳ Zrušit příběh" : "❌ Zrušit příběh")
		.setDisabled(true);

	const coinSign = accumulatedCoins >= 0 ? "+" : "";
	const keepBalanceButton = new SecondaryButtonBuilder()
		.setCustomId(buildCustomId(storyId, sessionId, "keepBalance"))
		.setLabel(isKeepBalance ? `⏳ Ponechat (${coinSign}${accumulatedCoins})` : `💰 Ponechat (${coinSign}${accumulatedCoins})`)
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
 * Build resume prompt buttons for a pending session
 */
export function buildResumePromptButtons(sessionId: string): ActionRowBuilder[] {
	const resumeButton = new PrimaryButtonBuilder()
		.setCustomId(`${RESUME_PREFIX}${sessionId}`)
		.setLabel("▶️ Pokračovat")
		.setDisabled(false);

	const abandonButton = new DangerButtonBuilder()
		.setCustomId(`${ABANDON_PREFIX}${sessionId}`)
		.setLabel("❌ Začít nový")
		.setDisabled(false);

	const row = new ActionRowBuilder().addComponents(resumeButton, abandonButton);
	return [row];
}

/**
 * Handle the resume button - rebuild current story state with fresh buttons
 */
async function handleResumeButton(interaction: ButtonInteraction, sessionId: string): Promise<void> {
	const session = sessionManager.getSession(sessionId);
	if (!session) {
		await interaction.reply({
			content: "❌ Tento příběh již vypršel nebo byl dokončen. Použij `/story` pro nový příběh.",
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

	// Get story context
	const context = storyEngine.getStoryContext(session);
	if (!context || !isDecisionNode(context.currentNode)) {
		// Session exists but not at a decision point - shouldn't happen but handle gracefully
		sessionManager.deleteSession(sessionId);
		if (storyEngine.isDynamicStory(session.storyId)) {
			storyEngine.unregisterStory(session.storyId);
		}
		await interaction.reply({
			content: "❌ Příběh nelze pokračovat. Použij `/story` pro nový příběh.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Update last interaction time
	sessionManager.updateSession(session);

	// Build fresh buttons
	const buttons = buildDecisionButtons(
		session.storyId,
		session.sessionId,
		context.currentNode.choices.choiceX.label,
		context.currentNode.choices.choiceY.label,
		session.accumulatedCoins,
	);

	// Build the narrative from current state
	let fullNarrative = "";

	// Show last journal entry for context
	const lastEntry = session.storyJournal[session.storyJournal.length - 1];
	if (lastEntry) {
		if (lastEntry.type === "outcome" && lastEntry.rollResult) {
			const rollEmoji = lastEntry.rollResult.success ? "✅" : "❌";
			fullNarrative += `${lastEntry.narrative}\n\n${rollEmoji} *Hod: ${lastEntry.rollResult.rolled.toFixed(1)} (potřeba < ${lastEntry.rollResult.needed})*\n\n`;
		} else if (lastEntry.type === "intro") {
			fullNarrative += `${lastEntry.narrative}\n\n`;
		}
	}

	// Add current decision narrative
	fullNarrative += storyEngine.resolveNodeValue(session, context.currentNode.id, "narrative", context.currentNode.narrative);
	fullNarrative += `\n\n**${context.currentNode.choices.choiceX.label}**: ${context.currentNode.choices.choiceX.description}`;
	fullNarrative += `\n**${context.currentNode.choices.choiceY.label}**: ${context.currentNode.choices.choiceY.description}`;

	const storyEmbed = createInteraktivniPribehEmbed()
		.setTitle(`${context.story.emoji} ${context.story.title}`)
		.setDescription(fullNarrative)
		.setFooter({ text: "Pokračování příběhu... Vyber si svou cestu!" });

	await interaction.reply({
		embeds: [storyEmbed],
		components: buttons.map((row) => row.toJSON()),
		flags: MessageFlags.Ephemeral,
	});

	log("info", `User ${session.discordUserId} resumed story session ${sessionId}`);
}

/**
 * Handle the abandon button - delete session and show confirmation
 */
async function handleAbandonButton(interaction: ButtonInteraction, sessionId: string): Promise<void> {
	const session = sessionManager.getSession(sessionId);
	if (!session) {
		await interaction.reply({
			content: "✅ Příběh již byl ukončen. Použij `/story` pro nový příběh.",
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

	// Delete the session
	sessionManager.deleteSession(sessionId);

	// Cleanup AI story if applicable
	if (storyEngine.isDynamicStory(session.storyId)) {
		storyEngine.unregisterStory(session.storyId);
	}

	await interaction.reply({
		content: "✅ Předchozí příběh byl zrušen. Použij `/story` pro nový příběh.",
		flags: MessageFlags.Ephemeral,
	});

	log("info", `User ${session.discordUserId} abandoned story session ${sessionId}`);
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

	// Check if an action is already being processed for this session (prevents duplicate clicks)
	if (sessionManager.isSessionProcessing(session)) {
		await interaction.reply({
			content: "⏳ Tvoje akce se právě zpracovává, chvilku počkej...",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Set the processing lock (persisted to SQLite for restart survival)
	sessionManager.setSessionProcessing(session.sessionId, true);

	// Get story context for processing buttons and title
	const story = storyEngine.getStory(session.storyId);
	const storyTitle = story ? `${story.emoji} ${story.title}` : "📖 Příběh";
	const context = storyEngine.getStoryContext(session);

	// Immediately show processing state with disabled buttons
	// This provides visual feedback that the action was received
	if (context && isDecisionNode(context.currentNode)) {
		const processingButtons = buildProcessingButtons(
			session.storyId,
			session.sessionId,
			context.currentNode.choices.choiceX.label,
			context.currentNode.choices.choiceY.label,
			action,
			session.accumulatedCoins,
		);

		await interaction.update({
			components: processingButtons.map((row) => row.toJSON()),
		});
	} else {
		// Fallback: just defer the update if we can't build processing buttons
		await interaction.deferUpdate();
	}

	try {
		// Process the action (may generate new nodes for incremental AI stories)
		const result = await storyEngine.processAction(session, action);

		// Since we already called update() or deferUpdate(), always use editReply
		if (result === null) {
			// Cancel action - story was cancelled, user should get normal work
			// The work command will handle this when triggered again
			const cancelEmbed = createInteraktivniPribehEmbed()
				.setTitle("❌ Příběh zrušen")
				.setDescription("Příběh byl zrušen.")
				.setFooter({ text: "Konec příběhu" });

			await interaction.editReply({
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

			await interaction.editReply({
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

				await interaction.editReply({
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

			await interaction.editReply({
				embeds: [continueEmbed],
				components: buttons.map((row) => row.toJSON()),
			});
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorName = error instanceof Error ? error.name : "UnknownError";

		// Check if this is an InteractionAlreadyReplied error
		const isInteractionAlreadyReplied = errorName === "InteractionAlreadyReplied" ||
			errorMessage.includes("reply to this interaction has already been sent");

		if (isInteractionAlreadyReplied) {
			// Handle by aborting current story and regenerating
			log("warn", `InteractionAlreadyReplied for session ${session.sessionId}, attempting story regeneration`);

			try {
				// Abort the current session
				sessionManager.deleteSession(session.sessionId);
				storyEngine.unregisterStory(session.storyId);

				// Try to regenerate the story if this was an AI story
				if (session.isIncrementalAI && interaction.channel && "send" in interaction.channel) {
					const newStoryResult = await storyEngine.startIncrementalAIStory({
						discordUserId: session.discordUserId,
						dbUserId: session.dbUserId,
						messageId: interaction.message.id,
						channelId: session.channelId,
						guildId: session.guildId,
						userLevel: session.userLevel,
					});

					if (newStoryResult.success && newStoryResult.result) {
						const context = storyEngine.getStoryContext(newStoryResult.result.session);
						if (context && isDecisionNode(context.currentNode)) {
							const buttons = buildDecisionButtons(
								newStoryResult.result.session.storyId,
								newStoryResult.result.session.sessionId,
								context.currentNode.choices.choiceX.label,
								context.currentNode.choices.choiceY.label,
								newStoryResult.result.session.accumulatedCoins,
							);

							const narrative = `${newStoryResult.result.narrative}\n\n**${context.currentNode.choices.choiceX.label}**: ${context.currentNode.choices.choiceX.description}\n**${context.currentNode.choices.choiceY.label}**: ${context.currentNode.choices.choiceY.description}`;

							const storyEmbed = createInteraktivniPribehEmbed()
								.setTitle("🤖 AI Příběh (regenerováno)")
								.setDescription(`⚠️ Předchozí příběh selhal, vygenerovali jsme nový:\n\n${narrative}`)
								.setFooter({ text: "Vyber si svou cestu..." });

							await interaction.channel.send({
								content: `<@${session.discordUserId}>`,
								embeds: [storyEmbed],
								components: buttons.map((row) => row.toJSON()),
							});

							log("info", `Successfully regenerated story for user ${session.discordUserId}`);
							return;
						}
					}
				}

				// Fallback: just notify the user to try /work again
				if (interaction.channel && "send" in interaction.channel) {
					await interaction.channel.send({
						content: `<@${session.discordUserId}> ⚠️ Příběh selhal kvůli technické chybě. Použij prosím \`/work\` pro nový příběh.`,
					});
				}
			} catch (recoveryError) {
				log("error", `Failed to recover from InteractionAlreadyReplied: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
			}
			return;
		}

		log("error", `Error processing story action: ${errorMessage}`);

		// Send error feedback - we already called update/deferUpdate, so use editReply
		try {
			await interaction.editReply({
				content: "❌ Nastala chyba při zpracování akce. Zkus to prosím znovu.",
			});
		} catch (replyError) {
			// Log but don't throw - interaction may have expired or already been handled
			log("warn", `Failed to send error message to user: ${replyError instanceof Error ? replyError.message : String(replyError)}`);
		}
	} finally {
		// Always clear the processing lock when done (success or failure)
		sessionManager.setSessionProcessing(session.sessionId, false);
	}
}

/**
 * Handle all interactions and route to story handler if applicable
 */
async function handleInteractionCreate(interaction: Interaction): Promise<void> {
	if (interaction.isButton()) {
		const customId = interaction.customId;

		// Check for resume/abandon buttons first (more specific prefix)
		if (customId.startsWith(RESUME_PREFIX)) {
			const sessionId = customId.slice(RESUME_PREFIX.length);
			await handleResumeButton(interaction, sessionId);
			return;
		}

		if (customId.startsWith(ABANDON_PREFIX)) {
			const sessionId = customId.slice(ABANDON_PREFIX.length);
			await handleAbandonButton(interaction, sessionId);
			return;
		}

		// Handle regular story buttons
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
