/**
 * Test Story Command
 *
 * ADMIN ONLY: Always triggers a branching story for testing purposes.
 * Logs pricing/tokens to console.
 */

import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { createErrorEmbed } from "../util";
import type { CommandContext } from "../util/commands.ts";
import { createInteraktivniPribehEmbed } from "../util/messages/embedBuilders.ts";
import { getSecureRandomIndex } from "../utils/random.ts";
// Branching story imports
import * as storyEngine from "../util/storytelling/engine";
import { buildDecisionButtons } from "../handlers/handleStoryInteractions";
import { isDecisionNode, type BranchingStory } from "../util/storytelling/types";
// Import all branching stories
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

const getAdminIds = (): string[] => {
	const adminIds = process.env.ADMIN_IDS;
	if (!adminIds) return [];
	return adminIds.split(",").map((id) => id.trim());
};

export const data = new ChatInputCommandBuilder()
	.setName("test-story")
	.setNameLocalizations({ cs: "test-příběh" })
	.setDescription("[ADMIN] Test branching story - always triggers a story")
	.setDescriptionLocalizations({ cs: "[ADMIN] Test interaktivního příběhu - vždy spustí příběh" })
	.addBooleanOptions((option) =>
		option
			.setName("ai")
			.setDescription("Generate an AI story instead of using a predefined one")
			.setRequired(false),
	);

