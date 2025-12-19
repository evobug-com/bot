/**
 * Job Interview - Branching Story
 *
 * A Mass Effect-style branching narrative about conducting a job interview.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Focus on skills or personality]
 *   -> Skills -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Technical test approach]
 *       -> Hard test -> [OUTCOME] -> [TERMINAL: Star/Failed]
 *       -> Easy test -> [OUTCOME] -> [TERMINAL: Good hire/Overqualified left]
 *     -> Failure -> [DECISION 2b: Give second chance?]
 *       -> Second chance -> [OUTCOME] -> [TERMINAL: Redeemed/Missed opportunity]
 *       -> Reject -> [TERMINAL: Missed opportunity]
 *   -> Personality -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Reference check]
 *       -> Check refs -> [OUTCOME] -> [TERMINAL: Perfect fit/Red flags]
 *       -> Skip refs -> [TERMINAL: Trust and success]
 *     -> Failure -> [DECISION 2d: CEO's nephew situation]
 *       -> Honest feedback -> [TERMINAL: Respect earned]
 *       -> Soft rejection -> [OUTCOME] -> [TERMINAL: Networking/CEO angry]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "job_interview_branching";
const STORY_TITLE = "Pohovor kandidáta";
const STORY_EMOJI = "📋";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `📋 **${STORY_TITLE}**

Sedíš v zasedačce a čekáš na kandidáta na pozici junior developera. Máš před sebou životopis a seznam otázek.

Dveře se otevírají a vstupuje kandidát. Podáváte si ruce a začínáš s pohovorem...

*Jak budeš vést pohovor?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Focus on skills or personality
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Máš 30 minut na zjištění, jestli je kandidát ten pravý. Můžeš se zaměřit na technické dovednosti, nebo na soft skills a kulturní fit.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Technické dovednosti",
				description: "Zaměříš se na programování, algoritmy a technické znalosti.",
				baseReward: 400,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_skills",
			},
			choiceY: {
				id: "choiceY",
				label: "Soft skills a fit",
				description: "Zjistíš, jestli zapadne do týmu a má správné hodnoty.",
				baseReward: 300,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_personality",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Skills-focused interview
	// =========================================================================
	outcome_skills: {
		id: "outcome_skills",
		type: "outcome",
		narrative: `💻 Začínáš s technickými otázkami. "Řekněte mi o vaší zkušenosti s Reactem..."`,
		successChance: 70,
		successNodeId: "decision_2a_technical_test",
		failNodeId: "decision_2b_second_chance",
	},

	// =========================================================================
	// DECISION 2a: Technical test approach (after good initial impression)
	// =========================================================================
	decision_2a_technical_test: {
		id: "decision_2a_technical_test",
		type: "decision",
		narrative: `🎯 **Slibný začátek!** Kandidát odpovídá dobře, má zkušenosti a vypadá kompetentně.

Teď přichází live coding test. Můžeš dát náročný úkol a zjistit skutečnou úroveň, nebo jednodušší úkol na zklidnění.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Náročný test",
				description: "Složitý algoritmus - uvidíš, jak myslí pod tlakem.",
				baseReward: 450,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_hard_test",
			},
			choiceY: {
				id: "choiceY",
				label: "Přiměřený test",
				description: "Praktický úkol z běžné práce - férový a realistický.",
				baseReward: 350,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_easy_test",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Second chance after weak technical performance
	// =========================================================================
	decision_2b_second_chance: {
		id: "decision_2b_second_chance",
		type: "decision",
		narrative: `😰 **Slabý výkon** Kandidát se potí a nedokáže odpovědět na základní otázky.

"Omlouvám se, jsem nervózní..." říká. Můžeš mu dát druhou šanci s jednodušší otázkou, nebo ukončit pohovor.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Druhá šance",
				description: "Zkusíš jednodušší otázku - možná jen nervozita.",
				baseReward: 300,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_second_chance",
			},
			choiceY: {
				id: "choiceY",
				label: "Ukončit pohovor",
				description: "Není to ono, nemá cenu ztrácet čas.",
				baseReward: 150,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_missed_opportunity",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Hard technical test
	// =========================================================================
	outcome_hard_test: {
		id: "outcome_hard_test",
		type: "outcome",
		narrative: `🧩 Dáváš náročný algoritmus: "Implementujte LRU cache s O(1) operacemi..."

Kandidát se zamyslí a začíná psát...`,
		successChance: 70,
		successNodeId: "terminal_star_candidate",
		failNodeId: "terminal_test_failed",
	},

	// =========================================================================
	// OUTCOME: Easy technical test
	// =========================================================================
	outcome_easy_test: {
		id: "outcome_easy_test",
		type: "outcome",
		narrative: `📝 Dáváš praktický úkol: "Načtěte data z API a zobrazit je v tabulce..."

Kandidát se usmívá a začíná kódovat...`,
		successChance: 70,
		successNodeId: "terminal_good_hire",
		failNodeId: "terminal_overqualified_left",
	},

	// =========================================================================
	// OUTCOME: Second chance
	// =========================================================================
	outcome_second_chance: {
		id: "outcome_second_chance",
		type: "outcome",
		narrative: `🤝 "Dobře, zkusíme to znovu s jednodušší otázkou. V klidu..."

Kandidát se nadechne a soustředí se...`,
		successChance: 70,
		successNodeId: "terminal_redeemed",
		failNodeId: "terminal_missed_opportunity",
	},

	// =========================================================================
	// OUTCOME: Personality-focused interview
	// =========================================================================
	outcome_personality: {
		id: "outcome_personality",
		type: "outcome",
		narrative: `😊 Ptáš se na hodnoty, týmovou práci a motivaci. "Proč chcete pracovat u nás?"`,
		successChance: 70,
		successNodeId: "decision_2c_references",
		failNodeId: "decision_2d_nephew",
	},

	// =========================================================================
	// DECISION 2c: Reference check (after good personality fit)
	// =========================================================================
	decision_2c_references: {
		id: "decision_2c_references",
		type: "decision",
		narrative: `✨ **Skvělý dojem!** Kandidát má správné hodnoty, je sympatický a motivovaný.

Máš kontakty na reference. Chceš je zkontrolovat, nebo už mu věříš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zkontrolovat reference",
				description: "Due diligence - lépe předejít problémům.",
				baseReward: 350,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_references",
			},
			choiceY: {
				id: "choiceY",
				label: "Věřit intuici",
				description: "První dojem je důležitý, reference jsou formalita.",
				baseReward: 300,
				riskMultiplier: 0.8,
				nextNodeId: "terminal_trust_success",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: CEO's nephew situation (after weak personality)
	// =========================================================================
	decision_2d_nephew: {
		id: "decision_2d_nephew",
		type: "decision",
		narrative: `😤 **Arogantní chování** Kandidát je arogantní, přerušuje tě a odmítá odpovídat.

"Tyhle otázky jsou pod mou úroveň..." říká. Pak ti zazvoní telefon - je to CEO. "To je můj synovec, doporučil bych mu dát šanci..."`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Upřímná zpětná vazba",
				description: "Řekneš CEO pravdu - není to dobrý kandidát.",
				baseReward: 200,
				riskMultiplier: 0.9,
				nextNodeId: "terminal_respect_earned",
			},
			choiceY: {
				id: "choiceY",
				label: "Jemné odmítnutí",
				description: "Diplomaticky ho odmítneš bez zmínky o chování.",
				baseReward: 250,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_soft_rejection",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Reference check
	// =========================================================================
	outcome_references: {
		id: "outcome_references",
		type: "outcome",
		narrative: `📞 Voláš bývalému zaměstnavateli. "Ano, pracoval u nás... (pauza)..."`,
		successChance: 70,
		successNodeId: "terminal_perfect_fit",
		failNodeId: "terminal_red_flags",
	},

	// =========================================================================
	// OUTCOME: Soft rejection of nephew
	// =========================================================================
	outcome_soft_rejection: {
		id: "outcome_soft_rejection",
		type: "outcome",
		narrative: `💼 Řekneš CEO, že "bohužel hledáme někoho s jinými zkušenostmi..."

Počkáš, jak to dopadne...`,
		successChance: 70,
		successNodeId: "terminal_networking_bonus",
		failNodeId: "terminal_ceo_angry",
	},

	// =========================================================================
	// TERMINAL NODES (12 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_star_candidate: {
		id: "terminal_star_candidate",
		type: "terminal",
		narrative: `🌟 **HVĚZDA TÝMU!**

Kandidát vyřešil algoritmus elegantně a dokonce navrhl vylepšení! To je senior, ne junior!

HR je nadšené a dává ti recruitment bonus **+450 mincí**. Za měsíc je kandidát tvůj nejlepší kolega.`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_good_hire: {
		id: "terminal_good_hire",
		type: "terminal",
		narrative: `✅ **Solidní výběr**

Kandidát zvládl úkol dobře a ukázal praktické znalosti. Přesně takový junior hledáte.

Získáváš **+350 mincí** recruitment bonus. Za půl roku z něj bude skvělý mid-level.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_redeemed: {
		id: "terminal_redeemed",
		type: "terminal",
		narrative: `🎯 **Druhá šance vyšla!**

Po uklidnění kandidát odpověděl skvěle. Byl to jen stres z prvního pohovoru v životě.

Získáváš **+300 mincí** bonus za rozpoznání talentu. Učíš ho být seniorem.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_perfect_fit: {
		id: "terminal_perfect_fit",
		type: "terminal",
		narrative: `🏆 **Perfektní kandidát!**

Reference jsou výborné: "Nejlepší junior, co jsme měli. Proč odchází? Povýšení jinde."

HR ti dává **+350 mincí** za skvělý výběr. Máš novou hvězdu týmu!`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_trust_success: {
		id: "terminal_trust_success",
		type: "terminal",
		narrative: `🤝 **Intuice nezklala!**

Kandidát se skvěle zapojil do týmu. Byl to dobrý člověk a rychle se učí.

Získáváš **+300 mincí** bonus. Někdy stačí věřit prvnímu dojmu.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_respect_earned: {
		id: "terminal_respect_earned",
		type: "terminal",
		narrative: `💪 **Respekt za upřímnost**

CEO ocenil tvou upřímnost. "Díky, že jsi mi řekl pravdu. Synovec potřebuje jiný obor."

Získáváš **+200 mincí** bonus za integritu. CEO ti začal víc důvěřovat.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_networking_bonus: {
		id: "terminal_networking_bonus",
		type: "terminal",
		narrative: `🎉 **Nečekané spojení**

Synovec CEO nebyl uražený. "Díky za fair šanci. Btw, mám kámoše, co hledá práci - top developer."

Získáváš **+250 mincí** za referral. Networking funguje!`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_missed_opportunity: {
		id: "terminal_missed_opportunity",
		type: "terminal",
		narrative: `🤷 **Možná příště**

Ukončil jsi pohovor brzy. Za týden se dozvídáš, že kandidát dostal práci u konkurence a je tam hvězda.

Nic nezískáváš ani neztrácíš. Ale přemýšlíš, co kdyby...`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	// Negative endings (4)
	terminal_test_failed: {
		id: "terminal_test_failed",
		type: "terminal",
		narrative: `😰 **Příliš náročné**

Kandidát totálně zpanikařil. "To je moc těžké na juniora..." řekl a odešel uprostřed testu.

Napsal negativní review na Glassdoor. Ztrácíš **-200 mincí** na damage control.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_overqualified_left: {
		id: "terminal_overqualified_left",
		type: "terminal",
		narrative: `🚪 **Překvalifikovaný odešel**

Test byl moc jednoduchý. "Myslel jsem, že to bude výzva..." řekl kandidát a odmítl pozici.

Ztratil jsi skvělého kandidáta. HR ti strhává **-150 mincí** za zbytečný pohovor.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_red_flags: {
		id: "terminal_red_flags",
		type: "terminal",
		narrative: `🚩 **Červené vlajky!**

Reference je alarmující: "Problémový zaměstnanec, konflikty s týmem, špatná komunikace..."

Nestihneš najít náhradu a projekt se zpozdí. Ztrácíš **-250 mincí** v penále.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_ceo_angry: {
		id: "terminal_ceo_angry",
		type: "terminal",
		narrative: `😡 **CEO naštvaný**

CEO prokoukl tvé jemné odmítnutí. "Nepotřebujeme lidi, co nejsou týmoví hráči."

Přišel jsi o důvěru managementu. Ztrácíš **-300 mincí** v bonusech.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},
};

export const jobInterviewBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 24,
	averageReward: 250,
	maxPossibleReward: 450, // Skills -> Hard test success
	minPossibleReward: -300, // Personality -> Nephew -> CEO angry
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(jobInterviewBranchingStory);
