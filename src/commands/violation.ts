import {
	type ChatInputCommandInteraction,
	MessageFlags,
	PermissionFlagsBits,
	SeparatorSpacingSize,
} from "discord.js";
import { ChatInputCommandBuilder, ContainerBuilder } from "@discordjs/builders";
import { getDbUser } from "../client/client.ts";
import {
	DefaultExpirationDays,
	FeatureRestriction,
	FeatureRestrictionLabels,
	PolicyType,
	PolicyTypeLabels,
	ViolationSeverity,
	ViolationSeverityLabels,
	ViolationType,
	ViolationTypeLabels,
	ViolationTypeToPolicies,
	ViolationTypeToRestrictions,
} from "../data/violationData.ts";
import { issueViolation } from "../handlers/handleWarningSystem.ts";
import { createErrorEmbed, RoleManager } from "../util";
import type { CommandContext } from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
	.setName("violation")
	.setNameLocalizations({ cs: "porušení" })
	.setDescription("Issue a violation to a user (moderators only)")
	.setDescriptionLocalizations({ cs: "Vydat porušení uživateli (pouze pro moderátory)" })
	.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
	.addUserOptions((option) =>
		option
			.setName("user")
			.setNameLocalizations({ cs: "uživatel" })
			.setDescription("User to issue violation to")
			.setDescriptionLocalizations({ cs: "Uživatel, kterému vydat porušení" })
			.setRequired(true),
	)
	.addStringOptions((option) =>
		option
			.setName("type")
			.setNameLocalizations({ cs: "typ" })
			.setDescription("Type of violation")
			.setDescriptionLocalizations({ cs: "Typ porušení" })
			.setRequired(true)
			.addChoices(
				{ name: "Spam / Flooding", value: ViolationType.SPAM },
				{ name: "Toxické chování", value: ViolationType.TOXICITY },
				{ name: "NSFW obsah", value: ViolationType.NSFW },
				{ name: "Porušení soukromí", value: ViolationType.PRIVACY },
				{ name: "Vydávání se za jiného", value: ViolationType.IMPERSONATION },
				{ name: "Nelegální obsah", value: ViolationType.ILLEGAL },
				{ name: "Nevyžádaná reklama", value: ViolationType.ADVERTISING },
				{ name: "Sebepoškozování", value: ViolationType.SELF_HARM },
				{ name: "Obcházení trestu", value: ViolationType.EVASION },
				{ name: "Jiné", value: ViolationType.OTHER },
			),
	)
	.addStringOptions((option) =>
		option
			.setName("severity")
			.setNameLocalizations({ cs: "závažnost" })
			.setDescription("Severity of the violation")
			.setDescriptionLocalizations({ cs: "Závažnost porušení" })
			.setRequired(true)
			.addChoices(
				{ name: "Nízká - drobné prohřešky", value: ViolationSeverity.LOW },
				{ name: "Střední - standardní porušení", value: ViolationSeverity.MEDIUM },
				{ name: "Vysoká - vážná porušení", value: ViolationSeverity.HIGH },
				{ name: "Kritická - závažná porušení", value: ViolationSeverity.CRITICAL },
			),
	)
	.addStringOptions((option) =>
		option
			.setName("reason")
			.setNameLocalizations({ cs: "důvod" })
			.setDescription("Detailed reason for the violation")
			.setDescriptionLocalizations({ cs: "Podrobný důvod porušení" })
			.setRequired(true)
			.setMaxLength(1000),
	)
	.addStringOptions((option) =>
		option
			.setName("evidence")
			.setNameLocalizations({ cs: "důkaz" })
			.setDescription("Link to evidence or additional context")
			.setDescriptionLocalizations({ cs: "Odkaz na důkaz nebo další kontext" })
			.setRequired(false)
			.setMaxLength(500),
	)
	.addIntegerOptions((option) =>
		option
			.setName("duration")
			.setNameLocalizations({ cs: "trvání" })
			.setDescription("Days until violation expires (leave empty for default based on severity)")
			.setDescriptionLocalizations({ cs: "Dny do vypršení porušení (nechte prázdné pro výchozí podle závažnosti)" })
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(365),
	)
	.addStringOptions((option) =>
		option
			.setName("restrictions")
			.setNameLocalizations({ cs: "omezení" })
			.setDescription("Additional restrictions (comma-separated, or 'auto' for automatic)")
			.setDescriptionLocalizations({ cs: "Další omezení (oddělená čárkou, nebo 'auto' pro automatické)" })
			.setRequired(false)
			.setMaxLength(200),
	);

