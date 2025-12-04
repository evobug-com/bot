import { ChatInputCommandBuilder, type GuildMember, MessageFlags, type VoiceChannel } from "discord.js";
import {
	getChannelOwner,
	inviteUserToChannel,
	isChannelPrivate,
	isVirtualVoiceChannel,
	kickUserFromChannel,
	makeChannelPrivate,
	makeChannelPublic,
} from "../handlers/handleVirtualVoiceChannels.ts";
import type { CommandContext } from "../util/commands.ts";

export const data = new ChatInputCommandBuilder()
	.setName("voice")
	.setNameLocalizations({ cs: "hlas" })
	.setDescription("Manage your virtual voice channel")
	.setDescriptionLocalizations({ cs: "Spravuj svůj dočasný hlasový kanál" })
	// Private subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("private")
			.setNameLocalizations({ cs: "soukromý" })
			.setDescription("Make your channel private (only you can see it)")
			.setDescriptionLocalizations({ cs: "Nastavit kanál jako soukromý (pouze ty ho uvidíš)" }),
	)
	// Public subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("public")
			.setNameLocalizations({ cs: "veřejný" })
			.setDescription("Make your channel visible to verified users")
			.setDescriptionLocalizations({ cs: "Nastavit kanál jako veřejný (ověření uživatelé ho uvidí)" }),
	)
	// Invite subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("invite")
			.setNameLocalizations({ cs: "pozvat" })
			.setDescription("Invite a user to your private channel")
			.setDescriptionLocalizations({ cs: "Pozvat uživatele do soukromého kanálu" })
			.addUserOptions((option) =>
				option
					.setName("user")
					.setNameLocalizations({ cs: "uživatel" })
					.setDescription("User to invite")
					.setDescriptionLocalizations({ cs: "Uživatel k pozvání" })
					.setRequired(true),
			),
	)
	// Kick subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("kick")
			.setNameLocalizations({ cs: "vyhodit" })
			.setDescription("Remove a user from your channel")
			.setDescriptionLocalizations({ cs: "Vyhodit uživatele z kanálu" })
			.addUserOptions((option) =>
				option
					.setName("user")
					.setNameLocalizations({ cs: "uživatel" })
					.setDescription("User to kick")
					.setDescriptionLocalizations({ cs: "Uživatel k vyhození" })
					.setRequired(true),
			),
	)
	// Status subcommand
	.addSubcommands((subcommand) =>
		subcommand
			.setName("status")
			.setNameLocalizations({ cs: "stav" })
			.setDescription("Show your channel's current privacy status")
			.setDescriptionLocalizations({ cs: "Zobrazit aktuální stav soukromí kanálu" }),
	);

