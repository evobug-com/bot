import OpenAI from "openai";
import {rulesText} from "../data/rulesData.ts";

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openrouterApiKey) {
	console.warn("OPENROUTER_API_KEY not set - message moderation will be disabled");
}

export const openrouter = openrouterApiKey
	? new OpenAI({
			apiKey: openrouterApiKey,
			baseURL: "https://openrouter.ai/api/v1",
			defaultHeaders: {
                "HTTP-Referer": "https://allcom.zone/",
				"X-Title": "Allcom Discord Bot",
			},
		})
	: null;

export interface ModerationResult {
	isFlagged: boolean;
	categories: string[];
	reason?: string;
}

export async function moderateMessage(content: string): Promise<ModerationResult | null> {
	if (!openrouter) {
		return null;
	}

	try {
		const systemPrompt = `Task: Check if there is unsafe content in 'User' messages in conversations according to our safety policy with the below categories.

<UNSAFE_CONTENT_CATEGORIES>
${rulesText}
</UNSAFE_CONTENT_CATEGORIES>

<CONVERSATION>
User: ${content}
</CONVERSATION>

Provide your safety assessment for ONLY THE ONLY CZECH/SLOVAK USER LAST MESSAGE in CONVERSATION:
- First line must read 'safe' or 'unsafe'.
- If unsafe, a second line must include a comma-separated list of violated categories using only numbers.`;

        console.log("[OpenRouter] Sending moderation request...", systemPrompt);
		const response = await openrouter.chat.completions.create({
			model: "openai/gpt-5-nano",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
			],
			temperature: 0,
		});

		const result = response.choices[0]?.message?.content;
		if (!result) {
			return null;
		}

		// Llama Guard returns plain text response
		const lines = result.trim().toLowerCase().split("\n");
		const status = lines[0];

		if (status === "safe") {
			return {
				isFlagged: false,
				categories: [],
			};
		} else if (status === "unsafe") {
			// Parse categories from second line (e.g., "101,404,1001")
			const categoriesLine = lines[1] || "";
			const categories = categoriesLine
				.split(",")
				.map((c) => c.trim())

			const categoryNames = categories.map((c) => {
                // Find line with number in rulesText
                return rulesText.split("\n").find((line) => line.trim().startsWith(c))?.trim() || c;
            });

			return {
				isFlagged: true,
				categories,
				reason: `Porušení:\n${categoryNames.join("\n")}`,
			};
		}

		// If we can't parse the response, assume safe
		console.warn("[OpenRouter] Unexpected response format:", result);
		return null;
	} catch (error) {
		console.error("OpenRouter moderation error:", error);
		return null;
	}
}
