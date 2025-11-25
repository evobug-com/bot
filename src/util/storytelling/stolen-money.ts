import { orpc } from "../../client/client.ts";

interface StoryResult {
	story: string;
	totalCoinsChange: number;
	xpGranted: number;
}

interface StoryEvent {
	description: string;
	coinsChange: number;
}

/**
 * Random number generator helper
 */
function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates the stolen-money storytelling experience with single-roll outcome
 *
 * Story outcomes (single roll at start, 70% positive):
 * - 40% Lucky escape - keep all stolen money (+200-1000)
 * - 20% Block fine - pay small fine, keep most (+50-500 net)
 * - 10% Win court case - dramatic but keep everything (+200-1000)
 * - 30% Lose court case - pay penalty (-100-300)
 */
export async function generateStolenMoneyStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	// Calculate XP (double base work: level * 6 + 50)
	const xpAmount = userLevel * 6 + 50;

	// Grant XP immediately at story start
	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "stolen_money_xp",
		notes: "Získal jsi zkušenosti z krádeže peněz babičce",
	});

	if (xpError) {
		throw xpError;
	}

	// SINGLE ROLL - determine outcome at the start
	const outcome = Math.random() * 100;

	// Determine stolen amount (same for all paths)
	const stolenAmount = randomInt(200, 1000);

	// Step 1: Steal money from grandma (always happens)
	events.push({
		description: `💰 Ukradl jsi **${stolenAmount}** mincí babičce z peněženky.`,
		coinsChange: stolenAmount,
	});

	if (outcome < 40) {
		// OUTCOME: Lucky escape - not caught at all (40%)
		events.push({
			description: "👀 Rozhlížíš se, jestli tě někdo neviděl...",
			coinsChange: 0,
		});

		events.push({
			description: "🚶 Rychle opouštíš místo činu...",
			coinsChange: 0,
		});

		events.push({
			description: "🍀 **Štěstí!** Policie tě nedopadla. Všechny peníze si necháváš!",
			coinsChange: 0,
		});

		// Grant stolen amount
		const [stealError] = await orpc.users.stats.reward.grant({
			userId,
			coins: stolenAmount,
			xp: 0,
			activityType: "stolen_money_success",
			notes: `Ukradl ${stolenAmount} mincí babičce - unikl`,
		});

		if (stealError) {
			throw stealError;
		}

		totalCoinsChange = stolenAmount;
	} else if (outcome < 60) {
		// OUTCOME: Block fine - caught but smooth it over (20%)
		events.push({
			description: "🚔 **Policie tě dopadla!**",
			coinsChange: 0,
		});

		events.push({
			description: "👮 Policista se na tebe přísně dívá...",
			coinsChange: 0,
		});

		const fineAmount = randomInt(100, 300);
		const netGain = stolenAmount - fineAmount;

		events.push({
			description: `💬 Vykecal jsi se na **blokovou pokutu ${fineAmount}** mincí.`,
			coinsChange: -fineAmount,
		});

		events.push({
			description: `✅ Zůstalo ti **${netGain}** mincí z loupeže.`,
			coinsChange: 0,
		});

		// Grant net gain
		const [netError] = await orpc.users.stats.reward.grant({
			userId,
			coins: netGain,
			xp: 0,
			activityType: "stolen_money_fine",
			notes: `Ukradl ${stolenAmount}, zaplatil pokutu ${fineAmount}, čistý zisk ${netGain}`,
		});

		if (netError) {
			throw netError;
		}

		totalCoinsChange = netGain;
	} else if (outcome < 70) {
		// OUTCOME: Win court case - dramatic journey but happy ending (10%)
		events.push({
			description: "🚔 **Policie tě dopadla!**",
			coinsChange: 0,
		});

		events.push({
			description: "⚖️ Věc se předává **obvodnímu soudu**...",
			coinsChange: 0,
		});

		events.push({
			description: "👨‍⚖️ Soudce pečlivě zkoumá důkazy...",
			coinsChange: 0,
		});

		events.push({
			description: "📜 Tvůj advokát přednáší brilantní obhajobu...",
			coinsChange: 0,
		});

		events.push({
			description: `🎉 **Vyhrál jsi soud!** Všechny peníze (**${stolenAmount}** mincí) si necháváš.`,
			coinsChange: 0,
		});

		// Grant stolen amount
		const [winError] = await orpc.users.stats.reward.grant({
			userId,
			coins: stolenAmount,
			xp: 0,
			activityType: "stolen_money_court_win",
			notes: `Ukradl ${stolenAmount} mincí, vyhrál soud`,
		});

		if (winError) {
			throw winError;
		}

		totalCoinsChange = stolenAmount;
	} else {
		// OUTCOME: Lose court case - penalty (30%)
		events.push({
			description: "🚔 **Policie tě dopadla!**",
			coinsChange: 0,
		});

		events.push({
			description: "⚖️ Věc se předává **obvodnímu soudu**...",
			coinsChange: 0,
		});

		events.push({
			description: "👨‍⚖️ Soudce má špatnou náladu...",
			coinsChange: 0,
		});

		events.push({
			description: "📜 Důkazy jsou proti tobě příliš silné...",
			coinsChange: 0,
		});

		const penaltyAmount = randomInt(100, 300);
		events.push({
			description: `😢 **Prohrál jsi soud.** Musíš vrátit ukradené peníze a zaplatit pokutu **${penaltyAmount}** mincí.`,
			coinsChange: -penaltyAmount,
		});

		// Apply penalty only (no gain from theft)
		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penaltyAmount,
			xp: 0,
			activityType: "stolen_money_court_loss",
			notes: `Prohrál soud - pokuta ${penaltyAmount} mincí`,
		});

		if (penaltyError) {
			throw penaltyError;
		}

		totalCoinsChange = -penaltyAmount;
	}

	// Build the complete story narrative
	const storyLines = events.map((event) => {
		if (event.coinsChange !== 0) {
			const sign = event.coinsChange > 0 ? "+" : "";
			return `${event.description} (${sign}${event.coinsChange} mincí)`;
		}
		return event.description;
	});

	// Add summary at the end
	const summarySign = totalCoinsChange >= 0 ? "+" : "";
	storyLines.push("");
	storyLines.push(`**Celková bilance:** ${summarySign}${totalCoinsChange} mincí, +${xpAmount} XP`);

	return {
		story: storyLines.join("\n"),
		totalCoinsChange,
		xpGranted: xpAmount,
	};
}
