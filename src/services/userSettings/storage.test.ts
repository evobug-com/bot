import { describe, expect, it } from "bun:test";
import { getUserSettings, setStoryWorkEnabled, isStoryWorkEnabled } from "./storage.ts";

describe("User Settings Storage", () => {
	// Use unique IDs for each test to avoid conflicts
	const getTestUserId = () => `test-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;

	describe("getUserSettings", () => {
		it("should return default settings for new user", () => {
			const discordId = getTestUserId();
			const settings = getUserSettings(discordId);

			expect(settings.discordId).toBe(discordId);
			expect(settings.storyWorkEnabled).toBe(true);
		});

		it("should return saved settings for existing user", () => {
			const discordId = getTestUserId();

			// Set to false
			setStoryWorkEnabled(discordId, false);

			const settings = getUserSettings(discordId);
			expect(settings.storyWorkEnabled).toBe(false);
		});
	});

	describe("setStoryWorkEnabled", () => {
		it("should save setting for new user", () => {
			const discordId = getTestUserId();

			setStoryWorkEnabled(discordId, false);

			const settings = getUserSettings(discordId);
			expect(settings.storyWorkEnabled).toBe(false);
		});

		it("should update setting for existing user", () => {
			const discordId = getTestUserId();

			// First set to false
			setStoryWorkEnabled(discordId, false);
			expect(getUserSettings(discordId).storyWorkEnabled).toBe(false);

			// Then set to true
			setStoryWorkEnabled(discordId, true);
			expect(getUserSettings(discordId).storyWorkEnabled).toBe(true);

			// Then set back to false
			setStoryWorkEnabled(discordId, false);
			expect(getUserSettings(discordId).storyWorkEnabled).toBe(false);
		});
	});

	describe("isStoryWorkEnabled", () => {
		it("should return true for new user (default)", () => {
			const discordId = getTestUserId();
			expect(isStoryWorkEnabled(discordId)).toBe(true);
		});

		it("should return false when user disabled stories", () => {
			const discordId = getTestUserId();
			setStoryWorkEnabled(discordId, false);
			expect(isStoryWorkEnabled(discordId)).toBe(false);
		});

		it("should return true when user enabled stories", () => {
			const discordId = getTestUserId();
			setStoryWorkEnabled(discordId, false);
			setStoryWorkEnabled(discordId, true);
			expect(isStoryWorkEnabled(discordId)).toBe(true);
		});
	});

	describe("Multiple users", () => {
		it("should maintain separate settings per user", () => {
			const user1 = getTestUserId();
			const user2 = getTestUserId();
			const user3 = getTestUserId();

			// Set different values for each user
			setStoryWorkEnabled(user1, true);
			setStoryWorkEnabled(user2, false);
			// user3 keeps default

			// Verify each user has their own setting
			expect(isStoryWorkEnabled(user1)).toBe(true);
			expect(isStoryWorkEnabled(user2)).toBe(false);
			expect(isStoryWorkEnabled(user3)).toBe(true); // default
		});
	});
});
