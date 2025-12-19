/**
 * Coffee Machine - Branching Story
 *
 * A Mass Effect-style branching narrative about using a new super-automatic coffee machine.
 * Features 3 decision layers and 12 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Read Manual or Wing It]
 *   -> Read Manual -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Safe or Experimental]
 *       -> Safe -> [OUTCOME] -> [TERMINAL: Perfect/Bland]
 *       -> Experimental -> [OUTCOME] -> [TERMINAL: Secret Menu/Malfunction]
 *     -> Failure -> [DECISION 2b: Ask for Help]
 *       -> Ask IT -> [TERMINAL: IT Guru]
 *       -> Try Anyway -> [OUTCOME] -> [TERMINAL: Lucky/Flood]
 *   -> Wing It -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Share or Keep Secret]
 *       -> Share -> [OUTCOME] -> [TERMINAL: Hero/Jealousy]
 *       -> Keep Secret -> [TERMINAL: Personal Barista]
 *     -> Failure -> [DECISION 2d: Panic Response]
 *       -> Stay Calm -> [OUTCOME] -> [TERMINAL: Fixed/Explosion]
 *       -> Run Away -> [TERMINAL: Coward]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "coffee_machine_branching";
const STORY_TITLE = "Kávový automat";
const STORY_EMOJI = "☕";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `☕ **${STORY_TITLE}**

Přicházíš do kuchyňky a vidíš nový super-automatický kávovar. Je to technologický zázrak - dotykový displej, LED podsvícení, desítky tlačítek!

Ovládací panel vypadá jako kokpit letadla. Vedle leží tlustý manuál v němčině. *Co uděláš?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Read Manual or Wing It
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Kávovar na tebe hledí svými LED světly. Máš dvě možnosti - přečíst si manuál a dělat to správně, nebo prostě zkusit něco zmáčknout.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Přečíst manuál",
				description: "Bezpečná varianta. Chvíli to potrvá, ale budeš vědět co děláš.",
				baseReward: 200,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_manual",
			},
			choiceY: {
				id: "choiceY",
				label: "Prostě to zkusit",
				description: "Kdo potřebuje manuály? Riskantní, ale rychlé!",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_wing_it",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Reading Manual
	// =========================================================================
	outcome_manual: {
		id: "outcome_manual",
		type: "outcome",
		narrative: `📖 Otevíráš manuál a snažíš se přeložit německé instrukce...`,
		successChance: 70,
		successNodeId: "decision_2a_learned",
		failNodeId: "decision_2b_confused",
	},

	// =========================================================================
	// DECISION 2a: Successfully learned - Safe or Experimental
	// =========================================================================
	decision_2a_learned: {
		id: "decision_2a_learned",
		type: "decision",
		narrative: `✅ **Pochopil jsi to!** Teď víš jak kávovar funguje.

Máš na výběr - udělat bezpečné základní espresso podle návodu, nebo zkusit pokročilý "Barista Mode" o kterém manuál mluví.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Bezpečné espresso",
				description: "Základní varianta podle návodu. Garantovaný úspěch.",
				baseReward: 150,
				riskMultiplier: 0.5,
				nextNodeId: "outcome_safe_coffee",
			},
			choiceY: {
				id: "choiceY",
				label: "Barista Mode",
				description: "Pokročilá funkce. Může být úžasné... nebo katastrofa.",
				baseReward: 450,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_barista_mode",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Manual too confusing
	// =========================================================================
	decision_2b_confused: {
		id: "decision_2b_confused",
		type: "decision",
		narrative: `😵 **Moc složité!** Německý manuál je plný technických výrazů, kterým nerozumíš.

Co teď?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zavolat IT oddělení",
				description: "Ti určitě budou vědět. Profesionální přístup.",
				baseReward: 100,
				riskMultiplier: 0.6,
				nextNodeId: "terminal_it_guru",
			},
			choiceY: {
				id: "choiceY",
				label: "Zkusit to stejně",
				description: "Kolik může být možností? Zkusíš štěstí.",
				baseReward: 300,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_blind_attempt",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Safe coffee
	// =========================================================================
	outcome_safe_coffee: {
		id: "outcome_safe_coffee",
		type: "outcome",
		narrative: `☕ Stiskuješ tlačítko "Espresso Standard". Kávovar tiše začíná pracovat...`,
		successChance: 70,
		successNodeId: "terminal_perfect_coffee",
		failNodeId: "terminal_bland_coffee",
	},

	// =========================================================================
	// OUTCOME: Barista Mode
	// =========================================================================
	outcome_barista_mode: {
		id: "outcome_barista_mode",
		type: "outcome",
		narrative: `🎨 Aktivuješ Barista Mode. Displej se rozzáří novými možnostmi - teplota, tlak, doba extrakce...

Nastavuješ parametry podle intuice...`,
		successChance: 70,
		successNodeId: "terminal_secret_menu",
		failNodeId: "terminal_malfunction",
	},

	// =========================================================================
	// OUTCOME: Blind attempt after failed manual reading
	// =========================================================================
	outcome_blind_attempt: {
		id: "outcome_blind_attempt",
		type: "outcome",
		narrative: `🎲 Zavřeš manuál a zkusíš náhodnou kombinaci tlačítek...`,
		successChance: 70,
		successNodeId: "terminal_lucky_shot",
		failNodeId: "terminal_flood",
	},

	// =========================================================================
	// OUTCOME: Winging it without manual
	// =========================================================================
	outcome_wing_it: {
		id: "outcome_wing_it",
		type: "outcome",
		narrative: `🤞 Ignoruješ manuál a prostě zmáčkneš několik tlačítek, která vypadají důležitě...`,
		successChance: 70,
		successNodeId: "decision_2c_success",
		failNodeId: "decision_2d_panic",
	},

	// =========================================================================
	// DECISION 2c: Wing it succeeded - Share or Keep Secret
	// =========================================================================
	decision_2c_success: {
		id: "decision_2c_success",
		type: "decision",
		narrative: `🌟 **Neuvěřitelné!** Kávovar právě vyrobil perfektní kávu a objevil se text: "EXPERT MODE UNLOCKED"

Tohle je zlatý důl! Budeš to sdílet s kolegy, nebo si to necháš pro sebe?`,
		coinsChange: 300,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Sdílet s kolegy",
				description: "Budeš hrdina kanceláře! Ale někdo může být závistivý...",
				baseReward: 200,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_share_knowledge",
			},
			choiceY: {
				id: "choiceY",
				label: "Nechat si to pro sebe",
				description: "Tvůj vlastní tajný barista. Nikdo se nedozví.",
				baseReward: 150,
				riskMultiplier: 0.7,
				nextNodeId: "terminal_personal_barista",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Wing it failed - Panic Response
	// =========================================================================
	decision_2d_panic: {
		id: "decision_2d_panic",
		type: "decision",
		narrative: `⚠️ **OH NE!** Kávovar začíná pípat, kouřit a vibrovat! Světla blikají červeně!

Co uděláš?!`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zůstat klidný",
				description: "Zkusíš to vypnout a restartovat. Možná to zvládneš.",
				baseReward: 200,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_stay_calm",
			},
			choiceY: {
				id: "choiceY",
				label: "Utéct z kuchyňky",
				description: "Tohle není tvůj problém. Záchrana vlastní kůže!",
				baseReward: -100,
				riskMultiplier: 0.9,
				nextNodeId: "terminal_coward",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Sharing knowledge
	// =========================================================================
	outcome_share_knowledge: {
		id: "outcome_share_knowledge",
		type: "outcome",
		narrative: `📢 Voláš kolegy: "Hej, pojďte se podívat na tohle!"

Lidé se začínají scházet...`,
		successChance: 70,
		successNodeId: "terminal_office_hero",
		failNodeId: "terminal_jealousy",
	},

	// =========================================================================
	// OUTCOME: Staying calm during malfunction
	// =========================================================================
	outcome_stay_calm: {
		id: "outcome_stay_calm",
		type: "outcome",
		narrative: `🧘 Beru hluboký dech. Hledáš hlavní vypínač...`,
		successChance: 70,
		successNodeId: "terminal_crisis_averted",
		failNodeId: "terminal_explosion",
	},

	// =========================================================================
	// TERMINAL NODES (12 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_perfect_coffee: {
		id: "terminal_perfect_coffee",
		type: "terminal",
		narrative: `✨ **Dokonalost!**

Kávovar vytváří absolutně perfektní espresso. Aroma zaplňuje celou kuchyňku!

Šéf právě prochází kolem, ochutná a je tak nadšený, že ti dává bonus **+250 mincí**!`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_secret_menu: {
		id: "terminal_secret_menu",
		type: "terminal",
		narrative: `🏆 **TAJNÉ MENU ODEMČENO!**

Displej ukazuje: "CONGRATULATIONS - MASTER BARISTA STATUS ACHIEVED"

Objevil jsi skryté recepty! Celá kancelář se seběhla ochutnat legendární kávu. **+500 mincí** od nadšených kolegů!`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.8,
	},

	terminal_it_guru: {
		id: "terminal_it_guru",
		type: "terminal",
		narrative: `🤓 **Profesionální přístup**

IT guru přichází a během minuty má kávovar rozchoděný. Učí tě pár triků.

Dostáváš slušnou kávu a získáváš **+120 mincí** za to, že jsi nebyl hrdý poprosit o pomoc.`,
		coinsChange: 120,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_lucky_shot: {
		id: "terminal_lucky_shot",
		type: "terminal",
		narrative: `🍀 **Neuvěřitelné štěstí!**

Náhodná kombinace byla PŘESNĚ ta správná! Kávovar vytváří úžasnou kávu.

"Měl jsi prostě štěstí," říká kolega. Ale kdo se ptá? **+280 mincí** bonus!`,
		coinsChange: 280,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_office_hero: {
		id: "terminal_office_hero",
		type: "terminal",
		narrative: `🎉 **Hrdina kanceláře!**

Tvoje káva je hit! Všichni chtějí vědět jak jsi to udělal.

Kolegové ti házejí mince jako by jsi byl profesionální barista. **+350 mincí** a respekt celého týmu!`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_personal_barista: {
		id: "terminal_personal_barista",
		type: "terminal",
		narrative: `🤫 **Tvůj malý tajný luxus**

Každé ráno si teď uděláš dokonalou kávu, zatímco ostatní pijí instant.

Je to tvoje malé tajemství. **+200 mincí** z ušetřených návštěv kavárny.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_crisis_averted: {
		id: "terminal_crisis_averted",
		type: "terminal",
		narrative: `🛡️ **Krize zažehnána!**

Najdeš hlavní vypínač a restartuj kávovar. Po restartu funguje perfektně!

Management tě chválí za klidnou hlavu v krizi. **+180 mincí** prémie!`,
		coinsChange: 180,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_bland_coffee: {
		id: "terminal_bland_coffee",
		type: "terminal",
		narrative: `😐 **No... je to káva**

Káva je... v pořádku. Není špatná, ale není ani nijak výjimečná.

Prostě standardní kancelářská káva. **+50 mincí** za to, že jsi alespoň nic nerozbil.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	// Negative endings (4)
	terminal_malfunction: {
		id: "terminal_malfunction",
		type: "terminal",
		narrative: `⚡ **Systémová chyba!**

Tvoje nastavení přetížila kávovar. Displej ukazuje "ERROR 0x4E5357" a stroj se vypnul.

Technik musí přijet. Údržba tě nutí zaplatit **-250 mincí** za servisní zásah.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_flood: {
		id: "terminal_flood",
		type: "terminal",
		narrative: `🌊 **Potopa v kuchyňce!**

Něco jsi zmáčkl špatně. Voda teče ze všech stran!

Panikařící kolegové utíkají. Platíš **-200 mincí** za vysušení a opravu.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_jealousy: {
		id: "terminal_jealousy",
		type: "terminal",
		narrative: `😠 **Závist v kanceláři**

Jeden kolega se cítí uražený, že jsi "jeho" kávovar pokazil "divnými experimenty".

Podává stížnost. HR tě nutí zaplatit **-150 mincí** za "konflikt na pracovišti". Vážně?`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_explosion: {
		id: "terminal_explosion",
		type: "terminal",
		narrative: `💥 **KÁVOVÁ APOKALYPSA!**

Nestačilo to. Kávovar exploduje a pokrývá CELOU kuchyňku (a tebe) vrstvou espresso!

CEO měl zrovna bílou košili. Platíš **-600 mincí** za nový kávovar a profesionální čištění.`,
		coinsChange: -600,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_coward: {
		id: "terminal_coward",
		type: "terminal",
		narrative: `🏃 **Zbabělost**

Utíkáš z kuchyňky. Kávovar sám po chvíli přestane pípat - byla to jen falešná hláška.

Všichni viděli jak jsi utekl. **-100 mincí** ztráty respektu a pár vtipů na tvůj účet.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},
};

export const coffeeMachineBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 24,
	averageReward: 200,
	maxPossibleReward: 800, // Wing it success (300) + share success (350) = 650, or manual success + secret menu (500)
	minPossibleReward: -600, // Wing it fail + stay calm fail = explosion
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(coffeeMachineBranchingStory);
