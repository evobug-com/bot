/**
 * Code Review Conflict - Branching Story
 *
 * Branching narrative about defending your code against harsh criticism.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Response approach]
 *   -> Defend -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Escalate or prove]
 *       -> Escalate -> [OUTCOME] -> [TERMINAL: Vindicated/Backstabber]
 *       -> Prove with data -> [OUTCOME] -> [TERMINAL: Respect/Wrong]
 *     -> Failure -> [DECISION 2b: Retreat options]
 *       -> Compromise -> [TERMINAL: Middle ground]
 *       -> Give up -> [TERMINAL: Defeated]
 *   -> Accept changes -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Learn or resent]
 *       -> Learn from it -> [OUTCOME] -> [TERMINAL: Growth/Imposter]
 *       -> Silent resentment -> [TERMINAL: Bitter]
 *     -> Failure -> [TERMINAL: Still wrong]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "code_review_branching";
const STORY_TITLE = "Code review konflikt";
const STORY_EMOJI = "👨‍💻";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Otevíráš GitLab a vidíš notifikaci: **47 komentářů na tvém PR**.

Senior developer Milan všechno rozcupoval. "Tohle je špatně.", "Proč takhle?", "Přepiš to celé."

😤 Strávil jsi na tom kódu týden. Jsi si jistý, že je správně...`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Response approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Sedíš před monitorem a rozhoduješ se, jak reagovat. Milan je sice senior, ale jeho komentáře jsou často příliš kritické.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Bránit svůj kód",
				description: "Odpovíš na každý komentář s argumenty. Máš své důvody!",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_defend",
			},
			choiceY: {
				id: "choiceY",
				label: "Přijmout změny",
				description: "Milan je senior, asi ví, co dělá. Přepíšeš to podle něj.",
				baseReward: 200,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_accept",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Defend code
	// =========================================================================
	outcome_defend: {
		id: "outcome_defend",
		type: "outcome",
		narrative: `💪 Začínáš psát odpovědi na každý komentář.

"Toto řešení jsem zvolil kvůli performance...", "Dokumentace doporučuje tento přístup...", "Benchmark ukazuje 30% zlepšení..."`,
		successChance: 70,
		successNodeId: "decision_2a_escalate",
		failNodeId: "decision_2b_retreat",
	},

	// =========================================================================
	// DECISION 2a: Escalate or prove
	// =========================================================================
	decision_2a_escalate: {
		id: "decision_2a_escalate",
		type: "decision",
		narrative: `✅ **Tvoje argumenty zabírají!** Milan některé komentáře stáhl.

Ale stále trvá na 15 změnách, které ti nedávají smysl. Co teď?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Eskalovat k tech leadovi",
				description: "Zavoláš tech leada jako rozhodčího. Riskantní, ale férové.",
				baseReward: 500,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_escalate",
			},
			choiceY: {
				id: "choiceY",
				label: "Dokázat daty",
				description: "Napíšeš benchmark testy, které ukážou, kdo má pravdu.",
				baseReward: 400,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_prove",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Retreat options
	// =========================================================================
	decision_2b_retreat: {
		id: "decision_2b_retreat",
		type: "decision",
		narrative: `😞 **Milan nepřijímá tvé argumenty.** Tvrdí, že jsi junior a nerozumíš architektuře.

Diskuze se zahřívá. Ostatní kolegové sledují.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Najít kompromis",
				description: "Navrhuješ změnit polovinu věcí. Něco za něco.",
				baseReward: 250,
				riskMultiplier: 0.9,
				nextNodeId: "terminal_middle_ground",
			},
			choiceY: {
				id: "choiceY",
				label: "Vzdát to",
				description: "Nemáš energii na hádky. Přepíšeš to jak chce.",
				baseReward: 50,
				riskMultiplier: 0.5,
				nextNodeId: "terminal_defeated",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Accept changes
	// =========================================================================
	outcome_accept: {
		id: "outcome_accept",
		type: "outcome",
		narrative: `🤔 Začínáš přepisovat kód podle Milanových komentářů.

Trvá to další dva dny, ale PR je konečně approved.`,
		successChance: 70,
		successNodeId: "decision_2c_attitude",
		failNodeId: "terminal_still_wrong",
	},

	// =========================================================================
	// DECISION 2c: Attitude after accepting
	// =========================================================================
	decision_2c_attitude: {
		id: "decision_2c_attitude",
		type: "decision",
		narrative: `✅ **Kód je merged!** Milan napsal: "Konečně to vypadá správně."

Jak se k tomu postavíš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Poučit se",
				description: "Možná měl Milan pravdu. Prostuduj si jeho přístup.",
				baseReward: 300,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_learn",
			},
			choiceY: {
				id: "choiceY",
				label: "Tiché rozhořčení",
				description: "Vnitřně zuříš, ale mlčíš. Tenhle boj jsi prohrál.",
				baseReward: 100,
				riskMultiplier: 0.9,
				nextNodeId: "terminal_bitter",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Escalate to tech lead
	// =========================================================================
	outcome_escalate: {
		id: "outcome_escalate",
		type: "outcome",
		narrative: `📞 Píšeš tech leadovi: "Můžeš se podívat na tenhle PR? Potřebujeme nezávislý názor."

Za hodinu je schůzka. Ty, Milan a tech lead.`,
		successChance: 70,
		successNodeId: "terminal_vindicated",
		failNodeId: "terminal_backstabber",
	},

	// =========================================================================
	// OUTCOME: Prove with data
	// =========================================================================
	outcome_prove: {
		id: "outcome_prove",
		type: "outcome",
		narrative: `📊 Trávíš večer psaním benchmark testů. Load testy, stress testy, memory profiling...

Ráno posíláš výsledky Milanovi s komentářem: "Data mluví za vše."`,
		successChance: 70,
		successNodeId: "terminal_respect_earned",
		failNodeId: "terminal_data_wrong",
	},

	// =========================================================================
	// OUTCOME: Learn from it
	// =========================================================================
	outcome_learn: {
		id: "outcome_learn",
		type: "outcome",
		narrative: `📚 Procházíš Milanovy změny a snažíš se pochopit jeho myšlení.

"Hmm, tohle jsem nikdy takhle neviděl..."`,
		successChance: 70,
		successNodeId: "terminal_growth",
		failNodeId: "terminal_imposter",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (7)
	terminal_vindicated: {
		id: "terminal_vindicated",
		type: "terminal",
		narrative: `🏆 **SPRAVEDLNOST!**

Tech lead si prohlédl kód: "Tohle je správně. Milan, některé tvoje komentáře nedávají smysl."

Milan rudne. Tvůj původní kód jde do produkce.

Získáváš **+500 mincí** a respekt týmu.`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_respect_earned: {
		id: "terminal_respect_earned",
		type: "terminal",
		narrative: `🎯 **RESPEKT ZÍSKÁN**

Milan si prohlédne data. Dlouho mlčí. Pak napíše: "Máš pravdu. Approved."

Nikdy se neomluví, ale od teď tě bere jako rovného.

Získáváš **+450 mincí** a pozici v týmu.`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_growth: {
		id: "terminal_growth",
		type: "terminal",
		narrative: `📈 **OSOBNÍ RŮST**

Studiem Milanových změn jsi pochopil vzory, které jsi neznal. Vlastně měl v mnohem pravdu.

"Děkuju za feedback," píšeš Milanovi. Od teď jste kolegové.

Získáváš **+350 mincí** a nové znalosti.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_middle_ground: {
		id: "terminal_middle_ground",
		type: "terminal",
		narrative: `🤝 **KOMPROMIS**

"OK, změním tyhle 3 věci, ale tyhle 2 nechám. Souhlas?"

Milan souhlasí. Není to úplná výhra, ale ani prohra.

Získáváš **+200 mincí** a zachováváš vztah.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_bitter: {
		id: "terminal_bitter",
		type: "terminal",
		narrative: `😤 **TRPKÝ POCIT**

Mlčíš, ale uvnitř zuříš. Víš, že tvůj kód byl lepší.

Aspoň je to merged. Někdy musíš vybrat své bitvy.

Získáváš **+100 mincí**. Čas hojí rány.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_defeated: {
		id: "terminal_defeated",
		type: "terminal",
		narrative: `😔 **PORAŽEN**

Přepisuješ všechno jak Milan chce. Trvá to další 3 dny.

"Approved," napíše lakonicky. Žádné poděkování.

Získáváš **+50 mincí** za dokončení.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.7,
	},

	// Negative endings (4)
	terminal_backstabber: {
		id: "terminal_backstabber",
		type: "terminal",
		narrative: `🗡️ **ZRÁDCE**

Tech lead se postavil za Milana. "Senioři mají finální slovo."

Milan ti později říká: "Příště si to vyřídíme interně. Tohle bylo neprofesionální."

Ztrácíš **-200 mincí** a důvěru.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_data_wrong: {
		id: "terminal_data_wrong",
		type: "terminal",
		narrative: `📉 **DATA TI DALA ZA PRAVDU... ALE NE**

Benchmark ukazuje, že Milanův přístup je o 40 % rychlejší.

"Příště si udělej research předem," píše Milan s úsměvným emoji.

Ztrácíš **-150 mincí** a trochu sebevědomí.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_imposter: {
		id: "terminal_imposter",
		type: "terminal",
		narrative: `😰 **IMPOSTER SYNDROM**

Čím víc studuješ Milanovy změny, tím víc si uvědomuješ, kolik toho nevíš.

"Patřím vůbec sem?" ptáš se sám sebe. Pochybnosti tě pohltí.

Ztrácíš **-100 mincí** na léky proti úzkosti.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_still_wrong: {
		id: "terminal_still_wrong",
		type: "terminal",
		narrative: `🔄 **STÁLE ŠPATNĚ**

Přepsal jsi kód podle Milana, ale v produkci to crashlo.

"To není moje chyba, já jsem jen dělal review," říká Milan.

Ztrácíš **-250 mincí** za noční hotfix.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},
};

export const codeReviewBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 18,
	averageReward: 180,
	maxPossibleReward: 500, // Defend -> Escalate -> Vindicated
	minPossibleReward: -250, // Accept -> Still wrong
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(codeReviewBranchingStory);
