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

	return `Vygeneruj vtipný MEME obrázek v češtině pro tento příběh:

NÁZEV PŘÍBĚHU: ${story.title} ${story.emoji}
HRÁČ: ${username}

PRŮBĚH PŘÍBĚHU:
${journey}

KONEC: ${result.narrative}

VÝSLEDEK: ${isPositive ? "POZITIVNÍ" : "NEGATIVNÍ"} (${coins >= 0 ? "+" : ""}${coins} mincí)

POŽADAVKY NA OBRÁZEK:
- Styl: Vtipný internet meme (jako rage comics, wojak, nebo moderní meme formát)
- Jazyk: Český text na obrázku
- Zachyť klíčový moment nebo pointu příběhu
- Pokud je konec negativní, ukaž to humorně
- Přidej jméno hráče "${username}" někam do obrázku
- Buď kreativní a vtipný!`;
}

/**
 * Generate a meme image for a completed story
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

	try {
		const response = await openrouter.chat.completions.create({
			model: "google/gemini-2.5-flash-image-preview",
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
			log("info", `Successfully generated image for story "${story.id}"`);
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
						log("info", `Successfully generated image (inline_data) for story "${story.id}"`);
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
						log("info", `Successfully generated image (content array) for story "${story.id}"`);
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
			log("info", `Successfully generated image (base64 string) for story "${story.id}"`);
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
		log("warn", `No image in response for story "${story.id}".`);
		log("debug", `Full response structure: ${JSON.stringify(response.choices[0], null, 2)}`);
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
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		log("error", `Failed to generate image for story "${story.id}": ${errorMessage}`);
		return {
			imageUrl: null,
			error: errorMessage,
		};
	}
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
