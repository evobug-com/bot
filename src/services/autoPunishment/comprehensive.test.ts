import { describe, expect, it } from "bun:test";
import {
	FeatureRestriction,
	ViolationSeverity,
	ViolationType,
} from "../../data/violationData.ts";
import { AUTO_PUNISHMENT_CONFIG, RuleSection, SEVERE_RULES } from "./config.ts";
import {
	applyFirstOffenseCap,
	buildViolationReason,
	calculateSeverity,
	getRestrictions,
	shouldFlagForManualReview,
} from "./index.ts";
import {
	extractSectionFromRule,
	extractSectionsFromCategories,
	getViolationTypeForRule,
	isSevereRule,
	mapCategoriesToViolation,
} from "./sectionMapper.ts";

/**
 * Comprehensive tests covering edge cases, race conditions, and security concerns
 */
describe("Comprehensive Auto-Punishment Tests", () => {
	describe("Input validation and sanitization", () => {
		describe("calculateSeverity input handling", () => {
			it("handles NaN offense count", () => {
				expect(calculateSeverity(Number.NaN, false)).toBe(ViolationSeverity.LOW);
			});

			it("handles Infinity offense count", () => {
				// Infinity is capped at 2 by Math.min
				expect(calculateSeverity(Number.POSITIVE_INFINITY, false)).toBe(ViolationSeverity.HIGH);
			});

			it("handles negative Infinity offense count", () => {
				expect(calculateSeverity(Number.NEGATIVE_INFINITY, false)).toBe(ViolationSeverity.LOW);
			});

			it("handles very large numbers", () => {
				expect(calculateSeverity(Number.MAX_SAFE_INTEGER, false)).toBe(ViolationSeverity.HIGH);
				expect(calculateSeverity(1e308, false)).toBe(ViolationSeverity.HIGH);
			});

			it("handles floating point precision edge cases", () => {
				// JavaScript floating point: 0.1 + 0.2 !== 0.3
				expect(calculateSeverity(0.1 + 0.2, false)).toBe(ViolationSeverity.LOW);
				expect(calculateSeverity(0.999999999999999, false)).toBe(ViolationSeverity.LOW);
				expect(calculateSeverity(1.000000000000001, false)).toBe(ViolationSeverity.MEDIUM);
			});
		});

		describe("extractSectionFromRule edge cases", () => {
			it("handles rule numbers with leading/trailing whitespace", () => {
				expect(extractSectionFromRule("  101  ")).toBe(RuleSection.BASIC_BEHAVIOR);
				expect(extractSectionFromRule("\t201\n")).toBe(RuleSection.TEXT_VOICE);
			});

			it("handles unicode digits", () => {
				// Unicode full-width digits should not be parsed
				expect(extractSectionFromRule("１０１")).toBe(null); // Full-width 101
			});

			it("handles rule numbers at exact boundaries", () => {
				expect(extractSectionFromRule("99")).toBe(null); // Below 100
				expect(extractSectionFromRule("100")).toBe(RuleSection.BASIC_BEHAVIOR);
				expect(extractSectionFromRule("999")).toBe(RuleSection.AGE_LAW);
				expect(extractSectionFromRule("1000")).toBe(RuleSection.MODERATION);
			});

			it("handles exponential notation strings as invalid", () => {
				// parseInt("1e2", 10) returns 1, not 100, and regex doesn't match
				expect(extractSectionFromRule("1e2")).toBe(null);
				expect(extractSectionFromRule("2e2")).toBe(null);
			});

			it("handles hexadecimal strings", () => {
				// parseInt with radix 10 should not parse hex
				expect(extractSectionFromRule("0x65")).toBe(null); // Would be 101 in hex
			});

			it("handles octal strings", () => {
				// parseInt with radix 10 treats leading zeros as decimal
				expect(extractSectionFromRule("0101")).toBe(RuleSection.BASIC_BEHAVIOR);
			});
		});

		describe("buildViolationReason sanitization", () => {
			it("handles AI reason with special characters", () => {
				const reason = buildViolationReason("<script>alert('xss')</script>", ["101"]);
				expect(reason).toContain("<script>"); // Should preserve, sanitization is for display layer
			});

			it("handles AI reason with newlines", () => {
				const reason = buildViolationReason("Line1\nLine2\rLine3", ["101"]);
				expect(reason).toContain("\n");
			});

			it("handles AI reason with unicode", () => {
				const reason = buildViolationReason("User was 毒性 (toxic) 🔥", ["101"]);
				expect(reason).toContain("毒性");
				expect(reason).toContain("🔥");
			});

			it("handles empty AI reason with special chars in rules", () => {
				// Rule numbers should be sanitized before reaching this function
				const reason = buildViolationReason("", ["101", "102"]);
				expect(reason).toBe("AI Detection: Porušení pravidel 101, 102");
			});

			it("handles very long AI reason", () => {
				const longReason = "A".repeat(10000);
				const reason = buildViolationReason(longReason, []);
				expect(reason.length).toBe("AI Detection: ".length + 10000);
			});

			it("handles AI reason with null bytes", () => {
				const reason = buildViolationReason("Test\x00Null\x00Bytes", ["101"]);
				expect(reason).toContain("\x00");
			});
		});
	});

	describe("Security-related scenarios", () => {
		describe("Privilege escalation prevention", () => {
			it("CRITICAL severity is always capped for AI-detected first offense", () => {
				// Even if AI incorrectly assigns CRITICAL, first offense should be capped
				const capped = applyFirstOffenseCap(ViolationSeverity.CRITICAL, 0, false);
				expect(capped).toBe(AUTO_PUNISHMENT_CONFIG.aiFirstOffenseMaxSeverity);
			});

			it("severe rules bypass first offense cap", () => {
				// This is intentional for truly severe violations
				const capped = applyFirstOffenseCap(ViolationSeverity.HIGH, 0, true);
				expect(capped).toBe(ViolationSeverity.HIGH);
			});

			it("CRITICAL severity always triggers manual review", () => {
				expect(shouldFlagForManualReview(0, ViolationSeverity.CRITICAL)).toBe(true);
				expect(shouldFlagForManualReview(100, ViolationSeverity.CRITICAL)).toBe(true);
			});
		});

		describe("Denial of service prevention", () => {
			it("handles large number of categories efficiently", () => {
				const categories = Array.from({ length: 1000 }, (_, i) => String(100 + (i % 900)));
				const start = performance.now();
				const result = mapCategoriesToViolation(categories);
				const duration = performance.now() - start;

				expect(result).not.toBe(null);
				expect(duration).toBeLessThan(100); // Should complete in under 100ms
			});

			it("handles categories with many duplicates", () => {
				const categories = Array(1000).fill("101");
				const result = mapCategoriesToViolation(categories);

				expect(result).not.toBe(null);
				expect(result?.ruleNumbers.length).toBe(1000); // All are valid
			});
		});
	});

	describe("Consistency and determinism", () => {
		describe("Same input always produces same output", () => {
			it("calculateSeverity is deterministic", () => {
				const results = new Set<ViolationSeverity>();
				for (let i = 0; i < 100; i++) {
					results.add(calculateSeverity(1, false));
				}
				expect(results.size).toBe(1);
				expect(results.has(ViolationSeverity.MEDIUM)).toBe(true);
			});

			it("mapCategoriesToViolation is deterministic", () => {
				const categories = ["101", "201", "301"];
				const results = [];
				for (let i = 0; i < 10; i++) {
					results.push(mapCategoriesToViolation(categories));
				}

				// All results should be identical
				for (const result of results) {
					expect(result?.violationType).toBe(results[0]?.violationType);
					expect(result?.primarySection).toBe(results[0]?.primarySection);
				}
			});
		});

		describe("Order independence where expected", () => {
			it("violation type priority is order-independent", () => {
				// ILLEGAL should always win regardless of order
				const order1 = mapCategoriesToViolation(["101", "104"]);
				const order2 = mapCategoriesToViolation(["104", "101"]);

				expect(order1?.violationType).toBe(ViolationType.ILLEGAL);
				expect(order2?.violationType).toBe(ViolationType.ILLEGAL);
			});

			it("severe rule detection is order-independent", () => {
				const order1 = mapCategoriesToViolation(["101", "103"]);
				const order2 = mapCategoriesToViolation(["103", "101"]);

				expect(order1?.isSevere).toBe(true);
				expect(order2?.isSevere).toBe(true);
			});
		});
	});

	describe("Configuration boundary tests", () => {
		it("respects maxAutoOffensesBeforeReview boundary", () => {
			const max = AUTO_PUNISHMENT_CONFIG.maxAutoOffensesBeforeReview;

			expect(shouldFlagForManualReview(max - 1, ViolationSeverity.HIGH)).toBe(false);
			expect(shouldFlagForManualReview(max, ViolationSeverity.LOW)).toBe(true);
			expect(shouldFlagForManualReview(max + 1, ViolationSeverity.LOW)).toBe(true);
		});

		it("aiFirstOffenseMaxSeverity is correctly applied", () => {
			const maxSeverity = AUTO_PUNISHMENT_CONFIG.aiFirstOffenseMaxSeverity;

			// HIGH should be capped
			expect(applyFirstOffenseCap(ViolationSeverity.HIGH, 0, false)).toBe(maxSeverity);

			// CRITICAL should be capped
			expect(applyFirstOffenseCap(ViolationSeverity.CRITICAL, 0, false)).toBe(maxSeverity);

			// Below max should not be changed
			if (maxSeverity === ViolationSeverity.LOW) {
				expect(applyFirstOffenseCap(ViolationSeverity.LOW, 0, false)).toBe(ViolationSeverity.LOW);
			}
		});
	});

	describe("All severe rules are correctly identified", () => {
		for (const rule of SEVERE_RULES) {
			it(`rule ${rule} is identified as severe`, () => {
				expect(isSevereRule(rule)).toBe(true);
			});

			it(`rule ${rule} maps to correct violation type`, () => {
				const type = getViolationTypeForRule(rule);
				// Severe rules should have explicit mappings
				expect(type).not.toBe(ViolationType.OTHER);
			});
		}
	});

	describe("All sections have valid mappings", () => {
		const allSections = Object.values(RuleSection).filter((v) => typeof v === "number") as number[];

		for (const section of allSections) {
			it(`section ${section} extracts correctly from representative rule`, () => {
				const ruleNumber = String(section + 1); // e.g., 101 for section 100
				const extracted = extractSectionFromRule(ruleNumber);
				expect(extracted).toBe(section);
			});
		}
	});

	describe("Restriction consistency", () => {
		const allTypes = Object.values(ViolationType);
		const allSeverities = Object.values(ViolationSeverity);

		describe("restrictions are always arrays", () => {
			for (const type of allTypes) {
				for (const severity of allSeverities) {
					it(`${type} + ${severity} returns array`, () => {
						const restrictions = getRestrictions(type, severity);
						expect(Array.isArray(restrictions)).toBe(true);
					});
				}
			}
		});

		describe("HIGH severity always has RATE_LIMIT if type has any restrictions", () => {
			for (const type of allTypes) {
				it(`${type} at HIGH severity`, () => {
					const mediumRestrictions = getRestrictions(type, ViolationSeverity.MEDIUM);
					const highRestrictions = getRestrictions(type, ViolationSeverity.HIGH);

					if (mediumRestrictions.length > 0) {
						expect(highRestrictions).toContain(FeatureRestriction.RATE_LIMIT);
					}
				});
			}
		});
	});

	describe("Race condition scenarios (conceptual)", () => {
		it("multiple calls with same data produce consistent results", () => {
			const categories = ["101", "201"];
			const offenseCount = 1;

			// Simulate multiple concurrent calls
			const results = Array.from({ length: 10 }, () => {
				const mapped = mapCategoriesToViolation(categories);
				const severity = calculateSeverity(offenseCount, mapped?.isSevere ?? false);
				return { mapped, severity };
			});

			// All should produce identical results
			expect(results.length).toBe(10);
			const firstResult = results[0];
			expect(firstResult).toBeDefined();
			if (!firstResult) return; // Type guard for TypeScript

			for (const result of results) {
				expect(result.mapped?.violationType).toBe(firstResult.mapped?.violationType);
				expect(result.severity).toBe(firstResult.severity);
			}
		});
	});

	describe("Category extraction edge cases", () => {
		it("extracts sections from mixed valid/invalid categories", () => {
			const categories = ["101", "invalid", "201", "", "not-a-rule", "301"];
			const sections = extractSectionsFromCategories(categories);

			expect(sections).toContain(RuleSection.BASIC_BEHAVIOR);
			expect(sections).toContain(RuleSection.TEXT_VOICE);
			expect(sections).toContain(RuleSection.SPAM_MENTIONS);
			expect(sections.length).toBe(3);
		});

		it("handles categories that look like numbers but are not rules", () => {
			const categories = ["1", "10", "99", "100", "101"];
			const sections = extractSectionsFromCategories(categories);

			// Only 100 and 101 are valid (100+ range)
			expect(sections.length).toBe(1);
			expect(sections).toContain(RuleSection.BASIC_BEHAVIOR);
		});

		it("handles 4-digit rules correctly", () => {
			const categories = ["1001", "1050", "1999"];
			const sections = extractSectionsFromCategories(categories);

			expect(sections.length).toBe(1);
			expect(sections).toContain(RuleSection.MODERATION);
		});

		it("handles 5-digit numbers as invalid", () => {
			const categories = ["10001", "99999"];
			const sections = extractSectionsFromCategories(categories);

			expect(sections.length).toBe(0);
		});
	});

	describe("Violation type priority ordering", () => {
		it("ILLEGAL beats all other types", () => {
			const allOtherTypes = ["101", "201", "301", "401", "501", "601", "701", "801", "901"];
			for (const otherRule of allOtherTypes) {
				const result = mapCategoriesToViolation([otherRule, "104"]); // 104 is ILLEGAL
				expect(result?.violationType).toBe(ViolationType.ILLEGAL);
			}
		});

		it("SELF_HARM beats most types except ILLEGAL", () => {
			const lowerPriorityRules = ["101", "201", "301", "501"];
			for (const rule of lowerPriorityRules) {
				const result = mapCategoriesToViolation([rule, "103"]); // 103 is SELF_HARM
				expect(result?.violationType).toBe(ViolationType.SELF_HARM);
			}
		});
	});
});
