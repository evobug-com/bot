import type { Client, Message } from "discord.js";
import { getDbUser, orpc } from "../../client/client.ts";
import {
	FeatureRestriction,
	type Violation,
	ViolationSeverity,
	ViolationTypeToRestrictions,
} from "../../data/violationData.ts";
import { issueViolation } from "../../handlers/handleWarningSystem.ts";
import { createLogger } from "../../util/logger.ts";
import type { ModerationResult } from "../../utils/openrouter.ts";
import { AUTO_PUNISHMENT_CONFIG, ESCALATION_MATRIX, RuleSection } from "./config.ts";
import { formatPolicyViolated, mapCategoriesToViolation } from "./sectionMapper.ts";

const log = createLogger("AutoPunishment");

/**
 * Result of processing auto-punishment
 */
export interface AutoPunishmentResult {
	/** Whether punishment was applied */
	punished: boolean;
	/** Whether flagged for manual review instead of auto-punishment */
	flaggedForReview: boolean;
	/** The violation that was created (if any) */
	violation: Violation | null;
	/** Number of offenses in this section */
	offenseCount: number;
	/** Calculated severity */
	severity: ViolationSeverity | null;
	/** Whether message was deleted */
	messageDeleted: boolean;
	/** Whether this was a dry-run (no actual punishment applied) */
	dryRun: boolean;
	/** Error message if something went wrong */
	error?: string;
}

/**
 * Detailed dry-run log entry for debugging and monitoring
 */
export interface DryRunLogEntry {
	timestamp: Date;
	userId: string;
	userTag: string;
	guildId: string;
	channelId: string;
	messageContent: string;
	aiCategories: string[];
	aiReason: string | undefined;
	mappedViolationType: string;
	mappedRuleNumbers: string[];
	isSevere: boolean;
	offenseCount: number;
	calculatedSeverity: ViolationSeverity;
	wouldFlagForReview: boolean;
	wouldDeleteMessage: boolean;
	restrictions: FeatureRestriction[];
	reason: string;
}

/**
 * Input for processing auto-punishment
 */
export interface AutoPunishmentInput {
	message: Message;
	moderationResult: ModerationResult;
	guildId: string;
}

/**
 * Get the rule section from a rule number string
 * @param ruleNumber - The rule number (e.g., "101", "1001")
 * @returns The section (100, 200, ... 1000) or null if invalid
 */
function getRuleSectionFromNumber(ruleNumber: string): RuleSection | null {
	const num = Number.parseInt(ruleNumber.trim(), 10);
	if (Number.isNaN(num) || num < 100) return null;

	// For 1000+ rules, return 1000
	if (num >= 1000) return RuleSection.MODERATION;

	// Round down to nearest hundred
	const section = Math.floor(num / 100) * 100;

	// Validate it's a known section
	if (Object.values(RuleSection).includes(section)) {
		return section as RuleSection;
	}

	return null;
}

/**
 * Count recent offenses in a specific rule section for a user
 */
async function countRecentOffensesInSection(
	userId: number,
	guildId: string,
	section: RuleSection,
): Promise<number> {
	const windowDays = AUTO_PUNISHMENT_CONFIG.repeatOffenseWindowDays;
	const windowStart = new Date();
	windowStart.setDate(windowStart.getDate() - windowDays);

	const [error, response] = await orpc.moderation.violations.list({
		userId,
		guildId,
		includeExpired: false,
	});

	if (error || !response.violations) {
		return 0;
	}

	// Filter violations that:
	// 1. Are within the time window
	// 2. Have a policyViolated rule in the same section
	const matchingViolations = response.violations.filter((v) => {
		const issuedAt = new Date(v.issuedAt);
		if (issuedAt < windowStart) return false;

		// Check if any violated rule is in the same section
		if (v.policyViolated) {
			// policyViolated can be "101" or "101,102" format
			const rules = v.policyViolated.split(",");
			return rules.some((rule) => getRuleSectionFromNumber(rule) === section);
		}
		return false;
	});

	return matchingViolations.length;
}

/**
 * Calculate severity based on offense count and rule severity
 * EXPORTED FOR TESTING - this is a critical function
 */
export function calculateSeverity(offenseCount: number, isSevereRule: boolean): ViolationSeverity {
	// Validate inputs
	if (typeof offenseCount !== "number" || Number.isNaN(offenseCount)) {
		log("warn", "Invalid offenseCount, defaulting to 0:", offenseCount);
		offenseCount = 0;
	}
	if (offenseCount < 0) {
		offenseCount = 0;
	}

	// Severe rules always get HIGH minimum
	if (isSevereRule) {
		return ViolationSeverity.HIGH;
	}

	// Use escalation matrix, cap at index 2
	const matrixIndex = Math.min(Math.floor(offenseCount), 2);
	const matrixSeverity = ESCALATION_MATRIX[matrixIndex];
	return matrixSeverity ?? ViolationSeverity.LOW;
}

