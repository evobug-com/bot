import {
	ChannelType,
	type GuildMember,
	type InteractionReplyOptions,
	MessageFlags,
	PermissionsBitField,
	type Role,
	type Snowflake,
	type TextChannel,
} from "discord.js";

export interface MockUserOptions {
	id?: string;
	username?: string;
	discriminator?: string;
	bot?: boolean;
	avatar?: string;
}

export interface MockMemberOptions {
	user?: MockUserOptions;
	nickname?: string;
	roles?: string[];
	premiumSince?: Date | null;
	permissions?: bigint;
}

export interface MockGuildOptions {
	id?: string;
	name?: string;
	ownerId?: string;
	members?: Map<string, GuildMember>;
	channels?: Map<string, TextChannel>;
	roles?: Map<string, Role>;
}

export interface MockInteractionOptions {
	guildId?: string;
	channelId?: string;
	user?: MockUserOptions;
	member?: MockMemberOptions;
	commandName?: string;
	options?: Record<string, any>;
}

export class MockUser {
	id: Snowflake;
	username: string;
	discriminator: string;
	bot: boolean;
	avatar: string | null;
	tag: string;

	constructor(options: MockUserOptions = {}) {
		this.id = options.id ?? Math.random().toString(36).substring(2, 15);
		this.username = options.username ?? `User${this.id}`;
		this.discriminator = options.discriminator ?? "0001";
		this.bot = options.bot ?? false;
		this.avatar = options.avatar ?? null;
		this.tag = `${this.username}#${this.discriminator}`;
	}
}

export class MockGuildMember {
	id: Snowflake;
	user: MockUser;
	nickname: string | null;
	roles: any;
	premiumSince: Date | null;
	permissions: Readonly<PermissionsBitField>;
	guild: MockGuild;

	constructor(guild: MockGuild, options: MockMemberOptions = {}) {
		this.user = new MockUser(options.user);
		this.id = this.user.id;
		this.nickname = options.nickname ?? null;
		this.premiumSince = options.premiumSince ?? null;
		this.guild = guild;
		this.permissions = new PermissionsBitField(options.permissions ?? 0n);

		this.roles = {
			cache: new Map(options.roles?.map((roleId) => [roleId, guild.roles?.cache?.get(roleId)])),
		};
	}

	async fetch(): Promise<MockGuildMember> {
		return Promise.resolve(this);
	}

	get displayName(): string {
		return this.nickname ?? this.user.username;
	}
}

export class MockTextChannel {
	id: Snowflake;
	name: string;
	type = ChannelType.GuildText;
	guild: MockGuild;

	declare isTextBased: () => boolean;

	constructor(guild: MockGuild, id: string, name: string) {
		this.id = id;
		this.name = name;
		this.guild = guild;
	}

	async send(options: any): Promise<any> {
		return Promise.resolve({
			id: Math.random().toString(36).substring(2, 15),
			content: options.content ?? "",
			embeds: options.embeds ?? [],
		});
	}
}

export class MockRole {
	id: Snowflake;
	name: string;
	color: number;
	position: number;

	constructor(id: string, name: string, color = 0, position = 0) {
		this.id = id;
		this.name = name;
		this.color = color;
		this.position = position;
	}
}

export class MockGuild {
	id: Snowflake;
	name: string;
	ownerId: Snowflake;
	members: any;
	channels: any;
	roles: any;

	constructor(options: MockGuildOptions = {}) {
		this.id = options.id ?? Math.random().toString(36).substring(2, 15);
		this.name = options.name ?? `Guild${this.id}`;
		this.ownerId = options.ownerId ?? Math.random().toString(36).substring(2, 15);

		const channelsCache = options.channels ?? new Map();
		this.channels = {
			cache: channelsCache,
			find: (fn: (c: any) => boolean) => {
				for (const [_, channel] of channelsCache) {
					if (fn(channel)) return channel;
				}
				return undefined;
			},
		};

		// Add find method to cache as well (Discord.js compatibility)
		this.channels.cache.find = (fn: (c: any) => boolean) => {
			for (const [_, channel] of channelsCache) {
				if (fn(channel)) return channel;
			}
			return undefined;
		};

		this.members = {
			cache: options.members ?? new Map(),
			fetch: async (userId: string) => {
				const member = this.members.cache.get(userId);
				if (member) return member;
				const newMember = new MockGuildMember(this, { user: { id: userId } });
				this.members.cache.set(userId, newMember);
				return newMember;
			},
		};

		this.roles = {
			cache: options.roles ?? new Map(),
		};
	}
}

export class MockChatInputCommandInteraction {
	id: Snowflake;
	guildId: Snowflake | null;
	channelId: Snowflake;
	user: MockUser;
	member: MockGuildMember | null;
	guild: MockGuild | null;
	commandName: string;
	options: any;
	replied = false;
	deferred = false;
	ephemeral = false;
	private responses: any[] = [];

