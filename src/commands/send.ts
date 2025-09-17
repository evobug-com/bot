import {
	ActionRowBuilder,
	ChatInputCommandBuilder,
	type ModalActionRowComponentBuilder,
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

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	// Create the modal
	const modal = new ModalBuilder().setCustomId("sendEmbedModal").setTitle("Embed Message");

	// Add inputs to the modal
	modal.addLabelComponents((labelBuilder) =>
		labelBuilder
			.setLabel("Embed JSON")
			.setTextInputComponent((inputBuilder) =>
				inputBuilder
					.setCustomId("embedContent")
					.setPlaceholder("Enter the embed JSON here")
					.setStyle(TextInputStyle.Paragraph)
					.setRequired(true)
					.setMaxLength(4000),
			),
	);

	// Show the modal to the user
	await interaction.showModal(modal);
};
