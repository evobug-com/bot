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
 * Friday deploy storytelling
 *
 * Story outcomes (single roll, 45% positive - deploying on Friday is risky!):
 * - 25% Everything works perfectly, hero status (+300-500)
 * - 20% Small bug, quick fix, still a win (+100-250)
 * - 30% Major bug, weekend ruined (-300-500)
 * - 25% Complete disaster, production down (-500-900)
 */
export async function generateFridayDeployStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	const xpAmount = userLevel * 8 + 60;

	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "friday_deploy_xp",
		notes: "Zkušenosti z pátečního deploye",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "🗓️ Je pátek 16:30. Máš hotovou novou feature...",
		coinsChange: 0,
	});

	events.push({
		description: "🤔 Všichni ti říkají 'nedělej to'... ale ty to chceš mít z krku...",
		coinsChange: 0,
	});

	events.push({
		description: "🚀 Mačkáš tlačítko DEPLOY...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 25) {
		// Perfect deploy
		events.push({
			description: "⏳ Pipeline běží... testy procházejí...",
			coinsChange: 0,
		});

		events.push({
			description: "✅ Deploy dokončen! Kontroluješ produkci...",
			coinsChange: 0,
		});

		events.push({
			description: "🎉 VŠECHNO FUNGUJE PERFEKTNĚ!",
			coinsChange: 0,
		});

		const bonus = randomInt(300, 500);
		events.push({
			description: `🏆 **Legendární páteční deploy!** Nikdo tomu nevěří. Kolegové tě nesou na ramenou. Šéf ti dává bonus **${bonus}** mincí za odvahu a štěstí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "friday_deploy_perfect",
			notes: `Bonus za perfektní páteční deploy: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 45) {
		// Small bug, quick fix
		events.push({
			description: "⚠️ Hmm, něco nefunguje úplně správně...",
			coinsChange: 0,
		});

		events.push({
			description: "🔍 Rychle hledáš problém... Aha! Překlep v configu!",
			coinsChange: 0,
		});

		events.push({
			description: "🔧 Hotfix, nový deploy, a je to!",
			coinsChange: 0,
		});

		const bonus = randomInt(100, 250);
		events.push({
			description: `😅 **Odneslo se to!** Malý bug, rychlý fix. Nikdo si ani nevšiml. Stihls to před víkendem a dostáváš **${bonus}** mincí za včasné dokončení.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "friday_deploy_minor_fix",
			notes: `Bonus za rychlý hotfix: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 75) {
		// Major bug, weekend ruined
		events.push({
			description: "🔴 ALERT! Produkce hlásí chyby!",
			coinsChange: 0,
		});

		events.push({
			description: "📞 Telefon zvoní - šéf, klienti, všichni!",
			coinsChange: 0,
		});

		events.push({
			description: "💻 Otevíráš laptop... bude to dlouhý víkend...",
			coinsChange: 0,
		});

		const damage = randomInt(300, 500);
		events.push({
			description: `😭 **Víkend zničen!** Strávil jsi celou sobotu a neděli opravováním. Rodina tě nenávidí. Musel jsi zaplatit za přesčasy kolegům: **${damage}** mincí.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "friday_deploy_weekend_ruined",
			notes: `Přesčasy za víkendovou opravu: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// Complete disaster
		events.push({
			description: "💥 KRITICKÁ CHYBA! Databáze padá!",
			coinsChange: 0,
		});

		events.push({
			description: "🚨 PagerDuty šílí! On-call tým volá!",
			coinsChange: 0,
		});

		events.push({
			description: "😱 Rollback nefunguje... backup je z minulého týdne...",
			coinsChange: 0,
		});

		const penalty = randomInt(500, 900);
		events.push({
			description: `☠️ **Totální katastrofa!** Produkce byla 12 hodin dole. Firma přišla o zákazníky. Tvůj deploy je teď případová studie "co nedělat". Škoda: **${penalty}** mincí.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "friday_deploy_disaster",
			notes: `Škoda za páteční katastrofu: ${penalty} mincí`,
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
