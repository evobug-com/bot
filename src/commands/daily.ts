import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { ChannelManager, createErrorEmbed, formatTimeRemaining } from "../util";
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
import {
	generateCaptcha,
	getCaptchaDifficulty,
	isSuspiciousResponseTime,
	presentCaptcha,
	shouldShowCaptcha,
} from "../util/captcha.ts";
import { captchaTracker } from "../util/captcha-tracker.ts";

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

	// Check if we should show a captcha
	const [statsError, userStatsData] = await orpc.users.stats.user({ id: dbUser.id });
	if (statsError) {
		console.error("Error fetching user stats for captcha:", statsError);
	}

	const dailyStreak = userStatsData?.stats.dailyStreak || 0;
	const suspiciousScore = userStatsData?.stats.suspiciousBehaviorScore || 0;

	// Determine if captcha is needed (less frequent for daily than work, pass user ID for failure tracking)
	if (shouldShowCaptcha(dailyStreak * 2, suspiciousScore, interaction.user.id)) {
		const difficulty = getCaptchaDifficulty(suspiciousScore);
		const captcha = generateCaptcha(difficulty);
		const captchaResult = await presentCaptcha(interaction, captcha);

		// Log captcha attempt
		const [logError] = await orpc.users.stats.captcha.log({
			userId: dbUser.id,
			captchaType: captcha.type,
			success: captchaResult.success,
			responseTime: captchaResult.responseTime,
			command: "daily"
		});

		if (logError) {
			console.error("Error logging captcha attempt:", logError);
		}

		// Check for suspicious response time
		if (captchaResult.success && isSuspiciousResponseTime(captchaResult.responseTime, captcha.type)) {
			// Flag as suspicious but still allow for now
			await orpc.users.stats.suspiciousScore.update({
				userId: dbUser.id,
				increment: 20
			});
		}

		if (!captchaResult.success) {
			// Record failure in memory for immediate retry requirement
			captchaTracker.recordFailure(interaction.user.id);

			// Update failed captcha count in database
			await orpc.users.stats.captcha.failedCount.update({ userId: dbUser.id });

			const errorEmbed = createErrorEmbed(
				"Ověření selhalo",
				captchaResult.timedOut
					? "Nestihl jsi odpovědět včas. Zkus to znovu později."
					: "Nesprávná odpověď. Zkus to znovu později."
			);
			await interaction.editReply({ embeds: [errorEmbed], components: [] });
			return;
		}

		// Captcha passed - clear failure tracking and proceed
		captchaTracker.clearFailure(interaction.user.id);
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
};
