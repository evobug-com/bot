import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { ChannelManager, createErrorEmbed, formatTimeRemaining } from "../util";
import { checkUserBeforeCommand, enforceAntiCheatAction } from "../util/anti-cheat-handler.ts";
import {
	addLevelProgressField,
	addLevelUpField,
	addMilestoneField,
	buildRewardCalculation,
	createEconomyFooter,
	handleRewardResponse,
	type RewardResponse,
} from "../util/bot/rewards.ts";
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

	// Defer publicly to keep the command visible
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

	// Anti-cheat check using new comprehensive system
	const antiCheatContext = {
		userId: dbUser.id,
		guildId: interaction.guildId || "unknown",
		commandName: "daily" as const,
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

	// Use the shared handler to display rewards
	await handleRewardResponse(response as RewardResponse, {
		interaction,
		createMainEmbed: () => {
			const { earnedTotalCoins, earnedTotalXp, isMilestone } = response.claimStats;
			const { dailyStreak, coinsCount } = response.updatedStats;

			// Build calculation breakdown using shared helper
			const calculationText = buildRewardCalculation(response.claimStats, dailyStreak, "daily");

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
				addMilestoneField(embed, dailyStreak);
			}

			// Add level-up information if applicable
			if (response.levelUp) {
				addLevelUpField(embed, response.levelUp);
			}

			// Add level progress
			if (response.levelProgress) {
				addLevelProgressField(embed, response.levelProgress);
			}

			// Set footer with economy info
			embed.setFooter(createEconomyFooter(coinsCount, response.levelProgress.currentLevel));

			return embed;
		},
	});

    // Record successful command completion for anti-cheat
	await orpc.users.anticheat.trust.update({
		userId: dbUser.id,
		guildId: antiCheatContext.guildId,
		delta: +1,
		reason: "Successful daily command",
	});
};
