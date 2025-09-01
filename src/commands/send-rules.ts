import { ChannelType, ChatInputCommandBuilder, PermissionFlagsBits, type TextChannel } from "discord.js";
import { infoData, rulesComponentsV2Simple, rulesData } from "../data/rulesData.ts";
import type { CommandContext } from "../util/commands";

export const data = new ChatInputCommandBuilder()
	.setName("send-rules")
	.setDescription("Send rules using Discord's Components V2 system (rich formatting)")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
	.addChannelOptions((option) =>
		option
			.setName("channel")
			.setDescription("The channel to send the rules to (defaults to current channel)")
			.addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
			.setRequired(false),
	)
	.addStringOptions((option) =>
		option
			.setName("style")
			.setDescription("Choose the style of rules message")
			.addChoices(
				{ name: "Full - Complete rules with containers", value: "full" },
				{ name: "Simple - Basic version", value: "simple" },
			)
			.setRequired(false),
	)
	.addBooleanOptions((option) =>
		option
			.setName("include-explanation")
			.setDescription("Include explanation message about why rules are structured this way")
			.setRequired(false),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	// Defer reply as sending might take a moment
	await interaction.deferReply();

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
		if (!targetChannel.permissionsFor(interaction.guild?.members.me!)?.has(PermissionFlagsBits.SendMessages)) {
			await interaction.editReply({
				content: `❌ I don't have permission to send messages in ${targetChannel}.`,
			});
			return;
		}

		// Get the style (default to full)
		const style = interaction.options.getString("style") || "full";
		const rulesMessage = style === "simple" ? rulesComponentsV2Simple : rulesData;

		// Send the rules message
		await targetChannel.send(rulesMessage);
		await targetChannel.send(infoData);
		await interaction.deleteReply();
	} catch (error) {
		console.error("Error sending rules components V2 message:", error);
		await interaction.editReply({
			content: "❌ Failed to send rules message. Make sure Discord.js supports Components V2.",
		});
	}
};
