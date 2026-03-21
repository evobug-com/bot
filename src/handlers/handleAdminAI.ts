/* eslint-disable no-await-in-loop -- Sequential execution with rate-limit delays between Discord API calls */
import { type Client, Events } from "discord.js";
import { isAdmin } from "../utils/admin.ts";
import { openrouter } from "../utils/openrouter.ts";
import { createLogger } from "../util/logger.ts";
import { gatherGuildContext } from "../services/adminAI/guildContext.ts";
import { buildSystemPrompt } from "../services/adminAI/prompt.ts";
import { adminToolDefinitions, executeToolCall, generateActionSummary } from "../services/adminAI/tools.ts";
import { buildCancelledEmbed, buildConfirmButtons, buildPreviewEmbed, buildResultEmbed } from "../services/adminAI/actionPreview.ts";
import type { ActionResult, PendingAdminAction, PlannedAction } from "../services/adminAI/types.ts";

const log = createLogger("AdminAI");

const ADMIN_AI_MODEL = "anthropic/claude-sonnet-4-20250514";
const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const ACTION_DELAY_MS = 300;

const pendingActions = new Map<string, PendingAdminAction>();


function generateSessionId(): string {
	return `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function cleanExpiredSessions(): void {
	const now = Date.now();
	for (const [id, session] of pendingActions) {
		if (now - session.createdAt > SESSION_EXPIRY_MS) {
			pendingActions.delete(id);
		}
	}
}

export function handleAdminAI(client: Client<true>): void {
	if (!openrouter) {
		log("warn", "OpenRouter not configured, Admin AI disabled");
		return;
	}

	// Capture non-null reference for use in closures
	const ai = openrouter;

	client.on(Events.MessageCreate, async (message) => {
		try {
			// Skip bots, DMs, non-mentions
			if (message.author.bot) return;
			if (!message.guild) return;
			if (!message.mentions.has(client.user.id)) return;

			// Check admin
			if (!isAdmin(message.author.id)) return;

			// Strip mention from content
			const content = message.content
				.replace(new RegExp(`<@!?${client.user.id}>`, "g"), "")
				.trim();

			if (!content) return;

			cleanExpiredSessions();

			// Send typing indicator
			await message.channel.sendTyping();

			// Gather guild context
			const guildContext = gatherGuildContext(message.guild);
			const systemPrompt = buildSystemPrompt(guildContext);

			// Call Claude via OpenRouter
			const response = await ai.chat.completions.create({
				model: ADMIN_AI_MODEL,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content },
				],
				tools: adminToolDefinitions,
				temperature: 0,
			});

			const choice = response.choices[0];
			if (!choice) {
				await message.reply("Nedostal jsem odpoved od AI.");
				return;
			}

			const assistantMessage = choice.message;

			// If text-only response (clarification/refusal)
			if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
				const textContent = assistantMessage.content ?? "Nemam co odpovedet.";
				await message.reply(textContent);
				return;
			}

			// Parse function tool calls into planned actions
			const functionCalls = assistantMessage.tool_calls.filter((tc) => tc.type === "function");
			const actions: PlannedAction[] = functionCalls.map((tc) => {
				const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
				return {
					toolCallId: tc.id,
					functionName: tc.function.name,
					arguments: args,
					displaySummary: generateActionSummary(tc.function.name, args, guildContext),
				};
			});

			if (actions.length === 0) {
				const textContent = assistantMessage.content ?? "Nemam co odpovedet.";
				await message.reply(textContent);
				return;
			}

			// Build preview
			const sessionId = generateSessionId();
			const previewEmbed = buildPreviewEmbed(actions, assistantMessage.content ?? undefined);
			const buttons = buildConfirmButtons(sessionId);

			const reply = await message.reply({
				embeds: [previewEmbed],
				components: [buttons.toJSON()],
			});

			// Store pending action
			pendingActions.set(sessionId, {
				id: sessionId,
				guildId: message.guild.id,
				channelId: message.channel.id,
				userId: message.author.id,
				messageId: reply.id,
				actions,
				createdAt: Date.now(),
			});
		} catch (error) {
			log("error", "Error processing admin AI message:", error);
			try {
				await message.reply("Doslo k chybe pri zpracovani pozadavku.");
			} catch {
				// ignore reply failure
			}
		}
	});

	client.on(Events.InteractionCreate, async (interaction) => {
		if (!interaction.isButton()) return;

		const customId = interaction.customId;
		const isConfirm = customId.startsWith("admin_ai_confirm_");
		const isCancel = customId.startsWith("admin_ai_cancel_");

		if (!isConfirm && !isCancel) return;

		const sessionId = customId.replace(/^admin_ai_(confirm|cancel)_/, "");
		const session = pendingActions.get(sessionId);

		if (!session) {
			await interaction.reply({
				content: "Tato akce vyprsela nebo nebyla nalezena.",
				flags: 64, // Ephemeral
			});
			return;
		}

		// Verify the interacting user is the original admin
		if (interaction.user.id !== session.userId) {
			await interaction.reply({
				content: "Tuto akci muze potvrdit pouze admin, ktery ji vytvoril.",
				flags: 64,
			});
			return;
		}

		pendingActions.delete(sessionId);

		if (isCancel) {
			const cancelEmbed = buildCancelledEmbed();
			await interaction.update({
				embeds: [cancelEmbed],
				components: [],
			});
			return;
		}

		// Execute actions
		await interaction.deferUpdate();

		const guild = interaction.guild;
		if (!guild) {
			await interaction.editReply({
				content: "Guild nenalezen.",
				embeds: [],
				components: [],
			});
			return;
		}

		const results: ActionResult[] = [];
		for (const [i, action] of session.actions.entries()) {
			const result = await executeToolCall(guild, action.functionName, action.arguments);
			result.toolCallId = action.toolCallId;
			results.push(result);

			// Small delay between operations to avoid rate limiting
			if (i < session.actions.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, ACTION_DELAY_MS));
			}
		}

		const resultEmbed = buildResultEmbed(results);
		await interaction.editReply({
			embeds: [resultEmbed],
			components: [],
		});

		log("info", `Admin AI: Executed ${results.filter((r) => r.success).length}/${results.length} actions for ${interaction.user.tag}`);
	});

	log("info", "Admin AI handler initialized");
}
