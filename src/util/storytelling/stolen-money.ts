import { ORPCError } from "@orpc/client";
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

/**
 * Random number generator helper
 */
function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random chance helper (returns true if chance% succeeds)
 */
function randomChance(percentage: number): boolean {
	return Math.random() * 100 < percentage;
}

/**
 * Generates the stolen-money storytelling experience with multiple random branches
 *
 * Story flow:
 * 1. Steal random coins from grandma (2000-10000)
 * 2. 30% chance police catches you
 *    - If not caught: keep all
 *    - If caught:
 *      - 70% chance: block fine (pay 1000-5000, keep rest)
 *      - 30% chance: go to court
 *        - 40% win: keep all
 *        - 60% lose: pay penalty (3000-8000)
 *          - 20% chance lawyer calls (pay 2000-5000)
 *            - If can't pay: 50% chance debt collection (pay 5000-15000)
 */
export async function generateStolenMoneyStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	// Calculate XP (double base work: level * 6 + 50)
	const xpAmount = userLevel * 6 + 50;

	// Grant XP immediately at story start
	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "stolen_money_xp",
		notes: "Získal jsi zkušenosti z krádeže peněz babičce",
	});

	if (xpError) {
		throw xpError;
	}

	// Step 1: Steal money from grandma
	const stolenAmount = randomInt(200, 1000);
	events.push({
		description: `Ukradl jsi **${stolenAmount}** mincí babičce z peněženky.`,
		coinsChange: stolenAmount,
	});

	const [stealError] = await orpc.users.stats.reward.grant({
		userId,
		coins: stolenAmount,
		xp: 0,
		activityType: "stolen_money_theft",
		notes: `Ukradl ${stolenAmount} mincí babičce`,
	});

	if (stealError) {
		throw stealError;
	}

	totalCoinsChange += stolenAmount;

	// Step 2: Police catch chance (30%)
	const caughtByPolice = randomChance(30);

	if (!caughtByPolice) {
		// Lucky! Not caught
		events.push({
			description: "🍀 **Štěstí!** Policie tě nedopadla. Všechny peníze si necháváš!",
			coinsChange: 0,
		});
	} else {
		// Caught by police
		events.push({
			description: "🚔 **Policie tě dopadla!**",
			coinsChange: 0,
		});

		// Step 3: Block fine vs Court (70% block fine)
		const isBlockFine = randomChance(70);

		if (isBlockFine) {
			// Block fine - pay and keep the rest
			const fineAmount = randomInt(100, 500);
			const remaining = stolenAmount - fineAmount;

			events.push({
				description: `💬 Vykecal jsi se na **blokovou pokutu ${fineAmount}** mincí. Zůstalo ti **${remaining}** mincí.`,
				coinsChange: -fineAmount,
			});

			const [fineError] = await orpc.users.stats.reward.grant({
				userId,
				coins: -fineAmount,
				xp: 0,
				activityType: "stolen_money_fine",
				notes: `Bloková pokuta ${fineAmount} mincí`,
			});

			if (fineError) {
				throw fineError;
			}

			totalCoinsChange -= fineAmount;
		} else {
			// Goes to court
			events.push({
				description: "⚖️ Věc se předává **obvodnímu soudu**...",
				coinsChange: 0,
			});

			// Step 4: Win vs Lose court (40% win)
			const winsCourt = randomChance(40);

			if (winsCourt) {
				// Wins court - keeps everything
				events.push({
					description: `🎉 **Vyhrál jsi soud!** Všechny peníze si necháváš (**${stolenAmount}** mincí).`,
					coinsChange: 0,
				});
			} else {
				// Loses court - must pay penalty
				const penaltyAmount = randomInt(300, 800);

				events.push({
					description: `😢 **Prohrál jsi soud.** Musíš zaplatit pokutu **${penaltyAmount}** mincí.`,
					coinsChange: -penaltyAmount,
				});

				const [penaltyError] = await orpc.users.stats.reward.grant({
					userId,
					coins: -penaltyAmount,
					xp: 0,
					activityType: "stolen_money_court_loss",
					notes: `Prohrál soud - pokuta ${penaltyAmount} mincí`,
				});

				if (penaltyError) {
					throw penaltyError;
				}

				totalCoinsChange -= penaltyAmount;

				// Step 5: Lawyer calls (20% chance)
				const lawyerCalls = randomChance(20);

				if (lawyerCalls) {
					const lawyerFee = randomInt(200, 500);

					events.push({
						description: `📞 **Právník volá** a chce **${lawyerFee}** mincí za své služby.`,
						coinsChange: -lawyerFee,
					});

					const [lawyerError] = await orpc.users.stats.reward.grant({
						userId,
						coins: -lawyerFee,
						xp: 0,
						activityType: "stolen_money_lawyer",
						notes: `Právník - ${lawyerFee} mincí`,
					});

					if (lawyerError) {
						// Check if it's INSUFFICIENT_FUNDS error
						if (lawyerError instanceof ORPCError && lawyerError.code === "INSUFFICIENT_FUNDS") {
							// Player doesn't have money from what they stole
							events.push({
								description: "💸 Nemáš dostatek peněz z toho, co jsi ukradl...",
								coinsChange: 0,
							});

							// Step 6: Debt collection (50% chance)
							const debtCollection = randomChance(50);

							if (debtCollection) {
								const debtAmount = randomInt(500, 1500);

								events.push({
									description: `⚠️ **Exekuce!** Musíš zaplatit ještě **${debtAmount}** mincí navíc!`,
									coinsChange: -debtAmount,
								});

								const [debtError] = await orpc.users.stats.reward.grant({
									userId,
									coins: -debtAmount,
									xp: 0,
									activityType: "stolen_money_debt",
									notes: `Exekuce - ${debtAmount} mincí`,
								});

								if (debtError) {
									throw debtError;
								}

								totalCoinsChange -= debtAmount;
							} else {
								// Lucky - no debt collection
								events.push({
									description: "🍀 **Štěstí!** Žádná exekuce nepřišla.",
									coinsChange: 0,
								});
							}
						} else {
							throw lawyerError;
						}
					} else {
						// Lawyer fee paid successfully
						totalCoinsChange -= lawyerFee;
						events.push({
							description: "✅ Zaplatil jsi právníka.",
							coinsChange: 0,
						});
					}
				}
			}
		}
	}

	// Build the complete story narrative
	const storyLines = events.map((event) => {
		if (event.coinsChange !== 0) {
			const sign = event.coinsChange > 0 ? "+" : "";
			return `${event.description} (${sign}${event.coinsChange} mincí)`;
		}
		return event.description;
	});

	// Add summary at the end
	const summarySign = totalCoinsChange >= 0 ? "+" : "";
	storyLines.push("");
	storyLines.push(`**Celková bilance:** ${summarySign}${totalCoinsChange} mincí, +${xpAmount} XP`);

	return {
		story: storyLines.join("\n"),
		totalCoinsChange,
		xpGranted: xpAmount,
	};
}
