import {
	ChannelType,
	type Guild,
	type GuildChannel,
	PermissionFlagsBits,
	type PermissionResolvable,
} from "discord.js";
import type { ActionResult, GuildContext } from "./types.ts";
import {
	CreateChannelArgsSchema,
	MoveChannelArgsSchema,
	RenameChannelArgsSchema,
	SetChannelPermissionArgsSchema,
} from "./types.ts";
import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";

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

	const channel = await guild.channels.create({
		name: parsed.name,
		type: channelType,
		parent: parsed.category_id,
		position: parsed.position,
	});

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

export async function executeToolCall(guild: Guild, functionName: string, args: Record<string, unknown>): Promise<ActionResult> {
	const executors: Record<string, (guild: Guild, args: Record<string, unknown>) => Promise<ActionResult>> = {
		create_channel: executeCreateChannel,
		set_channel_permission: executeSetChannelPermission,
		move_channel: executeMoveChannel,
		rename_channel: executeRenameChannel,
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
		default:
			return `Unknown action: ${functionName}`;
	}
}
