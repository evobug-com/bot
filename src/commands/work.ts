import { type GuildMember, MessageFlags } from "discord.js";
import { ChatInputCommandBuilder } from "@discordjs/builders";
import { orpc } from "../client/client.ts";
import { ChannelManager, createErrorEmbed, formatTimeRemaining } from "../util";
import { getSecureRandomIndex } from "../utils/random.ts";
import { checkUserBeforeCommand, enforceAntiCheatAction } from "../util/anti-cheat-handler.ts";
import {
	addLevelProgressField,
	createEconomyFooter,
	handleRewardResponse,
	type RewardResponse,
} from "../util/bot/rewards.ts";
import type { CommandContext } from "../util/commands.ts";
import { createUradPraceEmbed, createInteraktivniPribehEmbed } from "../util/messages/embedBuilders.ts";
import { WORK_CONFIG } from "../services/work/config.ts";
import { isStoryWorkEnabled } from "../services/userSettings/storage.ts";
import { getWorkSettings } from "../services/workSettings/storage.ts";
// Branching story imports
import * as storyEngine from "../util/storytelling/engine";
import { buildDecisionButtons } from "../handlers/handleStoryInteractions";
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

// ============================================================================
// TYPES
// ============================================================================

/** Activity category for filtering and career weighting */
export type ActivityCategory =
	| "work:office"    // Generic office activities (meetings, admin, office humor)
	| "work:dev"       // Developer/tech activities (code, git, docker, etc.)
	| "work:misc"      // Other work-appropriate activities
	| "work:community"; // Discord/community specific activities

/** Story category for filtering */
export type StoryCategory =
	| "story:work"      // Work-related branching stories
	| "story:crime"     // Theft/moral choice stories
	| "story:adventure"; // Random/fun adventure stories

/** Base activity definition */
interface BaseActivity {
	id: string;
	title: string;
	activity: string;
	/** Category for filtering and career weighting */
	category: ActivityCategory | StoryCategory;
	/** ID of branching story (Mass Effect-style interactive) */
	branchingStoryId?: string;
}

/** Dynamic activity that generates based on member context */
type DynamicActivity = (member: GuildMember) => BaseActivity;

/** Activity can be static or dynamic */
type Activity = BaseActivity | DynamicActivity;

// ============================================================================
// ACTIVITY SELECTION
// ============================================================================

/**
 * Select a random activity from the list.
 */
function selectRandomActivity(
	activities: readonly Activity[],
	member: GuildMember,
): BaseActivity | null {
	if (activities.length === 0) return null;

	const index = getSecureRandomIndex(activities.length);
	const selected = activities[index];
	if (!selected) return null;

	if (typeof selected === "function") {
		return selected(member);
	}
	return selected;
}

export const data = new ChatInputCommandBuilder()
	.setName("work")
	.setNameLocalizations({ cs: "práce" })
	.setDescription("Work to earn XP and coins")
	.setDescriptionLocalizations({ cs: "Pracujte a vydělávejte XP a mince" });
