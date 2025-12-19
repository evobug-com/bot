/**
 * Elections Candidate - Branching Story
 *
 * A Mass Effect-style branching narrative about running for parliament.
 * Features 3 decision layers and 13 unique endings (8 positive, 5 negative).
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Campaign Strategy]
 *   -> Positive Campaign -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Win - Legislative Focus]
 *       -> Social Reform -> [OUTCOME] -> [TERMINAL: Popular/Blocked]
 *       -> Economic Reform -> [OUTCOME] -> [TERMINAL: Wealthy/Recession]
 *     -> Failure -> [DECISION 2b: Lose - What Next]
 *       -> Recount -> [OUTCOME] -> [TERMINAL: Vindicated/Defeated]
 *       -> Accept -> [TERMINAL: Graceful Loss]
 *   -> Attack Campaign -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Win - Scandal Hits]
 *       -> Cover Up -> [OUTCOME] -> [TERMINAL: Smooth/Court]
 *       -> Come Clean -> [TERMINAL: Forgiven]
 *     -> Failure -> [DECISION 2d: Lose - Supporters React]
 *       -> Rally Support -> [OUTCOME] -> [TERMINAL: Donations/No Support]
 *       -> Give Up -> [TERMINAL: Withdrawn]
 */

import type { BranchingStory, StoryNode } from "../types";
import { randomInt } from "../types";

const STORY_ID = "elections_candidate_branching";
const STORY_TITLE = "Kandidát ve volbách";
const STORY_EMOJI = "🗳️";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `🗳️ **${STORY_TITLE}**

Rozhodl jsi se kandidovat ve volbách do parlamentu. Je to tvá šance něco změnit!

Volební kampaň začíná. Jak povedeš svou kampaň?`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Campaign Strategy
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `📢 Stojíš před rozhodnutím o strategii kampaně. Můžeš vést čistou kampaň zaměřenou na tvé návrhy, nebo útočnou kampaň proti soupeřům.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Pozitivní kampaň",
				description: "Zaměříš se na vlastní program a návrhy řešení.",
				baseReward: 400,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_positive_campaign",
			},
			choiceY: {
				id: "choiceY",
				label: "Útočná kampaň",
				description: "Budeš kritizovat soupeře a odhalovat jejich chyby.",
				baseReward: 500,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_attack_campaign",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Positive Campaign
	// =========================================================================
	outcome_positive_campaign: {
		id: "outcome_positive_campaign",
		type: "outcome",
		narrative: `📺 Účastníš se předvolebních debat, kde představuješ své návrhy. Voliči sledují...

🗳️ Volby proběhly, sčítají se hlasy...`,
		successChance: 70,
		successNodeId: "decision_2a_legislative",
		failNodeId: "decision_2b_lost_positive",
	},

	// =========================================================================
	// OUTCOME: Attack Campaign
	// =========================================================================
	outcome_attack_campaign: {
		id: "outcome_attack_campaign",
		type: "outcome",
		narrative: `📢 Tvá kampaň je agresivní - odhaluješ slabiny soupeřů a kritizuješ jejich chyby.

🗳️ Volby proběhly, sčítají se hlasy...`,
		successChance: 70,
		successNodeId: "decision_2c_scandal",
		failNodeId: "decision_2d_lost_attack",
	},

	// =========================================================================
	// DECISION 2a: Won with positive campaign - Legislative Focus
	// =========================================================================
	decision_2a_legislative: {
		id: "decision_2a_legislative",
		type: "decision",
		narrative: () => `🎉 **Gratulujeme! Získal jsi ${randomInt(4001, 5000).toLocaleString("cs-CZ")} hlasů a stal ses poslancem!**

Tvá pozitivní kampaň zaujala voliče. Teď musíš prosazovat zákony. Na čem se zaměříš?`,
		coinsChange: 200,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Sociální reformy",
				description: "Zlepšení zdravotnictví a školství. Populární, ale může narazit.",
				baseReward: 600,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_social_reform",
			},
			choiceY: {
				id: "choiceY",
				label: "Ekonomické reformy",
				description: "Daně a byznys. Velký potenciál, ale riskantní.",
				baseReward: 700,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_economic_reform",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Lost with positive campaign - What Next
	// =========================================================================
	decision_2b_lost_positive: {
		id: "decision_2b_lost_positive",
		type: "decision",
		narrative: () => `😔 Získal jsi pouze ${randomInt(3500, 4000).toLocaleString("cs-CZ")} hlasů. **Bohužel jsi volby prohrál.**

