/**
 * Media Forum Handler
 *
 * This module monitors the media forum channel for new posts and sends
 * notifications to the chat channel when new content is added.
 * Uses Discord Components V2 with MessageFlags for formatting.
 *
 * Features:
 * - Monitors ThreadCreate events in media forum
 * - Identifies content type by tags (meme, klip, jídlo)
 * - Sends formatted notifications to chat channel
 * - Includes author mentions and clickable links
 */

import {
	type AnyThreadChannel,
	ChannelType,
	type Client,
	ContainerBuilder,
	Events,
	type ForumChannel,
	LinkButtonBuilder,
	type Message,
	MessageFlags,
	type PublicThreadChannel,
	SectionBuilder,
	type TextChannel,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { ChannelManager, reportError } from "../util";
import { createLogger } from "../util/logger.ts";

const log = createLogger("MediaForum");

/**
 * Configuration for media forum notifications
 */
const config = {
	/** Tag configurations with their display names and emojis */
	tags: {
		meme: {
			emoji: "🎭",
			message: "Nový meme",
			description: "přidal nový meme",
		},
		klip: {
			emoji: "🎬",
			message: "Nový klip",
			description: "přidal nový klip",
		},
		jídlo: {
			emoji: "🍔",
			message: "Nová fotka jídla",
			description: "přidal fotku jídla",
		},
	},
} as const;

/**
 * Initialize the media forum handler
 * Sets up event listeners for new forum posts
 *
 * @param client - Discord client instance
 */
export const handleMediaForum = async (client: Client<true>) => {
	client.on(Events.ThreadCreate, handleThreadCreate);
	log("info", "Media forum handler initialized");
};

/**
 * Handle new thread creation events
 * Filters for media forum threads and sends notifications
 *
 * @param thread - The newly created thread
 */
async function handleThreadCreate(thread: AnyThreadChannel) {
	// Sometimes the thread is null/undefined, catch it here
	if (thread == null) return;

	try {
		// Check if thread is from a forum channel
		if (thread.type !== ChannelType.PublicThread) return;

		const { guild } = thread;
		if (!guild) return;

		// Get the media forum channel
		const mediaForum = ChannelManager.getChannel(guild, "MEDIA_FORUM");
		if (!mediaForum) {
			log("error", "Media forum channel not found");
			return;
		}

		// Check if this thread is from the media forum
		if (thread.parentId !== mediaForum.id) return;

		// Get the forum channel to access tags
		const forumChannel = mediaForum as ForumChannel;

		// Get applied tags
		const appliedTags = thread.appliedTags;
		if (!appliedTags || appliedTags.length === 0) {
			log("warn", "New thread has no tags applied");
			return;
		}

		// Find matching tag configuration
		const availableTags = forumChannel.availableTags;
		let matchedTag: keyof typeof config.tags | null = null;
		let tagName = "";

		for (const tagId of appliedTags) {
			const tag = availableTags.find((t) => t.id === tagId);
			if (tag) {
				const normalizedName = tag.name.toLowerCase();
				if (normalizedName in config.tags) {
					matchedTag = normalizedName as keyof typeof config.tags;
					tagName = tag.name;
					break;
				}
			}
		}

		if (!matchedTag) {
			log("warn", `No matching tag configuration found for thread: ${thread.name}`);
			return;
		}

		// Get thread owner
		if (!thread.ownerId) {
			log("error", "Thread has no owner ID");
			return;
		}

		const threadOwner = await guild.members.fetch(thread.ownerId).catch(() => null);
		if (!threadOwner) {
			log("error", "Could not fetch thread owner");
			return;
		}

		// Get chat channel
		const chatChannel = ChannelManager.getTextChannel(guild, "CHAT");
		if (!chatChannel) {
			log("error", "Chat channel not found");
			await reportError(guild, "handleMediaForum", "Chat channel not found");
			return;
		}

		const starterMessage = await thread.awaitMessages({
			max: 1,
			time: 10000,
			filter: (m) => m.author.id === threadOwner.id,
			errors: ["time"],
		});

		// Send notification with Components V2
		await sendMediaNotification(
			chatChannel,
			thread as PublicThreadChannel<true>,
			starterMessage.first() as Message<true> | undefined,
			threadOwner.displayName || threadOwner.user.username,
			threadOwner.id,
			matchedTag,
		);

		log("info", `Sent notification for new ${tagName} post by ${threadOwner.displayName}`);
	} catch (error) {
		log("error", "Failed to handle thread creation:", error);
		if (thread.guild) {
			await reportError(thread.guild, "handleMediaForum", "Failed to process new media forum post", {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

/**
 * Send a notification message to the chat channel using Components V2
 *
 * @param channel - The chat channel to send to
 * @param thread - The forum thread that was created
 * @param authorName - Display name of the thread author
 * @param authorId - ID of the thread author for mention
 * @param tagType - Type of content (meme, klip, jídlo)
 */
async function sendMediaNotification(
	channel: TextChannel,
	thread: PublicThreadChannel<true>,
	starterMessage: Message<true> | undefined,
	authorName: string,
	authorId: string,
	tagType: keyof typeof config.tags,
) {
	const tagConfig = config.tags[tagType];

	// Create the message content with mention
	const messageContent =
		`${tagConfig.emoji} **${tagConfig.message}** od <@${authorId}>!\n` +
		`${authorName} ${tagConfig.description} v kanálu <#${thread.parentId}>`;

	try {
		const thumbnailUrl = starterMessage?.attachments.first()?.url;
		const message = new TextDisplayBuilder().setContent(messageContent);

		const container = new ContainerBuilder();

		if (thumbnailUrl) {
			container.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(message)
					.setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailUrl)),
			);
			container.addSectionComponents(
				new SectionBuilder()
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`-# Prosím, přidávejte reakce uvnitř ${tagType} příspěvku, nikoliv zde.`,
						),
					)
					.setLinkButtonAccessory(
						new LinkButtonBuilder()
							.setLabel(`Zobrazit ${tagType}`)
							.setEmoji({
								name: tagConfig.emoji,
							})
							.setURL(thread.url),
					),
			);
		} else {
			log("info", "No thumbnail found for thread, sending without thumbnail");
			return;
		}

		await channel.send({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});

		log("info", `Notification sent with${thumbnailUrl ? "" : "out"} thumbnail`);
	} catch (error) {
		log("error", "Failed to send notification:", error);
		throw error;
	}
}
