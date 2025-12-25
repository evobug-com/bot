/**
 * Changelog Handler
 *
 * Sends changelog updates to bot-news channel on bot start.
 * Reads from CHANGELOG.md file and tracks what has been sent.
 */

import { type Client, EmbedBuilder } from "discord.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DISCORD_CHANNELS, getChannelByConfig } from "../util/config/channels.ts";
import { createLogger } from "../util/logger.ts";

const log = createLogger("Changelog");

const CHANGELOG_FILE = join(process.cwd(), "CHANGELOG.md");
const LAST_SENT_FILE = join(process.cwd(), "data", "last-changelog.json");

interface LastSentData {
	lastVersion: string;
	sentAt: string;
}

type SectionType =
	| "Added" | "Changed" | "Fixed" | "Removed" | "Deprecated" | "Security"
	| "Přidáno" | "Změněno" | "Opraveno" | "Odstraněno" | "Zastaralé" | "Bezpečnost";

interface ChangelogEntry {
	version: string;
	date: string;
	sections: {
		type: SectionType;
		items: string[];
	}[];
}

/**
 * Read the last sent changelog data
 */
function readLastSent(): LastSentData | null {
	try {
		if (!existsSync(LAST_SENT_FILE)) {
			return null;
		}
		const data = readFileSync(LAST_SENT_FILE, "utf-8");
		return JSON.parse(data) as LastSentData;
	} catch (error) {
		log("error", "Error reading last sent file:", error);
		return null;
	}
}

/**
 * Write the last sent changelog data
 */
function writeLastSent(data: LastSentData): void {
	try {
		writeFileSync(LAST_SENT_FILE, JSON.stringify(data, null, 2));
	} catch (error) {
		log("error", "Error writing last sent file:", error);
	}
}

/**
 * Parse CHANGELOG.md file into structured entries
 */
function parseChangelog(): ChangelogEntry[] {
	try {
		if (!existsSync(CHANGELOG_FILE)) {
			log("warn", "CHANGELOG.md not found");
			return [];
		}

		const content = readFileSync(CHANGELOG_FILE, "utf-8");
		const entries: ChangelogEntry[] = [];

		// Match version headers: ## [1.0.0] - 2024-12-25
		const versionRegex = /^## \[([^\]]+)\](?: - (\d{4}-\d{2}-\d{2}))?/gm;

		let match: RegExpExecArray | null;
		const versionMatches: { version: string; date: string; index: number }[] = [];

		while ((match = versionRegex.exec(content)) !== null) {
			const version = match[1];
			if (version) {
				versionMatches.push({
					version,
					date: match[2] ?? "",
					index: match.index,
				});
			}
		}

		for (const [i, current] of versionMatches.entries()) {
			const next = versionMatches[i + 1];

			const sectionContent = next
				? content.slice(current.index, next.index)
				: content.slice(current.index);

			const entry: ChangelogEntry = {
				version: current.version,
				date: current.date,
				sections: [],
			};

			// Find all sections within this version (supports English and Czech)
			let sectionMatch: RegExpExecArray | null;
			const localSectionRegex = /^### (Added|Changed|Fixed|Removed|Deprecated|Security|Přidáno|Změněno|Opraveno|Odstraněno|Zastaralé|Bezpečnost)/gm;
			const sectionPositions: { type: SectionType; index: number }[] = [];

			while ((sectionMatch = localSectionRegex.exec(sectionContent)) !== null) {
				const sectionType = sectionMatch[1] as SectionType | undefined;
				if (sectionType) {
					sectionPositions.push({
						type: sectionType,
						index: sectionMatch.index,
					});
				}
			}

			for (const [j, currentSection] of sectionPositions.entries()) {
				const nextSection = sectionPositions[j + 1];

				const itemsContent = nextSection
					? sectionContent.slice(currentSection.index, nextSection.index)
					: sectionContent.slice(currentSection.index);

				// Extract list items (lines starting with -)
				const items = itemsContent
					.split("\n")
					.filter((line) => line.trim().startsWith("-"))
					.map((line) => line.trim().replace(/^-\s*/, ""));

				if (items.length > 0) {
					entry.sections.push({
						type: currentSection.type,
						items,
					});
				}
			}

			if (entry.sections.length > 0) {
				entries.push(entry);
			}
		}

		return entries;
	} catch (error) {
		log("error", "Error parsing CHANGELOG.md:", error);
		return [];
	}
}

