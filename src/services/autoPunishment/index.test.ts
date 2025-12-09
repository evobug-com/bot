import { describe, expect, it } from "bun:test";
import {
	FeatureRestriction,
	ViolationSeverity,
	ViolationType,
} from "../../data/violationData.ts";
import { AUTO_PUNISHMENT_CONFIG } from "./config.ts";
import {
	applyFirstOffenseCap,
	buildViolationReason,
	calculateSeverity,
	formatPunishmentForAlert,
	getRestrictions,
	shouldFlagForManualReview,
	type AutoPunishmentResult,
} from "./index.ts";

describe("autoPunishment core functions", () => {
	describe("calculateSeverity", () => {
		describe("normal rules (not severe)", () => {
			it("returns LOW for first offense (0 previous)", () => {
				expect(calculateSeverity(0, false)).toBe(ViolationSeverity.LOW);
			});

			it("returns MEDIUM for second offense (1 previous)", () => {
				expect(calculateSeverity(1, false)).toBe(ViolationSeverity.MEDIUM);
			});

			it("returns HIGH for third offense (2 previous)", () => {
				expect(calculateSeverity(2, false)).toBe(ViolationSeverity.HIGH);
			});

			it("caps at HIGH for many offenses", () => {
				expect(calculateSeverity(3, false)).toBe(ViolationSeverity.HIGH);
				expect(calculateSeverity(5, false)).toBe(ViolationSeverity.HIGH);
				expect(calculateSeverity(10, false)).toBe(ViolationSeverity.HIGH);
				expect(calculateSeverity(100, false)).toBe(ViolationSeverity.HIGH);
			});
		});

		describe("severe rules", () => {
			it("always returns HIGH for severe rules regardless of offense count", () => {
				expect(calculateSeverity(0, true)).toBe(ViolationSeverity.HIGH);
				expect(calculateSeverity(1, true)).toBe(ViolationSeverity.HIGH);
				expect(calculateSeverity(2, true)).toBe(ViolationSeverity.HIGH);
				expect(calculateSeverity(10, true)).toBe(ViolationSeverity.HIGH);
			});
		});

		describe("edge cases", () => {
			it("handles negative offense count by treating as 0", () => {
				expect(calculateSeverity(-1, false)).toBe(ViolationSeverity.LOW);
				expect(calculateSeverity(-100, false)).toBe(ViolationSeverity.LOW);
			});

			it("handles decimal offense count by flooring", () => {
				expect(calculateSeverity(0.5, false)).toBe(ViolationSeverity.LOW);
				expect(calculateSeverity(1.9, false)).toBe(ViolationSeverity.MEDIUM);
				expect(calculateSeverity(2.1, false)).toBe(ViolationSeverity.HIGH);
			});
		});
	});

	describe("applyFirstOffenseCap", () => {
		const maxSeverity = AUTO_PUNISHMENT_CONFIG.aiFirstOffenseMaxSeverity;

		describe("first offense (offenseCount = 0)", () => {
			it("caps HIGH to configured maximum for normal rules", () => {
				expect(applyFirstOffenseCap(ViolationSeverity.HIGH, 0, false)).toBe(maxSeverity);
			});

			it("caps CRITICAL to configured maximum for normal rules", () => {
				expect(applyFirstOffenseCap(ViolationSeverity.CRITICAL, 0, false)).toBe(maxSeverity);
			});

			it("does not cap LOW severity", () => {
				expect(applyFirstOffenseCap(ViolationSeverity.LOW, 0, false)).toBe(ViolationSeverity.LOW);
			});

			it("does not cap MEDIUM severity", () => {
				expect(applyFirstOffenseCap(ViolationSeverity.MEDIUM, 0, false)).toBe(ViolationSeverity.MEDIUM);
			});
		});

		describe("severe rules (never capped)", () => {
			it("does not cap severe rules even on first offense", () => {
				expect(applyFirstOffenseCap(ViolationSeverity.HIGH, 0, true)).toBe(ViolationSeverity.HIGH);
				expect(applyFirstOffenseCap(ViolationSeverity.CRITICAL, 0, true)).toBe(ViolationSeverity.CRITICAL);
			});
		});

		describe("repeat offenses (offenseCount > 0)", () => {
			it("does not cap repeat offenses", () => {
				expect(applyFirstOffenseCap(ViolationSeverity.HIGH, 1, false)).toBe(ViolationSeverity.HIGH);
				expect(applyFirstOffenseCap(ViolationSeverity.CRITICAL, 2, false)).toBe(ViolationSeverity.CRITICAL);
			});
		});
	});

	describe("shouldFlagForManualReview", () => {
		const maxOffenses = AUTO_PUNISHMENT_CONFIG.maxAutoOffensesBeforeReview;

		describe("offense count threshold", () => {
			it("does not flag when below threshold", () => {
				expect(shouldFlagForManualReview(0, ViolationSeverity.LOW)).toBe(false);
				expect(shouldFlagForManualReview(1, ViolationSeverity.MEDIUM)).toBe(false);
				expect(shouldFlagForManualReview(maxOffenses - 1, ViolationSeverity.HIGH)).toBe(false);
			});

			it("flags when at or above threshold", () => {
				expect(shouldFlagForManualReview(maxOffenses, ViolationSeverity.LOW)).toBe(true);
				expect(shouldFlagForManualReview(maxOffenses + 1, ViolationSeverity.LOW)).toBe(true);
				expect(shouldFlagForManualReview(maxOffenses + 10, ViolationSeverity.LOW)).toBe(true);
			});
		});

		describe("CRITICAL severity", () => {
			it("always flags CRITICAL regardless of offense count", () => {
				expect(shouldFlagForManualReview(0, ViolationSeverity.CRITICAL)).toBe(true);
				expect(shouldFlagForManualReview(1, ViolationSeverity.CRITICAL)).toBe(true);
			});
		});

		describe("combined scenarios", () => {
			it("flags when either condition is met", () => {
				// CRITICAL with low offense count
				expect(shouldFlagForManualReview(0, ViolationSeverity.CRITICAL)).toBe(true);
				// High offense count with LOW severity
				expect(shouldFlagForManualReview(maxOffenses, ViolationSeverity.LOW)).toBe(true);
				// Both conditions met
				expect(shouldFlagForManualReview(maxOffenses, ViolationSeverity.CRITICAL)).toBe(true);
			});
		});
	});

	describe("getRestrictions", () => {
		describe("valid inputs", () => {
			it("returns RATE_LIMIT for LOW severity when type has restrictions", () => {
				const restrictions = getRestrictions(ViolationType.TOXICITY, ViolationSeverity.LOW);
				expect(restrictions).toEqual([FeatureRestriction.RATE_LIMIT]);
			});

			it("returns empty array for LOW severity when type has no restrictions", () => {
				const restrictions = getRestrictions(ViolationType.OTHER, ViolationSeverity.LOW);
				expect(restrictions).toEqual([]);
			});

			it("returns base restrictions for MEDIUM severity", () => {
				const restrictions = getRestrictions(ViolationType.SPAM, ViolationSeverity.MEDIUM);
				expect(restrictions).toContain(FeatureRestriction.MESSAGE_EMBED);
			});

			it("adds RATE_LIMIT for HIGH severity if not present", () => {
				const restrictions = getRestrictions(ViolationType.NSFW, ViolationSeverity.HIGH);
				expect(restrictions).toContain(FeatureRestriction.RATE_LIMIT);
				expect(restrictions).toContain(FeatureRestriction.MESSAGE_ATTACH);
				expect(restrictions).toContain(FeatureRestriction.MESSAGE_LINK);
			});

			it("does not duplicate RATE_LIMIT for TOXICITY HIGH", () => {
				const restrictions = getRestrictions(ViolationType.TOXICITY, ViolationSeverity.HIGH);
				const rateLimitCount = restrictions.filter((r) => r === FeatureRestriction.RATE_LIMIT).length;
				expect(rateLimitCount).toBe(1);
			});
		});

		describe("invalid inputs", () => {
			it("returns empty array for empty violation type", () => {
				expect(getRestrictions("", ViolationSeverity.LOW)).toEqual([]);
			});

			it("returns empty array for unknown violation type", () => {
				expect(getRestrictions("UNKNOWN_TYPE", ViolationSeverity.LOW)).toEqual([]);
			});

			it("returns empty array for invalid severity", () => {
				expect(getRestrictions(ViolationType.TOXICITY, "INVALID" as ViolationSeverity)).toEqual([]);
			});
		});

		describe("all violation types", () => {
			const allTypes = Object.values(ViolationType);
			const allSeverities = Object.values(ViolationSeverity);

			for (const type of allTypes) {
				for (const severity of allSeverities) {
					it(`handles ${type} with ${severity} severity`, () => {
						const restrictions = getRestrictions(type, severity);
						expect(Array.isArray(restrictions)).toBe(true);
						// All returned values should be valid FeatureRestrictions
						for (const r of restrictions) {
							expect(Object.values(FeatureRestriction)).toContain(r);
						}
					});
				}
			}
		});
	});

	describe("buildViolationReason", () => {
		it("uses AI reason when provided", () => {
			const reason = buildViolationReason("Toxic language detected", ["101"]);
			expect(reason).toBe("AI Detection: Toxic language detected");
		});

		it("falls back to rule numbers when no AI reason", () => {
			const reason = buildViolationReason(undefined, ["101", "201"]);
			expect(reason).toBe("AI Detection: Porušení pravidel 101, 201");
		});

		it("uses default when no AI reason and no rule numbers", () => {
			const reason = buildViolationReason(undefined, []);
			expect(reason).toBe("AI Detection: Porušení pravidel");
		});

		it("trims whitespace-only AI reason", () => {
			const reason = buildViolationReason("   ", ["101"]);
			expect(reason).toBe("AI Detection: Porušení pravidel 101");
		});

		it("handles empty string AI reason", () => {
			const reason = buildViolationReason("", ["301", "302"]);
			expect(reason).toBe("AI Detection: Porušení pravidel 301, 302");
		});
	});

	describe("formatPunishmentForAlert", () => {
		it("returns no punishment message when not punished and not flagged", () => {
			const result: AutoPunishmentResult = {
				punished: false,
				flaggedForReview: false,
				violation: null,
				offenseCount: 0,
				severity: null,
				messageDeleted: false,
				dryRun: false,
			};
			expect(formatPunishmentForAlert(result)).toBe("Žádný automatický trest nebyl aplikován.");
		});

		it("includes manual review notice when flagged", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: true,
				violation: null,
				offenseCount: 3,
				severity: ViolationSeverity.HIGH,
				messageDeleted: false,
				dryRun: false,
			};
			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Vyžaduje manuální přezkoumání");
		});

		it("includes severity when punished", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null,
				offenseCount: 0,
				severity: ViolationSeverity.LOW,
				messageDeleted: false,
				dryRun: false,
			};
			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Automatický trest:** LOW");
		});

		it("includes offense count", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null,
				offenseCount: 2,
				severity: ViolationSeverity.MEDIUM,
				messageDeleted: false,
				dryRun: false,
			};
			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Počet porušení v této sekci:** 3"); // offenseCount + 1
		});

		it("includes message deleted notice", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null,
				offenseCount: 2,
				severity: ViolationSeverity.HIGH,
				messageDeleted: true,
				dryRun: false,
			};
			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Zpráva byla smazána");
		});

		it("includes violation ID when violation exists", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: { id: 12345 } as AutoPunishmentResult["violation"],
				offenseCount: 0,
				severity: ViolationSeverity.LOW,
				messageDeleted: false,
				dryRun: false,
			};
			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("ID porušení:** 12345");
		});
	});
});

