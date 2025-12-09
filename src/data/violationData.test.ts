import { describe, expect, it } from "bun:test";
import {
	AccountStanding,
	calculateAccountStanding,
	calculateSeverityScore,
	isAiDetectedViolation,
	isExpired,
	isRecent,
	type Violation,
	ViolationSeverity,
	ViolationType,
} from "./violationData.ts";

describe("violationData utilities", () => {
	describe("isAiDetectedViolation", () => {
		const baseViolation: Violation = {
			id: 1,
			userId: 123,
			guildId: "guild123",
			type: ViolationType.TOXICITY,
			severity: ViolationSeverity.LOW,
			policyViolated: "101",
			reason: "Test violation",
			restrictions: [],
			actionsApplied: null,
			issuedBy: 456,
			issuedAt: new Date(),
		};

		describe("issuedBy detection", () => {
			it("returns true when issuedBy is 0 (system)", () => {
				const violation = { ...baseViolation, issuedBy: 0 };
				expect(isAiDetectedViolation(violation)).toBe(true);
			});

			it("returns true when issuedBy is null", () => {
				const violation = { ...baseViolation, issuedBy: null };
				expect(isAiDetectedViolation(violation)).toBe(true);
			});

			it("returns false when issuedBy is a positive user ID", () => {
				const violation = { ...baseViolation, issuedBy: 12345 };
				expect(isAiDetectedViolation(violation)).toBe(false);
			});
		});

		describe("context detection", () => {
			it("returns true when context contains 'AI-detected'", () => {
				const violation = {
					...baseViolation,
					issuedBy: 12345, // Not system
					context: "AI-detected | Channel: 123 | Offense #1",
				};
				expect(isAiDetectedViolation(violation)).toBe(true);
			});

			it("returns false when context does not contain marker", () => {
				const violation = {
					...baseViolation,
					issuedBy: 12345,
					context: "Manual moderation action",
				};
				expect(isAiDetectedViolation(violation)).toBe(false);
			});

			it("returns false when context is undefined", () => {
				const violation = {
					...baseViolation,
					issuedBy: 12345,
					context: undefined,
				};
				expect(isAiDetectedViolation(violation)).toBe(false);
			});

			it("returns false when context is null", () => {
				const violation = {
					...baseViolation,
					issuedBy: 12345,
					context: null,
				};
				expect(isAiDetectedViolation(violation)).toBe(false);
			});
		});

		describe("combined scenarios", () => {
			it("returns true when both issuedBy=0 and AI-detected in context", () => {
				const violation = {
					...baseViolation,
					issuedBy: 0,
					context: "AI-detected | Channel: 123",
				};
				expect(isAiDetectedViolation(violation)).toBe(true);
			});

			it("prioritizes issuedBy check (faster path)", () => {
				// Even if context doesn't have marker, issuedBy=0 should trigger
				const violation = {
					...baseViolation,
					issuedBy: 0,
					context: "Some other context",
				};
				expect(isAiDetectedViolation(violation)).toBe(true);
			});
		});

		describe("edge cases", () => {
			it("handles case sensitivity in context marker", () => {
				// The marker is case-sensitive
				const violation = {
					...baseViolation,
					issuedBy: 12345,
					context: "ai-detected | Channel: 123", // lowercase
				};
				expect(isAiDetectedViolation(violation)).toBe(false);
			});

			it("handles partial marker in context", () => {
				const violation = {
					...baseViolation,
					issuedBy: 12345,
					context: "AI-detect", // Missing 'ed'
				};
				expect(isAiDetectedViolation(violation)).toBe(false);
			});

			it("handles marker at different positions in context", () => {
				const violation1 = {
					...baseViolation,
					issuedBy: 12345,
					context: "AI-detected at start",
				};
				const violation2 = {
					...baseViolation,
					issuedBy: 12345,
					context: "Found AI-detected in middle",
				};
				const violation3 = {
					...baseViolation,
					issuedBy: 12345,
					context: "End with AI-detected",
				};
				expect(isAiDetectedViolation(violation1)).toBe(true);
				expect(isAiDetectedViolation(violation2)).toBe(true);
				expect(isAiDetectedViolation(violation3)).toBe(true);
			});
		});
	});

	describe("isExpired", () => {
		const baseViolation: Violation = {
			id: 1,
			userId: 123,
			guildId: "guild123",
			type: ViolationType.TOXICITY,
			severity: ViolationSeverity.LOW,
			policyViolated: "101",
			reason: "Test",
			restrictions: [],
			actionsApplied: null,
			issuedBy: 0,
			issuedAt: new Date(),
		};

		it("returns true when expiredAt is set", () => {
			const violation = { ...baseViolation, expiredAt: new Date() };
			expect(isExpired(violation)).toBe(true);
		});

		it("returns false when no expiresAt", () => {
			const violation = { ...baseViolation, expiresAt: undefined };
			expect(isExpired(violation)).toBe(false);
		});

		it("returns true when expiresAt is in the past", () => {
			const pastDate = new Date();
			pastDate.setDate(pastDate.getDate() - 1);
			const violation = { ...baseViolation, expiresAt: pastDate };
			expect(isExpired(violation)).toBe(true);
		});

		it("returns false when expiresAt is in the future", () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);
			const violation = { ...baseViolation, expiresAt: futureDate };
			expect(isExpired(violation)).toBe(false);
		});
	});

	describe("isRecent", () => {
		const baseViolation: Violation = {
			id: 1,
			userId: 123,
			guildId: "guild123",
			type: ViolationType.TOXICITY,
			severity: ViolationSeverity.LOW,
			policyViolated: "101",
			reason: "Test",
			restrictions: [],
			actionsApplied: null,
			issuedBy: 0,
			issuedAt: new Date(),
		};

		it("returns true for violations within last 30 days", () => {
			const recentDate = new Date();
			recentDate.setDate(recentDate.getDate() - 15);
			const violation = { ...baseViolation, issuedAt: recentDate };
			expect(isRecent(violation)).toBe(true);
		});

		it("returns false for violations older than 30 days", () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 31);
			const violation = { ...baseViolation, issuedAt: oldDate };
			expect(isRecent(violation)).toBe(false);
		});

		it("returns true for today's violations", () => {
			const violation = { ...baseViolation, issuedAt: new Date() };
			expect(isRecent(violation)).toBe(true);
		});
	});

	describe("calculateSeverityScore", () => {
		const baseViolation: Violation = {
			id: 1,
			userId: 123,
			guildId: "guild123",
			type: ViolationType.TOXICITY,
			severity: ViolationSeverity.LOW,
			policyViolated: "101",
			reason: "Test",
			restrictions: [],
			actionsApplied: null,
			issuedBy: 0,
			issuedAt: new Date(),
		};

		it("returns 0 for empty violations array", () => {
			expect(calculateSeverityScore([])).toBe(0);
		});

		it("calculates correct score for single LOW violation", () => {
			const violation = { ...baseViolation, severity: ViolationSeverity.LOW };
			// Recent = 1.5x multiplier, LOW = 10 points
			expect(calculateSeverityScore([violation])).toBe(15);
		});

		it("calculates correct score for single MEDIUM violation", () => {
			const violation = { ...baseViolation, severity: ViolationSeverity.MEDIUM };
			// Recent = 1.5x multiplier, MEDIUM = 25 points
			expect(calculateSeverityScore([violation])).toBe(37.5);
		});

		it("calculates correct score for single HIGH violation", () => {
			const violation = { ...baseViolation, severity: ViolationSeverity.HIGH };
			// Recent = 1.5x multiplier, HIGH = 50 points
			expect(calculateSeverityScore([violation])).toBe(75);
		});

		it("calculates correct score for single CRITICAL violation", () => {
			const violation = { ...baseViolation, severity: ViolationSeverity.CRITICAL };
			// Recent = 1.5x multiplier, CRITICAL = 100 points
			expect(calculateSeverityScore([violation])).toBe(150);
		});

		it("sums scores for multiple violations", () => {
			const violations = [
				{ ...baseViolation, severity: ViolationSeverity.LOW },
				{ ...baseViolation, severity: ViolationSeverity.MEDIUM },
			];
			// (10 * 1.5) + (25 * 1.5) = 15 + 37.5 = 52.5
			expect(calculateSeverityScore(violations)).toBe(52.5);
		});
	});

	describe("calculateAccountStanding", () => {
		const baseViolation: Violation = {
			id: 1,
			userId: 123,
			guildId: "guild123",
			type: ViolationType.TOXICITY,
			severity: ViolationSeverity.LOW,
			policyViolated: "101",
			reason: "Test",
			restrictions: [],
			actionsApplied: null,
			issuedBy: 0,
			issuedAt: new Date(),
		};

		it("returns ALL_GOOD for no violations", () => {
			expect(calculateAccountStanding([])).toBe(AccountStanding.ALL_GOOD);
		});

		it("returns ALL_GOOD for only expired violations", () => {
			const expiredViolation = { ...baseViolation, expiredAt: new Date() };
			expect(calculateAccountStanding([expiredViolation])).toBe(AccountStanding.ALL_GOOD);
		});

		it("returns LIMITED for score 25-49", () => {
			// Single MEDIUM recent = 37.5 points
			const violation = { ...baseViolation, severity: ViolationSeverity.MEDIUM };
			expect(calculateAccountStanding([violation])).toBe(AccountStanding.LIMITED);
		});

		it("returns VERY_LIMITED for score 50-74", () => {
			// We need 50-74, so let's use LOW + MEDIUM
			// 15 + 37.5 = 52.5
			const violations = [
				{ ...baseViolation, severity: ViolationSeverity.LOW },
				{ ...baseViolation, id: 2, severity: ViolationSeverity.MEDIUM },
			];
			expect(calculateAccountStanding(violations)).toBe(AccountStanding.VERY_LIMITED);
		});

		it("returns AT_RISK for score 75-99", () => {
			// Single HIGH recent = 75 points
			const violation = { ...baseViolation, severity: ViolationSeverity.HIGH };
			expect(calculateAccountStanding([violation])).toBe(AccountStanding.AT_RISK);
		});

		it("returns SUSPENDED for score >= 100", () => {
			// Single CRITICAL recent = 150 points
			const violation = { ...baseViolation, severity: ViolationSeverity.CRITICAL };
			expect(calculateAccountStanding([violation])).toBe(AccountStanding.SUSPENDED);
		});
	});
});
