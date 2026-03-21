import { ChatInputCommandBuilder } from "@discordjs/builders";
import { orpc } from "../client/client.ts";
import { createErrorEmbed, createInfoEmbed } from "../util";
import type { CommandContext } from "../util/commands.ts";
import { createCeskyStatistickyUradEmbed } from "../util/messages/embedBuilders.ts";

// Investment metrics removed - use /invest leaderboard for investment rankings
const METRICS: Record<string, MetricConfig> = {
	coins: {
		emoji: "🪙",
		label: "Mince",
		formatValue: (value) => `🪙 ${value.toLocaleString()}`,
	},
	xp: {
		emoji: "✨",
		label: "XP",
		formatValue: (value) => `✨ ${value.toLocaleString()}`,
	},
	level: {
		emoji: "📊",
		label: "Úroveň",
		formatValue: (value) => `📊 Level ${value}`,
	},
	dailystreak: {
		emoji: "🔥",
		label: "Denní série",
		formatValue: (value) => `🔥 ${value} dní`,
	},
	maxdailystreak: {
		emoji: "🏆",
		label: "Max série",
		formatValue: (value) => `🏆 ${value} dní`,
	},
	workcount: {
		emoji: "💼",
		label: "Počet prací",
		formatValue: (value) => `💼 ${value}x`,
	},
	activityweekly: {
		emoji: "📅",
		label: "Týdenní aktivita",
		formatValue: (value) => `📅 ${value.toLocaleString()} bodů`,
	},
	activitylifetime: {
		emoji: "🌟",
		label: "Celoživotní aktivita",
		formatValue: (value) => `🌟 ${value.toLocaleString()} bodů`,
	},
};

export const data = new ChatInputCommandBuilder()
	.setName("top")
	.setNameLocalizations({ cs: "žebříček" })
	.setDescription("View the top users leaderboard")
	.setDescriptionLocalizations({ cs: "Zobrazit žebříček nejlepších uživatelů" })
	.addStringOptions((option) =>
		option
			.setName("metric")
			.setNameLocalizations({ cs: "metrika" })
			.setDescription("The metric to sort by")
			.setDescriptionLocalizations({ cs: "Podle čeho seřadit" })
			.setRequired(false)
			.addChoices(
				...Object.entries(METRICS).map(([value, config]) => ({
					name: config.label,
					value,
				})),
			),
	)
	.addIntegerOptions((option) =>
		option
			.setName("limit")
			.setNameLocalizations({ cs: "počet" })
			.setDescription("Number of users to show (default: 10)")
			.setDescriptionLocalizations({
				cs: "Počet uživatelů k zobrazení (výchozí: 10)",
			})
			.setRequired(false)
			.setMinValue(5)
			.setMaxValue(25),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	await interaction.deferReply();

	const metric = (interaction.options.getString("metric") || "coins") as MetricKey;
	const limit = interaction.options.getInteger("limit") || 10;

	// Get top users
	const [error, topUsers] = await orpc.users.stats.top({ metric, limit });

	if (error) {
		console.error("Error executing top command:", error);
		const errorEmbed = createErrorEmbed("Chyba", "Při načítání žebříčku došlo k chybě. Zkuste to prosím později.");
		await interaction.editReply({ embeds: [errorEmbed] });
		return;
	}

	if (topUsers.length === 0) {
		const embed = createInfoEmbed(
			`🏆 Žebříček - ${METRICS[metric]?.label}`,
			"Zatím nejsou žádní uživatelé v žebříčku.",
		);
		await interaction.editReply({ embeds: [embed] });
		return;
	}

	// Format leaderboard fields
	const fields = await Promise.all(
		topUsers.map(async ({ user, metricValue }, index) => {
			const medal = index <= 2 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`;

			// Determine display name
			let displayName: string;
			if (user.discordId) {
				// Fetch Discord user to get their username
				try {
					const discordUser = await interaction.client.users.fetch(user.discordId);
					displayName = discordUser.username;
					if (user.discordId === interaction.user.id) {
						displayName = `**${displayName}** (Vy)`;
					}
				} catch (error) {
					// If fetching fails, fallback to username or guildedId
					console.error(`Failed to fetch Discord user ${user.discordId}:`, error);
					displayName = user.username || user.guildedId || "Neznámý";
				}
			} else if (user.username) {
				// Fallback to username if no Discord ID
				displayName = user.username;
			} else {
				// Fallback to guildedId if nothing else
				displayName = user.guildedId ?? "Neznámý";
			}

			const value = METRICS[metric]?.formatValue(metricValue) ?? "N/A";

			return {
				name: `${medal} ${displayName}`,
				value,
			};
		}),
	);

	const embed = createCeskyStatistickyUradEmbed()
		.addFields(
            {
					name: "📊 Metrika",
					value: METRICS[metric]?.label as string,
					inline: true,
				},
				{
					name: "🔢 Zobrazeno",
					value: `${topUsers.length} uživatelů`,
					inline: true,
				},
				{
					name: "",
					value: "",
					inline: false,
				},
		)
		.addFields(fields);

	await interaction.editReply({ embeds: [embed] });
};

type MetricKey =
	| "coins"
	| "xp"
	| "level"
	| "dailystreak"
	| "maxdailystreak"
	| "workcount"
	| "activityweekly"
	| "activitylifetime";

type MetricConfig = {
	emoji: string;
	label: string;
	formatValue: (value: number) => string;
};
