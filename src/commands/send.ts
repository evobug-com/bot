import {
	ActionRowBuilder,
	ChatInputCommandBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import type { CommandContext } from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
	.setName("send")
	.setDescription("Sends an embed to the current channel")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export const execute = async ({ interaction, dbUser }: CommandContext): Promise<void> => {
	// Create the modal
	const modal = new ModalBuilder().setCustomId("sendEmbedModal").setTitle("Embed Message");

	// Create the text input components
	const embedJson = new TextInputBuilder()
		.setCustomId("embedContent")
		.setLabel("Embed Message (JSON)")
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(true)
		.setMaxLength(4000);

	const row = new ActionRowBuilder().addComponents(embedJson);

	// Add inputs to the modal
	modal.setActionRows(row);

	// Show the modal to the user
	await interaction.showModal(modal);
};