describe("autoPunishment escalation scenarios", () => {
	describe("full escalation path for normal rules", () => {
		it("escalates correctly: 1st -> 2nd -> 3rd offense", () => {
			// First offense
			const sev1 = calculateSeverity(0, false);
			expect(sev1).toBe(ViolationSeverity.LOW);

			// Second offense
			const sev2 = calculateSeverity(1, false);
			expect(sev2).toBe(ViolationSeverity.MEDIUM);

			// Third offense
			const sev3 = calculateSeverity(2, false);
			expect(sev3).toBe(ViolationSeverity.HIGH);
		});

		it("first offense is capped at LOW even if escalation says otherwise", () => {
			// This shouldn't happen with current config, but let's verify the cap works
			const severity = calculateSeverity(0, false);
			const capped = applyFirstOffenseCap(severity, 0, false);
			expect(capped).toBe(ViolationSeverity.LOW);
		});
	});

	describe("full escalation path for severe rules", () => {
		it("severe rules start at HIGH and stay there", () => {
			expect(calculateSeverity(0, true)).toBe(ViolationSeverity.HIGH);
			expect(calculateSeverity(1, true)).toBe(ViolationSeverity.HIGH);
			expect(calculateSeverity(2, true)).toBe(ViolationSeverity.HIGH);
		});

		it("severe rules are not capped even on first offense", () => {
			const severity = calculateSeverity(0, true);
			const afterCap = applyFirstOffenseCap(severity, 0, true);
			expect(afterCap).toBe(ViolationSeverity.HIGH);
		});
	});

	describe("manual review triggering", () => {
		it("does not trigger manual review for normal LOW severity first offense", () => {
			const severity = ViolationSeverity.LOW;
			const offenseCount = 0;
			expect(shouldFlagForManualReview(offenseCount, severity)).toBe(false);
		});

		it("triggers manual review at configured offense threshold", () => {
			const maxOffenses = AUTO_PUNISHMENT_CONFIG.maxAutoOffensesBeforeReview;
			expect(shouldFlagForManualReview(maxOffenses, ViolationSeverity.LOW)).toBe(true);
		});

		it("always triggers manual review for CRITICAL severity", () => {
			expect(shouldFlagForManualReview(0, ViolationSeverity.CRITICAL)).toBe(true);
		});
	});
});

