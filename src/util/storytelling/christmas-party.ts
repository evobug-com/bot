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
 * Christmas party storytelling
 *
 * Flow:
 * - 40% Win raffle (+2000-5000)
 * - 30% Get drunk, break vase (-1000-3000)
 * - 20% Great networking, boss raises salary (+5000-8000)
 * - 10% Secret Santa gives Bitcoin! (+10000-20000)
 */
export async function generateChristmasPartyStory(
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
		activityType: "christmas_party_xp",
		notes: "Získal jsi zkušenosti z vánočního večírku",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "Účastníš se vánočního večírku...",
		coinsChange: 0,
	});

	// Random outcome
	const outcome = Math.random() * 100;

	if (outcome < 40) {
		// Win raffle
		const prize = randomInt(200, 500);
		events.push({
			description: `🎁 **Vyhrál jsi tombolu!** Získáváš **${prize}** mincí v ceně.`,
			coinsChange: prize,
		});

		const [prizeError] = await orpc.users.stats.reward.grant({
			userId,
			coins: prize,
			xp: 0,
			activityType: "christmas_party_raffle",
			notes: `Výhra v tombole: ${prize} mincí`,
		});

		if (prizeError) {
			throw prizeError;
		}

		totalCoinsChange += prize;
	} else if (outcome < 70) {
		// Get drunk
		const damage = randomInt(100, 300);
		events.push({
			description: `🍷 **Opil jsi se** a v opilosti jsi rozbil drahocennou vázu. Musel jsi zaplatit **${damage}** mincí za náhradu.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "christmas_party_drunk",
			notes: `Náhrada za rozbitou vázu: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else if (outcome < 90) {
		// Great networking
		const raise = randomInt(500, 800);
		events.push({
			description: `🤝 **Skvělý networking!** Udělal jsi dojem na šéfa a důležité klienty. Šéf ti zvyšuje plat! Dostáváš **${raise}** mincí.`,
			coinsChange: raise,
		});

		const [raiseError] = await orpc.users.stats.reward.grant({
			userId,
			coins: raise,
			xp: 0,
			activityType: "christmas_party_networking",
			notes: `Zvýšení platu: ${raise} mincí`,
		});

		if (raiseError) {
			throw raiseError;
		}

		totalCoinsChange += raise;
	} else {
		// Secret Santa Bitcoin
		const bitcoin = randomInt(1000, 2000);
		events.push({
			description: `🎅 **Secret Santa ti dal Bitcoin!** Hodnota Bitcoinu právě vyletěla nahoru. Prodal jsi ho za **${bitcoin}** mincí!`,
			coinsChange: bitcoin,
		});

		const [bitcoinError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bitcoin,
			xp: 0,
			activityType: "christmas_party_bitcoin",
			notes: `Bitcoin od Secret Santa: ${bitcoin} mincí`,
		});

		if (bitcoinError) {
			throw bitcoinError;
		}

		totalCoinsChange += bitcoin;
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
