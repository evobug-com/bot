/**
 * Friday Deploy - Branching Story
 *
 * A Mass Effect-style branching narrative about the risky decision to deploy on Friday afternoon.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Deploy or Wait]
 *   -> Deploy -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Tests passing]
 *       -> Quick merge  -> [OUTCOME] -> [TERMINAL: Hero/Hotfix needed]
 *       -> Full review  -> [OUTCOME] -> [TERMINAL: Perfect/Minor bug]
 *     -> Failure -> [DECISION 2b: Build failing]
 *       -> Fix fast -> [OUTCOME] -> [TERMINAL: Fixed/Weekend ruined]
 *       -> Rollback -> [TERMINAL: Safe rollback]
 *   -> Wait -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Monday deploy]
 *       -> Deploy Monday  -> [TERMINAL: Smooth Monday]
 *       -> More testing   -> [OUTCOME] -> [TERMINAL: Bug found early/Overthinking]
 *     -> Failure -> [TERMINAL: Boss angry]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "friday_deploy_branching";
const STORY_TITLE = "Páteční deploy";
const STORY_EMOJI = "🚀";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Je pátek 16:30. Právě jsi dokončil novou feature a všechno je připravené k nasazení.

Kolegové odcházejí domů a varují tě: *"Páteční deploy? To nemyslíš vážně..."*

Ale ty chceš mít hotovo. Co uděláš?`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Deploy or Wait
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Máš dvě možnosti: nasadit změny hned teď, nebo počkat do pondělí. Pipeline je zelená, testy procházejí...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Nasadit hned",
				description: "Riskantní páteční deploy. Budeš hrdina, nebo na call celý víkend?",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_deploy",
			},
			choiceY: {
				id: "choiceY",
				label: "Počkat do pondělí",
				description: "Bezpečná varianta. Budeš ale muset čekat celý víkend.",
				baseReward: 150,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_wait",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Deploying on Friday
	// =========================================================================
	outcome_deploy: {
		id: "outcome_deploy",
		type: "outcome",
		narrative: `🚀 Stiskáš tlačítko DEPLOY... Pipeline se rozbíhá, srdce ti buší...`,
		successChance: 70,
		successNodeId: "decision_2a_tests",
		failNodeId: "decision_2b_failing",
	},

	// =========================================================================
	// DECISION 2a: Tests passing - what to do next
	// =========================================================================
	decision_2a_tests: {
		id: "decision_2a_tests",
		type: "decision",
		narrative: `✅ **Pipeline je zelená!** Testy procházejí, build je úspěšný.

Teď musíš rozhodnout, jak pokračovat s nasazením do produkce.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rychlý merge",
				description: "Rovnou nasadit do produkce. Rychlé, ale riskantní.",
				baseReward: 500,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_quick_merge",
			},
			choiceY: {
				id: "choiceY",
				label: "Code review",
				description: "Počkat na review kolegy. Pomalejší, ale bezpečnější.",
				baseReward: 300,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_reviewed",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Build failing
	// =========================================================================
	decision_2b_failing: {
		id: "decision_2b_failing",
		type: "decision",
		narrative: `🔴 **BUILD FAILED!** Pipeline je červená!

Produkce není dotčená, ale máš problém. Už je 17:00...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rychlá oprava",
				description: "Zkusíš to rychle opravit a znovu nasadit.",
				baseReward: 250,
				riskMultiplier: 1.5,
				nextNodeId: "outcome_quick_fix",
			},
			choiceY: {
				id: "choiceY",
				label: "Rollback",
				description: "Vrátíš změny a jdeš domů. Bezpečná varianta.",
				baseReward: 100,
				riskMultiplier: 0.5,
				nextNodeId: "terminal_safe_rollback",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Quick merge to production
	// =========================================================================
	outcome_quick_merge: {
		id: "outcome_quick_merge",
		type: "outcome",
		narrative: `⚡ Mergeuješ přímo do produkce... Deployment běží...`,
		successChance: 70,
		successNodeId: "terminal_hero",
		failNodeId: "terminal_hotfix_needed",
	},

	// =========================================================================
	// OUTCOME: Code reviewed before deploy
	// =========================================================================
	outcome_reviewed: {
		id: "outcome_reviewed",
		type: "outcome",
		narrative: `👀 Senior kolega rychle projíždí tvůj kód... "Vypadá to dobře, ale počkej..."`,
		successChance: 70,
		successNodeId: "terminal_perfect_deploy",
		failNodeId: "terminal_minor_bug_found",
	},

	// =========================================================================
	// OUTCOME: Quick fix attempt
	// =========================================================================
	outcome_quick_fix: {
		id: "outcome_quick_fix",
		type: "outcome",
		narrative: `🔧 Hledáš chybu... Aha! Zapomněl jsi aktualizovat dependency. Fixuješ to a znovu deployjuješ...`,
		successChance: 70,
		successNodeId: "terminal_fixed_in_time",
		failNodeId: "terminal_weekend_ruined",
	},

	// =========================================================================
	// OUTCOME: Waiting for Monday
	// =========================================================================
	outcome_wait: {
		id: "outcome_wait",
		type: "outcome",
		narrative: `⏰ Rozhodneš se počkat do pondělí. Víkend v klidu, ale šéf se ptá, proč to není hotové...`,
		successChance: 70,
		successNodeId: "decision_2c_monday",
		failNodeId: "terminal_boss_angry",
	},

	// =========================================================================
	// DECISION 2c: Monday deploy options
	// =========================================================================
	decision_2c_monday: {
		id: "decision_2c_monday",
		type: "decision",
		narrative: `☀️ **Pondělí ráno.** Jsi čerstvý a odpočatý. Šéf je spokojený, že jsi to nerisknul.

Co teď s deployem?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Deploy hned",
				description: "Nasadíš to ráno v pondělí, když je tým u počítačů.",
				baseReward: 200,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_smooth_monday",
			},
			choiceY: {
				id: "choiceY",
				label: "Další testování",
				description: "Věnuješ dopoledne dalšímu testování.",
				baseReward: 150,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_more_testing",
			},
		},
	},

	// =========================================================================
	// OUTCOME: More testing on Monday
	// =========================================================================
	outcome_more_testing: {
		id: "outcome_more_testing",
		type: "outcome",
		narrative: `🧪 Procházíš kód znovu, spouštíš manuální testy...`,
		successChance: 70,
		successNodeId: "terminal_bug_found_early",
		failNodeId: "terminal_overthinking",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_hero: {
		id: "terminal_hero",
		type: "terminal",
		narrative: `🏆 **PÁTEČNÍ HRDINA!**

Deploy proběhl perfektně! Všechno funguje, žádné chyby. Kolegyně ti v pondělí tleskají.

"Nikdo tomu nevěří," říká tech lead. "Páteční deploy bez jediného problému!"

Šéf ti dává bonus **+500 mincí** za odvahu a dokonalé provedení.`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_perfect_deploy: {
		id: "terminal_perfect_deploy",
		type: "terminal",
		narrative: `✨ **PERFEKTNÍ DEPLOY!**

Senior kolega našel potenciální edge case a ty jsi to opravil před nasazením.

Deploy proběhl bez jediné chyby. Šéf oceňuje tvou trpělivost a profesionalitu.

Získáváš **+350 mincí** a respekt týmu.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_fixed_in_time: {
		id: "terminal_fixed_in_time",
		type: "terminal",
		narrative: `🔧 **RYCHLÁ OPRAVA!**

Podařilo se ti to opravit! Druhý pokus byl úspěšný a deploy proběhl v pořádku.

Je 18:30, ale máš hotovo. Víkend může začít v klidu.

Získáváš **+300 mincí** za rychlé řešení problémů.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_safe_rollback: {
		id: "terminal_safe_rollback",
		type: "terminal",
		narrative: `↩️ **BEZPEČNÝ ROLLBACK**

Rozumné rozhodnutí. Vrátil jsi změny, produkce je v bezpečí.

V pondělí to v klidu opravíš. Šéf oceňuje, že jsi nepanikařil.

Získáváš **+150 mincí** za zodpovědné jednání.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_smooth_monday: {
		id: "terminal_smooth_monday",
		type: "terminal",
		narrative: `☕ **KLIDNÝ PONDĚLNÍ DEPLOY**

Deploy v pondělí dopoledne proběhl hladce. Tým je u počítačů, všechno funguje.

"Vidíš? Proto se pátek používá na code review, ne deploy," usmívá se tech lead.

Získáváš **+250 mincí** za rozumné rozhodnutí.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_bug_found_early: {
		id: "terminal_bug_found_early",
		type: "terminal",
		narrative: `🐛 **VČASNÉ OBJEVENÍ BUGU!**

Při testování jsi našel kritickou chybu! Kdyby to šlo do produkce v pátek...

"Ušetřil jsi nám víkendový incident," říká tech lead a klepá tě na rameno.

Získáváš **+200 mincí** za pečlivost a prevenci problémů.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_minor_bug_found: {
		id: "terminal_minor_bug_found",
		type: "terminal",
		narrative: `🔍 **MALÝ BUG ODCHYCEN**

Senior kolega našel drobný problém s validací. Opravíš to během 20 minut.

Je pátek večer, ale nestihlo to jít do produkce. V pondělí to nasadíš s opravou.

Získáváš **+100 mincí** za code review proces.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_overthinking: {
		id: "terminal_overthinking",
		type: "terminal",
		narrative: `🤔 **PŘEMÝŠLENÍ NAD PROBLÉMEM**

Nenašel jsi žádný problém, ale strávil jsi tím celé dopoledne.

"Někdy je lepší prostě to nasadit," povzdechne si kolega. Deploy proběhne v poledne bez problémů.

Získáváš **+50 mincí** za opatrnost, i když trochu přehnanou.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	// Negative endings (3)
	terminal_hotfix_needed: {
		id: "terminal_hotfix_needed",
		type: "terminal",
		narrative: `🔥 **HOTFIX NEŠEL!**

Deploy sice proběhl, ale v produkci se objevil bug. Zákazníci si stěžují!

Musíš rychle připravit hotfix. Je pátek večer 19:00. Víkend začíná špatně.

Ztrácíš **-200 mincí** za přesčasy a stress týmu.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_weekend_ruined: {
		id: "terminal_weekend_ruined",
		type: "terminal",
		narrative: `😭 **VÍKEND V TROSKÁCH!**

Oprava nefunguje! Problém je hlubší. Databázové migrace jsou rozbitá.

Voláš celý tým. Sobota a neděle strávíte u počítačů. Rodina tě nenávidí.

Ztrácíš **-500 mincí** za víkendové přesčasy a incident.`,
		coinsChange: -500,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_boss_angry: {
		id: "terminal_boss_angry",
		type: "terminal",
		narrative: `😤 **ŠÉF SE ZLOBÍ**

V pondělí ráno tě šéf volá do kanceláře.

"Feature měla být hotová v pátek! Zákazník čekal celý víkend!"

Deadline jsi nesplnil. Ztráta důvěry klienta znamená penalizaci.

Ztrácíš **-300 mincí** za zmeškaný deadline.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},
};

export const fridayDeployBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 22,
	averageReward: 180,
	maxPossibleReward: 500, // Deploy -> Quick merge success (hero)
	minPossibleReward: -500, // Deploy -> Quick fix fail (weekend ruined)
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(fridayDeployBranchingStory);