describe("autoPunishment restriction combinations", () => {
	describe("SPAM violations", () => {
		it("LOW: rate limit only", () => {
			const r = getRestrictions(ViolationType.SPAM, ViolationSeverity.LOW);
			expect(r).toEqual([FeatureRestriction.RATE_LIMIT]);
		});

		it("MEDIUM: embed restriction", () => {
			const r = getRestrictions(ViolationType.SPAM, ViolationSeverity.MEDIUM);
			expect(r).toContain(FeatureRestriction.MESSAGE_EMBED);
		});

		it("HIGH: embed + rate limit", () => {
			const r = getRestrictions(ViolationType.SPAM, ViolationSeverity.HIGH);
			expect(r).toContain(FeatureRestriction.MESSAGE_EMBED);
			expect(r).toContain(FeatureRestriction.RATE_LIMIT);
		});
	});

	describe("NSFW violations", () => {
		it("LOW: rate limit only", () => {
			const r = getRestrictions(ViolationType.NSFW, ViolationSeverity.LOW);
			expect(r).toEqual([FeatureRestriction.RATE_LIMIT]);
		});

		it("HIGH: attach, link, rate limit", () => {
			const r = getRestrictions(ViolationType.NSFW, ViolationSeverity.HIGH);
			expect(r).toContain(FeatureRestriction.MESSAGE_ATTACH);
			expect(r).toContain(FeatureRestriction.MESSAGE_LINK);
			expect(r).toContain(FeatureRestriction.RATE_LIMIT);
		});
	});

	describe("ADVERTISING violations", () => {
		it("LOW: rate limit only", () => {
			const r = getRestrictions(ViolationType.ADVERTISING, ViolationSeverity.LOW);
			expect(r).toEqual([FeatureRestriction.RATE_LIMIT]);
		});

		it("MEDIUM: link + embed restrictions", () => {
			const r = getRestrictions(ViolationType.ADVERTISING, ViolationSeverity.MEDIUM);
			expect(r).toContain(FeatureRestriction.MESSAGE_LINK);
			expect(r).toContain(FeatureRestriction.MESSAGE_EMBED);
		});
	});
});
