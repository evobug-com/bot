/**
 * Christmas Party - Branching Story
 *
 * A Mass Effect-style branching narrative about attending a company Christmas party.
 * Features 3 decision layers and 11 unique endings (8 positive, 3 negative).
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Socialize or Stay Professional]
 *   -> Socialize -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Join Secret Santa or Enter Raffle]
 *       -> Secret Santa -> [OUTCOME] -> [TERMINAL: Bitcoin/Socks]
 *       -> Raffle -> [OUTCOME] -> [TERMINAL: Big Prize/Small Prize]
 *     -> Failure -> [DECISION 2b: Drunk situation]
 *       -> Apologize -> [TERMINAL: Forgiven]
 *       -> Leave -> [TERMINAL: Fired]
 *   -> Professional -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Network with CEO or Present idea]
 *       -> Network -> [OUTCOME] -> [TERMINAL: Promotion/Raise]
 *       -> Present idea -> [OUTCOME] -> [TERMINAL: Innovation Award/Rejected]
 *     -> Failure -> [TERMINAL: Awkward]
 */

import type { BranchingStory, StoryNode } from "../types";
import { randomInt } from "../types";

const STORY_ID = "christmas_party_branching";
const STORY_TITLE = "Vánoční večírek";
const STORY_EMOJI = "🎄";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `🎄 **${STORY_TITLE}**

Dnes večer se koná vánoční večírek tvé firmy v luxusním hotelu. Sál je vyzdobený, hraje vánoční hudba, stoly se prohýbají pod vánoční hostinou.

Všichni kolegové jsou tu - od nováčků po CEO. Atmosféra je příjemná, ale co s tímto večerem uděláš?`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Socialize or Stay Professional
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `🍽️ Večeře právě končí a lidé se začínají posouvat k baru a ke stolům s občerstvením. Máš před sebou důležité rozhodnutí.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Jít mezi lidi",
				description: "Uvolnit se, dát si pár drinků a bavit se s kolegy.",
				baseReward: 400,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_socialize",
			},
			choiceY: {
				id: "choiceY",
				label: "Zůstat profesionální",
				description: "Držet se stranou, alkohol odmítat, pozorovat příležitosti.",
				baseReward: 600,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_professional",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Socializing
	// =========================================================================
	outcome_socialize: {
		id: "outcome_socialize",
		type: "outcome",
		narrative: `🍷 Rozhodneš se užít si večer. Jdeš k baru, objednáš si drink a začneš si povídat s kolegy...`,
		successChance: 70,
		successNodeId: "decision_2a_fun",
		failNodeId: "decision_2b_drunk",
	},

	// =========================================================================
	// DECISION 2a: Having fun - Secret Santa or Raffle
	// =========================================================================
	decision_2a_fun: {
		id: "decision_2a_fun",
		type: "decision",
		narrative: `🎉 **Parádní nálada!** Bavíš se skvěle, nepiješ moc, všechno je v pohodě.