/**
 * Get new entries since last sent version
 */
function getNewEntries(entries: ChangelogEntry[], lastVersion: string | null): ChangelogEntry[] {
	if (!lastVersion) {
		// First time - only send the latest entry
		return entries.slice(0, 1);
	}

	const lastIndex = entries.findIndex((e) => e.version === lastVersion);
	if (lastIndex === -1) {
		// Last version not found, send latest
		return entries.slice(0, 1);
	}

	// Return all entries newer than lastVersion (entries are newest first)
	return entries.slice(0, lastIndex);
}

/**
 * Create changelog embed from entries
 */
function createChangelogEmbed(entries: ChangelogEntry[]): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle("📝 Changelog - Nové změny v botu")
		.setColor(0x0099ff)
		.setTimestamp()
		.setFooter({ text: "Allcom Bot" });

	const sectionEmojis: Record<SectionType, string> = {
		Added: "🚀",
		Changed: "🔄",
		Fixed: "🐛",
		Removed: "🗑️",
		Deprecated: "⚠️",
		Security: "🔒",
		Přidáno: "🚀",
		Změněno: "🔄",
		Opraveno: "🐛",
		Odstraněno: "🗑️",
		Zastaralé: "⚠️",
		Bezpečnost: "🔒",
	};

	const sectionNames: Record<SectionType, string> = {
		Added: "Nové funkce",
		Changed: "Změny",
		Fixed: "Opravy",
		Removed: "Odstraněno",
		Deprecated: "Zastaralé",
		Security: "Bezpečnost",
		Přidáno: "Nové funkce",
		Změněno: "Změny",
		Opraveno: "Opravy",
		Odstraněno: "Odstraněno",
		Zastaralé: "Zastaralé",
		Bezpečnost: "Bezpečnost",
	};

	let description = "";

	for (const entry of entries) {
		description += `**Verze ${entry.version}**${entry.date ? ` (${entry.date})` : ""}\n\n`;

		for (const section of entry.sections) {
			const emoji = sectionEmojis[section.type];
			const name = sectionNames[section.type];
			description += `${emoji} **${name}**\n`;
			for (const item of section.items) {
				description += `• ${item}\n`;
			}
			description += "\n";
		}
	}

	if (description === "") {
		description = "Žádné nové změny.";
	}

	embed.setDescription(description.trim());

	return embed;
}

/**
 * Send changelog to bot-news channel
 */
async function sendChangelog(client: Client<true>): Promise<void> {
	const entries = parseChangelog();

	if (entries.length === 0) {
		log("warn", "No changelog entries found");
		return;
	}

	const lastSent = readLastSent();
	const latestVersion = entries[0]?.version;

	if (!latestVersion) {
		log("warn", "Could not determine latest version");
		return;
	}

	// If we've already sent changelog for this version, skip
	if (lastSent?.lastVersion === latestVersion) {
		log("debug", "Changelog already sent for this version, skipping");
		return;
	}

	const newEntries = getNewEntries(entries, lastSent?.lastVersion ?? null);

	if (newEntries.length === 0) {
		log("debug", "No new changelog entries to report");
		return;
	}

	log("info", `Found ${newEntries.length} new changelog entries to report`);

	// Send to each guild's bot-news channel
	const embed = createChangelogEmbed(newEntries);
	await Promise.all(
		[...client.guilds.cache.values()].map(async (guild) => {
			const result = getChannelByConfig(guild, DISCORD_CHANNELS.BOT_NEWS);

			if (!result) {
				log("warn", `Bot news channel not found in guild: ${guild.name}`);
				return;
			}

			const { channel } = result;

			if (!channel.isSendable()) {
				log("warn", `Cannot send to bot news channel in guild: ${guild.name}`);
				return;
			}

			try {
				await channel.send({ embeds: [embed] });
				log("info", `Changelog sent to guild: ${guild.name}`);
			} catch (error) {
				log("error", `Error sending changelog to guild ${guild.name}:`, error);
			}
		})
	);

	// Update last sent data
	writeLastSent({
		lastVersion: latestVersion,
		sentAt: new Date().toISOString(),
	});
}

/**
 * Initialize the changelog handler
 */
export const handleChangelog = async (client: Client<true>) => {
	log("info", "Initializing changelog handler");
	await sendChangelog(client);
};

// Export for testing
export { parseChangelog, getNewEntries, createChangelogEmbed };
