import type { Client } from "discord.js";

export interface IAchievement {
	name: string;
	handle: (client: Client<true>) => Promise<void> | void;
}
