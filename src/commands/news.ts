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
	.setName("news")
	.setDescription("Vytvoří novinky pomocí AI")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	const modal = new ModalBuilder().setCustomId("newsModal").setTitle("Novinky");

	const newsContent = new TextInputBuilder()
		.setCustomId("newsContent")
		.setLabel("Seznam změn/novinek")
		.setPlaceholder("- Přidána nová funkce X\n- Opravena chyba Y\n- Vylepšen systém Z")
		.setStyle(TextInputStyle.Paragraph)
		.setRequired(true)
		.setMaxLength(4000);

	const row = new ActionRowBuilder().addComponents(newsContent);

	modal.setActionRows(row);

	await interaction.showModal(modal);
};
