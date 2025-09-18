import OpenAI from "openai";

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

if (!openrouterApiKey) {
	console.warn("OPENROUTER_API_KEY not set - message moderation will be disabled");
}

export const openrouter = openrouterApiKey
	? new OpenAI({
			apiKey: openrouterApiKey,
			baseURL: "https://openrouter.ai/api/v1",
			defaultHeaders: {
				"X-Title": "EvoBug Discord Bot",
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
		const response = await openrouter.chat.completions.create({
			model: "meta-llama/llama-guard-4-12b",
			messages: [
				{
					role: "system",
					content: `You are a content moderation assistant for a Discord server. Review the following message in Czech or Slovak language and determine if it violates Discord's community guidelines.

Discord prohibits:
- Hate speech, harassment, or bullying
- Threats of violence or self-harm
- Sexually explicit content involving minors
- Spam, scams, or phishing
- Sharing personal information without consent
- Illegal activities

Respond with a JSON object containing:
- "flagged": boolean (true if content violates rules)
- "categories": array of violated categories (if any)
- "reason": brief explanation in Czech/Slovak (if flagged)`,
				},
				{
					role: "user",
					content: `Please review this message: "${content}"`,
				},
			],
			temperature: 0,
			max_tokens: 200,
			response_format: { type: "json_object" },
		});

		const result = response.choices[0]?.message?.content;
		if (!result) {
			return null;
		}

		const parsed = JSON.parse(result);
		return {
			isFlagged: parsed.flagged === true,
			categories: parsed.categories || [],
			reason: parsed.reason,
		};
	} catch (error) {
		console.error("OpenRouter moderation error:", error);
		return null;
	}
}
