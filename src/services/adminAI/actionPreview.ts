import { ActionRowBuilder, DangerButtonBuilder, EmbedBuilder, PrimaryButtonBuilder } from "@discordjs/builders";
import type { ActionResult, PlannedAction } from "./types.ts";

export function buildPreviewEmbed(actions: PlannedAction[], aiMessage?: string): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setColor(0xfee75c) // Yellow
		.setTitle("Admin AI - Plan akci")
		.setTimestamp();

	const lines = actions.map((action, i) => `${i + 1}. ${action.displaySummary}`);
	embed.setDescription(lines.join("\n"));

	if (aiMessage) {
		embed.addFields({ name: "AI zprava", value: aiMessage });
	}

	return embed;
}

export function buildConfirmButtons(sessionId: string): ActionRowBuilder {
	const confirmButton = new PrimaryButtonBuilder()
		.setCustomId(`admin_ai_confirm_${sessionId}`)
		.setLabel("Potvrdit")
		.setEmoji({ name: "✅" });

	const cancelButton = new DangerButtonBuilder()
		.setCustomId(`admin_ai_cancel_${sessionId}`)
		.setLabel("Zrusit")
		.setEmoji({ name: "❌" });

	return new ActionRowBuilder().addComponents(confirmButton, cancelButton);
}

export function buildResultEmbed(results: ActionResult[]): EmbedBuilder {
	const successCount = results.filter((r) => r.success).length;
	const totalCount = results.length;

	let color: number;
	if (successCount === totalCount) {
		color = 0x57f287; // Green
	} else if (successCount === 0) {
		color = 0xed4245; // Red
	} else {
		color = 0xffa500; // Orange
	}

	const lines = results.map((r) => {
		const icon = r.success ? "✅" : "❌";
		return `${icon} ${r.message}`;
	});

	return new EmbedBuilder()
		.setColor(color)
		.setTitle(`Admin AI - Vysledek (${successCount}/${totalCount})`)
		.setDescription(lines.join("\n"))
		.setTimestamp();
}

export function buildCancelledEmbed(): EmbedBuilder {
	return new EmbedBuilder()
		.setColor(0x95a5a6) // Grey
		.setTitle("Admin AI - Zruseno")
		.setDescription("Akce byla zrusena.")
		.setTimestamp();
}
