/**
 * Microwave Drama - Branching Story
 *
 * Branching narrative about office kitchen chaos.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Response to alarm]
 *   -> Investigate -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Found culprit]
 *       -> Confront -> [OUTCOME] -> [TERMINAL: Justice/Backfire]
 *       -> Cover for them -> [OUTCOME] -> [TERMINAL: Friend/Accomplice]
 *     -> Failure -> [DECISION 2b: It was you]
 *       -> Confess -> [TERMINAL: Forgiven]
 *       -> Hide evidence -> [OUTCOME] -> [TERMINAL: Escaped/Caught]
 *   -> Run away -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Blame game starts]
 *       -> Join witch hunt -> [OUTCOME] -> [TERMINAL: Mob justice/Wrong person]
 *       -> Stay quiet -> [TERMINAL: Neutral]
 *     -> Failure -> [TERMINAL: Suspected]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "microwave_drama_branching";
const STORY_TITLE = "Mikrovlnné drama";
const STORY_EMOJI = "🔥";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `🚨 **ALARM!** Požární alarm řve po celé budově!

Z kuchyňky se valí dým. Pach spáleniny se šíří open spacem.

Kolegové vybíhají ven. Někdo do mikrovlnky dal rybu... na 10 minut.

🐟 *Kdo to byl?!*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Response to alarm
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Stojíš v chodbě mezi útěkem ven a kuchyňkou. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Vyšetřovat",
				description: "Jdeš do kuchyňky zjistit, kdo za to může. Spravedlnost musí zvítězit!",
				baseReward: 350,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_investigate",
			},
			choiceY: {
				id: "choiceY",
				label: "Utéct ven",
				description: "Tohle nechceš řešit. Rychle ven, dokud tě někdo nespojí s kuchyňkou.",
				baseReward: 150,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_run",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Investigate
	// =========================================================================
	outcome_investigate: {
		id: "outcome_investigate",
		type: "outcome",
		narrative: `🔍 Jdeš do zakouřené kuchyňky. Mikrovlnka je černá zevnitř. Na displeji svítí "10:00".

Kdo nastavil 10 minut na rybu?! Hledáš stopy...`,
		successChance: 70,
		successNodeId: "decision_2a_culprit",
		failNodeId: "decision_2b_it_was_you",
	},

	// =========================================================================
	// DECISION 2a: Found the culprit
	// =========================================================================
	decision_2a_culprit: {
		id: "decision_2a_culprit",
		type: "decision",
		narrative: `👀 **NAŠEL JSI HO!** V koši leží krabička od ryby s cedulkou "Martin - neotvírat!"

Martin z IT. Ten tichý kluk, co nikdy nemluví. Teď stojí venku a tváří se nevinně.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Konfrontovat ho",
				description: "Veřejně ho obviníš. Spravedlnost musí být!",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_confront",
			},
			choiceY: {
				id: "choiceY",
				label: "Krýt ho",
				description: "Schováš důkaz. Martin je hodný kluk, každý dělá chyby.",
				baseReward: 200,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_cover",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Plot twist - it was you!
	// =========================================================================
	decision_2b_it_was_you: {
		id: "decision_2b_it_was_you",
		type: "decision",
		narrative: `😱 **POČKAT...** Ta krabička v mikrovlnce je... tvoje?!

Vzpomínáš si - ráno jsi dal rybu ohřát a pak ti zavolal šéf! Zapomněl jsi na ni!

TY jsi ten viník!`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Přiznat se",
				description: "Sebeš odvahu a přiznáš pravdu. Aspoň s čistým svědomím.",
				baseReward: 100,
				riskMultiplier: 0.6,
				nextNodeId: "outcome_confess",
			},
			choiceY: {
				id: "choiceY",
				label: "Zničit důkazy",
				description: "Rychle vyhodíš krabičku a budeš hrát nevinného.",
				baseReward: 250,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_hide_evidence",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Running away
	// =========================================================================
	outcome_run: {
		id: "outcome_run",
		type: "outcome",
		narrative: `🏃 Rychle mizíš z budovy. Venku se shromažďují kolegové.

Všichni spekulují, kdo to byl. Někdo říká: "Viděl jsem tě ráno v kuchyňce..."`,
		successChance: 70,
		successNodeId: "decision_2c_blame_game",
		failNodeId: "decision_2d_suspicious",
	},

	// =========================================================================
	// DECISION 2d: You look suspicious after running
	// =========================================================================
	decision_2d_suspicious: {
		id: "decision_2d_suspicious",
		type: "decision",
		narrative: `🤨 Tvůj rychlý útěk vypadal podezřele. Kolegyně se na tebe dívá: "Proč ses tak hnal ven? Nebyl jsi náhodou v kuchyňce?"

Musíš rychle reagovat.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Vymyslet výmluvu",
				description: '"Šel jsem na záchod, nestihl jsem to!" Zkusíš to zahrát.',
				baseReward: 100,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_excuse",
			},
			choiceY: {
				id: "choiceY",
				label: "Mlčet a ignorovat",
				description: "Prostě nic neřekneš a budeš se tvářit zmateně.",
				baseReward: 50,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_silent_treatment",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Making an excuse
	// =========================================================================
	outcome_excuse: {
		id: "outcome_excuse",
		type: "outcome",
		narrative: `🎭 "Šel jsem na záchod, to je celé!" říkáš přesvědčivě. Kolegyně tě měří pohledem...`,
		successChance: 70,
		successNodeId: "terminal_excuse_worked",
		failNodeId: "terminal_suspected",
	},

	terminal_excuse_worked: {
		id: "terminal_excuse_worked",
		type: "terminal",
		narrative: `😌 **Výmluva zabrala**

Kolegyně pokrčila rameny a odešla. Nikdo tě dál nepodezírá.

Získáváš **+100 mincí** a poučení, že příště nemáš utíkat.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	// =========================================================================
	// OUTCOME: Silent treatment
	// =========================================================================
	outcome_silent_treatment: {
		id: "outcome_silent_treatment",
		type: "outcome",
		narrative: `😶 Mlčíš a tváříš se zmateně. "Co? Jaká kuchyňka?" Kolegyně tě pozoruje...`,
		successChance: 70,
		successNodeId: "terminal_forgotten_suspect",
		failNodeId: "terminal_suspected",
	},

	terminal_forgotten_suspect: {
		id: "terminal_forgotten_suspect",
		type: "terminal",
		narrative: `🤷 **Zapomenuto**

Za pár minut se pozornost přesunula jinam. Nikdo si na tebe nevzpomněl.

Získáváš **+50 mincí** za nervy, ale přežil jsi.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	// =========================================================================
	// DECISION 2c: Blame game starts
	// =========================================================================
	decision_2c_blame_game: {
		id: "decision_2c_blame_game",
		type: "decision",
		narrative: `🔥 Venku začíná hon na čarodějnice. Všichni hledají viníka.

Někdo ukazuje na Martina z IT. Vypadá, že se nebrání...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Přidat se k davu",
				description: '"Jo, viděl jsem ho tam!" Čím víc lidí obviní Martina, tím líp pro tebe.',
				baseReward: 200,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_mob",
			},
			choiceY: {
				id: "choiceY",
				label: "Držet se stranou",
				description: "Nebudeš se účastnit honu. Prostě mlčíš a sleduješ.",
				baseReward: 100,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_stay_quiet",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Confronting Martin
	// =========================================================================
	outcome_confront: {
		id: "outcome_confront",
		type: "outcome",
		narrative: `📢 "MARTIN! Našel jsem tvou krabičku v mikrovlnce!"

Všichni se otáčí. Martin bledne. HR manažerka si to zapisuje.`,
		successChance: 70,
		successNodeId: "terminal_justice_served",
		failNodeId: "terminal_backfire",
	},

	// =========================================================================
	// OUTCOME: Cover for Martin
	// =========================================================================
	outcome_cover: {
		id: "outcome_cover",
		type: "outcome",
		narrative: `🤫 Rychle schováváš krabičku do koše. Martin si tě všimne a přikývne.

Nikdo nic neví. Jsi jeho zachránce.`,
		successChance: 70,
		successNodeId: "terminal_new_friend",
		failNodeId: "terminal_accomplice",
	},

	// =========================================================================
	// OUTCOME: Hide evidence
	// =========================================================================
	outcome_hide_evidence: {
		id: "outcome_hide_evidence",
		type: "outcome",
		narrative: `🗑️ Rychle vyhazuješ krabičku do koše venku. Navenek se tváříš překvapeně.

"Co se stalo? To je hrozný pach!"`,
		successChance: 70,
		successNodeId: "terminal_escaped",
		failNodeId: "terminal_caught",
	},

	// =========================================================================
	// OUTCOME: Joining mob
	// =========================================================================
	outcome_mob: {
		id: "outcome_mob",
		type: "outcome",
		narrative: `👥 "Jo, viděl jsem Martina u mikrovlnky!" křičíš do davu.

Ostatní přitakávají. Martin vypadá zničeně.`,
		successChance: 70,
		successNodeId: "terminal_mob_justice",
		failNodeId: "terminal_wrong_person",
	},

	// =========================================================================
	// OUTCOME: Confessing to the fish crime
	// =========================================================================
	outcome_confess: {
		id: "outcome_confess",
		type: "outcome",
		narrative: `😔 "Lidi... to jsem byl já. Zapomněl jsem na tu rybu." Všichni se otáčí...`,
		successChance: 70,
		successNodeId: "terminal_forgiven",
		failNodeId: "terminal_confess_punishment",
	},

	terminal_confess_punishment: {
		id: "terminal_confess_punishment",
		type: "terminal",
		narrative: `⚠️ **Přísný trest**

HR manažerka ti dala oficiální napomenutí a pokutu za poškození firemního majetku.

Ztrácíš **-200 mincí** a musíš zaplatit novou mikrovlnku.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	// =========================================================================
	// OUTCOME: Staying quiet during blame game
	// =========================================================================
	outcome_stay_quiet: {
		id: "outcome_stay_quiet",
		type: "outcome",
		narrative: `🤐 Mlčíš a sleduješ, jak se situace vyvíjí. Dav se pomalu uklidňuje...`,
		successChance: 70,
		successNodeId: "terminal_neutral",
		failNodeId: "terminal_guilt_eats_you",
	},

	terminal_guilt_eats_you: {
		id: "terminal_guilt_eats_you",
		type: "terminal",
		narrative: `😣 **Špatné svědomí**

Martin dostal neprávem vinu a ty jsi mlčel. Každý den ho vidíš a cítíš vinu.

Kupuješ mu anonymní dárkový koš jako omluvu. Ztrácíš **-100 mincí** a klidný spánek.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (7)
	terminal_justice_served: {
		id: "terminal_justice_served",
		type: "terminal",
		narrative: `⚖️ **SPRAVEDLNOST!**

Martin přiznal vinu. HR mu dala napomenutí a zakázala používat mikrovlnku.

Ty jsi hrdina kanceláře! Kolegové ti děkují za vyřešení "Rybího incidentu 2024".

Získáváš **+400 mincí** a titul "Kuchyňský detektiv".`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_new_friend: {
		id: "terminal_new_friend",
		type: "terminal",
		narrative: `🤝 **NOVÝ PŘÍTEL**

Martin ti později píše: "Díky, že jsi mě kryl. Dlužím ti."

Od teď máš v IT kamaráda, který ti vyřeší každý problém s počítačem.

Získáváš **+300 mincí** v hodnotě IT služeb.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_forgiven: {
		id: "terminal_forgiven",
		type: "terminal",
		narrative: `😅 **ODPUŠTĚNO**

"To jsem byl já. Zapomněl jsem na to." Všichni se tváří překvapeně.

HR ti dá napomenutí, ale kolegové oceňují tvou upřímnost.

Získáváš **+150 mincí** za odvahu přiznat chybu.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_escaped: {
		id: "terminal_escaped",
		type: "terminal",
		narrative: `🏃 **UNIKL JSI!**

Důkazy jsou zničeny. Nikdo nic neví. Martin dostal vinu (neprávem).

Žiješ s tím. Občas tě to štve, ale... přežil jsi.

Získáváš **+200 mincí** a trochu špatného svědomí.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_neutral: {
		id: "terminal_neutral",
		type: "terminal",
		narrative: `😐 **NEUTRÁLNÍ POZICE**

Nikdo tě neobvinil, nikdo tě nepochválil. Prostě jsi přežil.

Mikrovlnka je vyměněna, život jde dál.

Získáváš **+100 mincí** za nervy z čekání.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_mob_justice: {
		id: "terminal_mob_justice",
		type: "terminal",
		narrative: `⚡ **DAVOVÁ SPRAVEDLNOST**

Martin dostal výpověď. Nikdo nezjistil, že jsi lhal.

Cítíš se trochu špatně, ale... přežil jsi.

Získáváš **+250 mincí** a noční můry.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 0.7,
	},

	// Negative endings (4)
	terminal_backfire: {
		id: "terminal_backfire",
		type: "terminal",
		narrative: `😬 **ZPĚTNÝ ÚDER**

"Počkat, ta krabička je MODRÁ. Martinova je ZELENÁ!"

Zmýlil ses. Obvinil jsi nevinného. Martin má alibi - byl na meetingu.

Ztrácíš **-250 mincí** na omluvu.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_accomplice: {
		id: "terminal_accomplice",
		type: "terminal",
		narrative: `🚨 **SPOLUVINÍK**

Kamera v kuchyňce tě zachytila, jak schováváš důkaz.

HR tě volá: "Potřebujeme si promluvit o tom, co jsi dělal v kuchyňce..."

Ztrácíš **-300 mincí** na pokutu.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_caught: {
		id: "terminal_caught",
		type: "terminal",
		narrative: `📸 **PŘISTIŽEN!**

Security kamera zachytila, jak vyhazuješ důkaz. Jsi odhalen jako viník.

"Zničení důkazů je horší než ta ryba," říká HR.

Ztrácíš **-400 mincí** a čistý trestní rejstřík.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_suspected: {
		id: "terminal_suspected",
		type: "terminal",
		narrative: `🤨 **PODEZŘELÝ**

Tvůj útěk vypadal podezřele. Kolegové si šuškají.

Nikdo nic nedokázal, ale... všichni tě podezírají.

Ztrácíš **-150 mincí** na nervy a paranoiu.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_wrong_person: {
		id: "terminal_wrong_person",
		type: "terminal",
		narrative: `😰 **ŠPATNÝ ČLOVĚK**

Později se ukáže, že to nebyl Martin. Byl to nový stážista, který už odešel.

Ty jsi lhal a Martin dostal neprávem vyhazov. Karma existuje.

Ztrácíš **-350 mincí** a klidný spánek.`,
		coinsChange: -350,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},
};

export const microwaveDramaBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 28,
	averageReward: 150,
	maxPossibleReward: 400, // Investigate -> Confront -> Justice
	minPossibleReward: -400, // Investigate -> Hide evidence -> Caught
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(microwaveDramaBranchingStory);
