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
 * Hackathon storytelling
 *
 * Story outcomes (single roll, 65% positive):
 * - 30% Win the hackathon, get prize money (+500-800)
 * - 20% Get runner-up, still good prize (+250-400)
 * - 15% Project gets acquired by company (+300-550)
 * - 20% Total failure, sleep deprived for nothing (-150-300)
 * - 15% Team drama, fight with teammates (-200-450)
 */
export async function generateHackathonStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	const xpAmount = userLevel * 8 + 70;

	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "hackathon_xp",
		notes: "Zkušenosti z hackathonu",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "💻 Přihlásil ses na 48hodinový hackathon...",
		coinsChange: 0,
	});

	events.push({
		description: "👥 Tvůj tým má skvělý nápad na aplikaci!",
		coinsChange: 0,
	});

	events.push({
		description: "☕ 47 hodin bez spánku, 23 energy drinků, nekonečné řádky kódu...",
		coinsChange: 0,
	});

	events.push({
		description: "🎤 Čas na finální prezentaci před porotou...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 30) {
		// Win hackathon
		events.push({
			description: "🌟 Tvoje demo je perfektní! Porota je ohromená!",
			coinsChange: 0,
		});

		events.push({
			description: "🥁 Vyhlašují výsledky...",
			coinsChange: 0,
		});

		events.push({
			description: "🏆 'A VÍTĚZEM JE... VÁŠ TÝM!'",
			coinsChange: 0,
		});

		const bonus = randomInt(500, 800);
		events.push({
			description: `🎉 **VÍTĚZSTVÍ!** Tvůj tým vyhrál hlavní cenu! Tech média o vás píší. Prize money: **${bonus}** mincí plus sláva!`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "hackathon_winner",
			notes: `Výhra v hackathonu: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 50) {
		// Runner-up
		events.push({
			description: "👏 Porota chválí váš projekt...",
			coinsChange: 0,
		});

		events.push({
			description: "🥈 Druhé místo! Těsně za vítězi!",
			coinsChange: 0,
		});

		events.push({
			description: "😊 Pořád skvělý výsledek za 48 hodin práce!",
			coinsChange: 0,
		});

		const bonus = randomInt(250, 400);
		events.push({
			description: `🏅 **Stříbrná medaile!** Nebyli jste první, ale investor v porotě si vás všiml. Nabízí mentoringový program a bonus **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "hackathon_runner_up",
			notes: `Druhé místo v hackathonu: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 65) {
		// Project acquired
		events.push({
			description: "🤔 Porota váš projekt nepochopila...",
			coinsChange: 0,
		});

		events.push({
			description: "😞 Ani jste nevyhráli... ale počkat!",
			coinsChange: 0,
		});

		events.push({
			description: "👔 Někdo z obecenstva k vám přichází...",
			coinsChange: 0,
		});

		const bonus = randomInt(300, 550);
		events.push({
			description: `💼 **Akvizice!** Startup z publika chce koupit váš projekt! Sice jste nevyhráli hackathon, ale prodali jste kód za **${bonus}** mincí!`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "hackathon_acquired",
			notes: `Prodej projektu z hackathonu: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 85) {
		// Total failure
		events.push({
			description: "🐛 Demo crashuje přímo před porotou...",
			coinsChange: 0,
		});

		events.push({
			description: "😰 Nic nefunguje! 48 hodin práce v koši!",
			coinsChange: 0,
		});

		events.push({
			description: "😴 Jsi tak unavený, že usneš během prezentace...",
			coinsChange: 0,
		});

		const damage = randomInt(150, 300);
		events.push({
			description: `💀 **Totální propadák!** Promrhal jsi víkend, zdraví, a ještě jsi musel zaplatit za rozbité vybavení, které jsi ve frustraci hodil ze stolu. Škoda: **${damage}** mincí.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "hackathon_failure",
			notes: `Škoda za nepovedený hackathon: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// Team drama
		events.push({
			description: "😤 Kolega v týmu chce všechno předělat hodinu před deadlinem...",
			coinsChange: 0,
		});

		events.push({
			description: "🔥 Hádka eskaluje! Létají nadávky!",
			coinsChange: 0,
		});

		events.push({
			description: "💔 Tým se rozpadá přímo na pódiu...",
			coinsChange: 0,
		});

		const penalty = randomInt(200, 450);
		events.push({
			description: `😱 **Týmové drama!** Rozkmotřil ses s kolegou tak, že už spolu nemluvíte. V práci je to awkward. Musel jsi koupit omluvu pro celý tým: **${penalty}** mincí.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "hackathon_drama",
			notes: `Náklady na usmíření týmu: ${penalty} mincí`,
		});

		if (penaltyError) {
			throw penaltyError;
		}

		totalCoinsChange -= penalty;
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