/**
 * Get restrictions based on violation type and severity
 * EXPORTED FOR TESTING - this is a critical function
 */
export function getRestrictions(
	violationType: string,
	severity: ViolationSeverity,
): FeatureRestriction[] {
	// Validate inputs
	if (!violationType || typeof violationType !== "string") {
		log("warn", "Invalid violationType:", violationType);
		return [];
	}
	if (!severity || !Object.values(ViolationSeverity).includes(severity)) {
		log("warn", "Invalid severity:", severity);
		return [];
	}

	// Get base restrictions for this type
	const baseRestrictions =
		ViolationTypeToRestrictions[violationType as keyof typeof ViolationTypeToRestrictions] || [];

	// For LOW severity AI-detected, use minimal restrictions
	if (severity === ViolationSeverity.LOW) {
		// Just rate limit for first offense
		if (baseRestrictions.length > 0) {
			return [FeatureRestriction.RATE_LIMIT];
		}
		return [];
	}

	// For MEDIUM+, use full restrictions
	const restrictions = [...baseRestrictions];

	// Add rate limit for HIGH severity if not already present
	if (severity === ViolationSeverity.HIGH || severity === ViolationSeverity.CRITICAL) {
		if (!restrictions.includes(FeatureRestriction.RATE_LIMIT)) {
			restrictions.push(FeatureRestriction.RATE_LIMIT);
		}
	}

	return restrictions;

}

/**
 * Determine if a violation should be flagged for manual review
 * EXPORTED FOR TESTING - this is a critical function
 */
export function shouldFlagForManualReview(
	offenseCount: number,
	severity: ViolationSeverity,
): boolean {
	// Too many offenses
	if (offenseCount >= AUTO_PUNISHMENT_CONFIG.maxAutoOffensesBeforeReview) {
		return true;
	}
	// CRITICAL severity should never be auto-applied
	if (severity === ViolationSeverity.CRITICAL) {
		return true;
	}
	return false;
}

/**
 * Apply first-offense severity cap for AI-detected violations
 * EXPORTED FOR TESTING - this is a critical function
 */
export function applyFirstOffenseCap(
	severity: ViolationSeverity,
	offenseCount: number,
	isSevereRule: boolean,
): ViolationSeverity {
	// Don't cap severe rules
	if (isSevereRule) {
		return severity;
	}
	// Only cap first offense
	if (offenseCount !== 0) {
		return severity;
	}
	// Cap at configured maximum
	const maxSeverity = AUTO_PUNISHMENT_CONFIG.aiFirstOffenseMaxSeverity;
	if (severity === ViolationSeverity.HIGH || severity === ViolationSeverity.CRITICAL) {
		return maxSeverity;
	}
	return severity;
}

/**
 * Build reason string for violation
 * EXPORTED FOR TESTING
 */
export function buildViolationReason(
	aiReason: string | undefined,
	ruleNumbers: string[],
): string {
	if (aiReason && aiReason.trim().length > 0) {
		return `AI Detection: ${aiReason}`;
	}
	if (ruleNumbers.length > 0) {
		return `AI Detection: Porušení pravidel ${ruleNumbers.join(", ")}`;
	}
	return "AI Detection: Porušení pravidel";
}

/**
 * Process auto-punishment for an AI-flagged message
 */