export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
	if (interaction.guild) {
		const commandsRoom = ChannelManager.getChannel(interaction.guild, "COMMANDS");
		if (commandsRoom) {
			// Disallow sending /work outside of commands channel
			if (interaction.channelId !== commandsRoom.id) {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });

				const embed = createUradPraceEmbed().setDescription(
					`Příkaz /work funguje pouze v místnosti <#${commandsRoom.id}> - tam se hlásíš na práci!`,
				);

				await interaction.editReply({
					embeds: [embed],
				});
				return;
			}
		}
	}

	// Defer publicly to keep the command visible
	await interaction.deferReply();

	// Check cooldown first
	const [cooldownError, cooldown] = await orpc.users.stats.work.cooldown({ userId: dbUser.id });

	if (cooldownError) {
		console.error("Error checking work cooldown:", cooldownError);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se zkontrolovat cooldown. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (cooldown.isOnCooldown) {
		const timeRemaining = formatTimeRemaining(cooldown.cooldownRemaining || 0);
		const embed = createUradPraceEmbed()
			.addFields(
				{
						name: "Tvůj stav",
						value: "Šlofííčkuješ",
					},
					{
						name: "Odpočatý budeš za",
						value: timeRemaining,
					},
			)
			.setFooter({ text: "Za flákání se neplatí! Zkus to znovu později.\nTip: Pracovat můžeš jednou za 60 minut" })
			.setThumbnail("https://cdn.discordapp.com/emojis/1326286362760187944.png");

		await interaction.editReply({ embeds: [embed] });
		return;
	}

	// Get user's boost count (how many times they've boosted)
	let boostCount = 0;
	if (interaction.guild && interaction.member) {
		// Check if member has the premium subscriber role (server booster)
		const member = await interaction.guild.members.fetch(interaction.user.id);
		if (member.premiumSince) {
			// User is a booster, but Discord doesn't tell us how many boosts they have
			// We'll count 5 boost per premium subscriber for simplicity
			boostCount = 3;
		}
	}

	// Anti-cheat check using new comprehensive system
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
					"Tvůj přístup k ekonomickým příkazům byl dočasně omezen kvůli podezřelé aktivitě.\n\nPokud si myslíš, že jde o chybu, kontaktuj administrátory.",
			);
			await interaction.editReply({ embeds: [errorEmbed] });
		}
		// Captcha failure is already handled in enforceAntiCheatAction
		return;
	}

	const [workError, work] = await orpc.users.stats.work.claim({
		userId: dbUser.id,
		boostCount,
	});

	if (workError) {
		console.error("Error executing work command:", workError);

		// Check for economy ban
		if ("code" in workError && workError.code === "ECONOMY_BANNED") {
			const errorEmbed = createErrorEmbed(
				"Přístup k ekonomice pozastaven",
				"Tvůj přístup k ekonomickým příkazům byl dočasně pozastaven kvůli podezřelé aktivitě.\n\nPokud si myslíš, že jde o chybu, kontaktuj administrátory.",
			);
			await interaction.editReply({ embeds: [errorEmbed] });
			return;
		}

		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se dokončit práci. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Determine if this work triggers a story (chance-based if enabled)
	// Check: global setting enabled AND user setting enabled AND chance roll succeeds
	const userStoryEnabled = isStoryWorkEnabled(interaction.user.id);
	const workSettings = getWorkSettings();
	const storyChancePercent = workSettings.storyChancePercent;
	const shouldTriggerStory =
		WORK_CONFIG.storyWorkEnabled &&
		userStoryEnabled &&
		getSecureRandomIndex(100) < storyChancePercent;

	// Determine if AI story should be used (based on aiStoryChancePercent setting)
	const shouldUseAIStory = shouldTriggerStory && workSettings.aiStoryEnabled && getSecureRandomIndex(100) < workSettings.aiStoryChancePercent;

	// Filter activities based on story trigger
	// For /work: only work:* categories for regular activities, only story:work for story trigger
	const availableActivities = shouldTriggerStory
		? workActivities.filter((act) => {
				// Only story:work category (work-appropriate stories only)
				if (typeof act === "function") return false;
				return act.category === "story:work" && act.branchingStoryId !== undefined;
		  })
		: workActivities.filter((act) => {
				// Only work:* categories (no stories)
				if (typeof act === "function") {
					// Dynamic activities - assume work:misc
					return true;
				}
				return act.category.startsWith("work:");
		  });

	// Select random activity
	const _activity = selectRandomActivity(availableActivities, interaction.member as GuildMember);
	if (!_activity) {
		await interaction.editReply({
			content: "❌ Nepodařilo se vybrat aktivitu. Zkuste to později.",
		});
		return;
	}

	const activity = _activity;

	// Use the shared handler to display rewards
	await handleRewardResponse(work as RewardResponse, {
		interaction,
		createMainEmbed: () => {
			const { earnedTotalCoins, earnedTotalXp, boostCoinsBonus, boostXpBonus } = work.claimStats;

			// Calculate display values (without boost)
			const displayCoins = earnedTotalCoins - boostCoinsBonus;
			const displayXp = earnedTotalXp - boostXpBonus;

			// For AI stories, show generic message since the story content is generated separately
			const activityTitle = shouldUseAIStory ? "🤖 AI Příběh" : activity.title;
			const activityText = shouldUseAIStory ? "Generuji unikátní příběh jen pro tebe..." : activity.activity;

			const embed = createUradPraceEmbed().addFields(
				{
					name: activityTitle,
					value: activityText,
				},
				{
					name: "🪙 Získané mince",
					value: `+${displayCoins}`,
					inline: true,
				},
				{
					name: "⭐ Získané XP",
					value: `+${displayXp}`,
					inline: true,
				},
			);

			// Add boost bonus fields if user is a booster
			if (work.claimStats.boostCoinsBonus > 0 || work.claimStats.boostXpBonus > 0) {
				const boostPercentage = Math.round((work.claimStats.boostMultiplier - 1) * 100);
				embed.addFields(
					{
						name: "\u200B", // Empty field to force new row
						value: "\u200B",
						inline: true,
					},
					{
						name: "💜 Boost mincí",
						value: `+${work.claimStats.boostCoinsBonus} (${boostPercentage}%)`,
						inline: true,
					},
					{
						name: "💜 Boost XP",
						value: `+${work.claimStats.boostXpBonus} (${boostPercentage}%)`,
						inline: true,
					},
					{
						name: "\u200B", // Empty field to force new row
						value: "\u200B",
						inline: true,
					},
				);
			}

			// Add level progress if available
			if (work.levelProgress) {
				addLevelProgressField(embed, work.levelProgress);
			}

			// Set footer with economy info
			embed.setFooter(
				createEconomyFooter(work.updatedStats.coinsCount, work.levelProgress.currentLevel, work.updatedStats.workCount),
			);

			return embed;
		},
	});

	// Check for 23-works-in-a-day achievement
	try {
		const [countError, todayCount] = await orpc.users.stats.work.todayCount({ userId: dbUser.id });

		if (!countError && todayCount.count === 23) {
			// User just completed their 23rd work today! Grant achievement
			const [rewardError, rewardResult] = await orpc.users.stats.reward.grant({
				userId: dbUser.id,
				coins: 2500,
				xp: 250,
				activityType: "work_milestone_23",
				notes: "Completed 23 works in a single day",
			});

			if (!rewardError && rewardResult) {
				// Use the shared handler to properly handle level ups
				await handleRewardResponse(rewardResult, {
					interaction,
					createMainEmbed: () => {
						return createUradPraceEmbed()
							.setTitle("🏆 ACHIEVEMENT UNLOCKED: Workaholic!")
							.setDescription(
								`Dokončil jsi 23 prací za jediný den!\n\n` +
								`**Odměna za úspěch:**\n` +
								`🪙 **+2500** mincí\n` +
								`⭐ **+250** XP`
							)
							.setColor(0xFFD700) // Gold color for achievements
							.setThumbnail("https://cdn.discordapp.com/emojis/1326286362760187944.png")
							.setFooter(
								createEconomyFooter(
									rewardResult.updatedStats.coinsCount,
									rewardResult.levelProgress.currentLevel,
									work.updatedStats.workCount,
								),
							);
					},
				});
			}
		}
	} catch (error) {
		console.error("Error checking/granting 23-work achievement:", error);
		// Don't fail the whole command if achievement check fails
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

			await interaction.followUp({
				embeds: [storyEmbed],
				components: buttons.map((row) => row.toJSON()),
				flags: MessageFlags.Ephemeral,
			});
		} else {
			const storyEmbed = createInteraktivniPribehEmbed()
				.setTitle(`${story.emoji} ${story.title}`)
				.setDescription(storyResult.narrative);

			await interaction.followUp({
				embeds: [storyEmbed],
				flags: MessageFlags.Ephemeral,
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

					await interaction.followUp({
						embeds: [storyEmbed],
						components: buttons.map((row) => row.toJSON()),
						flags: MessageFlags.Ephemeral,
					});
				}
			} else {
				console.error("[Work] AI story generation failed:", aiResult.error);
				// Fallback to written story if available
				if (activity.branchingStoryId) {
					const story = storyEngine.getStory(activity.branchingStoryId);
					if (story) {
						await startAndDisplayStory(activity.branchingStoryId, story);
					}
				}
			}
		} catch (error) {
			console.error("[Work] Error with AI story:", error);
			// Fallback to written story
			if (activity.branchingStoryId) {
				const story = storyEngine.getStory(activity.branchingStoryId);
				if (story) {
					await startAndDisplayStory(activity.branchingStoryId, story);
				}
			}
		}
	} else if (activity.branchingStoryId) {
		// Use written branching story
		try {
			const storyId = activity.branchingStoryId;
			const story = storyEngine.getStory(storyId);

			if (!story) {
				console.error(`Branching story not found: ${storyId}`);
			} else {
				await startAndDisplayStory(storyId, story);
			}
		} catch (error) {
			console.error(`Error starting branching story ${activity.branchingStoryId}:`, error);
		}
	}

	// Record successful command completion for anti-cheat
	await orpc.users.anticheat.trust.update({
		userId: dbUser.id,
		guildId: antiCheatContext.guildId,
		delta: +1,
		reason: "Successful work command",
	});
};

