/**
 * Test Story Command
 *
 * DEV ONLY: Always triggers a branching story for testing purposes.
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
import { isDecisionNode } from "../util/storytelling/types";
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

export const data = new ChatInputCommandBuilder()
	.setName("test-story")
	.setNameLocalizations({ cs: "test-příběh" })
	.setDescription("[DEV] Test branching story - always triggers a random story")
	.setDescriptionLocalizations({ cs: "[DEV] Test interaktivního příběhu - vždy spustí náhodný příběh" });

export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Get all registered story IDs
	const storyIds = storyEngine.getRegisteredStoryIds();

	if (storyIds.length === 0) {
		const errorEmbed = createErrorEmbed("Chyba", "Žádné příběhy nejsou registrovány.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Pick a random story
	const randomIndex = getSecureRandomIndex(storyIds.length);
	const storyId = storyIds[randomIndex];

	if (!storyId) {
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se vybrat příběh.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	const story = storyEngine.getStory(storyId);

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
