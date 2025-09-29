import {
    ChatInputCommandBuilder,
    type ChatInputCommandInteraction,
    ContainerBuilder,
    MessageFlags,
    ModalBuilder, type ModalSubmitInteraction,
    PermissionFlagsBits,
    SeparatorSpacingSize,
    TextInputStyle,
    type User,
} from "discord.js";
import { getDbUser } from "../client/client.ts";
import { PolicyType, ViolationSeverity, ViolationType } from "../data/violationData.ts";
import { issueViolation } from "../handlers/handleWarningSystem.ts";
import { createErrorEmbed, RoleManager } from "../util";
import type { CommandContext } from "../util/commands.ts";
import { createLogger } from "../util/logger.ts";

const log = createLogger("BanCommand");

// Rule categories and their rules for the modal select menu
const RULE_CATEGORIES = {
	"Základní chování": [
		{ value: "101", label: "101: Šikana, výhrůžky, nenávist" },
		{ value: "102", label: "102: Zveřejňování osobních údajů" },
		{ value: "103", label: "103: Sebepoškozování" },
		{ value: "104", label: "104: Nelegální/škodlivé" },
		{ value: "105", label: "105: Bez výjimek pro kamarády" },
		{ value: "106", label: "106: Autorská práva" },
	],
	"Text & Voice": [
		{ value: "201", label: "201: Text = PG-13" },
		{ value: "202", label: "202: Voice respekt" },
		{ value: "203", label: "203: NSFW v avatarech/nickách" },
		{ value: "204", label: "204: Spoilery" },
	],
	"Spam & formátování": [
		{ value: "301", label: "301: Zneužití pingů" },
		{ value: "302", label: "302: Flood zpráv" },
		{ value: "303", label: "303: Kapitálky" },
		{ value: "304", label: "304: Markdown zneužití" },
		{ value: "305", label: "305: Reaction spam" },
		{ value: "306", label: "306: Citace spam" },
	],
	"Obsah & kanály": [
		{ value: "401", label: "401: Špatný kanál" },
		{ value: "402", label: "402: Podezřelé odkazy" },
		{ value: "403", label: "403: Nevhodné memes" },
	],
	Reklama: [
		{ value: "501", label: "501: Nevyžádaná reklama" },
		{ value: "502", label: "502: DM reklama" },
	],
	"Identita & soukromí": [
		{ value: "601", label: "601: Vydávání se za jiné" },
		{ value: "602", label: "602: Soukromé konverzace" },
	],
	Jazyk: [
		{ value: "701", label: "701: Jiný jazyk" },
		{ value: "702", label: "702: Nadměrné klení" },
	],
	Technické: [
		{ value: "801", label: "801: Self-boty/raid" },
		{ value: "802", label: "802: Alt účty" },
		{ value: "803", label: "803: Nesprávné hlášení" },
	],
	"Věk & zákony": [
		{ value: "901", label: "901: Nedostatečný věk" },
		{ value: "902", label: "902: Porušení zákonů" },
	],
	Moderace: [
		{ value: "1001", label: "1001: Opakované porušení" },
		{ value: "1002", label: "1002: Ignorování moderace" },
		{ value: "1003", label: "1003: Zneužití odvolání" },
		{ value: "1004", label: "1004: Discord ToS" },
	],
};