	constructor(options: MockInteractionOptions = {}) {
		this.id = Math.random().toString(36).substring(2, 15);
		this.guildId = options.guildId ?? Math.random().toString(36).substring(2, 15);
		this.channelId = options.channelId ?? Math.random().toString(36).substring(2, 15);
		this.user = new MockUser(options.user);
		this.commandName = options.commandName ?? "test";

		if (this.guildId) {
			this.guild = new MockGuild({ id: this.guildId });
			this.member = new MockGuildMember(this.guild, {
				user: options.user,
				...options.member,
			});
		} else {
			this.guild = null;
			this.member = null;
		}

		this.options = {
			getString: (name: string) => options.options?.[name],
			getInteger: (name: string) => options.options?.[name],
			getNumber: (name: string) => options.options?.[name],
			getBoolean: (name: string) => options.options?.[name],
			getUser: (name: string) => options.options?.[name],
			getMember: (name: string) => options.options?.[name],
			getChannel: (name: string) => options.options?.[name],
			getRole: (name: string) => options.options?.[name],
			getSubcommand: () => options.options?.subcommand,
			getSubcommandGroup: () => options.options?.subcommandGroup,
		};
	}

	async deferReply(options?: { ephemeral?: boolean; fetchReply?: boolean; flags?: number }): Promise<any> {
		this.deferred = true;
		this.ephemeral = options?.ephemeral ?? false;
		if (options?.flags && (options.flags & MessageFlags.Ephemeral) === MessageFlags.Ephemeral) {
			this.ephemeral = true;
		}
		return Promise.resolve({
			id: this.id,
			interaction: this,
		});
	}

	async reply(options: InteractionReplyOptions | string): Promise<any> {
		this.replied = true;
		const response = typeof options === "string" ? { content: options } : options;
		if (response.flags && ((response.flags as number) & MessageFlags.Ephemeral) === MessageFlags.Ephemeral) {
			this.ephemeral = true;
		}
		this.responses.push(response);
		return Promise.resolve({
			id: Math.random().toString(36).substring(2, 15),
			...response,
		});
	}

	async editReply(options: any): Promise<any> {
		if (!this.replied && !this.deferred) {
			throw new Error("Interaction has not been deferred or replied to");
		}
		const response = typeof options === "string" ? { content: options } : options;
		if (response.flags && ((response.flags as number) & MessageFlags.Ephemeral) === MessageFlags.Ephemeral) {
			this.ephemeral = true;
		}
		this.responses.push(response);
		return Promise.resolve({
			id: this.id,
			...response,
		});
	}

	async followUp(options: any): Promise<any> {
		if (!this.replied && !this.deferred) {
			throw new Error("Interaction has not been replied to");
		}
		const response = typeof options === "string" ? { content: options } : options;
		if (response.flags && ((response.flags as number) & MessageFlags.Ephemeral) === MessageFlags.Ephemeral) {
			this.ephemeral = true;
		}
		this.responses.push(response);
		return Promise.resolve({
			id: Math.random().toString(36).substring(2, 15),
			...response,
		});
	}

	getResponses(): any[] {
		return [...this.responses];
	}

	getLastResponse(): any {
		return this.responses[this.responses.length - 1];
	}
}

export function createMockInteraction(options?: MockInteractionOptions): MockChatInputCommandInteraction {
	return new MockChatInputCommandInteraction(options);
}

export function createMockGuild(options?: MockGuildOptions): MockGuild {
	return new MockGuild(options);
}

export function createMockMember(guild: MockGuild, options?: MockMemberOptions): MockGuildMember {
	return new MockGuildMember(guild, options);
}

export function createMockUser(options?: MockUserOptions): MockUser {
	return new MockUser(options);
}

export function createMockChannel(guild: MockGuild, id: string, name: string): MockTextChannel {
	return new MockTextChannel(guild, id, name);
}

export function createMockRole(id: string, name: string, color?: number, position?: number): MockRole {
	return new MockRole(id, name, color, position);
}

export interface TestScenario {
	name: string;
	interaction: MockChatInputCommandInteraction;
	expectedResponses?: any[];
}

export function createTestScenarios(): TestScenario[] {
	return [
		{
			name: "Regular user with no boost",
			interaction: createMockInteraction({
				commandName: "work",
				user: { id: "user1", username: "TestUser" },
				member: { premiumSince: null },
			}),
		},
		{
			name: "Boosted user",
			interaction: createMockInteraction({
				commandName: "work",
				user: { id: "user2", username: "BoostUser" },
				member: { premiumSince: new Date() },
			}),
		},
		{
			name: "Bot command",
			interaction: createMockInteraction({
				commandName: "daily",
				user: { id: "bot1", username: "TestBot", bot: true },
			}),
		},
	];
}
