import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
	ActionRowBuilder,
	ChatInputCommandBuilder,
	DangerButtonBuilder,
	PrimaryButtonBuilder,
	SecondaryButtonBuilder,
} from "@discordjs/builders";
import { getDbUser, orpc } from "../client/client.ts";
import {
	createReviewRequestConfirmation,
	type Violation,
	type ViolationSeverity,
	ViolationSeverityLabels,
	type ViolationType,
	ViolationTypeLabels,
} from "../data/violationData.ts";
import { ChannelManager } from "../util";
import type { CommandContext } from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
	.setName("review")
	.setNameLocalizations({ cs: "přezkoumání" })
	.setDescription("Request a review of a violation")
	.setDescriptionLocalizations({ cs: "Požádat o přezkoumání porušení" })
	.addStringOptions((option) =>
		option
			.setName("violation_id")
			.setNameLocalizations({ cs: "id_porušení" })
			.setDescription("ID of the violation to review (use /violations to see IDs)")
			.setDescriptionLocalizations({ cs: "ID porušení k přezkoumání (použijte /violations pro zobrazení ID)" })
			.setRequired(true),
	)
	.addStringOptions((option) =>
		option
			.setName("reason")
			.setNameLocalizations({ cs: "důvod" })
			.setDescription("Why you believe the violation is incorrect")
			.setDescriptionLocalizations({ cs: "Proč si myslíte, že porušení je nesprávné" })
			.setRequired(true)
			.setMinLength(20)
			.setMaxLength(1000),
	);

export const execute = async ({ interaction }: CommandContext) => {
	if (!interaction.guild) {
		await interaction.reply({
			content: "❌ Tento příkaz lze použít pouze na serveru.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const violationId = interaction.options.getString("violation_id", true);
	const reviewReason = interaction.options.getString("reason", true);

	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	// Fetch the violation - convert string ID to number
	const [violationError, violationResponse] = await orpc.moderation.violations.get({
		violationId: Number.parseInt(violationId, 10),
	});

	if (violationError) {
		await interaction.editReply({
			content:
				"❌ Porušení s tímto ID nebylo nalezeno. Použijte příkaz `/violations` pro zobrazení vašich porušení a jejich ID.",
		});
		return;
	}

	const violation = {
		...violationResponse,
		type: violationResponse.type as ViolationType,
		severity: violationResponse.severity as ViolationSeverity,
		issuedAt: new Date(violationResponse.issuedAt),
		expiresAt: violationResponse.expiresAt ? new Date(violationResponse.expiresAt) : null,
		reviewedAt: violationResponse.reviewedAt ? new Date(violationResponse.reviewedAt) : null,
		restrictions:
			typeof violationResponse.restrictions === "string"
				? violationResponse.restrictions
					? JSON.parse(violationResponse.restrictions)
					: []
				: violationResponse.restrictions || [],
	} as Violation;

	// Get database user ID to check ownership
	const userDbUser = await getDbUser(interaction.guild, interaction.user.id);

	// Check if violation belongs to the user
	if (violation.userId !== userDbUser.id) {
		await interaction.editReply({
			content: "❌ Můžete požádat o přezkoumání pouze svých vlastních porušení.",
		});
		return;
	}

	// Check if violation is already reviewed
	if (violation.reviewRequested) {
		await interaction.editReply({
			content: "⚠️ Pro toto porušení již byla podána žádost o přezkoumání. Moderátoři ji vyřizují.",
		});
		return;
	}

	// Check if violation is expired
	if (violation.expiresAt && violation.expiresAt < new Date()) {
		await interaction.editReply({
			content: "❌ Nelze požádat o přezkoumání vypršelého porušení.",
		});
		return;
	}

	// Submit review request by updating the violation
	// Since reviews are now part of violations, we need to update the violation directly
	// This should be done through a new endpoint or by updating the violation
	// For now, we'll skip this API call as the endpoint doesn't exist
	const reviewId = `temp_${violation.id}`; // Temporary ID until API is updated

	// Send confirmation to user
	const confirmationMessage = createReviewRequestConfirmation(violation, reviewReason);
	await interaction.editReply({
		components: confirmationMessage.components,
		flags: MessageFlags.IsComponentsV2,
	});

	// Notify moderators in review channel
	await notifyModeratorsOfReview(interaction, violation, reviewReason, reviewId);
};

/**
 * Notify moderators about a new review request
 */
async function notifyModeratorsOfReview(
	interaction: ChatInputCommandInteraction,
	violation: Violation,
	reviewReason: string,
	reviewId: string,
): Promise<void> {
	try {
		if (!interaction.guild) return;

		// Get moderation review channel
		const reviewChannel = ChannelManager.getTextChannel(interaction.guild, "MODERATION_REVIEW");
		if (!reviewChannel) {
			console.warn("Moderation review channel not found");
			return;
		}

		// Create notification message
		const notificationMessage =
			`📝 **Nová žádost o přezkoumání**\n\n` +
			`**Uživatel:** <@${violation.userId}> (${interaction.user.tag})\n` +
			`**ID žádosti:** \`${reviewId}\`\n` +
			`**ID porušení:** \`${violation.id}\`\n\n` +
			`**Porušení:**\n` +
			`• Typ: ${ViolationTypeLabels[violation.type]}\n` +
			`• Závažnost: ${ViolationSeverityLabels[violation.severity]}\n` +
			`• Důvod: ${violation.reason}\n` +
			`• Datum: ${violation.issuedAt.toLocaleDateString("cs-CZ")}\n\n` +
			`**Důvod žádosti o přezkoumání:**\n${reviewReason}\n\n` +
			`**Akce:**`;

		// Create action buttons
		const approveButton = new PrimaryButtonBuilder()
			.setCustomId(`review_approve_${reviewId}`)
			.setLabel("Schválit (odstranit porušení)")
			.setEmoji({ name: "✅" });

		const reduceButton = new SecondaryButtonBuilder()
			.setCustomId(`review_reduce_${reviewId}`)
			.setLabel("Snížit závažnost")
			.setEmoji({ name: "⬇️" });

		const denyButton = new DangerButtonBuilder()
			.setCustomId(`review_deny_${reviewId}`)
			.setLabel("Zamítnout")
			.setEmoji({ name: "❌" });

		const actionRow = new ActionRowBuilder().addComponents(approveButton, reduceButton, denyButton);

		await reviewChannel.send({
			content: notificationMessage,
			components: [actionRow],
		});
	} catch (error) {
		console.error("Failed to notify moderators of review:", error);
	}
}
