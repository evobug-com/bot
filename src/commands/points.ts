import { ORPCError } from "@orpc/client";
import { ChatInputCommandBuilder, type Guild, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { createErrorEmbed, createProgressBar } from "../util";
import { type CommandContext, getCommand } from "../util/commands.ts";
import { createCeskyStatistickyUradEmbed } from "../util/messages/embedBuilders.ts";

export const data = new ChatInputCommandBuilder()
	.setName("points")
	.setNameLocalizations({ cs: "body" })
	.setDescription("Show your points and XP")
	.setDescriptionLocalizations({ cs: "Zobrazit vaše body a XP" })
	.addUserOptions((option) =>
		option
			.setName("user")
			.setNameLocalizations({ cs: "uživatel" })
			.setDescription("Show points for another user")
			.setDescriptionLocalizations({
				cs: "Zobrazit body pro jiného uživatele",
			})
			.setRequired(false),
	);

export const execute = async ({ interaction }: CommandContext) => {
	const targetUser = interaction.options.getUser("user") || interaction.user;

	try {
		const { stats, levelProgress } = await orpc.users.stats.user({
			discordId: targetUser.id,
		});

		// Create progress bar for XP
		const progressBar = createProgressBar(levelProgress.xpProgress, levelProgress.xpNeeded);

		function getState() {
			if (stats.coinsCount >= 1_000_000) {
				return "Kryptobaron";
			}
			if (stats.coinsCount >= 70_000) {
				return "Pracující";
			}
			if (stats.coinsCount >= 30_000) {
				return "Brigádník";
			}
			if (stats.coinsCount >= 10_000) {
				return "Student";
			}
			return "Na dávkách";
		}

		const embed = createCeskyStatistickyUradEmbed()
			.addFields(
				{
					name: "🙎 Subjekt",
					value: `${targetUser.displayName}`,
					inline: true,
				},
				{
					name: "⚕️ Stav",
					value: getState(),
					inline: true,
				},
				{
					name: "",
					value: "",
					inline: false,
				},
			)
			.addFields(
				{
					name: "💵 Mince",
					value: `${stats.coinsCount.toLocaleString()}`,
					inline: true,
				},
				{
					name: "✨ XP",
					value: `${stats.xpCount.toLocaleString()}`,
					inline: true,
				},
				{ name: "⭐ Úroveň", value: `${levelProgress.currentLevel}`, inline: true },
				{
					name: "📊 Postup na další úroveň",
					value: `${progressBar}\n${levelProgress.xpProgress}/${levelProgress.xpNeeded} XP`,
					inline: false,
				},
			)
			.setFooter({
				text: `Přihlaš se každý den na úřad práce </daily:${getCommand("daily")?.instances[interaction.guildId as string]?.id}>\nA pracuj poctivě kažou hodinu </work:${getCommand("work")?.instances[interaction.guildId as string]?.id}>\nAbys mohl získat více mincí a XP`,
			});

		await interaction.reply({ embeds: [embed] });
	} catch (error) {
		if (error instanceof ORPCError && error.code === "NOT_FOUND") {
			await interaction.reply({ embeds: [createNotFoundEmbed(interaction.guild as Guild, targetUser.displayName)] });
		} else {
			const title = "Chyba";
			const description = "Při načítání bodů došlo k chybě. Zkuste to prosím později.";
			const embed = createErrorEmbed(title, description);
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
			console.error("Error fetching user points:", error);
		}
	}
};

const createNotFoundEmbed = (guild: Guild, displayName: string) =>
	createCeskyStatistickyUradEmbed()
		.setFields(
			...[
				{
					name: "🙎 Subjekt",
					value: `${displayName}`,
					inline: true,
				},
				{
					name: "⚕️ Stav",
					value: "Nenalezen",
					inline: true,
				},
			],
		)
		.setFooter({
			text: `Sděl uživateli, ať se přihlásí na úřad práce pomocí </daily:${getCommand("daily")?.instances[guild.id]?.id}> nebo </work:${getCommand("work")?.instances[guild.id]?.id}>`,
		});
