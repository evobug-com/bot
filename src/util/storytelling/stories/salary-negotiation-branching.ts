/**
 * Salary Negotiation - Branching Story
 *
 * Branching narrative about asking for a raise.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Preparation approach]
 *   -> Research first -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Timing]
 *       -> After project -> [OUTCOME] -> [TERMINAL: Big raise/Postponed]
 *       -> During review -> [OUTCOME] -> [TERMINAL: Standard raise/Rejected]
 *     -> Failure -> [DECISION 2b: Bad research]
 *       -> Bluff anyway -> [OUTCOME] -> [TERMINAL: Lucky/Caught]
 *       -> Postpone -> [TERMINAL: Another day]
 *   -> Ask directly -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Boss impressed]
 *       -> Push harder -> [OUTCOME] -> [TERMINAL: Promotion/Greedy]
 *       -> Accept offer -> [TERMINAL: Fair deal]
 *     -> Failure -> [TERMINAL: Bad timing]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "salary_negotiation_branching";
const STORY_TITLE = "Vyjednávání o platu";
const STORY_EMOJI = "💰";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Pracuješ ve firmě už dva roky. Tvoje výkony jsou skvělé, kolegové tě chválí, projekty dodáváš včas.

Jenže tvůj plat se za tu dobu nezměnil. Kamarád v jiné firmě dělá to samé za o 30 % víc.

💭 *Je čas požádat o zvýšení platu...*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Preparation approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Stojíš před důležitým rozhodnutím. Můžeš si udělat důkladný průzkum trhu a připravit argumenty, nebo rovnou zaklepat na dveře šéfa.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Průzkum trhu",
				description: "Najdeš data o platech, připravíš si argumenty a vyčkáš na správný moment.",
				baseReward: 400,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_research",
			},
			choiceY: {
				id: "choiceY",
				label: "Jít rovnou za šéfem",
				description: "Sebevědomě zaklepeš a řekneš, co chceš. Odvaha se cení!",
				baseReward: 300,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_direct",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Research
	// =========================================================================
	outcome_research: {
		id: "outcome_research",
		type: "outcome",
		narrative: `📊 Trávíš večer na pracovních portálech. Glassdoor, Jobs.cz, LinkedIn...

Sbíráš data o průměrných platech na tvé pozici.`,
		successChance: 70,
		successNodeId: "decision_2a_timing",
		failNodeId: "decision_2b_bad_research",
	},

	// =========================================================================
	// DECISION 2a: Good research - timing
	// =========================================================================
	decision_2a_timing: {
		id: "decision_2a_timing",
		type: "decision",
		narrative: `✅ **Máš skvělá data!** Zjistil jsi, že tvůj plat je o 25 % pod průměrem trhu.

Teď musíš vybrat správný moment. Zrovna jsi dokončil velký projekt, ale za měsíc je roční hodnocení.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Po úspěšném projektu",
				description: "Využiješ momentum. Projekt se povedl, jsi v centru pozornosti.",
				baseReward: 500,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_after_project",
			},
			choiceY: {
				id: "choiceY",
				label: "Počkat na hodnocení",
				description: "Bezpečnější varianta. Hodnocení je formální příležitost mluvit o penězích.",
				baseReward: 300,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_during_review",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Bad research
	// =========================================================================
	decision_2b_bad_research: {
		id: "decision_2b_bad_research",
		type: "decision",
		narrative: `😕 **Data jsou nejednoznačná.** Našel jsi rozporuplné informace - některé zdroje říkají, že bereš málo, jiné že tvůj plat je v normě.

Nejsi si jistý, jak silné argumenty vlastně máš.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Blafovat",
				description: "Půjdeš za šéfem a budeš se tvářit sebejistě. Možná to vyjde.",
				baseReward: 250,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_bluff",
			},
			choiceY: {
				id: "choiceY",
				label: "Odložit to",
				description: "Počkáš, až budeš mít lepší data. Tentokrát to prostě nevyjde.",
				baseReward: 0,
				riskMultiplier: 0.5,
				nextNodeId: "outcome_postpone",
			},
		},
	},

	// =========================================================================
	// OUTCOME: After project success
	// =========================================================================
	outcome_after_project: {
		id: "outcome_after_project",
		type: "outcome",
		narrative: `🚀 Klepeš na dveře šéfa den po úspěšném launchi projektu. Všichni o něm mluví.

"Máš chvilku? Chtěl bych probrat svou situaci..."`,
		successChance: 70,
		successNodeId: "terminal_big_raise",
		failNodeId: "terminal_postponed",
	},

	// =========================================================================
	// OUTCOME: During review
	// =========================================================================
	outcome_during_review: {
		id: "outcome_during_review",
		type: "outcome",
		narrative: `📋 Je den ročního hodnocení. Sedíš naproti šéfovi v jednací místnosti.

"Tak, jak hodnotíš uplynulý rok?" ptá se. Teď je ten moment...`,
		successChance: 70,
		successNodeId: "terminal_standard_raise",
		failNodeId: "terminal_rejected",
	},

	// =========================================================================
	// OUTCOME: Bluffing
	// =========================================================================
	outcome_bluff: {
		id: "outcome_bluff",
		type: "outcome",
		narrative: `🎭 Jdeš za šéfem s přesvědčivým výrazem.

"Mám nabídku od konkurence. Nechci odcházet, ale..."`,
		successChance: 70,
		successNodeId: "terminal_lucky_bluff",
		failNodeId: "terminal_caught_bluffing",
	},

	// =========================================================================
	// OUTCOME: Direct approach
	// =========================================================================
	outcome_direct: {
		id: "outcome_direct",
		type: "outcome",
		narrative: `🚪 Zaklepeš na dveře šéfovy kanceláře. "Máš minutu?"

Šéf odloží telefon. "Jasně, co potřebuješ?"

Nadechneš se... "Chci mluvit o svém platu."`,
		successChance: 70,
		successNodeId: "decision_2c_impressed",
		failNodeId: "decision_2d_bad_timing",
	},

	// =========================================================================
	// DECISION 2c: Boss impressed
	// =========================================================================
	decision_2c_impressed: {
		id: "decision_2c_impressed",
		type: "decision",
		narrative: `😮 **Šéf je překvapený, ale ne negativně.**

"Oceňuju, že jdeš přímo za mnou. Máš pravdu, že je čas to řešit. Můžu ti nabídnout 10 % navíc."

Je to slušná nabídka, ale cítíš, že by mohlo být víc...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Tlačit na víc",
				description: "Zkusíš vytlačit víc. Řekneš, že jsi čekal aspoň 20 %.",
				baseReward: 600,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_push_harder",
			},
			choiceY: {
				id: "choiceY",
				label: "Přijmout nabídku",
				description: "10 % je slušné. Vezmeš to a budeš spokojený.",
				baseReward: 350,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_accept_offer",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Pushing for more
	// =========================================================================
	outcome_push_harder: {
		id: "outcome_push_harder",
		type: "outcome",
		narrative: `💪 "Děkuju za nabídku, ale čekal jsem něco víc. Myslím, že 20 % by bylo spravedlivé vzhledem k mému přínosu."

Šéf se zamyslí...`,
		successChance: 70,
		successNodeId: "terminal_promotion",
		failNodeId: "terminal_greedy",
	},

	// =========================================================================
	// OUTCOME: Postponing
	// =========================================================================
	outcome_postpone: {
		id: "outcome_postpone",
		type: "outcome",
		narrative: `📅 Rozhoduješ se počkat. Zavíráš laptop a jdeš si dát kafe...

Za měsíc se vrátíš s lepšími daty...`,
		successChance: 70,
		successNodeId: "terminal_another_day",
		failNodeId: "terminal_missed_window",
	},

	// =========================================================================
	// OUTCOME: Accepting the offer
	// =========================================================================
	outcome_accept_offer: {
		id: "outcome_accept_offer",
		type: "outcome",
		narrative: `🤝 "Díky, 10 % beru." Podáváte si ruce. Šéf se usmívá...`,
		successChance: 70,
		successNodeId: "terminal_fair_deal",
		failNodeId: "terminal_regret",
	},

	// =========================================================================
	// DECISION 2d: Bad timing situation
	// =========================================================================
	decision_2d_bad_timing: {
		id: "decision_2d_bad_timing",
		type: "decision",
		narrative: `😬 Šéf se zamračí. "Zrovna teď? Máme krizi na projektu a klient řve!"

Atmosféra je napjatá. Jak zareaguješ?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Omluvit se a odejít",
				description: "Přiznej chybu a vrať se jindy.",
				baseReward: 50,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_apologize_leave",
			},
			choiceY: {
				id: "choiceY",
				label: "Trvat na svém",
				description: "Řekneš, že to je důležité a potřebuješ odpověď.",
				baseReward: 200,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_insist",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Apologizing and leaving
	// =========================================================================
	outcome_apologize_leave: {
		id: "outcome_apologize_leave",
		type: "outcome",
		narrative: `🙏 "Omlouvám se, špatně jsem odhadl situaci. Vrátím se jindy."

Šéf přikývne...`,
		successChance: 70,
		successNodeId: "terminal_graceful_retreat",
		failNodeId: "terminal_bad_timing",
	},

	// =========================================================================
	// OUTCOME: Insisting
	// =========================================================================
	outcome_insist: {
		id: "outcome_insist",
		type: "outcome",
		narrative: `💪 "Vím, že je situace náročná, ale tohle je pro mě důležité..."

Šéf se na tebe dívá...`,
		successChance: 70,
		successNodeId: "terminal_respect_for_courage",
		failNodeId: "terminal_bad_timing",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_big_raise: {
		id: "terminal_big_raise",
		type: "terminal",
		narrative: `🎉 **VELKÉ ZVÝŠENÍ!**

"Máš pravdu, ten projekt byl skvělý. Navrhnu ti 25 % navíc a bonus za úspěšný launch."

Podáváte si ruce. Tvá příprava se vyplatila!

Získáváš **+600 mincí** jako bonus za odvahu a přípravu.`,
		coinsChange: 600,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_standard_raise: {
		id: "terminal_standard_raise",
		type: "terminal",
		narrative: `✅ **Standardní zvýšení**

"Tvoje výkony jsou nadprůměrné. Schvaluji ti 15 % navíc od příštího měsíce."

Není to závratné, ale je to solidní výsledek. Hodnocení bylo správná volba.

Získáváš **+350 mincí**.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_lucky_bluff: {
		id: "terminal_lucky_bluff",
		type: "terminal",
		narrative: `🍀 **Blaf vyšel!**

Šéf zbledne. "Nechci tě ztratit. Co kdybychom ti přidali 20 %?"

Vnitřně jásáš, ale navenek zůstáváš klidný. "To zní rozumně."

Získáváš **+450 mincí** - a nikdo se nedozví, že žádná nabídka neexistovala.`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_fair_deal: {
		id: "terminal_fair_deal",
		type: "terminal",
		narrative: `🤝 **Férová dohoda**

"Díky, 10 % beru." Podáváte si ruce.

Šéf oceňuje, že jsi nepřehnal. "Jsem rád, že jsme se domluvili. Jsi cenný člen týmu."

Získáváš **+300 mincí** a respekt.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_promotion: {
		id: "terminal_promotion",
		type: "terminal",
		narrative: `🚀 **POVÝŠENÍ!**

"Víš co? Máš pravdu, že si zasloužíš víc. Ale místo zvýšení ti nabízím povýšení na senior pozici. S tím půjde 30 % navíc a nové zodpovědnosti."

To jsi nečekal! Přijímáš.

Získáváš **+700 mincí** a nový titul!`,
		coinsChange: 700,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_another_day: {
		id: "terminal_another_day",
		type: "terminal",
		narrative: `📅 **Jindy**

Rozhodneš se počkat. Tentokrát to prostě není ten pravý moment.

Za měsíc se vrátíš s lepšími daty. Zatím žádná změna, ale ani žádná ztráta.

Získáváš **0 mincí**, ale uchováváš si možnosti.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_postponed: {
		id: "terminal_postponed",
		type: "terminal",
		narrative: `⏰ **Odloženo**

"Teď na to nemám kapacitu. Vraťme se k tomu za kvartál."

Šéf tě neposlal pryč, ale ani ti nic neslíbil. Budeš muset počkat.

Získáváš **+50 mincí** za snahu.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_missed_window: {
		id: "terminal_missed_window",
		type: "terminal",
		narrative: `⏰ **Zmeškaná příležitost**

Za měsíc firma oznámila zmrazení platů. Tvá šance je pryč.

Ztrácíš **-50 mincí** na ztracené motivaci.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_regret: {
		id: "terminal_regret",
		type: "terminal",
		narrative: `😕 **Lítost**

Za týden se dozvíš, že kolega vyjednal 20 %. Mohl jsi taky, kdybys tlačil víc.

Získáváš sice zvýšení, ale cítíš se špatně. **-50 mincí** na frustraci.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_graceful_retreat: {
		id: "terminal_graceful_retreat",
		type: "terminal",
		narrative: `🤝 **Diplomatický ústup**

Šéf oceňuje tvůj takt. Za týden tě sám zavolá: "Pojďme to probrat."

Získáváš **+150 mincí** za trpělivost a správné načasování.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_respect_for_courage: {
		id: "terminal_respect_for_courage",
		type: "terminal",
		narrative: `💪 **Odvaha se cení**

Šéf se zastaví a řekne: "Máš koule. OK, dám ti 8 % hned a zbytek po krizi."

Získáváš **+250 mincí** za odvahu.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	// Negative endings (3)
	terminal_rejected: {
		id: "terminal_rejected",
		type: "terminal",
		narrative: `❌ **Zamítnuto**

"Bohužel, rozpočet na tento rok je uzavřený. Tvoje hodnocení je dobré, ale zvýšení teď nejde."

Odcházíš s prázdnýma rukama. Možná příště.

Ztrácíš **-100 mincí** na ztracené motivaci.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_caught_bluffing: {
		id: "terminal_caught_bluffing",
		type: "terminal",
		narrative: `😳 **Přistižen!**

"Zajímavé. A od koho tu nabídku máš?" Šéf se usmívá. "Protože jsem se včera bavil s Petrem z té firmy a říkal, že nikoho nehledají..."

Rudneš. Byl to průšvih.

Ztrácíš **-200 mincí** a důvěru šéfa.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_bad_timing: {
		id: "terminal_bad_timing",
		type: "terminal",
		narrative: `😬 **Špatné načasování**

"Zrovna teď? Máme krizi na projektu, klient řve, a ty chceš mluvit o penězích?"

Šéf je viditelně naštvaný. Tohle ses neměl pokusit dnes.

Ztrácíš **-150 mincí** za pokazenou reputaci.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_greedy: {
		id: "terminal_greedy",
		type: "terminal",
		narrative: `🙄 **Chamtivost**

"20 %? To je přehnané. Nabídl jsem ti férových 10 % a ty chceš dvojnásobek?"

Šéf zavrtí hlavou. "Víš co? Nech mě to promyslet." Už se neozval.

Ztrácíš **-100 mincí** a původní nabídku.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},
};

export const salaryNegotiationBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 20,
	averageReward: 250,
	maxPossibleReward: 700, // Direct -> Push harder -> Promotion
	minPossibleReward: -200, // Research -> Bluff -> Caught
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(salaryNegotiationBranchingStory);
