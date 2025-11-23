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
		description: "📹 Připojuješ se na videokonferenci s indickými kolegy...",
		coinsChange: 0,
	});

	events.push({
		description: "🎤 Testuješ mikrofon a kameru před začátkem meetingu...",
		coinsChange: 0,
	});

	events.push({
		description: "👔 Meeting začíná, představuješ svůj projekt...",
		coinsChange: 0,
	});

	// Random outcome
	const outcome = Math.random() * 100;

	if (outcome < 50) {
		// Successful pitch
		events.push({
			description: "💬 Kolegyně z Bangaloru pokládá důležité otázky...",
			coinsChange: 0,
		});

		events.push({
			description: "✅ Odpovídáš sebejistě a přesvědčivě...",
			coinsChange: 0,
		});

		const bonus = randomInt(300, 600);
		events.push({
			description: `🎯 **Úspěšný pitch!** Klient je nadšený z tvé prezentace. Team leader tě chválí před všemi. Dostáváš bonus **${bonus}** mincí.`,
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
		events.push({
			description: "⚠️ Začínáš pozorovat zpoždění v přenosu...",
			coinsChange: 0,
		});

		events.push({
			description: "📶 Signál slábne... Obraz se seká...",
			coinsChange: 0,
		});

		events.push({
			description: "❌ Internet ti úplně vypadl!",
			coinsChange: 0,
		});

		const penalty = randomInt(100, 300);
		events.push({
			description: `🔌 **Technické problémy!** Nedokončil jsi prezentaci. Klient je naštvaný a musel jsi přeplánovat meeting. Musel jsi zaplatit **${penalty}** mincí za zkaženou příležitost.`,
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
		events.push({
			description: "😺 Tvoje kočka vskočila na stůl...",
			coinsChange: 0,
		});

		events.push({
			description: "📸 Prochází přímo před kamerou a mňouká...",
			coinsChange: 0,
		});

		events.push({
			description: "😂 Všichni se smějí, někdo to nahrál!",
			coinsChange: 0,
		});

		const viralBonus = randomInt(800, 1200);
		events.push({
			description: `🌟 **Video se stalo virální!** Společnost získala obrovskou pozornost na sociálních sítích. Marketing tým je nadšený a ty dostáváš **${viralBonus}** mincí jako odměnu za nejlepší reklamu roku!`,
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
