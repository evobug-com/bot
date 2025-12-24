/**
 * Story Image Generator
 *
 * Generates meme-style images for completed branching stories using OpenRouter's
 * google/gemini-2.5-flash-image model.
 */

import { openrouter } from "./openrouter";
import type { StorySession, StoryActionResult, BranchingStory } from "../util/storytelling/types";
import { createLogger } from "../util/logger";

const log = createLogger("StoryImageGenerator");

export interface ImageGenerationResult {
	imageUrl: string | null;
	error?: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		estimatedCost: number;
	};
}

/**
 * Build a prompt for the image generation model
 */
function buildImagePrompt(
	story: BranchingStory,
	session: StorySession,
	result: StoryActionResult,
	username: string,
): string {
	// Build the story journey description
	const journeyParts: string[] = [];

	for (const entry of session.choiceHistory) {
		const chosenOption = entry.options[entry.choice];
		journeyParts.push(`- ${entry.narrative}`);
		journeyParts.push(`  Volba: "${chosenOption.label}"`);
	}

	const journey = journeyParts.join("\n");
	const isPositive = result.finalResult?.isPositiveEnding ?? true;
	const coins = result.finalResult?.totalCoins ?? 0;

	return `Generate a funny MEME image for this story. ALL TEXT IN THE IMAGE MUST BE IN CZECH LANGUAGE.

STORY TITLE: ${story.title} ${story.emoji}
PLAYER: ${username}

STORY JOURNEY:
${journey}

ENDING: ${result.narrative}

RESULT: ${isPositive ? "POSITIVE" : "NEGATIVE"} (${coins >= 0 ? "+" : ""}${coins} coins)

IMAGE REQUIREMENTS:
- Style: Funny internet meme (like rage comics, wojak, or modern meme format)
- Language: Czech text on the image (this is critical!)
- Capture the key moment or punchline of the story
- If the ending is negative, show it humorously
- Include the player name "${username}" somewhere in the image
- Be creative and funny!`;
}

const MAX_RETRIES = 3;

/**
 * Generate a meme image for a completed story (with retry logic)
 */
export async function generateStoryImage(
	story: BranchingStory,
	session: StorySession,
	result: StoryActionResult,
	username: string,
): Promise<ImageGenerationResult> {
	if (!openrouter) {
		return {
			imageUrl: null,
			error: "OpenRouter API key not configured",
		};
	}

	const prompt = buildImagePrompt(story, session, result, username);

	log("info", `Generating image for story "${story.id}" for user "${username}"`);
	log("debug", `Prompt: ${prompt}`);

	let lastError: string | undefined;

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			// eslint-disable-next-line no-await-in-loop -- intentional retry logic
			const imageResult = await attemptImageGeneration(openrouter, story.id, prompt);

			if (imageResult.imageUrl) {
				return imageResult;
			}

			// No image but no error - retry
			lastError = imageResult.error ?? "No image generated in response";
			if (attempt < MAX_RETRIES) {
				log("warn", `No image in response for story "${story.id}", retrying (attempt ${attempt + 1}/${MAX_RETRIES})...`);
			}
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
			if (attempt < MAX_RETRIES) {
				log("warn", `Image generation failed for story "${story.id}": ${lastError}, retrying (attempt ${attempt + 1}/${MAX_RETRIES})...`);
			}
		}
	}

	log("error", `Failed to generate image for story "${story.id}" after ${MAX_RETRIES} attempts: ${lastError}`);
	return {
		imageUrl: null,
		error: lastError,
	};
}

/** Helper to build usage result from SDK response */
function buildUsageResult(usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined, estimatedCost: number) {
	if (!usage) return undefined;
	return {
		promptTokens: usage.promptTokens,
		completionTokens: usage.completionTokens,
		totalTokens: usage.totalTokens,
		estimatedCost,
	};
}

