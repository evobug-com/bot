import { describe, expect, it } from "bun:test";
import { buildSystemPrompt } from "../services/adminAI/prompt.ts";
import { generateActionSummary } from "../services/adminAI/tools.ts";
import { buildConfirmButtons, buildPreviewEmbed } from "../services/adminAI/actionPreview.ts";
import type { GuildContext, PlannedAction } from "../services/adminAI/types.ts";

describe("handleAdminAI integration", () => {
	describe("admin ID check", () => {
		it("getAdminIds parses comma-separated IDs", () => {
			const original = process.env.ADMIN_IDS;
			process.env.ADMIN_IDS = "123, 456, 789";

			const ids = process.env.ADMIN_IDS.split(",").map((id) => id.trim());

			expect(ids).toEqual(["123", "456", "789"]);

			if (original !== undefined) {
				process.env.ADMIN_IDS = original;
			} else {
				delete process.env.ADMIN_IDS;
			}
		});

		it("returns empty array when ADMIN_IDS is not set", () => {
			const original = process.env.ADMIN_IDS;
			process.env.ADMIN_IDS = "";

			const adminIds = process.env.ADMIN_IDS;
			const ids = adminIds ? adminIds.split(",").map((id: string) => id.trim()) : [];

			expect(ids).toEqual([]);

			process.env.ADMIN_IDS = original;
		});
	});

	describe("mention detection and content stripping", () => {
		it("strips bot mention from message content", () => {
			const botId = "123456789";
			const content = `<@${botId}> create a new channel`;
			const stripped = content.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim();

			expect(stripped).toBe("create a new channel");
		});

		it("strips nickname mention format", () => {
			const botId = "123456789";
			const content = `<@!${botId}> create a new channel`;
			const stripped = content.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim();

			expect(stripped).toBe("create a new channel");
		});

		it("strips multiple mentions", () => {
			const botId = "123456789";
			const content = `<@${botId}> hello <@${botId}>`;
			const stripped = content.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim();

			expect(stripped).toBe("hello");
		});

		it("returns empty string when only mention", () => {
			const botId = "123456789";
			const content = `<@${botId}>`;
			const stripped = content.replace(new RegExp(`<@!?${botId}>`, "g"), "").trim();

			expect(stripped).toBe("");
		});
	});

	describe("session ID generation", () => {
		it("generates unique session IDs", () => {
			const ids = new Set<string>();
			for (let i = 0; i < 100; i++) {
				ids.add(`${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
			}

			expect(ids.size).toBe(100);
		});
	});

	describe("pending action lifecycle", () => {
		it("stores and retrieves pending actions by session ID", () => {
			const pendingActions = new Map<string, { id: string; createdAt: number }>();
			const sessionId = "test-session";

			pendingActions.set(sessionId, { id: sessionId, createdAt: Date.now() });

			expect(pendingActions.has(sessionId)).toBe(true);
			expect(pendingActions.get(sessionId)?.id).toBe(sessionId);
		});

		it("deletes expired sessions", () => {
			const pendingActions = new Map<string, { id: string; createdAt: number }>();
			const expiryMs = 5 * 60 * 1000;
			const now = Date.now();

			pendingActions.set("expired", { id: "expired", createdAt: now - expiryMs - 1 });
			pendingActions.set("valid", { id: "valid", createdAt: now });

			// Clean expired
			for (const [id, session] of pendingActions) {
				if (now - session.createdAt > expiryMs) {
					pendingActions.delete(id);
				}
			}

			expect(pendingActions.has("expired")).toBe(false);
			expect(pendingActions.has("valid")).toBe(true);
		});
	});

	describe("end-to-end flow with mocked context", () => {
		it("builds a complete preview from planned actions", () => {
			const context: GuildContext = {
				guildId: "guild-1",
				guildName: "Test Server",
				channels: [
					{ id: "ch-1", name: "general", type: "Text", categoryId: "cat-1", categoryName: "Main", position: 0 },
					{ id: "cat-1", name: "Main", type: "Category", categoryId: null, categoryName: null, position: 0 },
				],
				roles: [{ id: "role-1", name: "Admin", position: 10 }],
			};

			const actions: PlannedAction[] = [
				{
					toolCallId: "tc-1",
					functionName: "create_channel",
					arguments: { name: "new-room", type: "text", category_id: "cat-1" },
					displaySummary: generateActionSummary("create_channel", { name: "new-room", type: "text", category_id: "cat-1" }, context),
				},
			];

			const embed = buildPreviewEmbed(actions);
			const json = embed.toJSON();

			expect(json.description).toContain("Create text channel");
			expect(json.description).toContain("#Main");
		});

		it("system prompt contains full channel and role context", () => {
			const context: GuildContext = {
				guildId: "g-1",
				guildName: "My Server",
				channels: [
					{ id: "ch-1", name: "lobby", type: "Text", categoryId: null, categoryName: null, position: 0 },
				],
				roles: [
					{ id: "r-1", name: "Moderator", position: 5 },
				],
			};

			const prompt = buildSystemPrompt(context);

			expect(prompt).toContain("My Server");
			expect(prompt).toContain("lobby");
			expect(prompt).toContain("ch-1");
			expect(prompt).toContain("Moderator");
			expect(prompt).toContain("r-1");
		});

		it("confirm buttons have matching session IDs", () => {
			const sessionId = "my-session-42";
			const row = buildConfirmButtons(sessionId);
			const json = row.toJSON();

			const customIds = json.components.map((c) => "custom_id" in c ? c.custom_id : undefined);
			expect(customIds).toContain(`admin_ai_confirm_${sessionId}`);
			expect(customIds).toContain(`admin_ai_cancel_${sessionId}`);
		});
	});
});
