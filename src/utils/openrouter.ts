import OpenAI from "openai";
import { rulesText } from "../data/rulesData.ts";

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
		const systemPrompt = `# Role and Objective
- Assess if the last 'User' message in a conversation contains unsafe content according to our safety policy categories.

# Instructions
- Review only the last 'User' message provided in the conversation.
- All messages are in Czech or Slovak.
- Evaluate the content strictly against the listed <UNSAFE_CONTENT_CATEGORIES>.

## Category Reference
<UNSAFE_CONTENT_CATEGORIES>
${rulesText}
</UNSAFE_CONTENT_CATEGORIES>

# Output Format
- Line 1: Output 'safe' or 'unsafe'.
- Line 2 (ONLY if 'unsafe'): List only the numbers (comma-separated, ascending order) for violated categories (e.g., '1,2,5'), with no additional text.
- If the message is 'safe', output only 'safe' on a single line.
- Output must be plain text only, never use extra formatting like JSON, XML, or Markdown.

# Output Checklist
- if the message does not violate categories, output only 'safe'.
- If unsafe content is detected, output 'unsafe' and list violated category numbers on the next line.

# Reasoning Effort
- Set reasoning_effort to minimal; strictly follow category rules without additional interpretation or verbosity.`;

		const response = await openrouter.chat.completions.create({
			model: "openai/gpt-5-nano",
			messages: [
				{
					role: "system",
					content: systemPrompt,
				},
                {
                    role: "user",
                    content: content,
                }
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

		// If we can't parse the response, assume safe
		console.warn("[OpenRouter] Unexpected response format:", result);
		return null;
	} catch (error) {
		console.error("OpenRouter moderation error:", error);
		return null;
	}
}
