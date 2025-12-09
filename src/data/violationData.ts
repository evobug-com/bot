import { ContainerBuilder, type MessageCreateOptions, MessageFlags, SeparatorSpacingSize } from "discord.js";

/**
 * Violation System Data and Types
 * This module contains all the data structures and configurations for the Allcom Warning System
 */

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export enum ViolationType {
	SPAM = "SPAM",
	TOXICITY = "TOXICITY",
	NSFW = "NSFW",
	PRIVACY = "PRIVACY",
	IMPERSONATION = "IMPERSONATION",
	ILLEGAL = "ILLEGAL",
	ADVERTISING = "ADVERTISING",
	SELF_HARM = "SELF_HARM",
	EVASION = "EVASION",
	OTHER = "OTHER",
}

export enum ViolationSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
	CRITICAL = "CRITICAL",
}

export enum PolicyType {
	BASIC_BEHAVIOR = "BASIC_BEHAVIOR",
	TEXT_VOICE = "TEXT_VOICE",
	SPAM_MENTIONS = "SPAM_MENTIONS",
	CONTENT_CHANNELS = "CONTENT_CHANNELS",
	ADVERTISING = "ADVERTISING",
	IDENTITY_PRIVACY = "IDENTITY_PRIVACY",
	LANGUAGE = "LANGUAGE",
	TECHNICAL = "TECHNICAL",
	AGE_LAW = "AGE_LAW",
	MODERATION = "MODERATION",
}

// Define FeatureRestriction enum to match API's violation-utils
// This must stay in sync with D:\projects\evobug.com\api\src\utils\violation-utils.ts
export enum FeatureRestriction {
	MESSAGE_EMBED = "MESSAGE_EMBED",
	MESSAGE_ATTACH = "MESSAGE_ATTACH",
	MESSAGE_LINK = "MESSAGE_LINK",
	VOICE_SPEAK = "VOICE_SPEAK",
	VOICE_VIDEO = "VOICE_VIDEO",
	VOICE_STREAM = "VOICE_STREAM",
	REACTION_ADD = "REACTION_ADD",
	THREAD_CREATE = "THREAD_CREATE",
	NICKNAME_CHANGE = "NICKNAME_CHANGE",
	RATE_LIMIT = "RATE_LIMIT", // Rate limiting (3 messages per minute)
	TIMEOUT = "TIMEOUT", // Legacy, kept for backwards compatibility
}

export enum AccountStanding {
	ALL_GOOD = "ALL_GOOD",
	LIMITED = "LIMITED",
	VERY_LIMITED = "VERY_LIMITED",
	AT_RISK = "AT_RISK",
	SUSPENDED = "SUSPENDED",
}

export enum ReviewStatus {
	PENDING = "PENDING",
	IN_REVIEW = "IN_REVIEW",
	APPROVED = "APPROVED",
	DENIED = "DENIED",
	CANCELLED = "CANCELLED",
}

export enum ReviewOutcome {
	VIOLATION_REMOVED = "VIOLATION_REMOVED",
	VIOLATION_REDUCED = "VIOLATION_REDUCED",
	VIOLATION_UPHELD = "VIOLATION_UPHELD",
	PARTIAL_ADJUSTMENT = "PARTIAL_ADJUSTMENT",
}

export interface ViolationAction {
	type: "ROLE_ADD" | "ROLE_REMOVE" | "TIMEOUT" | "KICK" | "BAN";
	target?: string; // Role ID or duration
	applied: boolean;
	appliedAt?: Date;
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

export interface Violation {
	id: number;
	userId: number;
	guildId: string;

	// Violation Details
	type: ViolationType;
	severity: ViolationSeverity;
	policyViolated: PolicyType | string | null;
	reason: string;
	contentSnapshot?: string | null;
	context?: string | null;
	evidence?: string;

	// Enforcement
	actionsApplied: ViolationAction[] | string | null;
	restrictions: FeatureRestriction[] | string;

