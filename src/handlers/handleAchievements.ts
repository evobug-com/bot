import { join } from "node:path";
import { Glob } from "bun";
import type { Client } from "discord.js";
import type { IAchievement } from "../achievements/iachievement.ts";

const glob = new Glob("**/*.ts");
const achievements: Array<IAchievement> = [];

// Scans the current working directory and each of its sub-directories recursively
for await (const file of glob.scan(join(import.meta.dirname, "../achievements"))) {
	const module = (await import(join(import.meta.dirname, "../achievements", file))) as IAchievement;
	achievements.push(module);
	console.log("Loaded achievement:", module.name);
}

export const handleAchievements = async (client: Client<true>) => {
	achievements.forEach((ach) => {
		void ach.handle(client);
	});
};
