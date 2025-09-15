import { faker } from "@faker-js/faker";
import type { z } from "zod";
import type { userSchema, userStatsSchema } from "../../../../api/src/db/schema.ts";

export interface UserFactoryOptions {
	id?: number;
	discordId?: string;
	guildedId?: string;
	username?: string;
	email?: string;
	role?: "user" | "admin" | "moderator";
}

export interface UserStatsFactoryOptions {
	userId?: number;
	coinsCount?: number;
	xpCount?: number;
	dailyStreak?: number;
	maxDailyStreak?: number;
	workCount?: number;
	messagesCount?: number;
	serverTagStreak?: number;
	boostCount?: number;
	lastDailyAt?: Date;
	lastWorkAt?: Date;
}

export class UserFactory {
	private static idCounter = 1;

	static create(options: UserFactoryOptions = {}): z.infer<typeof userSchema> {
		const id = options.id ?? UserFactory.idCounter++;
		const discordId = options.discordId ?? faker.string.numeric(18);

		return {
			id,
			username: options.username ?? faker.internet.username(),
			email: options.email ?? faker.internet.email(),
			password: faker.internet.password(),
			guildedId: options.guildedId ?? null,
			discordId,
			role: options.role ?? "user",
			createdAt: faker.date.past(),
			updatedAt: new Date(),
		};
	}

	static createBatch(count: number, options: UserFactoryOptions = {}): z.infer<typeof userSchema>[] {
		return Array.from({ length: count }, () => UserFactory.create(options));
	}

	static createWithStats(
		userOptions: UserFactoryOptions = {},
		statsOptions: UserStatsFactoryOptions = {},
	): {
		user: z.infer<typeof userSchema>;
		stats: z.infer<typeof userStatsSchema>;
	} {
		const user = UserFactory.create(userOptions);
		const stats = UserStatsFactory.create({ ...statsOptions, userId: user.id });
		return { user, stats };
	}
}

export class UserStatsFactory {
	static create(options: UserStatsFactoryOptions = {}): z.infer<typeof userStatsSchema> {
		const now = new Date();
		const lastDaily = options.lastDailyAt ?? faker.date.recent({ days: 1 });
		const lastWork = options.lastWorkAt ?? faker.date.recent({ days: 1 });

		return {
			id: faker.number.int({ min: 1, max: 10000 }),
			userId: options.userId ?? faker.number.int({ min: 1, max: 10000 }),
			dailyStreak: options.dailyStreak ?? faker.number.int({ min: 0, max: 30 }),
			maxDailyStreak: options.maxDailyStreak ?? faker.number.int({ min: 0, max: 100 }),
			lastDailyAt: lastDaily,
			workCount: options.workCount ?? faker.number.int({ min: 0, max: 1000 }),
			lastWorkAt: lastWork,
			messagesCount: options.messagesCount ?? faker.number.int({ min: 0, max: 10000 }),
			lastMessageAt: faker.date.recent({ days: 7 }),
			serverTagStreak: options.serverTagStreak ?? faker.number.int({ min: 0, max: 30 }),
			maxServerTagStreak: faker.number.int({ min: 0, max: 100 }),
			lastServerTagCheck: faker.date.recent({ days: 1 }),
			serverTagBadge: faker.helpers.arrayElement(["🏆", "⭐", "🎯", null]),
			coinsCount: options.coinsCount ?? faker.number.int({ min: 0, max: 100000 }),
			xpCount: options.xpCount ?? faker.number.int({ min: 0, max: 50000 }),
			boostCount: options.boostCount ?? faker.number.int({ min: 0, max: 10 }),
			boostExpires: options.boostCount && options.boostCount > 0 ? faker.date.future() : null,
			updatedAt: now,
		};
	}

	static createNewUser(userId: number): z.infer<typeof userStatsSchema> {
		return UserStatsFactory.create({
			userId,
			coinsCount: 0,
			xpCount: 0,
			dailyStreak: 0,
			maxDailyStreak: 0,
			workCount: 0,
			messagesCount: 0,
			serverTagStreak: 0,
			boostCount: 0,
			lastDailyAt: undefined,
			lastWorkAt: undefined,
		});
	}

	static createVeteranUser(userId: number): z.infer<typeof userStatsSchema> {
		return UserStatsFactory.create({
			userId,
			coinsCount: faker.number.int({ min: 50000, max: 200000 }),
			xpCount: faker.number.int({ min: 30000, max: 100000 }),
			dailyStreak: faker.number.int({ min: 15, max: 30 }),
			maxDailyStreak: faker.number.int({ min: 30, max: 100 }),
			workCount: faker.number.int({ min: 500, max: 2000 }),
			messagesCount: faker.number.int({ min: 5000, max: 20000 }),
			serverTagStreak: faker.number.int({ min: 10, max: 30 }),
			boostCount: faker.number.int({ min: 1, max: 5 }),
		});
	}

	static createOnCooldown(userId: number, type: "daily" | "work"): z.infer<typeof userStatsSchema> {
		const now = new Date();
		const recentTime = new Date(now.getTime() - 30 * 60 * 1000);

		return UserStatsFactory.create({
			userId,
			lastDailyAt: type === "daily" ? now : undefined,
			lastWorkAt: type === "work" ? recentTime : undefined,
		});
	}

	static createReadyToClaim(userId: number): z.infer<typeof userStatsSchema> {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

		return UserStatsFactory.create({
			userId,
			lastDailyAt: yesterday,
			lastWorkAt: twoHoursAgo,
			dailyStreak: faker.number.int({ min: 1, max: 10 }),
		});
	}

	static createMilestoneReady(userId: number, milestone: number): z.infer<typeof userStatsSchema> {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		return UserStatsFactory.create({
			userId,
			lastDailyAt: yesterday,
			dailyStreak: milestone - 1,
			serverTagStreak: milestone - 1,
		});
	}
}

export function createUserScenarios() {
	return {
		newUser: () => {
			const user = UserFactory.create();
			const stats = UserStatsFactory.createNewUser(user.id);
			return { user, stats };
		},

		veteranUser: () => {
			const user = UserFactory.create({ role: "user" });
			const stats = UserStatsFactory.createVeteranUser(user.id);
			return { user, stats };
		},

		boostedUser: () => {
			const user = UserFactory.create();
			const stats = UserStatsFactory.create({
				userId: user.id,
				boostCount: 3,
			});
			return { user, stats };
		},

		dailyCooldownUser: () => {
			const user = UserFactory.create();
			const stats = UserStatsFactory.createOnCooldown(user.id, "daily");
			return { user, stats };
		},

		workCooldownUser: () => {
			const user = UserFactory.create();
			const stats = UserStatsFactory.createOnCooldown(user.id, "work");
			return { user, stats };
		},

		milestoneUser: (milestone = 5) => {
			const user = UserFactory.create();
			const stats = UserStatsFactory.createMilestoneReady(user.id, milestone);
			return { user, stats };
		},

		adminUser: () => {
			const user = UserFactory.create({ role: "admin" });
			const stats = UserStatsFactory.create({ userId: user.id });
			return { user, stats };
		},

		moderatorUser: () => {
			const user = UserFactory.create({ role: "moderator" });
			const stats = UserStatsFactory.create({ userId: user.id });
			return { user, stats };
		},
	};
}
