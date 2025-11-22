import type { EmbedBuilder } from "discord.js";
import { createEmbed } from "./embed-builder.ts";

/**
 * Format price from cents to dollar/currency format
 * @param cents - Price in cents (e.g., 15000 = $150.00)
 * @returns Formatted price string (e.g., "$150.00")
 */
export function formatPrice(cents: number): string {
	const dollars = cents / 100;
	return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format quantity with proper decimal precision
 * API uses 1000x multiplier (quantity 1000 = 1.000 shares)
 * @param quantity - Quantity from API (1000 = 1.000 shares)
 * @returns Formatted quantity string (e.g., "10.523")
 */
export function formatQuantity(quantity: number): string {
	const actual = quantity / 1000;
	return actual.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

/**
 * Format profit/loss with emoji, color, and percentage
 * @param amount - Profit/loss amount in coins
 * @param percentage - Profit/loss percentage
 * @returns Formatted string with emoji and percentage (e.g., "🟢 +$123.45 (+12.3%)")
 */
export function formatProfitLoss(amount: number, percentage: number): string {
	const emoji = amount >= 0 ? "🟢" : "🔴";
	const sign = amount >= 0 ? "+" : "";
	const formattedAmount = Math.abs(amount).toLocaleString("en-US");
	const formattedPercentage = Math.abs(percentage).toFixed(2);

	return `${emoji} ${sign}${formattedAmount} coins (${sign}${formattedPercentage}%)`;
}

/**
 * Get emoji for profit/loss value
 * @param value - The profit/loss value
 * @returns Emoji (🟢 for positive, 🔴 for negative, ⚪ for zero)
 */
export function getProfitLossEmoji(value: number): string {
	if (value > 0) return "🟢";
	if (value < 0) return "🔴";
	return "⚪";
}

/**
 * Format asset type with emoji
 * @param type - Asset type from API
 * @returns Formatted string with emoji (e.g., "🇺🇸 US Stock")
 */
export function formatAssetType(type: string): string {
	const typeMap: Record<string, string> = {
		stock_us: "🇺🇸 US Stock",
		stock_intl: "🌍 International Stock",
		crypto: "₿ Cryptocurrency",
	};

	return typeMap[type] || type;
}

/**
 * Create investment-themed embed (gold color like economy)
 * @param title - Embed title
 * @param description - Optional embed description
 * @returns EmbedBuilder with investment theme
 */
export function createInvestmentEmbed(title?: string, description?: string): EmbedBuilder {
	const embed = createEmbed("economy");

	if (title) {
		embed.setTitle(`📈 ${title}`);
	}

	if (description) {
		embed.setDescription(description);
	}

	return embed;
}

/**
 * Format timestamp for display
 * @param timestamp - ISO timestamp string or Date object
 * @returns Formatted relative time (e.g., "2 hours ago")
 */
export function formatTimestamp(timestamp: string | Date): string {
	const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

/**
 * Format large numbers with K/M/B suffixes
 * @param value - Number to format
 * @returns Formatted string (e.g., "1.2M", "500K")
 */
export function formatLargeNumber(value: number): string {
	if (value >= 1_000_000_000) {
		return `${(value / 1_000_000_000).toFixed(1)}B`;
	}
	if (value >= 1_000_000) {
		return `${(value / 1_000_000).toFixed(1)}M`;
	}
	if (value >= 1_000) {
		return `${(value / 1_000).toFixed(1)}K`;
	}
	return value.toLocaleString("en-US");
}

/**
 * Format percentage change with color
 * @param percentage - Percentage change
 * @returns Formatted string with emoji (e.g., "🟢 +5.2%")
 */
export function formatPercentageChange(percentage: number): string {
	const emoji = percentage >= 0 ? "🟢" : "🔴";
	const sign = percentage >= 0 ? "+" : "";
	return `${emoji} ${sign}${percentage.toFixed(2)}%`;
}

/**
 * Truncate string with ellipsis
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str;
	return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * Create footer text for investment commands
 * @param balance - Current coin balance
 * @param additional - Additional footer text
 * @returns Footer object for embed
 */
export function createInvestmentFooter(balance: number, additional?: string): { text: string } {
	let text = `💰 Balance: ${balance.toLocaleString()} coins`;
	if (additional) {
		text += ` • ${additional}`;
	}
	return { text };
}
