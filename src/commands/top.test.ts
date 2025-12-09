import { describe, expect, it } from "bun:test";
import type { APIApplicationCommandOptionChoice, APIApplicationCommandStringOption, APIApplicationCommandIntegerOption } from "discord.js";
import { data } from "./top";

// Get the serialized command data
const commandData = data.toJSON();

describe("top command", () => {
	describe("metrics configuration", () => {
		// Get the metric choices from the command data
		const metricOption = commandData.options?.find(
			(opt) => opt.name === "metric"
		) as APIApplicationCommandStringOption | undefined;
		const metricChoices = metricOption?.choices?.map((c: APIApplicationCommandOptionChoice<string>) => c.value) ?? [];

		it("should only contain standard stats metrics (no investment metrics)", () => {
			const allowedMetrics = [
				"coins",
				"xp",
				"level",
				"dailystreak",
				"maxdailystreak",
				"workcount",
				"activityweekly",
				"activitylifetime",
			];

			// Investment metrics that should NOT be present
			const investmentMetrics = [
				"investmentvalue",
				"investmentprofit",
				"totalwealth",
			];

			// All choices should be in allowed metrics
			for (const choice of metricChoices) {
				expect(allowedMetrics).toContain(choice);
			}

			// No investment metrics should be present
			for (const investmentMetric of investmentMetrics) {
				expect(metricChoices).not.toContain(investmentMetric);
			}
		});

		it("should have all standard metrics available", () => {
			const requiredMetrics = [
				"coins",
				"xp",
				"level",
				"dailystreak",
				"maxdailystreak",
				"workcount",
				"activityweekly",
				"activitylifetime",
			];

			for (const metric of requiredMetrics) {
				expect(metricChoices).toContain(metric);
			}
		});

		it("should have exactly 8 metric choices", () => {
			expect(metricChoices).toHaveLength(8);
		});
	});

	describe("command structure", () => {
		it("should have correct command name", () => {
			expect(commandData.name).toBe("top");
		});

		it("should have Czech localization", () => {
			expect(commandData.name_localizations?.cs).toBe("žebříček");
		});

		it("should have limit option with correct constraints", () => {
			const limitOption = commandData.options?.find(
				(opt) => opt.name === "limit"
			) as APIApplicationCommandIntegerOption | undefined;

			expect(limitOption).toBeDefined();
			expect(limitOption?.min_value).toBe(5);
			expect(limitOption?.max_value).toBe(25);
		});
	});
});
