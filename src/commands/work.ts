import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
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
	const activity = workActivities[(randomByte as number) % workActivities.length];
	if (!activity) {
		await interaction.editReply({
			content: "❌ Nepodařilo se vybrat aktivitu. Zkuste to později.",
		});
		return;
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
		activity: "Přežili jste videokonferenci s indickými kolegy",
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
		activity: "Učastnili jste se vánočního večírku",
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
		activity: "Odhalili jste podvádění na Discord příkazech!",
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
];
