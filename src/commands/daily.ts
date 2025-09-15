import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { ChannelManager, createErrorEmbed, createLevelUpEmbed, createProgressBar, formatTimeRemaining } from "../util";
import type { CommandContext } from "../util/commands.ts";
import { createUradPraceEmbed } from "../util/messages/embedBuilders.ts";

export const data = new ChatInputCommandBuilder()
	.setName("daily")
	.setNameLocalizations({ cs: "denní" })
	.setDescription("Claim your daily reward")
	.setDescriptionLocalizations({ cs: "Vyberte si svou denní dávku" });

export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
	if (interaction.guild) {
		const commandsRoom = ChannelManager.getChannel(interaction.guild, "COMMANDS");
		if (commandsRoom) {
			// Disallow sending /daily outside of commands channel
			if (interaction.channelId !== commandsRoom.id) {
				await interaction.deferReply({ flags: MessageFlags.Ephemeral });

				const embed = createUradPraceEmbed().setDescription(
					`Denní dávku si můžeš vyzvednout pouze v místnosti <#${commandsRoom.id}> - zastávka úřadu práce!`,
				);

				await interaction.editReply({
					embeds: [embed],
				});
				return;
			}
		}
	}

	await interaction.deferReply();

	const [cooldownError, dailyCooldown] = await orpc.users.stats.daily.cooldown({ userId: dbUser.id });

	if (cooldownError) {
		console.error("Error checking daily cooldown:", cooldownError);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se zkontrolovat denní dávku. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (dailyCooldown.isOnCooldown) {
		// Use the local calculation instead of server's cooldown time
		const timeRemaining = formatTimeRemaining(dailyCooldown.cooldownRemaining);

		const embed = createUradPraceEmbed().setDescription(
			`Svou dnešní dávku jsi už vyzvednul.\n_Další dávka bude dostupná za: **${timeRemaining}**_`,
		);

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
			// We'll count 1 boost per premium subscriber for simplicity
			// In reality, users can apply multiple boosts but Discord API doesn't expose this count per user
			boostCount = 3;

			// Alternatively, we could check the server's premium subscription count
			// and distribute it among boosters, but that would be less accurate
		}
	}

	// Claim daily reward with boost count
	const [claimError, response] = await orpc.users.stats.daily.claim({
		userId: dbUser.id,
		boostCount,
	});

	if (claimError) {
		console.error("Error claiming daily reward:", claimError);
		const errorEmbed = createErrorEmbed("Chyba", "Nepodařilo se vyzvednout denní dávku. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	// Check for level up
	if (response.levelUp) {
		const levelUpEmbed = createLevelUpEmbed(
			`Level ${response.levelUp.newLevel}!`,
			`Gratulujeme! Dosáhli jste úrovně ${response.levelUp.newLevel} a získáváte bonus ${response.levelUp.bonusCoins} mincí!`,
		);
		await interaction.editReply({ embeds: [levelUpEmbed] });

		// Wait a bit before showing the main reward
		// await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	const {
		earnedTotalCoins,
		earnedTotalXp,
		currentLevel,
		baseCoins,
		baseXp,
		levelCoinsBonus,
		streakCoinsBonus,
		milestoneCoinsBonus,
		boostMultiplier,
		boostCoinsBonus,
		boostXpBonus,
		isMilestone,
		levelXpBonus,
		streakXpBonus,
		milestoneXpBonus,
	} = response.claimStats;
	const { dailyStreak, coinsCount } = response.updatedStats;

	// Build calculation breakdown
	const coinsBreakdown = [
		`💰 **Mince:**`,
		`├ 💎 Základ: ${baseCoins}`,
		`├ 📈 Úroveň ${currentLevel}: +${levelCoinsBonus}`,
	];

	if (dailyStreak > 0) {
		coinsBreakdown.push(`├ 🔥 Série ${dailyStreak}: +${streakCoinsBonus}`);
	}

	if (isMilestone) {
		coinsBreakdown.push(`├ 🏆 Milník: +${milestoneCoinsBonus}`);
	}

	// Add boost bonus if applicable
	if (boostCoinsBonus > 0) {
		const boostPercentage = Math.round((boostMultiplier - 1) * 100);
		coinsBreakdown.push(`├ 💜 Server Boost (${boostPercentage}%): +${boostCoinsBonus}`);
	}

	coinsBreakdown.push(`└ ✨ Celkem: ${earnedTotalCoins}`);

	const xpBreakdown = [`⭐ **XP:**`, `├ 💎 Základ: ${baseXp}`, `├ 📈 Úroveň ${currentLevel}: +${levelXpBonus}`];

	if (dailyStreak > 0) {
		xpBreakdown.push(`├ 🔥 Série ${dailyStreak}: +${streakXpBonus}`);
	}

	if (isMilestone) {
		xpBreakdown.push(`├ 🏆 Milník: +${milestoneXpBonus}`);
	}

	// Add boost bonus if applicable
	if (boostXpBonus > 0) {
		const boostPercentage = Math.round((boostMultiplier - 1) * 100);
		xpBreakdown.push(`├ 💜 Server Boost (${boostPercentage}%): +${boostXpBonus}`);
	}

	xpBreakdown.push(`└ ✨ Celkem: ${earnedTotalXp}`);

	const calculationText = [...coinsBreakdown, "", ...xpBreakdown].join("\n");

	// Create description safely
	const streakText = dailyStreak === 1 ? "den" : "dní";
	const description = `🔥 **Série:** ${dailyStreak} ${streakText}`;

	const embed = createUradPraceEmbed()
		.setTitle("✨ Dávka vyzvednuta!")
		.setDescription(description)
		.addFields(
			{
				name: "🪙 Získané mince",
				value: `**+${earnedTotalCoins}**`,
				inline: true,
			},
			{
				name: "⭐ Získané XP",
				value: `**+${earnedTotalXp}**`,
				inline: true,
			},
			{
				name: "\u200B", // Empty field for spacing
				value: "\u200B",
				inline: true,
			},
			{
				name: "📊 Výpočet dávky",
				value: String(calculationText),
				inline: false,
			},
		);

	// Add milestone celebration if applicable
	if (isMilestone) {
		embed.addFields({
			name: "🎉 Milník dosažen!",
			value: `${dailyStreak} dní v řadě! Získali jste extra bonus!`,
			inline: false,
		});
	}

	// Add level-up information if applicable
	if (response.levelUp) {
		const levelsGained = response.levelUp.newLevel - response.levelUp.oldLevel;
		embed.addFields({
			name: "🎉 Postup v úrovni!",
			value: `Postoupili jste z úrovně **${response.levelUp.oldLevel}** na úroveň **${response.levelUp.newLevel}**! (+${levelsGained} ${levelsGained === 1 ? "úroveň" : "úrovní"})`,
			inline: false,
		});
	}

	if (response.levelProgress) {
		// Fix progress calculation if user has more XP than needed
		let actualProgress = response.levelProgress.xpProgress;
		let actualNeeded = response.levelProgress.xpNeeded;

		// If progress is greater than needed, it means they leveled up
		// but the API might not be returning correct post-level-up values
		if (actualProgress >= actualNeeded) {
			// Calculate overflow XP for next level
			actualProgress = actualProgress - actualNeeded;
			// For now, assume next level needs 100 more XP than current
			actualNeeded = actualNeeded + 100;
		}

		const progressBar = createProgressBar(actualProgress, actualNeeded);
		const nextLevel = response.levelProgress.currentLevel + 1;

		embed.addFields({
			name: `📊 Postup na úroveň ${nextLevel}`,
			value: `${progressBar}\n${actualProgress}/${actualNeeded} XP`,
			inline: false,
		});
	}

	embed.setFooter({
		text: `💰 Nový zůstatek: ${coinsCount} mincí • ⭐ Úroveň ${response.levelProgress.currentLevel}`,
	});

	// Update or send the embed
	if (response.levelUp) {
		await interaction.followUp({ embeds: [embed] });
	} else {
		await interaction.editReply({ embeds: [embed] });
	}
};
