import { ChatInputCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import type { CommandContext } from "../util/commands.ts";
import { getUserSettings, setStoryWorkEnabled } from "../services/userSettings/storage.ts";

export const data = new ChatInputCommandBuilder()
	.setName("settings")
	.setNameLocalizations({ cs: "nastavení" })
	.setDescription("Manage your personal bot settings")
	.setDescriptionLocalizations({ cs: "Spravuj svá osobní nastavení bota" })
	.addSubcommands((subcommand) =>
		subcommand
			.setName("view")
			.setNameLocalizations({ cs: "zobrazit" })
			.setDescription("View your current settings")
			.setDescriptionLocalizations({ cs: "Zobraz svá aktuální nastavení" }),
	)
	.addSubcommands((subcommand) =>
		subcommand
			.setName("story-work")
			.setNameLocalizations({ cs: "příběhová-práce" })
			.setDescription("Toggle story activities during /work")
			.setDescriptionLocalizations({ cs: "Přepni příběhové aktivity během /work" })
			.addBooleanOptions((option) =>
				option
					.setName("enabled")
					.setNameLocalizations({ cs: "zapnuto" })
					.setDescription("Enable or disable story activities")
					.setDescriptionLocalizations({ cs: "Zapni nebo vypni příběhové aktivity" })
					.setRequired(true),
			),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const subcommand = interaction.options.getSubcommand();
	const discordId = interaction.user.id;

	if (subcommand === "view") {
		const settings = getUserSettings(discordId);

		const embed = new EmbedBuilder()
			.setTitle("Tvá nastavení")
			.setColor(0x5865f2)
			.addFields({
				name: "Příběhová práce",
				value: settings.storyWorkEnabled
					? "✅ Zapnuto (20% šance na příběh při /work)"
					: "❌ Vypnuto (žádné příběhy při /work)",
				inline: false,
			})
			.setFooter({ text: "Použij /settings story-work pro změnu" });

		await interaction.editReply({ embeds: [embed] });
		return;
	}

	if (subcommand === "story-work") {
		const enabled = interaction.options.getBoolean("enabled", true);

		setStoryWorkEnabled(discordId, enabled);

		const embed = new EmbedBuilder()
			.setTitle("Nastavení aktualizováno")
			.setColor(enabled ? 0x57f287 : 0xed4245)
			.setDescription(
				enabled
					? "✅ **Příběhová práce zapnuta**\n\nPři použití /work máš nyní 20% šanci na příběhovou aktivitu."
					: "❌ **Příběhová práce vypnuta**\n\nPři použití /work už nebudeš dostávat příběhové aktivity.",
			);

		await interaction.editReply({ embeds: [embed] });
		return;
	}
};
