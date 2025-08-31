import {createORPCClient, onError} from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { Guild, GuildMember, Interaction } from "discord.js";
import type { router } from "../../../api/src/contract/router.ts";
import { reportError } from "../util";

const link = new RPCLink({
	url: "http://127.0.0.1:3001",
    interceptors: [
        onError((error) => {
            console.error(error)
        })
    ],
});

export const orpc: RouterClient<typeof router> = createORPCClient(link);

const dbUsers: Record<string, Awaited<ReturnType<(typeof orpc)["users"]["get"]>>> = {};
export const getDbUser = async (
	guild: Guild,
	discordIdOrMemberOrInteraction: string | GuildMember | Interaction,
	_cache = true,
): Promise<NonNullable<(typeof dbUsers)[string]>> => {
	// if(cache && dbUsers[discordId] != null) return dbUsers[discordId]
	return setDbUser(guild, await orpc.users.get({ discordId: extractDiscordId(discordIdOrMemberOrInteraction) }));
};

export const setDbUser = (guild: Guild, user: Awaited<ReturnType<(typeof orpc)["users"]["get"]>>) => {
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
