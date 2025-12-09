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
import { createUradPraceEmbed } from "../util/messages/embedBuilders.ts";
import { generateStolenMoneyStory } from "../util/storytelling/stolen-money.ts";
import { generateElectionsCandidateStory } from "../util/storytelling/elections-candidate.ts";
import { generateOfficePrankStory } from "../util/storytelling/office-prank.ts";
import { generateITSupportStory } from "../util/storytelling/it-support.ts";
import { generateRevealCheatingStory } from "../util/storytelling/reveal-cheating.ts";
import { generateVideoConferenceStory } from "../util/storytelling/video-conference.ts";
import { generateChristmasPartyStory } from "../util/storytelling/christmas-party.ts";
import { generateCoffeeMachineStory } from "../util/storytelling/coffee-machine.ts";
import { generateJobInterviewStory } from "../util/storytelling/job-interview.ts";
import { generateServerRoomStory } from "../util/storytelling/server-room.ts";
import { generateElevatorStuckStory } from "../util/storytelling/elevator-stuck.ts";
import { generateLunchThiefStory } from "../util/storytelling/lunch-thief.ts";
import { generateFridayDeployStory } from "../util/storytelling/friday-deploy.ts";
import { generateClientMeetingStory } from "../util/storytelling/client-meeting.ts";
import { generateHackathonStory } from "../util/storytelling/hackathon.ts";

// IDs of activities that have story follow-ups
export const storyActivityIds = new Set([
	"stolen-money",
	"elections-candidate",
	"office-prank",
	"it-support",
	"network-engineer",
	"reveal-cheating",
	"video-conference",
	"christmas-party",
	"coffee-machine-adventure",
	"job-interview-conductor",
	"server-room-adventure",
	"elevator-stuck",
	"lunch-thief-investigation",
	"friday-deploy-yolo",
	"client-meeting-important",
	"hackathon-participant",
]);

