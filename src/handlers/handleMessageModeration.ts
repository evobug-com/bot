import { type Client, Events, type Message, type TextChannel, userMention } from "discord.js";
import { DISCORD_CHANNELS, getChannelByConfig } from "../util/config/channels.ts";
import { DISCORD_ROLES } from "../util/config/roles.ts";
import { moderateMessage } from "../utils/openrouter.ts";

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

	// Skip very short messages
	if (message.content.replace(/[^\x20-\x7E]/g, '').trim().length < 3) {
		return;
	}

	try {
        const moderationResult = await moderateMessage(message.content);

		// If OpenRouter is not configured or no result, skip
		if (!moderationResult) {
			return;
		}

		// If message is flagged, notify moderators
		if (moderationResult.isFlagged) {
			console.log(
				`[Message Moderation] Flagged ${isEdit ? "edited " : ""}message from ${message.author.tag} in <#${message.channel.id}>`,
			);

			// Get the BOT_INFO channel
			const botInfoResult = getChannelByConfig(message.guild, DISCORD_CHANNELS.BOT_INFO);
			if (!botInfoResult) {
				console.error("[Message Moderation] BOT_INFO channel not found");
				return;
			}

			const botInfoChannel = botInfoResult.channel as TextChannel;

			// Create the alert message with role mentions
			const moderatorRoleMentions = [
				`<@&${DISCORD_ROLES.MODERATOR.id}>`,
				`<@&${DISCORD_ROLES.LEAD_MODERATOR.id}>`,
				`<@&${DISCORD_ROLES.MANAGER.id}>`,
			];

			const alertEmbed = {
				color: isEdit ? 0xffa500 : 0xff0000,
				title: `⚠️ Potenciálně problematická ${isEdit ? "upravená " : ""}zpráva`,
				description: `AI Moderátor označil ${isEdit ? "upravenou " : ""}zprávu jako potenciálně problematickou.`,
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
						name: "Typ",
						value: isEdit ? "Upravená zpráva" : "Nová zpráva",
						inline: true,
					},
					{
						name: "Zpráva",
						value: message.content.substring(0, 1024),
						inline: false,
					},
					{
						name: "Kategorie porušení",
						value: moderationResult.categories.length > 0 ? moderationResult.categories.join(", ") : "Nespecifikováno",
						inline: false,
					},
				],
				timestamp: new Date().toISOString(),
			};

			if (moderationResult.reason) {
				alertEmbed.fields.push({
					name: "Důvod",
					value: moderationResult.reason,
					inline: false,
				});
			}

			// Add link to jump to the message
			alertEmbed.fields.push({
				name: "Odkaz na zprávu",
				value: `[Přejít na zprávu](${message.url})`,
				inline: false,
			});

			// Send alert to BOT_INFO channel with role mentions
			await botInfoChannel.send({
				content: `${moderatorRoleMentions.join(" ")} - Automatická kontrola zpráv detekovala potenciální problém`,
				embeds: [alertEmbed],
			});

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
