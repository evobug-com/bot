import { type Client, Events, type Message, type TextChannel, userMention } from "discord.js";
import { DISCORD_CHANNELS, getChannelByConfig } from "../util/config/channels.ts";
import { DISCORD_ROLES } from "../util/config/roles.ts";
import { moderateMessage } from "../utils/openrouter.ts";

// Comprehensive Discord message sanitizer for moderation
const sanitizeForModeration = (content: string) => {
	return (
		content
			// Remove Discord mentions
			.replace(/<@!?\d+>/g, "") // User mentions
			.replace(/<@&\d+>/g, "") // Role mentions
			.replace(/<#\d+>/g, "") // Channel mentions

			// Remove Discord emojis
			.replace(/<a?:\w+:\d+>/g, "") // Custom & animated emojis

			// Remove Discord timestamps
			.replace(/<t:\d+(?::[tTdDfFR])?>/g, "") // Discord timestamps

			// Remove URLs (comprehensive)
			.replace(/(?:https?:\/\/|www\.)[^\s<>"`]+/gi, "") // HTTP(S) and www
			.replace(/(?:[a-z]+\.)+[a-z]{2,}(?:\/[^\s<>"`]*)?/gi, "") // Domain-like patterns
			.replace(/discord\.gg\/[a-zA-Z0-9]+/gi, "") // Discord invites

			// Remove markdown formatting
			.replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1") // Bold/italic
			.replace(/_{1,3}([^_]+)_{1,3}/g, "$1") // Underline/italic
			.replace(/~~([^~]+)~~/g, "$1") // Strikethrough
			.replace(/\|\|([^|]+)\|\|/g, "$1") // Spoiler tags

			// Remove code blocks
			.replace(/```[\s\S]*?```/g, "") // Multi-line code blocks
			.replace(/``[^`]*``/g, "") // Double backtick code
			.replace(/`[^`]*`/g, "") // Inline code

			// Remove markdown links
			.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [text](url) -> text

			// Remove quote blocks
			.replace(/^>\s?.*/gm, "") // Quote lines
			.replace(/>>>.*/gs, "") // Multi-line quotes

			// Remove headers
			.replace(/^#{1,6}\s+/gm, "") // Markdown headers

			// Remove Unicode emojis (comprehensive)
			.replace(/[\u{1F600}-\u{1F64F}]/gu, "") // Emoticons
			.replace(/[\u{1F300}-\u{1F5FF}]/gu, "") // Misc symbols & pictographs
			.replace(/[\u{1F680}-\u{1F6FF}]/gu, "") // Transport & map symbols
			.replace(/[\u{1F700}-\u{1F77F}]/gu, "") // Alchemical symbols
			.replace(/[\u{1F780}-\u{1F7FF}]/gu, "") // Geometric shapes extended
			.replace(/[\u{1F800}-\u{1F8FF}]/gu, "") // Supplemental arrows-C
			.replace(/[\u{1F900}-\u{1F9FF}]/gu, "") // Supplemental symbols & pictographs
			.replace(/[\u{1FA00}-\u{1FA6F}]/gu, "") // Chess symbols
			.replace(/[\u{1FA70}-\u{1FAFF}]/gu, "") // Symbols & pictographs extended-A
			.replace(/[\u{2600}-\u{26FF}]/gu, "") // Misc symbols
			.replace(/[\u{2700}-\u{27BF}]/gu, "") // Dingbats
			.replace(/[\u{FE00}-\u{FE0F}]/gu, "") // Variation selectors
			.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "") // Regional indicator symbols (flags)

			// Remove zero-width characters (often used to bypass filters)
			.replace(/[\u200B\u200C\u200D\uFEFF]/g, "") // Zero-width spaces
			.replace(/[\u2060\u180E]/g, "") // Word joiner, Mongolian vowel separator

			// Remove other special Unicode characters
			.replace(/[\u0300-\u036F]/g, "") // Combining diacritical marks
			.replace(/[\uFFF0-\uFFFF]/g, "") // Specials block

			// Clean up whitespace
			.replace(/\r\n/g, " ") // Windows line breaks
			.replace(/[\r\n]/g, " ") // All line breaks to spaces
			.replace(/\t/g, " ") // Tabs to spaces
			.replace(/\s+/g, " ") // Multiple spaces to single
			.trim()
	); // Remove leading/trailing whitespace
};

async function processMessage(message: Message, isEdit = false): Promise<void> {
	// Skip bot messages, DMs, and system messages
	if (message.author.bot || !message.guild || message.system) {
		return;
	}

	// Skip messages from moderators and admins
	const member = message.member;
	if (member) {
		// Check if user has MODERATOR, LEAD_MODERATOR, or MANAGER roles
		const hasModRole = member.roles.cache.some((role) => {
			return (
				role.id === DISCORD_ROLES.MODERATOR.id ||
				role.id === DISCORD_ROLES.LEAD_MODERATOR.id ||
				role.id === DISCORD_ROLES.MANAGER.id
			);
		});

		if (hasModRole) {
			return;
		}
	}

	const sanitizedContent = sanitizeForModeration(message.content);

	// Skip very short messages
	if (sanitizedContent.length < 3) {
		return;
	}

	try {
		const moderationResult = await moderateMessage(sanitizedContent);

		// If OpenRouter is not configured or no result, skip
		if (!moderationResult) {
			return;
		}

		// If message is flagged, notify moderators
		if (moderationResult.isFlagged) {
			console.log(
				`[Message Moderation] Flagged ${isEdit ? "edited " : ""}message from ${message.author.tag} in <#${message.channel.id}>`,
			);

			// Create the alert message with role mentions
			const moderatorRoleMentions = [
				`<@&${DISCORD_ROLES.MODERATOR.id}>`,
				`<@&${DISCORD_ROLES.LEAD_MODERATOR.id}>`,
				`<@&${DISCORD_ROLES.MANAGER.id}>`,
			];

			const alertEmbed = {
				color: isEdit ? 0xffa500 : 0xff0000,
				title: `⚠️ Potenciálně problematická ${isEdit ? "upravená " : ""}zpráva`,
				description: `AI Moderátor označil tuto ${isEdit ? "upravenou " : ""}zprávu jako potenciálně problematickou.`,
				fields: [
					{
						name: "Kategorie porušení",
						value: moderationResult.categories.length > 0 ? moderationResult.categories.join(", ") : "Nespecifikováno",
						inline: false,
					},
				],
				timestamp: new Date().toISOString(),
				footer: {
					text: "AI Moderation System",
				},
			};

			if (moderationResult.reason) {
				alertEmbed.fields.push({
					name: "Důvod",
					value: moderationResult.reason,
					inline: false,
				});
			}

			// Reply directly to the flagged message
			try {
				await message.reply({
					content: `${moderatorRoleMentions.join(" ")} - Automatická kontrola zpráv detekovala potenciální problém`,
					embeds: [alertEmbed],
				});
			} catch (error) {
				console.error("[Message Moderation] Error replying to message:", error);

				// Fallback: if we can't reply (message deleted, no permissions), send to BOT_INFO channel
				const botInfoResult = getChannelByConfig(message.guild, DISCORD_CHANNELS.BOT_INFO);
				if (botInfoResult) {
					const botInfoChannel = botInfoResult.channel as TextChannel;
					await botInfoChannel.send({
						content: `${moderatorRoleMentions.join(" ")} - Automatická kontrola zpráv detekovala potenciální problém (nelze odpovědět na původní zprávu)`,
						embeds: [
							{
								...alertEmbed,
								fields: [
									{
										name: "Autor",
										value: `${userMention(message.author.id)} (${message.author.tag})`,
										inline: true,
									},
									{
										name: "Kanál",
										value: `<#${message.channel.id}>`,
										inline: true,
									},
									{
										name: "Zpráva",
										value: message.content.substring(0, 1024),
										inline: false,
									},
									...alertEmbed.fields,
									{
										name: "Odkaz na zprávu",
										value: `[Přejít na zprávu](${message.url})`,
										inline: false,
									},
								],
							},
						],
					});
				}
			}

			// Optionally, you can also delete the message or timeout the user
			// For now, we'll just flag it for manual review
		}
	} catch (error) {
		console.error("[Message Moderation] Error moderating message:", error);
	}
}

export async function handleMessageModeration(client: Client<true>): Promise<void> {
	// Handle new messages
	client.on(Events.MessageCreate, async (message: Message) => {
		if (message.partial) {
			try {
				message = await message.fetch();
			} catch (error) {
				console.error("[Message Moderation] Error fetching full message:", error);
				return;
			}
		}

		await processMessage(message, false);
	});

	// Handle edited messages
	client.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
		// MessageUpdate can have partial messages, so we need to ensure we have the full message
		if (newMessage.partial) {
			try {
				newMessage = await newMessage.fetch();
			} catch (error) {
				console.error("[Message Moderation] Error fetching full message:", error);
				return;
			}
		}

		// Process the edited message
		await processMessage(newMessage as Message, true);
	});

	console.log("[Message Moderation] OpenRouter message moderation initialized (new and edited messages)");
}
