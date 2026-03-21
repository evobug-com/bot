import { ChannelType, type Guild } from "discord.js";
import type { GuildChannelInfo, GuildContext, GuildRoleInfo } from "./types.ts";

function getChannelTypeName(type: ChannelType): string {
	const typeNames: Record<number, string> = {
		[ChannelType.GuildText]: "Text",
		[ChannelType.GuildVoice]: "Voice",
		[ChannelType.GuildCategory]: "Category",
		[ChannelType.GuildAnnouncement]: "Announcement",
		[ChannelType.GuildStageVoice]: "Stage",
		[ChannelType.GuildForum]: "Forum",
		[ChannelType.GuildMedia]: "Media",
	};
	return typeNames[type] ?? "Unknown";
}

export function gatherGuildContext(guild: Guild): GuildContext {
	const channels: GuildChannelInfo[] = [];
	const roles: GuildRoleInfo[] = [];

	// Collect and sort channels by category position, then channel position
	const sortedChannels = [...guild.channels.cache.values()].sort((a, b) => {
		const aIsCategory = a.type === ChannelType.GuildCategory;
		const bIsCategory = b.type === ChannelType.GuildCategory;

		// Categories first
		if (aIsCategory && !bIsCategory) return -1;
		if (!aIsCategory && bIsCategory) return 1;

		const aParentId = "parentId" in a ? a.parentId : null;
		const bParentId = "parentId" in b ? b.parentId : null;

		// Group by category
		if (aParentId !== bParentId) {
			if (!aParentId) return -1;
			if (!bParentId) return 1;
			const aParent = guild.channels.cache.get(aParentId);
			const bParent = guild.channels.cache.get(bParentId);
			const aParentPos = aParent && "position" in aParent ? aParent.position : 0;
			const bParentPos = bParent && "position" in bParent ? bParent.position : 0;
			return aParentPos - bParentPos;
		}

		const aPos = "position" in a ? a.position : 0;
		const bPos = "position" in b ? b.position : 0;
		return aPos - bPos;
	});

	for (const channel of sortedChannels) {
		const parentId = "parentId" in channel ? channel.parentId : null;
		const parent = parentId ? guild.channels.cache.get(parentId) : null;

		channels.push({
			id: channel.id,
			name: channel.name,
			type: getChannelTypeName(channel.type),
			categoryId: parentId ?? null,
			categoryName: parent?.name ?? null,
			position: "position" in channel ? channel.position : 0,
		});
	}

	// Collect and sort roles by position (descending, highest first)
	const sortedRoles = [...guild.roles.cache.values()].sort((a, b) => b.position - a.position);

	for (const role of sortedRoles) {
		roles.push({
			id: role.id,
			name: role.name,
			position: role.position,
		});
	}

	return {
		guildId: guild.id,
		guildName: guild.name,
		channels,
		roles,
	};
}
