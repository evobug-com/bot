import type { EmbedBuilder } from "@discordjs/builders";
import type { ChatInputCommandInteraction, TextBasedChannel } from "discord.js";
import { createLevelUpEmbed, createProgressBar } from "./embed-builder.ts";

/**
 * Reward stats interface matching API response
 */
export interface RewardStats {
	baseCoins: number;
	baseXp: number;
	currentLevel: number;
	levelCoinsBonus: number;
	levelXpBonus: number;
	streakCoinsBonus: number;
	streakXpBonus: number;
	milestoneCoinsBonus: number;
	milestoneXpBonus: number;
	boostMultiplier: number;
	boostCoinsBonus: number;
	boostXpBonus: number;
	isMilestone: boolean;
	earnedTotalCoins: number;
	earnedTotalXp: number;
}

/**
 * Level progress interface matching API response
 */
export interface LevelProgress {
	xpProgress: number;
	progressPercentage: number;
	xpForCurrentLevel: number;
	xpForNextLevel: number;
	currentXp: number;
	xpNeeded: number;
	currentLevel: number;
}

/**
 * Level up interface matching API response
 */
export interface LevelUpInfo {
	oldLevel: number;
	newLevel: number;
	bonusCoins: number;
}

/**
 * Format coin breakdown for display
 */
export function formatCoinBreakdown(
	stats: RewardStats,
	streak?: number,
	activityType: "daily" | "work" | "serverTag" | "voiceTime" = "daily",
): string[] {
	const breakdown = ["💰 **Mince:**", `├ 💎 Základ: ${stats.baseCoins}`];

	// Add level bonus if present
	if (stats.levelCoinsBonus > 0) {
		breakdown.push(`├ 📈 Úroveň ${stats.currentLevel}: +${stats.levelCoinsBonus}`);
	}

	// Add streak bonus for daily
	if (activityType === "daily" && streak && streak > 0 && stats.streakCoinsBonus > 0) {
		breakdown.push(`├ 🔥 Série ${streak}: +${stats.streakCoinsBonus}`);
	}

	// Add milestone bonus
	if (stats.milestoneCoinsBonus > 0) {
		breakdown.push(`├ 🏆 Milník: +${stats.milestoneCoinsBonus}`);
	}

	// Add boost bonus if applicable
	if (stats.boostCoinsBonus > 0) {
		const boostPercentage = Math.round((stats.boostMultiplier - 1) * 100);
		breakdown.push(`├ 💜 Server Boost (${boostPercentage}%): +${stats.boostCoinsBonus}`);
	}

	breakdown.push(`└ ✨ Celkem: ${stats.earnedTotalCoins}`);
	return breakdown;
}

/**
 * Format XP breakdown for display
 */
export function formatXpBreakdown(
	stats: RewardStats,
	streak?: number,
	activityType: "daily" | "work" | "serverTag" | "voiceTime" = "daily",
): string[] {
	const breakdown = ["⭐ **XP:**", `├ 💎 Základ: ${stats.baseXp}`];

	// Add level bonus if present
	if (stats.levelXpBonus > 0) {
		breakdown.push(`├ 📈 Úroveň ${stats.currentLevel}: +${stats.levelXpBonus}`);
	}

	// Add streak bonus for daily
	if (activityType === "daily" && streak && streak > 0 && stats.streakXpBonus > 0) {
		breakdown.push(`├ 🔥 Série ${streak}: +${stats.streakXpBonus}`);
	}

	// Add milestone bonus
	if (stats.milestoneXpBonus > 0) {
		breakdown.push(`├ 🏆 Milník: +${stats.milestoneXpBonus}`);
	}

	// Add boost bonus if applicable
	if (stats.boostXpBonus > 0) {
		const boostPercentage = Math.round((stats.boostMultiplier - 1) * 100);
		breakdown.push(`├ 💜 Server Boost (${boostPercentage}%): +${stats.boostXpBonus}`);
	}

	breakdown.push(`└ ✨ Celkem: ${stats.earnedTotalXp}`);
	return breakdown;
}

/**
 * Fix progress calculation after level up
 */
export function fixProgressCalculation(levelProgress: LevelProgress): {
	actualProgress: number;
	actualNeeded: number;
} {
	let actualProgress = levelProgress.xpProgress;
	let actualNeeded = levelProgress.xpNeeded;

	// If progress is greater than or equal to needed, it means they leveled up
	// but the API might not be returning correct post-level-up values
	if (actualProgress >= actualNeeded) {
		// Calculate overflow XP for next level
		actualProgress = actualProgress - actualNeeded;
		// For now, assume next level needs 100 more XP than current
		actualNeeded = actualNeeded + 100;
	}

	return { actualProgress, actualNeeded };
}

/**
 * Add level progress field to embed
 */
