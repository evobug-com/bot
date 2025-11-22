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
 * Video conference storytelling
 *
 * Flow:
 * - 50% Successful pitch, client happy (+3000-6000 bonus)
 * - 30% Technical problems, client angry (-1000-3000)
 * - 20% Cat walks by camera, goes viral (+8000-12000 viral bonus!)
 */
export async function generateVideoConferenceStory(
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
		activityType: "video_conference_xp",
		notes: "Získal jsi zkušenosti z videokonference",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "Přežil jsi videokonferenci s indickými kolegy...",
		coinsChange: 0,
	});

	// Random outcome
	const outcome = Math.random() * 100;

	if (outcome < 50) {
		// Successful pitch
		const bonus = randomInt(300, 600);
		events.push({
			description: `🎯 **Úspěšný pitch!** Klient je nadšený z tvé prezentace. Dostáváš bonus **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "video_conference_success",
			notes: `Bonus za úspěšnou prezentaci: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 80) {
		// Technical problems
		const penalty = randomInt(100, 300);
		events.push({
			description: `🔌 **Technické problémy!** Internet ti vypadl uprostřed prezentace. Klient je naštvaný. Musel jsi zaplatit **${penalty}** mincí za zkaženou příležitost.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "video_conference_technical",
			notes: `Pokuta za technické problémy: ${penalty} mincí`,
		});

		if (penaltyError) {
			throw penaltyError;
		}

		totalCoinsChange -= penalty;
	} else {
		// Cat goes viral
		const viralBonus = randomInt(800, 1200);
		events.push({
			description: `😺 **Kočka prošla před kamerou!** Video se stalo virální na sociálních sítích. Firma dostala obrovskou reklamu a ty dostáváš **${viralBonus}** mincí jako odměnu!`,
			coinsChange: viralBonus,
		});

		const [viralError] = await orpc.users.stats.reward.grant({
			userId,
			coins: viralBonus,
			xp: 0,
			activityType: "video_conference_viral",
			notes: `Virální bonus: ${viralBonus} mincí`,
		});

		if (viralError) {
			throw viralError;
		}

		totalCoinsChange += viralBonus;
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
