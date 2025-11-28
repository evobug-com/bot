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
 * Job interview storytelling - you're the interviewer
 *
 * Story outcomes (single roll, 65% positive):
 * - 35% Find amazing candidate, get recruitment bonus (+250-450)
 * - 30% Candidate is your old friend, networking bonus (+150-300)
 * - 20% Candidate is disaster, waste of time (-100-200)
 * - 15% Candidate is actually CEO's nephew, awkward situation (-200-400)
 */
export async function generateJobInterviewStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	const xpAmount = userLevel * 6 + 45;

	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "job_interview_xp",
		notes: "Zkušenosti z vedení pohovoru",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "📋 Sedíš v zasedačce a čekáš na kandidáta na pozici junior developera...",
		coinsChange: 0,
	});

	events.push({
		description: "🚪 Dveře se otevírají a vstupuje kandidát...",
		coinsChange: 0,
	});

	events.push({
		description: "🤝 Podáváte si ruce a začínáš s otázkami...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 35) {
		// Amazing candidate
		events.push({
			description: "💡 Kandidát odpovídá brilantně na každou otázku...",
			coinsChange: 0,
		});

		events.push({
			description: "🧠 Dokonce opravil chybu v tvém live coding příkladu!",
			coinsChange: 0,
		});

		events.push({
			description: "🌟 HR je nadšené - je to nejlepší kandidát za měsíce!",
			coinsChange: 0,
		});

		const bonus = randomInt(250, 450);
		events.push({
			description: `🏆 **Našel jsi hvězdu!** Kandidát přijal nabídku na místě. HR ti dává recruitment bonus **${bonus}** mincí za skvělý výběr.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "job_interview_star",
			notes: `Recruitment bonus za skvělého kandidáta: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 65) {
		// Old friend
		events.push({
			description: "😮 Počkat... tohle je přece tvůj starý spolužák z vejšky!",
			coinsChange: 0,
		});

		events.push({
			description: "🎉 Vzpomínáte na staré časy a projekty, co jste dělali spolu...",
			coinsChange: 0,
		});

		events.push({
			description: "🤝 I když ho nepřijmete, máte skvělý networking moment!",
			coinsChange: 0,
		});

		const bonus = randomInt(150, 300);
		events.push({
			description: `👔 **Networking funguje!** Tvůj kamarád ti řekl o otevřené pozici u konkurence s lepším platem. Doporučil tě a dostal jsi podpisový bonus **${bonus}** mincí za tip.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "job_interview_networking",
			notes: `Networking bonus: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 85) {
		// Disaster candidate
		events.push({
			description: "😰 Kandidát neví, co je to Git...",
			coinsChange: 0,
		});

		events.push({
			description: "🤦 Na otázku o favorite programovacím jazyku odpověděl 'Microsoft Word'...",
			coinsChange: 0,
		});

		events.push({
			description: "📱 A teď mu zvoní telefon a on to zvedl!",
			coinsChange: 0,
		});

		const damage = randomInt(100, 200);
		events.push({
			description: `⏰ **Ztráta času!** Pohovor trval 2 hodiny místo 30 minut, protože kandidát nechtěl odejít. Nestihl jsi deadline a musel jsi zaplatit pokutu **${damage}** mincí.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "job_interview_waste",
			notes: `Pokuta za zmeškaný deadline: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// CEO's nephew
		events.push({
			description: "👔 Kandidát vypadá arogantně a odpovídá jednoslovně...",
			coinsChange: 0,
		});

		events.push({
			description: "😤 Řekl ti, že 'tyhle otázky jsou pod jeho úroveň'...",
			coinsChange: 0,
		});

		events.push({
			description: "📞 Najednou ti volá CEO osobně...",
			coinsChange: 0,
		});

		const penalty = randomInt(200, 400);
		events.push({
			description: `😱 **To je synovec CEO!** Musel jsi ho přijmout a teď sedí vedle tebe. Jeho první PR smazal produkční databázi. Hádej, kdo to opravoval? Stálo tě to **${penalty}** mincí v přesčasech.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "job_interview_nepotism",
			notes: `Náklady na opravu po synovci CEO: ${penalty} mincí`,
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
