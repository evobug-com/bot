import { ORPCError } from "@orpc/client";
import { ChatInputCommandBuilder, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { createErrorEmbed, createProgressBar } from "../util";
import type { CommandContext } from "../util/commands.ts";
import { createCeskyStatistickyUradEmbed } from "../util/messages/embedBuilders.ts";

export const data = new ChatInputCommandBuilder()
	.setName("activity")
	.setNameLocalizations({ cs: "aktivita" })
	.setDescription("Show your activity points and weekly ranking")
	.setDescriptionLocalizations({ cs: "Zobrazit vaše body aktivity a týdenní umístění" })
	.addUserOptions((option) =>
		option
			.setName("user")
			.setNameLocalizations({ cs: "uživatel" })
			.setDescription("Show activity for another user")
			.setDescriptionLocalizations({
				cs: "Zobrazit aktivitu pro jiného uživatele",
			})
			.setRequired(false),
	);

export const execute = async ({ interaction }: CommandContext) => {
	const targetUser = interaction.options.getUser("user") || interaction.user;

	const [error, result] = await orpc.users.stats.activity.get({
		discordId: targetUser.id,
	});

	if (error) {
		if (error instanceof ORPCError && error.code === "NOT_FOUND") {
			const embed = createCeskyStatistickyUradEmbed()
				.setTitle("📊 Body aktivity")
				.setFields({
					name: "🙎 Subjekt",
					value: `${targetUser.displayName}`,
					inline: true,
				})
				.setDescription("Tento uživatel ještě nemá žádné body aktivity.");
			await interaction.reply({ embeds: [embed] });
		} else {
			const embed = createErrorEmbed("Chyba", "Při načítání aktivity došlo k chybě. Zkuste to prosím později.");
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
			console.error("Error fetching user activity:", error);
		}
		return;
	}

	const { lifetimePoints, weeklyPoints, weeklyRemaining, weeklyCap, weeklyRank, lifetimeRank } = result;

	// Create progress bar for weekly cap
	const weeklyProgressBar = createProgressBar(weeklyPoints, weeklyCap);

	// Format rank display
	const formatRank = (rank: number | null): string => {
		if (rank === null) return "—";
		if (rank === 1) return "🥇 #1";
		if (rank === 2) return "🥈 #2";
		if (rank === 3) return "🥉 #3";
		return `#${rank}`;
	};

	const embed = createCeskyStatistickyUradEmbed()
		.setTitle("📊 Body aktivity")
		.addFields(
			{
				name: "🙎 Subjekt",
				value: `${targetUser.displayName}`,
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
				name: "📅 Týdenní body",
				value: `**${weeklyPoints.toLocaleString()}**`,
				inline: true,
			},
			{
				name: "🏆 Týdenní umístění",
				value: formatRank(weeklyRank),
				inline: true,
			},
			{
				name: "",
				value: "",
				inline: true,
			},
		)
		.addFields(
			{
				name: "🌟 Celoživotní body",
				value: `**${lifetimePoints.toLocaleString()}**`,
				inline: true,
			},
			{
				name: "📈 Celoživotní umístění",
				value: formatRank(lifetimeRank),
				inline: true,
			},
			{
				name: "",
				value: "",
				inline: true,
			},
		)
		.addFields({
			name: "📊 Týdenní limit",
			value: `${weeklyProgressBar}\n${weeklyPoints.toLocaleString()}/${weeklyCap.toLocaleString()} bodů (zbývá ${weeklyRemaining.toLocaleString()})`,
			inline: false,
		})
		.setFooter({
			text: "Body získáváš za zprávy, reakce, vytváření vláken a čas ve voice kanálech.\nTop 10 uživatelů každý týden dostane odměny!",
		});

	await interaction.reply({ embeds: [embed] });
};
