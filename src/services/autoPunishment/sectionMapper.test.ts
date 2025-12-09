import { describe, expect, it } from "bun:test";
import { ViolationType } from "../../data/violationData.ts";
import { RuleSection } from "./config.ts";
import {
	extractSectionFromRule,
	extractSectionsFromCategories,
	formatPolicyViolated,
	getViolationTypeForRule,
	isSevereRule,
	mapCategoriesToViolation,
} from "./sectionMapper.ts";

describe("sectionMapper", () => {
	describe("extractSectionFromRule", () => {
		it("extracts section 100 from rule 101-106", () => {
			expect(extractSectionFromRule("101")).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(extractSectionFromRule("103")).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(extractSectionFromRule("106")).toBe(RuleSection.BASIC_BEHAVIOR);
		});

		it("extracts section 200 from rule 201-204", () => {
			expect(extractSectionFromRule("201")).toBe(RuleSection.TEXT_VOICE);
			expect(extractSectionFromRule("204")).toBe(RuleSection.TEXT_VOICE);
		});

		it("extracts section 300 from rule 301-306", () => {
			expect(extractSectionFromRule("301")).toBe(RuleSection.SPAM_MENTIONS);
			expect(extractSectionFromRule("306")).toBe(RuleSection.SPAM_MENTIONS);
		});

		it("extracts section 500 from rule 501-502", () => {
			expect(extractSectionFromRule("501")).toBe(RuleSection.ADVERTISING);
			expect(extractSectionFromRule("502")).toBe(RuleSection.ADVERTISING);
		});

		it("extracts section 1000 from rule 1001-1004", () => {
			expect(extractSectionFromRule("1001")).toBe(RuleSection.MODERATION);
			expect(extractSectionFromRule("1004")).toBe(RuleSection.MODERATION);
		});

		it("returns null for invalid rule numbers", () => {
			expect(extractSectionFromRule("99")).toBe(null);
			expect(extractSectionFromRule("abc")).toBe(null);
			expect(extractSectionFromRule("")).toBe(null);
		});
	});

	describe("getViolationTypeForRule", () => {
		it("returns TOXICITY for basic behavior rules (100s)", () => {
			expect(getViolationTypeForRule("101")).toBe(ViolationType.TOXICITY);
			expect(getViolationTypeForRule("105")).toBe(ViolationType.TOXICITY);
		});

		it("returns SELF_HARM for rule 103 (override)", () => {
			expect(getViolationTypeForRule("103")).toBe(ViolationType.SELF_HARM);
		});

		it("returns ILLEGAL for rule 104 (override)", () => {
			expect(getViolationTypeForRule("104")).toBe(ViolationType.ILLEGAL);
		});

		it("returns NSFW for text/voice rules (200s)", () => {
			expect(getViolationTypeForRule("201")).toBe(ViolationType.NSFW);
			expect(getViolationTypeForRule("203")).toBe(ViolationType.NSFW);
		});

		it("returns SPAM for spam/mentions rules (300s)", () => {
			expect(getViolationTypeForRule("301")).toBe(ViolationType.SPAM);
			expect(getViolationTypeForRule("302")).toBe(ViolationType.SPAM);
		});

		it("returns ADVERTISING for advertising rules (500s)", () => {
			expect(getViolationTypeForRule("501")).toBe(ViolationType.ADVERTISING);
			expect(getViolationTypeForRule("502")).toBe(ViolationType.ADVERTISING);
		});

		it("returns IMPERSONATION for rule 601 (override)", () => {
			expect(getViolationTypeForRule("601")).toBe(ViolationType.IMPERSONATION);
		});

		it("returns PRIVACY for rule 602 (override)", () => {
			expect(getViolationTypeForRule("602")).toBe(ViolationType.PRIVACY);
		});

		it("returns EVASION for technical rules (800s)", () => {
			expect(getViolationTypeForRule("801")).toBe(ViolationType.EVASION);
			expect(getViolationTypeForRule("803")).toBe(ViolationType.EVASION);
		});

		it("returns ILLEGAL for age/law rules (900s)", () => {
			expect(getViolationTypeForRule("901")).toBe(ViolationType.ILLEGAL);
			expect(getViolationTypeForRule("902")).toBe(ViolationType.ILLEGAL);
		});

		it("returns OTHER for invalid/unknown rules", () => {
			expect(getViolationTypeForRule("abc")).toBe(ViolationType.OTHER);
			expect(getViolationTypeForRule("")).toBe(ViolationType.OTHER);
			expect(getViolationTypeForRule("99")).toBe(ViolationType.OTHER); // Too low
		});

		it("returns ILLEGAL for rule 999 (in 900s section)", () => {
			// 999 is in the 900s section which maps to ILLEGAL
			expect(getViolationTypeForRule("999")).toBe(ViolationType.ILLEGAL);
		});
	});

	describe("isSevereRule", () => {
		it("returns true for severe rules", () => {
			expect(isSevereRule("103")).toBe(true); // Self-harm
			expect(isSevereRule("104")).toBe(true); // Illegal
			expect(isSevereRule("801")).toBe(true); // Self-bots
			expect(isSevereRule("802")).toBe(true); // Alt accounts
		});

		it("returns false for non-severe rules", () => {
			expect(isSevereRule("101")).toBe(false);
			expect(isSevereRule("201")).toBe(false);
			expect(isSevereRule("301")).toBe(false);
			expect(isSevereRule("501")).toBe(false);
		});
	});

	describe("extractSectionsFromCategories", () => {
		it("extracts single section", () => {
			const sections = extractSectionsFromCategories(["101"]);
			expect(sections).toEqual([RuleSection.BASIC_BEHAVIOR]);
		});

		it("extracts multiple different sections", () => {
			const sections = extractSectionsFromCategories(["101", "201", "301"]);
			expect(sections).toContain(RuleSection.BASIC_BEHAVIOR);
			expect(sections).toContain(RuleSection.TEXT_VOICE);
			expect(sections).toContain(RuleSection.SPAM_MENTIONS);
			expect(sections.length).toBe(3);
		});

		it("deduplicates sections from same category", () => {
			const sections = extractSectionsFromCategories(["101", "102", "103"]);
			expect(sections).toEqual([RuleSection.BASIC_BEHAVIOR]);
		});

		it("filters out invalid categories", () => {
			const sections = extractSectionsFromCategories(["101", "invalid", "abc", "201"]);
			expect(sections).toContain(RuleSection.BASIC_BEHAVIOR);
			expect(sections).toContain(RuleSection.TEXT_VOICE);
			expect(sections.length).toBe(2);
		});

		it("returns empty array for no valid categories", () => {
			const sections = extractSectionsFromCategories(["invalid", "abc"]);
			expect(sections).toEqual([]);
		});
	});

	describe("mapCategoriesToViolation", () => {
		it("maps single rule to violation", () => {
			const result = mapCategoriesToViolation(["101"]);
			expect(result).not.toBe(null);
			expect(result?.ruleNumbers).toEqual(["101"]);
			expect(result?.primarySection).toBe(RuleSection.BASIC_BEHAVIOR);
			expect(result?.violationType).toBe(ViolationType.TOXICITY);
			expect(result?.isSevere).toBe(false);
		});

		it("detects severe rules", () => {
			const result = mapCategoriesToViolation(["103"]);
			expect(result?.isSevere).toBe(true);
			expect(result?.violationType).toBe(ViolationType.SELF_HARM);
		});

		it("prioritizes more severe violation types", () => {
			// ILLEGAL should be prioritized over TOXICITY
			const result = mapCategoriesToViolation(["101", "104"]);
			expect(result?.violationType).toBe(ViolationType.ILLEGAL);
		});

		it("returns null for empty categories", () => {
			const result = mapCategoriesToViolation([]);
			expect(result).toBe(null);
		});

		it("returns null for invalid categories", () => {
			const result = mapCategoriesToViolation(["invalid", "abc"]);
			expect(result).toBe(null);
		});

		it("handles multiple rules from same section", () => {
			const result = mapCategoriesToViolation(["301", "302", "303"]);
			expect(result?.ruleNumbers).toEqual(["301", "302", "303"]);
			expect(result?.sections).toEqual([RuleSection.SPAM_MENTIONS]);
			expect(result?.violationType).toBe(ViolationType.SPAM);
		});
	});

	describe("formatPolicyViolated", () => {
		it("formats single rule", () => {
			expect(formatPolicyViolated(["101"])).toBe("101");
		});

		it("formats multiple rules with comma separator", () => {
			expect(formatPolicyViolated(["101", "201", "301"])).toBe("101,201,301");
		});

		it("returns empty string for empty array", () => {
			expect(formatPolicyViolated([])).toBe("");
		});
	});
});
