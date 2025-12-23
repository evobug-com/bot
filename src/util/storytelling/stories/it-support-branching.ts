/**
 * IT Support - Branching Story
 *
 * Branching narrative about fixing computer/network problems.
 * Features 3 decision layers and 12 unique endings (8 positive, 4 negative = 67% positive rate).
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Diagnostic Approach]
 *   -> Quick Fix -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Additional Work]
 *       -> Check Security -> [OUTCOME] -> [TERMINAL: Found Vulnerability/Nothing Special]
 *       -> Optimize System -> [OUTCOME] -> [TERMINAL: Speed Boost/Broke Something]
 *     -> Failure -> [DECISION 2b: Problem Escalated]
 *       -> Restart System -> [OUTCOME] -> [TERMINAL: Fixed After Restart/Total Crash]
 *       -> Call Senior -> [TERMINAL: Saved by Senior]
 *   -> Thorough Analysis -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: What You Found]
 *       -> Driver Issue -> [OUTCOME] -> [TERMINAL: Perfect Fix/Update Failed]
 *       -> Configuration -> [TERMINAL: Configuration Success]
 *     -> Failure -> [DECISION 2d: Diagnosis Failed]
 *       -> Try Anyway -> [OUTCOME] -> [TERMINAL: Lucky Guess/Made it Worse]
 *       -> Research Online -> [TERMINAL: Found Solution]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "it_support_branching";
const STORY_TITLE = "IT Podpora";
const STORY_EMOJI = "💻";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Kolega z účetního oddělení tě zastavuje na chodbě: "Pomoz mi, můj počítač je strašně pomalý a občas se zasekává!"

Díváš se na něj a uvažuješ, jak problém vyřešit. Máš čas si ho pořádně prohlédnout, nebo zkusíš rychlou opravu?`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Diagnostic Approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Sedíš u jeho počítače. Systém opravdu pomalý, ale není čas na detailní analýzu...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rychlá oprava",
				description: "Vyzkouším obvyklé problémy - restart služeb, vyčištění temp souborů.",
				baseReward: 150,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_quick_fix",
			},
			choiceY: {
				id: "choiceY",
				label: "Důkladná analýza",
				description: "Provedu kompletní diagnostiku - logy, procesy, hardware monitoring.",
				baseReward: 250,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_thorough_analysis",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Quick Fix
	// =========================================================================
	outcome_quick_fix: {
		id: "outcome_quick_fix",
		type: "outcome",
		narrative: `⚡ Rychle procházíš základní věci - restartuješ služby, mažeš temp soubory, kontroluješ startup programy...`,
		successChance: 70,
		successNodeId: "decision_2a_additional",
		failNodeId: "decision_2b_escalated",
	},

	// =========================================================================
	// OUTCOME: Thorough Analysis
	// =========================================================================
	outcome_thorough_analysis: {
		id: "outcome_thorough_analysis",
		type: "outcome",
		narrative: `🔍 Spouštíš diagnostické nástroje, kontroluješ systémové logy, monitoruješ procesy a hardware...`,
		successChance: 70,
		successNodeId: "decision_2c_found",
		failNodeId: "decision_2d_diagnosis_failed",
	},

	// =========================================================================
	// DECISION 2a: Additional Work (Quick Fix Success)
	// =========================================================================
	decision_2a_additional: {
		id: "decision_2a_additional",
		type: "decision",
		narrative: `✅ **Funguje to!** Počítač běží znatelně rychleji. Kolega je spokojený.

Máš ještě pár minut času. Co uděláš?`,
		coinsChange: 150,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zkontrolovat bezpečnost",
				description: "Provedu rychlý security audit - možná najdu nějaké zranitelnosti.",
				baseReward: 600,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_security_check",
			},
			choiceY: {
				id: "choiceY",
				label: "Optimalizovat systém",
				description: "Vypnu zbytečné služby a nastavím výkon na maximum.",
				baseReward: 200,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_optimize",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Problem Escalated (Quick Fix Failed)
	// =========================================================================
	decision_2b_escalated: {
		id: "decision_2b_escalated",
		type: "decision",
		narrative: `😰 **Problém přetrvává!** Systém je stále pomalý a teď se objevují divné chybové hlášky.

Kolega nervózně sleduje obrazovku. Co zkusíš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Restartovat systém",
				description: "Tvrdý restart může pomoci. Nebo to může všechno zhoršit...",
				baseReward: 100,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_restart",
			},
			choiceY: {
				id: "choiceY",
				label: "Zavolat seniora",
				description: "Raději požádám o pomoc zkušenějšího kolegu.",
				baseReward: 50,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_senior_help",
			},
		},
	},

	// =========================================================================
	// DECISION 2c: What You Found (Thorough Analysis Success)
	// =========================================================================
	decision_2c_found: {
		id: "decision_2c_found",
		type: "decision",
		narrative: `🎯 **Našel jsi problém!** Diagnostika odhalila důvod zpomalení.

Co to je?`,
		coinsChange: 100,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zastaralý ovladač GPU",
				description: "Grafická karta běží na starém ovladači. Aktualizuji ho.",
				baseReward: 250,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_driver_update",
			},
			choiceY: {
				id: "choiceY",
				label: "Špatná konfigurace",
				description: "Někdo změnil registry nastavení. Vrátím výchozí hodnoty.",
				baseReward: 200,
				riskMultiplier: 0.8,
				nextNodeId: "terminal_config_fix",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Diagnosis Failed (Thorough Analysis Failed)
	// =========================================================================
	decision_2d_diagnosis_failed: {
		id: "decision_2d_diagnosis_failed",
		type: "decision",
		narrative: `❌ **Nic jsi nenašel!** Všechny testy vypadají normálně, ale počítač je stále pomalý.

Kolega se ptá, co bude dál. Máš nápad?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zkusit to naslepo",
				description: "Reinstaluju Windows. Možná to pomůže... nebo ne.",
				baseReward: 150,
				riskMultiplier: 1.5,
				nextNodeId: "outcome_blind_fix",
			},
			choiceY: {
				id: "choiceY",
				label: "Hledat na internetu",
				description: "Podívám se na fóra a dokumentaci výrobce.",
				baseReward: 180,
				riskMultiplier: 0.8,
				nextNodeId: "terminal_online_solution",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Security Check
	// =========================================================================
	outcome_security_check: {
		id: "outcome_security_check",
		type: "outcome",
		narrative: `🔒 Spouštíš security scan a kontroluješ otevřené porty, běžící procesy a síťovou komunikaci...`,
		successChance: 70,
		successNodeId: "terminal_vulnerability_found",
		failNodeId: "terminal_security_nothing",
	},

	// =========================================================================
	// OUTCOME: Optimize System
	// =========================================================================
	outcome_optimize: {
		id: "outcome_optimize",
		type: "outcome",
		narrative: `⚙️ Vypínáš zbytečné služby, upravuješ nastavení výkonu, měníš priority procesů...`,
		successChance: 70,
		successNodeId: "terminal_optimized",
		failNodeId: "terminal_broke_optimization",
	},

	// =========================================================================
	// OUTCOME: Restart System
	// =========================================================================
	outcome_restart: {
		id: "outcome_restart",
		type: "outcome",
		narrative: `🔄 Zmáčkneš tlačítko restartu a modlíš se, aby to pomohlo...`,
		successChance: 70,
		successNodeId: "terminal_restart_success",
		failNodeId: "terminal_total_crash",
	},

	// =========================================================================
	// OUTCOME: Driver Update
	// =========================================================================
	outcome_driver_update: {
		id: "outcome_driver_update",
		type: "outcome",
		narrative: `📥 Stahuješ nejnovější ovladač GPU od výrobce a instaluješ ho...`,
		successChance: 70,
		successNodeId: "terminal_driver_success",
		failNodeId: "terminal_driver_failed",
	},

	// =========================================================================
	// OUTCOME: Blind Fix
	// =========================================================================
	outcome_blind_fix: {
		id: "outcome_blind_fix",
		type: "outcome",
		narrative: `🎲 Spouštíš reinstalaci Windows bez zálohy. Riskantní tah...`,
		successChance: 70,
		successNodeId: "terminal_lucky_guess",
		failNodeId: "terminal_data_loss",
	},

	// =========================================================================
	// TERMINAL NODES (12 endings: 8 positive, 4 negative)
	// =========================================================================

	// Positive endings (8)
	terminal_vulnerability_found: {
		id: "terminal_vulnerability_found",
		type: "terminal",
		narrative: `🚨 **KRITICKÉ ZJIŠTĚNÍ!**

Našel jsi backdoor! Počítač byl kompromitován malwarem, který pomalu kradl firemní data.

Bezpečnostní tým je alarmován a ty dostáváš vysokou odměnu za záchranu firmy: **+700 mincí**!`,
		coinsChange: 700,
		isPositiveEnding: true,
		xpMultiplier: 2.0,
	},

	terminal_optimized: {
		id: "terminal_optimized",
		type: "terminal",
		narrative: `🚀 **PERFEKTNÍ VÝKON!**

Optimalizace funguje skvěle! Počítač teď běží 3x rychleji než před tím.

Kolega je nadšený a šéf oddělení ti přiděluje bonus: **+250 mincí**.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_restart_success: {
		id: "terminal_restart_success",
		type: "terminal",
		narrative: `✅ **TO FUNGOVALO!**

Po restartu všechno běží jak má. Někdy nejjednodušší řešení je to nejlepší.

Získáváš standardní bonus: **+120 mincí**.`,
		coinsChange: 120,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_config_fix: {
		id: "terminal_config_fix",
		type: "terminal",
		narrative: `⚙️ **KONFIGURACE OPRAVENA!**

Vrátil jsi správné hodnoty v registry a systém zase funguje perfektně.

Tvá profesionalita je oceněna: **+280 mincí**.`,
		coinsChange: 280,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_driver_success: {
		id: "terminal_driver_success",
		type: "terminal",
		narrative: `🎮 **JAKO NOVÝ!**

Nový ovladač vyřešil všechny problémy. Počítač běží rychle a stabilně.

Kolega ti přináší kávu a dáváš **+300 mincí** za perfektní práci.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_online_solution: {
		id: "terminal_online_solution",
		type: "terminal",
		narrative: `📚 **NAŠEL JSI TO!**

Na fóru jsi našel přesně stejný problém. Někdo měl konflikt mezi antivirem a Windows Update.

Vyřešil jsi to podle návodu a dostáváš **+220 mincí**.`,
		coinsChange: 220,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_lucky_guess: {
		id: "terminal_lucky_guess",
		type: "terminal",
		narrative: `🍀 **ŠTĚSTÍ PŘEJE PŘIPRAVENÝM!**

Reinstalace Windows pomohla! Problém byl v poškozeném systémovém souboru.

Riskantní tah se vyplatil: **+200 mincí**.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_senior_help: {
		id: "terminal_senior_help",
		type: "terminal",
		narrative: `👨‍🏫 **ZACHRÁNĚN SENIOREM**

Senior IT kolega problém vyřešil za 5 minut. Byl to memory leak v jedné službě.

Alespoň ses něco naučil. Dostáváš malý bonus: **+80 mincí**.`,
		coinsChange: 80,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	// Negative endings (4)
	terminal_security_nothing: {
		id: "terminal_security_nothing",
		type: "terminal",
		narrative: `😐 **NIC ZVLÁŠTNÍHO**

Security scan nenašel nic zajímavého. Ztrátil jsi čas.

Kolega je sice spokojený s původní opravou, ale za zbytečný security audit tě šéf pokáral: **-50 mincí**.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_broke_optimization: {
		id: "terminal_broke_optimization",
		type: "terminal",
		narrative: `💥 **POKAZIL JSI TO!**

Vypnul jsi důležitou službu a teď se systém vůbec nespustí.

IT tým musí reinstalovat Windows. Pokuta: **-300 mincí**.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_total_crash: {
		id: "terminal_total_crash",
		type: "terminal",
		narrative: `🔥 **KATASTROFA!**

Po restartu se systém vůbec nenačte. Disk je pravděpodobně poškozený.

Data jsou ztracena a ty platíš pokutu: **-500 mincí**.`,
		coinsChange: -500,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_driver_failed: {
		id: "terminal_driver_failed",
		type: "terminal",
		narrative: `❌ **UPDATE SELHAL!**

Nový ovladač není kompatibilní a způsobil BSOD. Počítač se teď ani nespustí.

Musíš zavolat IT oddělení a platit pokutu: **-200 mincí**.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_data_loss: {
		id: "terminal_data_loss",
		type: "terminal",
		narrative: `💀 **ZTRÁTA DAT!**

Reinstalace smazala důležité dokumenty kolegy. Nebyla záloha!

Kolega je naštvaný, šéf je naštvaný, všichni jsou naštvaní. Pokuta: **-800 mincí**.`,
		coinsChange: -800,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},
};

export const itSupportBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 24,
	averageReward: 180,
	maxPossibleReward: 1050, // Quick fix success + security found (150 + 700 + 100 + 100)
	minPossibleReward: -800, // Thorough analysis + blind fix fail (100 - 800 + some from path)
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(itSupportBranchingStory);
