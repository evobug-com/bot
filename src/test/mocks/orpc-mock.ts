import type { RouterClient } from "@orpc/server";
import type { router } from "../../../../api/src/contract/router.ts";
import { schemas } from "../utils/schema-extractor.ts";
import { type GeneratorOptions, generateMockData } from "../utils/zod-generator.ts";

export interface MockConfig {
	defaultOptions?: GeneratorOptions;
	errorRate?: number;
	latency?: number;
	customResponses?: Record<string, any>;
}

export class MockORPCClient {
	private config: MockConfig;
	private callHistory: Array<{ endpoint: string; input: any; timestamp: Date }> = [];
	private customHandlers: Map<string, (input: any) => any> = new Map();

	constructor(config: MockConfig = {}) {
		this.config = {
			errorRate: config.errorRate ?? 0,
			latency: config.latency ?? 0,
			defaultOptions: config.defaultOptions ?? { seed: 123 },
			customResponses: config.customResponses ?? {},
		};
	}

	createClient(): RouterClient<typeof router> {
		return this.buildProxy() as RouterClient<typeof router>;
	}

	private buildProxy(path: string[] = []): any {
		return new Proxy(
			{},
			{
				get: (target, prop: string) => {
					const currentPath = [...path, prop];
					const fullPath = currentPath.join(".");

					if (prop === "then" || prop === "catch") {
						return undefined;
					}

					const isEndpoint = this.isKnownEndpoint(fullPath);
					if (isEndpoint) {
						return async (input: any) => {
							return this.handleCall(fullPath, input);
						};
					}

					return this.buildProxy(currentPath);
				},
			},
		);
	}

	private async handleCall(endpoint: string, input: any): Promise<any> {
		this.callHistory.push({ endpoint, input, timestamp: new Date() });

		// if (this.config.latency && this.config.latency > 0) {
		// 	await new Promise((resolve) => setTimeout(resolve, this.config.latency));
		// }

		// if (this.config.errorRate && Math.random() < this.config.errorRate) {
		// 	// Return error tuple for safe client
		// 	return [this.generateError(endpoint), undefined];
		// }

		if (this.config.customResponses?.[endpoint]) {
			// Return success tuple for safe client
			return [undefined, this.config.customResponses[endpoint]];
		}

		const customHandler = this.customHandlers.get(endpoint);
		if (customHandler) {
			const result = customHandler(input);
			// Return success tuple for safe client
			return [undefined, result];
		}

		const response = this.generateResponse(endpoint, input);
		// Return success tuple for safe client
		return [undefined, response];
	}

	private generateResponse(endpoint: string, input: any): any {
		const schemaMap: Record<string, string> = {
			"users.stats.user": "stats.userStatsOutput",
			"users.stats.daily.cooldown": "stats.dailyCooldownOutput",
			"users.stats.daily.claim": "stats.claimDailyOutput",
			"users.stats.work.cooldown": "stats.workCooldownOutput",
			"users.stats.work.claim": "stats.claimWorkOutput",
			"users.stats.captcha.log": "stats.captchaLogOutput",
			"users.stats.serverTag.check": "stats.serverTagStreakOutput",
			"users.stats.serverTag.get": "stats.getServerTagStreakOutput",
			"users.stats.top": "stats.leaderboardOutput",
			"users.create": "users.createUserOutput",
			"users.get": "users.getUserOutput",
			"users.update": "users.updateUserOutput",
			"moderation.violations.issue": "violations.issueViolationOutput",
			"moderation.violations.list": "violations.listViolationsOutput",
			"moderation.violations.get": "violations.getViolationOutput",
			"moderation.violations.expire": "violations.expireViolationOutput",
			"moderation.violations.updateReview": "violations.updateViolationReviewOutput",
			"moderation.violations.bulkExpire": "violations.bulkExpireViolationsOutput",
			"moderation.suspensions.create": "suspensions.createSuspensionOutput",
			"moderation.suspensions.lift": "suspensions.liftSuspensionOutput",
			"moderation.suspensions.check": "suspensions.checkSuspensionOutput",
			"moderation.suspensions.list": "suspensions.listSuspensionsOutput",
			"moderation.suspensions.history": "suspensions.getSuspensionHistoryOutput",
			"moderation.suspensions.autoExpire": "suspensions.autoExpireSuspensionsOutput",
			"moderation.standing.get": "standing.getStandingOutput",
			"moderation.standing.calculate": "standing.calculateStandingOutput",
			"moderation.standing.bulk": "standing.getBulkStandingsOutput",
			"moderation.standing.restrictions": "standing.getUserRestrictionsOutput",
		};

		const schemaPath = schemaMap[endpoint];
		if (!schemaPath) {
			console.warn(`No schema found for endpoint: ${endpoint}`);
			// Return a default success response for unknown endpoints
			return { success: true };
		}

		const parts = schemaPath.split(".");
		if (parts.length !== 2) {
			console.warn(`Invalid schema path: ${schemaPath}`);
			return {};
		}
		const [category, schemaName] = parts;
		if (!category || !schemaName) {
			console.warn(`Invalid schema path components: ${schemaPath}`);
			return {};
		}
		const schema = (schemas as any)[category]?.[schemaName];

		if (!schema) {
			console.warn(`Schema not found: ${schemaPath}`);
			// Return default responses for specific endpoints
			if (endpoint === "users.stats.captcha.log") {
				return { logged: true, isSuspicious: false };
			}
			if (endpoint === "users.stats.captcha.failedCount.update") {
				return { updated: true, newCount: 1 };
			}
			if (endpoint === "users.stats.suspiciousScore.update") {
				return { updated: true, newScore: 20 };
			}
			return {};
		}

		const mockData = generateMockData(schema, this.config.defaultOptions);

		if (endpoint === "users.get" && input?.discordId) {
			return {
				...mockData,
				discordId: input.discordId,
				id: input.userId || Math.floor(Math.random() * 10000),
			};
		}

		if (endpoint === "users.stats.user" && input?.id) {
			return {
				...mockData,
				stats: {
					...mockData.stats,
					userId: input.id,
				},
			};
		}

		if (endpoint.includes("cooldown")) {
			const isOnCooldown = Math.random() > 0.5;
			return {
				...mockData,
				isOnCooldown,
				cooldownRemaining: isOnCooldown ? Math.floor(Math.random() * 3600) : 0,
				cooldownEndTime: isOnCooldown ? new Date(Date.now() + Math.random() * 3600000) : new Date(),
			};
		}

		return mockData;
	}

