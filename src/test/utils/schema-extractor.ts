import { z } from "zod";
import {
	levelProgressSchema,
} from "../../../../api/src/contract/stats/index.ts";

import {
	suspensionsSchema,
	userSchema,
	userStatsLogSchema,
	userStatsSchema,
	violationsSchema,
} from "../../../../api/src/db/schema.ts";

export const schemas = {
	database: {
		user: userSchema,
		userStats: userStatsSchema,
		userStatsLog: userStatsLogSchema,
		violations: violationsSchema,
		suspensions: suspensionsSchema,
	},

	stats: {
		levelProgress: levelProgressSchema,

		userStatsOutput: z.object({
			stats: userStatsSchema,
			levelProgress: levelProgressSchema,
		}),

		leaderboardOutput: z.array(
			z.object({
				user: userSchema.pick({ id: true, discordId: true, guildedId: true, username: true }),
				metricValue: z.number(),
				rank: z.number(),
			}),
		),

		dailyCooldownOutput: z.object({
			isOnCooldown: z.boolean(),
			cooldownRemaining: z.number(),
			cooldownEndTime: z.date(),
		}),

		workCooldownOutput: z.object({
			isOnCooldown: z.boolean(),
			cooldownRemaining: z.number().int().min(0),
			cooldownEndTime: z.date().optional(),
			lastActivity: userStatsLogSchema.optional(),
		}),

		claimDailyOutput: z.object({
			updatedStats: userStatsSchema,
			levelUp: z
				.object({
					newLevel: z.number(),
					oldLevel: z.number(),
					bonusCoins: z.number(),
				})
				.optional(),
			claimStats: z.object({
				baseCoins: z.number(),
				baseXp: z.number(),
				currentLevel: z.number(),
				levelCoinsBonus: z.number(),
				levelXpBonus: z.number(),
				streakCoinsBonus: z.number(),
				streakXpBonus: z.number(),
				milestoneCoinsBonus: z.number(),
				milestoneXpBonus: z.number(),
				boostMultiplier: z.number(),
				boostCoinsBonus: z.number(),
				boostXpBonus: z.number(),
				isMilestone: z.boolean(),
				earnedTotalCoins: z.number(),
				earnedTotalXp: z.number(),
			}),
			levelProgress: levelProgressSchema,
		}),

		claimWorkOutput: z.object({
			statsLog: userStatsLogSchema,
			updatedStats: userStatsSchema,
			message: z.string(),
			levelUp: z
				.object({
					newLevel: z.number(),
					oldLevel: z.number(),
					bonusCoins: z.number(),
				})
				.optional(),
			claimStats: z.object({
				baseCoins: z.number(),
				baseXp: z.number(),
				currentLevel: z.number(),
				levelCoinsBonus: z.number(),
				levelXpBonus: z.number(),
				streakCoinsBonus: z.number(),
				streakXpBonus: z.number(),
				milestoneCoinsBonus: z.number(),
				milestoneXpBonus: z.number(),
				boostMultiplier: z.number(),
				boostCoinsBonus: z.number(),
				boostXpBonus: z.number(),
				isMilestone: z.boolean(),
				earnedTotalCoins: z.number(),
				earnedTotalXp: z.number(),
			}),
			levelProgress: levelProgressSchema,
		}),

		serverTagStreakOutput: z.object({
			updatedStats: userStatsSchema,
			streakChanged: z.boolean(),
			rewardEarned: z.boolean(),
			milestoneReached: z.number().optional(),
			message: z.string(),
		}),

		getServerTagStreakOutput: z.object({
			currentStreak: z.number(),
			maxStreak: z.number(),
			lastCheck: z.date().optional(),
			nextMilestone: z.number(),
			daysUntilMilestone: z.number(),
		}),
	},

	violations: {
		issueViolationOutput: z.object({
			violation: violationsSchema,
			accountStanding: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"]),
			message: z.string(),
		}),

		listViolationsOutput: z.object({
			violations: z.array(violationsSchema),
			total: z.number(),
		}),

		getViolationOutput: violationsSchema,

		expireViolationOutput: z.object({
			violation: violationsSchema,
			message: z.string(),
		}),

		updateViolationReviewOutput: z.object({
			violation: violationsSchema,
			message: z.string(),
		}),

		bulkExpireViolationsOutput: z.object({
			count: z.number(),
			message: z.string(),
		}),
	},

	suspensions: {
		createSuspensionOutput: z.object({
			suspension: suspensionsSchema,
			message: z.string(),
		}),

		liftSuspensionOutput: z.object({
			suspension: suspensionsSchema,
			message: z.string(),
		}),

		checkSuspensionOutput: z.object({
			isSuspended: z.boolean(),
			suspension: suspensionsSchema.optional(),
			remainingTime: z.number().optional(),
		}),

		listSuspensionsOutput: z.object({
			suspensions: z.array(suspensionsSchema),
			total: z.number(),
		}),

		getSuspensionHistoryOutput: z.array(suspensionsSchema),

		autoExpireSuspensionsOutput: z.object({
			expired: z.number(),
			message: z.string(),
		}),
	},

	standing: {
		getStandingOutput: z.object({
			standing: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"]),
			score: z.number(),
			details: z.object({
				activeViolations: z.number(),
				recentViolations: z.number(),
				totalViolations: z.number(),
				severityScore: z.number(),
			}),
		}),

		calculateStandingOutput: z.object({
			standing: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"]),
			score: z.number(),
			activeViolations: z.number(),
			recentViolations: z.number(),
			totalViolations: z.number(),
			severityScore: z.number(),
		}),

		getBulkStandingsOutput: z.array(
			z.object({
				userId: z.number(),
				standing: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"]),
				score: z.number(),
			}),
		),

		getUserRestrictionsOutput: z.object({
			restrictions: z.array(z.string()),
			sources: z.array(
				z.object({
					violationId: z.number(),
					type: z.string(),
					severity: z.string(),
					restrictions: z.array(z.string()),
				}),
			),
		}),
	},

	users: {
		createUserOutput: userSchema,
		getUserOutput: userSchema,
		updateUserOutput: userSchema,
	},

	errors: {
		orpcError: z.object({
			code: z.enum(["NOT_FOUND", "NOT_ACCEPTABLE", "CONFLICT", "DATABASE_ERROR", "FORBIDDEN"]),
			message: z.string(),
		}),
	},
};