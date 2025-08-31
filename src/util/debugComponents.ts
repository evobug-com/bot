import type { MessageCreateOptions } from "discord.js";

/**
 * Debug function to identify which component is causing validation errors
 * It traverses all components depth-first, testing from the deepest level up
 */
export function debugComponents(message: MessageCreateOptions, label: string = "Message"): void {
	console.log(`\n${"=".repeat(60)}`);
	console.log(`Debugging Components for: ${label}`);
	console.log(`${"=".repeat(60)}`);

	if (!message.components) {
		console.log("❌ No components found in message");
		return;
	}

	console.log(`Total top-level components: ${message.components.length}`);

	// Recursively debug each component, depth-first
	for (let i = 0; i < message.components.length; i++) {
		const component = message.components[i];
		console.log(`\n${"=".repeat(40)}`);
		console.log(`TOP-LEVEL Component [${i}]`);
		console.log(`${"=".repeat(40)}`);
		debugComponentRecursive(component, 0, `[${i}]`);
	}

	console.log(`\n${"=".repeat(60)}\n`);
}

/**
 * Recursively debug a component and all its nested components
 * Tests from deepest level first
 */
function debugComponentRecursive(component: any, depth: number, path: string): void {
	const indent = "  ".repeat(depth);
	const componentType = component?.constructor?.name || "Unknown";

	console.log(`${indent}📍 Path: ${path}`);
	console.log(`${indent}Type: ${componentType}`);

	// First, check if this component has nested components and debug them FIRST (depth-first)
	if (component && typeof component === "object") {
		// Check for data property
		if ("data" in component) {
			console.log(`${indent}Has data property with keys:`, Object.keys(component.data || {}));

			// Debug nested components FIRST (before testing parent)
			const data = component.data;

			// Check for components array (ActionRow, Container, Section)
			if (data.components && Array.isArray(data.components)) {
				console.log(`${indent}📦 Has ${data.components.length} nested components in data.components`);
				for (let i = 0; i < data.components.length; i++) {
					console.log(`${indent}  --- Nested Component [${i}] ---`);
					debugComponentRecursive(data.components[i], depth + 2, `${path}.components[${i}]`);
				}
			}

			// Check for accessory (SectionBuilder)
			if (data.accessory !== undefined) {
				console.log(`${indent}🎯 Has accessory:`, data.accessory === null ? "null" : typeof data.accessory);
				if (data.accessory && typeof data.accessory === "object") {
					console.log(`${indent}  --- Accessory Component ---`);
					debugComponentRecursive(data.accessory, depth + 2, `${path}.accessory`);
				}
			}

			// Check for text_displays (SectionBuilder, ContainerBuilder)
			if (data.text_displays && Array.isArray(data.text_displays)) {
				console.log(`${indent}📝 Has ${data.text_displays.length} text displays`);
				for (let i = 0; i < data.text_displays.length; i++) {
					console.log(`${indent}  Text [${i}]:`, JSON.stringify(data.text_displays[i]));
				}
			}
		}

		// Check for direct components property (ActionRowBuilder)
		if ("components" in component && Array.isArray(component.components)) {
			console.log(`${indent}📦 Has ${component.components.length} direct components`);
			for (let i = 0; i < component.components.length; i++) {
				console.log(`${indent}  --- Direct Component [${i}] ---`);
				debugComponentRecursive(component.components[i], depth + 2, `${path}.directComponents[${i}]`);
			}
		}
	}

	// NOW test this component's toJSON (after testing children)
	console.log(`${indent}🧪 Testing toJSON for ${path}...`);
	try {
		if (component && "toJSON" in component && typeof component.toJSON === "function") {
			const json = component.toJSON();
			console.log(`${indent}✅ toJSON() successful for ${path}`);
			console.log(`${indent}   Result keys:`, Object.keys(json));

			// Show the actual JSON for debugging
			if (depth < 2) {
				// Only show full JSON for top-level components
				console.log(
					`${indent}   JSON output:`,
					JSON.stringify(json, null, 2)
						.split("\n")
						.map((line) => `${indent}   ${line}`)
						.join("\n"),
				);
			}
		} else {
			console.log(`${indent}⚠️ No toJSON method found for ${path}`);
		}
	} catch (error) {
		console.error(`${indent}❌ ERROR in ${path} toJSON():`, error);

		// Print detailed error info
		if (error instanceof Error) {
			console.error(`${indent}   Error message: ${error.message}`);
			if (depth === 0) {
				// Only show stack for top-level errors
				console.error(`${indent}   Error stack: ${error.stack}`);
			}
		}

		// Print the component's data property when toJSON fails
		if (component && "data" in component) {
			console.log(`${indent}📦 Failed component's data property:`);
			console.log(
				JSON.stringify(component.data, null, 2)
					.split("\n")
					.map((line) => `${indent}   ${line}`)
					.join("\n"),
			);
		}
	}
}
