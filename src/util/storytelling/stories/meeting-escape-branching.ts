/**
 * Meeting Escape - Branching Story
 *
 * Branching narrative about escaping a pointless meeting.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Escape strategy]
 *   -> Fake emergency -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: What emergency]
 *       -> Family call -> [OUTCOME] -> [TERMINAL: Freedom/Caught lying]
 *       -> Tech issues -> [OUTCOME] -> [TERMINAL: IT alibi/IT exposes]
 *     -> Failure -> [DECISION 2b: Stuck in meeting]
 *       -> Zone out -> [TERMINAL: Survived]
 *       -> Complain -> [TERMINAL: Meeting ended]
 *   -> Participate -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Become hero]
 *       -> Take over -> [OUTCOME] -> [TERMINAL: New leader/Hated]
 *       -> Suggest end -> [OUTCOME] -> [TERMINAL: Savior/Ignored]
 *     -> Failure -> [TERMINAL: Endless meeting]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "meeting_escape_branching";
const STORY_TITLE = "Útěk z meetingu";
const STORY_EMOJI = "🚪";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `⏰ Je 14:00. Jsi v meetingu už **2 hodiny**. Agenda? Žádná. Smysl? Nulový.

Šéfův šéf mluví o "synergii" a "alignmentu". Kolega vedle tebe už 20 minut kreslí dinosaury.

📊 PowerPoint má 47 slidů. Jste na slidu 12.

*Musíš se odsud dostat...*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Escape strategy
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Máš dvě možnosti: zkusit utéct, nebo se zapojit a doufat, že to urychlíš.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Předstírat nouzovou situaci",
				description: "Telefon, rodina, technické problémy... něco se najde.",
				baseReward: 300,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_fake_emergency",
			},
			choiceY: {
				id: "choiceY",
				label: "Aktivně se zapojit",
				description: "Možná když budeš mluvit, meeting skončí rychleji?",
				baseReward: 250,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_participate",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Fake emergency
	// =========================================================================
	outcome_fake_emergency: {
		id: "outcome_fake_emergency",
		type: "outcome",
		narrative: `📱 Diskrétně sahá po telefonu. Nastavuješ alarm, který za minutu zazvoní.

"Omlouvám se, musím si vzít tenhle hovor..."`,
		successChance: 70,
		successNodeId: "decision_2a_what_emergency",
		failNodeId: "decision_2b_stuck",
	},

	// =========================================================================
	// DECISION 2a: What emergency to fake
	// =========================================================================
	decision_2a_what_emergency: {
		id: "decision_2a_what_emergency",
		type: "decision",
		narrative: `🎭 **Funguje to!** Všichni se na tebe dívají, jak bereš telefon.

"Promiňte, musím..." Co řekneš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rodinná nouze",
				description: '"Promiňte, volá škola. Něco se stalo s dítětem."',
				baseReward: 400,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_family_call",
			},
			choiceY: {
				id: "choiceY",
				label: "Technický problém",
				description: '"IT volá, server padá. Musím to řešit."',
				baseReward: 350,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_tech_issue",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Stuck in meeting
	// =========================================================================
	decision_2b_stuck: {
		id: "decision_2b_stuck",
		type: "decision",
		narrative: `😬 **FAIL!** Šéfův šéf se na tebe podíval: "Můžeš si to vzít po meetingu?"

Telefon schovávás a zůstáváš. Meeting pokračuje.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zónovat",
				description: "Vypneš mozek a čekáš, až to skončí. Přežití mode.",
				baseReward: 50,
				riskMultiplier: 0.6,
				nextNodeId: "terminal_survived",
			},
			choiceY: {
				id: "choiceY",
				label: "Nahlas si stěžovat",
				description: '"Promiňte, ale jaký je vlastně cíl tohoto meetingu?"',
				baseReward: 200,
				riskMultiplier: 1.3,
				nextNodeId: "terminal_meeting_ended",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Participate
	// =========================================================================
	outcome_participate: {
		id: "outcome_participate",
		type: "outcome",
		narrative: `🙋 Zvedáš ruku. "Můžu něco říct?"

Všichni se otáčí. Šéfův šéf přikyvuje. "Samozřejmě!"`,
		successChance: 70,
		successNodeId: "decision_2c_hero",
		failNodeId: "terminal_endless_meeting",
	},

	// =========================================================================
	// DECISION 2c: Become the hero
	// =========================================================================
	decision_2c_hero: {
		id: "decision_2c_hero",
		type: "decision",
		narrative: `👀 **Máš pozornost!** Všichni čekají, co řekneš.

Tohle je tvá šance změnit průběh meetingu.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Převzít vedení",
				description: '"Pojďme to shrnout a definovat akční body."',
				baseReward: 450,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_take_over",
			},
			choiceY: {
				id: "choiceY",
				label: "Navrhnout konec",
				description: '"Máme dost informací. Můžeme pokračovat asynchronně?"',
				baseReward: 350,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_suggest_end",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Family call
	// =========================================================================
	outcome_family_call: {
		id: "outcome_family_call",
		type: "outcome",
		narrative: `👨‍👩‍👧 "Promiňte, škola volá kvůli dítěti. Musím jít."

Všichni přikyvují soucitně. Vstáváš a jdeš ke dveřím...`,
		successChance: 70,
		successNodeId: "terminal_freedom_family",
		failNodeId: "terminal_caught_lying",
	},

	// =========================================================================
	// OUTCOME: Tech issue
	// =========================================================================
	outcome_tech_issue: {
		id: "outcome_tech_issue",
		type: "outcome",
		narrative: `💻 "IT volá, produkční server padá. Musím to řešit okamžitě!"

Technické problémy jsou vždy dobrá výmluva...`,
		successChance: 70,
		successNodeId: "terminal_it_alibi",
		failNodeId: "terminal_it_exposes",
	},

	// =========================================================================
	// OUTCOME: Take over meeting
	// =========================================================================
	outcome_take_over: {
		id: "outcome_take_over",
		type: "outcome",
		narrative: `📋 "OK, pojďme to strukturovat. Bod jedna - co vlastně řešíme?"

Bereš fixu a jdeš k tabuli. Šéfův šéf vypadá překvapeně.`,
		successChance: 70,
		successNodeId: "terminal_new_leader",
		failNodeId: "terminal_hated",
	},

	// =========================================================================
	// OUTCOME: Suggest ending
	// =========================================================================
	outcome_suggest_end: {
		id: "outcome_suggest_end",
		type: "outcome",
		narrative: `🏁 "Myslím, že máme dost informací. Můžeme zbytek vyřešit emailem?"

Všichni vypadají nadějně. Šéfův šéf přemýšlí...`,
		successChance: 70,
		successNodeId: "terminal_savior",
		failNodeId: "terminal_ignored",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (7)
	terminal_freedom_family: {
		id: "terminal_freedom_family",
		type: "terminal",
		narrative: `🎉 **SVOBODA!**

Jsi venku! Nikdo nic nepodezírá. Jdeš si dát kávu a užíváš si ticho.

Meeting pokračoval ještě 2 hodiny. Ty jsi byl pryč.

Získáváš **+350 mincí** za úspěšný útěk.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_it_alibi: {
		id: "terminal_it_alibi",
		type: "terminal",
		narrative: `💻 **TECHNICKÉ ALIBI**

Martin z IT potvrdil, že "ano, byla výstraha". (Dlužíš mu oběd.)

Svoboda! A ještě jsi vypadal jako hrdina.

Získáváš **+300 mincí** a respekt IT oddělení.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_new_leader: {
		id: "terminal_new_leader",
		type: "terminal",
		narrative: `👔 **NOVÝ LÍDR**

Šéfův šéf je ohromený. "Konečně někdo, kdo umí vést meeting!"

Meeting skončil za 15 minut. Všichni ti děkují.

Získáváš **+450 mincí** a nabídku vést příští meeting. (Možná to nebyl nejlepší nápad.)`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_savior: {
		id: "terminal_savior",
		type: "terminal",
		narrative: `🦸 **ZACHRÁNCE**

"Máš pravdu, pojďme končit," říká šéfův šéf. Všichni se usmívají.

Jsi hrdina kanceláře. Kolegové ti posílají děkovné zprávy.

Získáváš **+400 mincí** a věčnou vděčnost.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_survived: {
		id: "terminal_survived",
		type: "terminal",
		narrative: `😵 **PŘEŽIL JSI**

Meeting skončil po 4 hodinách. Mozek je prázdný, ale žiješ.

Kolega ti posílá meme: "Survived another one."

Získáváš **+50 mincí** za vytrvalost.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.7,
	},

	terminal_meeting_ended: {
		id: "terminal_meeting_ended",
		type: "terminal",
		narrative: `🎤 **MEETING UKONČEN**

"Ehm... to je dobrá otázka," říká šéfův šéf. Dlouhé ticho.

"Asi bychom měli končit." SVOBODA!

Získáváš **+300 mincí** za odvahu.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	// Negative endings (4)
	terminal_caught_lying: {
		id: "terminal_caught_lying",
		type: "terminal",
		narrative: `🤥 **PŘISTIŽEN!**

"Počkat, nemáš děti," říká kolegyně vedle tebe nahlas.

Všichni se otáčí. Rudneš.

Ztrácíš **-200 mincí** a důvěryhodnost.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_it_exposes: {
		id: "terminal_it_exposes",
		type: "terminal",
		narrative: `💀 **IT TĚ PROZRADILO**

"Vlastně žádný alert nebyl," píše Martin na Slack. Veřejně.

Šéfův šéf se dívá. "Takže... žádný server nepadá?"

Ztrácíš **-250 mincí** a kredit u IT.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_hated: {
		id: "terminal_hated",
		type: "terminal",
		narrative: `😠 **NENÁVIDĚN**

"Promiň, ale kdo tě zval vést MŮJ meeting?" Šéfův šéf je naštvaný.

Kolegové se na tebe dívají s lítostí.

Ztrácíš **-300 mincí** a možnost povýšení.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_ignored: {
		id: "terminal_ignored",
		type: "terminal",
		narrative: `🙉 **IGNOROVÁN**

"Děkuji za vstup, ale máme ještě 35 slidů."

Meeting pokračuje. Tvůj pokus selhal. Další 2 hodiny v pekle.

Ztrácíš **-100 mincí** na antidepresiva.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_endless_meeting: {
		id: "terminal_endless_meeting",
		type: "terminal",
		narrative: `♾️ **NEKONEČNÝ MEETING**

Tvůj vstup spustil diskuzi, která trvala další hodinu.

"Skvělý bod! Pojďme to rozebrat detailněji..."

Ztrácíš **-150 mincí** na kafe, abys přežil.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},
};

export const meetingEscapeBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 20,
	averageReward: 150,
	maxPossibleReward: 450, // Participate -> Take over -> New leader
	minPossibleReward: -300, // Participate -> Take over -> Hated
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(meetingEscapeBranchingStory);
