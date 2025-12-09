import { describe, expect, it } from "bun:test";
import { FeatureRestriction, ViolationSeverity, ViolationType } from "../../data/violationData.ts";
import { RuleSection } from "./config.ts";
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
	formatPolicyViolated,
	getViolationTypeForRule,
	isSevereRule,
	mapCategoriesToViolation,
} from "./sectionMapper.ts";

describe("edge cases - calculateSeverity", () => {
	describe("boundary values", () => {
		it("handles exactly 0", () => {
			expect(calculateSeverity(0, false)).toBe(ViolationSeverity.LOW);
		});

		it("handles exactly 1", () => {
			expect(calculateSeverity(1, false)).toBe(ViolationSeverity.MEDIUM);
		});

		it("handles exactly 2", () => {
			expect(calculateSeverity(2, false)).toBe(ViolationSeverity.HIGH);
		});

		it("handles very large numbers", () => {
			expect(calculateSeverity(1000000, false)).toBe(ViolationSeverity.HIGH);
			expect(calculateSeverity(Number.MAX_SAFE_INTEGER, false)).toBe(ViolationSeverity.HIGH);
		});
	});

	describe("floating point edge cases", () => {
		it("handles 0.0", () => {
			expect(calculateSeverity(0.0, false)).toBe(ViolationSeverity.LOW);
		});

		it("handles very small positive numbers", () => {
			expect(calculateSeverity(0.0001, false)).toBe(ViolationSeverity.LOW);
		});

		it("handles numbers just below boundaries", () => {
			expect(calculateSeverity(0.9999, false)).toBe(ViolationSeverity.LOW);
			expect(calculateSeverity(1.9999, false)).toBe(ViolationSeverity.MEDIUM);
		});
	});
});

