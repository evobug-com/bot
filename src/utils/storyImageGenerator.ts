/**
 * Story Image Generator
 *
 * Generates meme-style images for completed branching stories using OpenRouter's
 * google/gemini-2.5-flash-image model via OpenRouter.
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
			// Only log on final retry attempt to reduce noise
			if (attempt + 1 === MAX_RETRIES) {
				log("warn", `No image in response for story "${story.id}", retrying (attempt ${attempt + 1}/${MAX_RETRIES})...`);
			}
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error);
			// Only log on final retry attempt to reduce noise
			if (attempt + 1 === MAX_RETRIES) {
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

/**
 * Single attempt to generate an image
 */
async function attemptImageGeneration(
	client: NonNullable<typeof openrouter>,
	storyId: string,
	prompt: string,
): Promise<ImageGenerationResult> {
	const response = await client.chat.completions.create({
		model: "google/gemini-2.5-flash-image",
		messages: [
			{
				role: "user",
				content: [
					{ type: "text", text: prompt },
				],
			},
		],
		// @ts-expect-error - OpenRouter specific parameter for image generation
		modalities: ["text", "image"],
	});

	// Log usage information
	const usage = response.usage;
	let estimatedCost = 0;

	if (usage) {
		// Gemini 2.5 Flash pricing (approximate): $0.10/1M input, $0.40/1M output
		const inputCost = (usage.prompt_tokens / 1_000_000) * 0.10;
		const outputCost = (usage.completion_tokens / 1_000_000) * 0.40;
		estimatedCost = inputCost + outputCost;

		log("info", `Image generation usage - Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Estimated cost: $${estimatedCost.toFixed(6)}`);
	}

	// Extract image from response
	const message = response.choices[0]?.message;

	// Check for images in the message.images field (OpenRouter format)
	// @ts-expect-error - OpenRouter specific response field
	const images = message?.images as Array<{ type: string; image_url: { url: string } }> | undefined;

	if (images && images.length > 0 && images[0]?.image_url?.url) {
		log("info", `Successfully generated image for story "${storyId}"`);
		return {
			imageUrl: images[0].image_url.url,
			usage: usage ? {
				promptTokens: usage.prompt_tokens,
				completionTokens: usage.completion_tokens,
				totalTokens: usage.total_tokens,
				estimatedCost,
			} : undefined,
		};
	}

	// Check if content is an array with image parts (Gemini format)
	const content = message?.content;
	if (Array.isArray(content)) {
		for (const part of content) {
			// Check for inline_data format (Gemini native)
			if (part && typeof part === "object" && "inline_data" in part) {
				const inlineData = part.inline_data as { mime_type: string; data: string };
				if (inlineData?.data) {
					const imageUrl = `data:${inlineData.mime_type || "image/png"};base64,${inlineData.data}`;
					log("info", `Successfully generated image (inline_data) for story "${storyId}"`);
					return {
						imageUrl,
						usage: usage ? {
							promptTokens: usage.prompt_tokens,
							completionTokens: usage.completion_tokens,
							totalTokens: usage.total_tokens,
							estimatedCost,
						} : undefined,
					};
				}
			}
			// Check for image_url format in content array
			if (part && typeof part === "object" && "type" in part && part.type === "image_url") {
				const imageUrlPart = part as { type: string; image_url: { url: string } };
				if (imageUrlPart.image_url?.url) {
					log("info", `Successfully generated image (content array) for story "${storyId}"`);
					return {
						imageUrl: imageUrlPart.image_url.url,
						usage: usage ? {
							promptTokens: usage.prompt_tokens,
							completionTokens: usage.completion_tokens,
							totalTokens: usage.total_tokens,
							estimatedCost,
						} : undefined,
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
			usage: usage ? {
				promptTokens: usage.prompt_tokens,
				completionTokens: usage.completion_tokens,
				totalTokens: usage.total_tokens,
				estimatedCost,
			} : undefined,
		};
	}

	// Log detailed response for debugging
	log("debug", `No image in response, structure: ${JSON.stringify(response.choices[0], null, 2)}`);
	return {
		imageUrl: null,
		error: "No image generated in response",
		usage: usage ? {
			promptTokens: usage.prompt_tokens,
			completionTokens: usage.completion_tokens,
			totalTokens: usage.total_tokens,
			estimatedCost,
		} : undefined,
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
