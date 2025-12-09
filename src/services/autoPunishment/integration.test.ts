/* eslint-disable @typescript-eslint/no-non-null-assertion -- Test file uses assertions after null checks */
import { describe, expect, it } from "bun:test";
import {
	FeatureRestriction,
	ViolationSeverity,
	ViolationType,
} from "../../data/violationData.ts";
import { AUTO_PUNISHMENT_CONFIG, RuleSection } from "./config.ts";
import {
	applyFirstOffenseCap,
	buildViolationReason,
	calculateSeverity,
	formatPunishmentForAlert,
	getRestrictions,
	shouldFlagForManualReview,
	type AutoPunishmentResult,
} from "./index.ts";
import {
	extractSectionFromRule,
	formatPolicyViolated,
	getViolationTypeForRule,
	isSevereRule,
	mapCategoriesToViolation,
} from "./sectionMapper.ts";

/**
 * Integration tests that simulate the full flow from AI moderation to punishment
 * These tests verify that all components work together correctly
 */
describe("Auto-Punishment Integration Tests", () => {
	describe("Full flow: AI detection to punishment decision", () => {
		it("first-time toxicity offense (rule 101) gets LOW severity with rate limit", () => {
			// Simulate AI moderation result
			const aiCategories = ["101"];
			const offenseCount = 0;

			// Step 1: Map categories to violation
			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);
			expect(mapped?.ruleNumbers).toEqual(["101"]);
			expect(mapped?.primarySection).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(mapped?.violationType).toBe(ViolationType.TOXICITY);
			expect(mapped?.isSevere).toBe(false);

			// Step 2: Calculate severity
			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			expect(severity).toBe(ViolationSeverity.LOW);

			// Step 3: Apply first offense cap (should not change LOW)
			const cappedSeverity = applyFirstOffenseCap(severity, offenseCount, mapped!.isSevere);
			expect(cappedSeverity).toBe(ViolationSeverity.LOW);

			// Step 4: Check for manual review flag
			const needsReview = shouldFlagForManualReview(offenseCount, cappedSeverity);
			expect(needsReview).toBe(false);

			// Step 5: Get restrictions
			const restrictions = getRestrictions(mapped!.violationType, cappedSeverity);
			expect(restrictions).toContain(FeatureRestriction.RATE_LIMIT);
			expect(restrictions.length).toBe(1);

			// Step 6: Build reason
			const reason = buildViolationReason("User was toxic", mapped!.ruleNumbers);
			expect(reason).toBe("AI Detection: User was toxic");

			// Step 7: Format policy
			const policy = formatPolicyViolated(mapped!.ruleNumbers);
			expect(policy).toBe("101");
		});

		it("second toxicity offense escalates to MEDIUM with full restrictions", () => {
			const aiCategories = ["101"];
			const offenseCount = 1;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			expect(severity).toBe(ViolationSeverity.MEDIUM);

			const cappedSeverity = applyFirstOffenseCap(severity, offenseCount, mapped!.isSevere);
			expect(cappedSeverity).toBe(ViolationSeverity.MEDIUM);

			const restrictions = getRestrictions(mapped!.violationType, cappedSeverity);
			// MEDIUM gets full base restrictions for TOXICITY
			expect(restrictions.length).toBeGreaterThan(0);
		});

		it("third+ toxicity offense escalates to HIGH with rate limit added", () => {
			const aiCategories = ["101"];
			const offenseCount = 2;

			const mapped = mapCategoriesToViolation(aiCategories);
			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			expect(severity).toBe(ViolationSeverity.HIGH);

			const restrictions = getRestrictions(mapped!.violationType, severity);
			expect(restrictions).toContain(FeatureRestriction.RATE_LIMIT);
		});

		it("severe rule (103 self-harm) gets HIGH severity even on first offense", () => {
			const aiCategories = ["103"];
			const offenseCount = 0;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);
			expect(mapped?.violationType).toBe(ViolationType.SELF_HARM);
			expect(mapped?.isSevere).toBe(true);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			expect(severity).toBe(ViolationSeverity.HIGH);

			// First offense cap should NOT apply to severe rules
			const cappedSeverity = applyFirstOffenseCap(severity, offenseCount, mapped!.isSevere);
			expect(cappedSeverity).toBe(ViolationSeverity.HIGH);
		});

		it("severe rule (104 illegal) gets HIGH severity and is not capped", () => {
			const aiCategories = ["104"];
			const offenseCount = 0;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);
			expect(mapped?.violationType).toBe(ViolationType.ILLEGAL);
			expect(mapped?.isSevere).toBe(true);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			expect(severity).toBe(ViolationSeverity.HIGH);

			const cappedSeverity = applyFirstOffenseCap(severity, offenseCount, mapped!.isSevere);
			expect(cappedSeverity).toBe(ViolationSeverity.HIGH);
		});

		it("multiple rule violations use highest priority violation type", () => {
			// 101 = TOXICITY, 104 = ILLEGAL (higher priority)
			const aiCategories = ["101", "104"];

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);
			expect(mapped?.ruleNumbers).toEqual(["101", "104"]);
			expect(mapped?.violationType).toBe(ViolationType.ILLEGAL); // Higher priority
			expect(mapped?.isSevere).toBe(true); // 104 is severe
		});

		it("NSFW violation (rule 201) gets correct restrictions at HIGH severity", () => {
			const aiCategories = ["201"];
			const offenseCount = 2;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);
			expect(mapped?.violationType).toBe(ViolationType.NSFW);
			expect(mapped?.primarySection).toBe(RuleSection.TEXT_VOICE);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			expect(severity).toBe(ViolationSeverity.HIGH);

			const restrictions = getRestrictions(mapped!.violationType, severity);
			expect(restrictions).toContain(FeatureRestriction.MESSAGE_ATTACH);
			expect(restrictions).toContain(FeatureRestriction.MESSAGE_LINK);
			expect(restrictions).toContain(FeatureRestriction.RATE_LIMIT);
		});

		it("SPAM violation (rule 301) gets embed restriction at MEDIUM", () => {
			const aiCategories = ["301"];
			const offenseCount = 1;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);
			expect(mapped?.violationType).toBe(ViolationType.SPAM);
			expect(mapped?.primarySection).toBe(RuleSection.SPAM_MENTIONS);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			expect(severity).toBe(ViolationSeverity.MEDIUM);

			const restrictions = getRestrictions(mapped!.violationType, severity);
			expect(restrictions).toContain(FeatureRestriction.MESSAGE_EMBED);
		});
	});

	describe("Manual review triggering scenarios", () => {
		it("triggers review after configured max offenses", () => {
			const maxOffenses = AUTO_PUNISHMENT_CONFIG.maxAutoOffensesBeforeReview;

			// Just below threshold
			expect(shouldFlagForManualReview(maxOffenses - 1, ViolationSeverity.HIGH)).toBe(false);

			// At threshold
			expect(shouldFlagForManualReview(maxOffenses, ViolationSeverity.LOW)).toBe(true);

			// Above threshold
			expect(shouldFlagForManualReview(maxOffenses + 5, ViolationSeverity.LOW)).toBe(true);
		});

		it("CRITICAL severity always triggers review regardless of offense count", () => {
			expect(shouldFlagForManualReview(0, ViolationSeverity.CRITICAL)).toBe(true);
			expect(shouldFlagForManualReview(1, ViolationSeverity.CRITICAL)).toBe(true);
			expect(shouldFlagForManualReview(100, ViolationSeverity.CRITICAL)).toBe(true);
		});
	});

	describe("Punishment result formatting", () => {
		it("formats standard punishment result correctly", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: { id: 12345 } as AutoPunishmentResult["violation"],
				offenseCount: 1,
				severity: ViolationSeverity.MEDIUM,
				messageDeleted: false,
				dryRun: false,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("MEDIUM");
			expect(alert).toContain("2"); // offenseCount + 1
			expect(alert).toContain("12345");
			expect(alert).not.toContain("manuální");
			expect(alert).not.toContain("smazána");
		});

		it("formats flagged-for-review result correctly", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: true,
				violation: { id: 99999 } as AutoPunishmentResult["violation"],
				offenseCount: 3,
				severity: ViolationSeverity.HIGH,
				messageDeleted: true,
				dryRun: false,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("manuální přezkoumání");
			expect(alert).toContain("HIGH");
			expect(alert).toContain("4"); // offenseCount + 1
			expect(alert).toContain("smazána");
		});

		it("formats no-punishment result correctly", () => {
			const result: AutoPunishmentResult = {
				punished: false,
				flaggedForReview: false,
				violation: null,
				offenseCount: 0,
				severity: null,
				messageDeleted: false,
				dryRun: false,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toBe("Žádný automatický trest nebyl aplikován.");
		});
	});

	describe("Section-based offense tracking", () => {
		it("correctly identifies same-section offenses", () => {
			// All 100-199 rules are in BASIC_BEHAVIOR section
			expect(extractSectionFromRule("101")).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(extractSectionFromRule("102")).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(extractSectionFromRule("199")).toBe(RuleSection.BASIC_BEHAVIOR);

			// 200-299 is TEXT_VOICE section
			expect(extractSectionFromRule("200")).toBe(RuleSection.TEXT_VOICE);
			expect(extractSectionFromRule("201")).toBe(RuleSection.TEXT_VOICE);
		});

		it("correctly identifies different-section offenses", () => {
			const section101 = extractSectionFromRule("101");
			const section201 = extractSectionFromRule("201");
			const section301 = extractSectionFromRule("301");

			expect(section101).not.toBe(section201);
			expect(section201).not.toBe(section301);
			expect(section101).not.toBe(section301);
		});

		it("1000+ rules all map to MODERATION section", () => {
			expect(extractSectionFromRule("1001")).toBe(RuleSection.MODERATION);
			expect(extractSectionFromRule("1999")).toBe(RuleSection.MODERATION);
		});
	});

	describe("Escalation matrix verification", () => {
		it("escalation follows expected progression", () => {
			expect(calculateSeverity(0, false)).toBe(ViolationSeverity.LOW);
			expect(calculateSeverity(1, false)).toBe(ViolationSeverity.MEDIUM);
			expect(calculateSeverity(2, false)).toBe(ViolationSeverity.HIGH);
		});

		it("calculateSeverity caps at HIGH for high offense counts", () => {
			expect(calculateSeverity(3, false)).toBe(ViolationSeverity.HIGH);
			expect(calculateSeverity(5, false)).toBe(ViolationSeverity.HIGH);
			expect(calculateSeverity(100, false)).toBe(ViolationSeverity.HIGH);
		});
	});

	describe("False positive protection", () => {
		it("first offense is capped at LOW for AI-detected violations", () => {
			// Even if somehow severity calculated higher, first offense should be capped
			const cappedHigh = applyFirstOffenseCap(ViolationSeverity.HIGH, 0, false);
			expect(cappedHigh).toBe(AUTO_PUNISHMENT_CONFIG.aiFirstOffenseMaxSeverity);

			const cappedCritical = applyFirstOffenseCap(ViolationSeverity.CRITICAL, 0, false);
			expect(cappedCritical).toBe(AUTO_PUNISHMENT_CONFIG.aiFirstOffenseMaxSeverity);
		});

		it("first offense cap does NOT apply to severe rules", () => {
			const cappedSevere = applyFirstOffenseCap(ViolationSeverity.HIGH, 0, true);
			expect(cappedSevere).toBe(ViolationSeverity.HIGH);
		});

		it("first offense cap does NOT apply to repeat offenders", () => {
			const cappedRepeat = applyFirstOffenseCap(ViolationSeverity.HIGH, 1, false);
			expect(cappedRepeat).toBe(ViolationSeverity.HIGH);
		});
	});

	describe("Violation type priority", () => {
		it("ILLEGAL has highest priority", () => {
			const mapped = mapCategoriesToViolation(["101", "104", "201", "301"]);
			expect(mapped?.violationType).toBe(ViolationType.ILLEGAL);
		});

		it("SELF_HARM has second highest priority", () => {
			const mapped = mapCategoriesToViolation(["101", "103", "201", "301"]);
			expect(mapped?.violationType).toBe(ViolationType.SELF_HARM);
		});

		it("AGE_LAW section maps to ILLEGAL", () => {
			// 999 should map to AGE_LAW section, which maps to ILLEGAL
			const mapped = mapCategoriesToViolation(["999"]);
			expect(mapped?.violationType).toBe(ViolationType.ILLEGAL);
		});
	});

	describe("Rule-specific violation type overrides", () => {
		it("rule 103 overrides to SELF_HARM", () => {
			expect(getViolationTypeForRule("103")).toBe(ViolationType.SELF_HARM);
		});

		it("rule 104 overrides to ILLEGAL", () => {
			expect(getViolationTypeForRule("104")).toBe(ViolationType.ILLEGAL);
		});

		it("rule 601 overrides to IMPERSONATION", () => {
			expect(getViolationTypeForRule("601")).toBe(ViolationType.IMPERSONATION);
		});

		it("rule 602 overrides to PRIVACY", () => {
			expect(getViolationTypeForRule("602")).toBe(ViolationType.PRIVACY);
		});

		it("rule 802 overrides to EVASION", () => {
			expect(getViolationTypeForRule("802")).toBe(ViolationType.EVASION);
		});
	});

	describe("Severe rule detection", () => {
		it("identifies all severe rules", () => {
			expect(isSevereRule("103")).toBe(true);
			expect(isSevereRule("104")).toBe(true);
			expect(isSevereRule("801")).toBe(true);
			expect(isSevereRule("802")).toBe(true);
		});

		it("non-severe rules return false", () => {
			expect(isSevereRule("101")).toBe(false);
			expect(isSevereRule("102")).toBe(false);
			expect(isSevereRule("201")).toBe(false);
			expect(isSevereRule("301")).toBe(false);
		});
	});

	describe("End-to-end scenarios", () => {
		it("scenario: New user posts spam, gets minimal punishment", () => {
			const aiCategories = ["301"]; // SPAM
			const offenseCount = 0;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			const cappedSeverity = applyFirstOffenseCap(severity, offenseCount, mapped!.isSevere);
			const needsReview = shouldFlagForManualReview(offenseCount, cappedSeverity);
			const restrictions = getRestrictions(mapped!.violationType, cappedSeverity);

			expect(cappedSeverity).toBe(ViolationSeverity.LOW);
			expect(needsReview).toBe(false);
			expect(restrictions).toEqual([FeatureRestriction.RATE_LIMIT]);
		});

		it("scenario: Repeat spammer gets escalated punishment", () => {
			const aiCategories = ["301"]; // SPAM
			const offenseCount = 2; // Third offense

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			const needsReview = shouldFlagForManualReview(offenseCount, severity);
			const restrictions = getRestrictions(mapped!.violationType, severity);

			expect(severity).toBe(ViolationSeverity.HIGH);
			expect(needsReview).toBe(false); // Still below review threshold
			expect(restrictions).toContain(FeatureRestriction.MESSAGE_EMBED);
			expect(restrictions).toContain(FeatureRestriction.RATE_LIMIT);
		});

		it("scenario: User posts illegal content, gets immediate HIGH", () => {
			const aiCategories = ["104"]; // ILLEGAL
			const offenseCount = 0;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			const cappedSeverity = applyFirstOffenseCap(severity, offenseCount, mapped!.isSevere);
			const needsReview = shouldFlagForManualReview(offenseCount, cappedSeverity);

			expect(mapped!.isSevere).toBe(true);
			expect(severity).toBe(ViolationSeverity.HIGH);
			expect(cappedSeverity).toBe(ViolationSeverity.HIGH); // Not capped for severe
			expect(needsReview).toBe(false); // HIGH doesn't auto-trigger review
		});

		it("scenario: Serial offender triggers manual review", () => {
			const aiCategories = ["101"];
			const offenseCount = AUTO_PUNISHMENT_CONFIG.maxAutoOffensesBeforeReview;

			const mapped = mapCategoriesToViolation(aiCategories);
			expect(mapped).not.toBe(null);

			const severity = calculateSeverity(offenseCount, mapped!.isSevere);
			const needsReview = shouldFlagForManualReview(offenseCount, severity);

			expect(needsReview).toBe(true);
		});
	});
});
