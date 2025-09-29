import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleAchievements } from "./handlers/handleAchievements.ts";
import { handleAntibotRooms } from "./handlers/handleAntibotRooms.ts";
import { handleCommandsForRoom } from "./handlers/handleCommandsForRoom.ts";
import { handleMediaForum } from "./handlers/handleMediaForum.ts";
import { handleMessageLogging } from "./handlers/handleMessageLogging.ts";
import { handleMessageModeration } from "./handlers/handleMessageModeration.ts";
import { handleNewsEmbeds } from "./handlers/handleNewsEmbeds.ts";
import { handleRulesVerification } from "./handlers/handleRulesVerification.ts";
import { handleSendingEmbedMessages } from "./handlers/handleSendingEmbedMessages.ts";
import { handleStreamingNotifications } from "./handlers/handleStreamingNotifications.ts";
import { handleVirtualVoiceChannels } from "./handlers/handleVirtualVoiceChannels.ts";
import { handleVoiceConnections } from "./handlers/handleVoiceConnections.ts";
import { handleWarningSystem } from "./handlers/handleWarningSystem.ts";
import { ensureUserRegistered } from "./util";
import { getCommand, registerCommands } from "./util/commands.ts";

// Create a new client instance
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.DirectMessages,
	],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
	console.log("Available guilds:", readyClient.guilds.cache.map((guild) => guild.name).join(","));

	readyClient.guilds.cache.forEach((guild) => {
		void registerCommands(guild);
	});

	void handleVirtualVoiceChannels(readyClient);
	void handleRulesVerification(readyClient);
	void handleWarningSystem(readyClient);
	void handleAntibotRooms(readyClient);
	void handleMediaForum(readyClient);
	void handleMessageLogging(readyClient);
	void handleMessageModeration(readyClient);
	void handleAchievements(readyClient);
	void handleSendingEmbedMessages(readyClient);
	void handleNewsEmbeds(readyClient);
	void handleStreamingNotifications(readyClient);
	void handleCommandsForRoom(readyClient);
	void handleVoiceConnections(readyClient);
});

// Register commands per each guild and when bot is added to a guild
client.on(Events.GuildCreate, async (guild) => {
	console.log(`Joined a new guild: ${guild.name} (ID: ${guild.id})`);
	void registerCommands(guild);
});

client.on(Events.GuildDelete, async (guild) => {
	console.log(`Left a guild: ${guild.name} (ID: ${guild.id})`);
});

// Handle commands
client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	if (!interaction.guild) return;

	const command = getCommand(interaction.commandName);
	if (!command) return;

	// Before executing the command, ensure the user is registered
	const result = await ensureUserRegistered(interaction.guild, interaction.user.id);
	if (!result.success) return;

	return command.execute({
		interaction,
		dbUser: result.user,
	});
});

// Log in to Discord with your client's token
void client.login(process.env.DISCORD_TOKEN);
