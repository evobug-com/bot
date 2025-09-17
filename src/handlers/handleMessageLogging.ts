import { type Client, Events, type Message, type OmitPartialGroupDMChannel, type PartialMessage } from "discord.js";
import { dbUserExists, getDbUser, orpc } from "../client/client.ts";
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

	const user = await getDbUser(message.guild, message.member);

	const [error, success] = await orpc.messageLogs.create({
		content: message.content,
		userId: user.id,
		platform: "discord",
		channelId: message.channel.id,
		messageId: message.id,
	});

	if (error || !success) {
		_log("error", "Failed to log message", { error });
	} else {
		_log("info", "Logged message", {
			userId: user.id,
			channelId: message.channel.id,
			messageId: message.id,
			content: message.content,
		});
	}
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

	const [error, message] = await orpc.messageLogs.update({
		messageId: newMessage.id,
		platform: "discord",
		newContent: newMessage.content,
	});

	if (error || !message) {
		_log("error", "Failed to update message log", { error });
	} else {
		_log("info", "Updated message log", {
			messageId: newMessage.id,
			newContent: newMessage.content,
			editedContents: message.editedContents,
		});
	}
}

async function handleMessageDelete(message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>) {
	if (!message.member) return;
	if (!message.guild) return;

	// do not track unregistered users
	if (!(await dbUserExists(message.guild, message.member))) {
		return;
	}

	const [error, status] = await orpc.messageLogs.updateDeletedStatus({
		messageId: message.id,
		platform: "discord",
	});

	if (error || !status) {
		_log("error", "Failed to mark message as deleted", { error });
	} else {
		_log("info", "Marked message as deleted", { messageId: message.id });
	}
}