/** Response type from non-streaming chat.send */
interface ChatResponse {
	choices?: Array<{
		message?: {
			content?: string | Array<{ type: string; text?: string; [key: string]: unknown }>;
			[key: string]: unknown;
		};
	}>;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * Single attempt to generate an image
 */
async function attemptImageGeneration(
	client: NonNullable<typeof openrouter>,
	storyId: string,
	prompt: string,
): Promise<ImageGenerationResult> {
	// Cast response to non-streaming type (we don't use streaming)
	const response = await client.chat.send({
		model: "google/gemini-2.5-flash-image-preview",
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: prompt },
				],
			},
		],
		// @ts-expect-error - modalities is OpenRouter-specific for image generation
		modalities: ["text", "image"],
	}) as ChatResponse;

	// Log usage information
	const usage = response.usage;
	let estimatedCost = 0;

	if (usage) {
		// Gemini 2.5 Flash pricing (approximate): $0.10/1M input, $0.40/1M output
		const inputCost = (usage.promptTokens / 1_000_000) * 0.10;
		const outputCost = (usage.completionTokens / 1_000_000) * 0.40;
		estimatedCost = inputCost + outputCost;

		log("info", `Image generation usage - Prompt: ${usage.promptTokens}, Completion: ${usage.completionTokens}, Estimated cost: $${estimatedCost.toFixed(6)}`);
	}

	// Extract image from response
	const message = response.choices?.[0]?.message;

	// Check for images in the message.images field (OpenRouter format)
	const images = (message as unknown as { images?: Array<{ type: string; image_url: { url: string } }> })?.images;

	if (images && images.length > 0 && images[0]?.image_url?.url) {
		log("info", `Successfully generated image for story "${storyId}"`);
		return {
			imageUrl: images[0].image_url.url,
			usage: buildUsageResult(usage, estimatedCost),
		};
	}

	// Check if content is an array with image parts (Gemini format)
	const content = message?.content;
	if (Array.isArray(content)) {
		for (const part of content) {
			// Check for inline_data format (Gemini native)
			if (part && typeof part === "object" && "inline_data" in part) {
				const inlineData = (part as unknown as { inline_data: { mime_type: string; data: string } }).inline_data;
				if (inlineData?.data) {
					const imageUrl = `data:${inlineData.mime_type || "image/png"};base64,${inlineData.data}`;
					log("info", `Successfully generated image (inline_data) for story "${storyId}"`);
					return {
						imageUrl,
						usage: buildUsageResult(usage, estimatedCost),
					};
				}
			}
			// Check for image_url format in content array
			if (part && typeof part === "object" && "type" in part && part.type === "image_url") {
				const imageUrlPart = part as unknown as { type: string; image_url: { url: string } };
				if (imageUrlPart.image_url?.url) {
					log("info", `Successfully generated image (content array) for story "${storyId}"`);
					return {
						imageUrl: imageUrlPart.image_url.url,
						usage: buildUsageResult(usage, estimatedCost),
					};
				}
			}
		}
	}

	// Fallback: check if content is a base64 string directly
	if (content && typeof content === "string" && content.startsWith("data:image")) {
		log("info", `Successfully generated image (base64 string) for story "${storyId}"`);
		return {
			imageUrl: content,
			usage: buildUsageResult(usage, estimatedCost),
		};
	}

	// Log detailed response for debugging
	log("debug", `No image in response, structure: ${JSON.stringify(response.choices?.[0], null, 2)}`);
	return {
		imageUrl: null,
		error: "No image generated in response",
		usage: buildUsageResult(usage, estimatedCost),
	};
}

/**
 * Log image generation result to console (for testing)
 */
export function logImageGenerationResult(result: ImageGenerationResult): void {
	console.log("\n========== IMAGE GENERATION RESULT ==========");

	if (result.error) {
		console.log(`ERROR: ${result.error}`);
	}

	if (result.imageUrl) {
		const preview = result.imageUrl.length > 100
			? `${result.imageUrl.substring(0, 100)}...`
			: result.imageUrl;
		console.log(`IMAGE URL: ${preview}`);
	}

	if (result.usage) {
		console.log(`\nUSAGE:`);
		console.log(`  Prompt tokens: ${result.usage.promptTokens}`);
		console.log(`  Completion tokens: ${result.usage.completionTokens}`);
		console.log(`  Total tokens: ${result.usage.totalTokens}`);
		console.log(`  Estimated cost: $${result.usage.estimatedCost.toFixed(6)}`);
	}

	console.log("==============================================\n");
}
