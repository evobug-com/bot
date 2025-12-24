import { type Client, Events, type Message, type TextChannel, userMention } from "discord.js";
import { formatPunishmentForAlert, processAutoPunishment } from "../services/autoPunishment/index.ts";
import { DISCORD_CHANNELS, getChannelByConfig } from "../util/config/channels.ts";
import { DISCORD_ROLES } from "../util/config/roles.ts";
import { type ContextMessage, type ModerationContext, type ModerationOptions, moderateMessage } from "../utils/openrouter.ts";

// Moderation options - enable reasoning for better accuracy
const MODERATION_OPTIONS: ModerationOptions = {
	useReasoning: true,
	reasoningEffort: "low", // minimal overhead, still improves accuracy
};

// Rolling buffer of last 5 messages per channel for context
// Simple Map: channelId -> array of {author, content}
export const channelContextCache = new Map<string, ContextMessage[]>();
export const MAX_CONTEXT_MESSAGES = 5;

/** Add a message to the channel context cache */
export function addToContextCache(message: Message): void {
	const channelId = message.channel.id;
	const cache = channelContextCache.get(channelId) ?? [];

	cache.push({
		author: message.author.displayName || message.author.username,
		content: message.content.substring(0, 500),
	});

	// Keep only last N messages
	if (cache.length > MAX_CONTEXT_MESSAGES) {
		cache.shift();
	}

	channelContextCache.set(channelId, cache);
}

/** Get previous messages from cache (excludes the message we just added) */
export function getPreviousMessages(channelId: string): ContextMessage[] {
	const cache = channelContextCache.get(channelId);
	if (!cache || cache.length <= 1) return [];

	// Return all except the last one (which is the current message)
	return cache.slice(0, -1);
}

/** Get the referenced message if this is a reply */
async function getReplyContext(message: Message): Promise<ContextMessage | undefined> {
	if (!message.reference?.messageId) return undefined;

	try {
		const channel = message.channel;
		if (!("messages" in channel)) return undefined;

		const referencedMessage = await channel.messages.fetch(message.reference.messageId);
		if (!referencedMessage || referencedMessage.author.bot) return undefined;

		return {
			author: referencedMessage.author.displayName || referencedMessage.author.username,
			content: referencedMessage.content.substring(0, 500),
		};
	} catch {
		// Message might be deleted - silently ignore
		return undefined;
	}
}

