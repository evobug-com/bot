import { describe, expect, it } from "bun:test";
import { OverwriteType, PermissionFlagsBits } from "discord.js";
import {
	createTicketButtonMessage,
	generateTicketChannelName,
	getTicketChannelPermissions,
} from "./handleTicketSystem.ts";

describe("handleTicketSystem", () => {
	describe("generateTicketChannelName", () => {
		it("should generate a valid channel name with prefix", () => {
			const result = generateTicketChannelName("TestUser");
			expect(result).toBe("🎫︱ticket-testuser");
		});

		it("should convert username to lowercase", () => {
			const result = generateTicketChannelName("UPPERCASE");
			expect(result).toBe("🎫︱ticket-uppercase");
		});

		it("should replace invalid characters with hyphens", () => {
			const result = generateTicketChannelName("Test User Name");
			expect(result).toBe("🎫︱ticket-test-user-name");
		});

		it("should remove leading and trailing hyphens", () => {
			const result = generateTicketChannelName("---test---");
			expect(result).toBe("🎫︱ticket-test");
		});

		it("should collapse multiple hyphens into one", () => {
			const result = generateTicketChannelName("test---user");
			expect(result).toBe("🎫︱ticket-test-user");
		});

		it("should handle special characters", () => {
			const result = generateTicketChannelName("User@#$%Name");
			expect(result).toBe("🎫︱ticket-user-name");
		});

		it("should handle unicode characters", () => {
			const result = generateTicketChannelName("Uživatel");
			expect(result).toBe("🎫︱ticket-u-ivatel");
		});

		it("should fallback to 'user' for empty result", () => {
			const result = generateTicketChannelName("@#$%");
			expect(result).toBe("🎫︱ticket-user");
		});

		it("should truncate very long usernames", () => {
			const longName = "a".repeat(100);
			const result = generateTicketChannelName(longName);
			// Prefix is "🎫︱ticket-" (about 10 chars) + 80 chars max
			expect(result.length).toBeLessThanOrEqual(100);
			expect(result).toStartWith("🎫︱ticket-");
		});

		it("should preserve numbers and hyphens", () => {
			const result = generateTicketChannelName("user-123-test");
			expect(result).toBe("🎫︱ticket-user-123-test");
		});

		it("should preserve underscores", () => {
			const result = generateTicketChannelName("user_name");
			expect(result).toBe("🎫︱ticket-user_name");
		});
	});

	describe("createTicketButtonMessage", () => {
		it("should return an object with embeds and components", () => {
			const result = createTicketButtonMessage();

			expect(result).toHaveProperty("embeds");
			expect(result).toHaveProperty("components");
			expect(Array.isArray(result.embeds)).toBe(true);
			expect(Array.isArray(result.components)).toBe(true);
		});

		it("should contain exactly one embed", () => {
			const result = createTicketButtonMessage();
			expect(result.embeds).toHaveLength(1);
		});

		it("should contain exactly one component row", () => {
			const result = createTicketButtonMessage();
			expect(result.components).toHaveLength(1);
		});

		it("should have embed with title containing ticket emoji", () => {
			const result = createTicketButtonMessage();
			const embed = result.embeds[0];
			if (!embed) {
				throw new Error("Expected embed to be defined");
			}

			const embedData = embed.toJSON();
			expect(embedData.title).toContain("🎫");
		});

		it("should have button with correct custom ID", () => {
			const result = createTicketButtonMessage();
			const row = result.components[0];
			if (!row) {
				throw new Error("Expected row to be defined");
			}
			expect(row.components).toBeDefined();
			expect(row.components.length).toBeGreaterThan(0);

			const button = row.components[0] as { custom_id?: string } | undefined;
			if (!button) {
				throw new Error("Expected button to be defined");
			}
			expect(button.custom_id).toBe("ticket_create");
		});

		it("should have a primary style button", () => {
			const result = createTicketButtonMessage();
			const row = result.components[0];
			if (!row) {
				throw new Error("Expected row to be defined");
			}

			const button = row.components[0] as { style?: number } | undefined;
			if (!button) {
				throw new Error("Expected button to be defined");
			}
			// ButtonStyle.Primary = 1
			expect(button.style).toBe(1);
		});

		it("should have button with ticket emoji", () => {
			const result = createTicketButtonMessage();
			const row = result.components[0];
			if (!row) {
				throw new Error("Expected row to be defined");
			}

			const button = row.components[0] as { emoji?: { name?: string } } | undefined;
			if (!button) {
				throw new Error("Expected button to be defined");
			}
			expect(button.emoji).toBeDefined();
			expect(button.emoji?.name).toBe("🎫");
		});
	});

	describe("getTicketChannelPermissions", () => {
		it("should be a function", () => {
			expect(typeof getTicketChannelPermissions).toBe("function");
		});

		it("should be an async function that returns a promise", () => {
			// Verify the function signature returns a promise
			// Note: Full integration testing requires proper Discord.js mocks
			expect(getTicketChannelPermissions.constructor.name).toBe("AsyncFunction");
		});
	});

	describe("permission constants", () => {
		it("should use correct permission flags for ticket channels", () => {
			// Verify the permission flags we use are valid Discord.js flags
			expect(PermissionFlagsBits.ViewChannel).toBeDefined();
			expect(PermissionFlagsBits.SendMessages).toBeDefined();
			expect(PermissionFlagsBits.ReadMessageHistory).toBeDefined();
			expect(PermissionFlagsBits.AttachFiles).toBeDefined();
			expect(PermissionFlagsBits.EmbedLinks).toBeDefined();
			expect(PermissionFlagsBits.ManageMessages).toBeDefined();
		});

		it("should use correct overwrite types", () => {
			expect(OverwriteType.Role).toBe(0);
			expect(OverwriteType.Member).toBe(1);
		});
	});

	describe("button custom IDs", () => {
		it("should use consistent button IDs", () => {
			// Verify button IDs match what we expect to handle
			const message = createTicketButtonMessage();
			const row = message.components[0];
			if (!row) {
				throw new Error("Expected row to be defined");
			}

			const createButton = row.components[0] as { custom_id?: string } | undefined;
			if (!createButton) {
				throw new Error("Expected button to be defined");
			}
			expect(createButton.custom_id).toBe("ticket_create");
		});
	});
});