	// Metadata
	issuedBy: number | null;
	issuedAt: Date;
	expiresAt?: Date | null;
	expiredAt?: Date | null;

	// Review
	reviewRequested?: boolean;
	reviewedBy?: number | null;
	reviewedAt?: Date | null;
	reviewOutcome?: ReviewOutcome | string | null;
	reviewNotes?: string | null;
}

export interface AccountStandingData {
	standing: AccountStanding;
	activeViolations: number;
	totalViolations: number;
	restrictions: FeatureRestriction[];
	severityScore: number;
	lastViolation?: Date;
	nextExpiration?: Date;
}

export interface Review {
	id: number;
	violationId: number;
	userId: number;
	guildId: string;
	reason: string;
	status: ReviewStatus | string;
	reviewedBy?: number | null;
	outcome?: ReviewOutcome | string | null;
	notes?: string | null;
	createdAt: Date;
	updatedAt: Date;
}

// ============================================================================
// LABELS AND DESCRIPTIONS
// ============================================================================

export const ViolationTypeLabels: Record<ViolationType, string> = {
	[ViolationType.SPAM]: "Spam / Flooding",
	[ViolationType.TOXICITY]: "Toxické chování",
	[ViolationType.NSFW]: "Nevhodný obsah (NSFW)",
	[ViolationType.PRIVACY]: "Porušení soukromí",
	[ViolationType.IMPERSONATION]: "Vydávání se za jiného",
	[ViolationType.ILLEGAL]: "Nelegální obsah",
	[ViolationType.ADVERTISING]: "Nevyžádaná reklama",
	[ViolationType.SELF_HARM]: "Sebepoškozování",
	[ViolationType.EVASION]: "Obcházení trestu",
	[ViolationType.OTHER]: "Jiné porušení",
};

export const ViolationSeverityLabels: Record<ViolationSeverity, string> = {
	[ViolationSeverity.LOW]: "Nízká",
	[ViolationSeverity.MEDIUM]: "Střední",
	[ViolationSeverity.HIGH]: "Vysoká",
	[ViolationSeverity.CRITICAL]: "Kritická",
};

export const PolicyTypeLabels: Record<PolicyType, string> = {
	[PolicyType.BASIC_BEHAVIOR]: "Základní chování (100)",
	[PolicyType.TEXT_VOICE]: "Text & Voice (200)",
	[PolicyType.SPAM_MENTIONS]: "Spam, mentions a formátování (300)",
	[PolicyType.CONTENT_CHANNELS]: "Obsah & kanály (400)",
	[PolicyType.ADVERTISING]: "Reklama (500)",
	[PolicyType.IDENTITY_PRIVACY]: "Identita & soukromí (600)",
	[PolicyType.LANGUAGE]: "Jazyk (700)",
	[PolicyType.TECHNICAL]: "Technické & účty (800)",
	[PolicyType.AGE_LAW]: "Věk & zákony (900)",
	[PolicyType.MODERATION]: "Moderace (1000)",
};

export const FeatureRestrictionLabels: Record<FeatureRestriction, string> = {
	[FeatureRestriction.MESSAGE_EMBED]: "Posílání embedů",
	[FeatureRestriction.MESSAGE_ATTACH]: "Posílání příloh",
	[FeatureRestriction.MESSAGE_LINK]: "Posílání odkazů",
	[FeatureRestriction.VOICE_SPEAK]: "Mluvení ve voice",
	[FeatureRestriction.VOICE_VIDEO]: "Video ve voice",
	[FeatureRestriction.VOICE_STREAM]: "Streamování",
	[FeatureRestriction.REACTION_ADD]: "Přidávání reakcí",
	[FeatureRestriction.THREAD_CREATE]: "Vytváření vláken",
	[FeatureRestriction.NICKNAME_CHANGE]: "Změna přezdívky",
	[FeatureRestriction.RATE_LIMIT]: "Omezení rychlosti zpráv",
	[FeatureRestriction.TIMEOUT]: "Timeout", // Legacy, kept for compatibility
};

export const AccountStandingLabels: Record<AccountStanding, string> = {
	[AccountStanding.ALL_GOOD]: "✅ Vše v pořádku",
	[AccountStanding.LIMITED]: "⚠️ Omezený",
	[AccountStanding.VERY_LIMITED]: "⚠️⚠️ Velmi omezený",
	[AccountStanding.AT_RISK]: "🚨 V ohrožení",
	[AccountStanding.SUSPENDED]: "🔒 Pozastaven",
};

export const AccountStandingDescriptions: Record<AccountStanding, string> = {
	[AccountStanding.ALL_GOOD]: "Nemáte žádná aktivní porušení a máte přístup ke všem funkcím.",
	[AccountStanding.LIMITED]:
		"Máte aktivní porušení, které dočasně omezilo přístup k některým funkcím. Další porušení povede k přísnějším omezením.",
	[AccountStanding.VERY_LIMITED]:
		"Máte jedno nebo více aktivních porušení, které dočasně omezilo přístup k více funkcím na delší dobu. Další porušení může ohrozit váš účet.",
	[AccountStanding.AT_RISK]:
		"Máte jedno nebo více aktivních porušení. Jakékoli další porušení může vést k trvalému pozastavení.",
	[AccountStanding.SUSPENDED]: "Váš přístup k serveru byl pozastaven kvůli závažným nebo opakovaným porušením.",
};

// ============================================================================
// SEVERITY CONFIGURATIONS
// ============================================================================

export const SeverityScores: Record<ViolationSeverity, number> = {
	[ViolationSeverity.LOW]: 10,
	[ViolationSeverity.MEDIUM]: 25,
	[ViolationSeverity.HIGH]: 50,
	[ViolationSeverity.CRITICAL]: 100,
};

export const DefaultExpirationDays: Record<ViolationSeverity, number> = {
	[ViolationSeverity.LOW]: 30,
	[ViolationSeverity.MEDIUM]: 60,
	[ViolationSeverity.HIGH]: 90,
	[ViolationSeverity.CRITICAL]: 180,
};

// Type-specific durations for more nuanced punishments
export interface TypeSpecificDuration {
	firstOffense: number; // Days
	repeatOffense: number; // Days
	useDiscordTimeout?: boolean; // Use Discord's built-in timeout instead of rate limit
}

export const ViolationTypeDurations: Record<ViolationType, Record<ViolationSeverity, TypeSpecificDuration>> = {
	[ViolationType.TOXICITY]: {
		[ViolationSeverity.LOW]: { firstOffense: 3, repeatOffense: 7, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 7, repeatOffense: 30, useDiscordTimeout: false },
		[ViolationSeverity.HIGH]: { firstOffense: 7, repeatOffense: 14, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 28, repeatOffense: 0, useDiscordTimeout: true }, // 0 = ban
	},
	[ViolationType.SPAM]: {
		[ViolationSeverity.LOW]: { firstOffense: 1, repeatOffense: 3, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 3, repeatOffense: 14, useDiscordTimeout: false },
		[ViolationSeverity.HIGH]: { firstOffense: 7, repeatOffense: 30, useDiscordTimeout: false },
		[ViolationSeverity.CRITICAL]: { firstOffense: 30, repeatOffense: 90, useDiscordTimeout: false },
	},
	[ViolationType.NSFW]: {
		[ViolationSeverity.LOW]: { firstOffense: 7, repeatOffense: 14, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 14, repeatOffense: 30, useDiscordTimeout: false },
		[ViolationSeverity.HIGH]: { firstOffense: 30, repeatOffense: 60, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 90, repeatOffense: 0, useDiscordTimeout: true }, // 0 = ban
	},
	// Default fallback for other violation types
	[ViolationType.PRIVACY]: {
		[ViolationSeverity.LOW]: { firstOffense: 7, repeatOffense: 14, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 30, repeatOffense: 60, useDiscordTimeout: false },
		[ViolationSeverity.HIGH]: { firstOffense: 60, repeatOffense: 90, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 180, repeatOffense: 0, useDiscordTimeout: true },
	},
	[ViolationType.IMPERSONATION]: {
		[ViolationSeverity.LOW]: { firstOffense: 14, repeatOffense: 30, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 30, repeatOffense: 60, useDiscordTimeout: false },
		[ViolationSeverity.HIGH]: { firstOffense: 60, repeatOffense: 90, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 0, repeatOffense: 0, useDiscordTimeout: true }, // Immediate ban
	},
	[ViolationType.ILLEGAL]: {
		[ViolationSeverity.LOW]: { firstOffense: 30, repeatOffense: 60, useDiscordTimeout: true },
		[ViolationSeverity.MEDIUM]: { firstOffense: 60, repeatOffense: 90, useDiscordTimeout: true },
		[ViolationSeverity.HIGH]: { firstOffense: 90, repeatOffense: 180, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 0, repeatOffense: 0, useDiscordTimeout: true }, // Immediate ban
	},
	[ViolationType.ADVERTISING]: {
		[ViolationSeverity.LOW]: { firstOffense: 3, repeatOffense: 7, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 7, repeatOffense: 30, useDiscordTimeout: false },
		[ViolationSeverity.HIGH]: { firstOffense: 30, repeatOffense: 60, useDiscordTimeout: false },
		[ViolationSeverity.CRITICAL]: { firstOffense: 60, repeatOffense: 180, useDiscordTimeout: false },
	},
	[ViolationType.SELF_HARM]: {
		[ViolationSeverity.LOW]: { firstOffense: 1, repeatOffense: 7, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 7, repeatOffense: 14, useDiscordTimeout: true },
		[ViolationSeverity.HIGH]: { firstOffense: 14, repeatOffense: 28, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 28, repeatOffense: 0, useDiscordTimeout: true },
	},
	[ViolationType.EVASION]: {
		[ViolationSeverity.LOW]: { firstOffense: 30, repeatOffense: 60, useDiscordTimeout: true },
		[ViolationSeverity.MEDIUM]: { firstOffense: 60, repeatOffense: 90, useDiscordTimeout: true },
		[ViolationSeverity.HIGH]: { firstOffense: 90, repeatOffense: 180, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 0, repeatOffense: 0, useDiscordTimeout: true }, // Immediate ban
	},
	[ViolationType.OTHER]: {
		[ViolationSeverity.LOW]: { firstOffense: 7, repeatOffense: 14, useDiscordTimeout: false },
		[ViolationSeverity.MEDIUM]: { firstOffense: 14, repeatOffense: 30, useDiscordTimeout: false },
		[ViolationSeverity.HIGH]: { firstOffense: 30, repeatOffense: 60, useDiscordTimeout: true },
		[ViolationSeverity.CRITICAL]: { firstOffense: 90, repeatOffense: 180, useDiscordTimeout: true },
	},
};

// ============================================================================
// VIOLATION MAPPINGS
// ============================================================================

export const ViolationTypeToPolicies: Record<ViolationType, PolicyType[]> = {
	[ViolationType.SPAM]: [PolicyType.SPAM_MENTIONS],
	[ViolationType.TOXICITY]: [PolicyType.BASIC_BEHAVIOR],
	[ViolationType.NSFW]: [PolicyType.TEXT_VOICE],
	[ViolationType.PRIVACY]: [PolicyType.IDENTITY_PRIVACY, PolicyType.BASIC_BEHAVIOR],
	[ViolationType.IMPERSONATION]: [PolicyType.IDENTITY_PRIVACY],
	[ViolationType.ILLEGAL]: [PolicyType.BASIC_BEHAVIOR],
	[ViolationType.ADVERTISING]: [PolicyType.ADVERTISING],
	[ViolationType.SELF_HARM]: [PolicyType.BASIC_BEHAVIOR],
	[ViolationType.EVASION]: [PolicyType.TECHNICAL],
	[ViolationType.OTHER]: [PolicyType.MODERATION],
};

export const ViolationTypeToRestrictions: Record<ViolationType, FeatureRestriction[]> = {
	[ViolationType.SPAM]: [FeatureRestriction.MESSAGE_EMBED],
	[ViolationType.TOXICITY]: [FeatureRestriction.RATE_LIMIT], // Changed from TIMEOUT to RATE_LIMIT
	[ViolationType.NSFW]: [FeatureRestriction.MESSAGE_ATTACH, FeatureRestriction.MESSAGE_LINK],
	[ViolationType.PRIVACY]: [FeatureRestriction.MESSAGE_LINK],
	[ViolationType.IMPERSONATION]: [FeatureRestriction.NICKNAME_CHANGE],
	[ViolationType.ILLEGAL]: [FeatureRestriction.MESSAGE_LINK, FeatureRestriction.MESSAGE_ATTACH],
	[ViolationType.ADVERTISING]: [FeatureRestriction.MESSAGE_LINK, FeatureRestriction.MESSAGE_EMBED],
	[ViolationType.SELF_HARM]: [FeatureRestriction.MESSAGE_ATTACH],
	[ViolationType.EVASION]: [FeatureRestriction.RATE_LIMIT], // Changed from TIMEOUT to RATE_LIMIT
	[ViolationType.OTHER]: [],
};

// ============================================================================
// POLICY LINKS
// ============================================================================

export const PolicyLinks: Record<PolicyType, string> = {
	[PolicyType.BASIC_BEHAVIOR]: "https://allcom.zone/rules#basic-behavior",
	[PolicyType.TEXT_VOICE]: "https://allcom.zone/rules#text-voice",
	[PolicyType.SPAM_MENTIONS]: "https://allcom.zone/rules#spam-mentions",
	[PolicyType.CONTENT_CHANNELS]: "https://allcom.zone/rules#content-channels",
	[PolicyType.ADVERTISING]: "https://allcom.zone/rules#advertising",
	[PolicyType.IDENTITY_PRIVACY]: "https://allcom.zone/rules#identity-privacy",
	[PolicyType.LANGUAGE]: "https://allcom.zone/rules#language",
	[PolicyType.TECHNICAL]: "https://allcom.zone/rules#technical",
	[PolicyType.AGE_LAW]: "https://allcom.zone/rules#age-law",
	[PolicyType.MODERATION]: "https://allcom.zone/rules#moderation",
};

// ============================================================================
// ID CONVERSION HELPERS
// ============================================================================

/**
 * The userId field in violations is the database user ID, not Discord ID
 * The user object should have a discordId field for Discord operations
 */
export interface ViolationWithDiscordId extends Violation {
	userDiscordId?: string;
	issuerDiscordId?: string;
	reviewerDiscordId?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function calculateSeverityScore(violations: Violation[]): number {
	return violations.reduce((score, violation) => {
		const baseScore = SeverityScores[violation.severity];
		const ageMultiplier = isRecent(violation) ? 1.5 : 1;
		return score + baseScore * ageMultiplier;
	}, 0);
}

export function isRecent(violation: Violation): boolean {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	return violation.issuedAt > thirtyDaysAgo;
}

export function isExpired(violation: Violation): boolean {
	if (violation.expiredAt) return true;
	if (!violation.expiresAt) return false;
	return new Date() > violation.expiresAt;
}

export function calculateAccountStanding(violations: Violation[]): AccountStanding {
	const activeViolations = violations.filter((v) => !isExpired(v));
	const severityScore = calculateSeverityScore(activeViolations);
	const violationCount = activeViolations.length;

	if (violationCount === 0) return AccountStanding.ALL_GOOD;
	if (severityScore >= 100) return AccountStanding.SUSPENDED;
	if (severityScore >= 75) return AccountStanding.AT_RISK;
	if (severityScore >= 50) return AccountStanding.VERY_LIMITED;
	if (severityScore >= 25) return AccountStanding.LIMITED;
	return AccountStanding.ALL_GOOD;
}

export function getStandingColor(standing: AccountStanding): number {
	switch (standing) {
		case AccountStanding.ALL_GOOD:
			return 0x00ff00; // Green
		case AccountStanding.LIMITED:
			return 0xffff00; // Yellow
		case AccountStanding.VERY_LIMITED:
			return 0xffa500; // Orange
		case AccountStanding.AT_RISK:
			return 0xff4500; // Red-orange
		case AccountStanding.SUSPENDED:
			return 0xff0000; // Red
	}
}

export function getSeverityColor(severity: ViolationSeverity): number {
	switch (severity) {
		case ViolationSeverity.LOW:
			return 0xffff00; // Yellow
		case ViolationSeverity.MEDIUM:
			return 0xffa500; // Orange
		case ViolationSeverity.HIGH:
			return 0xff4500; // Red-orange
		case ViolationSeverity.CRITICAL:
			return 0xff0000; // Red
	}
}

// ============================================================================
// COMPONENTS V2 BUILDERS
// ============================================================================

/**
 * Check if a violation was issued by AI (system)
 * EXPORTED FOR TESTING
 */
export function isAiDetectedViolation(violation: Violation): boolean {
	// issuedBy = 0 or null means system/AI
	if (violation.issuedBy === 0 || violation.issuedBy === null) {
		return true;
	}
	// Also check context for AI-detected marker
	if (violation.context?.includes("AI-detected")) {
		return true;
	}
	return false;
}

/**
 * Create a violation notification card for DM
 */
export function createViolationDMCard(violation: Violation): ContainerBuilder {
	const policyLinks = ViolationTypeToPolicies[violation.type]
		.map((policy) => `[${PolicyTypeLabels[policy]}](${PolicyLinks[policy]})`)
		.join("\n");

	// Handle restrictions that might be JSON string from API
	let restrictionsList: FeatureRestriction[] = [];
	if (typeof violation.restrictions === "string") {
		try {
			restrictionsList = JSON.parse(violation.restrictions);
		} catch {
			restrictionsList = [];
		}
	} else if (Array.isArray(violation.restrictions)) {
		restrictionsList = violation.restrictions;
	}

	const restrictionText =
		restrictionsList.length > 0 ? restrictionsList.map((r) => `• ${FeatureRestrictionLabels[r]}`).join("\n") : "Žádná";

	const expirationText = violation.expiresAt ? `Vyprší: ${violation.expiresAt.toLocaleDateString("cs-CZ")}` : "Trvalé";

	// Check if this was AI-detected
	const isAiDetected = isAiDetectedViolation(violation);

	const container = new ContainerBuilder()
		.setAccentColor(getSeverityColor(violation.severity))
		.addTextDisplayComponents((display) =>
			display.setContent(
				`# ⚠️ Porušení pravidel serveru\n\n` + `Obdržel jsi varování za porušení pravidel serveru **Allcom**.`,
			),
		);

	// Add AI detection notice if applicable
	if (isAiDetected) {
		container
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents((display) =>
				display.setContent(
					`## 🤖 Automatická detekce\n\n` +
						`Toto porušení bylo detekováno **automaticky pomocí AI**.\n\n` +
						`Pokud si myslíš, že jde o chybu, můžeš požádat o přezkoumání.\n` +
						`Moderátoři tvou žádost prověří a v případě omylu porušení zruší.\n\n` +
						`**Pro odvolání použij příkaz:**\n\`/review violation_id:${violation.id} reason:Tvůj důvod\``,
				),
			);
	}

	container
		.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents((display) =>
			display.setContent(
				`## Podrobnosti porušení\n\n` +
					`**Typ:** ${ViolationTypeLabels[violation.type]}\n` +
					`**Závažnost:** ${ViolationSeverityLabels[violation.severity]}\n` +
					`**Důvod:** ${violation.reason}\n` +
					`**${expirationText}**`,
			),
		)
		.addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents((display) => display.setContent(`## Aplikovaná omezení\n\n${restrictionText}`))
		.addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents((display) =>
			display.setContent(
				`## Porušené pravidlo\n\n${policyLinks}\n\n` +
					`💡 **Tip:** Klikni na odkaz výše pro podrobné vysvětlení pravidla.`,
			),
		);

	return container;
}

/**
 * Create account standing display
 */
export function createStandingDisplay(
	standingData: AccountStandingData,
	violations: Violation[],
	targetUserTag?: string,
): ContainerBuilder {
	const activeViolations = violations.filter((v) => !isExpired(v));

	let violationsList = "Žádná aktivní porušení";
	if (activeViolations.length > 0) {
		violationsList = activeViolations
			.slice(0, 5)
			.map((v) => {
				const date = v.issuedAt instanceof Date ? v.issuedAt : new Date(v.issuedAt);
				return `• **${ViolationTypeLabels[v.type]}** (${ViolationSeverityLabels[v.severity]}) - ${date.toLocaleDateString("cs-CZ")}`;
			})
			.join("\n");

		if (activeViolations.length > 5) {
			violationsList += `\n• ...a ${activeViolations.length - 5} dalších`;
		}
	}

	const restrictionsList =
		standingData.restrictions.length > 0
			? standingData.restrictions.map((r) => `• ${FeatureRestrictionLabels[r]}`).join("\n")
			: "Žádná omezení";

	const title = targetUserTag ? `# 📊 Stav účtu uživatele ${targetUserTag}` : `# 📊 Stav vašeho účtu`;

	return new ContainerBuilder()
		.setAccentColor(getStandingColor(standingData.standing))
		.addTextDisplayComponents((display) =>
			display.setContent(
				`${title}\n\n` +
					`**Aktuální stav:** ${AccountStandingLabels[standingData.standing]}\n\n` +
					`${AccountStandingDescriptions[standingData.standing]}`,
			),
		)
		.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large))
		.addTextDisplayComponents((display) =>
			display.setContent(
				`## 📋 Aktivní porušení (${standingData.activeViolations}/${standingData.totalViolations} celkem)\n\n` +
					violationsList,
			),
		)
		.addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents((display) => display.setContent(`## 🔒 Aktuální omezení\n\n${restrictionsList}`))
		.addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents((display) =>
			display.setContent(
				`## 📈 Skóre závažnosti: ${standingData.severityScore}/100\n\n` +
					(standingData.nextExpiration
						? `⏱️ Další porušení vyprší: ${standingData.nextExpiration.toLocaleDateString("cs-CZ")}`
						: `💡 Porušení obvykle vyprší po 90 dnech.`),
			),
		);
}

