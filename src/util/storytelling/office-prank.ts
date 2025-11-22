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

function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Office prank storytelling
 *
 * Flow:
 * - 50% Everyone laughs, boss gives bonus (+2000-4000)
 * - 30% Colleague gets angry, breaks keyboard (-1000-2000)
 * - 20% Prank goes wrong, IT must fix server (-3000-6000)
 */
export async function generateOfficePrankStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	// Calculate XP (double base work)
	const xpAmount = userLevel * 6 + 50;

	// Grant XP immediately
	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "office_prank_xp",
		notes: "Získal jsi zkušenosti z kancelářského žertíku",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "Udělal jsi kolegovi žertík s jeho počítačem...",
		coinsChange: 0,
	});

	// Random outcome
	const outcome = Math.random() * 100;

	if (outcome < 50) {
		// Everyone laughs - bonus
		const bonus = randomInt(200, 400);
		events.push({
			description: `😂 **Všichni se smějí!** Šéf ti dává bonus **${bonus}** mincí za zlepšení atmosféry v kanceláři.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "office_prank_success",
			notes: `Bonus za úspěšný žertík: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 80) {
		// Colleague gets angry
		const damage = randomInt(100, 200);
		events.push({
			description: `😡 **Kolega se rozzlobil** a v hněvu rozbil tvou klávesnici. Musíš zaplatit **${damage}** mincí za novou.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "office_prank_backfire",
			notes: `Náhrada za rozbitou klávesnici: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// Prank goes terribly wrong
		const penalty = randomInt(300, 600);
		events.push({
			description: `💥 **Žertík se strašně pokazil!** Nějakým způsobem jsi způsobil pád serveru. IT muselo pracovat přes noc. Zaplatil jsi pokutu **${penalty}** mincí.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "office_prank_disaster",
			notes: `Pokuta za pád serveru: ${penalty} mincí`,
		});

		if (penaltyError) {
			throw penaltyError;
		}

		totalCoinsChange -= penalty;
	}

	// Build story
	const storyLines = events.map((event) => {
		if (event.coinsChange !== 0) {
			const sign = event.coinsChange > 0 ? "+" : "";
			return `${event.description} (${sign}${event.coinsChange} mincí)`;
		}
		return event.description;
	});

	storyLines.push("");
	const summarySign = totalCoinsChange >= 0 ? "+" : "";
	storyLines.push(`**Celková bilance:** ${summarySign}${totalCoinsChange} mincí, +${xpAmount} XP`);

	return {
		story: storyLines.join("\n"),
		totalCoinsChange,
		xpGranted: xpAmount,
	};
}
