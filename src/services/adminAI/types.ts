import { z } from "zod";

export interface ForumTagInfo {
	id: string;
	name: string;
	emoji?: string;
	moderated: boolean;
}

export interface GuildChannelInfo {
	id: string;
	name: string;
	type: string;
	categoryId: string | null;
	categoryName: string | null;
	position: number;
	/** Available tags on a Forum channel (only present when type === "Forum"). */
	forumTags?: ForumTagInfo[];
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

export const CloneChannelArgsSchema = z.object({
	source_channel_id: z.string(),
	new_name: z.string(),
	position: z.number().optional(),
});

export type CloneChannelArgs = z.infer<typeof CloneChannelArgsSchema>;

export const DeleteChannelArgsSchema = z.object({
	channel_id: z.string(),
});

export type DeleteChannelArgs = z.infer<typeof DeleteChannelArgsSchema>;

export const CreateCategoryArgsSchema = z.object({
	name: z.string(),
	position: z.number().optional(),
});

export type CreateCategoryArgs = z.infer<typeof CreateCategoryArgsSchema>;

export const AssignRoleArgsSchema = z.object({
	member_id: z.string(),
	role_id: z.string(),
});

export type AssignRoleArgs = z.infer<typeof AssignRoleArgsSchema>;

export const RemoveRoleArgsSchema = z.object({
	member_id: z.string(),
	role_id: z.string(),
});

export type RemoveRoleArgs = z.infer<typeof RemoveRoleArgsSchema>;

export const QueryAuditLogArgsSchema = z.object({
	action_types: z.array(z.string()).optional(),
	limit: z.number().int().min(1).max(50).optional(),
	target_id: z.string().optional(),
	user_id: z.string().optional(),
});

export const UpdateChannelArgsSchema = z
	.object({
		channel_id: z.string(),
		// Channel "topic" / description. Discord caps this at 1024 chars on
		// text/announcement channels but allows up to 4096 chars on forum and
		// media channels (their long-form post guidelines). We use the wider
		// limit here so legitimate forum-guideline updates aren't rejected
		// client-side; Discord enforces the per-type cap server-side anyway.
		topic: z.string().max(4096).nullable().optional(),
		// Slowmode in seconds. Discord allows 0–21600 (6 hours). 0 disables.
		slowmode_seconds: z.number().int().min(0).max(21600).optional(),
		nsfw: z.boolean().optional(),
		// Voice channels only
		user_limit: z.number().int().min(0).max(99).optional(),
		// Voice channels only — bits per second (8000–96000 stage; 8000–384000 boosted)
		bitrate: z.number().int().min(8000).max(384000).optional(),
	})
	.refine(
		(v) =>
			v.topic !== undefined ||
			v.slowmode_seconds !== undefined ||
			v.nsfw !== undefined ||
			v.user_limit !== undefined ||
			v.bitrate !== undefined,
		{ message: "At least one update field must be provided" },
	);

export type UpdateChannelArgs = z.infer<typeof UpdateChannelArgsSchema>;

export type QueryAuditLogArgs = z.infer<typeof QueryAuditLogArgsSchema>;

export const ApplyForumTagsArgsSchema = z.object({
	thread_id: z.string(),
	tag_ids: z.array(z.string()).max(5),
});

export type ApplyForumTagsArgs = z.infer<typeof ApplyForumTagsArgsSchema>;

export const AddForumChannelTagArgsSchema = z.object({
	forum_channel_id: z.string(),
	name: z.string().min(1).max(20),
	emoji_unicode: z.string().optional(),
	moderated: z.boolean().optional(),
});

export type AddForumChannelTagArgs = z.infer<typeof AddForumChannelTagArgsSchema>;

export const RemoveForumChannelTagArgsSchema = z.object({
	forum_channel_id: z.string(),
	tag_id: z.string(),
});

export type RemoveForumChannelTagArgs = z.infer<typeof RemoveForumChannelTagArgsSchema>;

export const CloseThreadArgsSchema = z.object({
	thread_id: z.string(),
	lock: z.boolean().optional(),
	reason: z.string().max(512).optional(),
});

export type CloseThreadArgs = z.infer<typeof CloseThreadArgsSchema>;

export const ReopenThreadArgsSchema = z.object({
	thread_id: z.string(),
	unlock: z.boolean().optional(),
});

export type ReopenThreadArgs = z.infer<typeof ReopenThreadArgsSchema>;

export const LockThreadArgsSchema = z.object({
	thread_id: z.string(),
	reason: z.string().max(512).optional(),
});

export type LockThreadArgs = z.infer<typeof LockThreadArgsSchema>;

export const UnlockThreadArgsSchema = z.object({
	thread_id: z.string(),
});

export type UnlockThreadArgs = z.infer<typeof UnlockThreadArgsSchema>;

export const ListForumThreadsArgsSchema = z.object({
	forum_channel_id: z.string(),
	include_archived: z.boolean().optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

export type ListForumThreadsArgs = z.infer<typeof ListForumThreadsArgsSchema>;

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