Byl jsi blízko! Tvůj tým navrhuje přepočítání hlasů. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Požádat o přepočítání",
				description: "Stojí to 50 mincí, ale možná to odhalí chyby.",
				baseReward: 300,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_recount",
			},
			choiceY: {
				id: "choiceY",
				label: "Přijmout prohru",
				description: "Čestně pogratulovat vítězi a připravit se na příště.",
				baseReward: 150,
				riskMultiplier: 0.8,
				nextNodeId: "terminal_graceful_loss",
			},
		},
	},

	// =========================================================================
	// DECISION 2c: Won with attack campaign - Scandal Hits
	// =========================================================================
	decision_2c_scandal: {
		id: "decision_2c_scandal",
		type: "decision",
		narrative: () => `🎉 **Vyhrál jsi! Získal jsi ${randomInt(4001, 5000).toLocaleString("cs-CZ")} hlasů!**

Tvá útočná kampaň fungovala. Ale teď noviny píšou o tvém starém korupčním skandálu...

⚠️ **Média tě zkoumají!** Jak zareaguješ?`,
		coinsChange: 100,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Ututlat to",
				description: "Zaplatíš lidem, aby drželi hubu. Riskantní.",
				baseReward: 200,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_cover_up",
			},
			choiceY: {
				id: "choiceY",
				label: "Přiznat se",
				description: "Veřejně se přiznat a omluvit. Možná tě voliči odpustí.",
				baseReward: 300,
				riskMultiplier: 0.9,
				nextNodeId: "terminal_forgiven",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Lost with attack campaign - Supporters React
	// =========================================================================
	decision_2d_lost_attack: {
		id: "decision_2d_lost_attack",
		type: "decision",
		narrative: () => `😔 Získal jsi pouze ${randomInt(2000, 3500).toLocaleString("cs-CZ")} hlasů. **Prohrál jsi volby.**

Tvá útočná kampaň se obrátila proti tobě. Ale někteří podporovatelé stále věří.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Shromáždit podporu",
				description: "Požádat fanoušky o finanční pomoc na příští kampaň.",
				baseReward: 250,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_rally_support",
			},
			choiceY: {
				id: "choiceY",
				label: "Vzdát to",
				description: "Přijmout porážku a odejít z politiky.",
				baseReward: 0,
				riskMultiplier: 0.5,
				nextNodeId: "terminal_withdrawn",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Social Reform
	// =========================================================================
	outcome_social_reform: {
		id: "outcome_social_reform",
		type: "outcome",
		narrative: `📝 Pracuješ na zákonech o zdravotnictví a školství. Veřejnost sleduje...`,
		successChance: 70,
		successNodeId: "terminal_popular_reforms",
		failNodeId: "terminal_blocked_reforms",
	},

	// =========================================================================
	// OUTCOME: Economic Reform
	// =========================================================================
	outcome_economic_reform: {
		id: "outcome_economic_reform",
		type: "outcome",
		narrative: `💼 Předkládáš kontroverzní daňovou reformu. Lobbyisté jsou aktivní...`,
		successChance: 70,
		successNodeId: "terminal_wealthy_reforms",
		failNodeId: "terminal_recession",
	},

	// =========================================================================
	// OUTCOME: Recount
	// =========================================================================
	outcome_recount: {
		id: "outcome_recount",
		type: "outcome",
		narrative: `🔍 Zaplatil jsi 50 mincí za přepočítání hlasů.

Volební komise pečlivě přepočítává každý hlas...`,
		coinsChange: -50,
		successChance: 70,
		successNodeId: "terminal_vindicated",
		failNodeId: "terminal_defeated",
	},

	// =========================================================================
	// OUTCOME: Cover Up
	// =========================================================================
	outcome_cover_up: {
		id: "outcome_cover_up",
		type: "outcome",
		narrative: `🤝 Snažíš se skandál ututlat. Platíš lidem, aby mlčeli...`,
		successChance: 70,
		successNodeId: "terminal_smooth_over",
		failNodeId: "terminal_court_penalty",
	},

	// =========================================================================
	// OUTCOME: Rally Support
	// =========================================================================
	outcome_rally_support: {
		id: "outcome_rally_support",
		type: "outcome",
		narrative: `📱 Píšeš svým podporovatelům emotivní vzkaz o tom, jak jste byli blízko...`,
		successChance: 70,
		successNodeId: "terminal_donations_received",
		failNodeId: "terminal_no_support",
	},

	// =========================================================================
	// TERMINAL NODES (13 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_popular_reforms: {
		id: "terminal_popular_reforms",
		type: "terminal",
		narrative: `✅ **Lidový hrdina!**

Tvé sociální reformy prošly parlamentem! Zlepšil jsi zdravotnictví a školství.

Získáváš bonus **+600 mincí** a obrovskou popularitu mezi voliči.`,
		coinsChange: 600,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_wealthy_reforms: {
		id: "terminal_wealthy_reforms",
		type: "terminal",
		narrative: `💰 **Ekonomický mistr!**

Tvá daňová reforma prošla! Ekonomika roste a investoři tě milují.

Získáváš **+700 mincí** z bonusů a konzultačních poplatků.`,
		coinsChange: 700,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_vindicated: {
		id: "terminal_vindicated",
		type: "terminal",
		narrative: `🎉 **Spravedlnost zvítězila!**

Přepočítání odhalilo chybu - ve skutečnosti jsi **vyhrál**!

Získáváš **+350 mincí** po odečtení nákladů na přepočítání.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_smooth_over: {
		id: "terminal_smooth_over",
		type: "terminal",
		narrative: `🤫 **Ututláno**

Podařilo se ti skandál urovnat. Média přestala psát a můžeš pracovat.

Ztratil jsi **-300 mincí** na úplatky, ale uchoval sis pozici.`,
		coinsChange: -300,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_forgiven: {
		id: "terminal_forgiven",
		type: "terminal",
		narrative: `🙏 **Odpuštění**

Tvé upřímné přiznání a omluva zapůsobily. Voliči oceňují tvou poctivost.

Získáváš **+300 mincí** z dárkovských kampaní a obnovuješ důvěru.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_graceful_loss: {
		id: "terminal_graceful_loss",
		type: "terminal",
		narrative: `🤝 **Čestná prohra**

Pogratuloval jsi vítězi a smířil ses s prohrou. Tvoje čest zůstává nedotčená.

Získáváš **+150 mincí** z dárků od podporovatelů. Příště to možná vyjde.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_donations_received: {
		id: "terminal_donations_received",
		type: "terminal",
		narrative: `💝 **Podporovatelé ti věří**

Tvoji fanoušci reagovali! Poslali ti finanční podporu na příští kampaň.

Získáváš **+250 mincí** z darů. Neztrácejte naději!`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_withdrawn: {
		id: "terminal_withdrawn",
		type: "terminal",
		narrative: `🚶 **Odchod z politiky**

Rozhodl ses opustit politickou scénu. Možná to není tvá cesta.

Nezískal jsi nic, ale aspoň ses pokusil. Zkušenost zůstává.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	// Negative endings (5)
	terminal_blocked_reforms: {
		id: "terminal_blocked_reforms",
		type: "terminal",
		narrative: `❌ **Zablokováno!**

Tvé reformy narazily na odpor v parlamentu. Lobbyisté tě přemohli.

Ztrácíš **-200 mincí** na právní boje a politický kapitál.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_recession: {
		id: "terminal_recession",
		type: "terminal",
		narrative: `📉 **Ekonomická katastrofa!**

Tvá daňová reforma selhala a způsobila ekonomický propad. Jsi obviňován.

Ztrácíš **-400 mincí** a politickou kariéru. Recese tě ničí.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_defeated: {
		id: "terminal_defeated",
		type: "terminal",
		narrative: `😞 **Definitivní prohra**

Přepočítání potvrdilo výsledek - skutečně jsi prohrál.

Ztratil jsi **-50 mincí** na přepočítání a musíš to přijmout.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_court_penalty: {
		id: "terminal_court_penalty",
		type: "terminal",
		narrative: `⚖️ **Soudní trest**

Pokus o ututlání selhal! Věc se dostala k soudu a prohrál jsi.

Platíš pokutu **-800 mincí** a tvá kariéra je u konce.`,
		coinsChange: -800,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_no_support: {
		id: "terminal_no_support",
		type: "terminal",
		narrative: `🤷 **Nikdo neodpověděl**

Tvůj apel na podporu selhal. Voliči už ztratili zájem.

Nezískal jsi nic a musíš to přijmout. Prohra bolí.`,
		coinsChange: 0,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},
};

export const electionsCandidateBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 24,
	averageReward: 200,
	maxPossibleReward: 1000, // Positive campaign + win + economic reform success (200 + 100 + 700)
	minPossibleReward: -800, // Attack campaign + win + scandal + cover up fail (court penalty)
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(electionsCandidateBranchingStory);
