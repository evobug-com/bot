/**
 * Hackathon - Branching Story
 *
 * A Mass Effect-style branching narrative about participating in a 48-hour hackathon.
 * Features 3 decision layers and 12 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Solo or Team]
 *   -> Solo -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Demo approach]
 *       -> Polish -> [OUTCOME] -> [TERMINAL: Perfect demo/Last minute bug]
 *       -> Features -> [OUTCOME] -> [TERMINAL: Feature rich/Overwhelming]
 *     -> Failure -> [DECISION 2b: Quick fix or pivot]
 *       -> Fix -> [OUTCOME] -> [TERMINAL: Saved/Complete crash]
 *       -> Pivot -> [TERMINAL: Creative pivot]
 *   -> Team -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Prize approach]
 *       -> Present best -> [OUTCOME] -> [TERMINAL: Winner/Runner-up]
 *       -> Sell project -> [TERMINAL: Acquisition]
 *     -> Failure -> [DECISION 2d: Team conflict]
 *       -> Compromise -> [OUTCOME] -> [TERMINAL: Teamwork/Drama]
 *       -> Takeover -> [TERMINAL: Leadership penalty]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "hackathon_branching";
const STORY_TITLE = "48hodinový Hackathon";
const STORY_EMOJI = "💻";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `💻 **${STORY_TITLE}**

Přihlásil ses na prestižní 48hodinový hackathon! Téma: "Budoucnost technologií"

V hlavě se ti rojí nápady. Energy drinky jsou nachystané, klávesnice čeká...

*Jak půjdeš do toho?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Solo or Team
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Stojíš u registrace. Můžeš jít sólo a mít plnou kontrolu, nebo sestavit tým a rozdělit práci.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Jít sólo",
				description: "Plná kontrola, ale celá odpovědnost na tobě. Riskantní, ale může to vypadat impozantně.",
				baseReward: 600,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_solo",
			},
			choiceY: {
				id: "choiceY",
				label: "Sestavit tým",
				description: "Rozdělená práce, ale musíš spolupracovat. Bezpečnější varianta.",
				baseReward: 400,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_team",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Solo attempt
	// =========================================================================
	outcome_solo: {
		id: "outcome_solo",
		type: "outcome",
		narrative: `⚡ Jdeš do toho sám! 48 hodin, ty a tvůj kód...

Hodina 12: Backend funguje
Hodina 24: Frontend je napůl hotový
Hodina 36: Integraci je čím dál složitější
Hodina 42: Panika!`,
		successChance: 70,
		successNodeId: "decision_2a_demo",
		failNodeId: "decision_2b_crisis",
	},

	// =========================================================================
	// OUTCOME: Team attempt
	// =========================================================================
	outcome_team: {
		id: "outcome_team",
		type: "outcome",
		narrative: `👥 Sestavuješ tým! Frontend dev, backend dev, designer a ty jako lead.

Hodina 10: Skvělý brainstorming
Hodina 20: První prototyp
Hodina 35: Integruje se všechno dohromady
Hodina 45: Testing a polish...`,
		successChance: 70,
		successNodeId: "decision_2c_prize",
		failNodeId: "decision_2d_conflict",
	},

	// =========================================================================
	// DECISION 2a: Demo approach (solo success)
	// =========================================================================
	decision_2a_demo: {
		id: "decision_2a_demo",
		type: "decision",
		narrative: `🎯 **Úspěch!** Tvůj projekt funguje! Máš 6 hodin do prezentace.

Co je lepší - vyladit to, co máš, nebo přidat další cool features?`,
		coinsChange: 100,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Vyladit demo",
				description: "Zajistit, že vše funguje bezchybně. Bezpečné, ale možná méně impozantní.",
				baseReward: 500,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_polish",
			},
			choiceY: {
				id: "choiceY",
				label: "Přidat features",
				description: "AI integrace! Blockchain! AR! Porota bude v šoku... nebo zmatená?",
				baseReward: 700,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_features",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Crisis management (solo failure)
	// =========================================================================
	decision_2b_crisis: {
		id: "decision_2b_crisis",
		type: "decision",
		narrative: `😰 **Krize!** Něco se pokazilo. Backend nechce mluvit s frontendem.

6 hodin do prezentace. Můžeš to zkusit opravit, nebo kompletně pivotovat nápad?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Opravit bug",
				description: "Najít ten zatracený bug. Časově náročné, ale můžeš zachránit originální vizi.",
				baseReward: 300,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_fix",
			},
			choiceY: {
				id: "choiceY",
				label: "Pivot na jiný nápad",
				description: "Rychle udělat jednodušší demo, které funguje. Kreativní řešení.",
				baseReward: 250,
				riskMultiplier: 0.8,
				nextNodeId: "terminal_creative_pivot",
			},
		},
	},

	// =========================================================================
	// DECISION 2c: Prize approach (team success)
	// =========================================================================
	decision_2c_prize: {
		id: "decision_2c_prize",
		type: "decision",
		narrative: `✨ **Tým si sedl!** Projekt vypadá skvěle a všichni jsou natěšení.

4 hodiny do prezentace. Jeden kolega ti říká, že viděl zástupce startupu v publiku, který hledá projekty k akvizici.

Jít na hlavní cenu, nebo zkusit prodat projekt?`,
		coinsChange: 150,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Jít na vítězství",
				description: "Prezentovat před porotou a bojovat o první místo. Vysoká odměna!",
				baseReward: 650,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_present",
			},
			choiceY: {
				id: "choiceY",
				label: "Prodat projekt",
				description: "Zaměřit se na ten startup. Jistá odměna, možná menší než hlavní cena.",
				baseReward: 400,
				riskMultiplier: 0.6,
				nextNodeId: "terminal_acquisition",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Team conflict (team failure)
	// =========================================================================
	decision_2d_conflict: {
		id: "decision_2d_conflict",
		type: "decision",
		narrative: `😤 **Konflikt!** Designer chce všechno předělat hodinu před deadlinem.

Frontend dev s ním souhlasí, ale backend dev říká, že je to nesmysl. Všichni se dívají na tebe jako na leadera.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Najít kompromis",
				description: "Zkusit spojit týmy a najít střední cestu. Obtížné, ale může to zachránit projekt.",
				baseReward: 300,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_compromise",
			},
			choiceY: {
				id: "choiceY",
				label: "Vzít velení",
				description: "Rozhodnout sám a ignorovat námitky. Rychlé, ale může rozbít tým.",
				baseReward: 100,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_leadership_fail",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Polish demo
	// =========================================================================
	outcome_polish: {
		id: "outcome_polish",
		type: "outcome",
		narrative: `🔧 Soustředíš se na perfektní demo. Testing, edge cases, UX polish...

Hodina před prezentací spouštíš finální test run...`,
		successChance: 70,
		successNodeId: "terminal_perfect_demo",
		failNodeId: "terminal_last_minute_bug",
	},

	// =========================================================================
	// OUTCOME: Add features
	// =========================================================================
	outcome_features: {
		id: "outcome_features",
		type: "outcome",
		narrative: `🚀 Přidáváš další features! AI model, real-time analytics, fancy animace...

30 minut před prezentací kompiluje kód...`,
		successChance: 70,
		successNodeId: "terminal_feature_rich",
		failNodeId: "terminal_overwhelming",
	},

	// =========================================================================
	// OUTCOME: Fix bug
	// =========================================================================
	outcome_fix: {
		id: "outcome_fix",
		type: "outcome",
		narrative: `🐛 Debug mode aktivní! Console.log na každém řádku...

3 hodiny debugování. 2 energy drinky. 1 moment osvícení...`,
		successChance: 70,
		successNodeId: "terminal_saved",
		failNodeId: "terminal_complete_crash",
	},

	// =========================================================================
	// OUTCOME: Present to judges
	// =========================================================================
	outcome_present: {
		id: "outcome_present",
		type: "outcome",
		narrative: `🎤 Stojíš před porotou. Tvůj tým prezentuje společně.

Demo běží, porota poslouchá... Jeden z porotců se sklání dopředu se zájmem...`,
		successChance: 70,
		successNodeId: "terminal_winner",
		failNodeId: "terminal_runner_up",
	},

	// =========================================================================
	// OUTCOME: Team compromise
	// =========================================================================
	outcome_compromise: {
		id: "outcome_compromise",
		type: "outcome",
		narrative: `🤝 "Poslouchejte, uděláme to takhle..." Navrhneš kompromis.

Tým se dívá jeden na druhého...`,
		successChance: 70,
		successNodeId: "terminal_teamwork",
		failNodeId: "terminal_team_drama",
	},

	// =========================================================================
	// TERMINAL NODES (12 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_perfect_demo: {
		id: "terminal_perfect_demo",
		type: "terminal",
		narrative: `🏆 **PERFEKTNÍ DEMO!**

Demo běží jako na drátkách. Porota je ohromená tvou precizností a čistým kódem.

"První místo - sólo vývojář!"

Získáváš **+650 mincí** a standing ovation!`,
		coinsChange: 650,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_feature_rich: {
		id: "terminal_feature_rich",
		type: "terminal",
		narrative: `🌟 **FEATURE POWERHOUSE!**

Všechny features fungují! Porota nemůže uvěřit, že jsi to stihl sám za 48 hodin.

"Druhé místo - za technickou excelenci!"

Získáváš **+550 mincí** a kontakty od investorů!`,
		coinsChange: 550,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_saved: {
		id: "terminal_saved",
		type: "terminal",
		narrative: `💪 **ZACHRÁNĚNO!**

Našel jsi ten bug! Byl to jeden missing semicolon (samozřejmě).

Projekt funguje a prezentace je solidní. Získáváš **+400 mincí** a respekt za perseverance!`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_creative_pivot: {
		id: "terminal_creative_pivot",
		type: "terminal",
		narrative: `🎨 **KREATIVNÍ PIVOT!**

Tvůj nový nápad je jednodušší, ale geniální! Porota ocenila tvou schopnost adaptace.

"Cena za nejlepší pivot!"

Získáváš **+350 mincí** a pochvalu za flexibilitu!`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_winner: {
		id: "terminal_winner",
		type: "terminal",
		narrative: `🥇 **VÍTĚZOVÉ!**

"A vítězem je... VÁŠ TÝM!"

Tech média o vás píší. Celý tým slaví. Získáváš **+700 mincí** jako tvůj podíl z prize money!`,
		coinsChange: 700,
		isPositiveEnding: true,
		xpMultiplier: 1.7,
	},

	terminal_runner_up: {
		id: "terminal_runner_up",
		type: "terminal",
		narrative: `🥈 **STŘÍBRNÁ MEDAILE!**

Druhé místo! Těsně za vítězi, ale pořád úžasný výsledek.

Investor v porotě si vás všiml a nabízí mentoring. Tvůj podíl: **+450 mincí**`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_acquisition: {
		id: "terminal_acquisition",
		type: "terminal",
		narrative: `💼 **AKVIZICE!**

Startup z publika chce koupit váš projekt! Nevyhráli jste hackathon, ale prodali jste kód.

Tvůj podíl z prodeje: **+500 mincí**. Business is business!`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_teamwork: {
		id: "terminal_teamwork",
		type: "terminal",
		narrative: `🤝 **TÝMOVÁ PRÁCE!**

Kompromis fungoval! Tým se semkl a projekt je solidní.

Sice jste nevyhráli, ale získali jste zkušenosti a nové přátele. **+300 mincí** a cenné kontakty!`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	// Negative endings (4)
	terminal_last_minute_bug: {
		id: "terminal_last_minute_bug",
		type: "terminal",
		narrative: `🐛 **LAST MINUTE BUG!**

Test run odhalil kritický bug! Nemáš čas to opravit.

Demo crashuje před porotou. 48 hodin práce a ještě škoda na zařízení: **-200 mincí**`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_overwhelming: {
		id: "terminal_overwhelming",
		type: "terminal",
		narrative: `😵 **PŘÍLIŠ SLOŽITÉ!**

Tolik features, že demo je matoucí. Porota nechápe, co projekt dělá.

"Sorry, ale tohle je nepřehledné." Frustrace a škoda: **-150 mincí**`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_complete_crash: {
		id: "terminal_complete_crash",
		type: "terminal",
		narrative: `💀 **TOTÁLNÍ CRASH!**

Bug nenalezen. Demo nefunguje. Usneš během prezentace z vyčerpání.

48 hodin marně + rozbité vybavení ve frustraci: **-300 mincí**`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_team_drama: {
		id: "terminal_team_drama",
		type: "terminal",
		narrative: `😱 **TÝMOVÉ DRAMA!**

Kompromis nefungoval. Hádka eskaluje. Tým se rozpadá přímo před prezentací.

V práci je teď awkward. Omluvný drink pro celý tým: **-250 mincí**`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_leadership_fail: {
		id: "terminal_leadership_fail",
		type: "terminal",
		narrative: `👎 **ŠPATNÉ VEDENÍ**

Vzal jsi velení, ale ignoroval názory týmu. Projekt je hotový, ale atmosféra je toxická.

Nikdo s tebou nechce mluvit. Reputace poškozena: **-180 mincí** v sociálním kapitálu.`,
		coinsChange: -180,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},
};

export const hackathonBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 24,
	averageReward: 300,
	maxPossibleReward: 1000, // Team + success + present + winner (150 + 100 + 700)
	minPossibleReward: -300, // Solo + failure + fix fail (complete crash)
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(hackathonBranchingStory);