describe("edge cases - sectionMapper", () => {
	describe("extractSectionFromRule edge cases", () => {
		it("handles empty string", () => {
			expect(extractSectionFromRule("")).toBe(null);
		});

		it("handles whitespace", () => {
			expect(extractSectionFromRule("   ")).toBe(null);
			expect(extractSectionFromRule("\t")).toBe(null);
		});

		it("handles special characters", () => {
			// Note: parseInt extracts leading numbers, so "101!" becomes 101
			// This is expected JavaScript behavior
			expect(extractSectionFromRule("@101")).toBe(null); // Leading non-digit
			expect(extractSectionFromRule("abc")).toBe(null);
		});

		it("handles negative numbers", () => {
			expect(extractSectionFromRule("-101")).toBe(null);
		});

		it("handles numbers with leading zeros", () => {
			// parseInt handles this
			expect(extractSectionFromRule("0101")).toBe(RuleSection.BASIC_BEHAVIOR);
		});

		it("handles boundary rule numbers", () => {
			expect(extractSectionFromRule("100")).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(extractSectionFromRule("199")).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(extractSectionFromRule("200")).toBe(RuleSection.TEXT_VOICE);
			expect(extractSectionFromRule("999")).toBe(RuleSection.AGE_LAW);
			expect(extractSectionFromRule("1000")).toBe(RuleSection.MODERATION);
			expect(extractSectionFromRule("1999")).toBe(RuleSection.MODERATION);
		});
	});

	describe("extractSectionsFromCategories edge cases", () => {
		it("handles empty array", () => {
			expect(extractSectionsFromCategories([])).toEqual([]);
		});

		it("handles array with only invalid values", () => {
			expect(extractSectionsFromCategories(["abc", "xyz", ""])).toEqual([]);
		});

		it("handles mixed valid and invalid", () => {
			const sections = extractSectionsFromCategories(["abc", "101", "xyz", "201"]);
			expect(sections.length).toBe(2);
			expect(sections).toContain(RuleSection.BASIC_BEHAVIOR);
			expect(sections).toContain(RuleSection.TEXT_VOICE);
		});

		it("handles duplicate rule numbers", () => {
			const sections = extractSectionsFromCategories(["101", "101", "101"]);
			expect(sections).toEqual([RuleSection.BASIC_BEHAVIOR]);
		});
	});

	describe("mapCategoriesToViolation edge cases", () => {
		it("returns null for empty array", () => {
			expect(mapCategoriesToViolation([])).toBe(null);
		});

		it("returns null for array with only invalid values", () => {
			expect(mapCategoriesToViolation(["abc", "", "xyz"])).toBe(null);
		});

		it("handles single valid category among invalid ones", () => {
			const result = mapCategoriesToViolation(["abc", "101", "xyz"]);
			expect(result).not.toBe(null);
			expect(result?.ruleNumbers).toEqual(["101"]);
		});

		it("prioritizes violation types correctly with multiple rules", () => {
			// ILLEGAL (104) should be prioritized over TOXICITY (101)
			const result = mapCategoriesToViolation(["101", "104"]);
			expect(result?.violationType).toBe(ViolationType.ILLEGAL);
		});

		it("correctly identifies severe rules in mixed set", () => {
			// 103 is severe (SELF_HARM), 101 is not
			const result = mapCategoriesToViolation(["101", "103"]);
			expect(result?.isSevere).toBe(true);
		});
	});

	describe("formatPolicyViolated edge cases", () => {
		it("handles empty array", () => {
			expect(formatPolicyViolated([])).toBe("");
		});

		it("handles array with empty strings", () => {
			expect(formatPolicyViolated(["", ""])).toBe(",");
		});

		it("handles large number of rules", () => {
			const rules = Array.from({ length: 100 }, (_, i) => String(100 + i));
			const result = formatPolicyViolated(rules);
			expect(result.split(",").length).toBe(100);
		});
	});

	describe("isSevereRule edge cases", () => {
		it("handles exact severe rule numbers", () => {
			expect(isSevereRule("103")).toBe(true);
			expect(isSevereRule("104")).toBe(true);
			expect(isSevereRule("801")).toBe(true);
			expect(isSevereRule("802")).toBe(true);
		});

		it("handles similar but non-severe rule numbers", () => {
			expect(isSevereRule("102")).toBe(false);
			expect(isSevereRule("105")).toBe(false);
			expect(isSevereRule("800")).toBe(false);
			expect(isSevereRule("803")).toBe(false);
		});

		it("handles empty and invalid inputs", () => {
			expect(isSevereRule("")).toBe(false);
			expect(isSevereRule("abc")).toBe(false);
		});
	});

	describe("getViolationTypeForRule edge cases", () => {
		it("handles all section boundaries", () => {
			// Test first and last rule of each section
			expect(getViolationTypeForRule("100")).toBe(ViolationType.TOXICITY);
			expect(getViolationTypeForRule("199")).toBe(ViolationType.TOXICITY);
			expect(getViolationTypeForRule("200")).toBe(ViolationType.NSFW);
			expect(getViolationTypeForRule("299")).toBe(ViolationType.NSFW);
			expect(getViolationTypeForRule("300")).toBe(ViolationType.SPAM);
			expect(getViolationTypeForRule("399")).toBe(ViolationType.SPAM);
		});

		it("handles override rules correctly", () => {
			expect(getViolationTypeForRule("103")).toBe(ViolationType.SELF_HARM);
			expect(getViolationTypeForRule("104")).toBe(ViolationType.ILLEGAL);
			expect(getViolationTypeForRule("601")).toBe(ViolationType.IMPERSONATION);
			expect(getViolationTypeForRule("602")).toBe(ViolationType.PRIVACY);
			expect(getViolationTypeForRule("802")).toBe(ViolationType.EVASION);
		});
	});
});

