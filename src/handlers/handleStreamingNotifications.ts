import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	ActionRowBuilder,
	type Activity,
	ActivityType,
	type ButtonInteraction,
	type Client,
	DangerButtonBuilder,
	Events,
	type Guild,
	type GuildMember,
	type Message,
	MessageFlags,
	type Presence,
	SuccessButtonBuilder,
	type TextChannel,
} from "discord.js";
import { ChannelManager, RoleManager } from "../util";
import { createLogger } from "../util/logger.ts";
import { createCeskyTelekomunikacniUradEmbed } from "../util/messages/embedBuilders.ts";

const log = createLogger("StreamingNotifications");

const activeStreams = new Map<string, ActiveStream>();
const pendingNotifications = new Map<string, PendingNotification>();
const activeDMMessages = new Map<string, Message>();
const activeDMMessageGuilds = new Map<string, string>(); // Track guild IDs for DM messages
const pendingNotificationSchedules = new Map<string, Date>(); // Track when notifications are scheduled for
const persistenceFile = join(import.meta.dirname, "../../stream-persistence.json");
const notificationDelayMs = 60000;
const deleteOnStreamEnd = true;
const streamingActivityType = ActivityType.Streaming;

export const handleStreamingNotifications = async (client: Client<true>) => {
	await loadPersistedData(client);
	client.guilds.cache.forEach((guild) => {
		void cleanupOldStreamMessages(guild);
	});
	client.on(Events.PresenceUpdate, handlePresenceUpdate);
	client.on(Events.InteractionCreate, async (interaction) => {
		// Sometimes the interaction is null/undefined, catch it here
		if (interaction == null) return;
		if (interaction.isButton()) {
			await handleButtonInteraction(interaction);
		}
	});
};

export type StreamActivityLike = {
	// Url where the stream is being streamed from
	url: string | null;

	// Description of the stream
	details: string | null;

	// The current game the user is playing / or category of the stream
	state: string | null;
};

