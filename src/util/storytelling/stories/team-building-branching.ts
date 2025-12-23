/**
 * Team Building Event - Branching Story
 *
 * Branching narrative about mandatory fun at work.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Leadership approach]
 *   -> Take lead -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Victory approach]
 *       -> Share credit -> [OUTCOME] -> [TERMINAL: Team hero/Forgotten]
 *       -> Take glory -> [OUTCOME] -> [TERMINAL: Promoted/Resented]
 *     -> Failure -> [DECISION 2b: Damage control]
 *       -> Blame others -> [TERMINAL: Scapegoat]
 *       -> Own mistake -> [TERMINAL: Respected]
 *   -> Stay passive -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Unexpected shine]
 *       -> Embrace moment -> [OUTCOME] -> [TERMINAL: Hidden talent/Awkward]
 *       -> Deflect attention -> [TERMINAL: Humble hero]
 *     -> Failure -> [TERMINAL: Invisible]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "team_building_branching";
const STORY_TITLE = "Teambuilding";
const STORY_EMOJI = "🎯";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `HR poslalo email: **"Povinný teambuilding! Úniková hra + bowling!"**

Stojíš před únikovou místností s 5 kolegy, které sotva znáš. Karel z accountingu vypadá vyděšeně, Petra z HR se tváří nadšeně.

🎮 *Hra začíná za 5 minut. Jak se zapojíš?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Leadership approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Tým stojí v místnosti plné hádanek. Nikdo neví, co dělat. Čas běží.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Vzít vedení",
				description: "Ujmeš se organizace. Rozděluješ úkoly, koordinuješ tým.",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_lead",
			},
			choiceY: {
				id: "choiceY",
				label: "Zůstat v pozadí",
				description: "Necháš ostatní vést. Pomůžeš, až bude potřeba.",
				baseReward: 200,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_passive",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Taking lead
	// =========================================================================
	outcome_lead: {
		id: "outcome_lead",
		type: "outcome",
		narrative: `📣 "OK, tým! Karel, ty hledej čísla. Petra, ty řeš ten zámek. Já vezmu tu šifru!"

Všichni poslouchají. Místnost začíná dávat smysl.`,
		successChance: 70,
		successNodeId: "decision_2a_victory",
		failNodeId: "decision_2b_damage",
	},

	// =========================================================================
	// DECISION 2a: Victory approach
	// =========================================================================
	decision_2a_victory: {
		id: "decision_2a_victory",
		type: "decision",
		narrative: `🎉 **ÚSPĚCH!** Váš tým vyhrál s nejlepším časem dne!

Organizátor se ptá: "Kdo byl mozek týmu?"`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Sdílet zásluhy",
				description: '"Byl to týmový effort! Každý přispěl." Skromnost může být odměněna.',
				baseReward: 450,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_share_credit",
			},
			choiceY: {
				id: "choiceY",
				label: "Vzít slávu",
				description: '"Já jsem to koordinoval." Pravdivé, ale trochu necitlivé.',
				baseReward: 350,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_take_glory",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Damage control
	// =========================================================================
	decision_2b_damage: {
		id: "decision_2b_damage",
		type: "decision",
		narrative: `😬 **SELHÁNÍ!** Tvoje vedení nefungovalo. Karel se ztratil v šifře, Petra se urazila na tvůj tón.

Čas vypršel. Tým se na tebe dívá.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Hodit vinu na ostatní",
				description: '"Kdybys poslouchal, Karel..." Klasická obrana.',
				baseReward: 100,
				riskMultiplier: 1.3,
				nextNodeId: "terminal_scapegoat",
			},
			choiceY: {
				id: "choiceY",
				label: "Přiznat chybu",
				description: '"Měl jsem to vést jinak. Sorry, tým." Těžké, ale čestné.',
				baseReward: 200,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_respected_failure",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Staying passive
	// =========================================================================
	outcome_passive: {
		id: "outcome_passive",
		type: "outcome",
		narrative: `🤫 Držíš se v pozadí a pozoruješ. Petra se ujala vedení, ale trvá jí dlouho.

Najednou uvidíš vzor, který ostatní přehlédli...`,
		successChance: 70,
		successNodeId: "decision_2c_shine",
		failNodeId: "terminal_invisible",
	},

	// =========================================================================
	// DECISION 2c: Unexpected shine
	// =========================================================================
	decision_2c_shine: {
		id: "decision_2c_shine",
		type: "decision",
		narrative: `💡 **EUREKA!** Všiml sis klíčového detailu, který vyřeší celou místnost!

"Počkejte... ta čísla na stropě... to je přece..."`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Převzít spotlight",
				description: "Vysvětlíš své řešení a dovedeš tým k vítězství.",
				baseReward: 400,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_embrace_moment",
			},
			choiceY: {
				id: "choiceY",
				label: "Tiše poradit",
				description: "Pošeptáš Petře svůj nápad, ať si vezme zásluhy.",
				baseReward: 250,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_humble_hero",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Share credit
	// =========================================================================
	outcome_share_credit: {
		id: "outcome_share_credit",
		type: "outcome",
		narrative: `🤗 "Byl to týmový effort! Karel rozlouskl tu šifru, Petra našla klíč..."

Tým se usmívá. Tohle se cení.`,
		successChance: 70,
		successNodeId: "terminal_team_hero",
		failNodeId: "terminal_forgotten",
	},

	// =========================================================================
	// OUTCOME: Take glory
	// =========================================================================
	outcome_take_glory: {
		id: "outcome_take_glory",
		type: "outcome",
		narrative: `👑 "No, já jsem to většinou koordinoval a přišel na tu hlavní hádanku..."

Organizátor kývá. Kolegové se tváří... různě.`,
		successChance: 70,
		successNodeId: "terminal_promoted",
		failNodeId: "terminal_resented",
	},

	// =========================================================================
	// OUTCOME: Embrace moment
	// =========================================================================
	outcome_embrace_moment: {
		id: "outcome_embrace_moment",
		type: "outcome",
		narrative: `🌟 Vysvětluješ své řešení celému týmu. Všichni koukají s obdivem.

"Jak jsi na to přišel?!" ptá se Petra.`,
		successChance: 70,
		successNodeId: "terminal_hidden_talent",
		failNodeId: "terminal_awkward_spotlight",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (7)
	terminal_team_hero: {
		id: "terminal_team_hero",
		type: "terminal",
		narrative: `🏆 **TÝMOVÝ HRDINA**

HR manažerka si tě vzala stranou: "Líbí se mi, jak jsi vedl tým. Uvažovali bychom o tobě na pozici team leada."

Získáváš **+500 mincí** a nové kariérní možnosti.`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_promoted: {
		id: "terminal_promoted",
		type: "terminal",
		narrative: `📈 **POVÝŠENÍ**

Šéf viděl tvoje leadership skills. "Potřebujeme někoho, kdo umí vést. Zajímá tě ta nová role?"

Získáváš **+450 mincí** a nabídku povýšení.`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_hidden_talent: {
		id: "terminal_hidden_talent",
		type: "terminal",
		narrative: `🧠 **SKRYTÝ TALENT**

"Ty jsi na escape roomy genius!" říká Karel. Od teď tě zve na každou hru.

Získáváš **+400 mincí** a novou partu přátel.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_humble_hero: {
		id: "terminal_humble_hero",
		type: "terminal",
		narrative: `🙏 **SKROMNÝ HRDINA**

Petra vyhrála, ale ví, že jsi jí pomohl. "Děkuju," šeptá. "Jsi fakt hodný člověk."

Získáváš **+300 mincí** a věrnou kolegyni.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_respected_failure: {
		id: "terminal_respected_failure",
		type: "terminal",
		narrative: `💪 **RESPEKT ZA SELHÁNÍ**

Karel ti podává ruku. "Oceňuju, že jsi to přiznal. Většina lidí by házela vinu."

Získáváš **+200 mincí** a respekt týmu.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_forgotten: {
		id: "terminal_forgotten",
		type: "terminal",
		narrative: `🤷 **ZAPOMENUTÝ**

Tvá skromnost zafungovala moc dobře - nikdo si tě nepamatuje. HR si myslí, že vedl Karel.

Získáváš **+100 mincí**. Aspoň je klid.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	// Negative endings (4)
	terminal_resented: {
		id: "terminal_resented",
		type: "terminal",
		narrative: `😠 **NEVRAŽIVOST**

Karel ti později říká: "Vlastně to vyřešila Petra. Ty jsi jen mával rukama."

Ztrácíš **-150 mincí** na smířlivou pizzu pro tým.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_scapegoat: {
		id: "terminal_scapegoat",
		type: "terminal",
		narrative: `🐐 **OBĚTNÍ BERÁNEK**

Karel se urazil a Petra si myslí, že jsi toxic. HR manažerka se tváří kysele.

Ztrácíš **-200 mincí** a reputaci.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_invisible: {
		id: "terminal_invisible",
		type: "terminal",
		narrative: `👻 **NEVIDITELNÝ**

Zůstal jsi tak moc v pozadí, že si tě nikdo nevšiml. Dokonce ani na společné fotce nejsi.

Ztrácíš **-50 mincí** za promarněnou příležitost.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_awkward_spotlight: {
		id: "terminal_awkward_spotlight",
		type: "terminal",
		narrative: `😅 **TRAPNÉ CENTRUM POZORNOSTI**

Začal jsi vysvětlovat, ale zadrhl ses a zapomněl pointu. Všichni čekají.

"Ehm... vlastně jsem to možná špatně viděl..."

Ztrácíš **-100 mincí** na lihoviny na zapomenutí.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},
};

export const teamBuildingBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 18,
	averageReward: 200,
	maxPossibleReward: 500, // Lead -> Share credit -> Team hero
	minPossibleReward: -200, // Lead -> Failure -> Scapegoat
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(teamBuildingBranchingStory);
