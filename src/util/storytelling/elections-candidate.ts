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

function randomChance(percentage: number): boolean {
	return Math.random() * 100 < percentage;
}

/**
 * Elections candidate storytelling
 *
 * Flow:
 * - Get random votes (1-5000)
 * - If >4000: Become MP, then:
 *   - 60% Successfully pass laws (+3000-8000 bonus)
 *   - 40% Corruption scandal:
 *     - 70% Smooth it over (-2000-5000)
 *     - 30% Go to court (-5000-15000)
 * - If <=4000: Lose election, then:
 *   - 30% Supporters donate (+1000-3000)
 *   - 20% Demand recount (-500, 40% chance to win)
 *   - 50% Accept defeat (nothing)
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

	// Step 1: Campaign introduction
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

	// Step 2: Get random votes
	const votes = randomInt(1, 5000);
	events.push({
		description: `📊 Výsledky jsou venku! Získal jsi **${votes}** hlasů.`,
		coinsChange: 0,
	});

	// Step 2: Check if won (>4000 votes)
	if (votes > 4000) {
		events.push({
			description: "🎉 **Gratulujeme, stal jsi se poslancem!**",
			coinsChange: 0,
		});

		// Step 3: Successfully pass laws vs corruption scandal (60% vs 40%)
		const successfulLaws = randomChance(60);

		if (successfulLaws) {
			// Successfully pass laws - bonus
			const bonus = randomInt(300, 800);
			events.push({
				description: `✅ Úspěšně jsi prosadil důležité zákony. Dostáváš bonus **${bonus}** mincí.`,
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

			totalCoinsChange += bonus;
		} else {
			// Corruption scandal
			events.push({
				description: "⚠️ **Vypukl korupční skandál!**",
				coinsChange: 0,
			});

			// Step 4: Smooth over vs court (70% vs 30%)
			const smoothOver = randomChance(70);

			if (smoothOver) {
				// Pay to smooth it over
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

				totalCoinsChange -= payoff;
			} else {
				// Go to court
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

				totalCoinsChange -= courtPenalty;
			}
		}
	} else {
		// Lost election
		events.push({
			description: "😔 Bohužel jsi volby **prohrál**.",
			coinsChange: 0,
		});

		// Step 3: Random outcome for losing (30% donation, 20% recount, 50% nothing)
		const outcome = Math.random() * 100;

		if (outcome < 30) {
			// Supporters donate
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

			totalCoinsChange += donation;
		} else if (outcome < 50) {
			// Demand recount
			const recountCost = 50;
			events.push({
				description: `📊 Požádal jsi o přepočítání hlasů. Stálo tě to **${recountCost}** mincí.`,
				coinsChange: -recountCost,
			});

			const [recountError] = await orpc.users.stats.reward.grant({
				userId,
				coins: -recountCost,
				xp: 0,
				activityType: "elections_recount_cost",
				notes: `Náklady na přepočítání hlasů: ${recountCost} mincí`,
			});

			if (recountError) {
				throw recountError;
			}

			totalCoinsChange -= recountCost;

			// 40% chance to win after recount
			const winRecount = randomChance(40);
			if (winRecount) {
				const recountBonus = randomInt(200, 400);
				events.push({
					description: `🎉 **Přepočítání odhalilo chybu - vyhrál jsi!** Dostáváš bonus **${recountBonus}** mincí.`,
					coinsChange: recountBonus,
				});

				const [bonusError] = await orpc.users.stats.reward.grant({
					userId,
					coins: recountBonus,
					xp: 0,
					activityType: "elections_recount_win",
					notes: `Bonus za výhru po přepočítání: ${recountBonus} mincí`,
				});

				if (bonusError) {
					throw bonusError;
				}

				totalCoinsChange += recountBonus;
			} else {
				events.push({
					description: "😔 Přepočítání potvrdilo prohru. Aspoň jsi to zkusil.",
					coinsChange: 0,
				});
			}
		} else {
			// Accept defeat
			events.push({
				description: "🤝 Smířil jsi se s prohrou a pogratuloval jsi vítězi.",
				coinsChange: 0,
			});
		}
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