export function addLevelProgressField(embed: EmbedBuilder, levelProgress: LevelProgress): void {
	const { actualProgress, actualNeeded } = fixProgressCalculation(levelProgress);
	const progressBar = createProgressBar(actualProgress, actualNeeded);
	const nextLevel = levelProgress.currentLevel + 1;

	embed.addFields({
		name: `📊 Postup na úroveň ${nextLevel}`,
		value: `${progressBar}\n${actualProgress}/${actualNeeded} XP`,
		inline: false,
	});
}

/**
 * Add level up field to embed
 */
export function addLevelUpField(embed: EmbedBuilder, levelUp: LevelUpInfo): void {
	const levelsGained = levelUp.newLevel - levelUp.oldLevel;
	embed.addFields({
		name: "🎉 Postup v úrovni!",
		value: `Postoupili jste z úrovně **${levelUp.oldLevel}** na úroveň **${levelUp.newLevel}**! (+${levelsGained} ${
			levelsGained === 1 ? "úroveň" : "úrovní"
		})`,
		inline: false,
	});
}

/**
 * Add milestone field to embed
 */
export function addMilestoneField(embed: EmbedBuilder, streak: number): void {
	embed.addFields({
		name: "🎉 Milník dosažen!",
		value: `${streak} dní v řadě! Získali jste extra bonus!`,
		inline: false,
	});
}

/**
 * Create level up embed message
 */
export function createLevelUpMessage(levelUp: LevelUpInfo): EmbedBuilder {
	return createLevelUpEmbed(
		`Level ${levelUp.newLevel}!`,
		`Gratulujeme! Dosáhli jste úrovně ${levelUp.newLevel} a získáváte bonus ${levelUp.bonusCoins} mincí!`,
	);
}

/**
 * Build complete reward calculation text
 */
export function buildRewardCalculation(
	stats: RewardStats,
	streak?: number,
	activityType: "daily" | "work" | "serverTag" | "voiceTime" = "daily",
): string {
	const coinsBreakdown = formatCoinBreakdown(stats, streak, activityType);
	const xpBreakdown = formatXpBreakdown(stats, streak, activityType);
	return [...coinsBreakdown, "", ...xpBreakdown].join("\n");
}

/**
 * Common footer text for economy embeds
 */
export function createEconomyFooter(coinsCount: number, currentLevel: number, workCount?: number): { text: string } {
	let text = `💰 Nový zůstatek: ${coinsCount} mincí • ⭐ Úroveň ${currentLevel}`;
	if (workCount !== undefined) {
		text += ` • 💼 Práce #${workCount}`;
	}
	return { text };
}

/**
 * Standard reward response from API
 */
export interface RewardResponse {
	levelUp?: LevelUpInfo;
	levelProgress: LevelProgress;
	claimStats: RewardStats;
	updatedStats: {
		coinsCount: number;
		dailyStreak?: number;
		workCount?: number;
		serverTagStreak?: number;
		[key: string]: any;
	};
	message?: string;
	milestoneReached?: number;
	rewardEarned?: boolean;
	streakChanged?: boolean;
}

/**
 * Options for handling reward response
 */
export interface HandleRewardOptions {
	/** The interaction to reply to (for commands) */
	interaction?: ChatInputCommandInteraction;
	/** The channel to send to (for achievements) */
	channel?: TextBasedChannel;
	/** User ID to mention (for achievements) */
	userId?: string;
	/** Function to create the main embed */
	createMainEmbed: () => EmbedBuilder;
}

/**
 * Universal handler for reward responses
 * Handles level up notifications, main reward embed, and proper message flow
 */
export async function handleRewardResponse(response: Pick<RewardResponse, 'levelUp'>, options: HandleRewardOptions): Promise<void> {
	const { interaction, channel, userId, createMainEmbed } = options;

	// Validate we have either interaction or channel
	if (!interaction && !channel) {
		throw new Error("Either interaction or channel must be provided");
	}

	// Handle level up first if present
	if (response.levelUp) {
		const levelUpEmbed = createLevelUpMessage(response.levelUp);

		if (interaction) {
			// For commands, edit the deferred reply
			await interaction.editReply({ embeds: [levelUpEmbed] });
		} else if (channel) {
			// For achievements, send as separate message
			if ("send" in channel) {
				await channel.send({
					content: userId ? `<@${userId}>` : undefined,
					embeds: [levelUpEmbed],
					allowedMentions: userId ? { users: [userId] } : undefined,
				});
			}
		}
	}

	// Create and send main reward embed
	const mainEmbed = createMainEmbed();

	if (interaction) {
		// For commands: use followUp if level up was shown, otherwise editReply
		if (response.levelUp) {
			await interaction.followUp({ embeds: [mainEmbed] });
		} else {
			await interaction.editReply({ embeds: [mainEmbed] });
		}
	} else if (channel) {
		// For achievements: always send as new message
		if ("send" in channel) {
			await channel.send({
				embeds: [mainEmbed],
				allowedMentions: userId ? { users: [userId] } : undefined,
			});
		}
	}
}
