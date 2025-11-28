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
 * Server room adventure storytelling
 *
 * Story outcomes (single roll, 55% positive):
 * - 30% Fix the issue heroically, save company millions (+400-700)
 * - 25% Find crypto mining rig, get finder's fee (+200-400)
 * - 25% Trip over cable, cause outage (-200-400)
 * - 20% Get locked in, miss important meeting (-300-600)
 */
export async function generateServerRoomStory(
	userId: number,
	userLevel: number,
): Promise<StoryResult> {
	const events: StoryEvent[] = [];
	let totalCoinsChange = 0;

	const xpAmount = userLevel * 7 + 55;

	const [xpError] = await orpc.users.stats.reward.grant({
		userId,
		coins: 0,
		xp: xpAmount,
		activityType: "server_room_xp",
		notes: "Zkušenosti z dobrodružství v serverovně",
	});

	if (xpError) {
		throw xpError;
	}

	events.push({
		description: "🚪 Vstupuješ do serverovny s blikajícími světly a hučícími ventilátory...",
		coinsChange: 0,
	});

	events.push({
		description: "❄️ Je tu zima jako na Antarktidě. Měl jsi vzít bundu...",
		coinsChange: 0,
	});

	events.push({
		description: "🔍 Hledáš server, který hlásí problémy...",
		coinsChange: 0,
	});

	const outcome = Math.random() * 100;

	if (outcome < 30) {
		// Heroic fix
		events.push({
			description: "🔴 Našel jsi server - jeden disk bliká červeně!",
			coinsChange: 0,
		});

		events.push({
			description: "💾 Rychle vyměňuješ vadný disk za nový z police...",
			coinsChange: 0,
		});

		events.push({
			description: "🔄 RAID začíná rebuild. Zachránil jsi data!",
			coinsChange: 0,
		});

		const bonus = randomInt(400, 700);
		events.push({
			description: `🦸 **Hrdina dne!** Kdybys přišel o 5 minut později, firma by přišla o všechna zákaznická data. CEO ti osobně děkuje a dává bonus **${bonus}** mincí.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "server_room_hero",
			notes: `Bonus za záchranu dat: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 55) {
		// Crypto mining discovery
		events.push({
			description: "🤔 Počkat, tenhle server není v dokumentaci...",
			coinsChange: 0,
		});

		events.push({
			description: "⛏️ Co to... někdo tu tajně těží kryptoměny!",
			coinsChange: 0,
		});

		events.push({
			description: "🕵️ Informuješ security tým o nálezu...",
			coinsChange: 0,
		});

		const bonus = randomInt(200, 400);
		events.push({
			description: `💎 **Odhalil jsi insider threat!** Security tím zjistil, že to byl noční hlídač. Firma ti dává finder's fee **${bonus}** mincí a jsi v bezpečnostním newsletteru.`,
			coinsChange: bonus,
		});

		const [bonusError] = await orpc.users.stats.reward.grant({
			userId,
			coins: bonus,
			xp: 0,
			activityType: "server_room_discovery",
			notes: `Finder's fee za odhalení těžby: ${bonus} mincí`,
		});

		if (bonusError) {
			throw bonusError;
		}

		totalCoinsChange += bonus;
	} else if (outcome < 80) {
		// Trip over cable
		events.push({
			description: "🚶 Procházíš mezi racky...",
			coinsChange: 0,
		});

		events.push({
			description: "⚡ POZOR! Zakopáváš o volně ležící kabel!",
			coinsChange: 0,
		});

		events.push({
			description: "💥 Padáš přímo na hlavní switch!",
			coinsChange: 0,
		});

		const damage = randomInt(200, 400);
		events.push({
			description: `🔌 **Způsobil jsi výpadek!** Celá firma je 2 hodiny offline. Slack nefunguje, ale všichni stejně vědí, že to byl ty. Pokuta **${damage}** mincí.`,
			coinsChange: -damage,
		});

		const [damageError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -damage,
			xp: 0,
			activityType: "server_room_outage",
			notes: `Pokuta za způsobení výpadku: ${damage} mincí`,
		});

		if (damageError) {
			throw damageError;
		}

		totalCoinsChange -= damage;
	} else {
		// Locked in
		events.push({
			description: "🚪 Dveře za tebou se zavřely...",
			coinsChange: 0,
		});

		events.push({
			description: "🔒 Tvoje karta nefunguje! Jsi zamčený uvnitř!",
			coinsChange: 0,
		});

		events.push({
			description: "📵 A samozřejmě tu není signál...",
			coinsChange: 0,
		});

		const penalty = randomInt(300, 600);
		events.push({
			description: `🥶 **Uvězněn v serverovně!** Strávil jsi 4 hodiny v -5°C než tě našel noční hlídač. Zmeškal jsi prezentaci pro investory. Škoda na reputaci: **${penalty}** mincí.`,
			coinsChange: -penalty,
		});

		const [penaltyError] = await orpc.users.stats.reward.grant({
			userId,
			coins: -penalty,
			xp: 0,
			activityType: "server_room_locked",
			notes: `Škoda za zmeškanou prezentaci: ${penalty} mincí`,
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
