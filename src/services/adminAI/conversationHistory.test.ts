import { describe, expect, it, mock } from "bun:test";
import type { Message } from "discord.js";
import { gatherConversationHistory } from "./conversationHistory.ts";

const BOT_ID = "bot-1";
const USER_ID = "user-1";

interface FakeMessage {
	id: string;
	authorId: string;
	content: string;
	embeds: Array<{ description?: string; title?: string }>;
	parentId: string | null;
}

function buildChain(messages: FakeMessage[]): Message {
	const byId = new Map(messages.map((m) => [m.id, m]));

	function toDiscordMessage(m: FakeMessage): Message {
		const reference = m.parentId ? { messageId: m.parentId } : null;
		const fetchReference = mock(async () => {
			const parent = m.parentId ? byId.get(m.parentId) : null;
			if (!parent) throw new Error("not found");
			return toDiscordMessage(parent);
		});

		return {
			id: m.id,
			author: { id: m.authorId },
			content: m.content,
			embeds: m.embeds,
			reference,
			fetchReference,
		} as unknown as Message;
	}

	const last = messages.at(-1);
	if (!last) throw new Error("empty chain");
	return toDiscordMessage(last);
}

describe("gatherConversationHistory", () => {
	it("returns empty when message has no reference", async () => {
		const msg = buildChain([
			{ id: "m1", authorId: USER_ID, content: "hi", embeds: [], parentId: null },
		]);

		const result = await gatherConversationHistory(msg, BOT_ID);

		expect(result).toEqual([]);
	});

	it("walks single bot reply", async () => {
		const msg = buildChain([
			{ id: "m1", authorId: USER_ID, content: `<@${BOT_ID}> add channel`, embeds: [], parentId: null },
			{ id: "m2", authorId: BOT_ID, content: "Which category?", embeds: [], parentId: "m1" },
			{ id: "m3", authorId: USER_ID, content: `<@${BOT_ID}> Main`, embeds: [], parentId: "m2" },
		]);

		const result = await gatherConversationHistory(msg, BOT_ID);

		expect(result).toEqual([
			{ role: "user", content: "add channel" },
			{ role: "assistant", content: "Which category?" },
		]);
	});

	it("strips bot mention from user messages", async () => {
		const msg = buildChain([
			{ id: "m1", authorId: USER_ID, content: `hello <@!${BOT_ID}> world`, embeds: [], parentId: null },
			{ id: "m2", authorId: BOT_ID, content: "ack", embeds: [], parentId: "m1" },
			{ id: "m3", authorId: USER_ID, content: "follow up", embeds: [], parentId: "m2" },
		]);

		const result = await gatherConversationHistory(msg, BOT_ID);

		expect(result[0]).toEqual({ role: "user", content: "hello  world" });
	});

	it("stops walking when chain reaches a third party", async () => {
		const msg = buildChain([
			{ id: "m0", authorId: "stranger", content: "unrelated", embeds: [], parentId: null },
			{ id: "m1", authorId: USER_ID, content: "ask", embeds: [], parentId: "m0" },
			{ id: "m2", authorId: BOT_ID, content: "reply", embeds: [], parentId: "m1" },
			{ id: "m3", authorId: USER_ID, content: "more", embeds: [], parentId: "m2" },
		]);

		const result = await gatherConversationHistory(msg, BOT_ID);

		expect(result).toEqual([
			{ role: "user", content: "ask" },
			{ role: "assistant", content: "reply" },
		]);
	});

	it("represents embed-only bot messages with a stub", async () => {
		const msg = buildChain([
			{ id: "m1", authorId: USER_ID, content: "create chan", embeds: [], parentId: null },
			{
				id: "m2",
				authorId: BOT_ID,
				content: "",
				embeds: [{ description: "Create text channel \"foo\" in Main" }],
				parentId: "m1",
			},
			{ id: "m3", authorId: USER_ID, content: "wait, change name", embeds: [], parentId: "m2" },
		]);

		const result = await gatherConversationHistory(msg, BOT_ID);

		expect(result[1]?.role).toBe("assistant");
		expect(result[1]?.content).toContain("predchozi navrh akci");
		expect(result[1]?.content).toContain("foo");
	});

	it("caps depth at 10 hops", async () => {
		const chain: FakeMessage[] = [];
		for (let i = 0; i < 15; i++) {
			chain.push({
				id: `m${i}`,
				authorId: i % 2 === 0 ? USER_ID : BOT_ID,
				content: `msg ${i}`,
				embeds: [],
				parentId: i === 0 ? null : `m${i - 1}`,
			});
		}
		const msg = buildChain(chain);

		const result = await gatherConversationHistory(msg, BOT_ID);

		expect(result.length).toBeLessThanOrEqual(10);
	});
});
