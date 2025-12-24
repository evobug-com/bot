import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
import type { CommandContext } from "../util/commands";
import {
	getWorkSettings,
	setAIStoryEnabled,
	setStoryChancePercent,
	setAIStoryChancePercent,
} from "../services/workSettings/storage";

const getAdminIds = (): string[] => {
	const adminIds = process.env.ADMIN_IDS;
	if (!adminIds) return [];
	return adminIds.split(",").map((id) => id.trim());
};

export const data = new ChatInputCommandBuilder()
	.setName("work-settings")
	.setDescription("Configure work command settings (admin only)")
	.addSubcommands((subcommand) =>
		subcommand
			.setName("ai-story")
			.setDescription("Toggle AI-generated stories")
			.addBooleanOptions((option) =>
				option
					.setName("enabled")
					.setDescription("Enable or disable AI-generated stories")
					.setRequired(true),
			),
	)
	.addSubcommands((subcommand) =>
		subcommand
			.setName("story-chance")
			.setDescription("Set the chance for story activities during /work")
			.addIntegerOptions((option) =>
				option
					.setName("percent")
					.setDescription("Chance percentage (0-100)")
					.setRequired(true)
					.setMinValue(0)
					.setMaxValue(100),
			),
	)
	.addSubcommands((subcommand) =>
		subcommand
			.setName("ai-chance")
			.setDescription("Set chance for AI vs predefined stories (0=always predefined, 100=always AI)")
			.addIntegerOptions((option) =>
				option
					.setName("percent")
					.setDescription("AI story chance (0-100)")
					.setRequired(true)
					.setMinValue(0)
					.setMaxValue(100),
			),
	)
	.addSubcommands((subcommand) =>
		subcommand.setName("status").setDescription("Show current work settings"),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	const adminIds = getAdminIds();

	if (!adminIds.includes(interaction.user.id)) {
		await interaction.reply({
			content: "Only admins can use this command.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const subcommand = interaction.options.getSubcommand();

	switch (subcommand) {
		case "ai-story": {
			const enabled = interaction.options.getBoolean("enabled", true);
			setAIStoryEnabled(enabled);
			await interaction.editReply({
				content: `AI-generated stories: **${enabled ? "ENABLED" : "DISABLED"}**`,
			});
			break;
		}

		case "story-chance": {
			const percent = interaction.options.getInteger("percent", true);
			setStoryChancePercent(percent);
			await interaction.editReply({
				content: `Story chance set to **${percent}%**`,
			});
			break;
		}

		case "ai-chance": {
			const percent = interaction.options.getInteger("percent", true);
			setAIStoryChancePercent(percent);
			await interaction.editReply({
				content: `AI story chance set to **${percent}%** (${percent === 0 ? "always predefined" : percent === 100 ? "always AI" : "mixed"})`,
			});
			break;
		}

		case "status": {
			const settings = getWorkSettings();
			await interaction.editReply({
				content: [
					"**Work Settings**",
					"",
					`AI Stories: ${settings.aiStoryEnabled ? "ENABLED" : "DISABLED"}`,
					`Story Chance: ${settings.storyChancePercent}%`,
					`AI Story Chance: ${settings.aiStoryChancePercent}% ${settings.aiStoryChancePercent === 0 ? "(always predefined)" : settings.aiStoryChancePercent === 100 ? "(always AI)" : "(mixed)"}`,
				].join("\n"),
			});
			break;
		}
	}
};