export const execute = async ({ interaction }: CommandContext) => {
	if (!interaction.guild) {
		await interaction.reply({
			content: "❌ Tento příkaz lze použít pouze na serveru.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Check permissions
	const hasPermission = await checkModeratorPermission(interaction);
	if (!hasPermission) {
		await interaction.reply({
			content: "❌ Nemáte oprávnění používat tento příkaz. Tento příkaz mohou používat pouze Moderátoři a vyšší.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const targetUser = interaction.options.getUser("user", true);
	const type = interaction.options.getString("type", true) as ViolationType;
	const severity = interaction.options.getString("severity", true) as ViolationSeverity;
	const reason = interaction.options.getString("reason", true);
	const evidence = interaction.options.getString("evidence") || undefined;
	const duration = interaction.options.getInteger("duration") || undefined;
	const restrictionsInput = interaction.options.getString("restrictions") || undefined;

	// Validate target
	if (targetUser.bot) {
		await interaction.reply({
			content: "❌ Nelze vydat porušení botům.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// if (targetUser.id === interaction.user.id) {
	//     await interaction.reply({
	//         content: "❌ Nemůžete vydat porušení sami sobě.",
	//         flags: MessageFlags.Ephemeral
	//     });
	//     return;
	// }

	await interaction.deferReply();

	try {
		// Parse restrictions
		let restrictions: FeatureRestriction[] = [];
		if (restrictionsInput) {
			if (restrictionsInput.toLowerCase() === "auto") {
				// Use automatic restrictions based on violation type
				restrictions = ViolationTypeToRestrictions[type];
			} else {
				// Parse comma-separated restrictions
				const inputRestrictions = restrictionsInput.split(",").map((r) => r.trim().toUpperCase());
				restrictions = inputRestrictions.filter((r) =>
					Object.values(FeatureRestriction).includes(r as FeatureRestriction),
				) as FeatureRestriction[];
			}
		} else {
			// Default to automatic restrictions
			restrictions = ViolationTypeToRestrictions[type];
		}

		// Calculate expiration
		const expirationDays = duration || DefaultExpirationDays[severity];
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + expirationDays);

		// Get appropriate policy
		const policies = ViolationTypeToPolicies[type];
		const primaryPolicy = policies[0] || PolicyType.MODERATION;

		// Get database user IDs from Discord IDs
		const targetDbUser = await getDbUser(interaction.guild, targetUser.id);
		const issuerDbUser = await getDbUser(interaction.guild, interaction.user.id);

		// Issue the violation using database user IDs
		const violation = await issueViolation(interaction.client, {
			userId: targetDbUser.id,
			guildId: interaction.guild.id,
			type,
			severity,
			policyViolated: primaryPolicy,
			reason,
			evidence,
			restrictions,
			issuedBy: issuerDbUser.id,
			expiresAt,
			actionsApplied: [],
		});

		if (!violation) {
			await interaction.editReply({
				content: "❌ Nepodařilo se vydat porušení. Zkuste to prosím znovu.",
			});
			return;
		}

		// Create success display using Components V2
		const restrictionsList =
			restrictions.length > 0 ? restrictions.map((r) => `• ${FeatureRestrictionLabels[r]}`).join("\n") : "Žádná";

		const successContainer = new ContainerBuilder()
			.setAccentColor(0x00ff00) // Green for success
			.addTextDisplayComponents((display) =>
				display.setContent(
					`# ✅ Porušení úspěšně vydáno\n\n` +
						`**Uživatel:** ${targetUser.displayName} (${targetUser.tag})\n` +
						`**ID porušení:** #${violation.id}`,
				),
			)
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) =>
				display.setContent(
					`**📋 Detaily porušení**\n\n` +
						`**Typ:** ${ViolationTypeLabels[type]}\n` +
						`**Závažnost:** ${ViolationSeverityLabels[severity]}\n` +
						`**Politika:** ${PolicyTypeLabels[primaryPolicy]}\n` +
						`**Důvod:** ${reason}\n` +
						(evidence ? `**Důkaz:** ${evidence}\n` : "") +
						`**Vyprší:** ${expiresAt.toLocaleDateString("cs-CZ")} (za ${expirationDays} dní)`,
				),
			)
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) => display.setContent(`**🚫 Aplikovaná omezení**\n\n${restrictionsList}`))
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) =>
				display.setContent(
					`✉️ **Uživatel byl informován prostřednictvím soukromé zprávy.**\n` +
						`_Porušení bylo zaznamenáno a bude sledováno._`,
				),
			);

		await interaction.editReply({
			components: [successContainer],
			flags: MessageFlags.IsComponentsV2,
		});
	} catch (error) {
		console.error("Error issuing violation:", error);
		const embed = createErrorEmbed(
			"Chyba při vydávání porušení",
			"Při vydávání porušení došlo k chybě. Zkuste to prosím znovu.",
		);
		await interaction.editReply({ embeds: [embed] });
	}
};

/**
 * Check if user has moderator permissions
 */
async function checkModeratorPermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
	if (!interaction.member || !interaction.guild) return false;

	const member = interaction.guild.members.cache.get(interaction.user.id);
	if (!member) return false;

	// Check for moderator roles
	const hasModerator = await RoleManager.hasRole(member, "MODERATOR");
	const hasLeadModerator = await RoleManager.hasRole(member, "LEAD_MODERATOR");
	const hasManager = await RoleManager.hasRole(member, "MANAGER");
	const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

	return hasModerator || hasLeadModerator || hasManager || hasAdmin;
}
