import { EmbedBuilder } from "discord.js";

// Color constants for different embed types
export const EMBED_COLORS = {
	success: 0x00ff00, // Green
	error: 0xff0000, // Red
	info: 0x0099ff, // Blue
	warning: 0xffcc00, // Yellow
	economy: 0xffd700, // Gold
	levelUp: 0x9b59b6, // Purple
	custom: 0x000000, // To be overridden
} as const;

// Helper to create consistent embeds
export function createEmbed(
	type: keyof typeof EMBED_COLORS = "info",
	customColor?: number,
	timestamp = true,
): EmbedBuilder {
	const color = customColor || EMBED_COLORS[type];
	let builder = new EmbedBuilder().setColor(color);
	if (timestamp) {
		builder = builder.setTimestamp();
	}
	return builder;
}

// Success embed
export function createSuccessEmbed(title: string, description?: string): EmbedBuilder {
	const embed = createEmbed("success").setTitle(`✅ ${title}`);

	if (description) {
		embed.setDescription(description);
	}

	return embed;
}

// Error embed
export function createErrorEmbed(title: string, description?: string, timestamp = true): EmbedBuilder {
	const embed = createEmbed("error", undefined, timestamp).setTitle(`❌ ${title}`);

	if (description) {
		embed.setDescription(description);
	}

	return embed;
}

// Info embed
export function createInfoEmbed(title: string, description?: string): EmbedBuilder {
	const embed = createEmbed("info").setTitle(`ℹ️ ${title}`);

	if (description) {
		embed.setDescription(description);
	}

	return embed;
}

// Economy embed
export function createEconomyEmbed(title?: string, description?: string): EmbedBuilder {
	const embed = createEmbed("economy").setTitle(`💰 ${title}`);

	if (description) {
		embed.setDescription(description);
	}

	return embed;
}

// Level up embed
export function createLevelUpEmbed(title: string, description: string): EmbedBuilder {
	return createEmbed("levelUp").setTitle(`🎉 ${title}`).setDescription(description);
}

// Leaderboard embed
export function createLeaderboardEmbed(
	title: string,
	fields: Array<{ name: string; value: string; inline?: boolean }>,
): EmbedBuilder {
	const embed = createEmbed("info").setTitle(`🏆 ${title}`).setFields(fields);

	return embed;
}

// Progress bar generator
export function createProgressBar(current: number, max: number, length = 10): string {
	const percentage = Math.min(Math.max(current / max, 0), 1);
	const filled = Math.round(percentage * length);
	const empty = length - filled;

	const filledChar = "█";
	const emptyChar = "░";

	return `[${filledChar.repeat(filled)}${emptyChar.repeat(empty)}] ${Math.round(percentage * 100)}%`;
}