/**
 * Create review request confirmation
 */
export function createReviewRequestConfirmation(violation: Violation, reason: string): MessageCreateOptions {
	const container = new ContainerBuilder()
		.setAccentColor(0x5865f2) // Discord blurple
		.addTextDisplayComponents((display) =>
			display.setContent(
				`# 📝 Žádost o přezkoumání\n\n` +
					`Požádal jsi o přezkoumání následujícího porušení:\n\n` +
					`**Typ:** ${ViolationTypeLabels[violation.type]}\n` +
					`**Datum:** ${violation.issuedAt.toLocaleDateString("cs-CZ")}\n` +
					`**Důvod porušení:** ${violation.reason}\n\n` +
					`**Tvůj důvod pro přezkoumání:**\n${reason}\n\n` +
					`⏱️ Moderátoři tvou žádost přezkoumají co nejdříve. Výsledek obdržíš v soukromé zprávě.`,
			),
		);

	return {
		components: [container],
		flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
	};
}

/**
 * Create violation list display
 */
export function createViolationListDisplay(
	violations: Violation[],
	showExpired: boolean,
	targetUserTag?: string,
): ContainerBuilder {
	const filteredViolations = showExpired ? violations : violations.filter((v) => !isExpired(v));

	const title = targetUserTag ? `# 📋 Porušení uživatele ${targetUserTag}` : `# 📋 Vaše porušení`;

	if (filteredViolations.length === 0) {
		return new ContainerBuilder()
			.setAccentColor(0x00ff00)
			.addTextDisplayComponents((display) =>
				display.setContent(
					`${title}\n\n` +
						`✅ ` +
						(showExpired
							? targetUserTag
								? `Uživatel nemá žádná porušení.`
								: `Nemáte žádná porušení.`
							: targetUserTag
								? `Uživatel nemá žádná aktivní porušení.`
								: `Nemáte žádná aktivní porušení.`),
				),
			);
	}

	const violationGroups = {
		active: filteredViolations.filter((v) => !isExpired(v)),
		expired: filteredViolations.filter((v) => isExpired(v)),
	};

	const container = new ContainerBuilder()
		.setAccentColor(violationGroups.active.length > 0 ? 0xffa500 : 0x808080)
		.addTextDisplayComponents((display) => display.setContent(title));

	// Active violations
	if (violationGroups.active.length > 0) {
		const activeList = violationGroups.active
			.slice(0, 10)
			.map(
				(v, i) =>
					`**${i + 1}.** ${ViolationTypeLabels[v.type]} (${ViolationSeverityLabels[v.severity]})\n` +
					`   📅 ${v.issuedAt.toLocaleDateString("cs-CZ")} | ⏱️ Vyprší: ${v.expiresAt ? v.expiresAt.toLocaleDateString("cs-CZ") : "Nikdy"}\n` +
					`   📝 ${v.reason.substring(0, 100)}${v.reason.length > 100 ? "..." : ""}`,
			)
			.join("\n\n");

		container.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small));

		container.addTextDisplayComponents((display) =>
			display.setContent(`## ⚠️ Aktivní porušení (${violationGroups.active.length})\n\n${activeList}`),
		);

		if (violationGroups.active.length > 10) {
			container.addTextDisplayComponents((display) =>
				display.setContent(`\n...a ${violationGroups.active.length - 10} dalších aktivních porušení`),
			);
		}
	}

	// Expired violations (if showing)
	if (showExpired && violationGroups.expired.length > 0) {
		if (violationGroups.active.length > 0) {
			container.addSeparatorComponents((separator) =>
				separator.setDivider(true).setSpacing(SeparatorSpacingSize.Large),
			);
		}

		const expiredList = violationGroups.expired
			.slice(0, 5)
			.map(
				(v, i) =>
					`**${i + 1}.** ${ViolationTypeLabels[v.type]} (${ViolationSeverityLabels[v.severity]})\n` +
					`   📅 ${v.issuedAt.toLocaleDateString("cs-CZ")} | ✅ Vypršelo: ${v.expiredAt ? v.expiredAt.toLocaleDateString("cs-CZ") : v.expiresAt?.toLocaleDateString("cs-CZ")}`,
			)
			.join("\n\n");

		container.addTextDisplayComponents((display) =>
			display.setContent(`## 📜 Vypršelá porušení (${violationGroups.expired.length})\n\n${expiredList}`),
		);

		if (violationGroups.expired.length > 5) {
			container.addTextDisplayComponents((display) =>
				display.setContent(`\n...a ${violationGroups.expired.length - 5} dalších vypršelých porušení`),
			);
		}
	}

	return container;
}
