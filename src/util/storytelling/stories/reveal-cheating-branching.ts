/**
 * Reveal Cheating - Branching Story
 *
 * Branching narrative about discovering a cheater in the economy system.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Report or Confront]
 *   -> Report -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Admins ask for more evidence]
 *       -> Investigate -> [OUTCOME] -> [TERMINAL: Thorough/Incomplete]
 *       -> Quick -> [TERMINAL: Quick report reward]
 *     -> Failure -> [DECISION 2b: Admins skeptical]
 *       -> Gather more -> [OUTCOME] -> [TERMINAL: Vindicated/Dismissed]
 *       -> Give up -> [TERMINAL: Ignored]
 *   -> Confront -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Cheater offers bribe]
 *       -> Accept -> [OUTCOME] -> [TERMINAL: Bribe success/Caught]
 *       -> Refuse -> [TERMINAL: Moral victory]
 *     -> Failure -> [DECISION 2d: Cheater threatens you]
 *       -> Back down -> [TERMINAL: Intimidated]
 *       -> Fight back -> [OUTCOME] -> [TERMINAL: Exposed both/Public fight]
 */

import type { BranchingStory, StoryNode } from "../types";
import { randomInt } from "../types";

const STORY_ID = "reveal_cheating_branching";
const STORY_TITLE = "Odhalení podvádění";
const STORY_EMOJI = "🕵️";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Procházíš ekonomické logy a všímáš si neobvyklých aktivit. Po důkladné analýze objevuješ podezřelé vzory v /work příkazech.

📊 Jeden uživatel má nadměrný počet coinů získaných za krátkou dobu! **Máš důkazy o podvádění!**

