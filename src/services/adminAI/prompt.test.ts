import { describe, expect, it } from "bun:test";
import { buildSystemPrompt } from "./prompt.ts";
import type { GuildContext } from "./types.ts";

const testContext: GuildContext = {
	guildId: "guild-123",
	guildName: "Test Server",
	channels: [
		{ id: "ch-1", name: "general", type: "Text", categoryId: "cat-1", categoryName: "Main", position: 0 },
		{ id: "cat-1", name: "Main", type: "Category", categoryId: null, categoryName: null, position: 0 },
		{ id: "vc-1", name: "Voice Room", type: "Voice", categoryId: "cat-1", categoryName: "Main", position: 1 },
	],
	roles: [
		{ id: "role-1", name: "Admin", position: 10 },
		{ id: "role-2", name: "Member", position: 1 },
	],
};

describe("buildSystemPrompt", () => {
	it("includes the guild name", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain("Test Server");
	});

	it("includes the guild id", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain("guild-123");
	});

	it("includes channel names and IDs", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain('"general"');
		expect(prompt).toContain("ch-1");
		expect(prompt).toContain('"Voice Room"');
		expect(prompt).toContain("vc-1");
	});

	it("includes channel types", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain("Text:");
		expect(prompt).toContain("Voice:");
		expect(prompt).toContain("Category:");
	});

	it("includes role names and IDs", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain('"Admin"');
		expect(prompt).toContain("role-1");
		expect(prompt).toContain('"Member"');
		expect(prompt).toContain("role-2");
	});

	it("includes instruction to not guess IDs", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain("NEVER guess");
	});

	it("includes instruction to respond in Czech", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain("Czech");
	});

	it("includes category info for channels", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain("[category: Main]");
	});

	it("includes position info", () => {
		const prompt = buildSystemPrompt(testContext);

		expect(prompt).toContain("position: 0");
		expect(prompt).toContain("position: 1");
	});
});
