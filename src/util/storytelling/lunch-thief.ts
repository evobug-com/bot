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
 * Lunch thief investigation storytelling
 *
 * Story outcomes (single roll, 55% positive):
 * - 30% Catch the thief, get reward (+250-400)
 * - 25% Thief apologizes and buys you expensive lunch (+150-300)
 * - 30% False accusation, you're the one in trouble (-200-400)
 * - 15% Turns out YOU ate it and forgot (-100-250)
 */
export async function generateLunchThiefStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	const xpAmount = userLevel * 5 + 40;

	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "lunch_thief_xp",
		notes: "Zkušenosti z pátrání po zloději obědů",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "🍱 Otevíráš ledničku pro svůj pečlivě připravený oběd...",
		coinsChange: 0,
	});

	events.push({
		description: "😱 TEN TU NENÍ! Někdo ti ukradl oběd!",
		coinsChange: 0,
	});

	events.push({
		description: "🕵️ Rozhoduješ se vypátrat zloděje...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 30) {
		// Catch the thief
		events.push({
			description: "📹 Jdeš za security a žádáš záznamy z kamer...",
			coinsChange: 0,
		});

		events.push({
			description: "👀 Na videu jasně vidíš kolegu z účetního, jak bere tvou krabičku!",
			coinsChange: 0,
		});

		events.push({
			description: "😤 Konfrontuješ ho před celou kanceláří!",
			coinsChange: 0,
		});

		const bonus = randomInt(250, 400);
		events.push({
			description: `🏆 **Spravedlnost zvítězila!** Zloděj byl odhalen jako sériový lunch thief. Dostal výpověď a jeho stůl ti připadl - včetně jeho sbírky energy drinků v hodnotě **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "lunch_thief_caught",
			notes: `Odměna za dopadení zloděje: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 55) {
		// Thief apologizes
		events.push({
			description: "😢 Kolega přichází s provinilým výrazem...",
			coinsChange: 0,
		});

		events.push({
			description: "🙏 'Promiň, měl jsem hrozný hlad a zapomněl jsem peněženku...'",
			coinsChange: 0,
		});

		events.push({
			description: "🤝 Rozhodneš se mu odpustit...",
			coinsChange: 0,
		});

		const bonus = randomInt(150, 300);
		events.push({
			description: `🍽️ **Karma se vrací!** Kolega tě jako omluvu vzal do nejdražší restaurace v okolí. A zaplatil. Ušetřil jsi **${bonus}** mincí a získal nového kámoše.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "lunch_thief_forgiven",
			notes: `Úspora za drahý oběd: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 85) {
		// False accusation
		events.push({
			description: "😡 Obviníš nevinného kolegu před všemi...",
			coinsChange: 0,
		});

		events.push({
			description: "📹 Security přináší důkazy - tvůj oběd snědla... uklízečka po směně!",
			coinsChange: 0,
		});

		events.push({
			description: "😳 Všichni tě teď nenávidí za falešné obvinění...",
			coinsChange: 0,
		});

		const damage = randomInt(200, 400);
		events.push({
			description: `😞 **Zostudil ses!** Musel jsi veřejně omluvit kolegu a koupit celému týmu kávu jako odškodné. Stálo tě to **${damage}** mincí.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "lunch_thief_false_accusation",
			notes: `Odškodné za falešné obvinění: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// You ate it
		events.push({
			description: "🤔 Počkat, co to máš v koši pod stolem...",
			coinsChange: 0,
		});

		events.push({
			description: "😅 To je přece ta krabička od TVÉHO oběda!",
			coinsChange: 0,
		});

		events.push({
			description: "🤦 Ty jsi ho snědl v 10 ráno a úplně zapomněl!",
			coinsChange: 0,
		});

		const damage = randomInt(100, 250);
		events.push({
			description: `🍕 **Trapas století!** Celá kancelář viděla tvé drama. Ze studu jsi všem objednal pizzu, aby se na to zapomnělo. Cena za zachování důstojnosti: **${damage}** mincí.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "lunch_thief_self",
			notes: `Pizza pro kolegy jako omluva: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	}

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