export const data = new ChatInputCommandBuilder()
	.setName("work")
	.setNameLocalizations({ cs: "práce" })
	.setDescription("Work to earn XP and coins")
	.setDescriptionLocalizations({ cs: "Pracujte a vydělávejte XP a mince" })
	.addBooleanOptions((option) =>
		option
			.setName("story")
			.setNameLocalizations({ cs: "příběh" })
			.setDescription("Include story activities with follow-up narratives")
			.setDescriptionLocalizations({ cs: "Zahrnout příběhové aktivity s pokračujícím vyprávěním" })
			.setRequired(false)
	);
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

	// Get story mode option (default: false - no stories)
	const storyMode = interaction.options.getBoolean("story") ?? false;

	// Filter activities based on story mode
	// story=true → ONLY story activities (100% chance of story)
	// story=false → ONLY non-story activities (0% chance of story)
	const availableActivities = storyMode
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

	let activity;
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

	// Check if this activity has storytelling enabled
	const storytellingActivities: Record<string, {
		generator: (userId: number, userLevel: number, ...args: any[]) => Promise<{story: string, totalCoinsChange: number, xpGranted: number}>,
		title: string,
		args?: any[]
	}> = {
		"stolen-money": {
			generator: generateStolenMoneyStory,
			title: "💰 Příběh zloděje",
		},
		"elections-candidate": {
			generator: generateElectionsCandidateStory,
			title: "🗳️ Příběh politika",
		},
		"office-prank": {
			generator: generateOfficePrankStory,
			title: "🎉 Příběh žertíka",
		},
		"it-support": {
			generator: generateITSupportStory,
			title: "💻 Příběh IT supportu",
			args: [false], // not network engineer
		},
		"network-engineer": {
			generator: generateITSupportStory,
			title: "🌐 Příběh síťaře",
			args: [true], // is network engineer
		},
		"reveal-cheating": {
			generator: generateRevealCheatingStory,
			title: "🕵️ Příběh detektiva",
		},
		"video-conference": {
			generator: generateVideoConferenceStory,
			title: "📡 Příběh videokonference",
		},
		"christmas-party": {
			generator: generateChristmasPartyStory,
			title: "🎄 Příběh vánočního večírku",
		},
		"coffee-machine-adventure": {
			generator: generateCoffeeMachineStory,
			title: "☕ Příběh kávovaru",
		},
		"job-interview-conductor": {
			generator: generateJobInterviewStory,
			title: "📋 Příběh pohovoru",
		},
		"server-room-adventure": {
			generator: generateServerRoomStory,
			title: "🖥️ Příběh serverovny",
		},
		"elevator-stuck": {
			generator: generateElevatorStuckStory,
			title: "🛗 Příběh výtahu",
		},
		"lunch-thief-investigation": {
			generator: generateLunchThiefStory,
			title: "🍱 Příběh zloděje obědů",
		},
		"friday-deploy-yolo": {
			generator: generateFridayDeployStory,
			title: "🚀 Příběh pátečního deploye",
		},
		"client-meeting-important": {
			generator: generateClientMeetingStory,
			title: "💼 Příběh schůzky s klientem",
		},
		"hackathon-participant": {
			generator: generateHackathonStory,
			title: "🏆 Příběh hackathonu",
		},
	};

	const storytellingConfig = storytellingActivities[activity.id];
	if (storytellingConfig) {
		try {
			// Generate the story with all random events
			const storyResult = await storytellingConfig.generator(
				dbUser.id,
				work.levelProgress.currentLevel,
				...(storytellingConfig.args || []),
			);

			// Create a follow-up embed with the story
			const storyEmbed = createUradPraceEmbed()
				.setTitle(storytellingConfig.title)
				.setDescription(storyResult.story)
				.setColor(storyResult.totalCoinsChange >= 0 ? 0x00ff00 : 0xff0000)
				.setFooter(
					createEconomyFooter(
						work.updatedStats.coinsCount + storyResult.totalCoinsChange,
						work.levelProgress.currentLevel,
						work.updatedStats.workCount,
					),
				);

			// Send the story as a follow-up message
			await interaction.followUp({
				embeds: [storyEmbed],
			});
		} catch (error) {
			console.error(`Error generating ${activity.id} story:`, error);
			// Don't fail the whole command if story generation fails
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
		id: "video-conference",
		title: "📡 Mezinárodní komunikátor",
		activity: "Připojuješ se na videokonferenci s indickými kolegy... (příběh pokračuje níže)",
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
		id: "christmas-party",
		title: "👯 Párty účastník",
		activity: "Účastníš se vánočního večírku... (příběh pokračuje níže)",
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
		id: "reveal-cheating",
		title: "🕵️ Detektiv",
		activity: "Odhalil jsi podvádění na Discord příkazech... (příběh pokračuje níže)",
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
		id: "elections-candidate",
		title: "🗳️ Kandidát do parlamentu",
		activity: "Kandidoval jsi ve volbách do parlamentu... (příběh pokračuje níže)",
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
		id: "stolen-money",
		title: "💰 Zloděj",
		activity: "Rozhodl jsi se ukrást peníze babičce... (příběh pokračuje níže)",
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
		id: "it-support",
		title: "💻 IT Podpora",
		activity: "Pomáháš kolegovi s jeho počítačem... (příběh pokračuje níže)",
	},
	{
		id: "network-engineer",
		title: "🌐 Síťař",
		activity: "Opravuješ firemní síť... (příběh pokračuje níže)",
	},
	{
		id: "coffee-break",
		title: "☕ Kávová pauza",
		activity: "Dali jste si kávovou pauzu.",
	},
	{
		id: "office-prank",
		title: "🎉 Kancelářský žertík",
		activity: "Děláš kolegovi žertík s jeho počítačem... (příběh pokračuje níže)",
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
	{
		id: "coffee-machine-adventure",
		title: "☕ Kávový dobrodruh",
		activity: "Pokoušíš se ovládnout nový super-automatický kávovar... (příběh pokračuje níže)",
	},
	{
		id: "job-interview-conductor",
		title: "📋 Personalista",
		activity: "Vedeš pohovor s kandidátem na pozici junior developera... (příběh pokračuje níže)",
	},
	{
		id: "server-room-adventure",
		title: "🖥️ Serverovnový průzkumník",
		activity: "Vstupuješ do serverovny opravit blikající server... (příběh pokračuje níže)",
	},
	{
		id: "elevator-stuck",
		title: "🛗 Pasažér výtahu",
		activity: "Zasekl ses ve výtahu s někým zajímavým... (příběh pokračuje níže)",
	},
	{
		id: "lunch-thief-investigation",
		title: "🍱 Detektiv obědů",
		activity: "Někdo ti ukradl oběd z ledničky! Čas na vyšetřování... (příběh pokračuje níže)",
	},
	{
		id: "friday-deploy-yolo",
		title: "🚀 Páteční deployer",
		activity: "Je pátek odpoledne a ty mačkáš DEPLOY... (příběh pokračuje níže)",
	},
	{
		id: "client-meeting-important",
		title: "💼 Account manager",
		activity: "Máš důležitou schůzku s potenciálním klientem... (příběh pokračuje níže)",
	},
	{
		id: "hackathon-participant",
		title: "🏆 Hackathonista",
		activity: "Účastníš se 48hodinového hackathonu... (příběh pokračuje níže)",
	}
];
