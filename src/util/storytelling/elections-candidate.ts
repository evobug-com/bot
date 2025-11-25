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
 * Elections candidate storytelling with single-roll outcome
 *
 * Story outcomes (single roll at start, 70% positive):
 * - 35% Win election + pass laws (+300-800)
 * - 20% Lose + supporters donate (+100-300)
 * - 15% Lose + demand recount + win recount (+150-350 net)
 * - 10% Win election + corruption scandal, smooth over (-200-500)
 * - 10% Win election + corruption scandal, court penalty (-500-1500)
 * - 10% Lose + accept defeat (0)
 */
export async function generateElectionsCandidateStory(
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
		activityType: "elections_candidate_xp",
		notes: "Získal jsi zkušenosti z volební kampaně",
	});

	if (xpError) {
		throw xpError;
	}

	// SINGLE ROLL - determine outcome at the start
	const outcome = Math.random() * 100;

	// Campaign introduction (always happens)
	events.push({
		description: "🗳️ Rozhodl jsi se kandidovat ve volbách do parlamentu...",
		coinsChange: 0,
	});

	events.push({
		description: "📢 Připravuješ volební kampaň a setkáváš se s voliči...",
		coinsChange: 0,
	});

	events.push({
		description: "📺 Účastníš se předvolebních debat...",
		coinsChange: 0,
	});

	events.push({
		description: "🗳️ Volby proběhly, čekáš na výsledky...",
		coinsChange: 0,
	});

	if (outcome < 35) {
		// OUTCOME: Win + pass laws successfully (35%)
		const votes = randomInt(4001, 5000);
		events.push({
			description: `📊 Výsledky jsou venku! Získal jsi **${votes}** hlasů.`,
			coinsChange: 0,
		});

		events.push({
			description: "🎉 **Gratulujeme, stal jsi se poslancem!**",
			coinsChange: 0,
		});

		events.push({
			description: "📝 Pracuješ na důležitých zákonech...",
			coinsChange: 0,
		});

		const bonus = randomInt(300, 800);
		events.push({
			description: `✅ **Úspěšně jsi prosadil důležité zákony.** Dostáváš bonus **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "elections_successful_laws",
			notes: `Bonus za prosazení zákonů: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange = bonus;
	} else if (outcome < 55) {
		// OUTCOME: Lose + supporters donate (20%)
		const votes = randomInt(1000, 4000);
		events.push({
			description: `📊 Výsledky jsou venku! Získal jsi **${votes}** hlasů.`,
			coinsChange: 0,
		});

		events.push({
			description: "😔 Bohužel jsi volby **prohrál**.",
			coinsChange: 0,
		});

		events.push({
			description: "📱 Tvoji podporovatelé ti píšou vzkazy podpory...",
			coinsChange: 0,
		});

		const donation = randomInt(100, 300);
		events.push({
			description: `💝 Tvoji podporovatelé ti darovali **${donation}** mincí jako poděkování za kampaň.`,
			coinsChange: donation,
		});

		const [donationError] = await orpc.users.stats.reward.grant({
			userId,
			coins: donation,
			xp: 0,
			activityType: "elections_supporter_donation",
			notes: `Dar od podporovatelů: ${donation} mincí`,
		});

		if (donationError) {
			throw donationError;
		}

		totalCoinsChange = donation;
	} else if (outcome < 70) {
		// OUTCOME: Lose + recount + win recount (15%)
		const votes = randomInt(3800, 4000);
		events.push({
			description: `📊 Výsledky jsou venku! Získal jsi **${votes}** hlasů.`,
			coinsChange: 0,
		});

		events.push({
			description: "😔 Bohužel jsi volby **prohrál**.",
			coinsChange: 0,
		});

		const recountCost = 50;
		events.push({
			description: `📊 Požádal jsi o přepočítání hlasů. Stálo tě to **${recountCost}** mincí.`,
			coinsChange: -recountCost,
		});

		events.push({
			description: "🔍 Volební komise pečlivě přepočítává hlasy...",
			coinsChange: 0,
		});

		const recountBonus = randomInt(200, 400);
		events.push({
			description: `🎉 **Přepočítání odhalilo chybu - vyhrál jsi!** Dostáváš bonus **${recountBonus}** mincí.`,
			coinsChange: recountBonus,
		});

		const netGain = recountBonus - recountCost;
		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: netGain,
			xp: 0,
			activityType: "elections_recount_win",
			notes: `Výhra po přepočítání: ${recountBonus} - ${recountCost} = ${netGain} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange = netGain;
	} else if (outcome < 80) {
		// OUTCOME: Win + corruption scandal + smooth over (10%)
		const votes = randomInt(4001, 5000);
		events.push({
			description: `📊 Výsledky jsou venku! Získal jsi **${votes}** hlasů.`,
			coinsChange: 0,
		});

		events.push({
			description: "🎉 **Gratulujeme, stal jsi se poslancem!**",
			coinsChange: 0,
		});

		events.push({
			description: "⚠️ **Vypukl korupční skandál!**",
			coinsChange: 0,
		});

		events.push({
			description: "🤝 Snažíš se situaci urovnat...",
			coinsChange: 0,
		});

		const payoff = randomInt(200, 500);
		events.push({
			description: `💰 Uhladil jsi to úplatkem. Zaplatil jsi **${payoff}** mincí.`,
			coinsChange: -payoff,
		});

		const [payoffError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -payoff,
			xp: 0,
			activityType: "elections_corruption_payoff",
			notes: `Úplatek za uhlazení korupčního skandálu: ${payoff} mincí`,
		});

		if (payoffError) {
			throw payoffError;
		}

		totalCoinsChange = -payoff;
	} else if (outcome < 90) {
		// OUTCOME: Win + corruption scandal + court penalty (10%)
		const votes = randomInt(4001, 5000);
		events.push({
			description: `📊 Výsledky jsou venku! Získal jsi **${votes}** hlasů.`,
			coinsChange: 0,
		});

		events.push({
			description: "🎉 **Gratulujeme, stal jsi se poslancem!**",
			coinsChange: 0,
		});

		events.push({
			description: "⚠️ **Vypukl korupční skandál!**",
			coinsChange: 0,
		});

		events.push({
			description: "⚖️ Věc se dostává k soudu...",
			coinsChange: 0,
		});

		const courtPenalty = randomInt(500, 1500);
		events.push({
			description: `⚖️ Šel jsi k soudu a prohrál. Zaplatil jsi pokutu **${courtPenalty}** mincí.`,
			coinsChange: -courtPenalty,
		});

		const [courtError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -courtPenalty,
			xp: 0,
			activityType: "elections_court_penalty",
			notes: `Pokuta za korupci: ${courtPenalty} mincí`,
		});

		if (courtError) {
			throw courtError;
		}

		totalCoinsChange = -courtPenalty;
	} else {
		// OUTCOME: Lose + accept defeat (10%)
		const votes = randomInt(1000, 3500);
		events.push({
			description: `📊 Výsledky jsou venku! Získal jsi **${votes}** hlasů.`,
			coinsChange: 0,
		});

		events.push({
			description: "😔 Bohužel jsi volby **prohrál**.",
			coinsChange: 0,
		});

		events.push({
			description: "🤝 Smířil jsi se s prohrou a pogratuloval jsi vítězi.",
			coinsChange: 0,
		});

		events.push({
			description: "💪 Zkušenost tě posílila pro příští volby.",
			coinsChange: 0,
		});

		totalCoinsChange = 0;
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