export const data = new ChatInputCommandBuilder()
	.setName("ban")
	.setDescription("Ban a user with reason notification")
	.setDescriptionLocalizations({ cs: "Zabanovat uživatele s oznámením důvodu" })
	.setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
	.addUserOptions((option) =>
		option
			.setName("user")
			.setNameLocalizations({ cs: "uživatel" })
			.setDescription("User to ban")
			.setDescriptionLocalizations({ cs: "Uživatel k zabanování" })
			.setRequired(true),
	)
	.addIntegerOptions((option) =>
		option
			.setName("delete_days")
			.setNameLocalizations({ cs: "smazat_dny" })
			.setDescription("Delete messages from last X days (0-7)")
			.setDescriptionLocalizations({ cs: "Smazat zprávy za posledních X dní (0-7)" })
			.setRequired(false)
			.setMinValue(0)
			.setMaxValue(7),
	)
	.addStringOptions((option) =>
		option
			.setName("quick_reason")
			.setNameLocalizations({ cs: "rychly_duvod" })
			.setDescription("Quick reason (skip modal)")
			.setDescriptionLocalizations({ cs: "Rychlý důvod (přeskočí modal)" })
			.setRequired(false)
			.setMaxLength(500),
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
			content: "❌ Nemáte oprávnění používat tento příkaz. Pouze Moderátoři a vyšší.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	const targetUser = interaction.options.getUser("user", true);
	const deleteDays = interaction.options.getInteger("delete_days") ?? 1;
	const quickReason = interaction.options.getString("quick_reason");

	// Validate target
	if (targetUser.bot) {
		await interaction.reply({
			content: "❌ Nelze zabanovat bota.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (targetUser.id === interaction.user.id) {
		await interaction.reply({
			content: "❌ Nemůžete zabanovat sami sebe.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Check if member exists and is bannable
	const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
	if (member && !member.bannable) {
		await interaction.reply({
			content: "❌ Nemohu zabanovat tohoto uživatele (vyšší role nebo nedostatečná oprávnění).",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// If quick reason provided, skip modal
	if (quickReason) {
		await interaction.deferReply();
		await performBan(interaction, targetUser, "Jiné", quickReason, "", false, deleteDays);
		return;
	}

	// Show modal for detailed reason
	const modal = new ModalBuilder().setCustomId(`ban_modal_${targetUser.id}`).setTitle(`Zabanovat ${targetUser.tag}`);

	// Add inputs to the modal
	modal.addLabelComponents((labelBuilder) =>
		labelBuilder
			.setLabel("Číslo pravidla (např. 101, 301, nebo 'Jiné')")
			.setTextInputComponent((inputBuilder) =>
				inputBuilder
					.setCustomId("rule_number")
					.setPlaceholder("101")
					.setStyle(TextInputStyle.Short)
					.setRequired(true)
					.setMaxLength(20),
			),
	);

	modal.addLabelComponents((labelBuilder) =>
		labelBuilder
			.setLabel("Důvod banu")
			.setTextInputComponent((inputBuilder) =>
				inputBuilder
					.setCustomId("reason")
					.setPlaceholder("Podrobný popis porušení pravidel...")
					.setStyle(TextInputStyle.Paragraph)
					.setRequired(true)
					.setMinLength(10)
					.setMaxLength(1000),
			),
	);

	modal.addLabelComponents((labelBuilder) =>
		labelBuilder
			.setLabel("Permanentní ban? (ano/ne)")
			.setTextInputComponent((inputBuilder) =>
				inputBuilder
					.setCustomId("is_permanent")
					.setPlaceholder("ano")
					.setStyle(TextInputStyle.Short)
					.setRequired(true)
					.setMaxLength(3),
			),
	);

	modal.addLabelComponents((labelBuilder) =>
		labelBuilder
			.setLabel("Dodatečné poznámky (nepovinné)")
			.setTextInputComponent((inputBuilder) =>
				inputBuilder
					.setCustomId("additional_notes")
					.setPlaceholder("Další kontext, důkazy, odkazy...")
					.setStyle(TextInputStyle.Paragraph)
					.setRequired(false)
					.setMaxLength(500),
			),
	);

	await interaction.showModal(modal);

	// Wait for modal submission
	try {
		const modalSubmit = await interaction.awaitModalSubmit({
			filter: (i) => i.customId === `ban_modal_${targetUser.id}`,
			time: 300000, // 5 minutes
		});

		await modalSubmit.deferReply();

		const ruleNumber = modalSubmit.components.getTextInputValue("rule_number");
		const reason = modalSubmit.components.getTextInputValue("reason");
		const isPermanentStr = modalSubmit.components.getTextInputValue("is_permanent").toLowerCase();
		const additionalNotes = modalSubmit.components.getTextInputValue("additional_notes") || "";

		const isPermanent = isPermanentStr === "ano" || isPermanentStr === "yes" || isPermanentStr === "y";

		await performBan(modalSubmit, targetUser, ruleNumber, reason, additionalNotes, isPermanent, deleteDays);
	} catch (error) {
		log("error", "Modal timeout or error:", error);
	}
};

async function performBan(
	interaction: ChatInputCommandInteraction | ModalSubmitInteraction,
	targetUser: User,
	ruleNumber: string,
	reason: string,
	additionalNotes: string,
	isPermanent: boolean,
	deleteDays: number,
) {
	if (!interaction.guild) return;

	const guild = interaction.guild;
	const moderator = interaction.user;

	// Find the rule details
	let ruleText = "";
	for (const [category, rules] of Object.entries(RULE_CATEGORIES)) {
		const rule = rules.find((r) => r.value === ruleNumber);
		if (rule) {
			ruleText = `${category} - ${rule.label}`;
			break;
		}
	}

	if (!ruleText && ruleNumber !== "Jiné") {
		ruleText = `Pravidlo ${ruleNumber}`;
	} else if (ruleNumber === "Jiné") {
		ruleText = "Jiné důvody";
	}

	// Try to send DM before banning
	let dmSent = false;
	try {
		const dmContainer = new ContainerBuilder()
			.setAccentColor(0xff0000) // Red for ban
			.addTextDisplayComponents((display) =>
				display.setContent(
					`# 🔨 Byl/a jsi zabanován/a ze serveru\n\n` +
						`**Server:** ${guild.name}\n` +
						`**Typ banu:** ${isPermanent ? "⛔ PERMANENTNÍ" : "⏱️ DOČASNÝ"}\n` +
						`**Datum:** ${new Date().toLocaleString("cs-CZ")}\n` +
						`**Moderátor:** ${moderator.tag}`,
				),
			)
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) =>
				display.setContent(
					`## 📋 Důvod banu\n\n` +
						`**Porušené pravidlo:** ${ruleText}\n` +
						`**Důvod:** ${reason}\n` +
						(additionalNotes ? `**Dodatečné poznámky:** ${additionalNotes}\n` : ""),
				),
			)
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) =>
				display.setContent(
					`## ℹ️ Co dál?\n\n` +
						(isPermanent
							? `• Tento ban je **permanentní**\n` +
								`• Pro odvolání navštivte: https://allcom.zone/appeals\n` +
								`• Odvolání musí obsahovat:\n` +
								`  - Důvod, proč by měl být ban zrušen\n` +
								`  - Ujištění, že se situace nebude opakovat\n`
							: `• Tento ban je **dočasný**\n` +
								`• Můžeš požádat o předčasné odvolání na: https://allcom.zone/appeals\n` +
								`• Opakované porušení povede k permanentnímu banu\n`) +
						`\n_Používání alternativních účtů k obcházení banu je zakázáno a povede k permanentnímu banu._`,
				),
			);

		await targetUser.send({
			components: [dmContainer],
			flags: MessageFlags.IsComponentsV2,
		});
		dmSent = true;
	} catch (error) {
		log("warn", `Could not send ban DM to user ${targetUser.id}:`, error);
	}

	// Get database users
	const targetDbUser = await getDbUser(guild, targetUser.id);
	const issuerDbUser = await getDbUser(guild, moderator.id);

	// Determine severity and expiration
	const severity = isPermanent ? ViolationSeverity.CRITICAL : ViolationSeverity.HIGH;
	const expiresAt = isPermanent ? undefined : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days for temp ban

	// Issue a violation record
	await issueViolation(interaction.client, {
		userId: targetDbUser.id,
		guildId: guild.id,
		type: ViolationType.OTHER,
		severity: severity,
		policyViolated: PolicyType.MODERATION,
		reason: `Ban (${isPermanent ? "Permanentní" : "Dočasný"}): ${reason}`,
		contentSnapshot: `Rule: ${ruleText}`,
		context: additionalNotes || undefined,
		issuedBy: issuerDbUser.id,
		expiresAt: expiresAt,
		restrictions: [],
		actionsApplied: [{ type: "BAN", applied: true, appliedAt: new Date() }],
	});

	// Perform the ban
	try {
		const deleteSeconds = deleteDays * 86400; // Convert days to seconds
		await guild.members.ban(targetUser, {
			reason: `${ruleText}: ${reason} (Moderátor: ${moderator.tag})`,
			deleteMessageSeconds: deleteSeconds,
		});

		// Success response
		const successContainer = new ContainerBuilder()
			.setAccentColor(0x00ff00) // Green for success
			.addTextDisplayComponents((display) =>
				display.setContent(
					`# ✅ Uživatel úspěšně zabanován\n\n` +
						`**Uživatel:** ${targetUser.tag} (${targetUser.id})\n` +
						`**Typ banu:** ${isPermanent ? "⛔ Permanentní" : "⏱️ Dočasný"}\n` +
						`**Porušené pravidlo:** ${ruleText}\n` +
						`**Důvod:** ${reason}\n` +
						(additionalNotes ? `**Poznámky:** ${additionalNotes}\n` : "") +
						`**Smazané zprávy:** Za posledních ${deleteDays} ${deleteDays === 1 ? "den" : "dní"}\n` +
						`**DM oznámení:** ${dmSent ? "✅ Odesláno" : "❌ Nepodařilo se odeslat (DM zakázány)"}`,
				),
			);

		await interaction.editReply({
			components: [successContainer],
			flags: MessageFlags.IsComponentsV2,
		});
	} catch (error) {
		log("error", "Failed to ban user:", error);
		const embed = createErrorEmbed("Chyba při banování", "Nepodařilo se zabanovat uživatele. Zkuste to prosím znovu.");
		await interaction.editReply({ embeds: [embed] });
	}
}

async function checkModeratorPermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
	if (!interaction.member || !interaction.guild) return false;

	const member = interaction.guild.members.cache.get(interaction.user.id);
	if (!member) return false;

	const hasModerator = await RoleManager.hasRole(member, "MODERATOR");
	const hasLeadModerator = await RoleManager.hasRole(member, "LEAD_MODERATOR");
	const hasManager = await RoleManager.hasRole(member, "MANAGER");
	const hasAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

	return hasModerator || hasLeadModerator || hasManager || hasAdmin;
}
