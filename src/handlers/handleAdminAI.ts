/* eslint-disable no-await-in-loop -- Sequential execution with rate-limit delays between Discord API calls */
import { type Client, Events } from "discord.js";
import { isAdmin } from "../utils/admin.ts";
import { openrouter } from "../utils/openrouter.ts";
import { createLogger } from "../util/logger.ts";
import { gatherGuildContext } from "../services/adminAI/guildContext.ts";
import { buildSystemPrompt } from "../services/adminAI/prompt.ts";
import { adminToolDefinitions, executeInfoTool, executeToolCall, generateActionSummary, INFO_TOOLS } from "../services/adminAI/tools.ts";
import { buildCancelledEmbed, buildConfirmButtons, buildPreviewEmbed, buildResultEmbed } from "../services/adminAI/actionPreview.ts";
import { gatherConversationHistory } from "../services/adminAI/conversationHistory.ts";
import type { ActionResult, PendingAdminAction, PlannedAction } from "../services/adminAI/types.ts";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const log = createLogger("AdminAI");

// `~anthropic/claude-sonnet-latest` is OpenRouter's auto-routing alias that
// always redirects to the newest Sonnet. The `~` prefix is part of the slug
// (OpenRouter's marker for variant/alias models) — without it OpenRouter
// rejects the request with "not a valid model ID".
const ADMIN_AI_MODEL = "~anthropic/claude-sonnet-latest";
const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const ACTION_DELAY_MS = 300;
const MAX_TOOL_LOOP_ITERATIONS = 5;

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

			// Walk reply chain to reconstruct prior conversation with this admin
			const history = await gatherConversationHistory(message, client.user.id);

			const messages: ChatCompletionMessageParam[] = [
				{ role: "system", content: systemPrompt },
				...history.map<ChatCompletionMessageParam>((h) => ({ role: h.role, content: h.content })),
				{ role: "user", content },
			];

			// Multi-step tool loop: info tools execute inline, action tools collect for confirmation
			let actions: PlannedAction[] = [];
			let finalText: string | null = null;

			// eslint-disable-next-line no-await-in-loop -- Each AI call depends on prior tool results
			for (let iter = 0; iter < MAX_TOOL_LOOP_ITERATIONS; iter++) {
				const response = await ai.chat.completions.create({
					model: ADMIN_AI_MODEL,
					messages,
					tools: adminToolDefinitions,
					temperature: 0,
				});

				const choice = response.choices[0];
				if (!choice) {
					finalText = "Nedostal jsem odpoved od AI.";
					break;
				}

				const assistantMessage = choice.message;
				const functionCalls = (assistantMessage.tool_calls ?? []).filter((tc) => tc.type === "function");

				if (functionCalls.length === 0) {
					finalText = assistantMessage.content ?? "Nemam co odpovedet.";
					break;
				}

				const actionCalls = functionCalls.filter((tc) => !INFO_TOOLS.has(tc.function.name));
				const infoCalls = functionCalls.filter((tc) => INFO_TOOLS.has(tc.function.name));

				// If model returned info calls (alone or mixed with actions), execute
				// them FIRST and feed results back. The OpenAI tool-call protocol
				// requires a tool result for every tool_call in the assistant message
				// before the next assistant turn — so when we have info calls, we
				// must satisfy ALL tool_calls (including action ones with a stub
				// result) before looping. Discarding the action plan here is correct:
				// the model gets fresh info on the next iteration and re-plans.
				if (infoCalls.length > 0) {
					messages.push({
						role: "assistant",
						content: assistantMessage.content ?? null,
						tool_calls: assistantMessage.tool_calls,
					});

					// eslint-disable-next-line no-await-in-loop -- Sequential tool execution to preserve order
					for (const ic of infoCalls) {
						const args = JSON.parse(ic.function.arguments) as Record<string, unknown>;
						const result = await executeInfoTool(message.guild, ic.function.name, args);
						messages.push({
							role: "tool",
							tool_call_id: ic.id,
							content: result,
						});
					}

					// Stub results for action tool_calls so the protocol stays valid.
					// The action plan from this turn is intentionally discarded; the
					// model will re-plan on the next iteration with the info results
					// in context.
					for (const ac of actionCalls) {
						messages.push({
							role: "tool",
							tool_call_id: ac.id,
							content: "(deferred: action plans must be issued in a separate turn after info results)",
						});
					}

					continue;
				}

				// Pure action turn — plan for confirmation and exit loop
				actions = actionCalls.map((tc) => {
					const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
					return {
						toolCallId: tc.id,
						functionName: tc.function.name,
						arguments: args,
						displaySummary: generateActionSummary(tc.function.name, args, guildContext),
					};
				});
				finalText = assistantMessage.content ?? null;
				break;
			}

			if (actions.length === 0) {
				await message.reply(finalText ?? "Nemam co odpovedet.");
				return;
			}

			// Build preview for action confirmation
			const sessionId = generateSessionId();
			const previewEmbed = buildPreviewEmbed(actions, finalText ?? undefined);
			const buttons = buildConfirmButtons(sessionId);

			const reply = await message.reply({
				embeds: [previewEmbed],
				components: [buttons.toJSON()],
			});

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