export const streamNotificationEmbeds = {
	notifyAboutStartSoon: (member: GuildMember, streamActivity: StreamActivityLike, streamChannelId: string) => {
		const embed = streamNotificationEmbeds.createStreamEmbed(member, streamActivity);
		return {
			content: `**Bylo detekování vysílání!**\n\nZa 1 minutu příjde oznámení do kanálu <#${streamChannelId}>.\n\n**Náhled oznámení:**`,
			embeds: [embed],
		};
	},

	createStreamEmbed: (member: GuildMember, streamActivity: StreamActivityLike) => {
		let twitchUsername = null;
		const streamUrl = streamActivity.url;

		if (streamUrl?.includes("twitch.tv/")) {
			const match = streamUrl.match(/twitch\.tv\/([^/?#]+)/);
			if (match?.[1]) {
				twitchUsername = match[1];
			}
		}

		const embed = createCeskyTelekomunikacniUradEmbed()
			.setTitle(`Zaznamenáno vysílání od ${member.displayName}`)
			.setDescription(streamActivity.details || "Ups, popis není k dispozici.")
			.addFields(
				{
					name: "🎮 Kategorie",
					value: streamActivity.state || "Neznámá",
					inline: true,
				},
				{
					name: "👥 Vysílající",
					value: `<@${member.id}>`,
					inline: true,
				},
			)
			.setThumbnail(member.displayAvatarURL({ size: 512 }))
			.setTimestamp();

		if (twitchUsername && streamUrl) {
			embed.addFields({
				name: "🔗 Odkaz",
				value: `[${twitchUsername}](${streamUrl})`,
				inline: false,
			});
		} else if (streamUrl) {
			embed.addFields({
				name: "🔗 Odkaz",
				value: streamUrl,
				inline: false,
			});
		}

		return embed;
	},

	notifyStreamEnded: () => {
		const embed = createCeskyTelekomunikacniUradEmbed().setDescription("Vysílání ukončeno");

		return {
			content: null,
			embeds: [embed],
			components: [],
		};
	},

	notifyStreamNotificationSent: (guild: Guild, userId: string) => {
		const streamNotificationChannel = ChannelManager.getChannel(guild, "STREAM_NOTIFICATIONS");
		if (!streamNotificationChannel) {
			return {
				content: null,
				embeds: [],
				components: [],
			};
		}

		const removeButton = new DangerButtonBuilder()
			.setCustomId(`remove_stream_${userId}`)
			.setLabel("🗑️ Odstranit oznámení");

		const row = new ActionRowBuilder().addComponents(removeButton);

		const embed = createCeskyTelekomunikacniUradEmbed().setDescription(
			`Oznámení o vysílání bylo úspěšně odesláno do <#${streamNotificationChannel.id}>!\n\nOznámení můžeš odstranit stisknutím tlačítka níže.`,
		);

		return {
			content: null,
			embeds: [embed],
			components: [row],
		};
	},

	notifyStreamNotificationRemoved: () => {
		const embed = createCeskyTelekomunikacniUradEmbed().setDescription(
			"Již odeslané oznámení o vysílání bylo teď odstraněno.\nJe možné, žě ho někdo stihl vidět a nebo ho bude mít v liště notifikací.",
		);
		return {
			content: null,
			embeds: [embed],
			components: [],
		};
	},

	notifyStreamNotificationAborted: (guild: Guild) => {
		const streamNotificationChannel = ChannelManager.getChannel(guild, "STREAM_NOTIFICATIONS");
		if (!streamNotificationChannel) {
			return {
				content: null,
				embeds: [],
				components: [],
			};
		}
		const embed = createCeskyTelekomunikacniUradEmbed().setDescription(
			`Oznámení o vysilání bylo zrušeno.\nDo channelu <#${streamNotificationChannel.id}> nebude nic odesláno.`,
		);

		return {
			content: null,
			embeds: [embed],
			components: [],
		};
	},

	createStreamButtons: (userId: string) => {
		const abortButton = new DangerButtonBuilder().setCustomId(`abort_stream_${userId}`).setLabel("🚫 Zrušit oznámení");

		const sendNowButton = new SuccessButtonBuilder()
			.setCustomId(`send_now_stream_${userId}`)
			.setLabel("📤 Poslat hned");

		return new ActionRowBuilder().addComponents(sendNowButton, abortButton);
	},

	createStreamNotificationContent: () => {
		return "@here Nový stream začal! 🎉";
	},
};

async function handlePresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
	// Check for null/undefined parameters
	if (!newPresence) {
		log("warn", "handlePresenceUpdate called with null/undefined newPresence");
		return;
	}

	if (!newPresence.guild) {
		log("debug", "Presence update for unknown guild");
		return;
	}
	if (!newPresence.user || newPresence.user.bot) {
		log("debug", "Presence update for unknown user");
		return;
	}

	const member = newPresence.member;
	if (!member) {
		log("debug", "Presence update for unknown member");
		return;
	}

	// Check if user has required role
	const hasRequiredRole = await RoleManager.hasRole(member, "TWITCH_CREATOR");
	if (!hasRequiredRole) {
		log("debug", `User ${member.displayName} doesn't have required role`);
		return;
	}

	// Check streaming status
	const wasStreaming = oldPresence?.activities.some((a) => a.type === streamingActivityType) ?? false;
	const isStreaming = newPresence.activities.some((a) => a.type === streamingActivityType);

	log("debug", `Presence update for ${member.displayName} | Was: ${wasStreaming} | Is: ${isStreaming}`);

	// Get notification channel
	const streamChannel = ChannelManager.getTextChannel(newPresence.guild, "STREAM_NOTIFICATIONS");
	if (!streamChannel) {
		log("warn", `No STREAM_NOTIFICATIONS channel found for guild ${newPresence.guild.name}`);
		return;
	}

	// User started streaming
	if (!wasStreaming && isStreaming) {
		await handleStreamStart(newPresence, streamChannel);
	}
	// User stopped streaming
	else if (wasStreaming && !isStreaming) {
		await handleStreamEnd(newPresence, streamChannel);
	}
}

async function handleStreamStart(presence: Presence, streamChannel: TextChannel): Promise<void> {
	const streamActivity = presence.activities.find((a) => a.type === streamingActivityType);
	if (!streamActivity) {
		log("info", `handleStreamStart - No streaming activity found for ${presence.user?.username}`);
		return;
	}

	const userId = presence.user?.id;
	if (!userId || !presence.member) {
		return;
	}
	const member = presence.member;

	// Cancel any existing pending notification
	const existingPending = pendingNotifications.get(userId);
	if (existingPending) {
		clearTimeout(existingPending.timeout);
		pendingNotifications.delete(userId);
		pendingNotificationSchedules.delete(userId);
	}

	// Send DM warning if enabled
	let warningMessage: Message | undefined;
	try {
		const buttons = streamNotificationEmbeds.createStreamButtons(userId);
		const messageData = streamNotificationEmbeds.notifyAboutStartSoon(member, streamActivity, streamChannel.id);

		warningMessage = await member.send({
			...messageData,
			components: [buttons],
		});

		activeDMMessages.set(userId, warningMessage);
		activeDMMessageGuilds.set(userId, member.guild.id);
		await savePersistedData();
		log("info", `Sent stream warning DM to ${member.displayName}`);
	} catch (error) {
		log("error", `Couldn't send DM to ${member.displayName}:`, error);
	}

	// Set up delayed notification
	const timeout = setTimeout(async () => {
		try {
			// Check if still streaming
			const currentPresence = presence.guild?.members.cache.get(userId)?.presence;
			const stillStreaming = currentPresence?.activities.some((a) => a.type === streamingActivityType);

			if (!stillStreaming) {
				log("info", `${member.displayName} stopped streaming before notification was sent`);
				pendingNotifications.delete(userId);
				pendingNotificationSchedules.delete(userId);
				return;
			}

			// Send notification
			await sendStreamNotification(member, streamActivity, streamChannel, userId);

			// Update DM if sent
			if (warningMessage) {
				await updateDMAfterNotification(member.guild, warningMessage, userId);
			}
		} catch (error) {
			log("error", `Error sending stream notification for ${member.displayName}:`, error);
		}

		pendingNotifications.delete(userId);
		pendingNotificationSchedules.delete(userId);
	}, notificationDelayMs);

	// Store pending notification
	const scheduledTime = new Date(Date.now() + notificationDelayMs);
	pendingNotifications.set(userId, {
		timeout,
		userId,
		member,
		streamActivity,
		streamChannel,
	});
	pendingNotificationSchedules.set(userId, scheduledTime);

	await savePersistedData();
	log("info", `Stream detected for ${member.displayName}, notification scheduled`);
}

async function handleStreamEnd(presence: Presence, streamChannel: TextChannel): Promise<void> {
	const userId = presence.user?.id;
	if (!userId || !presence.member) {
		return;
	}
	const member = presence.member;

	// Cancel pending notification
	const pending = pendingNotifications.get(userId);
	if (pending) {
		clearTimeout(pending.timeout);
		pendingNotifications.delete(userId);
		pendingNotificationSchedules.delete(userId);
		log("info", `Cancelled pending notification for ${member.displayName}`);
	}

	// Update DM message
	const dmMessage = activeDMMessages.get(userId);
	if (dmMessage) {
		try {
			await dmMessage.edit(streamNotificationEmbeds.notifyStreamEnded());
			activeDMMessages.delete(userId);
			activeDMMessageGuilds.delete(userId);
			await savePersistedData();
		} catch (error) {
			log("error", "Error updating DM after stream ended:", error);
		}
	}

	// Delete stream notification if enabled
	const activeStream = activeStreams.get(userId);
	if (deleteOnStreamEnd && activeStream && activeStream.messageId) {
		try {
			const message = await streamChannel.messages.fetch(activeStream.messageId).catch(() => null);
			if (message && !message.pinned) {
				await message.delete();
				log("info", `Deleted stream notification for ${member.displayName}`);
			}
		} catch (error) {
			log("error", `Failed to delete stream message for ${member.displayName}:`, error);
		}

		activeStreams.delete(userId);
		await savePersistedData();
	}

	// TODO: Custom events?
	// emit("streamEnded", {
	//     userId,
	//     guildId: presence.guild?.id,
	//     duration: activeStream ? Date.now() - activeStream.startTime.getTime() : 0,
	// });

	log("info", `${member.displayName} stopped streaming`);
}

async function handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
	const customId = interaction.customId;

	if (
		!customId.startsWith("abort_stream_") &&
		!customId.startsWith("send_now_stream_") &&
		!customId.startsWith("remove_stream_")
	) {
		return;
	}

	const userId = customId.replace(/^(abort|send_now|remove)_stream_/, "");

	// Verify user owns this notification
	if (interaction.user.id !== userId) {
		await interaction.reply({
			content: "❌ Můžeš ovládat pouze své vlastní oznámení o streamu.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	if (customId.startsWith("remove_stream_")) {
		await handleRemoveStreamButton(interaction, userId);
	} else if (customId.startsWith("abort_stream_")) {
		await handleAbortStreamButton(interaction, userId);
	} else if (customId.startsWith("send_now_stream_")) {
		await handleSendNowButton(interaction, userId);
	}
}

async function handleRemoveStreamButton(interaction: ButtonInteraction, userId: string): Promise<void> {
	const activeStream = activeStreams.get(userId);
	if (!activeStream) {
		await interaction.reply({
			content: "❌ Nenalezeno žádné aktivní oznámení o streamu k odstranění.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	try {
		// Get guild from stored data or interaction
		const guild =
			interaction.guild || (activeStream.guildId ? interaction.client.guilds.cache.get(activeStream.guildId) : null);
		if (!guild) {
			await interaction.reply({
				content: "❌ Nelze najít server pro toto oznámení.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const streamChannel = guild.channels.cache.get(activeStream.channelId) as TextChannel;
		if (streamChannel && activeStream.messageId) {
			const message = await streamChannel.messages.fetch(activeStream.messageId).catch(() => null);
			if (message) {
				await message.delete();
				activeStreams.delete(userId);
				await savePersistedData();
				log("info", `Stream notification removed by ${interaction.user.tag}`);
			}
		}

		await interaction.update(streamNotificationEmbeds.notifyStreamNotificationRemoved());
	} catch (error) {
		log("error", "Error removing stream message:", error);
		await interaction.reply({
			content: "❌ Chyba při odstraňování oznámení.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

async function handleAbortStreamButton(interaction: ButtonInteraction, userId: string): Promise<void> {
	const pending = pendingNotifications.get(userId);
	if (!pending) {
		await interaction.reply({
			content: "❌ Nenalezeno žádné čekající oznámení o streamu.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	clearTimeout(pending.timeout);
	pendingNotifications.delete(userId);
	pendingNotificationSchedules.delete(userId);

	// Get guild from pending notification data
	const guild = interaction.guild || pending.member.guild;
	await interaction.update(streamNotificationEmbeds.notifyStreamNotificationAborted(guild));

	log("info", `Stream notification aborted by ${interaction.user.tag}`);
}

async function handleSendNowButton(interaction: ButtonInteraction, userId: string): Promise<void> {
	const pending = pendingNotifications.get(userId);
	if (!pending) {
		await interaction.reply({
			content: "❌ Nenalezeno žádné čekající oznámení o streamu.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	clearTimeout(pending.timeout);
	pendingNotifications.delete(userId);
	pendingNotificationSchedules.delete(userId);

	try {
		await sendStreamNotification(pending.member, pending.streamActivity, pending.streamChannel, userId);

		// Get guild from pending notification data
		const guild = interaction.guild || pending.member.guild;
		await interaction.update(streamNotificationEmbeds.notifyStreamNotificationSent(guild, userId));

		activeDMMessages.set(userId, interaction.message as Message);
		activeDMMessageGuilds.set(userId, guild.id);
		await savePersistedData();
		log("info", `Stream notification sent immediately by ${interaction.user.tag}`);
	} catch (error) {
		log("error", "Error sending immediate stream notification:", error);
		await interaction.reply({
			content: "❌ Chyba při odesílání oznámení.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

async function sendStreamNotification(
	member: GuildMember,
	streamActivity: Activity,
	streamChannel: TextChannel,
	userId: string,
): Promise<void> {
	const embed = streamNotificationEmbeds.createStreamEmbed(member, streamActivity);
	const content = streamNotificationEmbeds.createStreamNotificationContent();

	const message = await streamChannel.send({
		content,
		embeds: [embed],
	});

	activeStreams.set(userId, {
		userId,
		messageId: message.id,
		channelId: streamChannel.id,
		guildId: member.guild.id,
		startTime: new Date(),
	});

	await savePersistedData();

	// TODO: Custom events?
	// emit("streamNotificationSent", {
	//     userId,
	//     guildId: member.guild.id,
	//     channelId: streamChannel.id,
	//     messageId: message.id,
	// });

	log("info", `Stream notification sent for ${member.displayName}`);
}

async function updateDMAfterNotification(guild: Guild, dmMessage: Message, userId: string): Promise<void> {
	try {
		const updateData = streamNotificationEmbeds.notifyStreamNotificationSent(guild, userId);
		await dmMessage.edit({
			...updateData,
			embeds: dmMessage.embeds,
		});
	} catch (error) {
		log("error", "Error updating DM after notification sent:", error);
	}
}

async function cleanupOldStreamMessages(guild: Guild): Promise<void> {
	try {
		const streamChannel = ChannelManager.getTextChannel(guild, "STREAM_NOTIFICATIONS");

		if (!streamChannel) {
			log("warn", "No STREAM_NOTIFICATIONS channel found for cleanup");
			return;
		}

		log("info", "Cleaning up old stream messages...");

		// Get currently streaming members
		const streamingMembers = new Set<string>();
		guild.members.cache.forEach((member) => {
			if (member.presence?.activities.some((a) => a.type === streamingActivityType)) {
				streamingMembers.add(member.user.id);
			}
		});

		// Remove messages for users no longer streaming
		const toRemove: string[] = [];
		for (const [userId, stream] of activeStreams) {
			if (!streamingMembers.has(userId)) {
				try {
					const message = stream.messageId
						? await streamChannel.messages.fetch(stream.messageId).catch(() => null)
						: null;
					if (message && !message.pinned) {
						await message.delete();
						log("info", `Deleted old stream message for user ${userId}`);
					}
					toRemove.push(userId);
				} catch (error) {
					log("error", `Error deleting old stream message for ${userId}:`, error);
					toRemove.push(userId);
				}
			}
		}

		// Clean up the map
		toRemove.forEach((userId) => {
			activeStreams.delete(userId);
		});
		if (toRemove.length > 0) {
			await savePersistedData();
		}

		log("info", `Cleaned up ${toRemove.length} old stream messages`);
	} catch (error) {
		log("error", "Error cleaning up old stream messages:", error);
	}
}

async function loadPersistedData(client: Client): Promise<void> {
	try {
		const data = await readFile(persistenceFile, "utf-8");
		const parsed = JSON.parse(data) as {
			activeStreams?: Record<
				string,
				{
					startTime: string;
					channelId: string;
					guildId: string;
					gameName?: string;
					userId?: string;
					messageId?: string;
				}
			>;
			pendingNotifications?: Record<
				string,
				{
					userId: string;
					memberId: string;
					guildId: string;
					streamActivity: Activity;
					streamChannelId: string;
					scheduledTime: string;
				}
			>;
			activeDMMessages?: Record<string, { messageId: string; guildId?: string }>;
		};

		// Load active streams
		if (parsed.activeStreams) {
			for (const [userId, stream] of Object.entries(parsed.activeStreams)) {
				activeStreams.set(userId, {
					...stream,
					userId,
					startTime: new Date(stream.startTime),
				});
			}
		}

		// Load active DM messages
		if (parsed.activeDMMessages) {
			for (const [userId, dmData] of Object.entries(parsed.activeDMMessages)) {
				try {
					// Try to fetch the user to get their DM channel
					const user = await client.users.fetch(userId).catch(() => null);
					if (user) {
						const dmChannel = await user.createDM();
						const message = await dmChannel.messages.fetch(dmData.messageId).catch(() => null);
						if (message) {
							activeDMMessages.set(userId, message);
							if (dmData.guildId) {
								activeDMMessageGuilds.set(userId, dmData.guildId);
							}
							log("info", `Restored DM message for user ${userId}`);
						} else {
							log("warn", `Could not fetch DM message ${dmData.messageId} for user ${userId}`);
						}
					}
				} catch (error) {
					log("error", `Error restoring DM message for user ${userId}:`, error);
				}
			}
		}

		// Load and reschedule pending notifications
		if (parsed.pendingNotifications) {
			const now = Date.now();
			for (const [userId, notifData] of Object.entries(parsed.pendingNotifications)) {
				try {
					const scheduledTime = new Date(notifData.scheduledTime).getTime();
					const remainingTime = scheduledTime - now;

					// Only reschedule if the notification is still in the future
					if (remainingTime > 0) {
						const guild = client.guilds.cache.get(notifData.guildId);
						if (guild) {
							const member = await guild.members.fetch(notifData.memberId).catch(() => null);
							const streamChannel = guild.channels.cache.get(notifData.streamChannelId) as TextChannel;

							if (member && streamChannel) {
								// Reschedule the notification
								const timeout = setTimeout(async () => {
									try {
										// Check if still streaming
										const currentPresence = guild.members.cache.get(userId)?.presence;
										const stillStreaming = currentPresence?.activities.some((a) => a.type === streamingActivityType);

										if (stillStreaming) {
											await sendStreamNotification(member, notifData.streamActivity, streamChannel, userId);

											// Update DM if exists
											const dmMessage = activeDMMessages.get(userId);
											if (dmMessage) {
												await updateDMAfterNotification(guild, dmMessage, userId);
											}
										}
									} catch (error) {
										log("error", `Error sending rescheduled notification for ${member.displayName}:`, error);
									}
									pendingNotifications.delete(userId);
									pendingNotificationSchedules.delete(userId);
								}, remainingTime);

								pendingNotifications.set(userId, {
									timeout,
									userId,
									member,
									streamActivity: notifData.streamActivity,
									streamChannel,
								});
								pendingNotificationSchedules.set(userId, new Date(notifData.scheduledTime));

								await savePersistedData();
								log(
									"info",
									`Rescheduled notification for ${member.displayName} in ${Math.round(remainingTime / 1000)}s`,
								);
							}
						}
					}
				} catch (error) {
					log("error", `Error restoring pending notification for user ${userId}:`, error);
				}
			}
		}

		log(
			"info",
			`Loaded ${activeStreams.size} stream messages, ${activeDMMessages.size} DM messages, ${pendingNotifications.size} pending notifications`,
		);
	} catch {
		// File doesn't exist or is invalid
		activeStreams.clear();
		activeDMMessages.clear();
		activeDMMessageGuilds.clear();
	}
}

async function savePersistedData(): Promise<void> {
	try {
		// Prepare active DM messages for persistence
		const activeDMMessagesData: Record<string, ActiveDMMessage> = {};
		for (const [userId, message] of activeDMMessages.entries()) {
			const guildId = activeDMMessageGuilds.get(userId);
			if (guildId) {
				activeDMMessagesData[userId] = {
					userId,
					messageId: message.id,
					channelId: message.channelId,
					guildId,
				};
			}
		}

		// Prepare pending notifications for persistence
		const pendingNotificationsData: Record<string, PendingNotificationData> = {};
		for (const [userId, notification] of pendingNotifications.entries()) {
			const scheduledTime = pendingNotificationSchedules.get(userId);
			if (scheduledTime) {
				pendingNotificationsData[userId] = {
					userId,
					memberId: notification.member.id,
					guildId: notification.member.guild.id,
					streamActivity: notification.streamActivity,
					streamChannelId: notification.streamChannel.id,
					scheduledTime,
				};
			}
		}

		const data = {
			activeStreams: Object.fromEntries(
				Array.from(activeStreams.entries()).map(([userId, stream]) => [
					userId,
					{
						...stream,
						startTime: stream.startTime.toISOString(),
					},
				]),
			),
			activeDMMessages: activeDMMessagesData,
			pendingNotifications: pendingNotificationsData,
			timestamp: new Date().toISOString(),
		};
		await writeFile(persistenceFile, JSON.stringify(data, null, 2));
	} catch (error) {
		log("error", "Error saving persisted stream data:", error);
	}
}

/**
 * Get the guild associated with a user's stream notification
 * Checks multiple sources to find the guild ID
 */
function _getGuildForUser(client: Client, userId: string): Guild | null {
	// Check pending notifications first (most likely to have guild info during active stream)
	const pending = pendingNotifications.get(userId);
	if (pending) {
		return pending.member.guild;
	}

	// Check active streams
	const activeStream = activeStreams.get(userId);
	if (activeStream?.guildId) {
		const guild = client.guilds.cache.get(activeStream.guildId);
		if (guild) return guild;
	}

	// Check active DM messages
	const dmMessage = activeDMMessages.get(userId);
	if (dmMessage) {
		// Try to get guild from stored DM message data
		for (const [_, stream] of activeStreams) {
			if (stream.userId === userId && stream.guildId) {
				const guild = client.guilds.cache.get(stream.guildId);
				if (guild) return guild;
			}
		}
	}

	// Last resort: check all guilds for the member
	for (const guild of client.guilds.cache.values()) {
		if (guild.members.cache.has(userId)) {
			return guild;
		}
	}

	return null;
}

interface ActiveStream {
	userId: string;
	messageId?: string;
	channelId: string;
	guildId: string;
	startTime: Date;
}

interface ActiveDMMessage {
	userId: string;
	messageId: string;
	channelId: string;
	guildId: string;
}

interface PendingNotificationData {
	userId: string;
	memberId: string;
	guildId: string;
	streamActivity: Activity;
	streamChannelId: string;
	scheduledTime: Date;
}

interface PendingNotification {
	timeout: NodeJS.Timeout;
	userId: string;
	member: GuildMember;
	streamActivity: Activity;
	streamChannel: TextChannel;
}
