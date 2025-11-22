/**
 * Changelog Handler
 *
 * Sends changelog updates to bot-news channel on bot start.
 * Uses git commits to generate changelog and tracks what has been sent.
 */

import { type Client, EmbedBuilder } from "discord.js";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DISCORD_CHANNELS, getChannelByConfig } from "../util/config/channels.ts";
import { createLogger } from "../util/logger.ts";

const log = createLogger("Changelog");

const CHANGELOG_FILE = join(process.cwd(), "data", "last-changelog.json");

interface ChangelogData {
	lastCommitHash: string;
	sentAt: string;
}

/**
 * Read the last sent changelog data
 */
function readLastChangelog(): ChangelogData | null {
	try {
		if (!existsSync(CHANGELOG_FILE)) {
			return null;
		}
		const data = readFileSync(CHANGELOG_FILE, "utf-8");
		return JSON.parse(data) as ChangelogData;
	} catch (error) {
		log("error", "Error reading changelog file:", error);
		return null;
	}
}

/**
 * Write the last sent changelog data
 */
function writeLastChangelog(data: ChangelogData): void {
	try {
		writeFileSync(CHANGELOG_FILE, JSON.stringify(data, null, 2));
	} catch (error) {
		log("error", "Error writing changelog file:", error);
	}
}

/**
 * Get git commits since a specific hash
 */
function getCommitsSince(hash: string | null): Array<{ hash: string; message: string }> {
	try {
		const range = hash ? `${hash}..HEAD` : "HEAD~10..HEAD";
		const output = execSync(`git log ${range} --pretty=format:"%H|%s"`, {
			encoding: "utf-8",
			cwd: process.cwd(),
		}).trim();

		if (!output) return [];

		return output
			.split("\n")
			.map((line) => {
				const [hash, ...messageParts] = line.split("|");
				return { hash: hash ?? "", message: messageParts.join("|") };
			})
			.filter((commit) => commit.hash !== "");
	} catch (error) {
		log("error", "Error getting git commits:", error);
		return [];
	}
}

/**
 * Get current git commit hash
 */
function getCurrentCommitHash(): string | null {
	try {
		return execSync("git rev-parse HEAD", {
			encoding: "utf-8",
			cwd: process.cwd(),
		}).trim();
	} catch (error) {
		log("error", "Error getting current commit hash:", error);
		return null;
	}
}

/**
 * Create changelog embed from commits
 */
function createChangelogEmbed(commits: Array<{ hash: string; message: string }>): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle("📝 Changelog - Nové změny v botu")
		.setColor(0x0099ff)
		.setTimestamp()
		.setFooter({ text: "Allcom Bot" });

	const repoUrl = "https://github.com/evobug-com/bot";

	// Group commits by type
	const features: string[] = [];
	const fixes: string[] = [];
	const chores: string[] = [];
	const other: string[] = [];

	for (const commit of commits) {
		const msg = commit.message;
		const shortHash = commit.hash.substring(0, 7);
		const commitLink = `[\`${shortHash}\`](${repoUrl}/commit/${commit.hash})`;

		if (msg.startsWith("feat:") || msg.startsWith("feat(")) {
			features.push(`• ${msg.replace(/^feat(\([^)]+\))?:\s*/, "")} ${commitLink}`);
		} else if (msg.startsWith("fix:") || msg.startsWith("fix(")) {
			fixes.push(`• ${msg.replace(/^fix(\([^)]+\))?:\s*/, "")} ${commitLink}`);
		} else if (msg.startsWith("chore:") || msg.startsWith("chore(")) {
			chores.push(`• ${msg.replace(/^chore(\([^)]+\))?:\s*/, "")} ${commitLink}`);
		} else {
			other.push(`• ${msg} ${commitLink}`);
		}
	}

	let description = "";

	if (features.length > 0) {
		description += "🚀 **Nové funkce**\n" + features.join("\n") + "\n\n";
	}

	if (fixes.length > 0) {
		description += "🐛 **Opravy**\n" + fixes.join("\n") + "\n\n";
	}

	if (chores.length > 0) {
		description += "🔧 **Údržba**\n" + chores.join("\n") + "\n\n";
	}

	if (other.length > 0) {
		description += "📦 **Ostatní změny**\n" + other.join("\n") + "\n\n";
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
	const lastChangelog = readLastChangelog();
	const currentHash = getCurrentCommitHash();

	if (!currentHash) {
		log("warn", "Could not get current commit hash, skipping changelog");
		return;
	}

	// If we've already sent changelog for this commit, skip
	if (lastChangelog?.lastCommitHash === currentHash) {
		log("debug", "Changelog already sent for this commit, skipping");
		return;
	}

	// Get commits since last sent changelog
	const commits = getCommitsSince(lastChangelog?.lastCommitHash ?? null);

	if (commits.length === 0) {
		log("debug", "No new commits to report");
		// Still update the last commit hash to current
		writeLastChangelog({
			lastCommitHash: currentHash,
			sentAt: new Date().toISOString(),
		});
		return;
	}

	log("info", `Found ${commits.length} new commits to report`);

	// Send to each guild's bot-news channel
	for (const guild of client.guilds.cache.values()) {
		const result = getChannelByConfig(guild, DISCORD_CHANNELS.BOT_NEWS);

		if (!result) {
			log("warn", `Bot news channel not found in guild: ${guild.name}`);
			continue;
		}

		const { channel } = result;

		if (!channel.isSendable()) {
			log("warn", `Cannot send to bot news channel in guild: ${guild.name}`);
			continue;
		}

		try {
			const embed = createChangelogEmbed(commits);
			await channel.send({ embeds: [embed] });
			log("info", `Changelog sent to guild: ${guild.name}`);
		} catch (error) {
			log("error", `Error sending changelog to guild ${guild.name}:`, error);
		}
	}

	// Update last changelog data
	writeLastChangelog({
		lastCommitHash: currentHash,
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
