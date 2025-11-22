import type { Guild, GuildBasedChannel } from "discord.js";

export interface ChannelConfig {
	id: string;
	name: string;
	description?: string;
}

export const DISCORD_CHANNELS = {
	// System channels
	BOT_NEWS: {
		id: process.env.NODE_ENV === "development" ? "1380666049992720555" /** TEST ROOM **/ : "1381322985754988544",
		name: "✍︱071︱bot-news",
		description: "Bot news and announcements channel",
	},

	BOT_LOG: {
		id: process.env.NODE_ENV === "development" ? "1380666049992720555" /** TEST ROOM **/ : "1441838702614675527",
		name: "🤖︱bot-log",
		description: "Bot log channel for warnings and errors",
	},

	// Stream channels
	STREAM_NOTIFICATIONS: {
		id: process.env.NODE_ENV === "development" ? "1380666049992720555" /** TEST ROOM **/ : "1325557465630380093",
		name: "🔔︱004︱stream",
		description: "Twitch stream notifications channel",
	},

	// Voice channels
	VOICE_CREATE_TRIGGER: {
		id: process.env.NODE_ENV === "development" ? "1407091920039051274" /** TEST CAT **/ : "1325544907254927392",
		name: "💬 + Hlas. místnost",
		description: "Join to create temporary voice channel",
	},

	VOICE_CHATCHAT: {
		id: process.env.NODE_ENV === "development" ? "1407092070686130197" /** TEST CAT **/ : "1325596210060464191",
		name: "🗯︱201︱chatchat",
		description: "Permanent text channel 201",
	},

	COMMANDS: {
		id: process.env.NODE_ENV === "development" ? "1380666049992720555" /** TEST ROOM **/ : "1380925345515180142",
		name: "✍︱070︱příkazy",
	},

	QUIZ_PROBLEM: {
		id: process.env.NODE_ENV === "development" ? "1380666049992720555" /** TEST ROOM **/ : "1393664796867694713",
		name: "📬︱-︱quiz",
		description: "Support channel for users having issues with verification quiz",
	},

	ANTIBOT_CATEGORY: {
		id: process.env.NODE_ENV === "development" ? "1407091837730029659" /** TEST CAT **/ : "1335575510771695719",
		name: "💬 ︱900︱Proti botům (veřejné)",
		description: "Category containing anti-bot verification rooms",
	},

	// Media and chat channels
	MEDIA_FORUM: {
		id: process.env.NODE_ENV === "development" ? "1409625394155491458" /** TEST3 FORUM **/ : "1325573201593372752",
		name: "📺︱066︱media",
		description: "Media forum channel for memes, clips, and food posts",
	},

	CHAT: {
		id: process.env.NODE_ENV === "development" ? "1380666049992720555" /** TEST ROOM **/ : "1325522814895263781",
		name: "😅︱101︱chat",
		description: "Main chat channel for notifications and conversations",
	},

	// Moderation channels
	AUDIT_LOG: {
		id: process.env.NODE_ENV === "development" ? "1381322985754988544" /** TEST ROOM **/ : "1381322985754988544",
		name: "📃︱audit-log",
		description: "Audit log channel for moderation actions",
	},

	MODERATION_REVIEW: {
		id: process.env.NODE_ENV === "development" ? "1381322985754988544" /** TEST ROOM **/ : "1381322985754988544",
		name: "📝︱mod-review",
		description: "Moderation review requests channel",
	},
} as const;

/**
 * Get a channel by ID or name, with fallback to name lookup if ID fails
 */
export function getChannelByConfig(
	guild: Guild,
	channelConfig: ChannelConfig,
): { channel: GuildBasedChannel; updated: boolean } | null {
	// First try by ID
	let channel = guild.channels.cache.get(channelConfig.id);

	if (channel) {
		return { channel, updated: false };
	}

	// If not found by ID, try by name
	channel = guild.channels.cache.find((c) => c.name === channelConfig.name);

	if (channel) {
		console.warn(
			`Channel "${channelConfig.name}" found with different ID. Expected: ${channelConfig.id}, Found: ${channel.id}`,
		);
		return { channel, updated: true };
	}

	return null;
}
