import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { ChannelManager, createErrorEmbed, createLevelUpEmbed, createProgressBar, formatTimeRemaining } from "../util";
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

	await interaction.deferReply();

	try {
		// Check cooldown first
		const cooldown = await orpc.users.stats.work.cooldown({ userId: dbUser.id });

		if (cooldown.isOnCooldown) {
			const timeRemaining = formatTimeRemaining(cooldown.cooldownRemaining || 0);
			const embed = createUradPraceEmbed()
				.addFields(
					...[
						{
							name: "Tvůj stav",
							value: "Šlofííčkuješ",
						},
						{
							name: "Odpočatý budeš za",
							value: timeRemaining,
						},
					],
				)
				.setFooter({ text: "Za flákání se neplatí! Zkus to znovu později.\nTip: Pracovat můžeš jednou za 60 minut" })
				.setThumbnail("https://cdn.discordapp.com/emojis/1326286362760187944.png");

			await interaction.editReply({ embeds: [embed] });
			return;
		}

		try {
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

			const work = await orpc.users.stats.work.claim({
				userId: dbUser.id,
				boostCount,
			});

			const { earnedTotalCoins, earnedTotalXp, boostCoinsBonus, boostXpBonus } = work.claimStats;

			// Calculate display values (without boost)
			const displayCoins = earnedTotalCoins - boostCoinsBonus;
			const displayXp = earnedTotalXp - boostXpBonus;

			// Check for level up
			if (work.levelUp) {
				const levelUpEmbed = createLevelUpEmbed(
					`Level ${work.levelUp.newLevel}!`,
					`Gratulujeme! Dosáhli jste úrovně ${work.levelUp.newLevel} a získáváte bonus ${work.levelUp.bonusCoins} mincí!`,
				);
				await interaction.editReply({ embeds: [levelUpEmbed] });

				// Wait a bit before showing the main reward
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}

			const activity = workActivities[Math.floor(Math.random() * workActivities.length)];
			if (!activity) {
				await interaction.editReply({
					content: "❌ Nepodařilo se vybrat aktivitu. Zkuste to později.",
				});
				return;
			}

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
				const progress = work.levelProgress;
				const progressBar = createProgressBar(progress.xpProgress, progress.xpNeeded);
				embed.addFields({
					name: "📊 Postup na další úroveň",
					value: progressBar,
					inline: false,
				});
			}

			embed.setFooter({
				text: `💰 Celkem: ${work.updatedStats.coinsCount} mincí • ⭐ Úroveň ${work.levelProgress.currentLevel} • 💼 Práce #${work.updatedStats.workCount}`,
			});

			// Update or send the embed
			if (work.levelUp) {
				await interaction.followUp({ embeds: [embed] });
			} else {
				await interaction.editReply({ embeds: [embed] });
			}
		} catch (_e) {
			const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se dokončit práci. Zkuste to prosím později.");
			await interaction.editReply({ embeds: [errorEmbed] });
			return;
		}
	} catch (error) {
		console.error("Error executing work command:", error);
		const errorEmbed = createErrorEmbed("Chyba", "Při provádění práce došlo k chybě. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
	}
};

const workActivities = [
	{
		id: "wolt-delivery",
		title: "<:SIOVINA:1385697830718673076> Doručovatel",
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
];
