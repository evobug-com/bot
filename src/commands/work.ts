import {ChatInputCommandBuilder, type GuildMember, MessageFlags} from "discord.js";
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

/** Base activity definition */
interface BaseActivity {
	id: string;
	title: string;
	activity: string;
	/** ID of branching story (Mass Effect-style interactive) */
	branchingStoryId?: string;
}

/** Dynamic activity that generates based on member context */
type DynamicActivity = (member: GuildMember) => BaseActivity;

/** Activity can be static or dynamic */
type Activity = BaseActivity | DynamicActivity;

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
	const shouldTriggerStory =
		WORK_CONFIG.storyWorkEnabled &&
		userStoryEnabled &&
		getSecureRandomIndex(100) < WORK_CONFIG.storyChancePercent;

	// Filter activities based on story trigger
	const availableActivities = shouldTriggerStory
		? workActivities.filter((act) => {
				const actId = typeof act === "function" ? null : act.id;
				return actId !== null && storyActivityIds.has(actId);
		  })
		: workActivities.filter((act) => {
				const actId = typeof act === "function" ? null : act.id;
				return actId === null || !storyActivityIds.has(actId);
		  });

	// Select work activity using crypto with rejection sampling for unbiased randomness
	const randomIndex = getSecureRandomIndex(availableActivities.length);
	const _activity = availableActivities[randomIndex];
	if (!_activity) {
		await interaction.editReply({
			content: "❌ Nepodařilo se vybrat aktivitu. Zkuste to později.",
		});
		return;
	}

	let activity: BaseActivity;
	if(typeof _activity === "function") {
		activity = _activity(interaction.member as GuildMember);
	} else {
		activity = _activity;
	}

	// Use the shared handler to display rewards
	await handleRewardResponse(work as RewardResponse, {
		interaction,
		createMainEmbed: () => {
			const { earnedTotalCoins, earnedTotalXp, boostCoinsBonus, boostXpBonus } = work.claimStats;

			// Calculate display values (without boost)
			const displayCoins = earnedTotalCoins - boostCoinsBonus;
			const displayXp = earnedTotalXp - boostXpBonus;

			const embed = createUradPraceEmbed().addFields(
				{
					name: activity.title,
					value: activity.activity,
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

	// Check if this activity has a branching story (Mass Effect-style interactive)
	if (activity.branchingStoryId) {
		try {
			const storyId = activity.branchingStoryId;
			const story = storyEngine.getStory(storyId);

			if (!story) {
				console.error(`Branching story not found: ${storyId}`);
				// Fallback: just show the work reward, no story
			} else {
				// Start the branching story session
				const storyResult = await storyEngine.startStory(storyId, {
					discordUserId: interaction.user.id,
					dbUserId: dbUser.id,
					messageId: "", // Will be set after sending
					channelId: interaction.channelId ?? "",
					guildId: interaction.guildId ?? "",
					userLevel: work.levelProgress.currentLevel,
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
						.setFooter({ text: "Vyber si svou cestu..." });

					// Send the story with buttons (ephemeral - only the user sees the choices)
					await interaction.followUp({
						embeds: [storyEmbed],
						components: buttons.map((row) => row.toJSON()),
						flags: MessageFlags.Ephemeral,
					});
				} else {
					// Something went wrong, just show narrative without buttons
					const storyEmbed = createInteraktivniPribehEmbed()
						.setTitle(`${story.emoji} ${story.title}`)
						.setDescription(storyResult.narrative);

					await interaction.followUp({
						embeds: [storyEmbed],
						flags: MessageFlags.Ephemeral,
					});
				}
			}
		} catch (error) {
			console.error(`Error starting branching story ${activity.branchingStoryId}:`, error);
			// Don't fail the whole command if story fails
			// User already got their base work reward
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
	{
		id: "wolt-delivery",
		title: "<:SIOVINA:1385697830718673076> Kurýr",
		activity: "Dovezli jste sionzeemu Wolt",
	},
	{
		id: "employment-office",
		title: ":bank: Úředník",
		activity: "Byli jste na úřadu práce",
	},
	{
		id: "geoguessr-boss",
		title: ":airplane: Týmový hráč",
		activity: "Hráli jste geoguessr se šéfem",
	},
	{
		id: "twitter-post",
		title: "🐦 Social Media Manager",
		activity: "Napsali jste post na firemní twitter",
	},
	{
		id: "expense-receipts",
		title: "💸 Účetní asistent",
		activity: "Dodali jste účtenky z pracovní cesty účetní",
	},
	{
		id: "car-tires",
		title: "🛞 Automechanik",
		activity: "Přezuli jste firemní auto",
	},
	{
		id: "desk-assembly",
		title: "🪛 Montér nábytku",
		activity: "Postavili jste novému kolegovi stůl",
	},
	{
		id: "office-mess",
		title: "🧻 Kancelářský rebel",
		activity: "Pořádně jste dali zabrat uklízečce",
	},
	{
		id: "team-lunch",
		title: "🌯 Týmový kolega",
		activity: "Zašli jste si s kolegy na obídek",
	},
	{
		id: "quarterly-goals",
		title: "🎯 Top performer",
		activity: "Splnili jste kvartálové cíle",
	},
	{
		id: "urbex-report",
		title: ":police_car: Občanská hlídka",
		activity: "Nahlásili jste na policii [lidi co byli](https://www.youtube.com/@phntmvsn) na urbexu",
	},
	{
		id: "streamer-watch",
		title: ":camera: Prokrastinátor",
		activity: "Zkoukli jste [nejpopulárnějšího streamera](https://www.twitch.tv/korspeeddash) v ČR",
	},
	{
		id: "fire-wemod",
		title: ":fire: :ocean: Herní podvodník",
		activity: "Použili jste wemod a dostali jste achievement ohnivé vody",
	},
	{
		id: "is-it-a-trap",
		title: "Životní praxe",
		activity: "Učili jste svého kamaráda programovat, aby Vám na oplátku pomáhal.",
	},
	{
		id: "dual-pc-stream",
		title: "🎥 Streamer",
		activity:
			"Nastavili jste si dual-PC stream a streamovali na Twitchi. [(patří to do modré dírky!)](https://www.twitch.tv/poloaf)",
	},
	{
		id: "too-much-maggi",
		title: "👨‍🍳 Maggi Profesionál",
		activity: "Snědli jste příliš mnoho Maggi. (Nyní jste [skutečný Sensei](https://www.twitch.tv/sensei_ladik)!)",
	},
	{
		id: "really-trap",
		title: "Zvěd",
		activity: "Klikli jste na [tento odkaz](https://www.youtube.com/watch?v=dQw4w9WgXcQ).",
	},
	{
		id: "bug-hunter",
		title: "🐛 Bug Hunter",
		activity: "Nahlásili jste chybu vývojářům bota.",
	},
	{
		id: "feature-suggester",
		title: "💡 Inovátor",
		activity: "Navrhli jste novou funkci pro bota.",
	},
	{
		id: "complaint-about-work",
		title: "📝 Stěžovatel",
		activity: "Stěžovali jste si, že /work vyžaduje captchu.",
	},
	(_member: GuildMember) => {
		const outcome = Math.random() < 0.90 ? "negativní" : "pozitivní";
		return {
			id: "homosexual-test",
			title: "🏳️‍🌈 Testovaný",
			activity: "Absolvovali jste homosexuální test. Výsledek: " + outcome + ".",
		}
	},
	{
		id: "stolen-money-branching",
		title: "💰 Interaktivní příběh",
		activity: "Procházíš parkem, když si všimneš starší paní s peněženkou... (interaktivní příběh)",
		branchingStoryId: "stolen_money_branching",
	},
	{
		id: "christmas-party-branching",
		title: "🎄 Interaktivní vánoční večírek",
		activity: "Účastníš se vánočního večírku... (interaktivní příběh)",
		branchingStoryId: "christmas_party_branching",
	},
	{
		id: "client-meeting-branching",
		title: "💼 Interaktivní schůzka",
		activity: "Máš důležitou schůzku s potenciálním klientem... (interaktivní příběh)",
		branchingStoryId: "client_meeting_branching",
	},
	{
		id: "coffee-machine-branching",
		title: "☕ Interaktivní kávovar",
		activity: "Pokoušíš se ovládnout nový super-automatický kávovar... (interaktivní příběh)",
		branchingStoryId: "coffee_machine_branching",
	},
	{
		id: "elections-candidate-branching",
		title: "🗳️ Interaktivní volby",
		activity: "Kandiduješ ve volbách do parlamentu... (interaktivní příběh)",
		branchingStoryId: "elections_candidate_branching",
	},
	{
		id: "elevator-stuck-branching",
		title: "🛗 Interaktivní výtah",
		activity: "Zasekl ses ve výtahu s někým zajímavým... (interaktivní příběh)",
		branchingStoryId: "elevator_stuck_branching",
	},
	{
		id: "friday-deploy-branching",
		title: "🚀 Interaktivní páteční deploy",
		activity: "Je pátek odpoledne a ty mačkáš DEPLOY... (interaktivní příběh)",
		branchingStoryId: "friday_deploy_branching",
	},
	{
		id: "hackathon-branching",
		title: "🏆 Interaktivní hackathon",
		activity: "Účastníš se 48hodinového hackathonu... (interaktivní příběh)",
		branchingStoryId: "hackathon_branching",
	},
	{
		id: "it-support-branching",
		title: "💻 Interaktivní IT podpora",
		activity: "Pomáháš kolegovi s jeho počítačem... (interaktivní příběh)",
		branchingStoryId: "it_support_branching",
	},
	{
		id: "job-interview-branching",
		title: "📋 Interaktivní pohovor",
		activity: "Vedeš pohovor s kandidátem na pozici junior developera... (interaktivní příběh)",
		branchingStoryId: "job_interview_branching",
	},
	{
		id: "lunch-thief-branching",
		title: "🍱 Interaktivní zloděj obědů",
		activity: "Někdo ti ukradl oběd z ledničky! Čas na vyšetřování... (interaktivní příběh)",
		branchingStoryId: "lunch_thief_branching",
	},
	{
		id: "office-prank-branching",
		title: "🎉 Interaktivní žertík",
		activity: "Děláš kolegovi žertík s jeho počítačem... (interaktivní příběh)",
		branchingStoryId: "office_prank_branching",
	},
	{
		id: "reveal-cheating-branching",
		title: "🕵️ Interaktivní detektiv",
		activity: "Odhalil jsi podvádění na Discord příkazech... (interaktivní příběh)",
		branchingStoryId: "reveal_cheating_branching",
	},
	{
		id: "server-room-branching",
		title: "🖥️ Interaktivní serverovna",
		activity: "Vstupuješ do serverovny opravit blikající server... (interaktivní příběh)",
		branchingStoryId: "server_room_branching",
	},
	{
		id: "video-conference-branching",
		title: "📡 Interaktivní videokonference",
		activity: "Připojuješ se na videokonferenci s indickými kolegy... (interaktivní příběh)",
		branchingStoryId: "video_conference_branching",
	},
	{
		id: "wrong-elections",
		title: "🗳️ Smutný Občan",
		activity: "Šli jste volit, ale omylem jste odvolili Babiše.",
	},
	{
		id: "discord-bot-developer",
		title: "🤖 Vývojář bota",
		activity: "Pracovali jste na vývoji tohoto bota.",
	},
	{
		id: "coffee-fetcher",
		title: "☕ Poslíček",
		activity: "Přinesli jste šéfovi kávu.",
	},
	{
		id: "meeting-attendee",
		title: "📅 Účastník schůzky",
		activity: "Zúčastnili jste se nekonečné schůzky, která mohla být e-mailem.",
	},
	{
		id: "paperwork",
		title: "🗂️ Administrátor",
		activity: "Vyplnili jste hromadu papírování.",
	},
	{
		id: "coffee-break",
		title: "☕ Kávová pauza",
		activity: "Dali jste si kávovou pauzu.",
	},
	{
		id: "printer-jam",
		title: "🖨️ Tiskárnový technik",
		activity: "Strávili jste hodinu opravováním zaseknuté tiskárny. Nakonec jste zjistili, že někdo tam nacpal sendvič.",
	},
	{
		id: "excel-wizard",
		title: "📊 Excel Čaroděj",
		activity: "Vytvořili jste v Excelu tak složitou tabulku s makry, že ani vy sami nevíte, jak funguje. Kolegové vás teď uctívají jako boha.",
	},
	{
		id: "parking-lot-drama",
		title: "🚗 Parkovací diplomacie",
		activity: "Někdo vám zabral místo na parkování. Po dvouhodinovém vyjednávání jste dosáhli mírové dohody a teď máte nového nejlepšího přítele.",
	},
	{
		id: "email-chain",
		title: "📧 E-mailový maraton",
		activity: "Odpověděli jste na e-mail, který měl 47 lidí v kopii. Teď máte ve schránce 200 odpovědí 'Díky!' a 'Souhlasím'.",
	},
	{
		id: "office-plant-care",
		title: "🌱 Kancelářský zahradník",
		activity: "Ujali jste se umírající kancelářské rostliny. Po týdnu péče zjistila, že je to plastová květina. Stejně jste na ni hrdí.",
	},
	{
		id: "keyboard-cleaning",
		title: "⌨️ Archeologický průzkum",
		activity: "Vyčistili jste klávesnici. Pod klávesami jste našli drobky z roku 2019, tři kancelářské sponky a jeden zub.",
	},
	{
		id: "air-conditioning-war",
		title: "❄️ Klimatický válečník",
		activity: "Vyhráli jste bitvu o termostat. Nastavili jste 23°C a teď hlídáte ovladač jako poklad. Kolegové plánují převrat.",
	},
	{
		id: "zoom-background",
		title: "🏝️ Virtuální cestovatel",
		activity: "Strávili jste celý den hledáním perfektního pozadí pro videohovory. Nakonec jste zvolili pláž na Bali, i když jste nikdy nebyli dál než v Brně.",
	},
	{
		id: "password-reset",
		title: "🔐 Bezpečnostní specialista",
		activity: "Resetovali jste heslo potřetí tento týden. Nové heslo je 'UzSiToZapomatnuZase123!' a napsali jste si ho na lísteček pod klávesnici.",
	},
	{
		id: "standing-desk",
		title: "🧍 Ergonomický průkopník",
		activity: "Přesvědčili jste firmu, že potřebujete stojací stůl pro zdraví. Teď u něj stojíte přesně 5 minut denně a zbytek sedíte na židli vedle.",
	},
	{
		id: "slack-status",
		title: "💬 Statusový umělec",
		activity: "Strávili jste půl hodiny vybíráním perfektního emoji pro váš Slack status. Zvolili jste 🔥, protože dnes jste prostě on fire.",
	},
	{
		id: "meeting-notes",
		title: "📝 Zapisovatel legend",
		activity: "Psali jste zápis ze schůzky. Z dvouhodinového jednání jste vytvořili tři body a jeden z nich je 'další schůzka příští týden'.",
	},
	{
		id: "office-fridge-cleanup",
		title: "🧊 Ledničkový archeolog",
		activity: "Vyčistili jste firemní ledničku. Našli jste jogurt z roku 2022, který už měl vlastní ekosystém a zřejmě i volební právo.",
	},
	{
		id: "cable-management",
		title: "🔌 Kabelový architekt",
		activity: "Organizovali jste kabely pod stolem. Po třech hodinách vypadají perfektně. Za týden budou zase jako špagety.",
	},
	{
		id: "microwave-incident",
		title: "💥 Mikrovlnný incident",
		activity: "Ohřáli jste si oběd v mikrovlnce. Rybí curry teď voní celá kancelář a kolegové vám věnují vražedné pohledy.",
	},
	{
		id: "elevator-pitch",
		title: "🛗 Výtahový řečník",
		activity: "Potkali jste CEO ve výtahu a on se zeptal, na čem pracujete. Odpověděli jste 'věci' a vystoupili o tři patra dřív.",
	},
	{
		id: "documentation-writer",
		title: "📚 Dokumentační hrdina",
		activity: "Napsali jste dokumentaci k projektu. Je to první dokumentace za 5 let a kolegové se na vás dívají jako na zachránce lidstva.",
	},
	{
		id: "wifi-troubleshooter",
		title: "📶 Wi-Fi šaman",
		activity: "Opravili jste Wi-Fi v zasedačce. Tajemství? Restartovali jste router. Teď vás všichni považují za technického génia.",
	},
	{
		id: "birthday-cake",
		title: "🎂 Oslavenec dne",
		activity: "Koupili jste dort pro kolegu, který má narozeniny. Snědli jste tři kousky 'na ochutnávku' cestou do práce.",
	},
	{
		id: "desk-neighbor-drama",
		title: "🎧 Sluchátkový diplomat",
		activity: "Váš soused u stolu celý den telefonuje nahlas. Nasadili jste sluchátka a teď předstíráte, že pracujete, zatímco posloucháte podcast.",
	},
	{
		id: "office-supplies-heist",
		title: "🖊️ Zásobovací agent",
		activity: "Vzali jste si z kanceláře domů pár propisek. A sešívačku. A bločky. A toner. V podstatě jste vykradli sklad.",
	},
	{
		id: "monday-motivation",
		title: "📅 Pondělní válečník",
		activity: "Přežili jste pondělí. To je úspěch sám o sobě. Odměnili jste se třetí kávou a pátou návštěvou automatu.",
	},
	{
		id: "friday-countdown",
		title: "🕐 Páteční odpočítávač",
		activity: "Je pátek odpoledne. Sledujete hodiny a počítáte minuty do konce pracovní doby. Produktivita: přibližně nula.",
	},
	{
		id: "team-building-survivor",
		title: "🏕️ Teambuilding veterán",
		activity: "Přežili jste firemní teambuilding. Hráli jste hry na důvěru a teď víte, že kolegům rozhodně nedůvěřujete.",
	},
	{
		id: "code-review-marathon",
		title: "👀 Code Review mistr",
		activity: "Dělali jste code review kolegovi. Napsali jste 47 komentářů, z toho 45 bylo 'přidej mezeru tady'. Jste hrdý strážce kvality.",
	},
	{
		id: "git-merge-conflict",
		title: "🔀 Merge Conflict válečník",
		activity: "Řešili jste merge conflict hodinu. Nakonec jste smazali oba soubory a napsali to znovu. Čistý start je nejlepší řešení.",
	},
	{
		id: "production-deployment",
		title: "🚀 Deploy hrdina",
		activity: "Deployovali jste na produkci v pátek v 16:59. Všichni kolem křičeli 'NE!', ale vy jste to udělali. A fungovalo to. Tentokrát.",
	},
	{
		id: "standup-meeting",
		title: "🧍‍♂️ Standup přeživší",
		activity: "Byli jste na standupě, který trval 45 minut místo 15. Diskutovali jste o úkolu, který jste měli dokončit včera. Dokončíte ho zítra.",
	},
	{
		id: "stackoverflow-hero",
		title: "🦸 StackOverflow hrdina",
		activity: "Odpověděli jste na otázku na StackOverflow. Dostali jste -3 body, protože to prý byl duplicitní dotaz z roku 2009.",
	},
	{
		id: "vpn-troubles",
		title: "🔒 VPN bojovník",
		activity: "Bojovali jste s VPN půl hodiny. Nakonec jste zjistili, že jste měli Caps Lock zapnutý. Heslo fungovalo celou dobu.",
	},
	{
		id: "legacy-code-archaeologist",
		title: "🦕 Legacy Code archeolog",
		activity: "Našli jste v kódu komentář 'TODO: opravit - 2015'. Netkli jste se toho. Některé věci je lepší nechat být.",
	},
	{
		id: "hotfix-hero",
		title: "🔧 Hotfix záchranář",
		activity: "Opravili jste kritický bug v produkci. Trvalo to 5 minut. Tři hodiny předtím jste hledali, kde je problém. Klasika.",
	},
	{
		id: "daily-scrum-master",
		title: "🎭 Scrum Performer",
		activity: "Na daily standupu jste řekli 'včera jsem pracoval na tom samém, dnes budu pokračovat'. Nikdo se neptal na detaily. Úspěch.",
	},
	{
		id: "jira-ticket-creator",
		title: "🎫 JIRA Umělec",
		activity: "Vytvořili jste JIRA ticket. Popis: 'Opravit to'. Priorita: Kritická. Řešení: Nikdy nebude hotovo, ale ticket existuje.",
	},
	{
		id: "docker-container-wrangler",
		title: "🐳 Docker krotitel",
		activity: "Spustili jste Docker kontejnery. Po třech pokusech a dvou restartů počítače to konečně běží. Nevíte proč, ale běží to.",
	},
	{
		id: "npm-install-meditation",
		title: "📦 NPM Install meditace",
		activity: "Spustili jste npm install a čekali 10 minut. Během čekání jste přemýšleli o smyslu života a závislostí JavaScriptu.",
	},
	{
		id: "regex-wizard",
		title: "🧙 Regex čaroděj",
		activity: "Napsali jste regulární výraz. Funguje. Nevíte jak. Nikdy se toho nedotknete, protože by se rozbil. Je to magie.",
	},
	{
		id: "tech-debt-collector",
		title: "💳 Tech Debt vymahač",
		activity: "Slíbili jste, že příští sprint opravíte technický dluh. Oba víte, že se to nestane. Ale máte to v backlogu. To se počítá.",
	},
	{
		id: "localhost-works",
		title: "💻 Localhost fenomén",
		activity: "'Na mém počítači to funguje' jste řekli třikrát dnes. Kolegové vás nenávidí. Ale máte pravdu. U vás to fakt funguje.",
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