describe("edge cases - applyFirstOffenseCap", () => {
	it("handles all severity levels on first offense", () => {
		// LOW and MEDIUM should pass through unchanged
		expect(applyFirstOffenseCap(ViolationSeverity.LOW, 0, false)).toBe(ViolationSeverity.LOW);
		expect(applyFirstOffenseCap(ViolationSeverity.MEDIUM, 0, false)).toBe(ViolationSeverity.MEDIUM);
		// HIGH and CRITICAL should be capped to LOW (config default)
		expect(applyFirstOffenseCap(ViolationSeverity.HIGH, 0, false)).toBe(ViolationSeverity.LOW);
		expect(applyFirstOffenseCap(ViolationSeverity.CRITICAL, 0, false)).toBe(ViolationSeverity.LOW);
	});

	it("handles all severity levels on repeat offense", () => {
		// All should pass through unchanged
		expect(applyFirstOffenseCap(ViolationSeverity.LOW, 1, false)).toBe(ViolationSeverity.LOW);
		expect(applyFirstOffenseCap(ViolationSeverity.MEDIUM, 1, false)).toBe(ViolationSeverity.MEDIUM);
		expect(applyFirstOffenseCap(ViolationSeverity.HIGH, 1, false)).toBe(ViolationSeverity.HIGH);
		expect(applyFirstOffenseCap(ViolationSeverity.CRITICAL, 1, false)).toBe(ViolationSeverity.CRITICAL);
	});

	it("handles severe rules on first offense", () => {
		// All should pass through unchanged for severe rules
		expect(applyFirstOffenseCap(ViolationSeverity.LOW, 0, true)).toBe(ViolationSeverity.LOW);
		expect(applyFirstOffenseCap(ViolationSeverity.HIGH, 0, true)).toBe(ViolationSeverity.HIGH);
		expect(applyFirstOffenseCap(ViolationSeverity.CRITICAL, 0, true)).toBe(ViolationSeverity.CRITICAL);
	});
});

describe("edge cases - shouldFlagForManualReview", () => {
	it("handles boundary offense counts", () => {
		const maxOffenses = 3; // From config
		expect(shouldFlagForManualReview(maxOffenses - 1, ViolationSeverity.HIGH)).toBe(false);
		expect(shouldFlagForManualReview(maxOffenses, ViolationSeverity.HIGH)).toBe(true);
		expect(shouldFlagForManualReview(maxOffenses + 1, ViolationSeverity.HIGH)).toBe(true);
	});

	it("handles all severity levels below threshold", () => {
		expect(shouldFlagForManualReview(0, ViolationSeverity.LOW)).toBe(false);
		expect(shouldFlagForManualReview(0, ViolationSeverity.MEDIUM)).toBe(false);
		expect(shouldFlagForManualReview(0, ViolationSeverity.HIGH)).toBe(false);
		expect(shouldFlagForManualReview(0, ViolationSeverity.CRITICAL)).toBe(true); // CRITICAL always flags
	});
});

describe("edge cases - getRestrictions", () => {
	it("handles all violation types at LOW severity", () => {
		const types = Object.values(ViolationType);
		for (const type of types) {
			const restrictions = getRestrictions(type, ViolationSeverity.LOW);
			expect(Array.isArray(restrictions)).toBe(true);
			// LOW severity should have at most RATE_LIMIT or empty
			expect(restrictions.length).toBeLessThanOrEqual(1);
			if (restrictions.length === 1) {
				expect(restrictions[0]).toBe(FeatureRestriction.RATE_LIMIT);
			}
		}
	});

	it("handles all violation types at CRITICAL severity", () => {
		const types = Object.values(ViolationType);
		for (const type of types) {
			const restrictions = getRestrictions(type, ViolationSeverity.CRITICAL);
			expect(Array.isArray(restrictions)).toBe(true);
			// CRITICAL should include RATE_LIMIT if type has any restrictions
		}
	});
});

describe("edge cases - buildViolationReason", () => {
	it("handles undefined aiReason with empty rule numbers", () => {
		expect(buildViolationReason(undefined, [])).toBe("AI Detection: Porušení pravidel");
	});

	it("handles empty string aiReason with empty rule numbers", () => {
		expect(buildViolationReason("", [])).toBe("AI Detection: Porušení pravidel");
	});

	it("handles very long aiReason", () => {
		const longReason = "A".repeat(1000);
		const result = buildViolationReason(longReason, []);
		expect(result).toBe(`AI Detection: ${longReason}`);
	});

	it("handles many rule numbers", () => {
		const rules = Array.from({ length: 50 }, (_, i) => String(100 + i));
		const result = buildViolationReason(undefined, rules);
		expect(result).toContain("AI Detection: Porušení pravidel");
		expect(result).toContain("100");
		expect(result).toContain("149");
	});

	it("handles special characters in aiReason", () => {
		const reason = "Test with special chars: <script>alert('xss')</script>";
		const result = buildViolationReason(reason, []);
		expect(result).toBe(`AI Detection: ${reason}`);
	});
});
