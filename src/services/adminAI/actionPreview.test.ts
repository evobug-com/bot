import { describe, expect, it } from "bun:test";
import { buildCancelledEmbed, buildConfirmButtons, buildPreviewEmbed, buildResultEmbed } from "./actionPreview.ts";
import type { ActionResult, PlannedAction } from "./types.ts";

const testActions: PlannedAction[] = [
	{
		toolCallId: "tc-1",
		functionName: "create_channel",
		arguments: { name: "test", type: "text", category_id: "cat-1" },
		displaySummary: 'Create text channel "test" in #Main',
	},
	{
		toolCallId: "tc-2",
		functionName: "rename_channel",
		arguments: { channel_id: "ch-1", new_name: "renamed" },
		displaySummary: 'Rename #general to "renamed"',
	},
];

describe("buildPreviewEmbed", () => {
	it("creates embed with yellow color", () => {
		const embed = buildPreviewEmbed(testActions);
		const json = embed.toJSON();

		expect(json.color).toBe(0xfee75c);
	});

	it("includes numbered action summaries in description", () => {
		const embed = buildPreviewEmbed(testActions);
		const json = embed.toJSON();

		expect(json.description).toContain("1. Create text channel");
		expect(json.description).toContain("2. Rename #general");
	});

	it("includes AI message as field when provided", () => {
		const embed = buildPreviewEmbed(testActions, "Tady je plan.");
		const json = embed.toJSON();

		const field = json.fields?.find((f) => f.name === "AI zprava");
		expect(field).toBeDefined();
		expect(field?.value).toBe("Tady je plan.");
	});

	it("does not include AI message field when not provided", () => {
		const embed = buildPreviewEmbed(testActions);
		const json = embed.toJSON();

		expect(json.fields?.find((f) => f.name === "AI zprava")).toBeUndefined();
	});

	it("has a title", () => {
		const embed = buildPreviewEmbed(testActions);
		const json = embed.toJSON();

		expect(json.title).toContain("Admin AI");
	});
});

describe("buildConfirmButtons", () => {
	it("creates action row with confirm and cancel buttons", () => {
		const row = buildConfirmButtons("session-123");
		const json = row.toJSON();

		expect(json.components).toHaveLength(2);
	});

	it("uses correct custom IDs with session ID", () => {
		const row = buildConfirmButtons("session-abc");
		const json = row.toJSON();

		const customIds = json.components.map((c) => "custom_id" in c ? c.custom_id : undefined);
		expect(customIds).toContain("admin_ai_confirm_session-abc");
		expect(customIds).toContain("admin_ai_cancel_session-abc");
	});
});

describe("buildResultEmbed", () => {
	it("shows green color when all actions succeed", () => {
		const results: ActionResult[] = [
			{ toolCallId: "tc-1", functionName: "create_channel", success: true, message: "Created" },
			{ toolCallId: "tc-2", functionName: "rename_channel", success: true, message: "Renamed" },
		];

		const embed = buildResultEmbed(results);
		const json = embed.toJSON();

		expect(json.color).toBe(0x57f287);
	});

	it("shows red color when all actions fail", () => {
		const results: ActionResult[] = [
			{ toolCallId: "tc-1", functionName: "create_channel", success: false, message: "Error" },
			{ toolCallId: "tc-2", functionName: "rename_channel", success: false, message: "Error" },
		];

		const embed = buildResultEmbed(results);
		const json = embed.toJSON();

		expect(json.color).toBe(0xed4245);
	});

	it("shows orange color for partial success", () => {
		const results: ActionResult[] = [
			{ toolCallId: "tc-1", functionName: "create_channel", success: true, message: "Created" },
			{ toolCallId: "tc-2", functionName: "rename_channel", success: false, message: "Error" },
		];

		const embed = buildResultEmbed(results);
		const json = embed.toJSON();

		expect(json.color).toBe(0xffa500);
	});

	it("includes success/total count in title", () => {
		const results: ActionResult[] = [
			{ toolCallId: "tc-1", functionName: "create_channel", success: true, message: "Created" },
			{ toolCallId: "tc-2", functionName: "rename_channel", success: false, message: "Error" },
		];

		const embed = buildResultEmbed(results);
		const json = embed.toJSON();

		expect(json.title).toContain("1/2");
	});

	it("includes result messages with icons", () => {
		const results: ActionResult[] = [
			{ toolCallId: "tc-1", functionName: "create_channel", success: true, message: "Channel created" },
			{ toolCallId: "tc-2", functionName: "rename_channel", success: false, message: "Not found" },
		];

		const embed = buildResultEmbed(results);
		const json = embed.toJSON();

		expect(json.description).toContain("Channel created");
		expect(json.description).toContain("Not found");
	});
});

describe("buildCancelledEmbed", () => {
	it("creates embed with grey color", () => {
		const embed = buildCancelledEmbed();
		const json = embed.toJSON();

		expect(json.color).toBe(0x95a5a6);
	});

	it("has cancelled title", () => {
		const embed = buildCancelledEmbed();
		const json = embed.toJSON();

		expect(json.title).toContain("Zruseno");
	});
});
