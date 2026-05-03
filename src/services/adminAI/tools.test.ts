import { describe, expect, it } from "bun:test";
import {
	adminToolDefinitions,
	generateActionSummary,
	INFO_TOOLS,
	PERMISSION_MAP,
} from "./tools.ts";
import {
	AssignRoleArgsSchema,
	CloneChannelArgsSchema,
	CreateCategoryArgsSchema,
	CreateChannelArgsSchema,
	DeleteChannelArgsSchema,
	MoveChannelArgsSchema,
	QueryAuditLogArgsSchema,
	RemoveRoleArgsSchema,
	RenameChannelArgsSchema,
	SetChannelPermissionArgsSchema,
	UpdateChannelArgsSchema,
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
	it("has 10 tool definitions", () => {
		expect(adminToolDefinitions).toHaveLength(11);
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

	it("includes clone_channel tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "clone_channel");
		expect(tool).toBeDefined();
	});

	it("includes delete_channel tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "delete_channel");
		expect(tool).toBeDefined();
	});

	it("includes create_category tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "create_category");
		expect(tool).toBeDefined();
	});

	it("includes assign_role tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "assign_role");
		expect(tool).toBeDefined();
	});

	it("includes remove_role tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "remove_role");
		expect(tool).toBeDefined();
	});

	it("includes query_audit_log tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "query_audit_log");
		expect(tool).toBeDefined();
	});

	it("includes update_channel tool", () => {
		const tool = adminToolDefinitions.find((t) => t.function.name === "update_channel");
		expect(tool).toBeDefined();
	});
});