export const workActivities = [
	// ============================================================================
	// WORK:MISC - Miscellaneous work activities
	// ============================================================================
	{
		id: "wolt-delivery",
		title: "<:SIOVINA:1385697830718673076> Kurýr",
		activity: "Dovezli jste sionzeemu Wolt",
		category: "work:misc",
	},
	{
		id: "car-tires",
		title: "🛞 Automechanik",
		activity: "Přezuli jste firemní auto",
		category: "work:misc",
	},
	{
		id: "really-trap",
		title: "Zvěd",
		activity: "Klikli jste na [tento odkaz](https://www.youtube.com/watch?v=dQw4w9WgXcQ).",
		category: "work:misc",
	},
	{
		id: "wrong-elections",
		title: "🗳️ Smutný Občan",
		activity: "Šli jste volit, ale omylem jste odvolili Babiše.",
		category: "work:misc",
	},
	((_member: GuildMember) => ({
		id: "homosexual-test",
		title: "🏳️‍🌈 Testovaný",
		activity: "Absolvovali jste homosexuální test. Výsledek: " + (Math.random() < 0.90 ? "negativní" : "pozitivní") + ".",
		category: "work:misc" as const,
	})),
	// ============================================================================
	// WORK:COMMUNITY - Discord/community specific activities
	// ============================================================================
	{
		id: "urbex-report",
		title: ":police_car: Občanská hlídka",
		activity: "Nahlásili jste na policii [lidi co byli](https://www.youtube.com/@phntmvsn) na urbexu",
		category: "work:community",
	},
	{
		id: "streamer-watch",
		title: ":camera: Prokrastinátor",
		activity: "Zkoukli jste [nejpopulárnějšího streamera](https://www.twitch.tv/korspeeddash) v ČR",
		category: "work:community",
	},
	{
		id: "fire-wemod",
		title: ":fire: :ocean: Herní podvodník",
		activity: "Použili jste wemod a dostali jste achievement ohnivé vody",
		category: "work:community",
	},
	{
		id: "dual-pc-stream",
		title: "🎥 Streamer",
		activity: "Nastavili jste si dual-PC stream a streamovali na Twitchi. [(patří to do modré dírky!)](https://www.twitch.tv/poloaf)",
		category: "work:community",
	},
	{
		id: "too-much-maggi",
		title: "👨‍🍳 Maggi Profesionál",
		activity: "Snědli jste příliš mnoho Maggi. (Nyní jste [skutečný Sensei](https://www.twitch.tv/sensei_ladik)!)",
		category: "work:community",
	},
	{
		id: "complaint-about-work",
		title: "📝 Stěžovatel",
		activity: "Stěžovali jste si, že /work vyžaduje captchu.",
		category: "work:community",
	},
	// ============================================================================
	// WORK:OFFICE - Generic office activities
	// ============================================================================
	{
		id: "employment-office",
		title: ":bank: Úředník",
		activity: "Byli jste na úřadu práce",
		category: "work:office",
	},
	{
		id: "geoguessr-boss",
		title: ":airplane: Týmový hráč",
		activity: "Hráli jste geoguessr se šéfem",
		category: "work:office",
	},
	{
		id: "twitter-post",
		title: "🐦 Social Media Manager",
		activity: "Napsali jste post na firemní twitter",
		category: "work:office",
	},
	{
		id: "expense-receipts",
		title: "💸 Účetní asistent",
		activity: "Dodali jste účtenky z pracovní cesty účetní",
		category: "work:office",
	},
	{
		id: "desk-assembly",
		title: "🪛 Montér nábytku",
		activity: "Postavili jste novému kolegovi stůl",
		category: "work:office",
	},
	{
		id: "office-mess",
		title: "🧻 Kancelářský rebel",
		activity: "Pořádně jste dali zabrat uklízečce",
		category: "work:office",
	},
	{
		id: "team-lunch",
		title: "🌯 Týmový kolega",
		activity: "Zašli jste si s kolegy na obídek",
		category: "work:office",
	},
	{
		id: "quarterly-goals",
		title: "🎯 Top performer",
		activity: "Splnili jste kvartálové cíle",
		category: "work:office",
	},
	{
		id: "coffee-fetcher",
		title: "☕ Poslíček",
		activity: "Přinesli jste šéfovi kávu.",
		category: "work:office",
	},
	{
		id: "meeting-attendee",
		title: "📅 Účastník schůzky",
		activity: "Zúčastnili jste se nekonečné schůzky, která mohla být e-mailem.",
		category: "work:office",
	},
	{
		id: "paperwork",
		title: "🗂️ Administrátor",
		activity: "Vyplnili jste hromadu papírování.",
		category: "work:office",
	},
	{
		id: "coffee-break",
		title: "☕ Kávová pauza",
		activity: "Dali jste si kávovou pauzu.",
		category: "work:office",
	},
	{
		id: "printer-jam",
		title: "🖨️ Tiskárnový technik",
		activity: "Strávili jste hodinu opravováním zaseknuté tiskárny. Nakonec jste zjistili, že někdo tam nacpal sendvič.",
		category: "work:office",
	},
	{
		id: "excel-wizard",
		title: "📊 Excel Čaroděj",
		activity: "Vytvořili jste v Excelu tak složitou tabulku s makry, že ani vy sami nevíte, jak funguje. Kolegové vás teď uctívají jako boha.",
		category: "work:office",
	},
	{
		id: "parking-lot-drama",
		title: "🚗 Parkovací diplomacie",
		activity: "Někdo vám zabral místo na parkování. Po dvouhodinovém vyjednávání jste dosáhli mírové dohody a teď máte nového nejlepšího přítele.",
		category: "work:office",
	},
	{
		id: "email-chain",
		title: "📧 E-mailový maraton",
		activity: "Odpověděli jste na e-mail, který měl 47 lidí v kopii. Teď máte ve schránce 200 odpovědí 'Díky!' a 'Souhlasím'.",
		category: "work:office",
	},
	{
		id: "office-plant-care",
		title: "🌱 Kancelářský zahradník",
		activity: "Ujali jste se umírající kancelářské rostliny. Po týdnu péče zjistila, že je to plastová květina. Stejně jste na ni hrdí.",
		category: "work:office",
	},
	{
		id: "keyboard-cleaning",
		title: "⌨️ Archeologický průzkum",
		activity: "Vyčistili jste klávesnici. Pod klávesami jste našli drobky z roku 2019, tři kancelářské sponky a jeden zub.",
		category: "work:office",
	},
	{
		id: "air-conditioning-war",
		title: "❄️ Klimatický válečník",
		activity: "Vyhráli jste bitvu o termostat. Nastavili jste 23°C a teď hlídáte ovladač jako poklad. Kolegové plánují převrat.",
		category: "work:office",
	},
	{
		id: "zoom-background",
		title: "🏝️ Virtuální cestovatel",
		activity: "Strávili jste celý den hledáním perfektního pozadí pro videohovory. Nakonec jste zvolili pláž na Bali, i když jste nikdy nebyli dál než v Brně.",
		category: "work:office",
	},
	{
		id: "password-reset",
		title: "🔐 Bezpečnostní specialista",
		activity: "Resetovali jste heslo potřetí tento týden. Nové heslo je 'UzSiToZapomatnuZase123!' a napsali jste si ho na lísteček pod klávesnici.",
		category: "work:office",
	},
	{
		id: "standing-desk",
		title: "🧍 Ergonomický průkopník",
		activity: "Přesvědčili jste firmu, že potřebujete stojací stůl pro zdraví. Teď u něj stojíte přesně 5 minut denně a zbytek sedíte na židli vedle.",
		category: "work:office",
	},
	{
		id: "slack-status",
		title: "💬 Statusový umělec",
		activity: "Strávili jste půl hodiny vybíráním perfektního emoji pro váš Slack status. Zvolili jste 🔥, protože dnes jste prostě on fire.",
		category: "work:office",
	},
	{
		id: "meeting-notes",
		title: "📝 Zapisovatel legend",
		activity: "Psali jste zápis ze schůzky. Z dvouhodinového jednání jste vytvořili tři body a jeden z nich je 'další schůzka příští týden'.",
		category: "work:office",
	},
	{
		id: "office-fridge-cleanup",
		title: "🧊 Ledničkový archeolog",
		activity: "Vyčistili jste firemní ledničku. Našli jste jogurt z roku 2022, který už měl vlastní ekosystém a zřejmě i volební právo.",
		category: "work:office",
	},
	{
		id: "cable-management",
		title: "🔌 Kabelový architekt",
		activity: "Organizovali jste kabely pod stolem. Po třech hodinách vypadají perfektně. Za týden budou zase jako špagety.",
		category: "work:office",
	},
	{
		id: "microwave-incident",
		title: "💥 Mikrovlnný incident",
		activity: "Ohřáli jste si oběd v mikrovlnce. Rybí curry teď voní celá kancelář a kolegové vám věnují vražedné pohledy.",
		category: "work:office",
	},
	{
		id: "elevator-pitch",
		title: "🛗 Výtahový řečník",
		activity: "Potkali jste CEO ve výtahu a on se zeptal, na čem pracujete. Odpověděli jste 'věci' a vystoupili o tři patra dřív.",
		category: "work:office",
	},
	{
		id: "wifi-troubleshooter",
		title: "📶 Wi-Fi šaman",
		activity: "Opravili jste Wi-Fi v zasedačce. Tajemství? Restartovali jste router. Teď vás všichni považují za technického génia.",
		category: "work:office",
	},
	{
		id: "birthday-cake",
		title: "🎂 Oslavenec dne",
		activity: "Koupili jste dort pro kolegu, který má narozeniny. Snědli jste tři kousky 'na ochutnávku' cestou do práce.",
		category: "work:office",
	},
	{
		id: "desk-neighbor-drama",
		title: "🎧 Sluchátkový diplomat",
		activity: "Váš soused u stolu celý den telefonuje nahlas. Nasadili jste sluchátka a teď předstíráte, že pracujete, zatímco posloucháte podcast.",
		category: "work:office",
	},
	{
		id: "office-supplies-heist",
		title: "🖊️ Zásobovací agent",
		activity: "Vzali jste si z kanceláře domů pár propisek. A sešívačku. A bločky. A toner. V podstatě jste vykradli sklad.",
		category: "work:office",
	},
	{
		id: "monday-motivation",
		title: "📅 Pondělní válečník",
		activity: "Přežili jste pondělí. To je úspěch sám o sobě. Odměnili jste se třetí kávou a pátou návštěvou automatu.",
		category: "work:office",
	},
	{
		id: "friday-countdown",
		title: "🕐 Páteční odpočítávač",
		activity: "Je pátek odpoledne. Sledujete hodiny a počítáte minuty do konce pracovní doby. Produktivita: přibližně nula.",
		category: "work:office",
	},
	{
		id: "team-building-survivor",
		title: "🏕️ Teambuilding veterán",
		activity: "Přežili jste firemní teambuilding. Hráli jste hry na důvěru a teď víte, že kolegům rozhodně nedůvěřujete.",
		category: "work:office",
	},
	// ============================================================================
	// WORK:DEV - Developer/tech activities
	// ============================================================================
	{
		id: "is-it-a-trap",
		title: "Životní praxe",
		activity: "Učili jste svého kamaráda programovat, aby Vám na oplátku pomáhal.",
		category: "work:dev",
	},
	{
		id: "bug-hunter",
		title: "🐛 Bug Hunter",
		activity: "Nahlásili jste chybu vývojářům bota.",
		category: "work:dev",
	},
	{
		id: "feature-suggester",
		title: "💡 Inovátor",
		activity: "Navrhli jste novou funkci pro bota.",
		category: "work:dev",
	},
	{
		id: "discord-bot-developer",
		title: "🤖 Vývojář bota",
		activity: "Pracovali jste na vývoji tohoto bota.",
		category: "work:dev",
	},
	{
		id: "documentation-writer",
		title: "📚 Dokumentační hrdina",
		activity: "Napsali jste dokumentaci k projektu. Je to první dokumentace za 5 let a kolegové se na vás dívají jako na zachránce lidstva.",
		category: "work:dev",
	},
	{
		id: "code-review-marathon",
		title: "👀 Code Review mistr",
		activity: "Dělali jste code review kolegovi. Napsali jste 47 komentářů, z toho 45 bylo 'přidej mezeru tady'. Jste hrdý strážce kvality.",
		category: "work:dev",
	},
	{
		id: "git-merge-conflict",
		title: "🔀 Merge Conflict válečník",
		activity: "Řešili jste merge conflict hodinu. Nakonec jste smazali oba soubory a napsali to znovu. Čistý start je nejlepší řešení.",
		category: "work:dev",
	},
	{
		id: "production-deployment",
		title: "🚀 Deploy hrdina",
		activity: "Deployovali jste na produkci v pátek v 16:59. Všichni kolem křičeli 'NE!', ale vy jste to udělali. A fungovalo to. Tentokrát.",
		category: "work:dev",
	},
	{
		id: "standup-meeting",
		title: "🧍‍♂️ Standup přeživší",
		activity: "Byli jste na standupě, který trval 45 minut místo 15. Diskutovali jste o úkolu, který jste měli dokončit včera. Dokončíte ho zítra.",
		category: "work:dev",
	},
	{
		id: "stackoverflow-hero",
		title: "🦸 StackOverflow hrdina",
		activity: "Odpověděli jste na otázku na StackOverflow. Dostali jste -3 body, protože to prý byl duplicitní dotaz z roku 2009.",
		category: "work:dev",
	},
	{
		id: "vpn-troubles",
		title: "🔒 VPN bojovník",
		activity: "Bojovali jste s VPN půl hodiny. Nakonec jste zjistili, že jste měli Caps Lock zapnutý. Heslo fungovalo celou dobu.",
		category: "work:dev",
	},
	{
		id: "legacy-code-archaeologist",
		title: "🦕 Legacy Code archeolog",
		activity: "Našli jste v kódu komentář 'TODO: opravit - 2015'. Netkli jste se toho. Některé věci je lepší nechat být.",
		category: "work:dev",
	},
	{
		id: "hotfix-hero",
		title: "🔧 Hotfix záchranář",
		activity: "Opravili jste kritický bug v produkci. Trvalo to 5 minut. Tři hodiny předtím jste hledali, kde je problém. Klasika.",
		category: "work:dev",
	},
	{
		id: "daily-scrum-master",
		title: "🎭 Scrum Performer",
		activity: "Na daily standupu jste řekli 'včera jsem pracoval na tom samém, dnes budu pokračovat'. Nikdo se neptal na detaily. Úspěch.",
		category: "work:dev",
	},
	{
		id: "jira-ticket-creator",
		title: "🎫 JIRA Umělec",
		activity: "Vytvořili jste JIRA ticket. Popis: 'Opravit to'. Priorita: Kritická. Řešení: Nikdy nebude hotovo, ale ticket existuje.",
		category: "work:dev",
	},
	{
		id: "docker-container-wrangler",
		title: "🐳 Docker krotitel",
		activity: "Spustili jste Docker kontejnery. Po třech pokusech a dvou restartů počítače to konečně běží. Nevíte proč, ale běží to.",
		category: "work:dev",
	},
	{
		id: "npm-install-meditation",
		title: "📦 NPM Install meditace",
		activity: "Spustili jste npm install a čekali 10 minut. Během čekání jste přemýšleli o smyslu života a závislostí JavaScriptu.",
		category: "work:dev",
	},
	{
		id: "regex-wizard",
		title: "🧙 Regex čaroděj",
		activity: "Napsali jste regulární výraz. Funguje. Nevíte jak. Nikdy se toho nedotknete, protože by se rozbil. Je to magie.",
		category: "work:dev",
	},
	{
		id: "tech-debt-collector",
		title: "💳 Tech Debt vymahač",
		activity: "Slíbili jste, že příští sprint opravíte technický dluh. Oba víte, že se to nestane. Ale máte to v backlogu. To se počítá.",
		category: "work:dev",
	},
	{
		id: "localhost-works",
		title: "💻 Localhost fenomén",
		activity: "'Na mém počítači to funguje' jste řekli třikrát dnes. Kolegové vás nenávidí. Ale máte pravdu. U vás to fakt funguje.",
		category: "work:dev",
	},
	// ============================================================================
	// STORY:WORK - Work-related branching stories
	// ============================================================================
	{
		id: "christmas-party-branching",
		title: "🎄 Interaktivní vánoční večírek",
		activity: "Účastníš se vánočního večírku... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "christmas_party_branching",
	},
	{
		id: "client-meeting-branching",
		title: "💼 Interaktivní schůzka",
		activity: "Máš důležitou schůzku s potenciálním klientem... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "client_meeting_branching",
	},
	{
		id: "coffee-machine-branching",
		title: "☕ Interaktivní kávovar",
		activity: "Pokoušíš se ovládnout nový super-automatický kávovar... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "coffee_machine_branching",
	},
	{
		id: "friday-deploy-branching",
		title: "🚀 Interaktivní páteční deploy",
		activity: "Je pátek odpoledne a ty mačkáš DEPLOY... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "friday_deploy_branching",
	},
	{
		id: "hackathon-branching",
		title: "🏆 Interaktivní hackathon",
		activity: "Účastníš se 48hodinového hackathonu... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "hackathon_branching",
	},
	{
		id: "it-support-branching",
		title: "💻 Interaktivní IT podpora",
		activity: "Pomáháš kolegovi s jeho počítačem... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "it_support_branching",
	},
	{
		id: "job-interview-branching",
		title: "📋 Interaktivní pohovor",
		activity: "Vedeš pohovor s kandidátem na pozici junior developera... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "job_interview_branching",
	},
	{
		id: "office-prank-branching",
		title: "🎉 Interaktivní žertík",
		activity: "Děláš kolegovi žertík s jeho počítačem... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "office_prank_branching",
	},
	{
		id: "server-room-branching",
		title: "🖥️ Interaktivní serverovna",
		activity: "Vstupuješ do serverovny opravit blikající server... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "server_room_branching",
	},
	{
		id: "video-conference-branching",
		title: "📡 Interaktivní videokonference",
		activity: "Připojuješ se na videokonferenci s indickými kolegy... (interaktivní příběh)",
		category: "story:work",
		branchingStoryId: "video_conference_branching",
	},
	// ============================================================================
	// STORY:CRIME - Theft/moral choice stories
	// ============================================================================
	{
		id: "stolen-money-branching",
		title: "💰 Interaktivní příběh",
		activity: "Procházíš parkem, když si všimneš starší paní s peněženkou... (interaktivní příběh)",
		category: "story:crime",
		branchingStoryId: "stolen_money_branching",
	},
	{
		id: "lunch-thief-branching",
		title: "🍱 Interaktivní zloděj obědů",
		activity: "Někdo ti ukradl oběd z ledničky! Čas na vyšetřování... (interaktivní příběh)",
		category: "story:crime",
		branchingStoryId: "lunch_thief_branching",
	},
	// ============================================================================
	// STORY:ADVENTURE - Random/fun adventure stories
	// ============================================================================
	{
		id: "elections-candidate-branching",
		title: "🗳️ Interaktivní volby",
		activity: "Kandiduješ ve volbách do parlamentu... (interaktivní příběh)",
		category: "story:adventure",
		branchingStoryId: "elections_candidate_branching",
	},
	{
		id: "elevator-stuck-branching",
		title: "🛗 Interaktivní výtah",
		activity: "Zasekl ses ve výtahu s někým zajímavým... (interaktivní příběh)",
		category: "story:adventure",
		branchingStoryId: "elevator_stuck_branching",
	},
	{
		id: "reveal-cheating-branching",
		title: "🕵️ Interaktivní detektiv",
		activity: "Odhalil jsi podvádění na Discord příkazech... (interaktivní příběh)",
		category: "story:adventure",
		branchingStoryId: "reveal_cheating_branching",
	},
] as const satisfies readonly Activity[];

// Derived from activities - no manual maintenance needed
export const storyActivityIds = new Set(
	(workActivities as readonly Activity[])
		.filter((act): act is BaseActivity =>
			typeof act !== "function" &&
			"branchingStoryId" in act && act.branchingStoryId !== undefined
		)
		.map((act) => act.id)
);
