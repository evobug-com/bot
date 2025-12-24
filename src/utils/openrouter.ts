import { OpenRouter } from "@openrouter/sdk";
import { rulesText } from "../data/rulesData.ts";

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openrouterApiKey) {
	console.warn("OPENROUTER_API_KEY not set - message moderation will be disabled");
}

export const openrouter = openrouterApiKey
	? new OpenRouter({
			apiKey: openrouterApiKey,
		})
	: null;

export interface ModerationResult {
	isFlagged: boolean;
	categories: string[];
	reason?: string;
}

/** Context message for moderation - provides conversation history */
export interface ContextMessage {
	author: string;
	content: string;
}

/** Full moderation context including conversation history and reply info */
export interface ModerationContext {
	/** Previous messages in the channel (oldest first, max 3) */
	previousMessages?: ContextMessage[];
	/** If this is a reply, the message being replied to */
	replyTo?: ContextMessage;
}

/** Reasoning effort levels for GPT-5 series */
export type ReasoningEffort = "high" | "medium" | "low" | "minimal" | "none";

/** Options for the moderation function */
export interface ModerationOptions {
	/** Enable reasoning for better accuracy. Defaults to false. */
	useReasoning?: boolean;
	/** Reasoning effort level. Defaults to "low". */
	reasoningEffort?: ReasoningEffort;
}

// Static system prompt - stays identical for OpenRouter prompt caching
export const MODERATION_SYSTEM_PROMPT = `# Role and Objective
Assess if <current_message> contains unsafe content according to our safety policy.

# Instructions
- Review ONLY the content in <current_message> tag.
- Use <previous_messages> and <reply_to> as context to understand the conversation, but do NOT evaluate them.
- All messages are in Czech or Slovak.
- Consider context when determining violations (e.g., "agreed" as reply to toxic message may be problematic).

# Category Reference
<rules>
${rulesText}
</rules>

# Output Format
- Line 1: Output 'safe' or 'unsafe'.
- Line 2 (ONLY if 'unsafe'): List violated category numbers comma-separated in ascending order (e.g., '101,201').
- If 'safe', output only 'safe' on a single line.
- Plain text only, no JSON/XML/Markdown formatting.`;

/** Build user message with context in XML-like tags */
export function buildUserMessage(content: string, context?: ModerationContext): string {
	let userMessage = "";

	// Add previous messages context if available
	if (context?.previousMessages?.length) {
		userMessage += "<previous_messages>\n";
		for (const msg of context.previousMessages) {
			userMessage += `${msg.author}: ${msg.content}\n`;
		}
		userMessage += "</previous_messages>\n\n";
	}

	// Add reply context if this is a reply
	if (context?.replyTo) {
		userMessage += `<reply_to>\n${context.replyTo.author}: ${context.replyTo.content}\n</reply_to>\n\n`;
	}

	// Add the current message to evaluate
	userMessage += `<current_message>\n${content}\n</current_message>`;

	return userMessage;
}

/** Parse AI response into ModerationResult */
export function parseResponse(response: string): ModerationResult | null {
	const lines = response.trim().toLowerCase().split("\n");
	const status = lines[0];

	if (status === "safe") {
		return {
			isFlagged: false,
			categories: [],
		};
	}

	if (status === "unsafe") {
		// Parse categories from second line (e.g., "101,404,1001")
		const categoriesLine = lines[1] || "";
		const categories = categoriesLine.split(",").map((c) => c.trim());

		const categoryNames = categories.map((c) => {
			// Find line with number in rulesText
			return (
				rulesText
					.split("\n")
					.find((line) => line.trim().startsWith(c))
					?.trim() || c
			);
		});

		return {
			isFlagged: true,
			categories,
			reason: `Porušení:\n${categoryNames.join("\n")}`,
		};
	}

	// If we can't parse the response, return null
	console.warn("[OpenRouter] Unexpected response format:", response);
	return null;
}

/** Default moderation options */
const DEFAULT_OPTIONS: Required<ModerationOptions> = {
	useReasoning: false,
	reasoningEffort: "low",
};

export async function moderateMessage(
	content: string,
	context?: ModerationContext,
	options?: ModerationOptions,
): Promise<ModerationResult | null> {
	if (!openrouter) {
		return null;
	}

	const opts = { ...DEFAULT_OPTIONS, ...options };

	try {
		const userMessage = buildUserMessage(content, context);

		const response = await openrouter.chat.send({
			model: "openai/gpt-5-mini",
			messages: [
				{
					role: "system",
					content: MODERATION_SYSTEM_PROMPT,
				},
				{
					role: "user",
					content: userMessage,
				},
			],
			temperature: 0,
			// OpenRouter-specific reasoning parameter
			...(opts.useReasoning && {
				reasoning: {
					effort: opts.reasoningEffort,
				},
			}),
		});

		const rawContent = response.choices?.[0]?.message?.content;
		if (!rawContent) {
			return null;
		}

		// Extract text content (can be string or array of content items)
		let result: string;
		if (typeof rawContent === "string") {
			result = rawContent;
		} else if (Array.isArray(rawContent)) {
			const textItems = rawContent
				.filter((item): item is { type: "text"; text: string } => item.type === "text")
				.map((item) => item.text);
			result = textItems.join("");
		} else {
			return null;
		}

		return parseResponse(result);
	} catch (error) {
		console.error("OpenRouter moderation error:", error);
		return null;
	}
}
