import type { Client, VoiceChannel } from "discord.js";
import { ChannelType, OverwriteType, PermissionFlagsBits } from "discord.js";
import { RoomServiceClient } from "livekit-server-sdk";
import { createLogger } from "../util/logger.ts";

const log = createLogger("MickleVoiceCounter");

const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (Discord rate-limits channel name changes to 2 per 10 min)
const CHANNEL_NAME_PREFIX = "Mickle-Voice";

interface LiveKitConfig {
	url: string;
	apiKey: string;
	apiSecret: string;
}

function getLiveKitConfig(): LiveKitConfig | null {
	const url = process.env.LIVEKIT_URL;
	const apiKey = process.env.LIVEKIT_API_KEY;
	const apiSecret = process.env.LIVEKIT_API_SECRET;

	if (!url || !apiKey || !apiSecret) {
		return null;
	}

	return { url, apiKey, apiSecret };
}

export async function fetchMickleVoiceCount(svc: RoomServiceClient): Promise<number> {
	const rooms = await svc.listRooms();
	return rooms.reduce((sum, room) => sum + room.numParticipants, 0);
}

function formatChannelName(count: number): string {
	return `${CHANNEL_NAME_PREFIX}:${count}`;
}

async function findOrCreateCounterChannel(client: Client<true>): Promise<VoiceChannel | null> {
	for (const guild of client.guilds.cache.values()) {
		const existing = guild.channels.cache.find(
			(ch) => ch.name.startsWith(CHANNEL_NAME_PREFIX) && ch.type === ChannelType.GuildVoice,
		);
		if (existing) {
			return existing as VoiceChannel;
		}
	}

	// Create the channel in the first guild
	const guild = client.guilds.cache.first();
	if (!guild) {
		return null;
	}

	const channel = await guild.channels.create({
		name: formatChannelName(0),
		type: ChannelType.GuildVoice,
		permissionOverwrites: [
			{
				id: guild.roles.everyone.id,
				type: OverwriteType.Role,
				deny: [PermissionFlagsBits.Connect],
				allow: [PermissionFlagsBits.ViewChannel],
			},
		],
	});

	log("info", `Created counter channel "${channel.name}" in ${guild.name}`);
	return channel;
}

async function updateCounter(svc: RoomServiceClient, channel: VoiceChannel): Promise<void> {
	const count = await fetchMickleVoiceCount(svc);
	const newName = formatChannelName(count);

	if (channel.name !== newName) {
		await channel.setName(newName);
		log("debug", `Updated channel name to "${newName}"`);
	}
}

export async function handleMickleVoiceCounter(client: Client<true>): Promise<void> {
	const config = getLiveKitConfig();
	if (!config) {
		log("warn", "LiveKit config missing (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET). Skipping Mickle voice counter.");
		return;
	}

	const svc = new RoomServiceClient(config.url, config.apiKey, config.apiSecret);

	const channel = await findOrCreateCounterChannel(client);
	if (!channel) {
		log("warn", "Could not find or create counter channel. Skipping.");
		return;
	}

	// Initial update
	try {
		await updateCounter(svc, channel);
	} catch (err) {
		log("error", "Failed initial Mickle voice counter update:", err);
	}

	// Schedule periodic updates
	setInterval(async () => {
		try {
			// Re-fetch channel in case it was deleted
			const fresh = channel.guild.channels.cache.get(channel.id) as VoiceChannel | undefined;
			if (!fresh) {
				log("warn", "Counter channel was deleted. Stopping updates.");
				return;
			}
			await updateCounter(svc, fresh);
		} catch (err) {
			log("error", "Failed to update Mickle voice counter:", err);
		}
	}, UPDATE_INTERVAL_MS);

	log("info", `Mickle voice counter active, updating every ${UPDATE_INTERVAL_MS / 1000}s`);
}
