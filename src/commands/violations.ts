import { ORPCError } from "@orpc/client";
import { ChatInputCommandBuilder, type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getDbUser, orpc } from "../client/client.ts";
import { createViolationListDisplay, type Violation } from "../data/violationData.ts";
import { createErrorEmbed } from "../util";
import type { CommandContext } from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
	.setName("violations")
	.setNameLocalizations({ cs: "porušení" })
	.setDescription("View violations for a user")
	.setDescriptionLocalizations({ cs: "Zobrazit porušení uživatele" })
	.addUserOptions((option) =>
		option
			.setName("user")
			.setNameLocalizations({ cs: "uživatel" })
			.setDescription("User to view violations for (defaults to yourself)")
			.setDescriptionLocalizations({ cs: "Uživatel, jehož porušení zobrazit (výchozí: vy)" })
			.setRequired(false),
	)
	.addBooleanOptions((option) =>
		option
			.setName("show_expired")
			.setNameLocalizations({ cs: "zobrazit_vypršelé" })
			.setDescription("Include expired violations in the list")
			.setDescriptionLocalizations({ cs: "Zahrnout vypršelá porušení do seznamu" })
			.setRequired(false),
	);

export const execute = async ({ interaction, dbUser }: CommandContext) => {
	if (!interaction.guild) {
		await interaction.reply({
			content: "❌ Tento příkaz lze použít pouze na serveru.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const targetUser = interaction.options.getUser("user") || interaction.user;
	const showExpired = interaction.options.getBoolean("show_expired") ?? false;

	// Check if viewing someone else's violations
	const viewingOthers = targetUser.id !== interaction.user.id;

	// If viewing others, make response ephemeral for privacy
	const flags = MessageFlags.Ephemeral;

	await interaction.deferReply({ flags });

	try {
		// Get database user ID from Discord ID
		const targetDbUser = await getDbUser(interaction.guild, targetUser.id);

		// Fetch violations from API using database user ID
		const response = await orpc.moderation.violations.list({
			userId: targetDbUser.id,
			guildId: interaction.guild.id,
			includeExpired: true, // We'll filter client-side based on showExpired
		});

		// Extract violations from response
		const violations = response.violations || [];

		// Convert API response to our Violation type
		const typedViolations: Violation[] = violations.map((v: any) => ({
			...v,
			issuedAt: new Date(v.issuedAt),
			expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
			expiredAt: v.expiredAt ? new Date(v.expiredAt) : null,
			reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : null,
			restrictions:
				typeof v.restrictions === "string" ? (v.restrictions ? JSON.parse(v.restrictions) : []) : v.restrictions || [],
		}));

		// Create the display with appropriate header
		const display = createViolationListDisplay(
			typedViolations,
			showExpired,
			viewingOthers ? targetUser.tag : undefined,
		);

		await interaction.editReply({
			components: [display],
			flags: MessageFlags.IsComponentsV2 | (flags || 0),
		});
	} catch (error) {
		console.error("Error fetching violations:", error);

		if (error instanceof ORPCError && error.code === "NOT_FOUND") {
			await interaction.editReply({
				content: `❌ Uživatel ${targetUser.tag} není registrován v systému.`,
			});
		} else {
			const embed = createErrorEmbed(
				"Chyba při načítání porušení",
				"Při načítání seznamu porušení došlo k chybě. Zkuste to prosím později.",
			);
			await interaction.editReply({ embeds: [embed] });
		}
	}
};
