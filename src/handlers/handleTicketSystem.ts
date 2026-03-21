/**
 * Ticket System Handler
 *
 * This module manages a support ticket system where users can create temporary
 * private text channels for support requests. Tickets are automatically deleted
 * when closed.
 *
 * Features:
 * - Create ticket button in designated channel
 * - Private text channel creation with proper permissions
 * - Close ticket functionality with 5-second countdown
 * - Access for ticket creator + moderator roles
 */

import {
	type ButtonInteraction,
	ChannelType,
	type Client,
	Events,
	type Guild,
	type Interaction,
	MessageFlags,
	type OverwriteResolvable,
	OverwriteType,
	PermissionFlagsBits,
} from "discord.js";
import {
	ActionRowBuilder,
	EmbedBuilder,
	PrimaryButtonBuilder,
	DangerButtonBuilder,
} from "@discordjs/builders";
import { ChannelManager, RoleManager, reportError } from "../util";
import { createLogger } from "../util/logger.ts";

const log = createLogger("TicketSystem");

/** Button custom IDs */
const BUTTON_IDS = {
	CREATE_TICKET: "ticket_create",
	CLOSE_TICKET: "ticket_close",
} as const;

/** Channel naming configuration */
const CHANNEL_PREFIX = "🎫︱ticket-";

/** Close countdown in milliseconds */
const CLOSE_DELAY_MS = 5000;

/**
 * Initialize the ticket system
 * Sets up event listeners for button interactions
 *
 * @param client - Discord client instance
 */
export const handleTicketSystem = async (client: Client<true>): Promise<void> => {
	client.on(Events.InteractionCreate, handleTicketInteraction);
	log("info", "Ticket system initialized");
};

/**
 * Handle ticket-related button interactions
 *
 * @param interaction - Discord interaction
 */
async function handleTicketInteraction(interaction: Interaction): Promise<void> {
	if (!interaction.isButton()) return;

	if (interaction.customId === BUTTON_IDS.CREATE_TICKET) {
		await handleCreateTicket(interaction);
	} else if (interaction.customId === BUTTON_IDS.CLOSE_TICKET) {
		await handleCloseTicket(interaction);
	}
}

/**
 * Generate permission overwrites for a ticket channel
 *
 * Permissions:
 * - @everyone: Deny ViewChannel
 * - Ticket creator: Allow ViewChannel, SendMessages, ReadMessageHistory, AttachFiles, EmbedLinks
 * - MODERATOR, LEAD_MODERATOR, MANAGER: Allow all above + ManageMessages
 *
 * @param guild - The guild to get roles from
 * @param userId - The ticket creator's user ID
 * @returns Array of permission overwrites
 */
export async function getTicketChannelPermissions(
	guild: Guild,
	userId: string,
): Promise<OverwriteResolvable[]> {
	const everyoneRole = await RoleManager.getRole(guild, "EVERYONE");
	if (!everyoneRole) {
		log("error", "Everyone role not found in guild", guild.id);
		await reportError(guild, "getTicketChannelPermissions", "Everyone role not found in guild");
		return [];
	}

	const permissions: OverwriteResolvable[] = [
		{
			// Deny everyone by default
			id: everyoneRole.id,
			type: OverwriteType.Role,
			deny: [PermissionFlagsBits.ViewChannel],
		},
		{
			// Give ticket creator access
			id: userId,
			type: OverwriteType.Member,
			allow: [
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.SendMessages,
				PermissionFlagsBits.ReadMessageHistory,
				PermissionFlagsBits.AttachFiles,
				PermissionFlagsBits.EmbedLinks,
			],
		},
	];

	// Add moderator role permissions
	const modRoleKeys = ["MODERATOR", "LEAD_MODERATOR", "MANAGER"] as const;
	const modRoles = await Promise.all(modRoleKeys.map(async (roleKey) => RoleManager.getRole(guild, roleKey)));

	for (const role of modRoles) {
		if (role) {
			permissions.push({
				id: role.id,
				type: OverwriteType.Role,
				allow: [
					PermissionFlagsBits.ViewChannel,
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.ReadMessageHistory,
					PermissionFlagsBits.AttachFiles,
					PermissionFlagsBits.EmbedLinks,
					PermissionFlagsBits.ManageMessages,
				],
			});
		}
	}

	return permissions;
}

/**
 * Generate a valid channel name for a ticket
 *
 * @param username - The username of the ticket creator
 * @returns Sanitized channel name
 */
export function generateTicketChannelName(username: string): string {
	// Discord channel names: lowercase, no spaces, max 100 chars
	const sanitized = username
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 80); // Leave room for prefix

	return `${CHANNEL_PREFIX}${sanitized || "user"}`;
}

/**
 * Handle the "Create Ticket" button interaction
 *
 * @param interaction - Button interaction
 */
