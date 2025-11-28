import { ORPCError } from "@orpc/client";
import { ChatInputCommandBuilder, type Guild, MessageFlags } from "discord.js";
import { orpc } from "../client/client.ts";
import { createErrorEmbed, createProgressBar } from "../util";
import { getProfitLossEmoji } from "../util/bot/investment-helpers.ts";
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

	// Use the new endpoint that includes investment data
	const [error, result] = await orpc.users.stats.userWithInvestments({
		discordId: targetUser.id,
	});

	if (error) {
		if (error instanceof ORPCError && error.code === "NOT_FOUND") {
			await interaction.reply({ embeds: [createNotFoundEmbed(interaction.guild as Guild, targetUser.displayName)] });
		} else {
			const title = "Chyba";
			const description = "Při načítání bodů došlo k chybě. Zkuste to prosím později.";
			const embed = createErrorEmbed(title, description);
			await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
			console.error("Error fetching user points:", error);
		}
		return;
	}

	const { stats, levelProgress, investments, totalWealth } = result;

	// Create progress bar for XP
	const progressBar = createProgressBar(levelProgress.xpProgress, levelProgress.xpNeeded);

	// State now considers total wealth (coins + investment value)
	function getState() {
		if (totalWealth >= 1_000_000) {
			return "Kryptobaron";
		}
		if (totalWealth >= 70_000) {
			return "Pracující";
		}
		if (totalWealth >= 30_000) {
			return "Brigádník";
		}
		if (totalWealth >= 10_000) {
			return "Student";
		}
		return "Na dávkách";
	}

	// Build investment info string
	const hasInvestments = investments.holdingsCount > 0;
	let investmentInfo = "";
	if (hasInvestments) {
		const profitEmoji = getProfitLossEmoji(investments.totalProfit);
		const profitSign = investments.totalProfit >= 0 ? "+" : "";
		investmentInfo = `${investments.currentValue.toLocaleString()} mincí\n${profitEmoji} ${profitSign}${investments.totalProfit.toLocaleString()} (${profitSign}${investments.profitPercent.toFixed(1)}%)`;
	} else {
		investmentInfo = "Žádné investice";
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
				name: "📈 Investice",
				value: investmentInfo,
				inline: true,
			},
			{
				name: "💎 Celkové bohatství",
				value: `${totalWealth.toLocaleString()} mincí`,
				inline: true,
			},
		)
		.addFields(
			{
				name: "✨ XP",
				value: `${stats.xpCount.toLocaleString()}`,
				inline: true,
			},
			{ name: "⭐ Úroveň", value: `${levelProgress.currentLevel}`, inline: true },
			{ name: "", value: "", inline: true },
			{
				name: "📊 Postup na další úroveň",
				value: `${progressBar}\n${levelProgress.xpProgress}/${levelProgress.xpNeeded} XP`,
				inline: false,
			},
		)
		.setFooter({
			text: `Přihlaš se každý den na úřad práce /daily\nA pracuj poctivě kažou hodinu /work\nAbys mohl získat více mincí a XP`,
		});

	await interaction.reply({ embeds: [embed] });
};

const createNotFoundEmbed = (guild: Guild, displayName: string) =>
	createCeskyStatistickyUradEmbed()
		.setFields(
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
		)
		.setFooter({
			text: `Sděl uživateli, ať se přihlásí na úřad práce pomocí </daily:${getCommand("daily")?.instances[guild.id]?.id}> nebo </work:${getCommand("work")?.instances[guild.id]?.id}>`,
		});
