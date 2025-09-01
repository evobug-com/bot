import { ORPCError } from "@orpc/client";
import { ActionRowBuilder, ChatInputCommandBuilder, MessageFlags, SecondaryButtonBuilder } from "discord.js";
import { getDbUser, orpc } from "../client/client.ts";
import {
	AccountStanding,
	type AccountStandingData,
	createStandingDisplay,
	type Violation,
} from "../data/violationData.ts";
import { createErrorEmbed } from "../util";
import type { CommandContext } from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
	.setName("standing")
	.setNameLocalizations({ cs: "stav" })
	.setDescription("Check account standing")
	.setDescriptionLocalizations({ cs: "Zkontrolovat stav účtu" })
	.addUserOptions((option) =>
		option
			.setName("user")
			.setNameLocalizations({ cs: "uživatel" })
			.setDescription("User to check standing for (defaults to yourself)")
			.setDescriptionLocalizations({ cs: "Uživatel, jehož stav zkontrolovat (výchozí: vy)" })
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
	const viewingOthers = targetUser.id !== interaction.user.id;

	// If viewing others, make response ephemeral for privacy
	const flags = MessageFlags.Ephemeral;

	await interaction.deferReply({ flags });

	try {
		// Get database user ID from Discord ID
		let targetDbUser: Awaited<ReturnType<typeof getDbUser>> | undefined;
		try {
			targetDbUser = await getDbUser(interaction.guild, targetUser.id);
		} catch (_error) {
			// User not registered in database - show clean standing
			const cleanStanding: AccountStandingData = {
				standing: AccountStanding.ALL_GOOD,
				activeViolations: 0,
				totalViolations: 0,
				restrictions: [],
				severityScore: 0,
				lastViolation: undefined,
				nextExpiration: undefined,
			};

			const display = createStandingDisplay(cleanStanding, [], viewingOthers ? targetUser.tag : undefined);

			await interaction.editReply({
				components: [display],
				flags: MessageFlags.IsComponentsV2 | (flags || 0),
			});
			return;
		}

		// Fetch standing from API using database user ID
		const standingResponse = await orpc.moderation.standing.get({
			userId: targetDbUser.id,
			guildId: interaction.guild.id,
		});

		// Fetch violations for detailed display
		const violationsListResponse = await orpc.moderation.violations.list({
			userId: targetDbUser.id,
			guildId: interaction.guild.id,
			includeExpired: false, // Only show active violations in standing
		});

		// Extract violations from response
		const violationsResponse = violationsListResponse.violations || [];

		// Convert API responses to our types
		const standingData: AccountStandingData = {
			standing: standingResponse.standing,
			activeViolations: standingResponse.activeViolations,
			totalViolations: standingResponse.totalViolations || standingResponse.activeViolations,
			restrictions: standingResponse.restrictions || [],
			severityScore: standingResponse.severityScore,
			lastViolation: standingResponse.nextExpirationDate ? new Date(standingResponse.nextExpirationDate) : undefined,
			nextExpiration: standingResponse.nextExpirationDate ? new Date(standingResponse.nextExpirationDate) : undefined,
		};

		const violations: Violation[] = violationsResponse.map((v: any) => ({
			...v,
			issuedAt: new Date(v.issuedAt),
			expiresAt: v.expiresAt ? new Date(v.expiresAt) : null,
			expiredAt: v.expiredAt ? new Date(v.expiredAt) : null,
			reviewedAt: v.reviewedAt ? new Date(v.reviewedAt) : null,
			restrictions:
				typeof v.restrictions === "string" ? (v.restrictions ? JSON.parse(v.restrictions) : []) : v.restrictions || [],
		}));

		// Create the standing display with appropriate header
		const display = createStandingDisplay(standingData, violations, viewingOthers ? targetUser.tag : undefined);

		// Add action buttons if viewing own standing
		const components = [display];
		if (!viewingOthers && standingData.activeViolations > 0) {
			const viewViolationsButton = new SecondaryButtonBuilder()
				.setCustomId("view_violations")
				.setLabel("Zobrazit podrobnosti porušení")
				.setEmoji({ name: "📋" });

			const requestReviewButton = new SecondaryButtonBuilder()
				.setCustomId("request_review")
				.setLabel("Požádat o přezkoumání")
				.setEmoji({ name: "📝" });

			const actionRow = new ActionRowBuilder().addComponents(viewViolationsButton, requestReviewButton) as any;

			components.push(actionRow);
		}

		await interaction.editReply({
			components,
			flags: MessageFlags.IsComponentsV2 | (flags || 0),
		});
	} catch (error) {
		console.error("Error fetching account standing:", error);

		if (error instanceof ORPCError && error.code === "NOT_FOUND") {
			// User has no violations, show clean standing
			const cleanStanding: AccountStandingData = {
				standing: AccountStanding.ALL_GOOD,
				activeViolations: 0,
				totalViolations: 0,
				restrictions: [],
				severityScore: 0,
				lastViolation: undefined,
				nextExpiration: undefined,
			};

			const display = createStandingDisplay(cleanStanding, [], viewingOthers ? targetUser.tag : undefined);

			await interaction.editReply({
				components: [display],
				flags: MessageFlags.IsComponentsV2 | (flags || 0),
			});
		} else {
			const embed = createErrorEmbed(
				"Chyba při načítání stavu účtu",
				"Při načítání stavu účtu došlo k chybě. Zkuste to prosím později.",
			);
			await interaction.editReply({ embeds: [embed] });
		}
	}
};
