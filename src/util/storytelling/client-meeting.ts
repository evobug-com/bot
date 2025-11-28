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
 * Client meeting storytelling
 *
 * Story outcomes (single roll, 60% positive):
 * - 35% Win the client over, get commission (+350-600)
 * - 25% Client loves your demo, extends contract (+200-400)
 * - 25% Demo crashes, embarrassment (-200-400)
 * - 15% Client is competitor spy, leaks your roadmap (-400-750)
 */
export async function generateClientMeetingStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	const xpAmount = userLevel * 6 + 50;

	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "client_meeting_xp",
		notes: "Zkušenosti ze schůzky s klientem",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "👔 Připravuješ se na důležitou schůzku s potenciálním klientem...",
		coinsChange: 0,
	});

	events.push({
		description: "💼 Klient vstupuje do zasedačky. Vypadá vážně...",
		coinsChange: 0,
	});

	events.push({
		description: "📊 Spouštíš prezentaci a demo...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 35) {
		// Win the client
		events.push({
			description: "✨ Tvoje prezentace je perfektní! Klient pokyvuje hlavou...",
			coinsChange: 0,
		});

		events.push({
			description: "🤝 'Tohle je přesně to, co hledáme!' říká nadšeně...",
			coinsChange: 0,
		});

		events.push({
			description: "📝 Podepisuje smlouvu přímo na místě!",
			coinsChange: 0,
		});

		const bonus = randomInt(350, 600);
		events.push({
			description: `💰 **Mega deal!** Získal jsi největšího klienta roku. Sales tým je v šoku. Tvoje provize: **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "client_meeting_mega_deal",
			notes: `Provize za získání klienta: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 60) {
		// Contract extension
		events.push({
			description: "🖥️ Demo běží hladce, ukazuješ nové featury...",
			coinsChange: 0,
		});

		events.push({
			description: "😊 Klient je spokojený: 'Tohle je lepší než jsme čekali!'",
			coinsChange: 0,
		});

		events.push({
			description: "📅 Chce prodloužit smlouvu o další rok!",
			coinsChange: 0,
		});

		const bonus = randomInt(200, 400);
		events.push({
			description: `🎉 **Smlouva prodloužena!** Klient je nadšený a rozšiřuje spolupráci. Bonus za udržení klienta: **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "client_meeting_extension",
			notes: `Bonus za prodloužení smlouvy: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 85) {
		// Demo crashes
		events.push({
			description: "💻 Spouštíš demo... Loading...",
			coinsChange: 0,
		});

		events.push({
			description: "❌ ERROR 500! Všechno padá!",
			coinsChange: 0,
		});

		events.push({
			description: "😰 'Toto se normálně nestává...' koktáš...",
			coinsChange: 0,
		});

		const damage = randomInt(200, 400);
		events.push({
			description: `😞 **Trapas před klientem!** Demo kompletně selhalo. Klient odešel a jde ke konkurenci. Ušlý zisk a náklady na přípravu: **${damage}** mincí.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "client_meeting_crash",
			notes: `Ztráta za nepovedené demo: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// Corporate spy
		events.push({
			description: "🤔 Klient se hodně ptá na budoucí plány...",
			coinsChange: 0,
		});

		events.push({
			description: "📸 Proč si fotí naši roadmap prezentaci?",
			coinsChange: 0,
		});

		events.push({
			description: "😱 Počkat... jeho vizitka říká, že pracuje u konkurence!",
			coinsChange: 0,
		});

		const penalty = randomInt(400, 750);
		events.push({
			description: `🕵️ **Firemní špionáž!** 'Klient' byl špión od konkurence. Všechny tvé featury budou u nich za měsíc. Legal náklady a ušlý zisk: **${penalty}** mincí.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "client_meeting_spy",
			notes: `Škoda za únik informací: ${penalty} mincí`,
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
