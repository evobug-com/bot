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
		description: "🎄 Účastníš se vánočního večírku...",
		coinsChange: 0,
	});

	events.push({
		description: "🍽️ Večeře je výborná, atmosféra příjemná...",
		coinsChange: 0,
	});

	events.push({
		description: "🎵 Hraje vánoční hudba, kolegové si povídají...",
		coinsChange: 0,
	});

	// Random outcome
	const outcome = Math.random() * 100;

	if (outcome < 40) {
		// Win raffle
		events.push({
			description: "🎟️ Účastníš se tomboly...",
			coinsChange: 0,
		});

		events.push({
			description: "🎲 Losuje se, čísla se odhalují...",
			coinsChange: 0,
		});

		const prize = randomInt(200, 500);
		events.push({
			description: `🎁 **Vyhrál jsi tombolu!** Tvoje číslo bylo vylosováno! Získáváš cenu v hodnotě **${prize}** mincí.`,
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
		events.push({
			description: "🍷 Začínáš popíjet s kolegy...",
			coinsChange: 0,
		});

		events.push({
			description: "🍺 Jeden drink... dva... tři... ztrácíš počet...",
			coinsChange: 0,
		});

		events.push({
			description: "💫 Všechno se začíná točit...",
			coinsChange: 0,
		});

		events.push({
			description: "💥 Srazil jsi drahocennou vázu z podstavce!",
			coinsChange: 0,
		});

		const damage = randomInt(100, 300);
		events.push({
			description: `🍷 **Opil jsi se a rozbil vázu!** HR tě upozorňuje, že to budou strhávat z výplaty. Musel jsi zaplatit **${damage}** mincí za náhradu.`,
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
		events.push({
			description: "💼 Využíváš příležitosti k networkingu...",
			coinsChange: 0,
		});

		events.push({
			description: "🤝 Bavíš se s CEO a klíčovými klienty...",
			coinsChange: 0,
		});

		events.push({
			description: "💡 Sdílíš zajímavé nápady a ukazuješ své odhodlání...",
			coinsChange: 0,
		});

		const raise = randomInt(500, 800);
		events.push({
			description: `🌟 **Skvělý networking!** Udělal jsi výborný dojem. Druhý den tě šéf volá do kanceláře a oznamuje ti zvýšení platu! Dostáváš **${raise}** mincí.`,
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
		events.push({
			description: "🎁 Otevírá se Secret Santa...",
			coinsChange: 0,
		});

		events.push({
			description: "📦 Dostáváš malou krabičku s USB diskem...",
			coinsChange: 0,
		});

		events.push({
			description: "💾 Na disku je... Bitcoin wallet!",
			coinsChange: 0,
		});

		events.push({
			description: "📈 Kontroluješ hodnotu - právě vyletěla nahoru!",
			coinsChange: 0,
		});

		const bitcoin = randomInt(1000, 2000);
		events.push({
			description: `🎅 **Secret Santa ti dal Bitcoin!** Prodal jsi ho ve správný moment za neuvěřitelných **${bitcoin}** mincí! Nejlepší dárek ever!`,
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