Právě začínají vánoční aktivity - Secret Santa a tombola. Do čeho se zapojíš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Secret Santa",
				description: "Zajímá tě, co ti kolegové připravili jako dárek.",
				baseReward: 1500,
				riskMultiplier: 1.5,
				nextNodeId: "outcome_secret_santa",
			},
			choiceY: {
				id: "choiceY",
				label: "Tombola",
				description: "Zkusíš štěstí v losování o ceny.",
				baseReward: 400,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_raffle",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Got drunk - deal with consequences
	// =========================================================================
	decision_2b_drunk: {
		id: "decision_2b_drunk",
		type: "decision",
		narrative: `😵 **Přeháněl jsi to!** Začal jsi s jedním drinkem, pak dalším... a teď je ti špatně.

Právě jsi srazil drahocennou vázu z podstavce! Rozbila se na kusy. HR manager k tobě spěchá s vážným výrazem.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Omluvit se",
				description: "Upřímně se omluvíš a nabídneš náhradu škody.",
				baseReward: 0,
				riskMultiplier: 1.0,
				nextNodeId: "terminal_forgiven",
			},
			choiceY: {
				id: "choiceY",
				label: "Rychle odejít",
				description: "Panikáříš a zkusíš se nenápadně vytratit.",
				baseReward: -500,
				riskMultiplier: 1.0,
				nextNodeId: "terminal_fired",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Secret Santa
	// =========================================================================
	outcome_secret_santa: {
		id: "outcome_secret_santa",
		type: "outcome",
		narrative: `🎁 Jdeš k Secret Santa stolku. Organizátorka ti s úsměvem podává malou elegantní krabičku...

Rozbaluješ ji před všemi. V krabičce je...`,
		successChance: 70,
		successNodeId: "terminal_bitcoin",
		failNodeId: "terminal_socks",
	},

	// =========================================================================
	// OUTCOME: Raffle
	// =========================================================================
	outcome_raffle: {
		id: "outcome_raffle",
		type: "outcome",
		narrative: () => `🎟️ Účastníš se tomboly. Máš lístek číslo **${randomInt(1, 100)}**.

Organizátor začíná losovat. Postupně vytahuje čísla...`,
		successChance: 70,
		successNodeId: "terminal_big_prize",
		failNodeId: "terminal_small_prize",
	},

	// =========================================================================
	// OUTCOME: Being professional
	// =========================================================================
	outcome_professional: {
		id: "outcome_professional",
		type: "outcome",
		narrative: `💼 Rozhodneš se zůstat profesionální. Odmítáš alkohol a pozoruješ situaci...

Všimneš si, že CEO firmy stojí sám v koutě...`,
		successChance: 70,
		successNodeId: "decision_2c_networking",
		failNodeId: "terminal_awkward",
	},

	// =========================================================================
	// DECISION 2c: Networking opportunities
	// =========================================================================
	decision_2c_networking: {
		id: "decision_2c_networking",
		type: "decision",
		narrative: `🤝 CEO vypadá přístupně. To je tvoje šance! Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Networkovat",
				description: "Prostě si popovídat, poznat ho osobně.",
				baseReward: 700,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_network",
			},
			choiceY: {
				id: "choiceY",
				label: "Představit nápad",
				description: "Máš inovativní nápad pro firmu - teď nebo nikdy!",
				baseReward: 1200,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_pitch",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Networking with CEO
	// =========================================================================
	outcome_network: {
		id: "outcome_network",
		type: "outcome",
		narrative: `💬 Přistupuješ k CEO a začínáš konverzaci. Bavíte se o sportu, rodině, plánech na svátky...

Atmosféra je příjemná. CEO si tě pamatuje...`,
		successChance: 70,
		successNodeId: "terminal_promotion",
		failNodeId: "terminal_raise",
	},

	// =========================================================================
	// OUTCOME: Pitching idea to CEO
	// =========================================================================
	outcome_pitch: {
		id: "outcome_pitch",
		type: "outcome",
		narrative: `💡 Začínáš představovat svůj nápad na optimalizaci firemních procesů...

CEO tě pozorně poslouchá, přikyvuje...`,
		successChance: 70,
		successNodeId: "terminal_innovation",
		failNodeId: "terminal_rejected",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_bitcoin: {
		id: "terminal_bitcoin",
		type: "terminal",
		narrative: `🎅 **BITCOIN!**

...USB disk s Bitcoin wallet! Nápis říká: "HODL! 🚀"

Kontroluješ hodnotu - právě vyletěla nahoru! Prodáváš za **+1500 mincí**!

**Nejlepší Secret Santa ever!**`,
		coinsChange: 1500,
		isPositiveEnding: true,
		xpMultiplier: 2.0,
	},

	terminal_big_prize: {
		id: "terminal_big_prize",
		type: "terminal",
		narrative: () => `🎁 **HLAVNÍ VÝHRA!**

"A číslo **${randomInt(1, 100)}**!" volá organizátor.

To je tvoje číslo! Vyhráváš hlavní cenu - **víkend pro dva v horském hotelu**!

Prodáš poukaz kolegovi za **+${randomInt(400, 600)} mincí**. Štěstí přeje připraveným!`,
		coinsChange: () => randomInt(400, 600),
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_small_prize: {
		id: "terminal_small_prize",
		type: "terminal",
		narrative: `🎟️ **Malá výhra**

Tvoje číslo padlo až ke koncu. Vyhráváš útěšnou cenu - **poukaz do e-shopu**.

Není to hlavní výhra, ale pořád lepší než nic! Získáváš **+250 mincí**.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_promotion: {
		id: "terminal_promotion",
		type: "terminal",
		narrative: `🌟 **POVÝŠENÍ!**

CEO si tě zapamatoval. Za týden tě volá do kanceláře.

"Líbí se mi vaše přístup. Máme pro vás lepší pozici."

Dostáváš povýšení a s ním **+800 mincí** jako podpisový bonus!`,
		coinsChange: 800,
		isPositiveEnding: true,
		xpMultiplier: 1.8,
	},

	terminal_raise: {
		id: "terminal_raise",
		type: "terminal",
		narrative: `💰 **Zvýšení platu**

CEO ocení tvou profesionalitu. Za pár dní dostáváš email od HR.

"Na základě hodnocení vám navyšujeme plat."

Získáváš **+600 mincí** jako přímý bonus!`,
		coinsChange: 600,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_innovation: {
		id: "terminal_innovation",
		type: "terminal",
		narrative: `🏆 **Inovační ocenění!**

CEO je nadšený! "Tohle je přesně to, co potřebujeme!"

Tvůj nápad je implementován a dostáváš **Innovation Award** s odměnou **+1200 mincí**!

Kariéra nabírá na obrátkách!`,
		coinsChange: 1200,
		isPositiveEnding: true,
		xpMultiplier: 2.2,
	},

	terminal_forgiven: {
		id: "terminal_forgiven",
		type: "terminal",
		narrative: `🙏 **Odpuštěno**

"Chápu, stává se to. Oceňuji vaši upřímnost," říká HR manager.

Musíš zaplatit **-200 mincí** za vázu, ale tvoje poctivost byla oceněna. Ponecháš si práci a respekt kolegů.`,
		coinsChange: -200,
		isPositiveEnding: true, // Kept the job, learned lesson
		xpMultiplier: 1.0,
	},

	terminal_socks: {
		id: "terminal_socks",
		type: "terminal",
		narrative: `🧦 **Ponožky...**

...vánoční ponožky. S sobem Rudolf.

No, aspoň něco. Někdo měl smysl pro humor. Prodáš je na bazaru za **+50 mincí**.

Příště víc štěstí!`,
		coinsChange: 50,
		isPositiveEnding: true, // Got something
		xpMultiplier: 0.9,
	},

	// Negative endings (3)
	terminal_fired: {
		id: "terminal_fired",
		type: "terminal",
		narrative: `🚫 **VYHAZOV!**

Pokusil ses odejít, ale security tě zastavila. HR manager je rozzuřený.

"To je neprofesionální chování. Jste propuštěn s okamžitou platností!"

Ztrácíš práci a musíš zaplatit **-500 mincí** za škodu. Vánoce jsou zničené.`,
		coinsChange: -500,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_awkward: {
		id: "terminal_awkward",
		type: "terminal",
		narrative: `😬 **Trapas**

Snažil ses být profesionální, ale přeháněl jsi to. Celý večer jsi působil jako robotický outsider.

CEO si tě nevšiml, kolegové si myslí, že jsi arogantní.

Nic nezískáváš, nic neztrácíš. Jen **+0 mincí** a divné pohledy.`,
		coinsChange: 0,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_rejected: {
		id: "terminal_rejected",
		type: "terminal",
		narrative: `❌ **Nápad zamítnut**

CEO tě vyslechne, ale pak zavrtí hlavou.

"Je to zajímavé, ale nerealistické. Potřebujeme praktičtější řešení."

Udělal jsi špatný dojem. Žádný bonus, dokonce **-100 mincí** za ztrátu času.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},
};

export const christmasPartyBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 22,
	averageReward: 400,
	maxPossibleReward: 1500, // Socialize + Secret Santa + Bitcoin
	minPossibleReward: -500, // Socialize + Drunk + Fired
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(christmasPartyBranchingStory);
