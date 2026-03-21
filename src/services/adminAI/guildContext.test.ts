import { describe, expect, it } from "bun:test";
import { ChannelType } from "discord.js";
import { gatherGuildContext } from "./guildContext.ts";
import type { Guild } from "discord.js";

function createMockChannel(overrides: {
	id: string;
	name: string;
	type: ChannelType;
	parentId?: string | null;
	position?: number;
}) {
	return {
		id: overrides.id,
		name: overrides.name,
		type: overrides.type,
		parentId: overrides.parentId ?? null,
		position: overrides.position ?? 0,
	};
}

function createMockGuild(channels: ReturnType<typeof createMockChannel>[], roles: { id: string; name: string; position: number }[] = []): Guild {
	const channelMap = new Map(channels.map((ch) => [ch.id, ch]));
	const roleMap = new Map(roles.map((r) => [r.id, r]));

	return {
		id: "guild-1",
		name: "Test Guild",
		channels: {
			cache: {
				values: () => channelMap.values(),
				get: (id: string) => channelMap.get(id),
			},
		},
		roles: {
			cache: {
				values: () => roleMap.values(),
			},
		},
	} as unknown as Guild;
}

describe("gatherGuildContext", () => {
	it("extracts channels with correct properties", () => {
		const guild = createMockGuild([
			createMockChannel({ id: "ch-1", name: "general", type: ChannelType.GuildText, position: 0 }),
		]);

		const context = gatherGuildContext(guild);

		expect(context.guildId).toBe("guild-1");
		expect(context.guildName).toBe("Test Guild");
		expect(context.channels).toHaveLength(1);
		expect(context.channels[0]).toEqual({
			id: "ch-1",
			name: "general",
			type: "Text",
			categoryId: null,
			categoryName: null,
			position: 0,
		});
	});

	it("includes channel category name when channel has a parent", () => {
		const guild = createMockGuild([
			createMockChannel({ id: "cat-1", name: "Info", type: ChannelType.GuildCategory, position: 0 }),
			createMockChannel({ id: "ch-1", name: "announcements", type: ChannelType.GuildText, parentId: "cat-1", position: 0 }),
		]);

		const context = gatherGuildContext(guild);

		const textChannel = context.channels.find((ch) => ch.id === "ch-1");
		expect(textChannel?.categoryId).toBe("cat-1");
		expect(textChannel?.categoryName).toBe("Info");
	});

	it("sorts categories before other channels", () => {
		const guild = createMockGuild([
			createMockChannel({ id: "ch-1", name: "general", type: ChannelType.GuildText, position: 0 }),
			createMockChannel({ id: "cat-1", name: "Info", type: ChannelType.GuildCategory, position: 0 }),
		]);

		const context = gatherGuildContext(guild);

		expect(context.channels[0]?.type).toBe("Category");
		expect(context.channels[1]?.type).toBe("Text");
	});

	it("sorts channels within same category by position", () => {
		const guild = createMockGuild([
			createMockChannel({ id: "cat-1", name: "General", type: ChannelType.GuildCategory, position: 0 }),
			createMockChannel({ id: "ch-2", name: "off-topic", type: ChannelType.GuildText, parentId: "cat-1", position: 2 }),
			createMockChannel({ id: "ch-1", name: "general", type: ChannelType.GuildText, parentId: "cat-1", position: 1 }),
		]);

		const context = gatherGuildContext(guild);
		const textChannels = context.channels.filter((ch) => ch.type === "Text");

		expect(textChannels[0]?.name).toBe("general");
		expect(textChannels[1]?.name).toBe("off-topic");
	});

	it("extracts roles sorted by position descending", () => {
		const guild = createMockGuild([], [
			{ id: "role-1", name: "Admin", position: 10 },
			{ id: "role-2", name: "Moderator", position: 5 },
			{ id: "role-3", name: "Member", position: 1 },
		]);

		const context = gatherGuildContext(guild);

		expect(context.roles).toHaveLength(3);
		expect(context.roles[0]?.name).toBe("Admin");
		expect(context.roles[1]?.name).toBe("Moderator");
		expect(context.roles[2]?.name).toBe("Member");
	});

	it("maps voice channels correctly", () => {
		const guild = createMockGuild([
			createMockChannel({ id: "vc-1", name: "Voice Chat", type: ChannelType.GuildVoice, position: 0 }),
		]);

		const context = gatherGuildContext(guild);

		expect(context.channels[0]?.type).toBe("Voice");
	});

	it("maps announcement channels correctly", () => {
		const guild = createMockGuild([
			createMockChannel({ id: "ann-1", name: "News", type: ChannelType.GuildAnnouncement, position: 0 }),
		]);

		const context = gatherGuildContext(guild);

		expect(context.channels[0]?.type).toBe("Announcement");
	});

	it("handles empty guild", () => {
		const guild = createMockGuild([], []);

		const context = gatherGuildContext(guild);

		expect(context.channels).toHaveLength(0);
		expect(context.roles).toHaveLength(0);
	});
});
