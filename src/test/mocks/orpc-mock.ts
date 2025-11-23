import type { RouterClient } from "@orpc/server";
import type { router } from "../../../../api/src/contract/router.ts";
import type { z } from "zod";
import { type GeneratorOptions, generateMockData } from "../utils/zod-generator.ts";

export interface MockConfig {
	defaultOptions?: GeneratorOptions;
	errorRate?: number;
	latency?: number;
	customResponses?: Record<string, unknown>;
}

type Procedure = {
	'~orpc': {
		outputSchema?: z.ZodType;
		handler: unknown;
	};
};

type SchemaMap = Map<string, z.ZodType>;

function isProcedure(value: unknown): value is Procedure {
	return (
		typeof value === "object" &&
		value !== null &&
		"~orpc" in value &&
		typeof value["~orpc"] === "object" &&
		value["~orpc"] !== null &&
		"handler" in value["~orpc"]
	);
}

function extractSchemas(obj: unknown, path: string[] = []): SchemaMap {
	const schemas: SchemaMap = new Map();

	if (isProcedure(obj)) {
		const fullPath = path.join(".");
		if (obj["~orpc"].outputSchema) {
			schemas.set(fullPath, obj["~orpc"].outputSchema);
		}
		return schemas;
	}

	if (typeof obj === "object" && obj !== null) {
		for (const [key, value] of Object.entries(obj)) {
			const nestedSchemas = extractSchemas(value, [...path, key]);
			for (const [nestedPath, schema] of nestedSchemas) {
				schemas.set(nestedPath, schema);
			}
		}
	}

	return schemas;
}

function getAllEndpoints(obj: unknown, path: string[] = []): Set<string> {
	const endpoints = new Set<string>();

	if (isProcedure(obj)) {
		endpoints.add(path.join("."));
		return endpoints;
	}

	if (typeof obj === "object" && obj !== null) {
		for (const [key, value] of Object.entries(obj)) {
			const nestedEndpoints = getAllEndpoints(value, [...path, key]);
			for (const endpoint of nestedEndpoints) {
				endpoints.add(endpoint);
			}
		}
	}

	return endpoints;
}

export class MockORPCClient {
	private config: MockConfig;
	private callHistory: Array<{ endpoint: string; input: unknown; timestamp: Date }> = [];
	private customHandlers: Map<string, (input: unknown) => unknown> = new Map();
	private schemaMap: SchemaMap | undefined;
	private knownEndpoints: Set<string> | undefined;
	private routerInstance: typeof router | undefined;

	constructor(config: MockConfig = {}, routerInstance?: typeof router) {
		this.config = {
			errorRate: config.errorRate ?? 0,
			latency: config.latency ?? 0,
			defaultOptions: config.defaultOptions ?? { seed: 123 },
			customResponses: config.customResponses ?? {},
		};

		this.routerInstance = routerInstance;

		if (routerInstance) {
			this.schemaMap = extractSchemas(routerInstance);
			this.knownEndpoints = getAllEndpoints(routerInstance);
		}
	}

	private async ensureInitialized(): Promise<void> {
		if (this.schemaMap && this.knownEndpoints) {
			return;
		}

		if (!this.routerInstance) {
			const { router: importedRouter } = await import("../../../../api/src/contract/router.ts");
			this.routerInstance = importedRouter;
		}

		this.schemaMap = extractSchemas(this.routerInstance);
		this.knownEndpoints = getAllEndpoints(this.routerInstance);
	}

	createClient(): RouterClient<typeof router> {
		return this.buildProxy() as RouterClient<typeof router>;
	}

	private buildProxy(path: string[] = []): unknown {
		return new Proxy(
			() => {},
			{
				get: (target, prop: string) => {
					const currentPath = [...path, prop];

					if (prop === "then" || prop === "catch") {
						return undefined;
					}

					return this.buildProxy(currentPath);
				},
				apply: async (target, thisArg, args: unknown[]) => {
					await this.ensureInitialized();
					const fullPath = path.join(".");
					const input = args[0];
					return this.handleCall(fullPath, input);
				},
			},
		);
	}

	private async handleCall(endpoint: string, input: unknown): Promise<unknown> {
		this.callHistory.push({ endpoint, input, timestamp: new Date() });

		if (this.config.customResponses?.[endpoint]) {
			return [undefined, this.config.customResponses[endpoint]];
		}

		const customHandler = this.customHandlers.get(endpoint);
		if (customHandler) {
			const result = customHandler(input);
			return [undefined, result];
		}

		const response = this.generateResponse(endpoint, input);
		return [undefined, response];
	}

