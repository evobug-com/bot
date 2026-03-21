import { MessageFlags } from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import { orpc } from "../client/client.ts";
import { createErrorEmbed, formatTimeRemaining } from "../util";
import { isAdmin } from "../utils/admin.ts";
import { getSecureRandomIndex } from "../utils/random.ts";
import { checkUserBeforeCommand, enforceAntiCheatAction } from "../util/anti-cheat-handler.ts";
import type { CommandContext } from "../util/commands.ts";
import { createInteraktivniPribehEmbed } from "../util/messages/embedBuilders.ts";
import { getWorkSettings } from "../services/workSettings/storage.ts";
// Branching story imports
import * as storyEngine from "../util/storytelling/engine";
import * as sessionManager from "../services/storySession";
import { buildDecisionButtons, buildResumePromptButtons } from "../handlers/handleStoryInteractions";
import { isDecisionNode } from "../util/storytelling/types";
// Import branching stories to auto-register them
import "../util/storytelling/stories/stolen-money-branching";
import "../util/storytelling/stories/christmas-party-branching";
import "../util/storytelling/stories/client-meeting-branching";
import "../util/storytelling/stories/coffee-machine-branching";
import "../util/storytelling/stories/elections-candidate-branching";
import "../util/storytelling/stories/elevator-stuck-branching";
import "../util/storytelling/stories/friday-deploy-branching";
import "../util/storytelling/stories/hackathon-branching";
import "../util/storytelling/stories/it-support-branching";
import "../util/storytelling/stories/job-interview-branching";
import "../util/storytelling/stories/lunch-thief-branching";
import "../util/storytelling/stories/office-prank-branching";
import "../util/storytelling/stories/reveal-cheating-branching";
import "../util/storytelling/stories/server-room-branching";
import "../util/storytelling/stories/video-conference-branching";
import "../util/storytelling/stories/code-review-branching.ts";
import "../util/storytelling/stories/home-office-branching.ts";
import "../util/storytelling/stories/meeting-escape-branching.ts";
import "../util/storytelling/stories/microwave-drama-branching.ts";
import "../util/storytelling/stories/parking-war-branching.ts";
import "../util/storytelling/stories/reply-all-branching.ts";
import "../util/storytelling/stories/salary-negotiation-branching.ts";
import "../util/storytelling/stories/team-building-branching.ts";
// Import story activities from work command
import { workActivities, type StoryCategory } from "./work.ts";

// ============================================================================
// TYPES
// ============================================================================

interface StoryActivity {
	id: string;
	title: string;
	activity: string;
	category: StoryCategory;
	branchingStoryId: string;
}

// ============================================================================
// STORY SELECTION
// ============================================================================

/**
 * Select a random story from the available stories.
 */
function selectRandomStory(stories: StoryActivity[]): StoryActivity | null {
	if (stories.length === 0) return null;
	const index = getSecureRandomIndex(stories.length);
	return stories[index] ?? null;
}

// ============================================================================
// COMMAND DEFINITION
// ============================================================================

export const data = new ChatInputCommandBuilder()
	.setName("story")
	.setNameLocalizations({ cs: "pribeh" })
	.setDescription("Start an interactive story adventure (shares cooldown with /work)")
	.setDescriptionLocalizations({ cs: "Zahaj interaktivni pribehy dobrodruzi (sdili cooldown s /work)" });