describe("INFO_TOOLS", () => {
	it("contains query_audit_log", () => {
		expect(INFO_TOOLS.has("query_audit_log")).toBe(true);
	});

	it("does not contain action tools", () => {
		expect(INFO_TOOLS.has("create_channel")).toBe(false);
		expect(INFO_TOOLS.has("delete_channel")).toBe(false);
		expect(INFO_TOOLS.has("assign_role")).toBe(false);
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

	describe("CloneChannelArgsSchema", () => {
		it("accepts valid args", () => {
			const result = CloneChannelArgsSchema.safeParse({
				source_channel_id: "ch-1",
				new_name: "tiskar",
			});
			expect(result.success).toBe(true);
		});

		it("accepts optional position", () => {
			const result = CloneChannelArgsSchema.safeParse({
				source_channel_id: "ch-1",
				new_name: "tiskar",
				position: 5,
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing source_channel_id", () => {
			const result = CloneChannelArgsSchema.safeParse({ new_name: "tiskar" });
			expect(result.success).toBe(false);
		});
	});

	describe("DeleteChannelArgsSchema", () => {
		it("accepts valid args", () => {
			const result = DeleteChannelArgsSchema.safeParse({ channel_id: "ch-1" });
			expect(result.success).toBe(true);
		});

		it("rejects missing channel_id", () => {
			const result = DeleteChannelArgsSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("CreateCategoryArgsSchema", () => {
		it("accepts valid args", () => {
			const result = CreateCategoryArgsSchema.safeParse({ name: "Public" });
			expect(result.success).toBe(true);
		});

		it("accepts optional position", () => {
			const result = CreateCategoryArgsSchema.safeParse({ name: "Public", position: 0 });
			expect(result.success).toBe(true);
		});

		it("rejects missing name", () => {
			const result = CreateCategoryArgsSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe("AssignRoleArgsSchema", () => {
		it("accepts valid args", () => {
			const result = AssignRoleArgsSchema.safeParse({
				member_id: "user-1",
				role_id: "role-1",
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing role_id", () => {
			const result = AssignRoleArgsSchema.safeParse({ member_id: "user-1" });
			expect(result.success).toBe(false);
		});
	});

	describe("RemoveRoleArgsSchema", () => {
		it("accepts valid args", () => {
			const result = RemoveRoleArgsSchema.safeParse({
				member_id: "user-1",
				role_id: "role-1",
			});
			expect(result.success).toBe(true);
		});

		it("rejects missing member_id", () => {
			const result = RemoveRoleArgsSchema.safeParse({ role_id: "role-1" });
			expect(result.success).toBe(false);
		});
	});

	describe("QueryAuditLogArgsSchema", () => {
		it("accepts empty args (no filters)", () => {
			const result = QueryAuditLogArgsSchema.safeParse({});
			expect(result.success).toBe(true);
		});

		it("accepts all optional fields", () => {
			const result = QueryAuditLogArgsSchema.safeParse({
				action_types: ["ChannelDelete"],
				limit: 10,
				target_id: "ch-1",
				user_id: "user-1",
			});
			expect(result.success).toBe(true);
		});

		it("rejects limit above 50", () => {
			const result = QueryAuditLogArgsSchema.safeParse({ limit: 100 });
			expect(result.success).toBe(false);
		});

		it("rejects limit below 1", () => {
			const result = QueryAuditLogArgsSchema.safeParse({ limit: 0 });
			expect(result.success).toBe(false);
		});
	});

	describe("UpdateChannelArgsSchema", () => {
		it("accepts topic-only update", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				topic: "New description",
			});
			expect(result.success).toBe(true);
		});

		it("accepts slowmode-only update", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				slowmode_seconds: 300,
			});
			expect(result.success).toBe(true);
		});

		it("accepts topic=null to clear it", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				topic: null,
			});
			expect(result.success).toBe(true);
		});

		it("accepts multiple fields together", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				topic: "Voice room",
				user_limit: 10,
				bitrate: 64000,
			});
			expect(result.success).toBe(true);
		});

		it("rejects when no update fields are provided", () => {
			const result = UpdateChannelArgsSchema.safeParse({ channel_id: "ch-1" });
			expect(result.success).toBe(false);
		});

		it("rejects slowmode above 21600 (Discord max)", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				slowmode_seconds: 30000,
			});
			expect(result.success).toBe(false);
		});

		it("rejects negative slowmode", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				slowmode_seconds: -1,
			});
			expect(result.success).toBe(false);
		});

		it("rejects user_limit above 99 (Discord max)", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				user_limit: 200,
			});
			expect(result.success).toBe(false);
		});

		it("rejects topic over 1024 chars", () => {
			const result = UpdateChannelArgsSchema.safeParse({
				channel_id: "ch-1",
				topic: "a".repeat(1025),
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

	it("summarizes clone_channel action", () => {
		const summary = generateActionSummary(
			"clone_channel",
			{ source_channel_id: "ch-1", new_name: "tiskar" },
			testContext,
		);

		expect(summary).toContain("Clone");
		expect(summary).toContain("#general");
		expect(summary).toContain('"tiskar"');
	});

	it("summarizes delete_channel action with destructive marker", () => {
		const summary = generateActionSummary(
			"delete_channel",
			{ channel_id: "ch-1" },
			testContext,
		);

		expect(summary).toContain("DELETE");
		expect(summary).toContain("irreversible");
		expect(summary).toContain("#general");
	});

	it("summarizes create_category action", () => {
		const summary = generateActionSummary(
			"create_category",
			{ name: "New Cat" },
			testContext,
		);

		expect(summary).toContain("Create category");
		expect(summary).toContain('"New Cat"');
	});

	it("summarizes assign_role action with known role", () => {
		const summary = generateActionSummary(
			"assign_role",
			{ member_id: "user-1", role_id: "role-1" },
			testContext,
		);

		expect(summary).toContain("Assign");
		expect(summary).toContain("@Admin");
		expect(summary).toContain("<@user-1>");
	});

	it("summarizes remove_role action", () => {
		const summary = generateActionSummary(
			"remove_role",
			{ member_id: "user-1", role_id: "role-2" },
			testContext,
		);

		expect(summary).toContain("Remove");
		expect(summary).toContain("@Member");
		expect(summary).toContain("<@user-1>");
	});

	it("summarizes update_channel topic+slowmode", () => {
		const summary = generateActionSummary(
			"update_channel",
			{ channel_id: "ch-1", topic: "New desc", slowmode_seconds: 60 },
			testContext,
		);

		expect(summary).toContain("Update");
		expect(summary).toContain("#general");
		expect(summary).toContain('topic="New desc"');
		expect(summary).toContain("slowmode=60s");
	});

	it("summarizes update_channel topic cleared (null)", () => {
		const summary = generateActionSummary(
			"update_channel",
			{ channel_id: "ch-1", topic: null },
			testContext,
		);

		expect(summary).toContain("topic=(cleared)");
	});

	it("summarizes update_channel voice fields", () => {
		const summary = generateActionSummary(
			"update_channel",
			{ channel_id: "ch-1", user_limit: 5, bitrate: 64000, nsfw: true },
			testContext,
		);

		expect(summary).toContain("user_limit=5");
		expect(summary).toContain("bitrate=64000");
		expect(summary).toContain("nsfw=true");
	});
});
