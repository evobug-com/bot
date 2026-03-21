import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { getAdminIds, isAdmin } from "./admin.ts";

describe("admin utils", () => {
	let originalAdminIds: string | undefined;

	beforeEach(() => {
		originalAdminIds = process.env.ADMIN_IDS;
	});

	afterEach(() => {
		if (originalAdminIds !== undefined) {
			process.env.ADMIN_IDS = originalAdminIds;
		} else {
			delete process.env.ADMIN_IDS;
		}
	});

	describe("getAdminIds", () => {
		it("parses comma-separated IDs", () => {
			process.env.ADMIN_IDS = "123, 456, 789";
			expect(getAdminIds()).toEqual(["123", "456", "789"]);
		});

		it("returns empty array when ADMIN_IDS is not set", () => {
			delete process.env.ADMIN_IDS;
			expect(getAdminIds()).toEqual([]);
		});

		it("returns empty array when ADMIN_IDS is empty string", () => {
			process.env.ADMIN_IDS = "";
			expect(getAdminIds()).toEqual([]);
		});

		it("handles single ID without commas", () => {
			process.env.ADMIN_IDS = "123";
			expect(getAdminIds()).toEqual(["123"]);
		});
	});

	describe("isAdmin", () => {
		it("returns true for admin user", () => {
			process.env.ADMIN_IDS = "111, 222, 333";
			expect(isAdmin("222")).toBe(true);
		});

		it("returns false for non-admin user", () => {
			process.env.ADMIN_IDS = "111, 222, 333";
			expect(isAdmin("999")).toBe(false);
		});

		it("returns false when ADMIN_IDS is not set", () => {
			delete process.env.ADMIN_IDS;
			expect(isAdmin("123")).toBe(false);
		});
	});
});
