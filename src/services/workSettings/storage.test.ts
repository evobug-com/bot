import { describe, test, expect, beforeEach } from "bun:test";
import {
	getWorkSettings,
	setAIStoryEnabled,
	setStoryChancePercent,
	isAIStoryEnabled,
	getStoryChancePercent,
} from "./storage";

describe("Work Settings Storage", () => {
	beforeEach(() => {
		// Reset to defaults for each test
		setAIStoryEnabled(false);
		setStoryChancePercent(20);
	});

	describe("getWorkSettings", () => {
		test("returns default settings", () => {
			const settings = getWorkSettings();
			expect(settings.aiStoryEnabled).toBe(false);
			expect(settings.storyChancePercent).toBe(20);
		});
	});

	describe("setAIStoryEnabled", () => {
		test("enables AI stories", () => {
			setAIStoryEnabled(true);
			expect(isAIStoryEnabled()).toBe(true);
		});

		test("disables AI stories", () => {
			setAIStoryEnabled(true);
			setAIStoryEnabled(false);
			expect(isAIStoryEnabled()).toBe(false);
		});
	});

	describe("setStoryChancePercent", () => {
		test("sets story chance percentage", () => {
			setStoryChancePercent(50);
			expect(getStoryChancePercent()).toBe(50);
		});

		test("clamps value to 0", () => {
			setStoryChancePercent(-10);
			expect(getStoryChancePercent()).toBe(0);
		});

		test("clamps value to 100", () => {
			setStoryChancePercent(150);
			expect(getStoryChancePercent()).toBe(100);
		});

		test("rounds to nearest integer", () => {
			setStoryChancePercent(33.7);
			expect(getStoryChancePercent()).toBe(34);
		});
	});

	describe("isAIStoryEnabled", () => {
		test("returns false by default", () => {
			expect(isAIStoryEnabled()).toBe(false);
		});

		test("returns true after enabling", () => {
			setAIStoryEnabled(true);
			expect(isAIStoryEnabled()).toBe(true);
		});
	});

	describe("getStoryChancePercent", () => {
		test("returns default value", () => {
			expect(getStoryChancePercent()).toBe(20);
		});

		test("returns updated value", () => {
			setStoryChancePercent(75);
			expect(getStoryChancePercent()).toBe(75);
		});
	});
});
