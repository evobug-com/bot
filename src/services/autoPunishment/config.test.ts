import { describe, expect, it } from "bun:test";
import { ViolationSeverity, ViolationType } from "../../data/violationData.ts";
import {
	AUTO_PUNISHMENT_CONFIG,
	ESCALATION_MATRIX,
	RuleSection,
	SECTION_TO_VIOLATION_TYPE,
	SEVERE_RULES,
} from "./config.ts";

describe("autoPunishment config", () => {
	describe("AUTO_PUNISHMENT_CONFIG", () => {
		it("has valid repeat offense window", () => {
			expect(AUTO_PUNISHMENT_CONFIG.repeatOffenseWindowDays).toBeGreaterThan(0);
		});

		it("has valid max offenses before review", () => {
			expect(AUTO_PUNISHMENT_CONFIG.maxAutoOffensesBeforeReview).toBeGreaterThan(0);
		});

		it("has valid first offense max severity", () => {
			expect(Object.values(ViolationSeverity)).toContain(
				AUTO_PUNISHMENT_CONFIG.aiFirstOffenseMaxSeverity,
			);
		});
	});

	describe("RuleSection enum", () => {
		it("has all expected sections", () => {
			expect(RuleSection.BASIC_BEHAVIOR).toBe(100);
			expect(RuleSection.TEXT_VOICE).toBe(200);
			expect(RuleSection.SPAM_MENTIONS).toBe(300);
			expect(RuleSection.CONTENT_CHANNELS).toBe(400);
			expect(RuleSection.ADVERTISING).toBe(500);
			expect(RuleSection.IDENTITY_PRIVACY).toBe(600);
			expect(RuleSection.LANGUAGE).toBe(700);
			expect(RuleSection.TECHNICAL).toBe(800);
			expect(RuleSection.AGE_LAW).toBe(900);
			expect(RuleSection.MODERATION).toBe(1000);
		});
	});

	describe("SECTION_TO_VIOLATION_TYPE", () => {
		it("maps all sections to violation types", () => {
			const sections = Object.values(RuleSection).filter(
				(v) => typeof v === "number",
			) as number[];

			for (const section of sections) {
				expect(SECTION_TO_VIOLATION_TYPE[section as RuleSection]).toBeDefined();
				expect(Object.values(ViolationType)).toContain(
					SECTION_TO_VIOLATION_TYPE[section as RuleSection],
				);
			}
		});

		it("maps BASIC_BEHAVIOR to TOXICITY", () => {
			expect(SECTION_TO_VIOLATION_TYPE[RuleSection.BASIC_BEHAVIOR]).toBe(
				ViolationType.TOXICITY,
			);
		});

		it("maps ADVERTISING to ADVERTISING", () => {
			expect(SECTION_TO_VIOLATION_TYPE[RuleSection.ADVERTISING]).toBe(
				ViolationType.ADVERTISING,
			);
		});

		it("maps AGE_LAW to ILLEGAL", () => {
			expect(SECTION_TO_VIOLATION_TYPE[RuleSection.AGE_LAW]).toBe(ViolationType.ILLEGAL);
		});
	});

	describe("SEVERE_RULES", () => {
		it("contains expected severe rules", () => {
			expect(SEVERE_RULES).toContain("103"); // Self-harm
			expect(SEVERE_RULES).toContain("104"); // Illegal
			expect(SEVERE_RULES).toContain("801"); // Self-bots
			expect(SEVERE_RULES).toContain("802"); // Ban evasion
		});

		it("does not contain non-severe rules", () => {
			expect(SEVERE_RULES).not.toContain("101");
			expect(SEVERE_RULES).not.toContain("201");
			expect(SEVERE_RULES).not.toContain("301");
		});
	});

	describe("ESCALATION_MATRIX", () => {
		it("returns LOW for first offense (0)", () => {
			expect(ESCALATION_MATRIX[0]).toBe(ViolationSeverity.LOW);
		});

		it("returns MEDIUM for second offense (1)", () => {
			expect(ESCALATION_MATRIX[1]).toBe(ViolationSeverity.MEDIUM);
		});

		it("returns HIGH for third offense (2)", () => {
			expect(ESCALATION_MATRIX[2]).toBe(ViolationSeverity.HIGH);
		});

		it("escalates progressively", () => {
			const severityOrder = [
				ViolationSeverity.LOW,
				ViolationSeverity.MEDIUM,
				ViolationSeverity.HIGH,
				ViolationSeverity.CRITICAL,
			];

			const matrix0 = ESCALATION_MATRIX[0];
			const matrix1 = ESCALATION_MATRIX[1];
			const matrix2 = ESCALATION_MATRIX[2];

			expect(matrix0).toBeDefined();
			expect(matrix1).toBeDefined();
			expect(matrix2).toBeDefined();

			if (matrix0 && matrix1 && matrix2) {
				const matrix0Index = severityOrder.indexOf(matrix0);
				const matrix1Index = severityOrder.indexOf(matrix1);
				const matrix2Index = severityOrder.indexOf(matrix2);

				expect(matrix1Index).toBeGreaterThan(matrix0Index);
				expect(matrix2Index).toBeGreaterThan(matrix1Index);
			}
		});
	});
});
