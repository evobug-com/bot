import {
	ActionRowBuilder,
	ChatInputCommandBuilder,
	ComponentType,
	DangerButtonBuilder,
	EmbedBuilder,
	type Guild,
	MessageFlags,
	SecondaryButtonBuilder,
} from "discord.js";
import type { CommandContext } from "../util/commands.ts";

const getAdminIds = (): string[] => {
	const adminIds = process.env.ADMIN_IDS;
	if (!adminIds) return [];
	return adminIds.split(",").map((id) => id.trim());
};

export const data = new ChatInputCommandBuilder()
	.setName("leave")
	.setDescription("Opustit server (pouze pro adminy)")
	.addStringOptions((option) =>
		option.setName("guild_id").setDescription("ID serveru, který má bot opustit").setRequired(true),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const adminIds = getAdminIds();
	if (!adminIds.includes(interaction.user.id)) {
		await interaction.editReply({
			content: "❌ Nemáš oprávnění použít tento příkaz.",
		});
		return;
	}

	const guildId = interaction.options.getString("guild_id", true);

	try {
		const targetGuild: Guild | undefined = interaction.client.guilds.cache.get(guildId);

		if (!targetGuild) {
			await interaction.editReply({
				content: `❌ Nepodařilo se najít server s ID: ${guildId}`,
			});
			return;
		}

		// Create embed with server info
		const embed = new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle("⚠️ Potvrzení opuštění serveru")
			.setDescription("Opravdu chceš, aby bot opustil tento server?")
			.addFields(
				{ name: "📝 Název serveru", value: targetGuild.name, inline: true },
				{ name: "🆔 ID serveru", value: targetGuild.id, inline: true },
				{ name: "👥 Počet členů", value: targetGuild.memberCount.toString(), inline: true },
				{ name: "👑 Vlastník", value: `<@${targetGuild.ownerId}>`, inline: true },
				{
					name: "📅 Bot připojen",
					value: targetGuild.joinedAt ? `<t:${Math.floor(targetGuild.joinedAt.getTime() / 1000)}:R>` : "Neznámé",
					inline: true,
				},
				{ name: "🌍 Region", value: targetGuild.preferredLocale || "Neznámý", inline: true },
			)
			.setTimestamp();

		const iconUrl = targetGuild.iconURL();
		if (iconUrl) {
			embed.setThumbnail(iconUrl);
		}

		// Create confirmation buttons
		const row = new ActionRowBuilder().addComponents(
			new DangerButtonBuilder().setCustomId("confirm_leave").setLabel("✅ Ano, opustit server"),
			new SecondaryButtonBuilder().setCustomId("cancel_leave").setLabel("❌ Zrušit"),
		);

		const response = await interaction.editReply({
			embeds: [embed],
			components: [row],
		});

		// Wait for button interaction
		const collector = response.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 30000, // 30 seconds timeout
		});

		collector.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.user.id !== interaction.user.id) {
				await buttonInteraction.reply({
					content: "❌ Toto potvrzení není pro tebe.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			if (buttonInteraction.customId === "confirm_leave") {
				await buttonInteraction.deferUpdate();

				try {
					await targetGuild.leave();

					const successEmbed = new EmbedBuilder()
						.setColor(0x00ff00)
						.setTitle("✅ Server opuštěn")
						.setDescription(`Bot úspěšně opustil server **${targetGuild.name}** (ID: ${guildId})`)
						.setTimestamp();

					await interaction.editReply({
						embeds: [successEmbed],
						components: [],
					});
				} catch (error) {
					const errorEmbed = new EmbedBuilder()
						.setColor(0xff0000)
						.setTitle("❌ Chyba")
						.setDescription(`Nepodařilo se opustit server: ${error instanceof Error ? error.message : "Neznámá chyba"}`)
						.setTimestamp();

					await interaction.editReply({
						embeds: [errorEmbed],
						components: [],
					});
				}
			} else if (buttonInteraction.customId === "cancel_leave") {
				await buttonInteraction.deferUpdate();

				const cancelEmbed = new EmbedBuilder()
					.setColor(0xffa500)
					.setTitle("🚫 Akce zrušena")
					.setDescription("Opuštění serveru bylo zrušeno.")
					.setTimestamp();

				await interaction.editReply({
					embeds: [cancelEmbed],
					components: [],
				});
			}

			collector.stop();
		});

		collector.on("end", async (collected) => {
			if (collected.size === 0) {
				const timeoutEmbed = new EmbedBuilder()
					.setColor(0xffa500)
					.setTitle("⏱️ Časový limit")
					.setDescription("Potvrzení vypršelo po 30 sekundách.")
					.setTimestamp();

				await interaction.editReply({
					embeds: [timeoutEmbed],
					components: [],
				});
			}
		});
	} catch (error) {
		console.error(`Failed to process leave command for ${guildId}:`, error);
		await interaction.editReply({
			content: `❌ Nastala chyba při zpracování příkazu: ${error instanceof Error ? error.message : "Neznámá chyba"}`,
		});
	}
};
