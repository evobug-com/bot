/**
 * Server Room - Branching Story
 *
 * Branching narrative about a server room adventure.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Check racks or Check undocumented server]
 *   -> Check racks -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Quick fix or Proper replacement]
 *       -> Quick   -> [OUTCOME] -> [TERMINAL: Quick success/Quick fail]
 *       -> Proper  -> [OUTCOME] -> [TERMINAL: Hero/Too slow]
 *     -> Failure -> [DECISION 2b: Call backup or Try yourself]
 *       -> Backup  -> [TERMINAL: Team effort]
 *       -> Yourself -> [OUTCOME] -> [TERMINAL: Lucky fix/Major outage]
 *   -> Check undocumented -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Report or Investigate deeper]
 *       -> Report    -> [TERMINAL: Whistleblower reward]
 *       -> Investigate -> [OUTCOME] -> [TERMINAL: Evidence/Caught]
 *     -> Failure -> [DECISION 2d: Leave or Disconnect]
 *       -> Leave      -> [TERMINAL: Play it safe]
 *       -> Disconnect -> [TERMINAL: Caught tampering]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "server_room_branching";
const STORY_TITLE = "Dobrodružství v serverovně";
const STORY_EMOJI = "🖥️";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Vstupuješ do serverovny s blikajícími LED diodami a hučícími ventilátory. Je tu zima jako na Antarktidě - měl jsi vzít bundu.

Monitoring hlásí nějaký problém, ale není jasné, co přesně se děje. Všimneš si dvou věcí najednou:
- V hlavních racích bliká červená LED
- V rohu stojí server, který není v dokumentaci

*Co provedeš jako první?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Check racks or Check undocumented server
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Hučení ventilátorů je skoro hypnotické. Musíš se rozhodnout, kam půjdeš nejdřív.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zkontrolovat racky",
				description: "Červená LED znamená problém. Měl bys to řešit hned.",
				baseReward: 500,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_check_racks",
			},
			choiceY: {
				id: "choiceY",
				label: "Prozkoumat neznámý server",
				description: "Server, který není v dokumentaci? To je divné...",
				baseReward: 300,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_check_unknown",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Checking racks
	// =========================================================================
	outcome_check_racks: {
		id: "outcome_check_racks",
		type: "outcome",
		narrative: `🔍 Přecházíš k hlavním rackům a hledáš zdroj červeného blikání...`,
		successChance: 70,
		successNodeId: "decision_2a_found_disk",
		failNodeId: "decision_2b_cant_find",
	},

	// =========================================================================
	// DECISION 2a: Found failing disk - quick fix or proper replacement
	// =========================================================================
	decision_2a_found_disk: {
		id: "decision_2a_found_disk",
		type: "decision",
		narrative: `🔴 **Našel jsi problém!** Jeden disk v RAID poli bliká červeně - má poruchu.

Máš na výběr:
- Udělat rychlou výměnu disku (5 minut, ale riskantní)
- Udělat to podle předpisů - zastavit služby, vyměnit disk, restart (30 minut, bezpečné)`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rychlá výměna",
				description: "Hot-swap, bez zastavení služeb. Riziko, ale rychlé.",
				baseReward: 400,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_quick_fix",
			},
			choiceY: {
				id: "choiceY",
				label: "Podle předpisů",
				description: "Správný postup. Trvá déle, ale je bezpečný.",
				baseReward: 600,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_proper_fix",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Can't find the problem
	// =========================================================================
	decision_2b_cant_find: {
		id: "decision_2b_cant_find",
		type: "decision",
		narrative: `😰 **Nic nenacházíš!** Všechny LED blikají normálně, ale monitoring stále hlásí problém.

Možná je čas zavolat posily, nebo to zkusit řešit sám jinak...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zavolat backup",
				description: "Senior admin ti pomůže. Bezpečná volba.",
				baseReward: 150,
				riskMultiplier: 0.6,
				nextNodeId: "terminal_team_effort",
			},
			choiceY: {
				id: "choiceY",
				label: "Zkusit restart",
				description: "\"Have you tried turning it off and on again?\" Riskantní.",
				baseReward: 300,
				riskMultiplier: 1.5,
				nextNodeId: "outcome_desperate_restart",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Quick fix
	// =========================================================================
	outcome_quick_fix: {
		id: "outcome_quick_fix",
		type: "outcome",
		narrative: `⚡ Vytahuješ vadný disk a vsazuješ nový. RAID controller začíná rebuild za běhu...`,
		successChance: 70,
		successNodeId: "terminal_quick_success",
		failNodeId: "terminal_quick_fail",
	},

	// =========================================================================
	// OUTCOME: Proper fix
	// =========================================================================
	outcome_proper_fix: {
		id: "outcome_proper_fix",
		type: "outcome",
		narrative: `📋 Postupuješ podle manuálu. Oznámíš downtime, zastavíš služby, vyměňuješ disk...`,
		successChance: 70,
		successNodeId: "terminal_hero",
		failNodeId: "terminal_too_slow",
	},

	// =========================================================================
	// OUTCOME: Desperate restart
	// =========================================================================
	outcome_desperate_restart: {
		id: "outcome_desperate_restart",
		type: "outcome",
		narrative: `🎲 Bereš to od podlahy. Restartuješ všechny služby a modlíš se...`,
		successChance: 70,
		successNodeId: "terminal_lucky_fix",
		failNodeId: "terminal_major_outage",
	},

	// =========================================================================
	// OUTCOME: Checking unknown server
	// =========================================================================
	outcome_check_unknown: {
		id: "outcome_check_unknown",
		type: "outcome",
		narrative: `🤔 Přecházíš k neznámému serveru. Není v žádné dokumentaci, ale běží...`,
		successChance: 70,
		successNodeId: "decision_2c_found_mining",
		failNodeId: "decision_2d_triggered_alarm",
	},

	// =========================================================================
	// DECISION 2c: Found crypto mining
	// =========================================================================
	decision_2c_found_mining: {
		id: "decision_2c_found_mining",
		type: "decision",
		narrative: `⛏️ **To není možné!** Server těží kryptoměny! Někdo tu tajně provozuje mining rig na elektřině firmy.

Co teď?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Nahlásit security",
				description: "Oznam to bezpečnostnímu týmu. Správná cesta.",
				baseReward: 300,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_whistleblower",
			},
			choiceY: {
				id: "choiceY",
				label: "Prohledat důkazy",
				description: "Zjisti, kdo za tím stojí. Riskantní, ale zajímavé.",
				baseReward: 500,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_investigate",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Triggered alarm
	// =========================================================================
	decision_2d_triggered_alarm: {
		id: "decision_2d_triggered_alarm",
		type: "decision",
		narrative: `🚨 **ALARM!** Když ses dotkl serveru, spustil se nějaký monitoring alert.

Někdo určitě ví, že jsi u toho serveru. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rychle odejít",
				description: "Vrať se k hlavnímu úkolu, jako by se nic nestalo.",
				baseReward: 50,
				riskMultiplier: 0.8,
				nextNodeId: "terminal_play_safe",
			},
			choiceY: {
				id: "choiceY",
				label: "Odpojit server",
				description: "Vypni ten podezřelý server. Může to být bezpečnostní riziko.",
				baseReward: 200,
				riskMultiplier: 1.4,
				nextNodeId: "terminal_caught_tampering",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Investigating deeper
	// =========================================================================
	outcome_investigate: {
		id: "outcome_investigate",
		type: "outcome",
		narrative: `🕵️ Prohledáváš logy serveru. Hledáš, kdo to nainstaloval...`,
		successChance: 70,
		successNodeId: "terminal_evidence",
		failNodeId: "terminal_caught_snooping",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_hero: {
		id: "terminal_hero",
		type: "terminal",
		narrative: `🦸 **HRDINA DNE!**

Postupoval jsi podle předpisů, vyměnil disk správně a RAID rebuild proběhl bez problémů. Zachránil jsi kritická zákaznická data.

CEO ti osobně volá a děkuje. Dostáváš bonus **+650 mincí**.

*"Kdyby ses zdržoval u toho divného serveru, mohl jsi přijít pozdě. Dobré rozhodnutí."*`,
		coinsChange: 650,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_quick_success: {
		id: "terminal_quick_success",
		type: "terminal",
		narrative: `⚡ **Rychlá záchrana!**

Hot-swap vyšel! RAID rebuild běží bez problémů a služby ani nepřestaly fungovat.

Ušetřil jsi firmě hodiny downtime. Dostáváš **+450 mincí**.

*Někdy se rychlé řešení vyplatí.*`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_team_effort: {
		id: "terminal_team_effort",
		type: "terminal",
		narrative: `🤝 **Týmová práce**

Senior admin ti poradil, kde hledat. Společně jste našli problém v síťové kartě a rychle ji vyměnili.

Dostáváš **+200 mincí** a respekt za to, že jsi věděl, kdy zavolat pomoc.

*"Lepší se zeptat než rozbít produkci."*`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_lucky_fix: {
		id: "terminal_lucky_fix",
		type: "terminal",
		narrative: `🍀 **Štěstí přeje připraveným!**

Restart pomohl! Byl to jen zaseklý proces, který blokoval monitoring.

Firma ti dává **+350 mincí** za rychlé řešení.

*Někdy nejjednodušší řešení je to správné.*`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_whistleblower: {
		id: "terminal_whistleblower",
		type: "terminal",
		narrative: `💎 **Odhalení insider threat!**

Security tým prošetřil server a zjistil, že mining rig nainstaloval noční hlídač. Je okamžitě propuštěn.

Firma ti dává finder's fee **+350 mincí** a jsi zmíněn v bezpečnostním newsletteru.

*Správná věc není vždy populární, ale vyplatí se.*`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_evidence: {
		id: "terminal_evidence",
		type: "terminal",
		narrative: `🎯 **Detektivní práce!**

V lozích jsi našel přesné důkazy - IP adresu, čas instalace, dokonce i jméno účtu. Security má všechno, co potřebuje.

Dostáváš **+550 mincí** za důkladnou práci.

*Někdy se vyplatí riskovat pro větší odměnu.*`,
		coinsChange: 550,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_play_safe: {
		id: "terminal_play_safe",
		type: "terminal",
		narrative: `🚶 **Bezpečná volba**

Vrátil ses k původnímu úkolu. Server zůstal záhadou, ale hlavní problém jsi vyřešil.

Dostáváš standardních **+100 mincí**.

*Někdy je lepší nedělat vlny.*`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_too_slow: {
		id: "terminal_too_slow",
		type: "terminal",
		narrative: `⏰ **O vlas později...**

Postupoval jsi správně, ale zatímco jsi vypínal služby, druhý disk selhal. RAID je degradovaný, ale data jsou zachráněná.

Žádný bonus, ale aspoň žádná škoda. **+50 mincí** za snahu.

*Timing je všechno.*`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	// Negative endings (3)
	terminal_quick_fail: {
		id: "terminal_quick_fail",
		type: "terminal",
		narrative: `💥 **Hot-swap selhání!**

Při výměně se něco pokazilo - server ztratil celé RAID pole. Data jsou pryč.

Firma musí obnovovat ze záloh. Pokuta **-350 mincí**.

*Některá rizika se nevyplatí podstupovat.*`,
		coinsChange: -350,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_major_outage: {
		id: "terminal_major_outage",
		type: "terminal",
		narrative: `🔥 **KATASTROFA!**

Restart způsobil kaskádové selhání. Celá serverovna je offline. Customers křičí, management běsní.

Jsi ve zkušební době. Pokuta **-500 mincí**.

*"Have you tried NOT turning it off and on again?"*`,
		coinsChange: -500,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_caught_snooping: {
		id: "terminal_caught_snooping",
		type: "terminal",
		narrative: `🚔 **Přistižen při činu!**

Majitel mining rigu tě nachytal u serveru. Je to vedoucí IT oddělení.

Nemůžeš to nahlásit, protože jsi byl u serveru bez autorizace. Musíš mlčet. Ztráta prestiže: **-250 mincí**.

*Někdy je lepší se nedívat pod poklop.*`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_caught_tampering: {
		id: "terminal_caught_tampering",
		type: "terminal",
		narrative: `⚠️ **Neoprávněná manipulace!**

Odpojil jsi server, který patřil R&D oddělení - pracovali na tajném projektu. Alarm je volal.

Musíš vysvětlovat a omlouvat se. Škoda na reputaci: **-200 mincí**.

*Příště se zeptej dřív, než něco odpojíš.*`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},
};

export const serverRoomBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 22,
	averageReward: 250,
	maxPossibleReward: 650, // Hero ending
	minPossibleReward: -500, // Major outage
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(serverRoomBranchingStory);
