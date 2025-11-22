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
 * Reveal cheating storytelling
 *
 * Flow:
 * - 65% Report to admins (safe, +2000-3000 reward)
 * - 35% Cheater offers bribe:
 *   - 70% Take bribe successfully (+5000-10000, risky)
 *   - 30% Admins catch you (-10000-15000, caught with cheater)
 */
export async function generateRevealCheatingStory(
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
		activityType: "reveal_cheating_xp",
		notes: "Získal jsi zkušenosti z odhalování podvádění",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "Odhalil jsi podvádění na Discord příkazech!",
		coinsChange: 0,
	});

	// Random choice: 65% report, 35% bribe offered
	const reportToAdmins = randomChance(65);

	if (reportToAdmins) {
		// Safe choice - report to admins
		const reward = randomInt(200, 300);
		events.push({
			description: `✅ **Nahlásil jsi to adminům.** Dostáváš odměnu **${reward}** mincí za pomoc s udržením férovosti.`,
			coinsChange: reward,
		});

		const [rewardError] = await orpc.users.stats.reward.grant({
			userId,
			coins: reward,
			xp: 0,
			activityType: "reveal_cheating_report",
			notes: `Odměna za nahlášení podvádění: ${reward} mincí`,
		});

		if (rewardError) {
			throw rewardError;
		}

		totalCoinsChange += reward;
	} else {
		// Risky choice - cheater offers bribe
		const bribeAmount = randomInt(500, 1000);
		events.push({
			description: `💰 **Podvodník ti nabídl úplatek ${bribeAmount} mincí,** abys to nikomu neřekl...`,
			coinsChange: 0,
		});

		// 70% success, 30% caught
		const takeBribeSuccessfully = randomChance(70);

		if (takeBribeSuccessfully) {
			// Successfully take bribe
			events.push({
				description: `🤫 **Vzal jsi úplatek.** Nikdo to neví... zatím. Získáváš **${bribeAmount}** mincí.`,
				coinsChange: bribeAmount,
			});

			const [bribeError] = await orpc.users.stats.reward.grant({
				userId,
				coins: bribeAmount,
				xp: 0,
				activityType: "reveal_cheating_bribe_success",
				notes: `Úplatek od podvodníka: ${bribeAmount} mincí`,
			});

			if (bribeError) {
				throw bribeError;
			}

			totalCoinsChange += bribeAmount;
		} else {
			// Caught by admins
			const penalty = randomInt(1000, 1500);
			events.push({
				description: `🚨 **Admini vás chytili oba!** Ty i podvodník jste dostali ban na ekonomické příkazy a pokutu **${penalty}** mincí. Korupce se nevyplácí.`,
				coinsChange: -penalty,
			});

			const [penaltyError] = await orpc.users.stats.reward.grant({
				userId,
				coins: -penalty,
				xp: 0,
				activityType: "reveal_cheating_caught",
				notes: `Pokuta za přijetí úplatku: ${penalty} mincí`,
			});

			if (penaltyError) {
				throw penaltyError;
			}

			totalCoinsChange -= penalty;
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