	private generateError(endpoint: string): Error {
		const errors = [
			{ code: "NOT_FOUND", message: "Resource not found" },
			{ code: "NOT_ACCEPTABLE", message: "Request not acceptable" },
			{ code: "CONFLICT", message: "Resource conflict" },
			{ code: "DATABASE_ERROR", message: "Database error occurred" },
			{ code: "FORBIDDEN", message: "Access forbidden" },
		];

		const errorInfo = errors[Math.floor(Math.random() * errors.length)];
		if (!errorInfo) {
			return new Error("Unknown error");
		}
		const err = new Error(errorInfo.message);
		(err as any).code = errorInfo.code;
		return err;
	}

	private isKnownEndpoint(path: string): boolean {
		const knownEndpoints = [
			"users.stats.user",
			"users.stats.daily.cooldown",
			"users.stats.daily.claim",
			"users.stats.work.cooldown",
			"users.stats.work.claim",
			"users.stats.captcha.log",
			"users.stats.captcha.failedCount.update",
			"users.stats.suspiciousScore.update",
			"users.stats.serverTag.check",
			"users.stats.serverTag.get",
			"users.stats.top",
			"users.create",
			"users.get",
			"users.update",
			"moderation.violations.issue",
			"moderation.violations.list",
			"moderation.violations.get",
			"moderation.violations.expire",
			"moderation.violations.updateReview",
			"moderation.violations.bulkExpire",
			"moderation.suspensions.create",
			"moderation.suspensions.lift",
			"moderation.suspensions.check",
			"moderation.suspensions.list",
			"moderation.suspensions.history",
			"moderation.suspensions.autoExpire",
			"moderation.standing.get",
			"moderation.standing.calculate",
			"moderation.standing.bulk",
			"moderation.standing.restrictions",
		];

		return knownEndpoints.includes(path);
	}

	setCustomHandler(endpoint: string, handler: (input: any) => any): void {
		this.customHandlers.set(endpoint, handler);
	}

	setCustomResponse(endpoint: string, response: any): void {
		if (!this.config.customResponses) {
			this.config.customResponses = {};
		}
		this.config.customResponses[endpoint] = response;
	}

	getCallHistory(): Array<{ endpoint: string; input: any; timestamp: Date }> {
		return [...this.callHistory];
	}

	clearCallHistory(): void {
		this.callHistory = [];
	}

	getCallCount(endpoint?: string): number {
		if (!endpoint) return this.callHistory.length;
		return this.callHistory.filter((call) => call.endpoint === endpoint).length;
	}

	getLastCall(endpoint?: string): { endpoint: string; input: any; timestamp: Date } | undefined {
		const calls = endpoint ? this.callHistory.filter((call) => call.endpoint === endpoint) : this.callHistory;
		return calls[calls.length - 1];
	}

	hasBeenCalledWith(endpoint: string): boolean {
		return this.callHistory.some((call) => call.endpoint === endpoint);
	}

	reset(): void {
		this.clearCallHistory();
		this.customHandlers.clear();
		this.config.customResponses = {};
	}
}

export function createMockORPCClient(config?: MockConfig): RouterClient<typeof router> {
	const mockClient = new MockORPCClient(config);
	return mockClient.createClient();
}

export function createTestORPCClient(
	overrides?: Partial<{
		errorRate: number;
		latency: number;
		seed: number;
	}>,
): { client: RouterClient<typeof router>; mock: MockORPCClient } {
	const mock = new MockORPCClient({
		errorRate: overrides?.errorRate ?? 0,
		latency: overrides?.latency ?? 0,
		defaultOptions: { seed: overrides?.seed ?? 123 },
	});

	return {
		client: mock.createClient(),
		mock,
	};
}