*Co uděláš?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Report to admins or confront cheater
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Máš důkazy v ruce. Můžeš je nahlásit adminům, nebo se pokusit konfrontovat podvodníka přímo.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Nahlásit adminům",
				description: "Bezpečná cesta. Admini to vyřeší profesionálně.",
				baseReward: 250,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_report",
			},
			choiceY: {
				id: "choiceY",
				label: "Konfrontovat přímo",
				description: "Riskantní. Můžeš získat víc, ale taky hodně ztratit.",
				baseReward: 400,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_confront",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Reporting to admins
	// =========================================================================
	outcome_report: {
		id: "outcome_report",
		type: "outcome",
		narrative: `📝 Připravuješ detailní report s důkazy a odesíláš ho administrátorům. Čekáš na jejich reakci...`,
		successChance: 70,
		successNodeId: "decision_2a_more_evidence",
		failNodeId: "decision_2b_skeptical",
	},

	// =========================================================================
	// DECISION 2a: Admins want more evidence - successful report
	// =========================================================================
	decision_2a_more_evidence: {
		id: "decision_2a_more_evidence",
		type: "decision",
		narrative: `✅ **Admin odpovídá!** "Díky za report. Vypadá to zajímavě, ale potřebujeme víc důkazů než jen statistiky."

Můžeš buď pokračovat v investigaci, nebo nechat report jak je.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Důkladná investigace",
				description: "Věnuješ čas shromažďování více důkazů. Časově náročné.",
				baseReward: 350,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_investigate",
			},
			choiceY: {
				id: "choiceY",
				label: "Rychlý závěr",
				description: "Pošleš to co máš a doufáš, že to stačí.",
				baseReward: 200,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_quick_report",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Admins skeptical - failed initial report
	// =========================================================================
	decision_2b_skeptical: {
		id: "decision_2b_skeptical",
		type: "decision",
		narrative: `🤨 **Admin je skeptický.** "Tohle není moc přesvědčivé. Máš nějaké tvrdší důkazy?"

Tvůj report byl odmítnut. Můžeš se pokusit získat víc důkazů, nebo to vzdát.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Shromáždit více",
				description: "Zkusíš najít nezvratné důkazy.",
				baseReward: 300,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_gather_more",
			},
			choiceY: {
				id: "choiceY",
				label: "Vzdát to",
				description: "Není to tvůj problém. Jdeš dál.",
				baseReward: 0,
				riskMultiplier: 0.5,
				nextNodeId: "outcome_give_up",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Thorough investigation
	// =========================================================================
	outcome_investigate: {
		id: "outcome_investigate",
		type: "outcome",
		narrative: `🔍 Věnuješ několik hodin analýze logů, screenshotů a časových razítek...`,
		successChance: 70,
		successNodeId: "terminal_thorough_success",
		failNodeId: "terminal_incomplete",
	},

	// =========================================================================
	// OUTCOME: Gathering more evidence after rejection
	// =========================================================================
	outcome_gather_more: {
		id: "outcome_gather_more",
		type: "outcome",
		narrative: `📚 Začínáš znovu, tentokrát s metodičtějším přístupem. Hledáš nezvratné důkazy...`,
		successChance: 70,
		successNodeId: "terminal_vindicated",
		failNodeId: "terminal_dismissed",
	},

	// =========================================================================
	// OUTCOME: Confronting the cheater
	// =========================================================================
	outcome_confront: {
		id: "outcome_confront",
		type: "outcome",
		narrative: `💬 Posíláš podvodníkovi soukromou zprávu s důkazy. "Víme, co děláš..."`,
		successChance: 70,
		successNodeId: "decision_2c_bribe",
		failNodeId: "decision_2d_threatened",
	},

	// =========================================================================
	// DECISION 2c: Cheater offers bribe - successful confrontation
	// =========================================================================
	decision_2c_bribe: {
		id: "decision_2c_bribe",
		type: "decision",
		narrative: () => {
			const bribe = randomInt(600, 1000);
			return `😰 **Podvodník panikuje.** "Hele, můžeme se domluvit, ne? Dám ti **${bribe} mincí**, abys to nikomu neříkal."

Nabízí ti úplatek. Co uděláš?`;
		},
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Přijmout úplatek",
				description: "Riskantní, ale potenciálně lukrativní.",
				baseReward: 800,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_take_bribe",
			},
			choiceY: {
				id: "choiceY",
				label: "Odmítnout",
				description: "Nahlásíš ho adminům. Morálně správné.",
				baseReward: 250,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_refuse_bribe",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Cheater threatens you - failed confrontation
	// =========================================================================
	decision_2d_threatened: {
		id: "decision_2d_threatened",
		type: "decision",
		narrative: `😠 **Podvodník je agresivní!** "Myslíš, že mě můžeš zastrašit? Mám víc důkazů proti tobě, než ty proti mně!"

Hrozí, že tě nařkne ze stejného. Je to blef, ale může být nebezpečný.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Ustoupit",
				description: "Raději to nech být. Není to tvůj boj.",
				baseReward: 0,
				riskMultiplier: 0.6,
				nextNodeId: "outcome_back_down",
			},
			choiceY: {
				id: "choiceY",
				label: "Eskalovat",
				description: "Zveřejníš důkazy veřejně. Riskantní tah.",
				baseReward: 400,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_public_fight",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Taking the bribe
	// =========================================================================
	outcome_take_bribe: {
		id: "outcome_take_bribe",
		type: "outcome",
		narrative: `💸 "Dobře, beru to." Transfer probíhá... Ale sleduje vás někdo?`,
		successChance: 70,
		successNodeId: "terminal_bribe_success",
		failNodeId: "terminal_caught_corruption",
	},

	// =========================================================================
	// OUTCOME: Public fight
	// =========================================================================
	outcome_public_fight: {
		id: "outcome_public_fight",
		type: "outcome",
		narrative: `📢 Postuješ důkazy na veřejný kanál. Community sleduje drama...`,
		successChance: 70,
		successNodeId: "terminal_exposed_cheater",
		failNodeId: "terminal_mutual_damage",
	},

	// =========================================================================
	// OUTCOME: Quick report submission
	// =========================================================================
	outcome_quick_report: {
		id: "outcome_quick_report",
		type: "outcome",
		narrative: `📤 Posíláš adminovi to, co máš. Doufáš, že omezené důkazy budou stačit...`,
		successChance: 70,
		successNodeId: "terminal_quick_report",
		failNodeId: "terminal_quick_report_fail",
	},

	// =========================================================================
	// OUTCOME: Giving up on the case
	// =========================================================================
	outcome_give_up: {
		id: "outcome_give_up",
		type: "outcome",
		narrative: `🚶 Zavíráš logy a odcházíš. Možná se to vyřeší samo...`,
		successChance: 70,
		successNodeId: "terminal_ignored",
		failNodeId: "terminal_ignored_regret",
	},

	// =========================================================================
	// OUTCOME: Refusing the bribe
	// =========================================================================
	outcome_refuse_bribe: {
		id: "outcome_refuse_bribe",
		type: "outcome",
		narrative: `🚫 "Ne. Tohle nahlásím." Podvodník zbledne. Připravuješ report pro adminy...`,
		successChance: 70,
		successNodeId: "terminal_moral_victory",
		failNodeId: "terminal_moral_victory_fail",
	},

	// =========================================================================
	// OUTCOME: Backing down from confrontation
	// =========================================================================
	outcome_back_down: {
		id: "outcome_back_down",
		type: "outcome",
		narrative: `😔 Ustupuješ a snažíš se z toho vycouváat. Podvodník sleduje tvůj každý krok...`,
		successChance: 70,
		successNodeId: "terminal_intimidated",
		failNodeId: "terminal_intimidated_worse",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings + 4 new failure terminals)
	// =========================================================================

	// Positive endings (8)
	terminal_thorough_success: {
		id: "terminal_thorough_success",
		type: "terminal",
		narrative: `🏆 **Perfektní práce!**

Tvá důkladná investigace poskytla adminům všechno, co potřebovali. Podvodník dostal ban a ty dostáváš **+350 mincí** jako odměnu za výjimečnou práci.

Férovost serveru je obnovena díky tobě!`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_quick_report: {
		id: "terminal_quick_report",
		type: "terminal",
		narrative: `✅ **Rychlé řešení**

Admin přijal tvůj report i s omezenými důkazy. Podvodník byl varován a sledován.

Dostáváš **+200 mincí** za pomoc. Není to velká odměna, ale férově jsi splnil svou povinnost.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_vindicated: {
		id: "terminal_vindicated",
		type: "terminal",
		narrative: `💪 **Dokázal jsi to!**

Tvá vytrvalost se vyplatila! Našel jsi nezvratné důkazy a admin je přijal s omluvou.

Získáváš **+300 mincí** a respekt za to, že jsi nevzdal.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_bribe_success: {
		id: "terminal_bribe_success",
		type: "terminal",
		narrative: `🤫 **Úplatek přijat**

Transfer proběhl úspěšně a nikdo vás nesledoval. Získáváš **+800 mincí**.

Podvodník pokračuje v podvádění a ty mlčíš. Morálně pochybné, ale lukrativní.`,
		coinsChange: 800,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_moral_victory: {
		id: "terminal_moral_victory",
		type: "terminal",
		narrative: `😇 **Morální vítězství**

Odmítl jsi úplatek a nahlásil podvodníka adminům. Dostal ban.

Získáváš **+250 mincí** jako odměnu a čisté svědomí. Někdy je správná volba ta těžší.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_exposed_cheater: {
		id: "terminal_exposed_cheater",
		type: "terminal",
		narrative: `📢 **Veřejné odhalení!**

Community je na tvé straně! Důkazy jsou jasné a podvodník je veřejně zostuzen.

Admini tě odměňují **+400 mincemi** za odvahu a získáváš respekt komunity.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_ignored: {
		id: "terminal_ignored",
		type: "terminal",
		narrative: `🤷 **Ponecháno osudu**

Rozhodl jsi se to vzdát. Není to tvůj problém a máš důležitější věci na práci.

Nezískáváš nic, ale také nic neztrácíš. Život jde dál.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_intimidated: {
		id: "terminal_intimidated",
		type: "terminal",
		narrative: `😨 **Zastrašen**

Rozhodl jsi se ustoupit. Podvodník vítězí a ty odcházíš s prázdnou.

Neztrácíš nic, ale ani nezískáváš. Příště možná buď odvážnější.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.7,
	},

	// Negative endings (3)
	terminal_incomplete: {
		id: "terminal_incomplete",
		type: "terminal",
		narrative: `😞 **Nedostatečné důkazy**

I přes tvé úsilí se ti nepodařilo najít dostatečně přesvědčivé důkazy. Admin report odmítl.

Ztratil jsi čas a dostáváš varování za falešné obvinění. **-100 mincí** pokuta.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_dismissed: {
		id: "terminal_dismissed",
		type: "terminal",
		narrative: `🚫 **Odmítnut**

Tvůj druhý pokus byl také neúspěšný. Admin ztrácí trpělivost.

"Přestaň ztrácet náš čas." Dostáváš **-150 mincí** pokutu za spam reportů.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_caught_corruption: {
		id: "terminal_caught_corruption",
		type: "terminal",
		narrative: `🚨 **Chyceni!**

Anti-cheat systém zaznamenal podezřelou transakci! Admin zasahuje okamžitě.

Ty i podvodník dostáváte ban na ekonomické příkazy a pokutu **-1200 mincí**. Korupce se nevyplácí.`,
		coinsChange: -1200,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_mutual_damage: {
		id: "terminal_mutual_damage",
		type: "terminal",
		narrative: `💥 **Vzájemné zničení**

Podvodník splnil svou hrozbu! Zveřejnil falešné důkazy proti tobě a vznikl chaos.

Admin vás oba potrestá za veřejné drama. **-800 mincí** pokuta. Příště to řeš soukromě.`,
		coinsChange: -800,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_quick_report_fail: {
		id: "terminal_quick_report_fail",
		type: "terminal",
		narrative: `📝 **Nedostatečný report**

Admin si přečetl tvůj rychlý report, ale bez dalších důkazů ho smetl ze stolu. Ztratil jsi čas a důvěryhodnost.

**-50 mincí** za zbytečné obtěžování.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_ignored_regret: {
		id: "terminal_ignored_regret",
		type: "terminal",
		narrative: `😞 **Špatné svědomí**

Vzdal jsi to, ale podvodník si všiml tvého zájmu. Začal šířit fámy, že jsi to ty, kdo podvádí.

Musíš se bránit a ztrácíš **-100 mincí** na očištění svého jména.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_moral_victory_fail: {
		id: "terminal_moral_victory_fail",
		type: "terminal",
		narrative: `😤 **Komplikované odmítnutí**

Odmítl jsi úplatek a nahlásil podvodníka, ale ten mezitím smazal důkazy. Admin ti nevěří.

Žádná odměna a ztráta **-80 mincí** za čas strávený marným reportem.`,
		coinsChange: -80,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_intimidated_worse: {
		id: "terminal_intimidated_worse",
		type: "terminal",
		narrative: `😰 **Zastrašen a ponížen**

Ustoupil jsi, ale podvodník tě stejně nahlásil adminům za "obtěžování". Musíš se obhajovat.

Ztrácíš **-120 mincí** a spoustu nervů.`,
		coinsChange: -120,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},
};

export const revealCheatingBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 22,
	averageReward: 220,
	maxPossibleReward: 800, // Confront success + bribe success
	minPossibleReward: -1200, // Confront success + bribe caught
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(revealCheatingBranchingStory);
