import { describe, expect, it } from "bun:test";
import {
	adminToolDefinitions,
	generateActionSummary,
	PERMISSION_MAP,
} from "./tools.ts";
import {
	CreateChannelArgsSchema,
	MoveChannelArgsSchema,
	RenameChannelArgsSchema,
	SetChannelPermissionArgsSchema,
} from "./types.ts";
import type { GuildContext } from "./types.ts";

const testContext: GuildContext = {
	guildId: "guild-1",
	guildName: "Test",
	channels: [
		{ id: "ch-1", name: "general", type: "Text", categoryId: "cat-1", categoryName: "Main", position: 0 },
		{ id: "cat-1", name: "Main", type: "Category", categoryId: null, categoryName: null, position: 0 },
	],
	roles: [
		{ id: "role-1", name: "Admin", position: 10 },
		{ id: "role-2", name: "Member", position: 1 },
	],
};

describe("adminToolDefinitions", () => {
	it("has 4 tool definitions", () => {
		expect(adminToolDefinitions).toHaveLength(4);
	});

	it("all tools have type function", () => {
		for (const tool of adminToolDefinitions) {
			expect(tool.type).toBe("function");
		}
	});

	it("all tools have a name and description", () => {
		for (const tool of adminToolDefinitions) {
			expect(tool.function.name).toBeTruthy();
			expect(tool.function.description).toBeTruthy();
		}
	});

	it("includes create_channel tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "create_channel");
		expect(tool).toBeDefined();
	});

	it("includes set_channel_permission tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "set_channel_permission");
		expect(tool).toBeDefined();
	});

	it("includes move_channel tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "move_channel");
		expect(tool).toBeDefined();
	});

	it("includes rename_channel tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "rename_channel");
		expect(tool).toBeDefined();
	});
});

describe("Zod schemas", () => {
	describe("CreateChannelArgsSchema", () => {
		it("accepts valid args", () => {
			const result = CreateChannelArgsSchema.safeParse({
				name: "test-channel",
				type: "text",
				category_id: "cat-1",
			});
			expect(result.success).toBe(true);
		});

		it("accepts args with optional position", () => {
			const result = CreateChannelArgsSchema.safeParse({
				name: "test-channel",
				type: "voice",
				category_id: "cat-1",
				position: 5,
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid type", () => {
			const result = CreateChannelArgsSchema.safeParse({
				name: "test-channel",
				type: "forum",
				category_id: "cat-1",
			});
			expect(result.success).toBe(false);
		});

		it("rejects missing name", () => {
			const result = CreateChannelArgsSchema.safeParse({
				type: "text",
				category_id: "cat-1",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("SetChannelPermissionArgsSchema", () => {
		it("accepts valid args", () => {
			const result = SetChannelPermissionArgsSchema.safeParse({
				channel_id: "ch-1",
				target_id: "role-1",
				target_type: "role",
				allow: ["ViewChannel"],
				deny: ["SendMessages"],
			});
			expect(result.success).toBe(true);
		});

		it("accepts empty allow/deny arrays", () => {
			const result = SetChannelPermissionArgsSchema.safeParse({
				channel_id: "ch-1",
				target_id: "role-1",
				target_type: "member",
				allow: [],
				deny: [],
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid target_type", () => {
			const result = SetChannelPermissionArgsSchema.safeParse({
				channel_id: "ch-1",
				target_id: "role-1",
				target_type: "channel",
				allow: [],
				deny: [],
			});
			expect(result.success).toBe(false);
		});
	});

	describe("MoveChannelArgsSchema", () => {
		it("accepts valid args", () => {
			const result = MoveChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				position: 3,
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing position", () => {
			const result = MoveChannelArgsSchema.safeParse({
				channel_id: "ch-1",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("RenameChannelArgsSchema", () => {
		it("accepts valid args", () => {
			const result = RenameChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				new_name: "new-name",
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing new_name", () => {
			const result = RenameChannelArgsSchema.safeParse({
				channel_id: "ch-1",
			});
			expect(result.success).toBe(false);
		});
	});
});

describe("PERMISSION_MAP", () => {
	it("contains ViewChannel", () => {
		expect(PERMISSION_MAP.ViewChannel).toBeDefined();
	});

	it("contains SendMessages", () => {
		expect(PERMISSION_MAP.SendMessages).toBeDefined();
	});

	it("contains Connect", () => {
		expect(PERMISSION_MAP.Connect).toBeDefined();
	});

	it("contains Speak", () => {
		expect(PERMISSION_MAP.Speak).toBeDefined();
	});

	it("contains ManageChannels", () => {
		expect(PERMISSION_MAP.ManageChannels).toBeDefined();
	});

	it("has at least 15 permission entries", () => {
		expect(Object.keys(PERMISSION_MAP).length).toBeGreaterThanOrEqual(15);
	});
});

describe("generateActionSummary", () => {
	it("summarizes create_channel action", () => {
		const summary = generateActionSummary(
			"create_channel",
			{ name: "new-room", type: "text", category_id: "cat-1" },
			testContext,
		);

		expect(summary).toContain("Create text channel");
		expect(summary).toContain('"new-room"');
		expect(summary).toContain("#Main");
	});

	it("summarizes create_channel with position", () => {
		const summary = generateActionSummary(
			"create_channel",
			{ name: "new-room", type: "voice", category_id: "cat-1", position: 3 },
			testContext,
		);

		expect(summary).toContain("voice");
		expect(summary).toContain("position 3");
	});

	it("summarizes set_channel_permission action with role", () => {
		const summary = generateActionSummary(
			"set_channel_permission",
			{ channel_id: "ch-1", target_id: "role-1", target_type: "role", allow: ["ViewChannel"], deny: ["SendMessages"] },
			testContext,
		);

		expect(summary).toContain("#general");
		expect(summary).toContain("@Admin");
		expect(summary).toContain("allow: ViewChannel");
		expect(summary).toContain("deny: SendMessages");
	});

	it("summarizes move_channel action", () => {
		const summary = generateActionSummary(
			"move_channel",
			{ channel_id: "ch-1", position: 5 },
			testContext,
		);

		expect(summary).toContain("#general");
		expect(summary).toContain("position 5");
	});

	it("summarizes rename_channel action", () => {
		const summary = generateActionSummary(
			"rename_channel",
			{ channel_id: "ch-1", new_name: "announcements" },
			testContext,
		);

		expect(summary).toContain("#general");
		expect(summary).toContain('"announcements"');
	});

	it("handles unknown channel ID gracefully", () => {
		const summary = generateActionSummary(
			"rename_channel",
			{ channel_id: "unknown-id", new_name: "test" },
			testContext,
		);

		expect(summary).toContain("<#unknown-id>");
	});

	it("handles unknown function name", () => {
		const summary = generateActionSummary("unknown_tool", {}, testContext);

		expect(summary).toContain("Unknown action");
	});
});
