import { createORPCClient, createSafeClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { Guild, GuildMember, Interaction } from "discord.js";
import type { router } from "../../../api/src/contract/router.ts";
import { reportError } from "../util";

const link = new RPCLink({
	url: process.env.ORPC_API_URL || "http://localhost:3001",
});

const client: RouterClient<typeof router> = createORPCClient(link);
export const orpc = createSafeClient(client);

const dbUsers: Record<string, Awaited<ReturnType<(typeof client)["users"]["get"]>>> = {};
export const getDbUser = async (
	guild: Guild,
	discordIdOrMemberOrInteraction: string | GuildMember | Interaction,
	_cache = true,
): Promise<NonNullable<(typeof dbUsers)[string]>> => {
	// if(cache && dbUsers[discordId] != null) return dbUsers[discordId]
	const [error, user] = await orpc.users.get({ discordId: extractDiscordId(discordIdOrMemberOrInteraction) });
	if (error) {
		throw error;
	}
	return setDbUser(guild, user);
};

export const setDbUser = (guild: Guild, user: Awaited<ReturnType<(typeof client)["users"]["get"]>>) => {
	if (user.discordId) {
		dbUsers[user.discordId] = user;
	} else {
		void reportError(guild, "Unable to cache DbUser", "User has no discordId", JSON.stringify(user));
	}

	return user;
};
export const dbUserExists = async (
	guild: Guild,
	discordIdOrMemberOrInteraction: string | GuildMember | Interaction,
) => {
	try {
		await getDbUser(guild, extractDiscordId(discordIdOrMemberOrInteraction), false);
		return true;
	} catch {
		return false;
	}
};

function extractDiscordId(discordIdOrMemberOrInteraction: string | GuildMember | Interaction) {
	if (typeof discordIdOrMemberOrInteraction === "string") return discordIdOrMemberOrInteraction;
	if ("member" in discordIdOrMemberOrInteraction) return (discordIdOrMemberOrInteraction.member as GuildMember)?.id;
	if ("user" in discordIdOrMemberOrInteraction) return discordIdOrMemberOrInteraction.user.id;
	throw new Error("Invalid argument type");
}