	private generateResponse(endpoint: string, input: unknown): unknown {
		if (!this.schemaMap) {
			console.warn(`Schema map not initialized for endpoint: ${endpoint}`);
			return this.getFallbackResponse(endpoint, input);
		}

		const schema = this.schemaMap.get(endpoint);

		if (!schema) {
			console.warn(`No schema found for endpoint: ${endpoint}`);
			return this.getFallbackResponse(endpoint, input);
		}

		const mockData = generateMockData(schema, this.config.defaultOptions);

		return this.customizeResponse(endpoint, mockData, input);
	}

	private customizeResponse(endpoint: string, mockData: unknown, input: unknown): unknown {
		if (endpoint === "users.get" && input && typeof input === "object" && "discordId" in input) {
			const base = typeof mockData === "object" && mockData !== null ? mockData : {};
			return {
				...base,
				discordId: input.discordId,
				id: ("userId" in input ? input.userId : Math.floor(Math.random() * 10000)) as number,
			};
		}

		if (endpoint === "users.stats.user" && input && typeof input === "object" && "id" in input) {
			const base = typeof mockData === "object" && mockData !== null ? mockData : {};
			const existingStats =
				typeof mockData === "object" && mockData !== null && "stats" in mockData ? mockData.stats : {};
			const statsBase = typeof existingStats === "object" && existingStats !== null ? existingStats : {};
			return {
				...base,
				stats: {
					...statsBase,
					userId: input.id,
				},
			};
		}

		if (endpoint.includes("cooldown")) {
			const isOnCooldown = Math.random() > 0.5;
			const base = typeof mockData === "object" && mockData !== null ? mockData : {};
			return {
				...base,
				isOnCooldown,
				cooldownRemaining: isOnCooldown ? Math.floor(Math.random() * 3600) : 0,
				cooldownEndTime: isOnCooldown ? new Date(Date.now() + Math.random() * 3600000) : new Date(),
			};
		}

		return mockData;
	}

	private getFallbackResponse(endpoint: string, _input: unknown): unknown {
		// All endpoints should have schemas now. If we hit this, it means:
		// 1. The endpoint doesn't exist in the router, OR
		// 2. The endpoint exists but has no output schema defined
		// Both cases should be fixed in the API, not worked around here.
		console.warn(
			`Fallback response used for ${endpoint}. This endpoint should have an output schema defined in the API.`,
		);
		return {};
	}

	private isKnownEndpoint(path: string): boolean {
		return this.knownEndpoints?.has(path) ?? false;
	}

	setCustomHandler(endpoint: string, handler: (input: unknown) => unknown): void {
		this.customHandlers.set(endpoint, handler);
	}

	setCustomResponse(endpoint: string, response: unknown): void {
		if (!this.config.customResponses) {
			this.config.customResponses = {};
		}
		this.config.customResponses[endpoint] = response;
	}

	getCallHistory(): Array<{ endpoint: string; input: unknown; timestamp: Date }> {
		return [...this.callHistory];
	}

	clearCallHistory(): void {
		this.callHistory = [];
	}

	getCallCount(endpoint?: string): number {
		if (!endpoint) return this.callHistory.length;
		return this.callHistory.filter((call) => call.endpoint === endpoint).length;
	}

	getLastCall(endpoint?: string): { endpoint: string; input: unknown; timestamp: Date } | undefined {
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

export function createMockORPCClient(
	config?: MockConfig,
	routerInstance?: typeof router,
): RouterClient<typeof router> {
	const mockClient = new MockORPCClient(config, routerInstance);
	return mockClient.createClient();
}

export function createTestORPCClient(
	overrides?: Partial<{
		errorRate: number;
		latency: number;
		seed: number;
	}>,
	routerInstance?: typeof router,
): { client: RouterClient<typeof router>; mock: MockORPCClient } {
	const mock = new MockORPCClient(
		{
			errorRate: overrides?.errorRate ?? 0,
			latency: overrides?.latency ?? 0,
			defaultOptions: { seed: overrides?.seed ?? 123 },
		},
		routerInstance,
	);

	return {
		client: mock.createClient(),
		mock,
	};
}
