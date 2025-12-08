import { ChannelType, ChatInputCommandBuilder, MessageFlags, PermissionFlagsBits } from "discord.js";
import type { CommandContext } from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
	.setName("export-rooms")
	.setNameLocalizations({ cs: "exportuj-místnosti" })
	.setDescription("Export all channels to a simple format")
	.setDescriptionLocalizations({ cs: "Exportuj všechny kanály do jednoduchého formátu" })
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
	.addStringOptions((option) =>
		option
			.setName("format")
			.setNameLocalizations({ cs: "formát" })
			.setDescription("Output format")
			.setDescriptionLocalizations({ cs: "Výstupní formát" })
			.setRequired(false)
			.addChoices(
				{ name: "CSV", value: "csv" },
				{ name: "JSON", value: "json" },
				{ name: "Text", value: "text" },
			),
	)
	.addStringOptions((option) =>
		option
			.setName("type")
			.setNameLocalizations({ cs: "typ" })
			.setDescription("Filter by channel type")
			.setDescriptionLocalizations({ cs: "Filtrovat podle typu kanálu" })
			.setRequired(false)
			.addChoices(
				{ name: "All", value: "all" },
				{ name: "Text", value: "text" },
				{ name: "Voice", value: "voice" },
				{ name: "Category", value: "category" },
				{ name: "Forum", value: "forum" },
			),
	);

interface ChannelData {
	name: string;
	type: string;
	category: string | null;
	description: string | null;
}

function getChannelTypeName(type: ChannelType): string {
	const typeNames: Record<number, string> = {
		[ChannelType.GuildText]: "Text",
		[ChannelType.GuildVoice]: "Voice",
		[ChannelType.GuildCategory]: "Category",
		[ChannelType.GuildAnnouncement]: "Announcement",
		[ChannelType.GuildStageVoice]: "Stage",
		[ChannelType.GuildForum]: "Forum",
		[ChannelType.GuildMedia]: "Media",
	};
	return typeNames[type] ?? "Unknown";
}

function shouldIncludeChannel(channelType: ChannelType, filterType: string): boolean {
	if (filterType === "all") return true;

	const typeMapping: Record<string, ChannelType[]> = {
		text: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
		voice: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
		category: [ChannelType.GuildCategory],
		forum: [ChannelType.GuildForum, ChannelType.GuildMedia],
	};

	return typeMapping[filterType]?.includes(channelType) ?? false;
}

function formatAsText(channels: ChannelData[]): string {
	const lines: string[] = ["# Channel Export", ""];

	let currentCategory: string | null = null;

	for (const channel of channels) {
		if (channel.type === "Category") {
			currentCategory = channel.name;
			lines.push(`\n## ${channel.name}`);
			if (channel.description) {
				lines.push(`   ${channel.description}`);
			}
		} else {
			const prefix = currentCategory && channel.category === currentCategory ? "  - " : "- ";
			const desc = channel.description ? ` | ${channel.description}` : "";
			lines.push(`${prefix}[${channel.type}] ${channel.name}${desc}`);
		}
	}

	return lines.join("\n");
}

function formatAsCsv(channels: ChannelData[]): string {
	const headers = ["Name", "Type", "Category", "Description"];
	const rows = channels.map((c) => [
		`"${c.name.replace(/"/g, '""')}"`,
		c.type,
		c.category ? `"${c.category.replace(/"/g, '""')}"` : "",
		c.description ? `"${c.description.replace(/"/g, '""')}"` : "",
	]);

	return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function formatAsJson(channels: ChannelData[]): string {
	return JSON.stringify(channels, null, 2);
}

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const guild = interaction.guild;
	if (!guild) {
		await interaction.editReply({ content: "❌ This command can only be used in a server." });
		return;
	}

	const format = (interaction.options.getString("format") ?? "text") as "csv" | "json" | "text";
	const typeFilter = interaction.options.getString("type") ?? "all";

	const channels = guild.channels.cache;
	const channelData: ChannelData[] = [];

	// Sort channels by position within their category
	const sortedChannels = [...channels.values()].sort((a, b) => {
		// Categories first, sorted by position
		if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) return -1;
		if (b.type === ChannelType.GuildCategory && a.type !== ChannelType.GuildCategory) return 1;

		// Same category - sort by position
		const aParent = "parentId" in a ? a.parentId : null;
		const bParent = "parentId" in b ? b.parentId : null;

		if (aParent !== bParent) {
			if (!aParent) return -1;
			if (!bParent) return 1;
			const aParentChannel = channels.get(aParent);
			const bParentChannel = channels.get(bParent);
			const aParentPos = aParentChannel && "position" in aParentChannel ? aParentChannel.position : 0;
			const bParentPos = bParentChannel && "position" in bParentChannel ? bParentChannel.position : 0;
			return aParentPos - bParentPos;
		}

		const aPos = "position" in a ? a.position : 0;
		const bPos = "position" in b ? b.position : 0;
		return aPos - bPos;
	});

	for (const channel of sortedChannels) {
		if (!shouldIncludeChannel(channel.type, typeFilter)) continue;

		const topic = "topic" in channel ? channel.topic : null;
		const parentId = "parentId" in channel ? channel.parentId : null;
		const parentChannel = parentId ? channels.get(parentId) : null;

		channelData.push({
			name: channel.name,
			type: getChannelTypeName(channel.type),
			category: parentChannel?.name ?? null,
			description: topic ?? null,
		});
	}

	if (channelData.length === 0) {
		await interaction.editReply({ content: "❌ No channels found matching the filter." });
		return;
	}

	let output: string;
	let filename: string;
	let contentType: string;

	switch (format) {
		case "csv":
			output = formatAsCsv(channelData);
			filename = "channels.csv";
			contentType = "text/csv";
			break;
		case "json":
			output = formatAsJson(channelData);
			filename = "channels.json";
			contentType = "application/json";
			break;
		default:
			output = formatAsText(channelData);
			filename = "channels.txt";
			contentType = "text/plain";
	}

	// Always send as file attachment for consistent handling
	const buffer = Buffer.from(output, "utf-8");

	await interaction.editReply({
		content: `✅ Exported ${channelData.length} channels.`,
		files: [
			{
				attachment: buffer,
				name: filename,
				contentType,
			},
		],
	});
};
