/**
 * Elevator Stuck - Branching Story
 *
 * Branching narrative about being stuck in an elevator.
 * Features 3 decision layers and 11 unique endings (8 positive, 3 negative = 73% positive).
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Who to approach?]
 *   -> CEO Path -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: How to pitch]
 *       -> Professional -> [OUTCOME 70/30] -> [TERMINAL: Big investment (+650) / CEO contact (+180)]
 *       -> Desperate    -> [OUTCOME 70/30] -> [TERMINAL: Small investment (+400) / Good impression (+200)]
 *     -> Failure -> [TERMINAL: Awkward silence (-200)]
 *   -> Colleague Path -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2b: What to talk about]
 *       -> Work topics -> [OUTCOME 70/30] -> [TERMINAL: Collaboration (+300) / Networking (+120)]
 *       -> Personal    -> [OUTCOME 70/30]
 *         -> Success -> [TERMINAL: Date (+350)]
 *         -> Failure -> [DECISION 2c: Recovery]
 *           -> Apologize    -> [OUTCOME 70/30] -> [TERMINAL: Friendly chat (+150) / HR complaint (-200)]
 *           -> Change topic -> [OUTCOME 70/30] -> [TERMINAL: Friendly chat (+150) / HR complaint (-200)]
 *     -> Failure -> [TERMINAL: Phone distraction (-250)]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "elevator_stuck_branching";
const STORY_TITLE = "Zaseknutý výtah";
const STORY_EMOJI = "🛗";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Nastupuješ do výtahu a mačkáš tlačítko svého patra. Výtah se rozjíždí...

⚡ **TRZZ!** Náhlé škubnutí! Světla blikají a výtah se zastaví. Zasekl se mezi patry!

🔔 Zmáčkneš nouzové tlačítko. Z reproduktoru se ozve hlas: *"Havárie, oprava bude trvat zhruba hodinu."*

Otočíš se a teprve teď si všimneš, kdo je s tebou v kabině...`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Who's in the elevator?
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `V koutě výtahu vidíš dvě postavy. Musíš si rychle vybrat, ke komu se přidáš na další hodinu...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "CEO ve výtahu vpravo",
				description: "👔 Poznáváš šéfa celé firmy! Riskantní, ale tohle je příležitost!",
				baseReward: 500,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_ceo",
			},
			choiceY: {
				id: "choiceY",
				label: "Kolega/kolegyně vlevo",
				description: "👀 Je to ta osoba z marketingu, co se ti líbí...",
				baseReward: 300,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_colleague",
			},
		},
	},

	// =========================================================================
	// OUTCOME: CEO path
	// =========================================================================
	outcome_ceo: {
		id: "outcome_ceo",
		type: "outcome",
		narrative: `👔 Otočíš se k CEO. "Dobrý den, pane řediteli..."

CEO zvedne hlavu z telefonu a podívá se na tebe...`,
		successChance: 70,
		successNodeId: "decision_2a_pitch",
		failNodeId: "decision_2c_awkward",
	},

	// =========================================================================
	// DECISION 2a: How to pitch to CEO
	// =========================================================================
	decision_2a_pitch: {
		id: "decision_2a_pitch",
		type: "decision",
		narrative: `😊 **CEO se usmívá!** "Tak co, na čem pracuješ? Máme tu hodinu..."

Tohle je tvoje šance představit svůj side project! Jak na to půjdeš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Profesionálně",
				description: "💼 Strukturovaný pitch s čísly, analýzou trhu a ROI.",
				baseReward: 600,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_professional_pitch",
			},
			choiceY: {
				id: "choiceY",
				label: "Zoufale/nadšeně",
				description: "🔥 Emocionální, vášnivý příběh proč tento projekt musí být!",
				baseReward: 400,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_desperate_pitch",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Professional pitch
	// =========================================================================
	outcome_professional_pitch: {
		id: "outcome_professional_pitch",
		type: "outcome",
		narrative: `💼 Začínáš strukturovanou prezentaci. CEO naslouchá a klade otázky...`,
		successChance: 70,
		successNodeId: "terminal_big_investment",
		failNodeId: "terminal_ceo_contact",
	},

	// =========================================================================
	// OUTCOME: Desperate pitch
	// =========================================================================
	outcome_desperate_pitch: {
		id: "outcome_desperate_pitch",
		type: "outcome",
		narrative: `🔥 Mluvíš rychle, vášnivě, občas gestikuluješ. CEO tě pozorně sleduje...`,
		successChance: 70,
		successNodeId: "terminal_small_investment",
		failNodeId: "terminal_good_impression",
	},

	// =========================================================================
	// OUTCOME: Colleague path
	// =========================================================================
	outcome_colleague: {
		id: "outcome_colleague",
		type: "outcome",
		narrative: `👀 Přejdeš ke kolegovi/kolegyni. "Tak to je situace, co?" usmíváš se nervózně...

Podívá se na tebe a usmívá se...`,
		successChance: 70,
		successNodeId: "decision_2b_topics",
		failNodeId: "decision_2d_ignored",
	},

	// =========================================================================
	// DECISION 2b: What to talk about
	// =========================================================================
	decision_2b_topics: {
		id: "decision_2b_topics",
		type: "decision",
		narrative: `😊 "No jo, ale aspoň máme čas na kafe... nebo spíš na chat," směje se.

Konverzace začíná. O čem budete mluvit?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "O práci",
				description: "💻 Bezpečná volba - projekty, nápady na spolupráci, firemní témata.",
				baseReward: 300,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_work_topics",
			},
			choiceY: {
				id: "choiceY",
				label: "Osobní témata",
				description: "💕 Riskantní - záliby, plány, osobní život. Může vyústit v rande!",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_personal_topics",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Work topics
	// =========================================================================
	outcome_work_topics: {
		id: "outcome_work_topics",
		type: "outcome",
		narrative: `💻 Začnete mluvit o projektech. Zjišťujete, že vaše týmy by mohly spolupracovat...`,
		successChance: 70,
		successNodeId: "terminal_collaboration",
		failNodeId: "terminal_networking",
	},

	// =========================================================================
	// OUTCOME: Personal topics
	// =========================================================================
	outcome_personal_topics: {
		id: "outcome_personal_topics",
		type: "outcome",
		narrative: `💕 "Vlastně... nikdy jsme se pořádně nebavili mimo práci," říkáš.

Konverzace se stává osobnější...`,
		successChance: 70,
		successNodeId: "terminal_date",
		failNodeId: "decision_personal_recovery",
	},

	// =========================================================================
	// DECISION 2c: Personal topics recovery
	// =========================================================================
	decision_personal_recovery: {
		id: "decision_personal_recovery",
		type: "decision",
		narrative: `😬 "Ehm... já mám partnera," říká kolega/kolegyně nervózně.

Trapná situace. Jak ji zachráníš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Omluvit se elegantně",
				description: "😅 'Omlouvám se, špatně jsem to podal/a. Měl/a jsem na mysli jako přátelé!'",
				baseReward: 150,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_apologize",
			},
			choiceY: {
				id: "choiceY",
				label: "Změnit téma",
				description: "🔄 Rychle přehodit na bezpečné téma a doufat, že to zapomene.",
				baseReward: 100,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_change_topic",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Apologize path
	// =========================================================================
	outcome_apologize: {
		id: "outcome_apologize",
		type: "outcome",
		narrative: `😅 "Omlouvám se, špatně jsem to podal/a..."

Kolega/kolegyně tě pozoruje...`,
		successChance: 70,
		successNodeId: "terminal_friendly_chat",
		failNodeId: "terminal_hr_complaint",
	},

	// =========================================================================
	// OUTCOME: Change topic path
	// =========================================================================
	outcome_change_topic: {
		id: "outcome_change_topic",
		type: "outcome",
		narrative: `🔄 "Vlastně... slyšel/a jsi o tom novém projektu?" měníš rychle téma.

Kolega/kolegyně reaguje...`,
		successChance: 70,
		successNodeId: "terminal_friendly_chat",
		failNodeId: "terminal_hr_complaint",
	},

	// =========================================================================
	// DECISION 2c: Awkward CEO situation
	// =========================================================================
	decision_2c_awkward: {
		id: "decision_2c_awkward",
		type: "decision",
		narrative: `😬 CEO se otočí zpátky k telefonu. Tvůj pokus o konverzaci neuspěl.

Je trapné ticho. Máte tu ještě hodinu. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zkusit to znovu",
				description: "Počkáš chvíli a zkusíš jiné téma. Třeba sport.",
				baseReward: 150,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_retry_ceo",
			},
			choiceY: {
				id: "choiceY",
				label: "Přijmout ticho",
				description: "Vytáhneš telefon a budeš si scrollovat. Aspoň klid.",
				baseReward: 50,
				riskMultiplier: 0.6,
				nextNodeId: "outcome_accept_silence",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Retrying with CEO
	// =========================================================================
	outcome_retry_ceo: {
		id: "outcome_retry_ceo",
		type: "outcome",
		narrative: `⚽ "Ehm... díváte se na fotbal? Včerejší zápas byl šílený..."

CEO zvedne hlavu...`,
		successChance: 70,
		successNodeId: "terminal_small_talk_win",
		failNodeId: "terminal_awkward_silence",
	},

	// =========================================================================
	// OUTCOME: Accepting silence
	// =========================================================================
	outcome_accept_silence: {
		id: "outcome_accept_silence",
		type: "outcome",
		narrative: `📱 Vytahuješ telefon a začínáš scrollovat. CEO dělá to samé. Hodina v tichu...`,
		successChance: 70,
		successNodeId: "terminal_quiet_peace",
		failNodeId: "terminal_awkward_silence",
	},

	// =========================================================================
	// DECISION 2d: Colleague ignoring you
	// =========================================================================
	decision_2d_ignored: {
		id: "decision_2d_ignored",
		type: "decision",
		narrative: `📱 Kolega/kolegyně se podíval/a na tebe, usmál/a se, ale hned se vrátil/a k telefonu.

Vypadá to, že nemá zájem o konverzaci. Máte tu ještě hodinu...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Být vytrvalý",
				description: "Zkusíš zaujmout zajímavým tématem.",
				baseReward: 200,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_persist_colleague",
			},
			choiceY: {
				id: "choiceY",
				label: "Nechat to být",
				description: "Respektuješ osobní prostor a čekáš v tichu.",
				baseReward: 50,
				riskMultiplier: 0.5,
				nextNodeId: "outcome_respect_space",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Persisting with colleague
	// =========================================================================
	outcome_persist_colleague: {
		id: "outcome_persist_colleague",
		type: "outcome",
		narrative: `💬 "Hele, viděl/a jsi ten nový projekt od marketingu? Prý je to bomba..."

Kolega/kolegyně zvedne oči od telefonu...`,
		successChance: 70,
		successNodeId: "terminal_persistence_pays",
		failNodeId: "terminal_phone_distraction",
	},

	// =========================================================================
	// OUTCOME: Respecting space
	// =========================================================================
	outcome_respect_space: {
		id: "outcome_respect_space",
		type: "outcome",
		narrative: `🤫 Sedíš tiše a čekáš. Po půl hodině kolega/kolegyně odloží telefon...`,
		successChance: 70,
		successNodeId: "terminal_natural_conversation",
		failNodeId: "terminal_phone_distraction",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_big_investment: {
		id: "terminal_big_investment",
		type: "terminal",
		narrative: `🚀 **JACKPOT!**

CEO je nadšený! "Skvělá analýza. Pošlu ti budget **+650 mincí** na rozvoj projektu."

Vytahují vás z výtahu a CEO ti podává vizitku: "Zavolej mi příští týden, domluvíme detaily."

Nejlepší zaseknutý výtah ever!`,
		coinsChange: 650,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_small_investment: {
		id: "terminal_small_investment",
		type: "terminal",
		narrative: `💡 **Nadšení funguje!**

"Páni, vidím, že ti na tom záleží," směje se CEO. "Dobře, dám ti **+400 mincí** na pilot."

Není to velká investice, ale je to začátek. CEO ti dal šanci!`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_collaboration: {
		id: "terminal_collaboration",
		type: "terminal",
		narrative: `🤝 **Nová spolupráce!**

"Víš co, náš marketingový projekt by mohl využít tvoje know-how," říká kolega.

Domlouváte spolupráci mezi týmy. HR ti schválí bonus **+300 mincí** za cross-team iniciativu.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_date: {
		id: "terminal_date",
		type: "terminal",
		narrative: `💘 **Máš rande!**

"Vlastně... chtěl bych s tebou někdy zajít na večeři. Ne jako kolegové," řekneš nakonec.

"Ráda," usmívá se.

Tvoje produktivita celý týden raketově roste. Bonus za výkon: **+350 mincí**.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_friendly_chat: {
		id: "terminal_friendly_chat",
		type: "terminal",
		narrative: `😊 **Příjemná konverzace**

I když rande nevyšlo, strávili jste příjemnou hodinu povídáním.

Kolega ti slíbí pomoc s příštím projektem. Bonus: **+150 mincí**.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_ceo_contact: {
		id: "terminal_ceo_contact",
		type: "terminal",
		narrative: `📇 **Nový kontakt!**

CEO sice odmítl, ale dal ti vizitku. "Až budeš mít něco konkrétnějšího, zavolej."

Získáváš přístup do vyšších pater. Bonus: **+180 mincí**.`,
		coinsChange: 180,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_networking: {
		id: "terminal_networking",
		type: "terminal",
		narrative: `🤝 **Networking!**

I když spolupráce zatím nevyšla, vyměnili jste si kontakty.

Kolega ti později pomůže s jiným projektem. Bonus: **+120 mincí**.`,
		coinsChange: 120,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_good_impression: {
		id: "terminal_good_impression",
		type: "terminal",
		narrative: `👍 **Dobrý dojem!**

CEO oceňuje tvou odvahu oslovit ho. "Máš koule, to se mi líbí."

I když investice nepřišla, CEO si tě zapamatoval. Bonus: **+200 mincí**.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_small_talk_win: {
		id: "terminal_small_talk_win",
		type: "terminal",
		narrative: `⚽ **Small talk funguje!**

CEO je fotbalový fanoušek! Celou hodinu mluvíte o sportu.

"Jsi fajn člověk," říká CEO při odchodu. Získáváš **+200 mincí** za networking.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_quiet_peace: {
		id: "terminal_quiet_peace",
		type: "terminal",
		narrative: `🧘 **Klidná hodina**

Strávil jsi hodinu v tichu, ale nebyl to špatný čas. CEO ti při odchodu přikývl.

Získáváš **+50 mincí** za klid a respektování prostoru.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_persistence_pays: {
		id: "terminal_persistence_pays",
		type: "terminal",
		narrative: `💬 **Vytrvalost se vyplatila!**

Kolega/kolegyně se rozmluvil/a a strávili jste skvělou hodinu.

"Ráda bych s tebou zašla na kafe," říká. Získáváš **+250 mincí** a nový kontakt.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_natural_conversation: {
		id: "terminal_natural_conversation",
		type: "terminal",
		narrative: `😊 **Přirozená konverzace**

Po chvíli ticha kolega/kolegyně sám/sama začal/a mluvit. Bylo to příjemné.

"Díky za trpělivost," usmívá se. Získáváš **+150 mincí**.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	// Negative endings (3)
	terminal_awkward_silence: {
		id: "terminal_awkward_silence",
		type: "terminal",
		narrative: `😬 **Trapné ticho**

CEO se otočí zpátky k telefonu. Celou hodinu sedíš v tichu.

"Příště se nebav lidi v práci," říká CEO nakonec. HR ti strhává **-200 mincí** za nevhodné chování.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_phone_distraction: {
		id: "terminal_phone_distraction",
		type: "terminal",
		narrative: `📱 **Ignorace**

Kolega je celou dobu ponořený v telefonu. Ani na tebe nepodívá.

Ztratil jsi hodinu života a zmeškal jsi deadline. Srážka: **-250 mincí**.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_hr_complaint: {
		id: "terminal_hr_complaint",
		type: "terminal",
		narrative: `😱 **HR stížnost!**

Kolega/kolegyně podal/a stížnost na HR za nevhodné chování.

Musíš absolvovat školení a dostáváš srážku: **-200 mincí**.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},
};

export const elevatorStuckBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 15,
	averageReward: 200,
	maxPossibleReward: 650, // CEO path -> Professional pitch -> Big investment
	minPossibleReward: -250, // Colleague path -> fail -> Phone distraction
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(elevatorStuckBranchingStory);