export const execute = async ({ interaction }: CommandContext): Promise<void> => {
	const subcommand = interaction.options.getSubcommand() as "private" | "public" | "invite" | "kick" | "status";

	// Get the user's current voice channel
	const member = interaction.member as GuildMember;
	const voiceChannel = member.voice.channel as VoiceChannel | null;

	if (!voiceChannel) {
		await interaction.reply({
			content: "❌ Musíš být v hlasovém kanálu, abys mohl použít tento příkaz.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Check if this is a virtual voice channel
	if (!isVirtualVoiceChannel(interaction.guildId ?? "", voiceChannel.id)) {
		await interaction.reply({
			content: "❌ Tento příkaz funguje pouze v dočasných hlasových kanálech.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	// Check ownership
	const ownerId = getChannelOwner(interaction.guildId ?? "", voiceChannel.id);
	if (ownerId !== interaction.user.id) {
		await interaction.reply({
			content: "❌ Nejsi vlastníkem tohoto kanálu.",
			flags: MessageFlags.Ephemeral,
		});
		return;
	}

	switch (subcommand) {
		case "private":
			return await handlePrivate(interaction, voiceChannel);
		case "public":
			return await handlePublic(interaction, voiceChannel);
		case "invite":
			return await handleInvite(interaction, voiceChannel);
		case "kick":
			return await handleKick(interaction, voiceChannel);
		case "status":
			return await handleStatus(interaction, voiceChannel);
	}
};

/**
 * Handle /voice private subcommand
 */
async function handlePrivate(
	interaction: CommandContext["interaction"],
	channel: VoiceChannel,
): Promise<void> {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		// Check if already private
		const alreadyPrivate = await isChannelPrivate(channel);
		if (alreadyPrivate) {
			await interaction.editReply({
				content: "🔒 Kanál už je soukromý.",
			});
			return;
		}

		await makeChannelPrivate(channel);
		await interaction.editReply({
			content: "🔒 Kanál je nyní soukromý. Ostatní ověření uživatelé ho nevidí.\n\nPoužij `/voice invite @user` pro pozvání uživatelů.",
		});
	} catch (error) {
		console.error("Failed to make channel private:", error);
		await interaction.editReply({
			content: "❌ Něco se pokazilo. Zkus to prosím znovu.",
		});
	}
}

/**
 * Handle /voice public subcommand
 */
async function handlePublic(
	interaction: CommandContext["interaction"],
	channel: VoiceChannel,
): Promise<void> {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		// Check if already public
		const isPrivate = await isChannelPrivate(channel);
		if (!isPrivate) {
			await interaction.editReply({
				content: "🔓 Kanál už je veřejný.",
			});
			return;
		}

		await makeChannelPublic(channel);
		await interaction.editReply({
			content: "🔓 Kanál je nyní veřejný. Všichni ověření uživatelé ho vidí a mohou se připojit.",
		});
	} catch (error) {
		console.error("Failed to make channel public:", error);
		await interaction.editReply({
			content: "❌ Něco se pokazilo. Zkus to prosím znovu.",
		});
	}
}

/**
 * Handle /voice invite subcommand
 */
async function handleInvite(
	interaction: CommandContext["interaction"],
	channel: VoiceChannel,
): Promise<void> {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const targetUser = interaction.options.getUser("user", true);

	// Can't invite yourself
	if (targetUser.id === interaction.user.id) {
		await interaction.editReply({
			content: "❌ Nemůžeš pozvat sám sebe.",
		});
		return;
	}

	// Can't invite bots
	if (targetUser.bot) {
		await interaction.editReply({
			content: "❌ Nemůžeš pozvat bota.",
		});
		return;
	}

	try {
		await inviteUserToChannel(channel, targetUser.id);
		await interaction.editReply({
			content: `✅ Uživatel <@${targetUser.id}> byl pozván do kanálu **${channel.name}**.\n\nNyní může kanál vidět a připojit se.`,
		});
	} catch (error) {
		console.error("Failed to invite user:", error);
		await interaction.editReply({
			content: "❌ Něco se pokazilo. Zkus to prosím znovu.",
		});
	}
}

/**
 * Handle /voice kick subcommand
 */
async function handleKick(
	interaction: CommandContext["interaction"],
	channel: VoiceChannel,
): Promise<void> {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	const targetUser = interaction.options.getUser("user", true);

	// Can't kick yourself
	if (targetUser.id === interaction.user.id) {
		await interaction.editReply({
			content: "❌ Nemůžeš vyhodit sám sebe.",
		});
		return;
	}

	// Find the member in the channel
	const targetMember = channel.members.get(targetUser.id);

	if (!targetMember) {
		await interaction.editReply({
			content: `❌ Uživatel <@${targetUser.id}> není v tomto kanálu.`,
		});
		return;
	}

	try {
		await kickUserFromChannel(channel, targetMember);
		await interaction.editReply({
			content: `✅ Uživatel <@${targetUser.id}> byl vyhozen z kanálu **${channel.name}**.`,
		});
	} catch (error) {
		console.error("Failed to kick user:", error);
		await interaction.editReply({
			content: "❌ Něco se pokazilo. Zkus to prosím znovu.",
		});
	}
}

/**
 * Handle /voice status subcommand
 */
async function handleStatus(
	interaction: CommandContext["interaction"],
	channel: VoiceChannel,
): Promise<void> {
	await interaction.deferReply({ flags: MessageFlags.Ephemeral });

	try {
		const isPrivate = await isChannelPrivate(channel);
		const status = isPrivate ? "🔒 Soukromý" : "🔓 Veřejný";
		const memberCount = channel.members.size;

		await interaction.editReply({
			content: [
				`**Kanál:** ${channel.name}`,
				`**Stav:** ${status}`,
				`**Počet uživatelů:** ${memberCount}`,
				"",
				isPrivate
					? "Použij `/voice public` pro zveřejnění kanálu."
					: "Použij `/voice private` pro skrytí kanálu.",
			].join("\n"),
		});
	} catch (error) {
		console.error("Failed to get channel status:", error);
		await interaction.editReply({
			content: "❌ Něco se pokazilo. Zkus to prosím znovu.",
		});
	}
}
