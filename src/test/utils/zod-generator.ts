import { faker } from "@faker-js/faker";
import type { z } from "zod";

export interface GeneratorOptions {
	seed?: number;
	includeOptionals?: boolean;
	arrayLength?: number;
	generateEdgeCases?: boolean;
}

interface GeneratorContext {
	depth: number;
	maxDepth: number;
	edgeCaseIndex: number;
}

export class ZodValueGenerator {
	private faker = faker;
	private options: GeneratorOptions;
	private context: GeneratorContext;

	constructor(options: GeneratorOptions = {}) {
		this.options = {
			seed: options.seed,
			includeOptionals: options.includeOptionals ?? true,
			arrayLength: options.arrayLength ?? 3,
			generateEdgeCases: options.generateEdgeCases ?? false,
		};

		if (this.options.seed) {
			this.faker.seed(this.options.seed);
		}

		this.context = {
			depth: 0,
			maxDepth: 10,
			edgeCaseIndex: 0,
		};
	}

	generate<T extends z.ZodType>(schema: T): z.infer<T> {
		return this.generateValue(schema) as z.infer<T>;
	}

	generateMultiple<T extends z.ZodType>(schema: T, count: number): z.infer<T>[] {
		const results: z.infer<T>[] = [];
		for (let i = 0; i < count; i++) {
			if (this.options.seed) {
				this.faker.seed(this.options.seed + i);
			}
			results.push(this.generate(schema));
		}
		return results;
	}

	generateAllVariations<T extends z.ZodType>(schema: T): z.infer<T>[] {
		const variations: z.infer<T>[] = [];

		// Generate base variation
		variations.push(this.generate(schema));

		// Generate with different seeds for variety
		for (let i = 1; i < 5; i++) {
			const oldSeed = this.options.seed;
			this.options.seed = oldSeed ? oldSeed + i * 100 : i * 100;
			variations.push(this.generate(schema));
			this.options.seed = oldSeed;
		}

		return variations;
	}

	private generateValue(schema: any): unknown {
		if (!schema) {
			console.warn("Schema is undefined");
			return {};
		}

		if (this.context.depth > this.context.maxDepth) {
			return undefined;
		}

		// Get the schema type - use .def (Zod v4) instead of deprecated _def
		const def = schema.def || {};
		const type = def.type || def.typeName || "";

		// Handle by type
		switch (type) {
			case "string":
				return this.generateString(schema, def);
			case "number":
				return this.generateNumber(schema, def);
			case "boolean":
				return this.faker.datatype.boolean();
			case "date":
				return this.faker.date.recent();
			case "bigint":
				return BigInt(this.faker.number.int({ min: 0, max: 1000000 }));
			case "array":
				return this.generateArray(schema, def);
			case "object":
				return this.generateObject(schema, def);
			case "enum":
				return this.generateEnum(def);
			case "union":
				return this.generateUnion(def);
			case "literal":
				return def.value || def.literal;
			case "nullable":
				return this.faker.datatype.boolean() ? null : this.generateValue(def.innerType || def.type);
			case "optional":
				return this.options.includeOptionals ? this.generateValue(def.innerType || def.type) : undefined;
			case "default":
				return this.faker.datatype.boolean()
					? this.generateValue(def.innerType || def.type)
					: def.defaultValue?.() || def.default;
			case "undefined":
				return undefined;
			case "null":
				return null;
			case "void":
				return undefined;
			case "never":
				throw new Error("Cannot generate value for never type");
			case "unknown":
			case "any":
				return this.generateAny();
			default:
				// Try to handle unknown types gracefully
				console.warn(`Unknown Zod type: ${type}`);
				return this.generateAny();
		}
	}

	private generateString(schema: any, def: any): string {
		const checks = def.checks || [];
		let minLength = 1;
		let maxLength = 100;

		for (const check of checks) {
			// Handle Zod v4 check structure
			const checkType = check.type || check.kind || "";
			const checkValue = check.value;

			switch (checkType) {
				case "min":
				case "length_gte":
					minLength = checkValue || minLength;
					break;
				case "max":
				case "length_lte":
					maxLength = checkValue || maxLength;
					break;
				case "email":
					return this.faker.internet.email();
				case "url":
					return this.faker.internet.url();
				case "uuid":
					return this.faker.string.uuid();
				case "regex":
					// Simple regex handling - just generate a string
					break;
			}
		}

		const length = this.faker.number.int({ min: minLength, max: Math.min(maxLength, 50) });
		return this.faker.string.alphanumeric(length);
	}

