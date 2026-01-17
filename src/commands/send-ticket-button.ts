import { ChannelType, ChatInputCommandBuilder, MessageFlags, PermissionFlagsBits, type TextChannel } from "discord.js";
import { createTicketButtonMessage } from "../handlers/handleTicketSystem.ts";
import type { CommandContext } from "../util/commands";

export const data = new ChatInputCommandBuilder()
	.setName("send-ticket-button")
	.setDescription("Send the ticket creation button to a channel")
	.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
	.addChannelOptions((option) =>
		option
			.setName("channel")
			.setDescription("The channel to send the ticket button to (defaults to current channel)")
			.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
			.setRequired(false),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		// Get the target channel (specified or current)
		const targetChannel =
			(interaction.options.getChannel("channel") as TextChannel | null) || (interaction.channel as TextChannel);

		if (!targetChannel) {
			await interaction.editReply({
				content: "❌ Could not determine target channel.",
			});
			return;
		}

		// Check if bot can send messages to the channel
		const botMember = interaction.guild?.members.me;
		if (!botMember || !targetChannel.permissionsFor(botMember)?.has(PermissionFlagsBits.SendMessages)) {
			await interaction.editReply({
				content: `❌ I don't have permission to send messages in ${targetChannel.name}.`,
			});
			return;
		}

		// Send the ticket button message
		const ticketMessage = createTicketButtonMessage();
		await targetChannel.send(ticketMessage);

		await interaction.editReply({
			content: `✅ Ticket button sent to <#${targetChannel.id}>.`,
		});
	} catch (error) {
		console.error("Error sending ticket button:", error);
		await interaction.editReply({
			content: "❌ Failed to send ticket button message.",
		});
	}
};
