import { describe, expect, it } from "bun:test";
import { buildCustomId, buildDecisionButtons, buildDisabledButtons, buildProcessingButtons, buildResumePromptButtons } from "./handleStoryInteractions";

// Type for button component in JSON format
interface ButtonComponentJson {
	type: number;
	custom_id?: string;
	label?: string;
	disabled?: boolean;
	style: number;
}

// Type for action row in JSON format
interface ActionRowJson {
	type: number;
	components: ButtonComponentJson[];
}

describe("Story Interactions Handler", () => {
	describe("buildCustomId", () => {
		it("should build a valid custom ID", () => {
			const customId = buildCustomId("stolen_money", "session123", "choiceX");
			expect(customId).toBe("story_stolen_money_session123_choiceX");
		});

		it("should handle different actions", () => {
			expect(buildCustomId("story1", "sess1", "choiceX")).toBe("story_story1_sess1_choiceX");
			expect(buildCustomId("story1", "sess1", "choiceY")).toBe("story_story1_sess1_choiceY");
			expect(buildCustomId("story1", "sess1", "cancel")).toBe("story_story1_sess1_cancel");
			expect(buildCustomId("story1", "sess1", "keepBalance")).toBe("story_story1_sess1_keepBalance");
		});

		it("should handle story IDs with underscores", () => {
			const customId = buildCustomId("stolen_money_branching", "session123", "choiceX");
			expect(customId).toBe("story_stolen_money_branching_session123_choiceX");
		});
	});

	describe("buildDecisionButtons", () => {
		it("should return 2 action rows", () => {
			const buttons = buildDecisionButtons(
				"stolen_money",
				"session123",
				"Utéct s penězi",
				"Vrátit peněženku",
				0,
			);
			expect(buttons.length).toBe(2);
		});

		it("should build buttons with correct structure", () => {
			const buttons = buildDecisionButtons(
				"stolen_money",
				"session123",
				"Option A",
				"Option B",
				100,
			);

			// Convert to JSON to check structure
			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const row2Json = buttons[1]?.toJSON() as ActionRowJson;

			expect(row1Json).toBeDefined();
			expect(row2Json).toBeDefined();

			// Row 1 should have 2 components (choiceX, choiceY)
			expect(row1Json.components.length).toBe(2);

			// Row 2 should have 2 components (cancel, keepBalance)
			expect(row2Json.components.length).toBe(2);
		});

		it("should show positive coins with plus sign", () => {
			const buttons = buildDecisionButtons(
				"story1",
				"sess1",
				"A",
				"B",
				500,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			// Find the keepBalance button
			const keepBalanceButton = row2Json.components.find(
				(c) => c.custom_id?.includes("keepBalance")
			);

			expect(keepBalanceButton?.label).toContain("+500");
		});

		it("should show negative coins without plus sign", () => {
			const buttons = buildDecisionButtons(
				"story1",
				"sess1",
				"A",
				"B",
				-200,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			const keepBalanceButton = row2Json.components.find(
				(c) => c.custom_id?.includes("keepBalance")
			);

			expect(keepBalanceButton?.label).toContain("-200");
			expect(keepBalanceButton?.label).not.toContain("+-");
		});

		it("should show zero coins with plus sign", () => {
			const buttons = buildDecisionButtons(
				"story1",
				"sess1",
				"A",
				"B",
				0,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			const keepBalanceButton = row2Json.components.find(
				(c) => c.custom_id?.includes("keepBalance")
			);

			expect(keepBalanceButton?.label).toContain("+0");
		});

		it("should include choice labels with dice emoji", () => {
			const buttons = buildDecisionButtons(
				"story1",
				"sess1",
				"Steal",
				"Return",
				0,
			);

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const choiceXButton = row1Json.components[0];
			const choiceYButton = row1Json.components[1];

			expect(choiceXButton?.label).toContain("🎲");
			expect(choiceXButton?.label).toContain("Steal");
			expect(choiceYButton?.label).toContain("🎲");
			expect(choiceYButton?.label).toContain("Return");
		});

		it("should have cancel button with X emoji", () => {
			const buttons = buildDecisionButtons(
				"story1",
				"sess1",
				"A",
				"B",
				0,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			const cancelButton = row2Json.components.find(
				(c) => c.custom_id?.includes("cancel")
			);

			expect(cancelButton?.label).toContain("❌");
		});

		it("should have keepBalance button with money emoji", () => {
			const buttons = buildDecisionButtons(
				"story1",
				"sess1",
				"A",
				"B",
				0,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			const keepBalanceButton = row2Json.components.find(
				(c) => c.custom_id?.includes("keepBalance")
			);

			expect(keepBalanceButton?.label).toContain("💰");
		});

		it("should have buttons not disabled", () => {
			const buttons = buildDecisionButtons(
				"story1",
				"sess1",
				"A",
				"B",
				0,
			);

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			for (const component of row1Json.components) {
				expect(component.disabled).toBe(false);
			}
		});
	});

	describe("buildDisabledButtons", () => {
		it("should return 2 action rows", () => {
			const buttons = buildDisabledButtons("story1", "sess1");
			expect(buttons.length).toBe(2);
		});

		it("should have all buttons disabled", () => {
			const buttons = buildDisabledButtons("story1", "sess1");

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const row2Json = buttons[1]?.toJSON() as ActionRowJson;

			for (const component of row1Json.components) {
				expect(component.disabled).toBe(true);
			}

			for (const component of row2Json.components) {
				expect(component.disabled).toBe(true);
			}
		});

		it("should have generic choice labels", () => {
			const buttons = buildDisabledButtons("story1", "sess1");

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const choiceXButton = row1Json.components[0];
			const choiceYButton = row1Json.components[1];

			expect(choiceXButton?.label).toBe("🎲 Volba A");
			expect(choiceYButton?.label).toBe("🎲 Volba B");
		});

		it("should maintain correct custom IDs", () => {
			const buttons = buildDisabledButtons("my_story", "my_session");

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const row2Json = buttons[1]?.toJSON() as ActionRowJson;

			expect(row1Json.components[0]?.custom_id).toBe("story_my_story_my_session_choiceX");
			expect(row1Json.components[1]?.custom_id).toBe("story_my_story_my_session_choiceY");
			expect(row2Json.components[0]?.custom_id).toBe("story_my_story_my_session_cancel");
			expect(row2Json.components[1]?.custom_id).toBe("story_my_story_my_session_keepBalance");
		});
	});

	describe("Custom ID format", () => {
		it("should follow the pattern story_{storyId}_{sessionId}_{action}", () => {
			const storyId = "test_story";
			const sessionId = "abc123";
			const actions = ["choiceX", "choiceY", "cancel", "keepBalance"] as const;

			for (const action of actions) {
				const customId = buildCustomId(storyId, sessionId, action);
				expect(customId).toMatch(/^story_[^_]+(?:_[^_]+)*_[^_]+_[^_]+$/);
				expect(customId.startsWith("story_")).toBe(true);
				expect(customId.endsWith(`_${action}`)).toBe(true);
			}
		});
	});

	describe("buildProcessingButtons", () => {
		it("should return 2 action rows", () => {
			const buttons = buildProcessingButtons(
				"story1",
				"sess1",
				"Option A",
				"Option B",
				"choiceX",
				100,
			);
			expect(buttons.length).toBe(2);
		});

		it("should have all buttons disabled", () => {
			const buttons = buildProcessingButtons(
				"story1",
				"sess1",
				"Option A",
				"Option B",
				"choiceX",
				100,
			);

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const row2Json = buttons[1]?.toJSON() as ActionRowJson;

			for (const component of row1Json.components) {
				expect(component.disabled).toBe(true);
			}

			for (const component of row2Json.components) {
				expect(component.disabled).toBe(true);
			}
		});

		it("should show ⏳ prefix on clicked choiceX button", () => {
			const buttons = buildProcessingButtons(
				"story1",
				"sess1",
				"Utéct",
				"Schovat se",
				"choiceX",
				100,
			);

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const choiceXButton = row1Json.components[0];
			const choiceYButton = row1Json.components[1];

			expect(choiceXButton?.label).toBe("⏳ Utéct");
			expect(choiceYButton?.label).toBe("🎲 Schovat se");
		});

		it("should show ⏳ prefix on clicked choiceY button", () => {
			const buttons = buildProcessingButtons(
				"story1",
				"sess1",
				"Utéct",
				"Schovat se",
				"choiceY",
				100,
			);

			const row1Json = buttons[0]?.toJSON() as ActionRowJson;
			const choiceXButton = row1Json.components[0];
			const choiceYButton = row1Json.components[1];

			expect(choiceXButton?.label).toBe("🎲 Utéct");
			expect(choiceYButton?.label).toBe("⏳ Schovat se");
		});

		it("should show ⏳ prefix on clicked cancel button", () => {
			const buttons = buildProcessingButtons(
				"story1",
				"sess1",
				"A",
				"B",
				"cancel",
				100,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			const cancelButton = row2Json.components.find(
				(c) => c.custom_id?.includes("cancel")
			);

			expect(cancelButton?.label).toBe("⏳ Zrušit příběh");
		});

		it("should show ⏳ prefix on clicked keepBalance button", () => {
			const buttons = buildProcessingButtons(
				"story1",
				"sess1",
				"A",
				"B",
				"keepBalance",
				200,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			const keepBalanceButton = row2Json.components.find(
				(c) => c.custom_id?.includes("keepBalance")
			);

			expect(keepBalanceButton?.label).toBe("⏳ Ponechat (+200)");
		});

		it("should show negative coins correctly", () => {
			const buttons = buildProcessingButtons(
				"story1",
				"sess1",
				"A",
				"B",
				"choiceX",
				-150,
			);

			const row2Json = buttons[1]?.toJSON() as ActionRowJson;
			const keepBalanceButton = row2Json.components.find(
				(c) => c.custom_id?.includes("keepBalance")
			);

			expect(keepBalanceButton?.label).toBe("💰 Ponechat (-150)");
		});
	});

	describe("buildResumePromptButtons", () => {
		it("should return 1 action row", () => {
			const buttons = buildResumePromptButtons("session123");
			expect(buttons.length).toBe(1);
		});

		it("should have 2 buttons (resume and abandon)", () => {
			const buttons = buildResumePromptButtons("session123");
			const rowJson = buttons[0]?.toJSON() as ActionRowJson;
			expect(rowJson.components.length).toBe(2);
		});

		it("should have correct custom IDs for resume and abandon", () => {
			const buttons = buildResumePromptButtons("session123");
			const rowJson = buttons[0]?.toJSON() as ActionRowJson;

			const resumeButton = rowJson.components[0];
			const abandonButton = rowJson.components[1];

			expect(resumeButton?.custom_id).toBe("story_resume_session123");
			expect(abandonButton?.custom_id).toBe("story_abandon_session123");
		});

		it("should have resume button with ▶️ label", () => {
			const buttons = buildResumePromptButtons("session123");
			const rowJson = buttons[0]?.toJSON() as ActionRowJson;

			const resumeButton = rowJson.components[0];
			expect(resumeButton?.label).toContain("▶️");
			expect(resumeButton?.label).toContain("Pokračovat");
		});

		it("should have abandon button with ❌ label", () => {
			const buttons = buildResumePromptButtons("session123");
			const rowJson = buttons[0]?.toJSON() as ActionRowJson;

			const abandonButton = rowJson.components[1];
			expect(abandonButton?.label).toContain("❌");
			expect(abandonButton?.label).toContain("Začít nový");
		});

		it("should have buttons not disabled", () => {
			const buttons = buildResumePromptButtons("session123");
			const rowJson = buttons[0]?.toJSON() as ActionRowJson;

			for (const component of rowJson.components) {
				expect(component.disabled).toBe(false);
			}
		});
	});
});