export async function processAutoPunishment(
	client: Client<true>,
	input: AutoPunishmentInput,
): Promise<AutoPunishmentResult> {
	const { message, moderationResult, guildId } = input;

	const isDryRun = AUTO_PUNISHMENT_CONFIG.dryRun;

	// Default result
	const result: AutoPunishmentResult = {
		punished: false,
		flaggedForReview: false,
		violation: null,
		offenseCount: 0,
		severity: null,
		messageDeleted: false,
		dryRun: isDryRun,
	};

	// Check if auto-punishment is enabled
	if (!AUTO_PUNISHMENT_CONFIG.enabled) {
		return result;
	}

	// Check if channel is excluded
	if (AUTO_PUNISHMENT_CONFIG.excludedChannelIds.includes(message.channel.id)) {
		return result;
	}

	// Map AI categories to violation data
	const mappedViolation = mapCategoriesToViolation(moderationResult.categories);
	if (!mappedViolation) {
		log("warn", "Could not map AI categories to violation:", moderationResult.categories);
		return { ...result, error: "Could not map categories to violation" };
	}

	try {
		// Get database user
		if (!message.guild) {
			return { ...result, error: "Message not in guild" };
		}
		const dbUser = await getDbUser(message.guild, message.author.id);

		// Count recent offenses in this section
		const offenseCount = await countRecentOffensesInSection(
			dbUser.id,
			guildId,
			mappedViolation.primarySection,
		);
		result.offenseCount = offenseCount;

		// Calculate severity using extracted functions
		let severity = calculateSeverity(offenseCount, mappedViolation.isSevere);

		// Apply first offense cap using extracted function
		severity = applyFirstOffenseCap(severity, offenseCount, mappedViolation.isSevere);

		result.severity = severity;

		// Check if this should be flagged for manual review using extracted function
		if (shouldFlagForManualReview(offenseCount, severity)) {
			result.flaggedForReview = true;
			// For manual review cases, cap severity at HIGH (never auto-ban)
			if (severity === ViolationSeverity.CRITICAL) {
				severity = ViolationSeverity.HIGH;
				result.severity = severity;
			}
		}

		// Get restrictions using extracted function
		const restrictions = getRestrictions(mappedViolation.violationType, severity);

		// Build reason using extracted function
		const reason = buildViolationReason(moderationResult.reason, mappedViolation.ruleNumbers);

		// Check if we should delete message (calculated before dry-run check)
		const wouldDeleteMessage =
			AUTO_PUNISHMENT_CONFIG.deleteMessageForHighSeverity &&
			(severity === ViolationSeverity.HIGH || severity === ViolationSeverity.CRITICAL);

		// DRY-RUN MODE: Log what would happen but don't actually do it
		if (isDryRun) {
			const dryRunLog: DryRunLogEntry = {
				timestamp: new Date(),
				userId: message.author.id,
				userTag: message.author.tag,
				guildId,
				channelId: message.channel.id,
				messageContent: message.content.substring(0, 500),
				aiCategories: moderationResult.categories,
				aiReason: moderationResult.reason,
				mappedViolationType: mappedViolation.violationType,
				mappedRuleNumbers: mappedViolation.ruleNumbers,
				isSevere: mappedViolation.isSevere,
				offenseCount,
				calculatedSeverity: severity,
				wouldFlagForReview: result.flaggedForReview,
				wouldDeleteMessage,
				restrictions,
				reason,
			};

			log(
				"info",
				`[DRY-RUN] Would punish ${message.author.tag}: ${mappedViolation.violationType} (${severity}) - Offense #${offenseCount + 1}`,
			);
			log("info", "[DRY-RUN] Full details:", JSON.stringify(dryRunLog, null, 2));

			// Set result to show what WOULD happen
			result.punished = true; // Would be punished
			result.messageDeleted = wouldDeleteMessage; // Would be deleted
			// violation stays null since we didn't actually create one

			return result;
		}

		// LIVE MODE: Actually issue the violation
		const violation = await issueViolation(client, {
			userId: dbUser.id,
			guildId,
			type: mappedViolation.violationType,
			severity,
			policyViolated: formatPolicyViolated(mappedViolation.ruleNumbers),
			reason,
			contentSnapshot: message.content.substring(0, 1000),
			context: `AI-detected | Channel: ${message.channel.id} | Offense #${offenseCount + 1}`,
			restrictions,
			actionsApplied: null,
			issuedBy: 0, // 0 = system/AI
		});

		if (violation) {
			result.punished = true;
			result.violation = violation;

			log(
				"info",
				`Auto-punishment issued to ${message.author.tag}: ${mappedViolation.violationType} (${severity}) - Offense #${offenseCount + 1}`,
			);

			// Delete message for HIGH+ severity
			if (wouldDeleteMessage) {
				try {
					await message.delete();
					result.messageDeleted = true;
					log("info", `Deleted flagged message from ${message.author.tag}`);
				} catch (deleteError) {
					log("warn", "Could not delete flagged message:", deleteError);
				}
			}
		} else {
			result.error = "Failed to issue violation";
		}
	} catch (error) {
		log("error", "Error in auto-punishment:", error);
		result.error = String(error);
	}

	return result;
}

/**
 * Format punishment result for moderator alert
 */
export function formatPunishmentForAlert(result: AutoPunishmentResult): string {
	if (!result.punished && !result.flaggedForReview) {
		return "Žádný automatický trest nebyl aplikován.";
	}

	const parts: string[] = [];

	// Show dry-run notice prominently at the top
	if (result.dryRun) {
		parts.push("🧪 **[DRY-RUN MODE]** Žádný trest nebyl skutečně aplikován");
		parts.push("---");
	}

	if (result.flaggedForReview) {
		parts.push(result.dryRun ? "⚠️ Vyžadovalo by manuální přezkoumání" : "**Vyžaduje manuální přezkoumání**");
	}

	if (result.punished && result.severity) {
		const label = result.dryRun ? "Navrhovaný trest" : "Automatický trest";
		parts.push(`**${label}:** ${result.severity}`);
	}

	parts.push(`**Počet porušení v této sekci:** ${result.offenseCount + 1}`);

	if (result.messageDeleted) {
		parts.push(result.dryRun ? "📝 Zpráva by byla smazána" : "**Zpráva byla smazána**");
	}

	if (result.violation) {
		parts.push(`**ID porušení:** ${result.violation.id}`);
	} else if (result.dryRun && result.punished) {
		parts.push("📋 Porušení by bylo vytvořeno (dry-run)");
	}

	return parts.join("\n");
}
