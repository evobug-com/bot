/**
 * Reply-All Disaster - Branching Story
 *
 * Branching narrative about accidentally emailing the whole company.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Immediate response]
 *   -> Recall email -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: IT helps]
 *       -> Bribe IT -> [OUTCOME] -> [TERMINAL: Covered/Expensive]
 *       -> Ask nicely -> [OUTCOME] -> [TERMINAL: Saved/Too late]
 *     -> Failure -> [DECISION 2b: Damage control]
 *       -> Send apology -> [TERMINAL: Forgiven]
 *       -> Pretend hack -> [OUTCOME] -> [TERMINAL: Believed/Exposed]
 *   -> Own it -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: CEO responds]
 *       -> Double down -> [OUTCOME] -> [TERMINAL: Legend/Fired]
 *       -> Apologize -> [TERMINAL: Humble]
 *     -> Failure -> [TERMINAL: Career over]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "reply_all_branching";
const STORY_TITLE = "Reply-All katastrofa";
const STORY_EMOJI = "📧";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `😱 **NE NE NE NE NE!**

Právě jsi klikl ODESLAT. Ten email, kde sis stěžoval na šéfa... šel na CELOU FIRMU.

"Ten chlap je úplný idiot, nedivím se, že firma jde ke dnu."

📬 550 lidí. Včetně CEO. Včetně šéfa. Včetně HR.

*Co teď?!*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Immediate response
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Máš pár sekund na rozhodnutí. Outlook ukazuje "Odesláno". Srdce ti buší.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Stáhnout email",
				description: "Zkusíš recall funkci. Možná to ještě nikdo nečetl!",
				baseReward: 300,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_recall",
			},
			choiceY: {
				id: "choiceY",
				label: "Stát si za tím",
				description: "Co je psáno, to je dáno. Budeš to obhajovat!",
				baseReward: 400,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_own_it",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Recall email
	// =========================================================================
	outcome_recall: {
		id: "outcome_recall",
		type: "outcome",
		narrative: `⚡ Klikáš "Recall This Message" jako zběsilý.

"Probíhá stahování zprávy... Některým příjemcům již byla doručena."

Běžíš za IT oddělením...`,
		successChance: 70,
		successNodeId: "decision_2a_it_help",
		failNodeId: "decision_2b_damage_control",
	},

	// =========================================================================
	// DECISION 2a: IT can help
	// =========================================================================
	decision_2a_it_help: {
		id: "decision_2a_it_help",
		type: "decision",
		narrative: `💻 Martin z IT se dívá na tvůj problém.

"Hmm, můžu to smazat ze serveru, ale... bude to chtít úsilí."`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Úplatek",
				description: '"Kolik chceš? Zaplatím cokoliv!" Zoufalé časy, zoufalá opatření.',
				baseReward: 450,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_bribe",
			},
			choiceY: {
				id: "choiceY",
				label: "Poprosit slušně",
				description: '"Prosím, pomoz mi. Udělám, co chceš."',
				baseReward: 300,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_ask_nicely",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Damage control
	// =========================================================================
	decision_2b_damage_control: {
		id: "decision_2b_damage_control",
		type: "decision",
		narrative: `😨 **POZDĚ!** IT ti říká, že email už četlo 200 lidí.

Šéf ti volá. Nezvedáš. Co teď?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Omluvný email",
				description: "Pošleš upřímnou omluvu celé firmě. Aspoň s čistým svědomím.",
				baseReward: 150,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_forgiven_apology",
			},
			choiceY: {
				id: "choiceY",
				label: "Předstírat hack",
				description: '"Můj účet byl hacknutý! To jsem nepsal já!"',
				baseReward: 300,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_pretend_hack",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Own it
	// =========================================================================
	outcome_own_it: {
		id: "outcome_own_it",
		type: "outcome",
		narrative: `💪 Sedíš a čekáš. Co bude, to bude.

Za 10 minut ti přijde email od CEO: "Zastavte se u mé kanceláře."

Jdeš...`,
		successChance: 70,
		successNodeId: "decision_2c_ceo_responds",
		failNodeId: "terminal_career_over",
	},

	// =========================================================================
	// DECISION 2c: CEO responds positively
	// =========================================================================
	decision_2c_ceo_responds: {
		id: "decision_2c_ceo_responds",
		type: "decision",
		narrative: `🤔 CEO se na tebe dívá. Kupodivu se neusmívá, ale ani nezuří.

"Ten email... měl jsi v něčem pravdu. Ale způsob byl... nevhodný."`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zdvojnásobit",
				description: '"Ano, měl. A můžu vám říct víc, co je špatně."',
				baseReward: 600,
				riskMultiplier: 1.5,
				nextNodeId: "outcome_double_down",
			},
			choiceY: {
				id: "choiceY",
				label: "Omluvit se",
				description: '"Máte pravdu, omlouvám se za formu. Měl jsem to řešit jinak."',
				baseReward: 350,
				riskMultiplier: 0.8,
				nextNodeId: "terminal_humble",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Bribe IT
	// =========================================================================
	outcome_bribe: {
		id: "outcome_bribe",
		type: "outcome",
		narrative: `💰 "500 korun a oběd na týden," říká Martin.

Souhlasíš. Martin začíná mačkat klávesy jako šílený.`,
		successChance: 70,
		successNodeId: "terminal_covered",
		failNodeId: "terminal_expensive_lesson",
	},

	// =========================================================================
	// OUTCOME: Ask nicely
	// =========================================================================
	outcome_ask_nicely: {
		id: "outcome_ask_nicely",
		type: "outcome",
		narrative: `🙏 "Prosím, Martin. Jsi můj jediný hope."

Martin povzdechne. "Dobře, zkusím to. Ale rychle!"`,
		successChance: 70,
		successNodeId: "terminal_saved_by_kindness",
		failNodeId: "terminal_too_late",
	},

	// =========================================================================
	// OUTCOME: Pretend hack
	// =========================================================================
	outcome_pretend_hack: {
		id: "outcome_pretend_hack",
		type: "outcome",
		narrative: `🎭 Posíláš email: "VAROVÁNÍ: Můj účet byl kompromitován! Ten předchozí email jsem nepsal já!"

Čekáš na reakce...`,
		successChance: 70,
		successNodeId: "terminal_hack_believed",
		failNodeId: "terminal_exposed",
	},

	// =========================================================================
	// OUTCOME: Double down with CEO
	// =========================================================================
	outcome_double_down: {
		id: "outcome_double_down",
		type: "outcome",
		narrative: `😤 "Ano, řekl jsem pravdu. A můžu říct víc. Ten projekt z minulého měsíce? Katastrofa. Komunikace v týmu? Nulová."

CEO mlčí. Zvedá obočí...`,
		successChance: 70,
		successNodeId: "terminal_legend",
		failNodeId: "terminal_fired_on_spot",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (7)
	terminal_covered: {
		id: "terminal_covered",
		type: "terminal",
		narrative: `🙈 **UTAJENO!**

Martin to zvládl! Email je smazaný ze serveru. Většina lidí si myslí, že to byl spam.

Stálo tě to **-200 mincí** na úplatek, ale kariéra je zachráněna.`,
		coinsChange: -200,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_saved_by_kindness: {
		id: "terminal_saved_by_kindness",
		type: "terminal",
		narrative: `💖 **ZACHRÁNĚN LASKAVOSTÍ**

Martin to stihl! Email je pryč dřív, než ho většina četla.

"Dlužíš mi," usmívá se Martin.

Získáváš **+250 mincí** v podobě zachráněné kariéry.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_forgiven_apology: {
		id: "terminal_forgiven_apology",
		type: "terminal",
		narrative: `🙏 **ODPUŠTĚNO**

Tvá upřímná omluva zabrala. Šéf ti volá: "Oceňuju, že jsi to přiznal. Pojďme to probrat."

Získáváš **+150 mincí** a druhou šanci.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_hack_believed: {
		id: "terminal_hack_believed",
		type: "terminal",
		narrative: `🎭 **UVĚŘILI TI!**

IT potvrdilo "bezpečnostní incident". Všichni ti věří. Šéf ti dokonce píše: "Doufám, že jsi v pořádku."

Získáváš **+300 mincí** a čisté jméno (technicky).`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_humble: {
		id: "terminal_humble",
		type: "terminal",
		narrative: `🙇 **POKORA**

CEO kývá. "Oceňuju omluvu. Pojďme probrat, jak to řešit konstruktivně."

Dostáváš druhou šanci a respekt za přístup.

Získáváš **+350 mincí** a mentora v CEO.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_legend: {
		id: "terminal_legend",
		type: "terminal",
		narrative: `🏆 **LEGENDA!**

CEO se zasměje. "Víš co? Máš pravdu. Pojď ke mně do týmu jako poradce."

Tvůj email se stal legendou. Kolegové tě obdivují za odvahu.

Získáváš **+600 mincí** a novou pozici!`,
		coinsChange: 600,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_too_late: {
		id: "terminal_too_late",
		type: "terminal",
		narrative: `⏰ **POZDĚ**

Martin to nestihl. Email už četl každý. Ale aspoň Martin ví, že jsi slušný člověk.

Dostáváš napomenutí, ale nic víc.

Získáváš **+50 mincí** za pokus.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	// Negative endings (4)
	terminal_expensive_lesson: {
		id: "terminal_expensive_lesson",
		type: "terminal",
		narrative: `💸 **DRAHÁ LEKCE**

Martin peníze vzal, ale email nesmazal. "Sorry, už to četl CEO."

Přišel jsi o peníze I o práci.

Ztrácíš **-400 mincí** a důstojnost.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_exposed: {
		id: "terminal_exposed",
		type: "terminal",
		narrative: `🔍 **ODHALEN!**

IT prokázalo, že email šel z tvého počítače a nikdo tě nehackl.

"Lhaní dělá věci horší," říká HR.

Ztrácíš **-350 mincí** a důvěru.`,
		coinsChange: -350,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_career_over: {
		id: "terminal_career_over",
		type: "terminal",
		narrative: `💀 **KONEC KARIÉRY**

CEO nezareagoval dobře. Šéf ještě hůř.

"Sbal si věci," říká HR. "Okamžitá výpověď."

Ztrácíš **-500 mincí** a práci.`,
		coinsChange: -500,
		isPositiveEnding: false,
		xpMultiplier: 0.3,
	},

	terminal_fired_on_spot: {
		id: "terminal_fired_on_spot",
		type: "terminal",
		narrative: `🚪 **OKAMŽITÝ VYHAZOV**

"Dost," říká CEO ledově. "Security tě doprovodí ven."

Tvá odvaha byla obdivuhodná, ale timing tragický.

Ztrácíš **-600 mincí** a kariéru v oboru.`,
		coinsChange: -600,
		isPositiveEnding: false,
		xpMultiplier: 0.2,
	},
};

export const replyAllBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 20,
	averageReward: 100,
	maxPossibleReward: 600, // Own it -> Double down -> Legend
	minPossibleReward: -600, // Own it -> Double down -> Fired
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(replyAllBranchingStory);
