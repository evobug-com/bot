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
 * Stuck in elevator storytelling
 *
 * Story outcomes (single roll, 60% positive):
 * - 30% Stuck with CEO, pitch your idea, get funding (+350-600)
 * - 30% Stuck with cute colleague, get a date (+200-350)
 * - 25% Stuck alone, miss deadline (-150-300)
 * - 15% Stuck with HR, accidentally admit to time theft (-400-700)
 */
export async function generateElevatorStuckStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	const xpAmount = userLevel * 5 + 50;

	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "elevator_stuck_xp",
		notes: "Zkušenosti ze zaseknutého výtahu",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "🛗 Nastupuješ do výtahu a mačkáš tlačítko svého patra...",
		coinsChange: 0,
	});

	events.push({
		description: "⚡ Výtah se najednou zastavil! Světla blikají!",
		coinsChange: 0,
	});

	events.push({
		description: "🔔 Zmáčkl jsi nouzové tlačítko. Prý to bude hodina...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 30) {
		// Stuck with CEO
		events.push({
			description: "👔 Otáčíš se a... to je přece CEO!",
			coinsChange: 0,
		});

		events.push({
			description: "💬 'Tak co, na čem pracuješ?' ptá se...",
			coinsChange: 0,
		});

		events.push({
			description: "💡 Tohle je tvoje šance! Začínáš prezentovat svůj side project...",
			coinsChange: 0,
		});

		const bonus = randomInt(350, 600);
		events.push({
			description: `🚀 **CEO je nadšený!** Tvůj nápad ho zaujal natolik, že ti slíbil budget na vývoj. Dostáváš **${bonus}** mincí jako startovní investici do projektu.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "elevator_ceo_pitch",
			notes: `Investice od CEO: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 60) {
		// Stuck with colleague
		events.push({
			description: "👀 Vedle tebe stojí ta osoba z marketingu, co se ti líbí...",
			coinsChange: 0,
		});

		events.push({
			description: "😅 Začínáte konverzaci, abyste zahnat nervozitu...",
			coinsChange: 0,
		});

		events.push({
			description: "💕 Zjišťujete, že máte společné zájmy!",
			coinsChange: 0,
		});

		const bonus = randomInt(200, 350);
		events.push({
			description: `💘 **Máš rande!** Domluvili jste si schůzku na pátek. Tvoje produktivita celý týden stoupla o 200%. Bonus za výkon: **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "elevator_date",
			notes: `Bonus za zvýšenou produktivitu: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 85) {
		// Stuck alone
		events.push({
			description: "😐 Jsi tu úplně sám...",
			coinsChange: 0,
		});

		events.push({
			description: "📱 Baterie v telefonu umírá...",
			coinsChange: 0,
		});

		events.push({
			description: "⏰ Hodiny běží a ty máš za 30 minut deadline...",
			coinsChange: 0,
		});

		const damage = randomInt(150, 300);
		events.push({
			description: `⌛ **Zmeškal jsi deadline!** Klient je naštvaný a hrozí, že odejde ke konkurenci. Šéf ti strhl z výplaty **${damage}** mincí za způsobenou škodu.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "elevator_missed_deadline",
			notes: `Srážka za zmeškaný deadline: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// Stuck with HR
		events.push({
			description: "😰 Ve výtahu je paní z HR a dívá se na tebe...",
			coinsChange: 0,
		});

		events.push({
			description: "💬 'Jak se ti pracuje? Dodržuješ pracovní dobu?' ptá se...",
			coinsChange: 0,
		});

		events.push({
			description: "🤐 Nervozita tě přemáhá a začínáš blábolit...",
			coinsChange: 0,
		});

		const penalty = randomInt(400, 700);
		events.push({
			description: `😱 **Přiznal jsi se k time theftu!** V nervech jsi řekl, že občas odcházíš dřív. HR spustila audit a zjistila 47 hodin. Srážka: **${penalty}** mincí.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "elevator_hr_confession",
			notes: `Srážka za přiznání k time theftu: ${penalty} mincí`,
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