	private generateNumber(schema: any, def: any): number {
		const checks = def.checks || [];
		let min = -1000000;
		let max = 1000000;
		let isInt = false;

		for (const check of checks) {
			const checkType = check.type || check.kind || "";
			const checkValue = check.value;

			switch (checkType) {
				case "min":
				case "gte":
					min = checkValue || min;
					break;
				case "max":
				case "lte":
					max = checkValue || max;
					break;
				case "int":
					isInt = true;
					break;
			}
		}

		return isInt ? this.faker.number.int({ min, max }) : this.faker.number.float({ min, max, fractionDigits: 2 });
	}

	private generateArray(schema: any, def: any): unknown[] {
		const innerType = def.type || def.valueType;
		const checks = def.checks || [];
		let minLength = 0;
		let maxLength = this.options.arrayLength || 3;

		for (const check of checks) {
			const checkType = check.type || check.kind || "";
			const checkValue = check.value;

			switch (checkType) {
				case "min":
				case "length_gte":
					minLength = checkValue || minLength;
					break;
				case "max":
				case "length_lte":
					maxLength = checkValue || maxLength;
					break;
				case "length":
					minLength = maxLength = checkValue || minLength;
					break;
			}
		}

		const length = this.faker.number.int({ min: minLength, max: maxLength });
		const result: unknown[] = [];

		this.context.depth++;
		for (let i = 0; i < length; i++) {
			if (innerType) {
				result.push(this.generateValue(innerType));
			}
		}
		this.context.depth--;

		return result;
	}

	private generateObject(schema: any, def: any): Record<string, unknown> {
		// Get shape - use Zod v4 structure
		let shape: any = {};

		if (def.shape) {
			shape = def.shape;
		} else if (schema.shape) {
			shape = typeof schema.shape === "function" ? schema.shape() : schema.shape;
		}

		const result: Record<string, unknown> = {};

		this.context.depth++;
		for (const [key, valueSchema] of Object.entries(shape)) {
			if (valueSchema && typeof valueSchema === "object") {
				const value = this.generateValue(valueSchema);
				if (value !== undefined) {
					result[key] = value;
				}
			}
		}
		this.context.depth--;

		return result;
	}

	private generateEnum(def: any): unknown {
		const values = def.values || def.options || [];
		if (Array.isArray(values) && values.length > 0) {
			return values[this.faker.number.int({ min: 0, max: values.length - 1 })];
		}
		// Handle object enum (Zod v4)
		if (typeof values === "object" && !Array.isArray(values)) {
			const enumValues = Object.values(values);
			if (enumValues.length > 0) {
				return enumValues[this.faker.number.int({ min: 0, max: enumValues.length - 1 })];
			}
		}
		return undefined;
	}

	private generateUnion(def: any): unknown {
		const options = def.options || [];
		if (options.length > 0) {
			const selectedOption = options[this.faker.number.int({ min: 0, max: options.length - 1 })];
			return this.generateValue(selectedOption);
		}
		return undefined;
	}

	private generateAny(): unknown {
		const types = ["string", "number", "boolean", "object", "array", "null"];
		const type = types[this.faker.number.int({ min: 0, max: types.length - 1 })];

		switch (type) {
			case "string":
				return this.faker.lorem.word();
			case "number":
				return this.faker.number.int();
			case "boolean":
				return this.faker.datatype.boolean();
			case "object":
				return { [this.faker.lorem.word()]: this.faker.lorem.word() };
			case "array":
				return [this.faker.lorem.word()];
			case "null":
				return null;
			default:
				return undefined;
		}
	}
}

export function generateMockData<T extends z.ZodType>(schema: T, options?: GeneratorOptions): z.infer<T> {
	const generator = new ZodValueGenerator(options);
	return generator.generate(schema);
}

export function generateMockDataSet<T extends z.ZodType>(
	schema: T,
	count: number,
	options?: GeneratorOptions,
): z.infer<T>[] {
	const generator = new ZodValueGenerator(options);
	return generator.generateMultiple(schema, count);
}

export function generateAllVariations<T extends z.ZodType>(schema: T, options?: GeneratorOptions): z.infer<T>[] {
	const generator = new ZodValueGenerator({ ...options, generateEdgeCases: true });
	return generator.generateAllVariations(schema);
}
