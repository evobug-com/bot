import { describe, expect, it } from "bun:test";
import { ViolationSeverity } from "../../data/violationData.ts";
import { formatPunishmentForAlert, type AutoPunishmentResult } from "./index.ts";

/**
 * Tests for dry-run mode functionality
 */
describe("Dry-run mode", () => {
	describe("formatPunishmentForAlert with dry-run", () => {
		it("shows dry-run notice prominently when dryRun is true", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null,
				offenseCount: 0,
				severity: ViolationSeverity.LOW,
				messageDeleted: false,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("[DRY-RUN MODE]");
			expect(alert).toContain("Žádný trest nebyl skutečně aplikován");
		});

		it("uses 'Navrhovaný trest' instead of 'Automatický trest' in dry-run", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null,
				offenseCount: 0,
				severity: ViolationSeverity.MEDIUM,
				messageDeleted: false,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Navrhovaný trest");
			expect(alert).not.toContain("Automatický trest");
		});

		it("uses conditional language for message deletion in dry-run", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null,
				offenseCount: 2,
				severity: ViolationSeverity.HIGH,
				messageDeleted: true,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Zpráva by byla smazána");
			expect(alert).not.toContain("Zpráva byla smazána");
		});

		it("uses conditional language for manual review in dry-run", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: true,
				violation: null,
				offenseCount: 3,
				severity: ViolationSeverity.HIGH,
				messageDeleted: false,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Vyžadovalo by manuální přezkoumání");
			expect(alert).not.toContain("Vyžaduje manuální přezkoumání");
		});

		it("shows violation would be created notice in dry-run", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null, // No actual violation in dry-run
				offenseCount: 0,
				severity: ViolationSeverity.LOW,
				messageDeleted: false,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("Porušení by bylo vytvořeno");
		});

		it("does NOT show dry-run notice when dryRun is false", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: { id: 123 } as AutoPunishmentResult["violation"],
				offenseCount: 0,
				severity: ViolationSeverity.LOW,
				messageDeleted: false,
				dryRun: false,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).not.toContain("[DRY-RUN MODE]");
			expect(alert).toContain("Automatický trest");
		});

		it("shows actual violation ID in live mode", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: { id: 99999 } as AutoPunishmentResult["violation"],
				offenseCount: 0,
				severity: ViolationSeverity.LOW,
				messageDeleted: false,
				dryRun: false,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("ID porušení:** 99999");
			expect(alert).not.toContain("dry-run");
		});
	});

	describe("dry-run result structure", () => {
		it("dry-run result has punished=true but violation=null", () => {
			// This is the expected structure when dry-run is enabled
			const dryRunResult: AutoPunishmentResult = {
				punished: true, // Would have been punished
				flaggedForReview: false,
				violation: null, // But no actual violation created
				offenseCount: 1,
				severity: ViolationSeverity.MEDIUM,
				messageDeleted: true, // Would have been deleted
				dryRun: true,
			};

			expect(dryRunResult.punished).toBe(true);
			expect(dryRunResult.violation).toBe(null);
			expect(dryRunResult.dryRun).toBe(true);
		});

		it("live result has both punished=true and violation object", () => {
			const liveResult: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: { id: 12345 } as AutoPunishmentResult["violation"],
				offenseCount: 1,
				severity: ViolationSeverity.MEDIUM,
				messageDeleted: true,
				dryRun: false,
			};

			expect(liveResult.punished).toBe(true);
			expect(liveResult.violation).not.toBe(null);
			expect(liveResult.dryRun).toBe(false);
		});
	});

	describe("dry-run alert formatting edge cases", () => {
		it("handles dry-run with all flags set", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: true,
				violation: null,
				offenseCount: 5,
				severity: ViolationSeverity.HIGH,
				messageDeleted: true,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("[DRY-RUN MODE]");
			expect(alert).toContain("Vyžadovalo by manuální přezkoumání");
			expect(alert).toContain("Navrhovaný trest:** HIGH");
			expect(alert).toContain("Počet porušení v této sekci:** 6");
			expect(alert).toContain("Zpráva by byla smazána");
			expect(alert).toContain("Porušení by bylo vytvořeno");
		});

		it("handles dry-run with minimum flags", () => {
			const result: AutoPunishmentResult = {
				punished: true,
				flaggedForReview: false,
				violation: null,
				offenseCount: 0,
				severity: ViolationSeverity.LOW,
				messageDeleted: false,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			expect(alert).toContain("[DRY-RUN MODE]");
			expect(alert).toContain("Navrhovaný trest:** LOW");
			expect(alert).toContain("Počet porušení v této sekci:** 1");
			expect(alert).not.toContain("Zpráva");
			expect(alert).not.toContain("přezkoumání");
		});

		it("handles non-punished dry-run result", () => {
			// Edge case: dry-run enabled but punishment wasn't triggered
			const result: AutoPunishmentResult = {
				punished: false,
				flaggedForReview: false,
				violation: null,
				offenseCount: 0,
				severity: null,
				messageDeleted: false,
				dryRun: true,
			};

			const alert = formatPunishmentForAlert(result);
			// Should return the standard "no punishment" message
			expect(alert).toBe("Žádný automatický trest nebyl aplikován.");
		});
	});

	describe("dry-run severity levels", () => {
		const severities = [
			ViolationSeverity.LOW,
			ViolationSeverity.MEDIUM,
			ViolationSeverity.HIGH,
			ViolationSeverity.CRITICAL,
		];

		for (const severity of severities) {
			it(`correctly formats dry-run alert for ${severity} severity`, () => {
				const result: AutoPunishmentResult = {
					punished: true,
					flaggedForReview: severity === ViolationSeverity.CRITICAL,
					violation: null,
					offenseCount: 0,
					severity,
					messageDeleted: severity === ViolationSeverity.HIGH || severity === ViolationSeverity.CRITICAL,
					dryRun: true,
				};

				const alert = formatPunishmentForAlert(result);
				expect(alert).toContain("[DRY-RUN MODE]");
				expect(alert).toContain(`Navrhovaný trest:** ${severity}`);
			});
		}
	});

	describe("dry-run vs live mode comparison", () => {
		it("dry-run and live alerts have different formats for same scenario", () => {
			const baseData = {
				punished: true,
				flaggedForReview: false,
				offenseCount: 1,
				severity: ViolationSeverity.MEDIUM,
				messageDeleted: false,
			};

			const dryRunResult: AutoPunishmentResult = {
				...baseData,
				violation: null,
				dryRun: true,
			};

			const liveResult: AutoPunishmentResult = {
				...baseData,
				violation: { id: 12345 } as AutoPunishmentResult["violation"],
				dryRun: false,
			};

			const dryRunAlert = formatPunishmentForAlert(dryRunResult);
			const liveAlert = formatPunishmentForAlert(liveResult);

			// Both should contain the offense count
			expect(dryRunAlert).toContain("Počet porušení v této sekci:** 2");
			expect(liveAlert).toContain("Počet porušení v této sekci:** 2");

			// Both should contain the severity
			expect(dryRunAlert).toContain("MEDIUM");
			expect(liveAlert).toContain("MEDIUM");

			// Only dry-run should have the mode indicator
			expect(dryRunAlert).toContain("[DRY-RUN MODE]");
			expect(liveAlert).not.toContain("[DRY-RUN MODE]");

			// Different labels
			expect(dryRunAlert).toContain("Navrhovaný trest");
			expect(liveAlert).toContain("Automatický trest");

			// Only live has violation ID
			expect(liveAlert).toContain("ID porušení:** 12345");
			expect(dryRunAlert).not.toContain("ID porušení");
		});
	});
});
