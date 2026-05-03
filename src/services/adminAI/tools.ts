import {
	AuditLogEvent,
	ChannelType,
	type Guild,
	type GuildChannel,
	PermissionFlagsBits,
	type PermissionResolvable,
} from "discord.js";
import type { ActionResult, GuildContext } from "./types.ts";
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
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

export const INFO_TOOLS: ReadonlySet<string> = new Set(["query_audit_log"]);

export const adminToolDefinitions: ChatCompletionFunctionTool[] = [
	{
		type: "function",
		function: {
			name: "create_channel",
			description: "Create a new text or voice channel in a category",
			parameters: {
				type: "object",
				properties: {
					name: { type: "string", description: "Channel name" },
					type: { type: "string", enum: ["text", "voice"], description: "Channel type" },
					category_id: { type: "string", description: "Category ID to create the channel in" },
					position: { type: "number", description: "Channel position within the category (optional)" },
				},
				required: ["name", "type", "category_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "set_channel_permission",
			description: "Set permission overwrites for a role or member on a channel",
			parameters: {
				type: "object",
				properties: {
					channel_id: { type: "string", description: "Channel ID" },
					target_id: { type: "string", description: "Role or member ID" },
					target_type: { type: "string", enum: ["role", "member"], description: "Whether target is a role or member" },
					allow: {
						type: "array",
						items: { type: "string" },
						description: "Permission names to allow (e.g. ViewChannel, SendMessages, Connect)",
					},
					deny: {
						type: "array",
						items: { type: "string" },
						description: "Permission names to deny (e.g. ViewChannel, SendMessages, Connect)",
					},
				},
				required: ["channel_id", "target_id", "target_type", "allow", "deny"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "move_channel",
			description: "Move a channel to a new position",
			parameters: {
				type: "object",
				properties: {
					channel_id: { type: "string", description: "Channel ID to move" },
					position: { type: "number", description: "New position for the channel" },
				},
				required: ["channel_id", "position"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "rename_channel",
			description: "Rename a channel",
			parameters: {
				type: "object",
				properties: {
					channel_id: { type: "string", description: "Channel ID to rename" },
					new_name: { type: "string", description: "New name for the channel" },
				},
				required: ["channel_id", "new_name"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "update_channel",
			description: "Update a channel's settings: topic/description, slowmode, NSFW, voice user limit, voice bitrate. Pass only the fields you want to change. At least one field is required.",
			parameters: {
				type: "object",
				properties: {
					channel_id: { type: "string", description: "Channel ID to update" },
					topic: {
						type: ["string", "null"],
						description: "Channel topic / description (text/announcement/forum). Max 1024 chars. Pass null to clear.",
					},
					slowmode_seconds: {
						type: "number",
						description: "Slowmode rate limit in seconds (0–21600, where 0 disables it). Text channels only.",
					},
					nsfw: { type: "boolean", description: "Mark channel as age-restricted." },
					user_limit: {
						type: "number",
						description: "Max users in a voice channel (0–99, where 0 means unlimited). Voice channels only.",
					},
					bitrate: {
						type: "number",
						description: "Voice channel bitrate in bits per second (8000–96000 default; up to 384000 with server boosts). Voice channels only.",
					},
				},
				required: ["channel_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "clone_channel",
			description: "Clone an existing channel — copies type, topic, slowmode, NSFW flag, and per-channel permission overwrites from the source. Use this when admin says 'follow current channels as example' or wants a new channel matching siblings.",
			parameters: {
				type: "object",
				properties: {
					source_channel_id: { type: "string", description: "ID of the channel to clone from" },
					new_name: { type: "string", description: "Name for the new channel" },
					position: { type: "number", description: "Position for the new channel (optional)" },
				},
				required: ["source_channel_id", "new_name"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "delete_channel",
			description: "Delete a channel permanently. DESTRUCTIVE — cannot be undone. Always explain what will be lost in your text response.",
			parameters: {
				type: "object",
				properties: {
					channel_id: { type: "string", description: "Channel ID to delete" },
				},
				required: ["channel_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "create_category",
			description: "Create a new category (top-level container for channels)",
			parameters: {
				type: "object",
				properties: {
					name: { type: "string", description: "Category name" },
					position: { type: "number", description: "Category position (optional)" },
				},
				required: ["name"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "assign_role",
			description: "Assign a role to a guild member",
			parameters: {
				type: "object",
				properties: {
					member_id: { type: "string", description: "Discord user ID of the member" },
					role_id: { type: "string", description: "ID of the role to assign" },
				},
				required: ["member_id", "role_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "remove_role",
			description: "Remove a role from a guild member",
			parameters: {
				type: "object",
				properties: {
					member_id: { type: "string", description: "Discord user ID of the member" },
					role_id: { type: "string", description: "ID of the role to remove" },
				},
				required: ["member_id", "role_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "query_audit_log",
			description: "READ-ONLY info tool: query Discord audit log to find who did what. Use to answer questions like 'kdo smazal #foo', 'kdo banoval @user', 'kdo vytvořil tu kategorii'. Executes immediately without confirmation. Call this FIRST in its own turn when you need historical context, then plan actions in the next turn.",
			parameters: {
				type: "object",
				properties: {
					action_types: {
						type: "array",
						items: { type: "string" },
						description: "Filter by Discord audit log event names (e.g. 'ChannelCreate', 'ChannelDelete', 'MemberKick', 'MemberBanAdd', 'RoleCreate', 'RoleDelete', 'MessageDelete'). Omit for all types.",
					},
					limit: { type: "number", description: "Max entries (1-50, default 20)" },
					target_id: { type: "string", description: "Filter by target ID (channel/user/role/etc.)" },
					user_id: { type: "string", description: "Filter by executor (who performed the action)" },
				},
				required: [],
			},
		},
	},
];

export const PERMISSION_MAP: Record<string, PermissionResolvable> = {
	ViewChannel: PermissionFlagsBits.ViewChannel,
	SendMessages: PermissionFlagsBits.SendMessages,
	Connect: PermissionFlagsBits.Connect,
	Speak: PermissionFlagsBits.Speak,
	ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
	ManageChannels: PermissionFlagsBits.ManageChannels,
	ManageMessages: PermissionFlagsBits.ManageMessages,
	MentionEveryone: PermissionFlagsBits.MentionEveryone,
	UseExternalEmojis: PermissionFlagsBits.UseExternalEmojis,
	AddReactions: PermissionFlagsBits.AddReactions,
	AttachFiles: PermissionFlagsBits.AttachFiles,
	EmbedLinks: PermissionFlagsBits.EmbedLinks,
	UseVAD: PermissionFlagsBits.UseVAD,
	Stream: PermissionFlagsBits.Stream,
	MuteMembers: PermissionFlagsBits.MuteMembers,
	DeafenMembers: PermissionFlagsBits.DeafenMembers,
	MoveMembers: PermissionFlagsBits.MoveMembers,
	ManageRoles: PermissionFlagsBits.ManageRoles,
	CreateInstantInvite: PermissionFlagsBits.CreateInstantInvite,
	SendTTSMessages: PermissionFlagsBits.SendTTSMessages,
	UseApplicationCommands: PermissionFlagsBits.UseApplicationCommands,
	ManageWebhooks: PermissionFlagsBits.ManageWebhooks,
	PrioritySpeaker: PermissionFlagsBits.PrioritySpeaker,
};

function resolvePermissions(names: string[]): Record<string, boolean> {
	const resolved: Record<string, boolean> = {};
	for (const name of names) {
		if (name in PERMISSION_MAP) {
			resolved[name] = true;
		}
	}
	return resolved;
}

async function executeCreateChannel(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = CreateChannelArgsSchema.parse(args);
	const channelType = parsed.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;

	let channel;
	if (parsed.category_id) {
		const category = guild.channels.cache.get(parsed.category_id);
		if (category?.type === ChannelType.GuildCategory) {
			channel = await category.children.create({
				name: parsed.name,
				type: channelType,
				position: parsed.position,
			});
		} else {
			channel = await guild.channels.create({
				name: parsed.name,
				type: channelType,
				position: parsed.position,
			});
		}
	} else {
		channel = await guild.channels.create({
			name: parsed.name,
			type: channelType,
			position: parsed.position,
		});
	}

	return {
		toolCallId: "",
		functionName: "create_channel",
		success: true,
		message: `Created ${parsed.type} channel "${channel.name}" (${channel.id})`,
	};
}

async function executeSetChannelPermission(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = SetChannelPermissionArgsSchema.parse(args);
	const channel = guild.channels.cache.get(parsed.channel_id) as GuildChannel | undefined;

	if (!channel) {
		return {
			toolCallId: "",
			functionName: "set_channel_permission",
			success: false,
			message: `Channel ${parsed.channel_id} not found`,
		};
	}

	const allowPerms = resolvePermissions(parsed.allow);
	const denyPerms: Record<string, boolean> = {};
	for (const name of parsed.deny) {
		if (name in PERMISSION_MAP) {
			denyPerms[name] = false;
		}
	}

	await channel.permissionOverwrites.edit(parsed.target_id, {
		...allowPerms,
		...denyPerms,
	});

	return {
		toolCallId: "",
		functionName: "set_channel_permission",
		success: true,
		message: `Set permissions on "${channel.name}" for ${parsed.target_type} ${parsed.target_id}`,
	};
}

async function executeMoveChannel(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = MoveChannelArgsSchema.parse(args);
	const channel = guild.channels.cache.get(parsed.channel_id) as GuildChannel | undefined;

	if (!channel) {
		return {
			toolCallId: "",
			functionName: "move_channel",
			success: false,
			message: `Channel ${parsed.channel_id} not found`,
		};
	}

	await channel.setPosition(parsed.position);

	return {
		toolCallId: "",
		functionName: "move_channel",
		success: true,
		message: `Moved "${channel.name}" to position ${parsed.position}`,
	};
}

async function executeRenameChannel(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = RenameChannelArgsSchema.parse(args);
	const channel = guild.channels.cache.get(parsed.channel_id) as GuildChannel | undefined;

	if (!channel) {
		return {
			toolCallId: "",
			functionName: "rename_channel",
			success: false,
			message: `Channel ${parsed.channel_id} not found`,
		};
	}

	const oldName = channel.name;
	await channel.setName(parsed.new_name);

	return {
		toolCallId: "",
		functionName: "rename_channel",
		success: true,
		message: `Renamed "${oldName}" to "${parsed.new_name}"`,
	};
}

async function executeUpdateChannel(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = UpdateChannelArgsSchema.parse(args);
	const channel = guild.channels.cache.get(parsed.channel_id) as GuildChannel | undefined;

	if (!channel) {
		return {
			toolCallId: "",
			functionName: "update_channel",
			success: false,
			message: `Channel ${parsed.channel_id} not found`,
		};
	}

	// Build edit payload — discord.js validates per-channel-type and rejects
	// fields that don't apply (e.g. bitrate on a text channel) so we let it.
	type EditPayload = {
		topic?: string | null;
		rateLimitPerUser?: number;
		nsfw?: boolean;
		userLimit?: number;
		bitrate?: number;
	};
	const edit: EditPayload = {};
	const changedFields: string[] = [];

	if (parsed.topic !== undefined) {
		edit.topic = parsed.topic;
		changedFields.push(`topic=${parsed.topic === null ? "(cleared)" : `"${parsed.topic.slice(0, 60)}${parsed.topic.length > 60 ? "…" : ""}"`}`);
	}
	if (parsed.slowmode_seconds !== undefined) {
		edit.rateLimitPerUser = parsed.slowmode_seconds;
		changedFields.push(`slowmode=${parsed.slowmode_seconds}s`);
	}
	if (parsed.nsfw !== undefined) {
		edit.nsfw = parsed.nsfw;
		changedFields.push(`nsfw=${parsed.nsfw}`);
	}
	if (parsed.user_limit !== undefined) {
		edit.userLimit = parsed.user_limit;
		changedFields.push(`user_limit=${parsed.user_limit}`);
	}
	if (parsed.bitrate !== undefined) {
		edit.bitrate = parsed.bitrate;
		changedFields.push(`bitrate=${parsed.bitrate}`);
	}

	// Type-safe call — discord.js GuildChannel.edit accepts a union; cast via
	// a narrow record so we don't import the full GuildChannelEditOptions type.
	await (channel as GuildChannel & { edit: (options: EditPayload) => Promise<unknown> }).edit(edit);

	return {
		toolCallId: "",
		functionName: "update_channel",
		success: true,
		message: `Updated "${channel.name}": ${changedFields.join(", ")}`,
	};
}

async function executeCloneChannel(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = CloneChannelArgsSchema.parse(args);
	const source = guild.channels.cache.get(parsed.source_channel_id);

	if (!source || !("clone" in source) || typeof source.clone !== "function") {
		return {
			toolCallId: "",
			functionName: "clone_channel",
			success: false,
			message: `Source channel ${parsed.source_channel_id} not found or not cloneable`,
		};
	}

	const cloned = await source.clone({ name: parsed.new_name });
	if (parsed.position !== undefined && "setPosition" in cloned) {
		await cloned.setPosition(parsed.position);
	}

	return {
		toolCallId: "",
		functionName: "clone_channel",
		success: true,
		message: `Cloned "${source.name}" to "${cloned.name}" (${cloned.id})`,
	};
}

async function executeDeleteChannel(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = DeleteChannelArgsSchema.parse(args);
	const channel = guild.channels.cache.get(parsed.channel_id) as GuildChannel | undefined;

	if (!channel) {
		return {
			toolCallId: "",
			functionName: "delete_channel",
			success: false,
			message: `Channel ${parsed.channel_id} not found`,
		};
	}

	const name = channel.name;
	await channel.delete();

	return {
		toolCallId: "",
		functionName: "delete_channel",
		success: true,
		message: `Deleted channel "${name}"`,
	};
}

async function executeCreateCategory(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = CreateCategoryArgsSchema.parse(args);

	const category = await guild.channels.create({
		name: parsed.name,
		type: ChannelType.GuildCategory,
		position: parsed.position,
	});

	return {
		toolCallId: "",
		functionName: "create_category",
		success: true,
		message: `Created category "${category.name}" (${category.id})`,
	};
}

async function executeAssignRole(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = AssignRoleArgsSchema.parse(args);
	const member = await guild.members.fetch(parsed.member_id).catch(() => null);

	if (!member) {
		return {
			toolCallId: "",
			functionName: "assign_role",
			success: false,
			message: `Member ${parsed.member_id} not found in this guild`,
		};
	}

	const role = guild.roles.cache.get(parsed.role_id);
	if (!role) {
		return {
			toolCallId: "",
			functionName: "assign_role",
			success: false,
			message: `Role ${parsed.role_id} not found`,
		};
	}

	await member.roles.add(role);

	return {
		toolCallId: "",
		functionName: "assign_role",
		success: true,
		message: `Assigned role "${role.name}" to ${member.user.tag}`,
	};
}

function resolveAuditLogEvent(name: string): AuditLogEvent | null {
	const value = (AuditLogEvent as Record<string, string | number>)[name];
	return typeof value === "number" ? (value as AuditLogEvent) : null;
}

function formatAuditLogTimestamp(ts: number): string {
	const d = new Date(ts);
	return d.toISOString().slice(0, 16).replace("T", " ");
}

async function executeQueryAuditLog(guild: Guild, args: Record<string, unknown>): Promise<string> {
	const parsed = QueryAuditLogArgsSchema.parse(args);

	const limit = parsed.limit ?? 20;
	// Discord's fetchAuditLogs accepts only ONE action type per call. To honor
	// multiple action_types correctly, fan out to one fetch per type and merge
	// the results client-side. Single-type and no-type cases use one fetch.
	const requestedTypes = parsed.action_types ?? [];
	const fetches: Promise<Array<import("discord.js").GuildAuditLogsEntry>>[] = [];

	if (requestedTypes.length === 0) {
		const opts: { limit: number; user?: string } = { limit };
		if (parsed.user_id) opts.user = parsed.user_id;
		fetches.push(
			guild.fetchAuditLogs(opts).then((logs) => [...logs.entries.values()]),
		);
	} else {
		for (const typeName of requestedTypes) {
			const typeFilter = resolveAuditLogEvent(typeName);
			if (typeFilter === null) continue; // skip unknown event names
			const opts: { limit: number; type: AuditLogEvent; user?: string } = { limit, type: typeFilter };
			if (parsed.user_id) opts.user = parsed.user_id;
			fetches.push(
				guild.fetchAuditLogs(opts).then((logs) => [...logs.entries.values()]),
			);
		}
		if (fetches.length === 0) {
			return `No valid action_types provided. Got: ${requestedTypes.join(", ")}.`;
		}
	}

	const results = await Promise.all(fetches);
	const seen = new Set<string>();
	let entries = results.flat().filter((e) => {
		if (seen.has(e.id)) return false;
		seen.add(e.id);
		return true;
	});

	if (parsed.target_id) {
		entries = entries.filter((e) => e.targetId === parsed.target_id);
	}

	// Sort newest first across the merged result set, then cap to limit
	entries.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
	entries = entries.slice(0, limit);

	if (entries.length === 0) {
		return "No audit log entries match the filter.";
	}

	const lines = entries.map((e) => {
		const ts = formatAuditLogTimestamp(e.createdTimestamp);
		const action = AuditLogEvent[e.action] ?? `Action#${e.action}`;
		const executor = e.executor ? `${e.executor.tag} (${e.executor.id})` : "unknown";
		const target = e.targetId ?? "n/a";
		const reason = e.reason ? ` - reason: ${e.reason}` : "";
		return `${ts} UTC | ${action} | by ${executor} | target: ${target}${reason}`;
	});

	return lines.join("\n");
}

export async function executeInfoTool(
	guild: Guild,
	functionName: string,
	args: Record<string, unknown>,
): Promise<string> {
	try {
		if (functionName === "query_audit_log") {
			return await executeQueryAuditLog(guild, args);
		}
		return `Unknown info tool: ${functionName}`;
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return `Error executing ${functionName}: ${errorMessage}`;
	}
}

async function executeRemoveRole(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = RemoveRoleArgsSchema.parse(args);
	const member = await guild.members.fetch(parsed.member_id).catch(() => null);

	if (!member) {
		return {
			toolCallId: "",
			functionName: "remove_role",
			success: false,
			message: `Member ${parsed.member_id} not found in this guild`,
		};
	}

	const role = guild.roles.cache.get(parsed.role_id);
	if (!role) {
		return {
			toolCallId: "",
			functionName: "remove_role",
			success: false,
			message: `Role ${parsed.role_id} not found`,
		};
	}

	await member.roles.remove(role);

	return {
		toolCallId: "",
		functionName: "remove_role",
		success: true,
		message: `Removed role "${role.name}" from ${member.user.tag}`,
	};
}

export async function executeToolCall(guild: Guild, functionName: string, args: Record<string, unknown>): Promise<ActionResult> {
	const executors: Record<string, (guild: Guild, args: Record<string, unknown>) => Promise<ActionResult>> = {
		create_channel: executeCreateChannel,
		update_channel: executeUpdateChannel,
		set_channel_permission: executeSetChannelPermission,
		move_channel: executeMoveChannel,
		rename_channel: executeRenameChannel,
		clone_channel: executeCloneChannel,
		delete_channel: executeDeleteChannel,
		create_category: executeCreateCategory,
		assign_role: executeAssignRole,
		remove_role: executeRemoveRole,
	};

	const executor = executors[functionName];
	if (!executor) {
		return {
			toolCallId: "",
			functionName,
			success: false,
			message: `Unknown tool: ${functionName}`,
		};
	}

	try {
		return await executor(guild, args);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			toolCallId: "",
			functionName,
			success: false,
			message: `Error: ${errorMessage}`,
		};
	}
}

export function generateActionSummary(functionName: string, args: Record<string, unknown>, guildContext: GuildContext): string {
	const resolveChannelName = (id: string) => {
		const ch = guildContext.channels.find((c) => c.id === id);
		return ch ? `#${ch.name}` : `<#${id}>`;
	};

	const resolveTargetName = (id: string, type: string) => {
		if (type === "role") {
			const role = guildContext.roles.find((r) => r.id === id);
			return role ? `@${role.name}` : `<@&${id}>`;
		}
		return `<@${id}>`;
	};

	switch (functionName) {
		case "create_channel": {
			const a = args as { name: string; type: string; category_id: string; position?: number };
			const categoryName = resolveChannelName(a.category_id);
			const posStr = a.position !== undefined ? ` at position ${a.position}` : "";
			return `Create ${a.type} channel "${a.name}" in ${categoryName}${posStr}`;
		}
		case "set_channel_permission": {
			const a = args as { channel_id: string; target_id: string; target_type: string; allow: string[]; deny: string[] };
			const chName = resolveChannelName(a.channel_id);
			const target = resolveTargetName(a.target_id, a.target_type);
			const parts: string[] = [];
			if (a.allow.length > 0) parts.push(`allow: ${a.allow.join(", ")}`);
			if (a.deny.length > 0) parts.push(`deny: ${a.deny.join(", ")}`);
			return `Set permissions on ${chName} for ${target} (${parts.join("; ")})`;
		}
		case "move_channel": {
			const a = args as { channel_id: string; position: number };
			return `Move ${resolveChannelName(a.channel_id)} to position ${a.position}`;
		}
		case "rename_channel": {
			const a = args as { channel_id: string; new_name: string };
			return `Rename ${resolveChannelName(a.channel_id)} to "${a.new_name}"`;
		}
		case "clone_channel": {
			const a = args as { source_channel_id: string; new_name: string; position?: number };
			const posStr = a.position !== undefined ? ` at position ${a.position}` : "";
			return `Clone ${resolveChannelName(a.source_channel_id)} as "${a.new_name}"${posStr}`;
		}
		case "update_channel": {
			const a = args as {
				channel_id: string;
				topic?: string | null;
				slowmode_seconds?: number;
				nsfw?: boolean;
				user_limit?: number;
				bitrate?: number;
			};
			const parts: string[] = [];
			if (a.topic !== undefined) {
				parts.push(`topic=${a.topic === null ? "(cleared)" : `"${a.topic.slice(0, 60)}${a.topic.length > 60 ? "…" : ""}"`}`);
			}
			if (a.slowmode_seconds !== undefined) parts.push(`slowmode=${a.slowmode_seconds}s`);
			if (a.nsfw !== undefined) parts.push(`nsfw=${a.nsfw}`);
			if (a.user_limit !== undefined) parts.push(`user_limit=${a.user_limit}`);
			if (a.bitrate !== undefined) parts.push(`bitrate=${a.bitrate}`);
			return `Update ${resolveChannelName(a.channel_id)}: ${parts.join(", ")}`;
		}
		case "delete_channel": {
			const a = args as { channel_id: string };
			return `⚠️ DELETE ${resolveChannelName(a.channel_id)} (irreversible)`;
		}
		case "create_category": {
			const a = args as { name: string; position?: number };
			const posStr = a.position !== undefined ? ` at position ${a.position}` : "";
			return `Create category "${a.name}"${posStr}`;
		}
		case "assign_role": {
			const a = args as { member_id: string; role_id: string };
			const role = guildContext.roles.find((r) => r.id === a.role_id);
			const roleStr = role ? `@${role.name}` : `<@&${a.role_id}>`;
			return `Assign ${roleStr} to <@${a.member_id}>`;
		}
		case "remove_role": {
			const a = args as { member_id: string; role_id: string };
			const role = guildContext.roles.find((r) => r.id === a.role_id);
			const roleStr = role ? `@${role.name}` : `<@&${a.role_id}>`;
			return `Remove ${roleStr} from <@${a.member_id}>`;
		}
		default:
			return `Unknown action: ${functionName}`;
	}
}
