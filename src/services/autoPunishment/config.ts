import { ViolationSeverity, ViolationType } from "../../data/violationData.ts";

/**
 * Auto-punishment system configuration
 * All configurable values are centralized here for easy adjustment
 */
export const AUTO_PUNISHMENT_CONFIG = {
	/** Time window (in days) for counting repeat offenses in the same rule section */
	repeatOffenseWindowDays: 1,

	/** Maximum auto-offenses before flagging for manual review */
	maxAutoOffensesBeforeReview: 3,

	/** Maximum severity for first AI-detected offense (caps at LOW for safety) */
	aiFirstOffenseMaxSeverity: ViolationSeverity.LOW,

	/** Enable/disable auto-punishment system (kill switch) */
	enabled: true,

	/**
	 * Dry-run mode: calculates everything, logs what WOULD happen, but doesn't:
	 * - Issue violations
	 * - Delete messages
	 * - Apply restrictions
	 * Useful for testing in production before fully enabling.
	 */
	dryRun: true,

	/** Delete message for HIGH+ severity violations */
	deleteMessageForHighSeverity: true,

	/** Channel IDs excluded from auto-punishment (e.g., bot testing channels) */
	excludedChannelIds: [] as string[],
} as const;

/**
 * Rule sections map to these ranges:
 * - 100s: BASIC_BEHAVIOR
 * - 200s: TEXT_VOICE
 * - 300s: SPAM_MENTIONS
 * - 400s: CONTENT_CHANNELS
 * - 500s: ADVERTISING
 * - 600s: IDENTITY_PRIVACY
 * - 700s: LANGUAGE
 * - 800s: TECHNICAL
 * - 900s: AGE_LAW
 * - 1000s: MODERATION
 */
export enum RuleSection {
	BASIC_BEHAVIOR = 100,
	TEXT_VOICE = 200,
	SPAM_MENTIONS = 300,
	CONTENT_CHANNELS = 400,
	ADVERTISING = 500,
	IDENTITY_PRIVACY = 600,
	LANGUAGE = 700,
	TECHNICAL = 800,
	AGE_LAW = 900,
	MODERATION = 1000,
}

/**
 * Maps rule sections to violation types
 */
export const SECTION_TO_VIOLATION_TYPE: Record<RuleSection, ViolationType> = {
	[RuleSection.BASIC_BEHAVIOR]: ViolationType.TOXICITY,
	[RuleSection.TEXT_VOICE]: ViolationType.NSFW,
	[RuleSection.SPAM_MENTIONS]: ViolationType.SPAM,
	[RuleSection.CONTENT_CHANNELS]: ViolationType.OTHER,
	[RuleSection.ADVERTISING]: ViolationType.ADVERTISING,
	[RuleSection.IDENTITY_PRIVACY]: ViolationType.PRIVACY,
	[RuleSection.LANGUAGE]: ViolationType.OTHER,
	[RuleSection.TECHNICAL]: ViolationType.EVASION,
	[RuleSection.AGE_LAW]: ViolationType.ILLEGAL,
	[RuleSection.MODERATION]: ViolationType.EVASION,
};

/**
 * Specific rule number overrides for violation type mapping
 * These override the section default when a specific rule is detected
 */
export const RULE_TO_VIOLATION_TYPE: Record<string, ViolationType> = {
	"103": ViolationType.SELF_HARM,
	"104": ViolationType.ILLEGAL,
	"601": ViolationType.IMPERSONATION,
	"602": ViolationType.PRIVACY,
	"802": ViolationType.EVASION,
};

/**
 * Severe rules that should always escalate to HIGH severity minimum
 * (even on first offense)
 */
export const SEVERE_RULES: string[] = [
	"103", // Self-harm content
	"104", // Illegal/malware/phishing
	"801", // Self-bots/raidování
	"802", // Alt accounts for ban evasion
];

/**
 * Escalation matrix: offense count -> severity
 * 0 = first offense, 1 = second offense, etc.
 */
export const ESCALATION_MATRIX: Record<number, ViolationSeverity> = {
	0: ViolationSeverity.LOW,
	1: ViolationSeverity.MEDIUM,
	2: ViolationSeverity.HIGH,
};
