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
 * Office prank storytelling with single-roll outcome
 *
 * Story outcomes (single roll at start, 70% positive):
 * - 70% Everyone laughs, boss gives bonus (+200-400)
 * - 20% Colleague gets angry, breaks keyboard (-100-200)
 * - 10% Prank goes wrong, IT must fix server (-300-600)
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
		description: "🎭 Plánuješ žertík s počítačem kolegy...",
		coinsChange: 0,
	});

	events.push({
		description: "🖱️ Zatímco je na obědě, měníš mu pozadí na vtipný obrázek...",
		coinsChange: 0,
	});

	events.push({
		description: "⌨️ A navíc přehazuješ několik kláves na klávesnici...",
		coinsChange: 0,
	});

	events.push({
		description: "👀 Kolega se vrací a zapíná počítač...",
		coinsChange: 0,
	});

	// Random outcome
	const outcome = Math.random() * 100;

	if (outcome < 70) {
		// Everyone laughs - bonus (70%)
		events.push({
			description: "😆 Kolega se začíná smát...",
			coinsChange: 0,
		});

		events.push({
			description: "🤣 Ostatní si toho všimli a přidávají se!",
			coinsChange: 0,
		});

		const bonus = randomInt(200, 400);
		events.push({
			description: `😂 **Všichni se smějí!** Atmosféra v kanceláři se zlepšila. Šéf oceňuje tvou kreativitu a dává ti bonus **${bonus}** mincí.`,
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
	} else if (outcome < 90) {
		// Colleague gets angry (20%)
		events.push({
			description: "😠 Kolega vypadá naštvaně...",
			coinsChange: 0,
		});

		events.push({
			description: "🔥 Jeho tvář červená vztekem, má důležitou prezentaci!",
			coinsChange: 0,
		});

		const damage = randomInt(100, 200);
		events.push({
			description: `😡 **Kolega se rozzlobil!** V hněvu náhodou rozbil tvou klávesnici při gestikulaci. Musíš zaplatit **${damage}** mincí za novou.`,
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
		// Prank goes terribly wrong (10%)
		events.push({
			description: "⚠️ Něco se pokazilo... Počítač zamrzl...",
			coinsChange: 0,
		});

		events.push({
			description: "🚨 Celý firemní server je dole!",
			coinsChange: 0,
		});

		events.push({
			description: "💻 Tvoje úprava nějakým způsobem spustila kritickou chybu!",
			coinsChange: 0,
		});

		const penalty = randomInt(300, 600);
		events.push({
			description: `💥 **Žertík se strašně pokazil!** IT tým musel pracovat celou noc na obnovení systému. CTO je rozzuřený. Zaplatil jsi pokutu **${penalty}** mincí.`,
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
