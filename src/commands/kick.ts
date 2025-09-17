import {
	ChatInputCommandBuilder,
	type ChatInputCommandInteraction,
	ContainerBuilder,
	MessageFlags,
	ModalBuilder,
	PermissionFlagsBits,
	SeparatorSpacingSize,
	TextInputStyle,
} from "discord.js";
import { getDbUser } from "../client/client.ts";
import { PolicyType, ViolationSeverity, ViolationType } from "../data/violationData.ts";
import { issueViolation } from "../handlers/handleWarningSystem.ts";
import { createErrorEmbed, RoleManager } from "../util";
import type { CommandContext } from "../util/commands.ts";
import { createLogger } from "../util/logger.ts";

const log = createLogger("KickCommand");

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
	.setName("kick")
	.setDescription("Kick a user with reason notification")
	.setDescriptionLocalizations({ cs: "Vyhodit uživatele s oznámením důvodu" })
	.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
	.addUserOptions((option) =>
		option
			.setName("user")
			.setNameLocalizations({ cs: "uživatel" })
			.setDescription("User to kick")
			.setDescriptionLocalizations({ cs: "Uživatel k vyhození" })
			.setRequired(true),
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
	const quickReason = interaction.options.getString("quick_reason");

	// Validate target
	if (targetUser.bot) {
		await interaction.reply({
			content: "❌ Nelze vyhodit bota.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (targetUser.id === interaction.user.id) {
		await interaction.reply({
			content: "❌ Nemůžete vyhodit sami sebe.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Check if member exists and is kickable
	const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
	if (!member) {
		await interaction.reply({
			content: "❌ Uživatel není na serveru.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (!member.kickable) {
		await interaction.reply({
			content: "❌ Nemohu vyhodit tohoto uživatele (vyšší role nebo nedostatečná oprávnění).",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// If quick reason provided, skip modal
	if (quickReason) {
		await interaction.deferReply();
		await performKick(interaction, targetUser, "Jiné", quickReason, "");
		return;
	}

	// Show modal for detailed reason
	const modal = new ModalBuilder().setCustomId(`kick_modal_${targetUser.id}`).setTitle(`Vyhodit ${targetUser.tag}`);

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
			.setLabel("Důvod vyhození")
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
			filter: (i) => i.customId === `kick_modal_${targetUser.id}`,
			time: 300000, // 5 minutes
		});

		await modalSubmit.deferReply();

		const ruleNumber = modalSubmit.fields.getTextInputValue("rule_number");
		const reason = modalSubmit.fields.getTextInputValue("reason");
		const additionalNotes = modalSubmit.fields.getTextInputValue("additional_notes") || "";

		await performKick(modalSubmit, targetUser, ruleNumber, reason, additionalNotes);
	} catch (error) {
		log("error", "Modal timeout or error:", error);
	}
};

async function performKick(
	interaction: ChatInputCommandInteraction | any,
	targetUser: any,
	ruleNumber: string,
	reason: string,
	additionalNotes: string,
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

	// Try to send DM before kicking
	let dmSent = false;
	try {
		const dmContainer = new ContainerBuilder()
			.setAccentColor(0xffa500) // Orange for kick
			.addTextDisplayComponents((display) =>
				display.setContent(
					`# ⚠️ Byl/a jsi vyhozen/a ze serveru\n\n` +
						`**Server:** ${guild.name}\n` +
						`**Datum:** ${new Date().toLocaleString("cs-CZ")}\n` +
						`**Moderátor:** ${moderator.tag}`,
				),
			)
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) =>
				display.setContent(
					`## 📋 Důvod vyhození\n\n` +
						`**Porušené pravidlo:** ${ruleText}\n` +
						`**Důvod:** ${reason}\n` +
						(additionalNotes ? `**Dodatečné poznámky:** ${additionalNotes}\n` : ""),
				),
			)
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) =>
				display.setContent(
					`## ℹ️ Co dál?\n\n` +
						`• Můžeš se vrátit na server pomocí pozvánky\n` +
						`• Doporučujeme si přečíst pravidla před návratem\n` +
						`• Opakované porušení může vést k permanentnímu banu\n\n` +
						`_Pokud si myslíš, že jde o omyl, kontaktuj moderátory._`,
				),
			);

		await targetUser.send({
			components: [dmContainer],
			flags: MessageFlags.IsComponentsV2,
		});
		dmSent = true;
	} catch (error) {
		log("warn", `Could not send kick DM to user ${targetUser.id}:`, error);
	}

	// Get database users
	const targetDbUser = await getDbUser(guild, targetUser.id);
	const issuerDbUser = await getDbUser(guild, moderator.id);

	// Issue a violation record
	await issueViolation(interaction.client, {
		userId: targetDbUser.id,
		guildId: guild.id,
		type: ViolationType.OTHER,
		severity: ViolationSeverity.MEDIUM,
		policyViolated: PolicyType.MODERATION,
		reason: `Kick: ${reason}`,
		contentSnapshot: `Rule: ${ruleText}`,
		context: additionalNotes || undefined,
		issuedBy: issuerDbUser.id,
		expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
		restrictions: [],
		actionsApplied: [{ type: "KICK", applied: true, appliedAt: new Date() }],
	});

	// Perform the kick
	try {
		await guild.members.kick(targetUser, `${ruleText}: ${reason} (Moderátor: ${moderator.tag})`);

		// Success response
		const successContainer = new ContainerBuilder()
			.setAccentColor(0x00ff00) // Green for success
			.addTextDisplayComponents((display) =>
				display.setContent(
					`# ✅ Uživatel úspěšně vyhozen\n\n` +
						`**Uživatel:** ${targetUser.tag} (${targetUser.id})\n` +
						`**Porušené pravidlo:** ${ruleText}\n` +
						`**Důvod:** ${reason}\n` +
						(additionalNotes ? `**Poznámky:** ${additionalNotes}\n` : "") +
						`**DM oznámení:** ${dmSent ? "✅ Odesláno" : "❌ Nepodařilo se odeslat (DM zakázány)"}`,
				),
			);

		await interaction.editReply({
			components: [successContainer],
			flags: MessageFlags.IsComponentsV2,
		});
	} catch (error) {
		log("error", "Failed to kick user:", error);
		const embed = createErrorEmbed("Chyba při vyhazování", "Nepodařilo se vyhodit uživatele. Zkuste to prosím znovu.");
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
