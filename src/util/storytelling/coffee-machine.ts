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
 * Coffee machine adventure storytelling
 *
 * Story outcomes (single roll, 60% positive):
 * - 40% Perfect coffee, impress the boss (+150-300)
 * - 20% Discover secret menu, become coffee legend (+300-500)
 * - 25% Machine breaks, flood the kitchen (-150-300)
 * - 15% Machine explodes, coffee everywhere, pay for cleaning (-400-700)
 */
export async function generateCoffeeMachineStory(
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
		activityType: "coffee_machine_xp",
		notes: "Zkušenosti z dobrodružství s kávovarem",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "☕ Přicházíš k novému super-automatickému kávovaru v kuchyňce...",
		coinsChange: 0,
	});

	events.push({
		description: "🤔 Ovládací panel vypadá jako kokpit letadla. Tolik tlačítek!",
		coinsChange: 0,
	});

	events.push({
		description: "👆 Rozhoduješ se zmáčknout náhodnou kombinaci tlačítek...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 40) {
		// Perfect coffee
		events.push({
			description: "✨ Kávovar začíná bzučet a svítit všemi barvami...",
			coinsChange: 0,
		});

		events.push({
			description: "🎵 Hraje příjemná melodie a vychází dokonalé espresso!",
			coinsChange: 0,
		});

		const bonus = randomInt(150, 300);
		events.push({
			description: `☕ **Perfektní káva!** Šéf právě procházel kolem, ochutnal a byl tak nadšený, že ti dal bonus **${bonus}** mincí za zlepšení jeho dne.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "coffee_machine_success",
			notes: `Bonus za perfektní kávu: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 60) {
		// Secret menu discovered
		events.push({
			description: "🔮 Obrazovka náhle zčerná a objeví se tajné menu...",
			coinsChange: 0,
		});

		events.push({
			description: "📜 'TAJNÝ RECEPT #42 - LEGENDÁRNÍ MOKKA ODEMČENA'",
			coinsChange: 0,
		});

		events.push({
			description: "🌟 Kávovar připravuje něco, co jsi ještě nikdy neviděl...",
			coinsChange: 0,
		});

		const bonus = randomInt(300, 500);
		events.push({
			description: `🏆 **Objevil jsi tajné menu!** Celá kancelář se seběhla ochutnat legendární kávu. Kolegové ti házejí mince jako bys byl barista roku. Získáváš **${bonus}** mincí!`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "coffee_machine_legend",
			notes: `Bonus za objevení tajného menu: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 85) {
		// Machine breaks, flood
		events.push({
			description: "💧 Kávovar začíná vydávat podivné zvuky...",
			coinsChange: 0,
		});

		events.push({
			description: "🌊 Voda začíná téct ze všech stran!",
			coinsChange: 0,
		});

		events.push({
			description: "🏃 Panikařící kolegové utíkají z kuchyňky!",
			coinsChange: 0,
		});

		const damage = randomInt(150, 300);
		events.push({
			description: `💦 **Kávovar se pokazil!** Kuchyňka je zatopená. Údržba tě donutila zaplatit **${damage}** mincí za vysušení podlahy a opravu stroje.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "coffee_machine_flood",
			notes: `Náhrada za zátopu v kuchyňce: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// Explosion
		events.push({
			description: "⚠️ Kávovar začíná vibrovat a kouřit...",
			coinsChange: 0,
		});

		events.push({
			description: "🔴 Všechna světla blikají červeně! VAROVÁNÍ!",
			coinsChange: 0,
		});

		events.push({
			description: "💥 BOOM! Káva je doslova VŠUDE!",
			coinsChange: 0,
		});

		const penalty = randomInt(400, 700);
		events.push({
			description: `☠️ **Kávová apokalypsa!** Kávovar explodoval a pokryl celou kuchyňku (a tebe) vrstvou espresso. CEO měl zrovna bílou košili. Platíš **${penalty}** mincí za nový kávovar a čištění.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "coffee_machine_explosion",
			notes: `Pokuta za explozi kávovaru: ${penalty} mincí`,
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
