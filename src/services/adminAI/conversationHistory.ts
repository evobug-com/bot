/* eslint-disable no-await-in-loop -- Sequential walk: each fetch depends on the previous reference */
import type { Message } from "discord.js";
import { createLogger } from "../../util/logger.ts";

const log = createLogger("AdminAI");

const MAX_HISTORY_DEPTH = 10;

export interface HistoryMessage {
	role: "user" | "assistant";
	content: string;
}

export async function gatherConversationHistory(
	message: Message,
	botUserId: string,
): Promise<HistoryMessage[]> {
	const history: HistoryMessage[] = [];
	let current = await safeFetchReference(message);
	let depth = 0;

	while (current && depth < MAX_HISTORY_DEPTH) {
		const isBot = current.author.id === botUserId;
		const isOriginalAsker = current.author.id === message.author.id;

		if (!isBot && !isOriginalAsker) {
			break;
		}

		const content = extractContent(current, botUserId);
		if (content) {
			history.unshift({
				role: isBot ? "assistant" : "user",
				content,
			});
		}

		current = await safeFetchReference(current);
		depth++;
	}

	return history;
}

async function safeFetchReference(message: Message): Promise<Message | null> {
	if (!message.reference?.messageId) return null;
	try {
		return await message.fetchReference();
	} catch (error) {
		log("warn", "Failed to fetch message reference:", error);
		return null;
	}
}

function extractContent(message: Message, botUserId: string): string {
	let content = message.content
		.replace(new RegExp(`<@!?${botUserId}>`, "g"), "")
		.trim();

	if (!content && message.embeds.length > 0) {
		const first = message.embeds[0];
		if (first?.description) {
			content = `(predchozi navrh akci: ${first.description.slice(0, 500)})`;
		} else if (first?.title) {
			content = `(${first.title})`;
		}
	}

	return content;
}