/** Build moderation context for a message */
async function buildModerationContext(message: Message): Promise<ModerationContext> {
	const context: ModerationContext = {};

	const previousMessages = getPreviousMessages(message.channel.id);
	if (previousMessages.length > 0) {
		context.previousMessages = previousMessages;
	}

	const replyTo = await getReplyContext(message);
	if (replyTo) {
		context.replyTo = replyTo;
	}

	return context;
}

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
	// Sometimes the message is null/undefined, catch it here
	if (message == null) return;

	// Skip bot messages, DMs, and system messages
	if (message.author.bot || !message.guild || message.system) {
		return;
	}

	// Always add to context cache (even for mods) so we have conversation context
	addToContextCache(message);

	// Skip messages from moderators and admins for moderation checks
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
		// Build context from previous messages and reply info
		const context = await buildModerationContext(message);
		const moderationResult = await moderateMessage(sanitizedContent, context, MODERATION_OPTIONS);

		// If OpenRouter is not configured or no result, skip
		if (!moderationResult) {
			return;
		}

		// If message is flagged, process auto-punishment and notify moderators
		if (moderationResult.isFlagged) {
			console.log(
				`[Message Moderation] Flagged ${isEdit ? "edited " : ""}message from ${message.author.tag} in <#${message.channel.id}>`,
			);

			// Process auto-punishment
			const punishmentResult = await processAutoPunishment(message.client as Client<true>, {
				message,
				moderationResult,
				guildId: message.guild.id,
			});

			// Create the alert message with role mentions
			const moderatorRoleMentions = [
				`<@&${DISCORD_ROLES.MODERATOR.id}>`,
				`<@&${DISCORD_ROLES.LEAD_MODERATOR.id}>`,
				`<@&${DISCORD_ROLES.MANAGER.id}>`,
			];

			// Determine alert color based on punishment status
			let alertColor = isEdit ? 0xffa500 : 0xff0000;
			if (punishmentResult.flaggedForReview) {
				alertColor = 0xff00ff; // Purple for manual review
			}

			const alertEmbed = {
				color: alertColor,
				title: punishmentResult.flaggedForReview
					? `🔔 VYŽADUJE MANUÁLNÍ PŘEZKOUMÁNÍ ${isEdit ? "(upravená zpráva)" : ""}`
					: `⚠️ Automaticky potrestáno ${isEdit ? "(upravená zpráva)" : ""}`,
				description: punishmentResult.flaggedForReview
					? `AI Moderátor označil tuto zprávu a **vyžaduje manuální přezkoumání** (příliš mnoho porušení).`
					: `AI Moderátor označil tuto zprávu a automaticky aplikoval trest.`,
				fields: [
					{
						name: "Kategorie porušení",
						value: moderationResult.categories.length > 0 ? moderationResult.categories.join(", ") : "Nespecifikováno",
						inline: false,
					},
					{
						name: "Automatický trest",
						value: formatPunishmentForAlert(punishmentResult),
						inline: false,
					},
				],
				timestamp: new Date().toISOString(),
				footer: {
					text: "AI Auto-Punishment System",
				},
			};

			if (moderationResult.reason) {
				alertEmbed.fields.push({
					name: "Důvod AI",
					value: moderationResult.reason,
					inline: false,
				});
			}

			// Skip reply if message was deleted (HIGH+ severity)
			if (punishmentResult.messageDeleted) {
				// Log to BOT_LOG channel since message was deleted
				const botLogResult = getChannelByConfig(message.guild, DISCORD_CHANNELS.BOT_LOG);
				if (botLogResult) {
					const botLogChannel = botLogResult.channel as TextChannel;
					await botLogChannel.send({
						content: `${moderatorRoleMentions.join(" ")} - Zpráva byla automaticky smazána a uživatel potrestán`,
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
										name: "Smazaná zpráva",
										value: message.content.substring(0, 1024) || "(prázdná)",
										inline: false,
									},
									...alertEmbed.fields,
								],
							},
						],
					});
				}
			} else {
				// Reply directly to the flagged message
				try {
					await message.reply({
						content: `${moderatorRoleMentions.join(" ")} - ${punishmentResult.punished ? "Automatický trest byl aplikován" : "Automatická kontrola zpráv detekovala potenciální problém"}`,
						embeds: [alertEmbed],
					});
				} catch (error) {
					console.error("[Message Moderation] Error replying to message:", error);

					// Fallback: if we can't reply (message deleted, no permissions), send to BOT_LOG channel
					const botLogResult = getChannelByConfig(message.guild, DISCORD_CHANNELS.BOT_LOG);
					if (botLogResult) {
						const botLogChannel = botLogResult.channel as TextChannel;
						await botLogChannel.send({
							content: `${moderatorRoleMentions.join(" ")} - ${punishmentResult.punished ? "Automatický trest byl aplikován" : "Automatická kontrola"} (nelze odpovědět na původní zprávu)`,
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
											value: message.content.substring(0, 1024) || "(prázdná)",
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
			}
		}
	} catch (error) {
		console.error("[Message Moderation] Error moderating message:", error);
	}
}

export async function handleMessageModeration(client: Client<true>): Promise<void> {
	// Handle new messages
	client.on(Events.MessageCreate, async (message: Message) => {
		// Sometimes the message is null/undefined, catch it here
		if (message == null) return;

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
		// Sometimes the message is null/undefined, catch it here
		if (newMessage == null) return;

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
