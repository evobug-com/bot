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
 * Reveal cheating storytelling with single-roll outcome
 *
 * Story outcomes (single roll at start, 70% positive):
 * - 40% Report to admins - safe, get reward (+200-300)
 * - 30% Take bribe successfully (+500-1000)
 * - 30% Take bribe but get caught (-1000-1500)
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

	// SINGLE ROLL - determine outcome at the start
	const outcome = Math.random() * 100;

	// Investigation intro (always happens)
	events.push({
		description: "🕵️ Procházíš ekonomické logy a všímáš si neobvyklých aktivit...",
		coinsChange: 0,
	});

	events.push({
		description: "📊 Analýza dat odhaluje podezřelé vzory v /work příkazech...",
		coinsChange: 0,
	});

	events.push({
		description: "🔍 Jeden uživatel má nadměrný počet coinů získaných za krátkou dobu!",
		coinsChange: 0,
	});

	events.push({
		description: "🎯 Máš důkazy o podvádění!",
		coinsChange: 0,
	});

	if (outcome < 40) {
		// OUTCOME: Report to admins - safe choice (40%)
		events.push({
			description: "📝 Připravuješ detailní report s důkazy...",
			coinsChange: 0,
		});

		events.push({
			description: "📨 Odesíláš zprávu administrátorům...",
			coinsChange: 0,
		});

		events.push({
			description: "⏳ Čekáš na jejich reakci...",
			coinsChange: 0,
		});

		const reward = randomInt(200, 300);
		events.push({
			description: `✅ **Admini zasáhli!** Podvodník byl potrestán. Dostáváš odměnu **${reward}** mincí za pomoc s udržením férovosti serveru.`,
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

		totalCoinsChange = reward;
	} else if (outcome < 70) {
		// OUTCOME: Take bribe successfully (30%)
		events.push({
			description: "💬 Podvodník si všiml, že ho sleduješ...",
			coinsChange: 0,
		});

		events.push({
			description: "📩 Posílá ti soukromou zprávu...",
			coinsChange: 0,
		});

		const bribeAmount = randomInt(500, 1000);
		events.push({
			description: `💰 **Nabídka úplatku!** Podvodník ti nabízí **${bribeAmount}** mincí, abys to nikomu neřekl...`,
			coinsChange: 0,
		});

		events.push({
			description: "🤔 Rozhoduješ se přijmout nabídku...",
			coinsChange: 0,
		});

		events.push({
			description: "💸 Transfer proběhl úspěšně...",
			coinsChange: 0,
		});

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

		totalCoinsChange = bribeAmount;
	} else {
		// OUTCOME: Take bribe but get caught (30%)
		events.push({
			description: "💬 Podvodník si všiml, že ho sleduješ...",
			coinsChange: 0,
		});

		events.push({
			description: "📩 Posílá ti soukromou zprávu...",
			coinsChange: 0,
		});

		const bribeAmount = randomInt(500, 1000);
		events.push({
			description: `💰 **Nabídka úplatku!** Podvodník ti nabízí **${bribeAmount}** mincí, abys to nikomu neřekl...`,
			coinsChange: 0,
		});

		events.push({
			description: "🤔 Rozhoduješ se přijmout nabídku...",
			coinsChange: 0,
		});

		events.push({
			description: "👀 Administrátor sledoval vaši konverzaci...",
			coinsChange: 0,
		});

		events.push({
			description: "⚠️ Anti-cheat systém zaznamenal podezřelou transakci!",
			coinsChange: 0,
		});

		events.push({
			description: "🔨 Admin zasahuje...",
			coinsChange: 0,
		});

		const penalty = randomInt(1000, 1500);
		events.push({
			description: `🚨 **Chyceni při činu!** Ty i podvodník jste dostali dočasný ban na ekonomické příkazy a pokutu **${penalty}** mincí. Korupce se nevyplácí.`,
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

		totalCoinsChange = -penalty;
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
