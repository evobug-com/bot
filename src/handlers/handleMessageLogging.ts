import { type Client, Events, type Message, type OmitPartialGroupDMChannel, type PartialMessage } from "discord.js";
import { dbUserExists } from "../client/client.ts";
import { createLogger } from "../util/logger.ts";

const _log = createLogger("MessageLogger");

export const handleMessageLogging = async (client: Client<true>) => {
	client.on(Events.MessageCreate, handleMessageCreate);
	client.on(Events.MessageUpdate, handleMessageUpdate);
	client.on(Events.MessageDelete, handleMessageDelete);
};

async function handleMessageCreate(message: OmitPartialGroupDMChannel<Message<boolean>>) {
	if (!message.member) return;
	if (!message.guild) return;

	// do not track unregistered users
	if (!(await dbUserExists(message.guild, message.member))) {
		return;
	}

	// TODO: log message create
}

async function handleMessageUpdate(
	_oldMessage: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
	newMessage: OmitPartialGroupDMChannel<Message<boolean>>,
) {
	if (!newMessage.member) return;
	if (!newMessage.guild) return;

	// do not track unregistered users
	if (!(await dbUserExists(newMessage.guild, newMessage.member))) {
		return;
	}

	// TODO: log message edit
}

async function handleMessageDelete(message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>) {
	if (!message.member) return;
	if (!message.guild) return;

	// do not track unregistered users
	if (!(await dbUserExists(message.guild, message.member))) {
		return;
	}

	// TODO: log message delete
}
