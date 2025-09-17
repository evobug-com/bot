import { type Client, Events, type Message, type OmitPartialGroupDMChannel } from "discord.js";
import { ChannelManager } from "../util";

export const handleCommandsForRoom = async (client: Client<true>) => {
	client.on(Events.MessageCreate, handleMessageCreate);
};

async function handleMessageCreate(message: OmitPartialGroupDMChannel<Message<boolean>>) {
	if (!message.guild) return;
	// Ignore bot messages - bots can send reward notifications to commands channel
	if (message.author.bot) return;

	const commandsChannel = ChannelManager.getChannel(message.guild, "COMMANDS");
	if (!commandsChannel) return;
	if (message.channelId !== commandsChannel.id) return;

	// Ordinal message
	if (message.interactionMetadata == null) {
		await message.delete();
		// Let user know that the message was deleted
		await message.author.send({
			content: `Tvá zpráva v <#${commandsChannel.id}> byla odstraněna, protože není příkaz. Prosím používej zde pouze příkazy.`,
		});
	}
}
