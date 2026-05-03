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
	AddForumChannelTagArgsSchema,
	ApplyForumTagsArgsSchema,
	AssignRoleArgsSchema,
	CloneChannelArgsSchema,
	CloseThreadArgsSchema,
	CreateCategoryArgsSchema,
	CreateChannelArgsSchema,
	DeleteChannelArgsSchema,
	ListForumThreadsArgsSchema,
	LockThreadArgsSchema,
	MoveChannelArgsSchema,
	QueryAuditLogArgsSchema,
	RemoveForumChannelTagArgsSchema,
	RemoveRoleArgsSchema,
	RenameChannelArgsSchema,
	ReopenThreadArgsSchema,
	SetChannelPermissionArgsSchema,
	UnlockThreadArgsSchema,
} from "./types.ts";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

export const INFO_TOOLS: ReadonlySet<string> = new Set(["query_audit_log", "list_forum_threads"]);

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
	{
		type: "function",
		function: {
			name: "apply_forum_tags",
			description: "Replace the set of tags applied to a forum post (thread). Pass the FULL desired set of tag IDs — anything not in the list is removed. Tag IDs come from the forum channel's `forumTags` list in the context above.",
			parameters: {
				type: "object",
				properties: {
					thread_id: { type: "string", description: "ID of the forum post / thread to retag" },
					tag_ids: {
						type: "array",
						items: { type: "string" },
						description: "Full new set of tag IDs (max 5 per Discord). Pass [] to clear all tags.",
					},
				},
				required: ["thread_id", "tag_ids"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "add_forum_channel_tag",
			description: "Add a NEW tag to a forum channel's `availableTags` list (so it can later be applied to threads). For applying an existing tag to a single thread, use apply_forum_tags instead.",
			parameters: {
				type: "object",
				properties: {
					forum_channel_id: { type: "string", description: "ID of the forum channel" },
					name: { type: "string", description: "Tag name (1-20 chars)" },
					emoji_unicode: { type: "string", description: "Optional unicode emoji (e.g. '🔥', '✅'). Single codepoint." },
					moderated: { type: "boolean", description: "If true, only mods can apply this tag. Default false." },
				},
				required: ["forum_channel_id", "name"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "remove_forum_channel_tag",
			description: "Remove a tag from a forum channel's `availableTags`. Threads currently tagged with it lose the tag.",
			parameters: {
				type: "object",
				properties: {
					forum_channel_id: { type: "string", description: "ID of the forum channel" },
					tag_id: { type: "string", description: "ID of the tag to remove" },
				},
				required: ["forum_channel_id", "tag_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "close_thread",
			description: "Close (archive) a thread or forum post. Optionally lock it at the same time so members can't reopen by replying. Use lock=true for spam/resolved/permanently-closed posts.",
			parameters: {
				type: "object",
				properties: {
					thread_id: { type: "string", description: "ID of the thread / forum post to close" },
					lock: { type: "boolean", description: "Also lock the thread. Default false." },
					reason: { type: "string", description: "Audit-log reason (max 512 chars)." },
				},
				required: ["thread_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "reopen_thread",
			description: "Reopen (unarchive) a closed thread or forum post. Optionally also unlock it.",
			parameters: {
				type: "object",
				properties: {
					thread_id: { type: "string", description: "ID of the thread / forum post to reopen" },
					unlock: { type: "boolean", description: "Also unlock the thread. Default false." },
				},
				required: ["thread_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "lock_thread",
			description: "Lock a thread (members can't post new messages) without archiving it.",
			parameters: {
				type: "object",
				properties: {
					thread_id: { type: "string", description: "ID of the thread / forum post to lock" },
					reason: { type: "string", description: "Audit-log reason (max 512 chars)." },
				},
				required: ["thread_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "unlock_thread",
			description: "Unlock a previously locked thread.",
			parameters: {
				type: "object",
				properties: {
					thread_id: { type: "string", description: "ID of the thread to unlock" },
				},
				required: ["thread_id"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "list_forum_threads",
			description: "READ-ONLY info tool: list threads (posts) in a forum channel. Returns thread name, id, applied tag ids, archived/locked state. Use when admin refers to a post by name and you need its id, or when you need to enumerate all posts before acting.",
			parameters: {
				type: "object",
				properties: {
					forum_channel_id: { type: "string", description: "ID of the forum channel" },
					include_archived: { type: "boolean", description: "Also fetch archived (closed) threads. Default false." },
					limit: { type: "number", description: "Max threads to return (1-100, default 30)" },
				},
				required: ["forum_channel_id"],
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

async function executeListForumThreads(guild: Guild, args: Record<string, unknown>): Promise<string> {
	const parsed = ListForumThreadsArgsSchema.parse(args);
	const channel = guild.channels.cache.get(parsed.forum_channel_id);

	if (!channel) {
		return `Forum channel ${parsed.forum_channel_id} not found.`;
	}
	if (channel.type !== ChannelType.GuildForum && channel.type !== ChannelType.GuildMedia) {
		return `Channel "${channel.name}" (${parsed.forum_channel_id}) is not a forum/media channel.`;
	}

	type ThreadFetchTarget = {
		threads: {
			fetchActive: () => Promise<{ threads: Map<string, unknown> }>;
			fetchArchived?: (options: { type?: "public"; limit?: number }) => Promise<{ threads: Map<string, unknown> }>;
		};
	};
	const forum = channel as unknown as ThreadFetchTarget;
	const limit = parsed.limit ?? 30;

	const active = await forum.threads.fetchActive();
	const collected: Array<{ id: string; name: string; archived: boolean; locked: boolean; appliedTags: string[] }> = [];
	type ThreadShape = {
		id: string;
		name: string;
		archived?: boolean | null;
		locked?: boolean | null;
		appliedTags?: string[] | null;
	};
	for (const t of active.threads.values()) {
		const th = t as ThreadShape;
		collected.push({
			id: th.id,
			name: th.name,
			archived: Boolean(th.archived),
			locked: Boolean(th.locked),
			appliedTags: th.appliedTags ?? [],
		});
	}

	if (parsed.include_archived && forum.threads.fetchArchived) {
		const archived = await forum.threads.fetchArchived({ type: "public", limit });
		for (const t of archived.threads.values()) {
			const th = t as ThreadShape;
			if (collected.some((c) => c.id === th.id)) continue;
			collected.push({
				id: th.id,
				name: th.name,
				archived: Boolean(th.archived),
				locked: Boolean(th.locked),
				appliedTags: th.appliedTags ?? [],
			});
		}
	}

	const trimmed = collected.slice(0, limit);
	if (trimmed.length === 0) return "No threads found in this forum.";

	const lines = trimmed.map((t) => {
		const flags: string[] = [];
		if (t.archived) flags.push("archived");
		if (t.locked) flags.push("locked");
		const flagStr = flags.length > 0 ? ` [${flags.join(", ")}]` : "";
		const tagStr = t.appliedTags.length > 0 ? ` tags=[${t.appliedTags.join(",")}]` : "";
		return `${t.id} | "${t.name}"${flagStr}${tagStr}`;
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
		if (functionName === "list_forum_threads") {
			return await executeListForumThreads(guild, args);
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

type ThreadLike = {
	id: string;
	name: string;
	isThread?: () => boolean;
	setAppliedTags?: (tags: string[], reason?: string) => Promise<unknown>;
	setArchived?: (archived: boolean, reason?: string) => Promise<unknown>;
	setLocked?: (locked: boolean, reason?: string) => Promise<unknown>;
};

type ForumLike = {
	id: string;
	name: string;
	availableTags: Array<{ id: string; name: string }>;
	setAvailableTags: (
		tags: Array<{ id?: string; name: string; emoji?: { name: string | null; id: string | null } | null; moderated?: boolean }>,
		reason?: string,
	) => Promise<unknown>;
};

function getThread(guild: Guild, threadId: string): ThreadLike | null {
	const channel = guild.channels.cache.get(threadId) as unknown as ThreadLike | undefined;
	if (!channel) return null;
	if (typeof channel.isThread === "function" && !channel.isThread()) return null;
	return channel;
}

function getForum(guild: Guild, forumId: string): ForumLike | null {
	const channel = guild.channels.cache.get(forumId);
	if (!channel) return null;
	if (channel.type !== ChannelType.GuildForum && channel.type !== ChannelType.GuildMedia) return null;
	return channel as unknown as ForumLike;
}

async function executeApplyForumTags(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = ApplyForumTagsArgsSchema.parse(args);
	const thread = getThread(guild, parsed.thread_id);
	if (!thread || !thread.setAppliedTags) {
		return {
			toolCallId: "",
			functionName: "apply_forum_tags",
			success: false,
			message: `Thread ${parsed.thread_id} not found or not a forum/media thread`,
		};
	}
	await thread.setAppliedTags(parsed.tag_ids);
	return {
		toolCallId: "",
		functionName: "apply_forum_tags",
		success: true,
		message: `Applied ${parsed.tag_ids.length} tag(s) to "${thread.name}"`,
	};
}

async function executeAddForumChannelTag(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = AddForumChannelTagArgsSchema.parse(args);
	const forum = getForum(guild, parsed.forum_channel_id);
	if (!forum) {
		return {
			toolCallId: "",
			functionName: "add_forum_channel_tag",
			success: false,
			message: `Forum channel ${parsed.forum_channel_id} not found`,
		};
	}
	const newTag: { name: string; emoji?: { name: string | null; id: string | null } | null; moderated?: boolean } = {
		name: parsed.name,
	};
	if (parsed.emoji_unicode) newTag.emoji = { name: parsed.emoji_unicode, id: null };
	if (parsed.moderated !== undefined) newTag.moderated = parsed.moderated;

	const next = [...forum.availableTags.map((t) => ({ id: t.id, name: t.name })), newTag];
	await forum.setAvailableTags(next);
	return {
		toolCallId: "",
		functionName: "add_forum_channel_tag",
		success: true,
		message: `Added tag "${parsed.name}" to forum "${forum.name}"`,
	};
}

async function executeRemoveForumChannelTag(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = RemoveForumChannelTagArgsSchema.parse(args);
	const forum = getForum(guild, parsed.forum_channel_id);
	if (!forum) {
		return {
			toolCallId: "",
			functionName: "remove_forum_channel_tag",
			success: false,
			message: `Forum channel ${parsed.forum_channel_id} not found`,
		};
	}
	const removed = forum.availableTags.find((t) => t.id === parsed.tag_id);
	if (!removed) {
		return {
			toolCallId: "",
			functionName: "remove_forum_channel_tag",
			success: false,
			message: `Tag ${parsed.tag_id} not found on forum "${forum.name}"`,
		};
	}
	const next = forum.availableTags.filter((t) => t.id !== parsed.tag_id).map((t) => ({ id: t.id, name: t.name }));
	await forum.setAvailableTags(next);
	return {
		toolCallId: "",
		functionName: "remove_forum_channel_tag",
		success: true,
		message: `Removed tag "${removed.name}" from forum "${forum.name}"`,
	};
}

async function executeCloseThread(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = CloseThreadArgsSchema.parse(args);
	const thread = getThread(guild, parsed.thread_id);
	if (!thread || !thread.setArchived) {
		return {
			toolCallId: "",
			functionName: "close_thread",
			success: false,
			message: `Thread ${parsed.thread_id} not found`,
		};
	}
	if (parsed.lock && thread.setLocked) {
		await thread.setLocked(true, parsed.reason);
	}
	await thread.setArchived(true, parsed.reason);
	return {
		toolCallId: "",
		functionName: "close_thread",
		success: true,
		message: `Closed${parsed.lock ? " and locked" : ""} thread "${thread.name}"`,
	};
}

async function executeReopenThread(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = ReopenThreadArgsSchema.parse(args);
	const thread = getThread(guild, parsed.thread_id);
	if (!thread || !thread.setArchived) {
		return {
			toolCallId: "",
			functionName: "reopen_thread",
			success: false,
			message: `Thread ${parsed.thread_id} not found`,
		};
	}
	await thread.setArchived(false);
	if (parsed.unlock && thread.setLocked) {
		await thread.setLocked(false);
	}
	return {
		toolCallId: "",
		functionName: "reopen_thread",
		success: true,
		message: `Reopened${parsed.unlock ? " and unlocked" : ""} thread "${thread.name}"`,
	};
}

async function executeLockThread(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = LockThreadArgsSchema.parse(args);
	const thread = getThread(guild, parsed.thread_id);
	if (!thread || !thread.setLocked) {
		return {
			toolCallId: "",
			functionName: "lock_thread",
			success: false,
			message: `Thread ${parsed.thread_id} not found`,
		};
	}
	await thread.setLocked(true, parsed.reason);
	return {
		toolCallId: "",
		functionName: "lock_thread",
		success: true,
		message: `Locked thread "${thread.name}"`,
	};
}

async function executeUnlockThread(guild: Guild, args: Record<string, unknown>): Promise<ActionResult> {
	const parsed = UnlockThreadArgsSchema.parse(args);
	const thread = getThread(guild, parsed.thread_id);
	if (!thread || !thread.setLocked) {
		return {
			toolCallId: "",
			functionName: "unlock_thread",
			success: false,
			message: `Thread ${parsed.thread_id} not found`,
		};
	}
	await thread.setLocked(false);
	return {
		toolCallId: "",
		functionName: "unlock_thread",
		success: true,
		message: `Unlocked thread "${thread.name}"`,
	};
}

export async function executeToolCall(guild: Guild, functionName: string, args: Record<string, unknown>): Promise<ActionResult> {
	const executors: Record<string, (guild: Guild, args: Record<string, unknown>) => Promise<ActionResult>> = {
		create_channel: executeCreateChannel,
		set_channel_permission: executeSetChannelPermission,
		move_channel: executeMoveChannel,
		rename_channel: executeRenameChannel,
		clone_channel: executeCloneChannel,
		delete_channel: executeDeleteChannel,
		create_category: executeCreateCategory,
		assign_role: executeAssignRole,
		remove_role: executeRemoveRole,
		apply_forum_tags: executeApplyForumTags,
		add_forum_channel_tag: executeAddForumChannelTag,
		remove_forum_channel_tag: executeRemoveForumChannelTag,
		close_thread: executeCloseThread,
		reopen_thread: executeReopenThread,
		lock_thread: executeLockThread,
		unlock_thread: executeUnlockThread,
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
		case "apply_forum_tags": {
			const a = args as { thread_id: string; tag_ids: string[] };
			const resolveTagName = (id: string) => {
				for (const ch of guildContext.channels) {
					const t = ch.forumTags?.find((tag) => tag.id === id);
					if (t) return `"${t.name}"`;
				}
				return id;
			};
			if (a.tag_ids.length === 0) return `Clear all tags on thread <#${a.thread_id}>`;
			return `Apply tags [${a.tag_ids.map(resolveTagName).join(", ")}] to thread <#${a.thread_id}>`;
		}
		case "add_forum_channel_tag": {
			const a = args as { forum_channel_id: string; name: string; emoji_unicode?: string; moderated?: boolean };
			const emoji = a.emoji_unicode ? ` ${a.emoji_unicode}` : "";
			const mod = a.moderated ? " (moderated)" : "";
			return `Add tag "${a.name}"${emoji}${mod} to ${resolveChannelName(a.forum_channel_id)}`;
		}
		case "remove_forum_channel_tag": {
			const a = args as { forum_channel_id: string; tag_id: string };
			const ch = guildContext.channels.find((c) => c.id === a.forum_channel_id);
			const tagName = ch?.forumTags?.find((t) => t.id === a.tag_id)?.name ?? a.tag_id;
			return `Remove tag "${tagName}" from ${resolveChannelName(a.forum_channel_id)}`;
		}
		case "close_thread": {
			const a = args as { thread_id: string; lock?: boolean };
			return `Close${a.lock ? " + lock" : ""} thread <#${a.thread_id}>`;
		}
		case "reopen_thread": {
			const a = args as { thread_id: string; unlock?: boolean };
			return `Reopen${a.unlock ? " + unlock" : ""} thread <#${a.thread_id}>`;
		}
		case "lock_thread": {
			const a = args as { thread_id: string };
			return `Lock thread <#${a.thread_id}>`;
		}
		case "unlock_thread": {
			const a = args as { thread_id: string };
			return `Unlock thread <#${a.thread_id}>`;
		}
		default:
			return `Unknown action: ${functionName}`;
	}
}
