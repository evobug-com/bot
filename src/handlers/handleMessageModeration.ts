import { type Client, Events, type Message, type TextChannel, userMention } from "discord.js";
import { DISCORD_CHANNELS, getChannelByConfig } from "../util/config/channels.ts";
import { DISCORD_ROLES } from "../util/config/roles.ts";
import { moderateMessage } from "../utils/openrouter.ts";

export async function handleMessageModeration(client: Client<true>): Promise<void> {
	console.log("[Message Moderation] Setting up OpenRouter message moderation...");

	client.on(Events.MessageCreate, async (message: Message) => {
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
		if (message.content.length < 3) {
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
				console.log(`[Message Moderation] Flagged message from ${message.author.tag} in <#${message.channel.id}>`);

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
					color: 0xff0000,
					title: "⚠️ Potenciálně problematická zpráva",
					description: `OpenRouter označil zprávu jako potenciálně problematickou.`,
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
						{
							name: "Kategorie porušení",
							value:
								moderationResult.categories.length > 0 ? moderationResult.categories.join(", ") : "Nespecifikováno",
							inline: false,
						},
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: "OpenRouter Moderation (Llama Guard 4)",
					},
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
	});

	console.log("[Message Moderation] OpenRouter message moderation initialized");
}
