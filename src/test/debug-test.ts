import { z } from "zod";

// Test if Zod is working
const testSchema = z.object({
	isOnCooldown: z.boolean(),
	cooldownRemaining: z.number(),
});

console.log("Schema:", testSchema);
console.log("Schema.def:", testSchema.def);
console.log("Schema.def.type:", (testSchema.def as any).type);
console.log("Schema.def.shape:", (testSchema.def as any).shape);

// Test parsing
const testData = { isOnCooldown: false, cooldownRemaining: 0 };
const parsed = testSchema.parse(testData);
console.log("Parsed:", parsed);

// Test shape access (Zod v4 doesn't have shape as a function)
const shape = testSchema.shape;
console.log("Shape result:", shape);
console.log("Shape keys:", Object.keys(shape));
