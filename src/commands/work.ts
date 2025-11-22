import {ChatInputCommandBuilder, type GuildMember, MessageFlags} from "discord.js";
import { orpc } from "../client/client.ts";
import { ChannelManager, createErrorEmbed, formatTimeRemaining } from "../util";
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

	// Select work activity using crypto for better randomness
	const [randomByte] = crypto.getRandomValues(new Uint32Array(1));
	const _activity = workActivities[(randomByte as number) % workActivities.length];
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

const workActivities = [
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
	}
];
