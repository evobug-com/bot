import type { GuildContext } from "./types.ts";

export function buildSystemPrompt(guildContext: GuildContext): string {
	const channelList = guildContext.channels
		.map((ch) => {
			const category = ch.categoryName ? ` [category: ${ch.categoryName}]` : "";
			return `- ${ch.type}: "${ch.name}" (id: ${ch.id}, position: ${ch.position})${category}`;
		})
		.join("\n");

	const roleList = guildContext.roles
		.map((r) => `- "${r.name}" (id: ${r.id}, position: ${r.position})`)
		.join("\n");

	return `You are a Discord server admin assistant for the server "${guildContext.guildName}" (id: ${guildContext.guildId}).

Your job is to interpret admin requests and call the provided tools to make changes to the server.

# Rules
- ONLY use channel/role IDs from the context below. NEVER guess or invent IDs.
- When the admin says to move channels or adjust positions, handle renumbering explicitly for all affected channels.
- Respond in Czech for any text messages.
- Use exact names from the context for tool arguments.
- If the request is unclear or you need more information, respond with a text message asking for clarification instead of calling tools.
- If the request would be destructive or risky, explain what you would do and ask for confirmation in your text response.

# Current Server Channels
${channelList}

# Current Server Roles
${roleList}`;
}