export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
	// Defer as ephemeral - stories are personal
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Admin-only while in testing
	if (!isAdmin(interaction.user.id)) {
		await interaction.editReply({
			content: "Tento příkaz je momentálně dostupný pouze pro adminy.",
		});
		return;
	}

	// Check for pending session that can be resumed
	// This handles timeout scenarios where Discord buttons expired but session persists
	const pendingSession = sessionManager.getSessionByUser(interaction.user.id);
	if (pendingSession && storyEngine.canResumeSession(pendingSession)) {
		const resumeButtons = buildResumePromptButtons(pendingSession.sessionId);
		const context = storyEngine.getStoryContext(pendingSession);
		const storyTitle = context
			? `${context.story.emoji} ${context.story.title}`
			: "📖 Příběh";

		const resumeEmbed = createInteraktivniPribehEmbed()
			.setTitle("⏸️ Máš rozpracovaný příběh")
			.setDescription(
				`Našli jsme tvůj rozpracovaný příběh **${storyTitle}**.\n\n` +
				`Chceš v něm pokračovat, nebo začít nový příběh?\n\n` +
				`*Poznámka: Pokud začneš nový příběh, rozpracovaný se ztratí.*`,
			)
			.setFooter({ text: "Vyber si možnost..." });

		await interaction.editReply({
			embeds: [resumeEmbed],
			components: resumeButtons.map((row) => row.toJSON()),
		});
		return;
	}

	// Check cooldown first (shared with /work)
	const [cooldownError, cooldown] = await orpc.users.stats.work.cooldown({ userId: dbUser.id });

	if (cooldownError) {
		console.error("Error checking work cooldown:", cooldownError);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se zkontrolovat cooldown. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (cooldown.isOnCooldown) {
		const timeRemaining = formatTimeRemaining(cooldown.cooldownRemaining || 0);
		const errorEmbed = createErrorEmbed(
			"Ještě nemůžeš začít příběh",
			`Počkej ještě ${timeRemaining}, než budeš moct znovu pracovat nebo vyprávět příběhy.\n\nTip: Příběhy sdílí cooldown s /work`,
		);
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Anti-cheat check using new comprehensive system
	// Use "work" as commandName since story shares cooldown with work
	const antiCheatContext = {
		userId: dbUser.id,
		guildId: interaction.guildId || "unknown",
		commandName: "work" as const,
		interaction,
	};

	// Check user with anti-cheat system
	const checkResult = await checkUserBeforeCommand(antiCheatContext);

	// Enforce anti-cheat action (captcha, restriction, etc.)
	const canProceed = await enforceAntiCheatAction(antiCheatContext, checkResult);

	if (!canProceed) {
		// User failed verification or is restricted
		if (checkResult.action === "restrict") {
			const errorEmbed = createErrorEmbed(
				"Přístup omezen",
				checkResult.message ||
					"Tvůj přístup k příběhům byl dočasně omezen kvůli podezřelé aktivitě.\n\nPokud si myslíš, že jde o chybu, kontaktuj administrátory.",
			);
			await interaction.editReply({ embeds: [errorEmbed] });
		}
		// Captcha failure is already handled in enforceAntiCheatAction
		return;
	}

	// Claim work reward (shares cooldown with /work)
	const [workError, work] = await orpc.users.stats.work.claim({
		userId: dbUser.id,
		boostCount: 0, // Story command doesn't check boost
	});

	if (workError) {
		console.error("Error executing story command:", workError);

		// Check for economy ban
		if ("code" in workError && workError.code === "ECONOMY_BANNED") {
			const errorEmbed = createErrorEmbed(
				"Přístup k ekonomice pozastaven",
				"Tvůj přístup k ekonomickým příkazům byl dočasně pozastaven kvůli podezřelé aktivitě.\n\nPokud si myslíš, že jde o chybu, kontaktuj administrátory.",
			);
			await interaction.editReply({ embeds: [errorEmbed] });
			return;
		}

		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se zahájit příběh. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Filter to story activities only (all story categories)
	const storyActivities: StoryActivity[] = [];
	for (const act of workActivities) {
		if (typeof act === "function") continue;
		if (!act.category.startsWith("story:")) continue;
		if (!("branchingStoryId" in act) || act.branchingStoryId === undefined) continue;
		storyActivities.push({
			id: act.id,
			title: act.title,
			activity: act.activity,
			category: act.category as StoryCategory,
			branchingStoryId: act.branchingStoryId,
		});
	}

	// Determine if AI story should be used (based on aiStoryChancePercent setting)
	const workSettings = getWorkSettings();
	const shouldUseAIStory = workSettings.aiStoryEnabled && getSecureRandomIndex(100) < workSettings.aiStoryChancePercent;

	// Select a random story
	const selectedStory = selectRandomStory(storyActivities);

	if (!selectedStory && !shouldUseAIStory) {
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se vybrat příběh. Zkuste to později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Helper function to start and display a story
	const startAndDisplayStory = async (storyId: string, story: ReturnType<typeof storyEngine.getStory>) => {
		if (!story) return;

		const storyResult = await storyEngine.startStory(storyId, {
			discordUserId: interaction.user.id,
			dbUserId: dbUser.id,
			messageId: "",
			channelId: interaction.channelId ?? "",
			guildId: interaction.guildId ?? "",
			userLevel: work.levelProgress.currentLevel,
		});

		const context = storyEngine.getStoryContext(storyResult.session);
		if (context && isDecisionNode(context.currentNode)) {
			const buttons = buildDecisionButtons(
				storyResult.session.storyId,
				storyResult.session.sessionId,
				context.currentNode.choices.choiceX.label,
				context.currentNode.choices.choiceY.label,
				storyResult.session.accumulatedCoins,
			);

			let fullNarrative = storyResult.narrative;
			fullNarrative += `\n\n${storyEngine.resolveNodeValue(storyResult.session, context.currentNode.id, "narrative", context.currentNode.narrative)}`;
			fullNarrative += `\n\n**${context.currentNode.choices.choiceX.label}**: ${context.currentNode.choices.choiceX.description}`;
			fullNarrative += `\n**${context.currentNode.choices.choiceY.label}**: ${context.currentNode.choices.choiceY.description}`;

			const storyEmbed = createInteraktivniPribehEmbed()
				.setTitle(`${story.emoji} ${story.title}`)
				.setDescription(fullNarrative)
				.setFooter({ text: "Vyber si svou cestu..." });

			await interaction.editReply({
				embeds: [storyEmbed],
				components: buttons.map((row) => row.toJSON()),
			});
		} else {
			const storyEmbed = createInteraktivniPribehEmbed()
				.setTitle(`${story.emoji} ${story.title}`)
				.setDescription(storyResult.narrative);

			await interaction.editReply({
				embeds: [storyEmbed],
			});
		}
	};

	// Check if we should use AI-generated story
	if (shouldUseAIStory) {
		try {
			// Use incremental AI story generation (only generates Layer 1 initially)
			const aiResult = await storyEngine.startIncrementalAIStory({
				discordUserId: interaction.user.id,
				dbUserId: dbUser.id,
				messageId: "",
				channelId: interaction.channelId ?? "",
				guildId: interaction.guildId ?? "",
				userLevel: work.levelProgress.currentLevel,
			});

			if (aiResult.success && aiResult.result) {
				const context = storyEngine.getStoryContext(aiResult.result.session);
				if (context && isDecisionNode(context.currentNode)) {
					const buttons = buildDecisionButtons(
						aiResult.result.session.storyId,
						aiResult.result.session.sessionId,
						context.currentNode.choices.choiceX.label,
						context.currentNode.choices.choiceY.label,
						aiResult.result.session.accumulatedCoins,
					);

					let fullNarrative = aiResult.result.narrative;
					fullNarrative += `\n\n${storyEngine.resolveNodeValue(aiResult.result.session, context.currentNode.id, "narrative", context.currentNode.narrative)}`;
					fullNarrative += `\n\n**${context.currentNode.choices.choiceX.label}**: ${context.currentNode.choices.choiceX.description}`;
					fullNarrative += `\n**${context.currentNode.choices.choiceY.label}**: ${context.currentNode.choices.choiceY.description}`;

					const storyEmbed = createInteraktivniPribehEmbed()
						.setTitle(`${context.story.emoji} ${context.story.title}`)
						.setDescription(fullNarrative)
						.setFooter({ text: "Vyber si svou cestu..." });

					await interaction.editReply({
						embeds: [storyEmbed],
						components: buttons.map((row) => row.toJSON()),
					});
				}
			} else {
				console.error("[Story] AI story generation failed:", aiResult.error);
				// Fallback to written story if available
				if (selectedStory) {
					const story = storyEngine.getStory(selectedStory.branchingStoryId);
					if (story) {
						await startAndDisplayStory(selectedStory.branchingStoryId, story);
					}
				}
			}
		} catch (error) {
			console.error("[Story] Error with AI story:", error);
			// Fallback to written story
			if (selectedStory) {
				const story = storyEngine.getStory(selectedStory.branchingStoryId);
				if (story) {
					await startAndDisplayStory(selectedStory.branchingStoryId, story);
				}
			}
		}
	} else if (selectedStory) {
		// Use written branching story
		try {
			const storyId = selectedStory.branchingStoryId;
			const story = storyEngine.getStory(storyId);

			if (!story) {
				console.error(`Branching story not found: ${storyId}`);
				const errorEmbed = createErrorEmbed("Chyba", "Příběh nebyl nalezen.");
				await interaction.editReply({ embeds: [errorEmbed] });
			} else {
				await startAndDisplayStory(storyId, story);
			}
		} catch (error) {
			console.error(`Error starting branching story ${selectedStory.branchingStoryId}:`, error);
			const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se spustit příběh.");
			await interaction.editReply({ embeds: [errorEmbed] });
		}
	}

	// Record successful command completion for anti-cheat
	await orpc.users.anticheat.trust.update({
		userId: dbUser.id,
		guildId: antiCheatContext.guildId,
		delta: +1,
		reason: "Successful story command",
	});
};