async function handleCreateTicket(interaction: ButtonInteraction): Promise<void> {

	const { guild, user } = interaction;
	if (!guild) {
		await interaction.reply({
			content: "❌ Tento příkaz lze použít pouze na serveru.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Check if user already has an open ticket
	const existingTicket = guild.channels.cache.find(
		(channel) =>
			channel.type === ChannelType.GuildText &&
			channel.name.startsWith(CHANNEL_PREFIX) &&
			channel.permissionOverwrites.cache.has(user.id),
	);

	if (existingTicket) {
		await interaction.reply({
			content: `❌ Již máš otevřený ticket: <#${existingTicket.id}>`,
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	try {
		// Get ticket category
		const ticketCategory = ChannelManager.getChannel(guild, "TICKET_CATEGORY");
		if (!ticketCategory || ticketCategory.type !== ChannelType.GuildCategory) {
			await interaction.reply({
				content: "❌ Kategorie pro tickety nebyla nalezena. Kontaktuj administrátora.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Build permissions
		const permissionOverwrites = await getTicketChannelPermissions(guild, user.id);
		if (permissionOverwrites.length === 0) {
			await interaction.reply({
				content: "❌ Nepodařilo se nastavit oprávnění. Kontaktuj administrátora.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Create the ticket channel under the ticket category
		const channelName = generateTicketChannelName(user.username);
		const ticketChannel = await ticketCategory.children.create({
			name: channelName,
			type: ChannelType.GuildText,
			permissionOverwrites,
		});

		// Send welcome message with close button
		const welcomeEmbed = new EmbedBuilder()
			.setColor(0x5865f2)
			.setTitle("🎫 Nový Ticket")
			.setDescription(
				[
					`Ahoj <@${user.id}>!`,
					"",
					"Děkujeme za vytvoření ticketu.",
					"Moderátor se ti brzy ozve.",
					"",
					"Napiš prosím svůj dotaz nebo problém.",
				].join("\n"),
			)
			.setTimestamp();

		const closeButton = new DangerButtonBuilder()
			.setCustomId(BUTTON_IDS.CLOSE_TICKET)
			.setLabel("Zavřít Ticket")
			.setEmoji({ name: "🔒" });

		const row = new ActionRowBuilder().addComponents(closeButton);

		await ticketChannel.send({
			embeds: [welcomeEmbed],
			components: [row.toJSON()],
		});

		// Reply to the user
		await interaction.reply({
			content: `✅ Ticket byl vytvořen: <#${ticketChannel.id}>`,
			flags: MessageFlags.Ephemeral,
		});

		log("info", `Created ticket channel: ${channelName} for user ${user.username}`);
	} catch (error) {
		log("error", "Failed to create ticket:", error);
		await interaction.reply({
			content: "❌ Nepodařilo se vytvořit ticket. Zkus to prosím znovu.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Handle the "Close Ticket" button interaction
 *
 * @param interaction - Button interaction
 */
async function handleCloseTicket(interaction: ButtonInteraction): Promise<void> {
	const { channel, user, guild } = interaction;
	if (!channel || !guild) {
		await interaction.reply({
			content: "❌ Tento příkaz lze použít pouze v ticket kanálu.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Verify this is a ticket channel
	if (!channel.isTextBased() || !("name" in channel) || !channel.name?.startsWith(CHANNEL_PREFIX)) {
		await interaction.reply({
			content: "❌ Tento příkaz lze použít pouze v ticket kanálu.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	try {
		// Send closing message
		await interaction.reply({
			content: `🔒 Ticket se zavírá za 5 sekund... (zavřel <@${user.id}>)`,
		});

		// Wait 5 seconds
		await new Promise((resolve) => setTimeout(resolve, CLOSE_DELAY_MS));

		// Delete the channel
		if ("delete" in channel && typeof channel.delete === "function" && "name" in channel) {
			const channelName = channel.name ?? "unknown";
			await channel.delete(`Ticket closed by ${user.username}`);
			log("info", `Closed ticket channel: ${channelName} by user ${user.username}`);
		}
	} catch (error) {
		log("error", "Failed to close ticket:", error);
		// Channel might already be deleted, or we don't have permissions
	}
}

/**
 * Create the ticket creation embed and button
 * Used by the send-ticket-button command
 *
 * @returns Object containing the embed and components
 */
export function createTicketButtonMessage(): {
	embeds: EmbedBuilder[];
	components: ReturnType<ActionRowBuilder["toJSON"]>[];
} {
	const embed = new EmbedBuilder()
		.setColor(0x5865f2)
		.setTitle("🎫 Podpora")
		.setDescription(
			[
				"Potřebuješ pomoct nebo máš dotaz?",
				"",
				"Klikni na tlačítko níže a vytvoř si ticket.",
				"Moderátor se ti ozve co nejdříve.",
			].join("\n"),
		);

	const createButton = new PrimaryButtonBuilder()
		.setCustomId(BUTTON_IDS.CREATE_TICKET)
		.setLabel("Vytvořit Ticket")
		.setEmoji({ name: "🎫" });

	const row = new ActionRowBuilder().addComponents(createButton);

	return {
		embeds: [embed],
		components: [row.toJSON()],
	};
}
