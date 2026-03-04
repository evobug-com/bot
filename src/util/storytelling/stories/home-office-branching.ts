/**
 * Home Office Disaster - Branching Story
 *
 * Branching narrative about WFH chaos during an important call.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Setup approach]
 *   -> Professional setup -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Presentation style]
 *       -> Formal -> [OUTCOME] -> [TERMINAL: Impressed/Boring]
 *       -> Casual -> [OUTCOME] -> [TERMINAL: Relatable/Unprofessional]
 *     -> Failure -> [DECISION 2b: Tech crisis]
 *       -> Fix it -> [OUTCOME] -> [TERMINAL: Hero/Disaster]
 *       -> Phone backup -> [TERMINAL: Saved by phone]
 *   -> Wing it -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Interruption happens]
 *       -> Handle it -> [OUTCOME] -> [TERMINAL: Cat star/Kid chaos]
 *       -> Ignore it -> [TERMINAL: Focus master]
 *     -> Failure -> [TERMINAL: Total disaster]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "home_office_branching";
const STORY_TITLE = "Home office katastrofa";
const STORY_EMOJI = "🏠";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Pracuješ z domova a za 10 minut máš důležitý videohovor s vedením firmy. CEO bude osobně přítomen.

😺 Kočka právě skočila na stůl. 👶 Z vedlejšího pokoje se ozývá dítě. 📦 Kurýr zvoní u dveří.

*Tohle bude zajímavé...*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Setup approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Máš 10 minut na přípravu. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Profesionální setup",
				description: "Zamkneš dveře, zavřeš kočku do koupelny, nachystáš virtuální pozadí.",
				baseReward: 350,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_professional",
			},
			choiceY: {
				id: "choiceY",
				label: "Nechat to být",
				description: "Co se může pokazit? Jsi přece doma, trocha autenticity neuškodí.",
				baseReward: 250,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_wing_it",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Professional setup
	// =========================================================================
	outcome_professional: {
		id: "outcome_professional",
		type: "outcome",
		narrative: `🔒 Zamykáš dveře, kočku dáváš do koupelny, nastavuješ virtuální pozadí s knihovnou.

Připojuješ se do hovoru... LED světlo svítí, kamera ostrá, mikrofon testovaný.`,
		successChance: 70,
		successNodeId: "decision_2a_presentation",
		failNodeId: "decision_2b_tech_crisis",
	},

	// =========================================================================
	// DECISION 2a: Presentation style
	// =========================================================================
	decision_2a_presentation: {
		id: "decision_2a_presentation",
		type: "decision",
		narrative: `✅ **Všechno funguje perfektně!** Jsi připojený, obraz i zvuk jsou skvělé.

CEO se ptá na tvůj projekt. Jak budeš prezentovat?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Ultra formálně",
				description: "PowerPoint, grafy, metriky. Jako bys byl v kanceláři.",
				baseReward: 400,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_formal",
			},
			choiceY: {
				id: "choiceY",
				label: "Uvolněně",
				description: "Mluvíš přirozeně, děláš vtipy. Jsme přece z domova.",
				baseReward: 350,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_casual",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Tech crisis
	// =========================================================================
	decision_2b_tech_crisis: {
		id: "decision_2b_tech_crisis",
		type: "decision",
		narrative: `😱 **KATASTROFA!** Virtuální pozadí se zaseklo a ukazuje polovinu tvého obličeje jako zelené monstrum. WiFi začíná padat.

CEO už je v hovoru a čeká...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rychle opravit",
				description: "Vypneš pozadí, restartuješ router - za 30 sekund to dáš.",
				baseReward: 300,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_fix_tech",
			},
			choiceY: {
				id: "choiceY",
				label: "Přepnout na telefon",
				description: "Odpojíš počítač a připojíš se z mobilu. Nižší kvalita, ale funguje.",
				baseReward: 200,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_phone_switch",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Wing it
	// =========================================================================
	outcome_wing_it: {
		id: "outcome_wing_it",
		type: "outcome",
		narrative: `🤷 Necháváš všechno jak je. Připojuješ se z gauče, za tebou je vidět nepořádek.

CEO se připojuje... "Tak, jak to vypadá s projektem?"`,
		successChance: 70,
		successNodeId: "decision_2c_interruption",
		failNodeId: "decision_2d_chaos",
	},

	// =========================================================================
	// DECISION 2c: Interruption happens
	// =========================================================================
	decision_2c_interruption: {
		id: "decision_2c_interruption",
		type: "decision",
		narrative: `🐱 Právě když začínáš mluvit, kočka skočí na klávesnici a spustí nějakou hlasitou hudbu z YouTube!

CEO se zasměje. "To je zajímavý hudební vkus."

Jak zareaguješ?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Představit kočku",
				description: "Vezmeš kočku do ruky a vtipně ji představíš týmu.",
				baseReward: 450,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_cat_star",
			},
			choiceY: {
				id: "choiceY",
				label: "Rychle ztlumit",
				description: "Odklidíš kočku a omlouvatelně pokračuješ jako profesionál.",
				baseReward: 250,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_mute_continue",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Formal presentation
	// =========================================================================
	outcome_formal: {
		id: "outcome_formal",
		type: "outcome",
		narrative: `📊 Spouštíš perfektně připravený PowerPoint. Grafy, čísla, KPI...

CEO pozorně sleduje. Ostatní účastníci jsou zticha.`,
		successChance: 70,
		successNodeId: "terminal_impressed",
		failNodeId: "terminal_boring",
	},

	// =========================================================================
	// OUTCOME: Casual presentation
	// =========================================================================
	outcome_casual: {
		id: "outcome_casual",
		type: "outcome",
		narrative: `😄 Mluvíš přirozeně, děláš vtipy o práci z domova.

"Víte, jak je to s home office - člověk pracuje 24/7, ale aspoň v pyžamu!"`,
		successChance: 70,
		successNodeId: "terminal_relatable",
		failNodeId: "terminal_unprofessional",
	},

	// =========================================================================
	// OUTCOME: Fix tech
	// =========================================================================
	outcome_fix_tech: {
		id: "outcome_fix_tech",
		type: "outcome",
		narrative: `⚡ Rychle vypínáš pozadí, restartuješ router...

"Omlouvám se, technické potíže. Za moment jsem zpět!"`,
		successChance: 70,
		successNodeId: "terminal_tech_hero",
		failNodeId: "terminal_tech_disaster",
	},

	// =========================================================================
	// OUTCOME: Cat becomes star
	// =========================================================================
	outcome_cat_star: {
		id: "outcome_cat_star",
		type: "outcome",
		narrative: `🌟 Bereš kočku do náruče a ukazuješ ji kameře.

"Tohle je Micka, můj productivity manager. Dohlíží, abych pracoval."

Všichni se smějí...`,
		successChance: 70,
		successNodeId: "terminal_cat_famous",
		failNodeId: "terminal_cat_chaos",
	},

	// =========================================================================
	// OUTCOME: Switching to phone
	// =========================================================================
	outcome_phone_switch: {
		id: "outcome_phone_switch",
		type: "outcome",
		narrative: `📱 Rychle přepínáš na telefon. Aplikace se načítá... CEO čeká...`,
		successChance: 70,
		successNodeId: "terminal_phone_backup",
		failNodeId: "terminal_phone_fail",
	},

	// =========================================================================
	// OUTCOME: Muting and continuing
	// =========================================================================
	outcome_mute_continue: {
		id: "outcome_mute_continue",
		type: "outcome",
		narrative: `🔇 Rychle ztlumíš mikrofon, odklidíš kočku a vracíš se k prezentaci...

"Omlouvám se, kde jsem skončil..."`,
		successChance: 70,
		successNodeId: "terminal_focus_master",
		failNodeId: "terminal_lost_focus",
	},

	// =========================================================================
	// DECISION 2d: Total chaos
	// =========================================================================
	decision_2d_chaos: {
		id: "decision_2d_chaos",
		type: "decision",
		narrative: `🔥 **Chaos!** Kočka shodila kávu, dítě vběhlo do pokoje a kurýr zvoní. CEO vidí všechno.

"Ehm... je tam vše v pořádku?" ptá se CEO.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Přiznat situaci",
				description: "Upřímně řekneš, co se děje, a poprosíš o pauzu.",
				baseReward: 100,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_admit_chaos",
			},
			choiceY: {
				id: "choiceY",
				label: "Předstírat klid",
				description: "Tvrdíš, že je vše v pořádku a snažíš se pokračovat.",
				baseReward: 50,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_fake_calm",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Admitting chaos
	// =========================================================================
	outcome_admit_chaos: {
		id: "outcome_admit_chaos",
		type: "outcome",
		narrative: `😅 "Omlouvám se, mám tu doma menší katastrofu. Můžu mít 5 minut?"

CEO přemýšlí...`,
		successChance: 70,
		successNodeId: "terminal_chaos_forgiven",
		failNodeId: "terminal_total_disaster",
	},

	// =========================================================================
	// OUTCOME: Faking calm
	// =========================================================================
	outcome_fake_calm: {
		id: "outcome_fake_calm",
		type: "outcome",
		narrative: `😬 "Vše v pořádku!" říkáš, zatímco kočka skáče přes stůl a dítě křičí...`,
		successChance: 70,
		successNodeId: "terminal_somehow_survived",
		failNodeId: "terminal_total_disaster",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_impressed: {
		id: "terminal_impressed",
		type: "terminal",
		narrative: `🏆 **CEO JE NADŠENÝ!**

"Výborná prezentace. Vidím, že máš věci pod kontrolou i z domova."

Po hovoru ti přijde email - povýšení na team leada!

Získáváš **+550 mincí** a novou pozici.`,
		coinsChange: 550,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_relatable: {
		id: "terminal_relatable",
		type: "terminal",
		narrative: `😊 **LIDSKÝ PŘÍSTUP**

"Konečně někdo autentický!" říká CEO. "Takhle si představuju firemní kulturu."

Tvůj přístup zaujal. CEO tě zmiňuje v celofiremním emailu jako příklad.

Získáváš **+400 mincí** a popularitu.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_cat_famous: {
		id: "terminal_cat_famous",
		type: "terminal",
		narrative: `🐱 **KOČKA JE HVĚZDA!**

CEO si zamiloval Micku. "Tohle je přesně ta firemní kultura, kterou chceme!"

Screenshot z hovoru se dostal do firemního newsletteru. Jsi slavný.

Získáváš **+500 mincí** a kočka dostala oficiální email.`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_focus_master: {
		id: "terminal_focus_master",
		type: "terminal",
		narrative: `🎯 **FOCUS MASTER**

Rychle zvládáš situaci a pokračuješ v prezentaci jako profesionál.

"Dobrá reakce," píše ti kolega do chatu. "CEO to ocenil."

Získáváš **+300 mincí** za klidnou hlavu.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_phone_backup: {
		id: "terminal_phone_backup",
		type: "terminal",
		narrative: `📱 **ZÁLOŽNÍ PLÁN**

Přepínáš na telefon. Kvalita je horší, ale funguje to.

"Oceňuju flexibilitu," říká CEO. "Důležitý je obsah, ne technologie."

Získáváš **+250 mincí** za rychlé řešení.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_tech_hero: {
		id: "terminal_tech_hero",
		type: "terminal",
		narrative: `🦸 **TECH HERO**

Za 30 sekund jsi zpět online s perfektním obrazem.

"Wow, to byla rychlost!" CEO je viditelně ohromený tvými tech skills.

Získáváš **+350 mincí** za rychlou reakci.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_boring: {
		id: "terminal_boring",
		type: "terminal",
		narrative: `😴 **NUDA**

Prezentace je perfektní, ale... nudná. CEO několikrát zívne.

"Díky za informace," říká bez emocí. Nic špatného, ale ani nic výjimečného.

Získáváš **+100 mincí**. Mohlo to být lepší.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_phone_fail: {
		id: "terminal_phone_fail",
		type: "terminal",
		narrative: `📵 **Telefon selhal!**

Aplikace na telefonu se neustále seká. CEO tě neslyší.

"Pojďme dál bez něj," říká CEO. Ztrácíš **-250 mincí**.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_lost_focus: {
		id: "terminal_lost_focus",
		type: "terminal",
		narrative: `😵 **Ztráta koncentrace**

Po incidentu s kočkou ses už nedokázal soustředit. Tvá prezentace byla chaotická.

"Měl jsi se lépe připravit," píše ti kolega. Ztrácíš **-100 mincí**.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_chaos_forgiven: {
		id: "terminal_chaos_forgiven",
		type: "terminal",
		narrative: `😊 **Pochopení!**

CEO se zasměje. "Mám taky děti a kočku, chápu. Dej si 5 minut."

Po pauze dokončíš prezentaci. Získáváš **+150 mincí** za upřímnost.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_somehow_survived: {
		id: "terminal_somehow_survived",
		type: "terminal",
		narrative: `😮‍💨 **Jakžtakž přežito**

Navzdory chaosu jsi dokončil prezentaci. CEO nic nekomentoval.

Kolega ti píše: "Respekt za nervy z oceli." Získáváš **+100 mincí**.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	// Negative endings (3)
	terminal_unprofessional: {
		id: "terminal_unprofessional",
		type: "terminal",
		narrative: `😬 **PŘÍLIŠ UVOLNĚNÝ**

Tvoje vtipy o pyžamu nezabraly. CEO se tváří kysele.

"Možná bychom měli zvážit, jestli home office funguje pro všechny..."

Ztrácíš **-200 mincí** a důvěru vedení.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_tech_disaster: {
		id: "terminal_tech_disaster",
		type: "terminal",
		narrative: `💥 **TECHNICKÁ KATASTROFA**

Restart routeru trval 5 minut. Když ses vrátil, hovor už skončil.

Kolega ti píše: "CEO nebyl nadšený, že jsi prostě zmizel."

Ztrácíš **-300 mincí** a reputaci.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_total_disaster: {
		id: "terminal_total_disaster",
		type: "terminal",
		narrative: `🔥 **TOTÁLNÍ PRŮŠVIH**

Během hovoru: kočka shodila kávu na klávesnici, dítě vběhlo do pokoje nahé, kurýr začal bouchat na dveře.

CEO zavěsil. HR ti volá o "work-life balance konzultaci."

Ztrácíš **-400 mincí** a klid.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_cat_chaos: {
		id: "terminal_cat_chaos",
		type: "terminal",
		narrative: `😿 **KOČIČÍ CHAOS**

Micka se ti vyškrábala z náručí a poškrábala tě. Krev ti teče po ruce před kamerou.

"Ehm... jsi v pořádku?" CEO vypadá znepokojně.

Ztrácíš **-150 mincí** a trochu důstojnosti.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},
};

export const homeOfficeBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 20,
	averageReward: 200,
	maxPossibleReward: 550, // Professional -> Formal -> Impressed
	minPossibleReward: -400, // Wing it -> Total disaster
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(homeOfficeBranchingStory);
