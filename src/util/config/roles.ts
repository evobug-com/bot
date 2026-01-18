import type { Guild, Role } from "discord.js";

export interface RoleConfig {
	id: string;
	name: string;
	description?: string;
}

export const DISCORD_ROLES = {
	EVERYONE: {
		id: "1325522814895263775",
		name: "Everyone",
		description: "Default role for everyone",
	},
	VERIFIED: {
		id: "1325564448680841216",
		name: "Verifikován",
		description: "Role assigned to verified users",
	},
	PARTIALLY_VERIFIED: {
		id: "1407098470472486942",
		name: "Částečně Verifikován",
		description: "Role assigned to partially verified users with limited access to 2xx voice rooms",
	},
	TWITCH_CREATOR: {
		id: "1380690184420462592",
		name: "Twitch Creator",
		description: "Role for Twitch creators",
	},
	MODERATOR: {
		id: "1325523155523207228",
		name: "Moderator",
		description: "Moderator role",
	},
	LEAD_MODERATOR: {
		id: "1325523039793713183",
		name: "Lead Moderator",
		description: "Lead moderator role",
	},
	MANAGER: {
		id: "1325523194039238759",
		name: "Manager",
		description: "Manager role",
	},
	ANTIBOT: {
		id: "1407494179918971122",
		name: "Bot Uživatel",
		description: "Role assigned to users who write in anti-bot rooms",
	},
	// Warning system roles
	WARNING_LIMITED: {
		id: "1407494179918971123", // Placeholder ID - needs to be created
		name: "⚠️ Omezený",
		description: "User with limited access due to warnings",
	},
	WARNING_VERY_LIMITED: {
		id: "1407494179918971124", // Placeholder ID - needs to be created
		name: "⚠️⚠️ Velmi omezený",
		description: "User with very limited access due to warnings",
	},
	WARNING_AT_RISK: {
		id: "1407494179918971125", // Placeholder ID - needs to be created
		name: "🚨 V ohrožení",
		description: "User at risk of suspension",
	},
	STREAM_NOTIFICATIONS: {
		id: "1462458538336194662",
		name: "Twitch Notifikace",
		description: "Role for users who want stream notifications",
	},
} as const;

/**
 * Get a role by ID or name, with fallback to name lookup if ID fails
 */
export async function getRoleByConfig(
	guild: Guild,
	roleConfig: RoleConfig,
): Promise<{ role: Role; updated: boolean } | null> {
	// First try by ID
	let role = guild.roles.cache.get(roleConfig.id);

	if (role) {
		return { role, updated: false };
	}

	// If not found by ID, try by name
	role = guild.roles.cache.find((r) => r.name === roleConfig.name);

	if (role) {
		console.warn(`Role "${roleConfig.name}" found with different ID. Expected: ${roleConfig.id}, Found: ${role.id}`);
		return { role, updated: true };
	}

	return null;
}

/**
 * Report an error to the bot-log channel
 */
export async function reportError(guild: Guild, errorType: string, message: string, details?: unknown): Promise<void> {
	try {
		// Import dynamically to avoid circular dependency
		const { DISCORD_CHANNELS } = await import("./channels.js");
		const channel = guild.channels.cache.get(DISCORD_CHANNELS.BOT_LOG.id);

		if (!channel || !channel.isTextBased()) {
			console.error(
				`Bot log channel not found or not text-based in guild ${guild.id} (${guild.name}) Error: ${errorType} - ${message} Details: ${details ? JSON.stringify(details) : "N/A"}`,
			);
			return;
		}

		const errorMessage = `**⚠️ ${errorType}**\n${message}${details ? `\n\`\`\`json\n${JSON.stringify(details, null, 2)}\`\`\`` : ""}`;

		await channel.send({
			content: errorMessage,
			embeds: [
				{
					color: 0xff0000,
					timestamp: new Date().toISOString(),
					footer: {
						text: "Allcom Bot Error Reporter",
					},
				},
			],
		});
	} catch (error) {
		console.error("Failed to report error to bot-info channel:", error);
	}
}
