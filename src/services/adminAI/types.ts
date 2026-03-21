import { z } from "zod";

export interface GuildChannelInfo {
	id: string;
	name: string;
	type: string;
	categoryId: string | null;
	categoryName: string | null;
	position: number;
}

export interface GuildRoleInfo {
	id: string;
	name: string;
	position: number;
}

export interface GuildContext {
	guildId: string;
	guildName: string;
	channels: GuildChannelInfo[];
	roles: GuildRoleInfo[];
}

export const CreateChannelArgsSchema = z.object({
	name: z.string(),
	type: z.enum(["text", "voice"]),
	category_id: z.string(),
	position: z.number().optional(),
});

export type CreateChannelArgs = z.infer<typeof CreateChannelArgsSchema>;

export const SetChannelPermissionArgsSchema = z.object({
	channel_id: z.string(),
	target_id: z.string(),
	target_type: z.enum(["role", "member"]),
	allow: z.array(z.string()),
	deny: z.array(z.string()),
});

export type SetChannelPermissionArgs = z.infer<typeof SetChannelPermissionArgsSchema>;

export const MoveChannelArgsSchema = z.object({
	channel_id: z.string(),
	position: z.number(),
});

export type MoveChannelArgs = z.infer<typeof MoveChannelArgsSchema>;

export const RenameChannelArgsSchema = z.object({
	channel_id: z.string(),
	new_name: z.string(),
});

export type RenameChannelArgs = z.infer<typeof RenameChannelArgsSchema>;

export interface PlannedAction {
	toolCallId: string;
	functionName: string;
	arguments: Record<string, unknown>;
	displaySummary: string;
}

export interface ActionResult {
	toolCallId: string;
	functionName: string;
	success: boolean;
	message: string;
}

export interface PendingAdminAction {
	id: string;
	guildId: string;
	channelId: string;
	userId: string;
	messageId: string;
	actions: PlannedAction[];
	createdAt: number;
}
