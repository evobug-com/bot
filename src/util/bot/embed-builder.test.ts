import { describe, expect, it } from "bun:test";
import { EmbedBuilder } from "discord.js";
import {
	createEconomyEmbed,
	createEmbed,
	createErrorEmbed,
	createInfoEmbed,
	createLeaderboardEmbed,
	createLevelUpEmbed,
	createProgressBar,
	createSuccessEmbed,
	EMBED_COLORS,
} from "./embed-builder.js";

describe("embed-builder utilities", () => {
	describe("createEmbed", () => {
		it("creates embed with correct color", () => {
			const embed = createEmbed("success");
			expect(embed).toBeInstanceOf(EmbedBuilder);
			expect(embed.toJSON().color).toBe(EMBED_COLORS.success);
		});

		it("uses custom color when provided", () => {
			const customColor = 0x123456;
			const embed = createEmbed("info", customColor);
			expect(embed.toJSON().color).toBe(customColor);
		});

		it("includes timestamp", () => {
			const embed = createEmbed();
			expect(embed.toJSON().timestamp).toBeDefined();
		});
	});

	describe("createSuccessEmbed", () => {
		it("creates green embed with checkmark", () => {
			const embed = createSuccessEmbed("Success");
			const data = embed.toJSON();
			expect(data.color).toBe(EMBED_COLORS.success);
			expect(data.title).toBe("✅ Success");
		});

		it("includes description when provided", () => {
			const embed = createSuccessEmbed("Success", "Operation completed");
			expect(embed.toJSON().description).toBe("Operation completed");
		});
	});

	describe("createErrorEmbed", () => {
		it("creates red embed with X mark", () => {
			const embed = createErrorEmbed("Error");
			const data = embed.toJSON();
			expect(data.color).toBe(EMBED_COLORS.error);
			expect(data.title).toBe("❌ Error");
		});
	});

	describe("createInfoEmbed", () => {
		it("creates blue embed with info icon", () => {
			const embed = createInfoEmbed("Information");
			const data = embed.toJSON();
			expect(data.color).toBe(EMBED_COLORS.info);
			expect(data.title).toBe("ℹ️ Information");
		});
	});

	describe("createEconomyEmbed", () => {
		it("creates gold embed with money icon", () => {
			const embed = createEconomyEmbed("Balance");
			const data = embed.toJSON();
			expect(data.color).toBe(EMBED_COLORS.economy);
			expect(data.title).toBe("💰 Balance");
		});
	});

	describe("createLevelUpEmbed", () => {
		it("creates purple embed with celebration icon", () => {
			const embed = createLevelUpEmbed("Level Up!", "You reached level 5");
			const data = embed.toJSON();
			expect(data.color).toBe(EMBED_COLORS.levelUp);
			expect(data.title).toBe("🎉 Level Up!");
			expect(data.description).toBe("You reached level 5");
		});
	});

	describe("createLeaderboardEmbed", () => {
		it("creates embed with trophy icon and fields", () => {
			const fields = [
				{ name: "1st", value: "User1", inline: true },
				{ name: "2nd", value: "User2", inline: true },
			];
			const embed = createLeaderboardEmbed("Top Players", fields);
			const data = embed.toJSON();
			expect(data.title).toBe("🏆 Top Players");
			expect(data.fields).toHaveLength(2);
			expect(data.fields?.[0]?.name).toBe("1st");
		});
	});

	describe("createProgressBar", () => {
		it("creates empty bar for 0%", () => {
			const bar = createProgressBar(0, 100);
			expect(bar).toBe("[░░░░░░░░░░] 0%");
		});

		it("creates full bar for 100%", () => {
			const bar = createProgressBar(100, 100);
			expect(bar).toBe("[██████████] 100%");
		});

		it("creates partial bar for 50%", () => {
			const bar = createProgressBar(50, 100);
			expect(bar).toBe("[█████░░░░░] 50%");
		});

		it("handles custom length", () => {
			const bar = createProgressBar(3, 10, 5);
			expect(bar).toBe("[██░░░] 30%");
		});

		it("clamps values above 100%", () => {
			const bar = createProgressBar(150, 100);
			expect(bar).toBe("[██████████] 100%");
		});

		it("clamps negative values to 0%", () => {
			const bar = createProgressBar(-10, 100);
			expect(bar).toBe("[░░░░░░░░░░] 0%");
		});
	});
});
