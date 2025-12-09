import { beforeEach, describe, expect, it } from "bun:test";
import type { Message } from "discord.js";
import {
	addToContextCache,
	channelContextCache,
	getPreviousMessages,
	MAX_CONTEXT_MESSAGES,
} from "./handleMessageModeration.js";

/** Create a mock message for testing */
function createMockMessage(channelId: string, author: string, content: string): Message {
	return {
		channel: { id: channelId },
		author: {
			displayName: author,
			username: author.toLowerCase(),
		},
		content,
	} as unknown as Message;
}

describe("handleMessageModeration context cache", () => {
	beforeEach(() => {
		// Clear the cache before each test
		channelContextCache.clear();
	});

	describe("addToContextCache", () => {
		it("adds a message to an empty cache", () => {
			const message = createMockMessage("channel-1", "Alice", "Hello world");

			addToContextCache(message);

			const cache = channelContextCache.get("channel-1")!;
			expect(cache).toBeDefined();
			expect(cache).toHaveLength(1);
			expect(cache[0]).toEqual({ author: "Alice", content: "Hello world" });
		});

		it("adds multiple messages to the same channel", () => {
			const msg1 = createMockMessage("channel-1", "Alice", "First message");
			const msg2 = createMockMessage("channel-1", "Bob", "Second message");
			const msg3 = createMockMessage("channel-1", "Charlie", "Third message");

			addToContextCache(msg1);
			addToContextCache(msg2);
			addToContextCache(msg3);

			const cache = channelContextCache.get("channel-1")!;
			expect(cache).toHaveLength(3);
			expect(cache[0]!.author).toBe("Alice");
			expect(cache[1]!.author).toBe("Bob");
			expect(cache[2]!.author).toBe("Charlie");
		});

		it("keeps messages separate per channel", () => {
			const msg1 = createMockMessage("channel-1", "Alice", "In channel 1");
			const msg2 = createMockMessage("channel-2", "Bob", "In channel 2");

			addToContextCache(msg1);
			addToContextCache(msg2);

			const cache1 = channelContextCache.get("channel-1")!;
			const cache2 = channelContextCache.get("channel-2")!;

			expect(cache1).toHaveLength(1);
			expect(cache2).toHaveLength(1);
			expect(cache1[0]!.author).toBe("Alice");
			expect(cache2[0]!.author).toBe("Bob");
		});

		it("enforces MAX_CONTEXT_MESSAGES limit by removing oldest", () => {
			// Add MAX_CONTEXT_MESSAGES + 2 messages
			for (let i = 0; i < MAX_CONTEXT_MESSAGES + 2; i++) {
				const msg = createMockMessage("channel-1", `User${i}`, `Message ${i}`);
				addToContextCache(msg);
			}

			const cache = channelContextCache.get("channel-1")!;
			expect(cache).toHaveLength(MAX_CONTEXT_MESSAGES);

			// Oldest messages should be removed, newest should be at the end
			expect(cache[0]!.content).toBe("Message 2");
			expect(cache[MAX_CONTEXT_MESSAGES - 1]!.content).toBe(`Message ${MAX_CONTEXT_MESSAGES + 1}`);
		});

		it("truncates long messages to 500 characters", () => {
			const longContent = "x".repeat(600);
			const msg = createMockMessage("channel-1", "Alice", longContent);

			addToContextCache(msg);

			const cache = channelContextCache.get("channel-1")!;
			expect(cache[0]!.content).toHaveLength(500);
		});

		it("uses displayName when available, falls back to username", () => {
			const msgWithDisplayName = {
				channel: { id: "channel-1" },
				author: {
					displayName: "Cool Nickname",
					username: "boring_username",
				},
				content: "Hello",
			} as unknown as Message;

			const msgWithoutDisplayName = {
				channel: { id: "channel-1" },
				author: {
					displayName: null,
					username: "just_username",
				},
				content: "World",
			} as unknown as Message;

			addToContextCache(msgWithDisplayName);
			addToContextCache(msgWithoutDisplayName);

			const cache = channelContextCache.get("channel-1")!;
			expect(cache[0]!.author).toBe("Cool Nickname");
			expect(cache[1]!.author).toBe("just_username");
		});
	});

	describe("getPreviousMessages", () => {
		it("returns empty array for non-existent channel", () => {
			const result = getPreviousMessages("non-existent");
			expect(result).toEqual([]);
		});

		it("returns empty array when cache has only one message", () => {
			const msg = createMockMessage("channel-1", "Alice", "Only message");
			addToContextCache(msg);

			const result = getPreviousMessages("channel-1");
			expect(result).toEqual([]);
		});

		it("returns all messages except the last one", () => {
			const msg1 = createMockMessage("channel-1", "Alice", "First");
			const msg2 = createMockMessage("channel-1", "Bob", "Second");
			const msg3 = createMockMessage("channel-1", "Charlie", "Third (current)");

			addToContextCache(msg1);
			addToContextCache(msg2);
			addToContextCache(msg3);

			const result = getPreviousMessages("channel-1");

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ author: "Alice", content: "First" });
			expect(result[1]).toEqual({ author: "Bob", content: "Second" });
		});

		it("returns up to MAX_CONTEXT_MESSAGES - 1 previous messages", () => {
			// Fill the cache to max
			for (let i = 0; i < MAX_CONTEXT_MESSAGES; i++) {
				const msg = createMockMessage("channel-1", `User${i}`, `Message ${i}`);
				addToContextCache(msg);
			}

			const result = getPreviousMessages("channel-1");

			// Should return all except the last one
			expect(result).toHaveLength(MAX_CONTEXT_MESSAGES - 1);
		});
	});

	describe("MAX_CONTEXT_MESSAGES", () => {
		it("is set to 5", () => {
			expect(MAX_CONTEXT_MESSAGES).toBe(5);
		});
	});
});