export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
	// Check admin permission
	const adminIds = getAdminIds();
	if (!adminIds.includes(interaction.user.id)) {
		await interaction.reply({
			content: "Only admins can use this command.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const useAI = interaction.options.getBoolean("ai") ?? false;

	let story: BranchingStory | null = null;
	let storyId: string;

	if (useAI) {
		// Show immediate feedback while generating
		await interaction.editReply({
			content: "🤖 Generuji AI příběh... (používá se inkrementální generování)",
		});

		console.log("\n========== GENERATING INCREMENTAL AI STORY ==========");
		console.log(`User: ${interaction.user.displayName} (${interaction.user.id})`);

		// Get user level from API
		const [statsError, statsResult] = await orpc.users.stats.user({ id: dbUser.id });
		const userLevel = statsError ? 1 : statsResult.levelProgress.currentLevel;

		// Use incremental AI story generation (only Layer 1 is generated now)
		const aiResult = await storyEngine.startIncrementalAIStory({
			discordUserId: interaction.user.id,
			dbUserId: dbUser.id,
			messageId: "",
			channelId: interaction.channelId ?? "",
			guildId: interaction.guildId ?? "",
			userLevel,
		});

		if (!aiResult.success || !aiResult.result) {
			const errorEmbed = createErrorEmbed("AI Story Error", aiResult.error ?? "Failed to generate AI story");
			await interaction.editReply({ content: "", embeds: [errorEmbed] });
			return;
		}

		const storyContext = storyEngine.getStoryContext(aiResult.result.session);
		if (!storyContext) {
			const errorEmbed = createErrorEmbed("AI Story Error", "Failed to get story context");
			await interaction.editReply({ content: "", embeds: [errorEmbed] });
			return;
		}

		story = storyContext.story;
		storyId = story.id;

		console.log(`Generated (Layer 1 only): ${story.title} (${storyId})`);
		if (aiResult.usage) {
			console.log(`Tokens: ${aiResult.usage.totalTokens}`);
		}
		console.log("====================================================\n");

		// Display the story (intro + decision1)
		const context = storyContext;

		if (isDecisionNode(context.currentNode)) {
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
				.setTitle(`${story.emoji} ${story.title}`)
				.setDescription(fullNarrative)
				.setFooter({ text: "[TEST MODE - AI Incremental] Vyber si svou cestu..." });

			await interaction.editReply({
				content: "",
				embeds: [storyEmbed],
				components: buttons.map((row) => row.toJSON()),
			});
		} else {
			const storyEmbed = createInteraktivniPribehEmbed()
				.setTitle(`${story.emoji} ${story.title}`)
				.setDescription(aiResult.result.narrative)
				.setFooter({ text: "[TEST MODE - AI Incremental] Chyba při načítání voleb" });

			await interaction.editReply({
				content: "",
				embeds: [storyEmbed],
			});
		}
		return;
	} else {
		// Get all registered story IDs
		const storyIds = storyEngine.getRegisteredStoryIds();

		if (storyIds.length === 0) {
			const errorEmbed = createErrorEmbed("Chyba", "Žádné příběhy nejsou registrovány.");
			await interaction.editReply({ embeds: [errorEmbed] });
			return;
		}

		// Pick a random story
		const randomIndex = getSecureRandomIndex(storyIds.length);
		const selectedStoryId = storyIds[randomIndex];

		if (!selectedStoryId) {
			const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se vybrat příběh.");
			await interaction.editReply({ embeds: [errorEmbed] });
			return;
		}

		storyId = selectedStoryId;
		story = storyEngine.getStory(storyId) ?? null;

		if (!story) {
			const errorEmbed = createErrorEmbed("Chyba", `Příběh "${storyId}" nebyl nalezen.`);
			await interaction.editReply({ embeds: [errorEmbed] });
			return;
		}

		console.log("\n========== TEST STORY STARTED ==========");
		console.log(`Story: ${story.title} (${storyId})`);
		console.log(`User: ${interaction.user.displayName} (${interaction.user.id})`);
		console.log(`DB User ID: ${dbUser.id}`);
		console.log("=========================================\n");
	}

	try {
		// Get user level from API
		const [statsError, statsResult] = await orpc.users.stats.user({ id: dbUser.id });
		const userLevel = statsError ? 1 : statsResult.levelProgress.currentLevel;

		// Start the branching story session
		const storyResult = await storyEngine.startStory(storyId, {
			discordUserId: interaction.user.id,
			dbUserId: dbUser.id,
			messageId: "",
			channelId: interaction.channelId ?? "",
			guildId: interaction.guildId ?? "",
			userLevel,
		});

		// Get the first decision node for button labels
		const context = storyEngine.getStoryContext(storyResult.session);

		if (context && isDecisionNode(context.currentNode)) {
			// Build the decision buttons
			const buttons = buildDecisionButtons(
				storyResult.session.storyId,
				storyResult.session.sessionId,
				context.currentNode.choices.choiceX.label,
				context.currentNode.choices.choiceY.label,
				storyResult.session.accumulatedCoins,
			);

			// Build the full narrative with intro + first decision
			let fullNarrative = storyResult.narrative;
			fullNarrative += `\n\n${storyEngine.resolveNodeValue(storyResult.session, context.currentNode.id, "narrative", context.currentNode.narrative)}`;
			fullNarrative += `\n\n**${context.currentNode.choices.choiceX.label}**: ${context.currentNode.choices.choiceX.description}`;
			fullNarrative += `\n**${context.currentNode.choices.choiceY.label}**: ${context.currentNode.choices.choiceY.description}`;

			// Create embed with proper styling
			const storyEmbed = createInteraktivniPribehEmbed()
				.setTitle(`${story.emoji} ${story.title}`)
				.setDescription(fullNarrative)
				.setFooter({ text: "[TEST MODE] Vyber si svou cestu..." });

			await interaction.editReply({
				embeds: [storyEmbed],
				components: buttons.map((row) => row.toJSON()),
			});
		} else {
			// Something went wrong, just show narrative without buttons
			const storyEmbed = createInteraktivniPribehEmbed()
				.setTitle(`${story.emoji} ${story.title}`)
				.setDescription(storyResult.narrative)
				.setFooter({ text: "[TEST MODE] Chyba při načítání voleb" });

			await interaction.editReply({
				embeds: [storyEmbed],
			});
		}
	} catch (error) {
		console.error(`[TEST-STORY] Error starting story ${storyId}:`, error);
		const errorEmbed = createErrorEmbed("Chyba", `Nepodařilo se spustit příběh: ${error instanceof Error ? error.message : String(error)}`);
		await interaction.editReply({ embeds: [errorEmbed] });
	}
};
