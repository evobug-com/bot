import { ORPCError } from "@orpc/client";
import type { RouterClient } from "@orpc/server";
import type { Guild } from "discord.js";
import type { router } from "../../../../api/src/contract/router.ts";
import { getDbUser, orpc, setDbUser } from "../../client/client.ts";

/** Ensures a Discord user is registered, auto-registering if needed
 * Returns the user data or error details if registration failed
 *
 * This is a higher-level function that combines checking and auto-registration
 */
export async function ensureUserRegistered(
	guild: Guild,
	discordId: string,
): Promise<
	| { success: true; user: Awaited<ReturnType<RouterClient<typeof router>["users"]["create"]>> }
	| { success: false; error: string }
> {
	try {
		return {
			success: true,
			user: await getDbUser(guild, discordId, false),
		};
	} catch (e) {
		// TODO: Is this the right way to handle this?
		if (!(e instanceof ORPCError) || e.code !== "NOT_FOUND") {
			throw e;
		}
	}

	const [createError, newUser] = await orpc.users.create({ discordId });

	if (createError) {
		return {
			success: false,
			error: createError.message || "Failed to create user",
		};
	}

	return {
		success: true,
		user: setDbUser(guild, newUser),
	};
}
