/**
 * Parking Spot War - Branching Story
 *
 * Branching narrative about office parking drama.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Response approach]
 *   -> Confront -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Resolution]
 *       -> Aggressive -> [OUTCOME] -> [TERMINAL: Victory/Fight]
 *       -> Diplomatic -> [OUTCOME] -> [TERMINAL: Share/Compromise]
 *     -> Failure -> [DECISION 2b: Escalate]
 *       -> Report to HR -> [TERMINAL: Official spot]
 *       -> Passive aggressive -> [OUTCOME] -> [TERMINAL: Note war/Car keyed]
 *   -> Find other spot -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Make peace]
 *       -> Befriend enemy -> [OUTCOME] -> [TERMINAL: New friend/Rejected]
 *       -> Ignore forever -> [TERMINAL: New routine]
 *     -> Failure -> [TERMINAL: Long walk]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "parking_war_branching";
const STORY_TITLE = "Válka o parkování";
const STORY_EMOJI = "🚗";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `🅿️ Přijíždíš do práce jako každý den. TVOJE parkovací místo - to u vchodu, kde parkuješ 3 roky - je obsazené.

Stojí tam černé BMW. Nikdy jsi ho neviděl.

😤 To místo není oficiálně tvoje, ale... JE TVOJE.

*Co uděláš?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Response approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Sedíš v autě a zvažuješ své možnosti. BMW tam stojí jako výsměch.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Konfrontovat majitele",
				description: "Najdeš majitele BMW a vysvětlíš mu situaci. Slušně nebo neslušně.",
				baseReward: 350,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_confront",
			},
			choiceY: {
				id: "choiceY",
				label: "Najít jiné místo",
				description: "Prostě zaparkuješ jinde. Není to za tu energii.",
				baseReward: 150,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_find_other",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Confront
	// =========================================================================
	outcome_confront: {
		id: "outcome_confront",
		type: "outcome",
		narrative: `🔍 Jdeš do kanceláře a ptáš se: "Čí je to černé BMW venku?"

Kolega ukazuje na nového člověka u okna. Je to nový marketingový ředitel.

Jdeš za ním...`,
		successChance: 70,
		successNodeId: "decision_2a_resolution",
		failNodeId: "decision_2b_escalate",
	},

	// =========================================================================
	// DECISION 2a: Resolution approach
	// =========================================================================
	decision_2a_resolution: {
		id: "decision_2a_resolution",
		type: "decision",
		narrative: `👔 Nový ředitel se na tebe dívá. "Ano? Potřebuješ něco?"

Jak to vezmeš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Agresivně",
				description: '"Hele, to místo je moje. Parkuju tam 3 roky. Přesuň se."',
				baseReward: 400,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_aggressive",
			},
			choiceY: {
				id: "choiceY",
				label: "Diplomaticky",
				description: '"Ahoj, jsem [jméno]. To místo, kde parkuješ... obvykle tam stojím já. Můžeme to nějak vyřešit?"',
				baseReward: 300,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_diplomatic",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Escalation
	// =========================================================================
	decision_2b_escalate: {
		id: "decision_2b_escalate",
		type: "decision",
		narrative: `😤 **Neúspěch!** Ředitel tě odbyl: "Parkoviště je pro všechny. First come, first served."

To tě naštvalo ještě víc.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Nahlásit HR",
				description: "Půjdeš oficiální cestou. HR musí mít pravidla pro parkování.",
				baseReward: 250,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_report_hr",
			},
			choiceY: {
				id: "choiceY",
				label: "Pasivní agrese",
				description: "Necháš mu na autě lístek. A možná ještě něco...",
				baseReward: 200,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_passive_aggressive",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Find other spot
	// =========================================================================
	outcome_find_other: {
		id: "outcome_find_other",
		type: "outcome",
		narrative: `🅿️ Objíždíš parkoviště a hledáš jiné místo.

Je tam jedno vzadu u popelnic. Není ideální, ale...`,
		successChance: 70,
		successNodeId: "decision_2c_peace",
		failNodeId: "decision_2d_no_spot",
	},

	// =========================================================================
	// DECISION 2c: Making peace
	// =========================================================================
	decision_2c_peace: {
		id: "decision_2c_peace",
		type: "decision",
		narrative: `🤔 Zaparkoval jsi. Na chodbě potkáváš majitele BMW.

"Ahoj, ty jsi ten nový, ne?"`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zkusit přátelství",
				description: "Možná to není tak špatný člověk. Dáme si kafe?",
				baseReward: 350,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_befriend",
			},
			choiceY: {
				id: "choiceY",
				label: "Ignorovat navždy",
				description: "Projdeš kolem bez pozdravu. Nemáš zájem o přátelství s BMW člověkem.",
				baseReward: 100,
				riskMultiplier: 0.6,
				nextNodeId: "outcome_ignore",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Aggressive approach
	// =========================================================================
	outcome_aggressive: {
		id: "outcome_aggressive",
		type: "outcome",
		narrative: `💢 "Hele, to místo je moje. Parkuju tam 3 roky!"

Ředitel zvedá obočí. "Promiň, ale kdo jsi?"`,
		successChance: 70,
		successNodeId: "terminal_victory",
		failNodeId: "terminal_fight",
	},

	// =========================================================================
	// OUTCOME: Diplomatic approach
	// =========================================================================
	outcome_diplomatic: {
		id: "outcome_diplomatic",
		type: "outcome",
		narrative: `🤝 "Ahoj, jsem z IT. To místo u vchodu - obvykle tam parkuju. Možná bychom se mohli střídat?"

Ředitel přemýšlí...`,
		successChance: 70,
		successNodeId: "terminal_share",
		failNodeId: "terminal_compromise",
	},

	// =========================================================================
	// OUTCOME: Passive aggressive note
	// =========================================================================
	outcome_passive_aggressive: {
		id: "outcome_passive_aggressive",
		type: "outcome",
		narrative: `📝 Píšeš lístek: "Tohle místo je neoficiálně rezervované. Prosím, respektuj to."

Dáváš ho za stěrač BMW. Možná přidáš i... emoji?`,
		successChance: 70,
		successNodeId: "terminal_note_war",
		failNodeId: "terminal_car_keyed",
	},

	// =========================================================================
	// OUTCOME: Befriend enemy
	// =========================================================================
	outcome_befriend: {
		id: "outcome_befriend",
		type: "outcome",
		narrative: `☕ "Hele, dáme si kafe? Jsem tu nový a nikoho neznám..."

Ředitel se usmívá. Jdete společně do kuchyňky.`,
		successChance: 70,
		successNodeId: "terminal_new_friend",
		failNodeId: "terminal_rejected",
	},

	// =========================================================================
	// OUTCOME: Reporting to HR
	// =========================================================================
	outcome_report_hr: {
		id: "outcome_report_hr",
		type: "outcome",
		narrative: `📋 Jdeš za HR manažerkou. "Potřebujeme systém parkování, tohle je chaos..."

HR otevírá složku s předpisy...`,
		successChance: 70,
		successNodeId: "terminal_official_spot",
		failNodeId: "terminal_hr_bureaucracy",
	},

	// =========================================================================
	// OUTCOME: Ignoring forever
	// =========================================================================
	outcome_ignore: {
		id: "outcome_ignore",
		type: "outcome",
		narrative: `🚶 Projdeš kolem bez pozdravu. BMW člověk se na tebe podívá, ale nic neříká...

Dny plynou a ty si zvykáš na nové místo...`,
		successChance: 70,
		successNodeId: "terminal_new_routine",
		failNodeId: "terminal_parking_grudge",
	},

	// =========================================================================
	// DECISION 2d: No parking spot found
	// =========================================================================
	decision_2d_no_spot: {
		id: "decision_2d_no_spot",
		type: "decision",
		narrative: `😤 **Žádné volné místo!** Celé parkoviště je plné. Musíš parkovat na ulici daleko od kanceláře.

Prší a ty nemáš deštník. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zaparkovat na ulici",
				description: "Vzdálené místo, ale aspoň je zdarma. Budeš promočený.",
				baseReward: 50,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_street_parking",
			},
			choiceY: {
				id: "choiceY",
				label: "Jet do placené garáže",
				description: "Blízko kanceláře, ale stojí to peníze.",
				baseReward: 100,
				riskMultiplier: 0.6,
				nextNodeId: "outcome_paid_garage",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Street parking
	// =========================================================================
	outcome_street_parking: {
		id: "outcome_street_parking",
		type: "outcome",
		narrative: `🌧️ Parkuješ na ulici a běžíš deštěm do kanceláře. Doufáš, že auto bude v pořádku...`,
		successChance: 70,
		successNodeId: "terminal_survived_rain",
		failNodeId: "terminal_long_walk",
	},

	// =========================================================================
	// OUTCOME: Paid garage
	// =========================================================================
	outcome_paid_garage: {
		id: "outcome_paid_garage",
		type: "outcome",
		narrative: `🏢 Vjíždíš do placené garáže. Sucho a blízko, ale cena kousne...`,
		successChance: 70,
		successNodeId: "terminal_garage_comfort",
		failNodeId: "terminal_garage_expensive",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (7)
	terminal_victory: {
		id: "terminal_victory",
		type: "terminal",
		narrative: `🏆 **VÍTĚZSTVÍ!**

Ředitel ustoupil. "OK, OK, nechtěl jsem problém. Najdu si jiné místo."

Tvoje místo je zpět! Justice!

Získáváš **+400 mincí** a parkovací místo.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_share: {
		id: "terminal_share",
		type: "terminal",
		narrative: `🤝 **SDÍLENÍ**

"Co kdybychom se střídali? Sudé dny ty, liché já?"

Perfektní řešení! Oba jste spokojení.

Získáváš **+350 mincí** a nového kolegu.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_official_spot: {
		id: "terminal_official_spot",
		type: "terminal",
		narrative: `📋 **OFICIÁLNÍ MÍSTO**

HR zavedlo systém rezervací. Dostal jsi oficiálně přidělené místo - TO TVOJE.

Byrokracie funguje!

Získáváš **+300 mincí** a jistotu.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_new_friend: {
		id: "terminal_new_friend",
		type: "terminal",
		narrative: `🤝 **NOVÝ PŘÍTEL**

Ředitel je vlastně super člověk. Bavíte se o autech, motorech...

"Hele, vezmi si to místo. Já mám garáž v suterénu."

Získáváš **+400 mincí** a kámoše s BMW.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_new_routine: {
		id: "terminal_new_routine",
		type: "terminal",
		narrative: `🔄 **NOVÁ RUTINA**

Zvykl sis na nové místo vzadu. Vlastně je tam víc klidu.

A ten ranní pochod ti dělá dobře na kondici.

Získáváš **+150 mincí** a zdravější životní styl.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_compromise: {
		id: "terminal_compromise",
		type: "terminal",
		narrative: `🤷 **KOMPROMIS**

"Nemůžu ti to slíbit, ale zkusím parkovat jinde, když to půjde."

Není to jistota, ale je to něco.

Získáváš **+200 mincí** za diplomatický pokus.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_note_war: {
		id: "terminal_note_war",
		type: "terminal",
		narrative: `📝 **VÁLKA LÍSTKŮ**

On odpověděl lístkem. Ty jsi odpověděl dalším. Celá firma to sleduje.

Nakonec jste se oba rozesmáli a dali si pivo.

Získáváš **+250 mincí** a virální příběh.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_hr_bureaucracy: {
		id: "terminal_hr_bureaucracy",
		type: "terminal",
		narrative: `📎 **Byrokracie**

HR říká: "Budeme to řešit na příštím kvartálním meetingu." To je za 3 měsíce.

Mezitím nic. Ztrácíš **-50 mincí** za ztracený čas.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_parking_grudge: {
		id: "terminal_parking_grudge",
		type: "terminal",
		narrative: `😒 **Tichá zášť**

Ignorování vyústilo v nepříjemnou atmosféru. BMW člověk si na tebe stěžoval u šéfa.

"Mohl bys být míň odměřený k novým kolegům." Ztrácíš **-100 mincí**.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_survived_rain: {
		id: "terminal_survived_rain",
		type: "terminal",
		narrative: `🌤️ **Přežil jsi déšť**

Sice jsi promokl, ale auto je v pořádku a den se zlepšil.

Kolega ti půjčil svetr. Získáváš **+50 mincí** za vytrvalost.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_garage_comfort: {
		id: "terminal_garage_comfort",
		type: "terminal",
		narrative: `🅿️ **Pohodlná garáž**

Garáž je skvělá! Sucho, bezpečno, blízko. Stálo to pár korun, ale stálo to za to.

Získáváš **+100 mincí** za klid.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_garage_expensive: {
		id: "terminal_garage_expensive",
		type: "terminal",
		narrative: `💸 **Drahá garáž**

Zapomněl jsi, že garáž účtuje po hodinách. Celý den tam stálo auto.

Účet je šokující. Ztrácíš **-200 mincí** za parkování.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	// Negative endings (4)
	terminal_fight: {
		id: "terminal_fight",
		type: "terminal",
		narrative: `👊 **KONFLIKT**

"Kdo jsi ty, abys mi říkal, kde mám parkovat?!"

Hádka eskalovala. HR vás oba volá na kobereček.

Ztrácíš **-250 mincí** a reputaci.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_car_keyed: {
		id: "terminal_car_keyed",
		type: "terminal",
		narrative: `🔑 **POŠKRÁBANÉ AUTO**

Někdo (nevíš kdo) ti poškrábal auto. Náhoda? Asi ne.

Karma je zdarma, oprava není.

Ztrácíš **-400 mincí** na opravu laku.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_rejected: {
		id: "terminal_rejected",
		type: "terminal",
		narrative: `🙅 **ODMÍTNUT**

"Sorry, nemám čas. Hodně práce."

Ředitel tě ignoruje. Snaha o přátelství selhala.

Ztrácíš **-100 mincí** na energetické nápoje proti depresi.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_long_walk: {
		id: "terminal_long_walk",
		type: "terminal",
		narrative: `🚶 **DLOUHÁ CESTA**

Jediné volné místo je úplně na kraji parkoviště. 10 minut chůze.

Prší. Zapomněl jsi deštník.

Ztrácíš **-150 mincí** na nové boty (ty staré jsou zničené).`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},
};

export const parkingWarBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 20,
	averageReward: 180,
	maxPossibleReward: 400, // Confront -> Aggressive -> Victory OR Find other -> Befriend -> New friend
	minPossibleReward: -400, // Confront -> Escalate -> Passive aggressive -> Car keyed
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(parkingWarBranchingStory);
