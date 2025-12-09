import { describe, expect, it } from "bun:test";
import {
	buildUserMessage,
	type ModerationContext,
	MODERATION_SYSTEM_PROMPT,
	parseResponse,
} from "./openrouter.js";

describe("openrouter moderation", () => {
	describe("buildUserMessage", () => {
		it("builds message with only current content", () => {
			const result = buildUserMessage("Hello world");

			expect(result).toBe("<current_message>\nHello world\n</current_message>");
		});

		it("includes previous messages when provided", () => {
			const context: ModerationContext = {
				previousMessages: [
					{ author: "Alice", content: "First message" },
					{ author: "Bob", content: "Second message" },
				],
			};

			const result = buildUserMessage("Current message", context);

			expect(result).toContain("<previous_messages>");
			expect(result).toContain("Alice: First message");
			expect(result).toContain("Bob: Second message");
			expect(result).toContain("</previous_messages>");
			expect(result).toContain("<current_message>\nCurrent message\n</current_message>");
		});

		it("includes reply context when provided", () => {
			const context: ModerationContext = {
				replyTo: { author: "Charlie", content: "Original message" },
			};

			const result = buildUserMessage("My reply", context);

			expect(result).toContain("<reply_to>");
			expect(result).toContain("Charlie: Original message");
			expect(result).toContain("</reply_to>");
			expect(result).toContain("<current_message>\nMy reply\n</current_message>");
		});

		it("includes both previous messages and reply context", () => {
			const context: ModerationContext = {
				previousMessages: [{ author: "Alice", content: "Earlier" }],
				replyTo: { author: "Bob", content: "Reply target" },
			};

			const result = buildUserMessage("Current", context);

			expect(result).toContain("<previous_messages>");
			expect(result).toContain("<reply_to>");
			expect(result).toContain("<current_message>");

			// Check order: previous_messages, then reply_to, then current_message
			const prevIndex = result.indexOf("<previous_messages>");
			const replyIndex = result.indexOf("<reply_to>");
			const currentIndex = result.indexOf("<current_message>");

			expect(prevIndex).toBeLessThan(replyIndex);
			expect(replyIndex).toBeLessThan(currentIndex);
		});

		it("handles empty previous messages array", () => {
			const context: ModerationContext = {
				previousMessages: [],
			};

			const result = buildUserMessage("Test", context);

			expect(result).not.toContain("<previous_messages>");
			expect(result).toBe("<current_message>\nTest\n</current_message>");
		});

		it("handles special characters in content", () => {
			const context: ModerationContext = {
				previousMessages: [{ author: "User<script>", content: 'alert("xss")' }],
			};

			const result = buildUserMessage("Test <tag>", context);

			expect(result).toContain('User<script>: alert("xss")');
			expect(result).toContain("Test <tag>");
		});

		it("handles multi-line content", () => {
			const multiLineContent = "Line 1\nLine 2\nLine 3";

			const result = buildUserMessage(multiLineContent);

			expect(result).toBe(`<current_message>\n${multiLineContent}\n</current_message>`);
		});
	});

	describe("parseResponse", () => {
		it("parses 'safe' response correctly", () => {
			const result = parseResponse("safe");

			expect(result).toEqual({
				isFlagged: false,
				categories: [],
			});
		});

		it("parses 'safe' with extra whitespace", () => {
			const result = parseResponse("  safe  \n");

			expect(result).toEqual({
				isFlagged: false,
				categories: [],
			});
		});

		it("parses 'Safe' case-insensitively", () => {
			const result = parseResponse("SAFE");

			expect(result).toEqual({
				isFlagged: false,
				categories: [],
			});
		});

		it("parses 'unsafe' with single category", () => {
			const result = parseResponse("unsafe\n101");

			expect(result).not.toBeNull();
			expect(result?.isFlagged).toBe(true);
			expect(result?.categories).toEqual(["101"]);
			expect(result?.reason).toContain("101");
		});

		it("parses 'unsafe' with multiple categories", () => {
			const result = parseResponse("unsafe\n101,201,301");

			expect(result).not.toBeNull();
			expect(result?.isFlagged).toBe(true);
			expect(result?.categories).toEqual(["101", "201", "301"]);
		});

		it("parses 'unsafe' with categories containing spaces", () => {
			const result = parseResponse("unsafe\n101, 201, 301");

			expect(result).not.toBeNull();
			expect(result?.categories).toEqual(["101", "201", "301"]);
		});

		it("parses 'Unsafe' case-insensitively", () => {
			const result = parseResponse("UNSAFE\n101");

			expect(result).not.toBeNull();
			expect(result?.isFlagged).toBe(true);
		});

		it("returns null for unexpected response format", () => {
			const result = parseResponse("maybe\n101");

			expect(result).toBeNull();
		});

		it("returns null for empty response", () => {
			const result = parseResponse("");

			expect(result).toBeNull();
		});

		it("handles 'unsafe' with no categories", () => {
			const result = parseResponse("unsafe");

			expect(result).not.toBeNull();
			expect(result?.isFlagged).toBe(true);
			expect(result?.categories).toEqual([""]);
		});

		it("includes rule text in reason when category matches", () => {
			// Category 101 is "Respekt. Žádná šikana..."
			const result = parseResponse("unsafe\n101");

			expect(result?.reason).toContain("Porušení:");
			expect(result?.reason).toContain("101");
		});

		it("falls back to category number if rule not found", () => {
			const result = parseResponse("unsafe\n999");

			expect(result?.reason).toContain("999");
		});
	});

	describe("MODERATION_SYSTEM_PROMPT", () => {
		it("contains rules reference", () => {
			expect(MODERATION_SYSTEM_PROMPT).toContain("<rules>");
			expect(MODERATION_SYSTEM_PROMPT).toContain("</rules>");
		});

		it("contains output format instructions", () => {
			expect(MODERATION_SYSTEM_PROMPT).toContain("safe");
			expect(MODERATION_SYSTEM_PROMPT).toContain("unsafe");
		});

		it("mentions current_message tag", () => {
			expect(MODERATION_SYSTEM_PROMPT).toContain("<current_message>");
		});

		it("mentions context tags", () => {
			expect(MODERATION_SYSTEM_PROMPT).toContain("<previous_messages>");
			expect(MODERATION_SYSTEM_PROMPT).toContain("<reply_to>");
		});

		it("is static (for prompt caching)", () => {
			// The system prompt should not change between calls
			// This is tested by ensuring it contains the rules text directly
			expect(MODERATION_SYSTEM_PROMPT).toContain("PRAVIDLA SERVERU");
		});
	});
});
