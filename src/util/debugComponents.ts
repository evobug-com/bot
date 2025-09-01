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
function debugComponentRecursive(component: unknown, depth: number, path: string): void {
	const indent = "  ".repeat(depth);
	const componentType = (component as Record<string, unknown>)?.constructor?.name || "Unknown";

	console.log(`${indent}📍 Path: ${path}`);
	console.log(`${indent}Type: ${componentType}`);

	// First, check if this component has nested components and debug them FIRST (depth-first)
	if (component && typeof component === "object" && component !== null) {
		// Check for data property
		if ("data" in component) {
			const componentWithData = component as { data: Record<string, unknown> };
			console.log(`${indent}Has data property with keys:`, Object.keys(componentWithData.data || {}));

			// Debug nested components FIRST (before testing parent)
			const data = componentWithData.data;

			// Check for components array (ActionRow, Container, Section)
			if (data && "components" in data && Array.isArray(data.components)) {
				const components = data.components as unknown[];
				console.log(`${indent}📦 Has ${components.length} nested components in data.components`);
				for (let i = 0; i < components.length; i++) {
					console.log(`${indent}  --- Nested Component [${i}] ---`);
					debugComponentRecursive(components[i], depth + 2, `${path}.components[${i}]`);
				}
			}

			// Check for accessory (SectionBuilder)
			if (data && "accessory" in data && data.accessory !== undefined) {
				const accessory = data.accessory;
				console.log(`${indent}🎯 Has accessory:`, accessory === null ? "null" : typeof accessory);
				if (accessory && typeof accessory === "object") {
					console.log(`${indent}  --- Accessory Component ---`);
					debugComponentRecursive(accessory, depth + 2, `${path}.accessory`);
				}
			}

			// Check for text_displays (SectionBuilder, ContainerBuilder)
			if (data && "text_displays" in data && Array.isArray(data.text_displays)) {
				const textDisplays = data.text_displays as unknown[];
				console.log(`${indent}📝 Has ${textDisplays.length} text displays`);
				for (let i = 0; i < textDisplays.length; i++) {
					console.log(`${indent}  Text [${i}]:`, JSON.stringify(textDisplays[i]));
				}
			}
		}

		// Check for direct components property (ActionRowBuilder)
		if ("components" in component && Array.isArray((component as Record<string, unknown>).components)) {
			const componentWithComponents = component as { components: unknown[] };
			console.log(`${indent}📦 Has ${componentWithComponents.components.length} direct components`);
			for (let i = 0; i < componentWithComponents.components.length; i++) {
				console.log(`${indent}  --- Direct Component [${i}] ---`);
				debugComponentRecursive(componentWithComponents.components[i], depth + 2, `${path}.directComponents[${i}]`);
			}
		}
	}

	// NOW test this component's toJSON (after testing children)
	console.log(`${indent}🧪 Testing toJSON for ${path}...`);
	try {
		if (
			component &&
			typeof component === "object" &&
			component !== null &&
			"toJSON" in component &&
			typeof (component as { toJSON: unknown }).toJSON === "function"
		) {
			const json = (component as { toJSON: () => unknown }).toJSON();
			console.log(`${indent}✅ toJSON() successful for ${path}`);
			if (json && typeof json === "object" && json !== null) {
				console.log(`${indent}   Result keys:`, Object.keys(json));
			}

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
		if (component && typeof component === "object" && component !== null && "data" in component) {
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
