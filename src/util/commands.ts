import { join } from "node:path";
import { Glob } from "bun";
import type { ApplicationCommand, ChatInputCommandBuilder, ChatInputCommandInteraction, Guild } from "discord.js";
import type { orpc } from "../client/client.ts";

const commands: Record<
	string,
	{
		instances: Record<string, ApplicationCommand>;
		data: ReturnType<ChatInputCommandBuilder["toJSON"]>;
		execute: (context: CommandContext) => Promise<void>;
	}
> = {};
const glob = new Glob("**/*.ts");
// Scans the current working directory and each of its sub-directories recursively
for await (const file of glob.scan(join(import.meta.dirname, "../commands"))) {
	// Skip test files
	if (file.endsWith(".test.ts")) {
		continue;
	}

	const module = (await import(join(import.meta.dirname, "../commands", file))) as {
		data: ChatInputCommandBuilder;
		execute: (context: CommandContext) => Promise<void>;
	};
	const jsonData = module.data.toJSON();
	commands[jsonData.name] = { data: jsonData, execute: module.execute, instances: {} };
	console.log("Loaded command:", jsonData.name);
}

export interface CommandContext {
	interaction: ChatInputCommandInteraction;
	dbUser: NonNullable<Awaited<ReturnType<(typeof orpc)["users"]["get"]>>[1]>;
}

export async function registerCommands(guild: Guild) {
	console.log("Registering commands for guild:", guild.name);
	try {
		const result = await guild.commands.set(Object.values(commands).map((command) => command.data));
		result.forEach((command) => {
			const cmd = commands[command.name];
			if (cmd?.instances) {
				cmd.instances[guild.id] = command;
			}
		});
		console.log(`Successfully loaded ${guild.commands.cache.size} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
}

export function getCommand(name: string): (typeof commands)[string] | undefined {
	return commands[name];
}
