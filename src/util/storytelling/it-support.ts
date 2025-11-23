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
 * IT Support / Network Engineer storytelling
 *
 * Flow:
 * - 60% Successfully fixed (+1000-2000 speed bonus)
 * - 25% Found security hole, get reward (+5000-10000)
 * - 15% Made it worse, entire company offline (-8000-15000)
 */
export async function generateITSupportStory(
	userId: number,
	userLevel: number,
	isNetworkEngineer = false,
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
		activityType: isNetworkEngineer ? "network_engineer_xp" : "it_support_xp",
		notes: `Získal jsi zkušenosti z ${isNetworkEngineer ? "opravy sítě" : "IT podpory"}`,
	});

	if (xpError) {
		throw xpError;
	}

	if (isNetworkEngineer) {
		events.push({
			description: "🌐 Opravuješ firemní síť...",
			coinsChange: 0,
		});
	} else {
		events.push({
			description: "💻 Pomáháš kolegovi s jeho počítačem...",
			coinsChange: 0,
		});
	}

	// Add diagnostic step
	if (isNetworkEngineer) {
		events.push({
			description: "🔍 Kontroluješ síťovou konfiguraci a prováděcí toky...",
			coinsChange: 0,
		});
	} else {
		events.push({
			description: "🔍 Spouštíš diagnostické nástroje a kontroluješ systémové logy...",
			coinsChange: 0,
		});
	}

	// Random outcome
	const outcome = Math.random() * 100;

	if (outcome < 60) {
		// Successfully fixed - add problem identification step
		if (isNetworkEngineer) {
			events.push({
				description: "🔧 Identifikoval jsi problém s routerem v přízemí...",
				coinsChange: 0,
			});
		} else {
			events.push({
				description: "🔧 Zjistil jsi, že problém způsobuje zastaralý ovladač...",
				coinsChange: 0,
			});
		}

		const bonus = randomInt(100, 200);
		events.push({
			description: `✅ **Úspěšně opraveno!** ${isNetworkEngineer ? "Síť běží rychleji než kdykoliv předtím. Všechny oddělení ti děkují" : "Počítač funguje jako nový. Kolega je nadšený"}. Dostáváš bonus **${bonus}** mincí za rychlost.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: isNetworkEngineer ? "network_fix_success" : "it_support_success",
			notes: `Bonus za úspěšnou opravu: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 85) {
		// Found security hole - add investigation steps
		if (isNetworkEngineer) {
			events.push({
				description: "⚠️ Něco vypadá podezřele... Port 22 je otevřený všem...",
				coinsChange: 0,
			});
			events.push({
				description: "🕵️ Kontroluješ firewall pravidla a nacházíš další zranitelnosti...",
				coinsChange: 0,
			});
		} else {
			events.push({
				description: "⚠️ Objevuješ podezřelé procesy běžící na pozadí...",
				coinsChange: 0,
			});
			events.push({
				description: "🕵️ Analyzuješ systém a nacházíš bezpečnostní díru...",
				coinsChange: 0,
			});
		}

		const reward = randomInt(500, 1000);
		events.push({
			description: `🔒 **Našel jsi bezpečnostní díru!** ${isNetworkEngineer ? "V síťové konfiguraci" : "V systému kolegy"} jsi objevil kritickou zranitelnost. Bezpečnostní tým je vděčný. Dostáváš velkou odměnu **${reward}** mincí.`,
			coinsChange: reward,
		});

		const [rewardError] = await orpc.users.stats.reward.grant({
			userId,
			coins: reward,
			xp: 0,
			activityType: isNetworkEngineer ? "network_security_find" : "it_security_find",
			notes: `Odměna za nalezení bezpečnostní díry: ${reward} mincí`,
		});

		if (rewardError) {
			throw rewardError;
		}

		totalCoinsChange += reward;
	} else {
		// Made it worse - add escalation steps
		if (isNetworkEngineer) {
			events.push({
				description: "⚠️ Zkouším restartovat hlavní switch...",
				coinsChange: 0,
			});
			events.push({
				description: "❌ Switch se nespouští... Všechna připojení padla!",
				coinsChange: 0,
			});
		} else {
			events.push({
				description: "⚠️ Zkouším reinstalovat systém...",
				coinsChange: 0,
			});
			events.push({
				description: "❌ Omylem jsi smazal důležitou partition!",
				coinsChange: 0,
			});
		}

		const penalty = randomInt(800, 1500);
		events.push({
			description: `💥 **Pokazil jsi to ještě víc!** ${isNetworkEngineer ? "Celá firma je offline. Všechny servery padly. CEO volá krizovou schůzku" : "Smazal jsi důležitá data kolegi. IT tým musí pracovat přes noc na obnově ze záloh"}. Zaplatil jsi pokutu **${penalty}** mincí.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: isNetworkEngineer ? "network_disaster" : "it_support_disaster",
			notes: `Pokuta za způsobení výpadku: ${penalty} mincí`,
		});

		if (penaltyError) {
			throw penaltyError;
		}

		totalCoinsChange -= penalty;
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
