/**
 * Office Prank - Branching Story
 *
 * Branching narrative about pulling a prank at the office.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Simple or Complex prank]
 *   -> Simple -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: How to celebrate]
 *       -> Share credit -> [OUTCOME] -> [TERMINAL: Team bonding/Boss takes credit]
 *       -> Take credit  -> [OUTCOME] -> [TERMINAL: Big bonus/Jealousy]
 *     -> Failure -> [DECISION 2b: Damage control]
 *       -> Apologize   -> [TERMINAL: Forgiven]
 *       -> Blame IT    -> [OUTCOME] -> [TERMINAL: IT angry/Believed]
 *   -> Complex -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Boss impressed]
 *       -> Ask for promotion  -> [OUTCOME] -> [TERMINAL: Promoted/Too early]
 *       -> Stay humble        -> [TERMINAL: Respected]
 *     -> Failure -> [DECISION 2d: Server crash]
 *       -> Fix it yourself -> [OUTCOME] -> [TERMINAL: Hero/Failed worse]
 *       -> Call IT expert  -> [TERMINAL: Saved but costly]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "office_prank_branching";
const STORY_TITLE = "Kancelářský žertík";
const STORY_EMOJI = "🎭";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Kolega Honza odešel na oběd a nechal počítač odemčený. To je příliš lákavá příležitost!

Máš nápad na žertík, ale musíš se rozhodnout - jít na jistotu s něčím jednoduchým, nebo zkusit něco komplexnějšího a vtipnějšího?`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Simple or Complex prank
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Máš na výběr dva přístupy:`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Jednoduchý žertík",
				description: "Změnit pozadí a přehodit pár kláves. Rychlé a bezpečné.",
				baseReward: 250,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_simple",
			},
			choiceY: {
				id: "choiceY",
				label: "Komplexní žertík",
				description: "Naprogramovat vtipný skript se zvuky. Riskantní, ale zábavné!",
				baseReward: 500,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_complex",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Simple prank
	// =========================================================================
	outcome_simple: {
		id: "outcome_simple",
		type: "outcome",
		narrative: `🖱️ Rychle měníš pozadí na vtipný obrázek a prohazuješ klávesy Y a Z na klávesnici...

⌨️ Honza se vrací, zapíná počítač...`,
		successChance: 70,
		successNodeId: "decision_2a_celebrate",
		failNodeId: "decision_2b_damage_control",
	},

	// =========================================================================
	// OUTCOME: Complex prank
	// =========================================================================
	outcome_complex: {
		id: "outcome_complex",
		type: "outcome",
		narrative: `💻 Píšeš rychlý skript, který každých 5 minut zahraje zvuk kočky. Přidáváš ještě automatické otevírání kalkulačky...

👀 Honza se vrací a spouští počítač. První kočka se ozve za minutu...`,
		successChance: 70,
		successNodeId: "decision_2c_boss_impressed",
		failNodeId: "decision_2d_server_crash",
	},

	// =========================================================================
	// DECISION 2a: Celebrate simple success
	// =========================================================================
	decision_2a_celebrate: {
		id: "decision_2a_celebrate",
		type: "decision",
		narrative: `😆 **Úspěch!** Honza se začal smát a ostatní kolegi se přidávají!

"To je skvělý! Kdo to udělal?" ptá se Honza s úsměvem. Všichni se dívají kolem.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Sdílet zásluhy",
				description: "Řekni, že to byl týmový nápad. Bezpečná volba.",
				baseReward: 200,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_team_bonding",
			},
			choiceY: {
				id: "choiceY",
				label: "Vzít si zásluhy",
				description: "To byl tvůj nápad! Možná dostaneš odměnu...",
				baseReward: 350,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_take_credit",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Damage control after simple failure
	// =========================================================================
	decision_2b_damage_control: {
		id: "decision_2b_damage_control",
		type: "decision",
		narrative: `😠 **Problém!** Honza má za chvíli důležitou prezentaci a je naštvaný!

"Kdo to sakra udělal? Potřebuju rychle prezentaci dokončit!" zlobí se.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Omluvit se",
				description: "Přiznej to a pomoz to rychle spravit.",
				baseReward: 0,
				riskMultiplier: 0.5,
				nextNodeId: "outcome_apologize",
			},
			choiceY: {
				id: "choiceY",
				label: "Obvinit IT",
				description: 'Řekni, že to určitě udělal někdo z IT jako "test"...',
				baseReward: 100,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_blame_it",
			},
		},
	},

	// =========================================================================
	// DECISION 2c: Boss impressed by complex prank
	// =========================================================================
	decision_2c_boss_impressed: {
		id: "decision_2c_boss_impressed",
		type: "decision",
		narrative: `🤣 **Obrovský úspěch!** Celá kancelář se směje. I šéf vyšel z kanceláře a směje se.

"To je kreativní! Kdo má takové programátorské schopnosti?" ptá se šéf s úsměvem.`,
		coinsChange: 150,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Žádat o povýšení",
				description: "Je to perfektní příležitost ukázat, že zasloužíš víc!",
				baseReward: 600,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_ask_promotion",
			},
			choiceY: {
				id: "choiceY",
				label: "Zůstat pokorný",
				description: "Přiznej se, ale bez nároků. Buduj reputaci.",
				baseReward: 300,
				riskMultiplier: 0.6,
				nextNodeId: "outcome_stay_humble",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Server crash from complex prank
	// =========================================================================
	decision_2d_server_crash: {
		id: "decision_2d_server_crash",
		type: "decision",
		narrative: `🚨 **KATASTROFA!** Tvůj skript způsobil nekonečnou smyčku a server se zhroutil!

💻 Celá firma je offline. CTO běží do serverovny. Máš pár vteřin rozhodnout se...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Opravit sám",
				description: "Zkus to rychle napravit, než si někdo všimne.",
				baseReward: 200,
				riskMultiplier: 1.5,
				nextNodeId: "outcome_fix_yourself",
			},
			choiceY: {
				id: "choiceY",
				label: "Zavolat IT experta",
				description: "Přiznej se a nech to na profesionálech.",
				baseReward: -200,
				riskMultiplier: 0.5,
				nextNodeId: "outcome_call_expert",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Team bonding
	// =========================================================================
	outcome_team_bonding: {
		id: "outcome_team_bonding",
		type: "outcome",
		narrative: `🤝 "Přemýšleli jsme o tom společně během včerejšího oběda," říkáš.

Kolegi přikyvují. Šéf vypadá spokojený s týmovým duchem...`,
		successChance: 70,
		successNodeId: "terminal_team_bonus",
		failNodeId: "terminal_boss_credit",
	},

	// =========================================================================
	// OUTCOME: Take credit
	// =========================================================================
	outcome_take_credit: {
		id: "outcome_take_credit",
		type: "outcome",
		narrative: `💪 "To jsem udělal já!" říkáš s úsměvem.

Šéf se na tebe dívá. Kolegové jsou potichu...`,
		successChance: 70,
		successNodeId: "terminal_big_bonus",
		failNodeId: "terminal_jealousy",
	},

	// =========================================================================
	// OUTCOME: Blame IT
	// =========================================================================
	outcome_blame_it: {
		id: "outcome_blame_it",
		type: "outcome",
		narrative: `🤥 "Určitě to byl někdo z IT oddělení, dělají často takové testy..."

Honza se zamyslí. Volá do IT oddělení...`,
		successChance: 70,
		successNodeId: "terminal_believed",
		failNodeId: "terminal_it_angry",
	},

	// =========================================================================
	// OUTCOME: Ask for promotion
	// =========================================================================
	outcome_ask_promotion: {
		id: "outcome_ask_promotion",
		type: "outcome",
		narrative: `🎯 "Já jsem to udělal! A rád bych projednal možnost povýšení..."

Šéf zvedne obočí. Atmosféra se napíná...`,
		successChance: 70,
		successNodeId: "terminal_promoted",
		failNodeId: "terminal_too_early",
	},

	// =========================================================================
	// OUTCOME: Fix yourself
	// =========================================================================
	outcome_fix_yourself: {
		id: "outcome_fix_yourself",
		type: "outcome",
		narrative: `⌨️ Běžíš k serveru a zoufale hledáš způsob, jak zastavit svůj skript...

💦 Pot teče po čele. CTO je za dveřmi...`,
		successChance: 70,
		successNodeId: "terminal_hero",
		failNodeId: "terminal_failed_worse",
	},

	// =========================================================================
	// OUTCOME: Apologizing to Honza
	// =========================================================================
	outcome_apologize: {
		id: "outcome_apologize",
		type: "outcome",
		narrative: `🙏 "Honzo, promiň, to jsem udělal já. Pomůžu ti to hned vrátit..."

Honza se na tebe dívá. Záleží na jeho náladě...`,
		successChance: 70,
		successNodeId: "terminal_forgiven",
		failNodeId: "terminal_apology_rejected",
	},

	// =========================================================================
	// OUTCOME: Staying humble after boss impressed
	// =========================================================================
	outcome_stay_humble: {
		id: "outcome_stay_humble",
		type: "outcome",
		narrative: `😊 "To jsem jen tak zkusil, nic velkého," říkáš skromně. Šéf přikyvuje...`,
		successChance: 70,
		successNodeId: "terminal_respected",
		failNodeId: "terminal_humble_overlooked",
	},

	// =========================================================================
	// OUTCOME: Calling IT expert for server crash
	// =========================================================================
	outcome_call_expert: {
		id: "outcome_call_expert",
		type: "outcome",
		narrative: `📞 Přiznáváš se a voláš IT experta. "Udělal jsem chybu, potřebuju pomoc..."`,
		successChance: 70,
		successNodeId: "terminal_saved_costly",
		failNodeId: "terminal_expert_too_late",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings + 3 new failure terminals)
	// =========================================================================

	// Positive endings (8)
	terminal_team_bonus: {
		id: "terminal_team_bonus",
		type: "terminal",
		narrative: `🎉 **Týmový úspěch!**

Šéf oceňuje týmovou práci a dobrou atmosféru. Každý člen týmu dostává bonus!

Získáváš **+200 mincí** a posílen vztahy v týmu.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_big_bonus: {
		id: "terminal_big_bonus",
		type: "terminal",
		narrative: `💰 **Velký bonus!**

Šéf je nadšený tvou kreativitou! "Přesně takové lidi tu potřebujeme!"

Získáváš **+350 mincí** jako speciální bonus za zlepšení atmosféry!`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_believed: {
		id: "terminal_believed",
		type: "terminal",
		narrative: `🎭 **Prošlo to!**

IT oddělení je zmatené, ale nikdo nic netvrdí. Honza je uklidněný a dokonce se usmívá.

Vyvázl jsi bez trestu a dokonce získáváš **+100 mincí** za "pomoc s řešením".`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_forgiven: {
		id: "terminal_forgiven",
		type: "terminal",
		narrative: `🙏 **Odpuštěno**

Přiznal jsi se a pomohl jsi vše rychle napravit. Honza oceňuje tvou poctivost.

"Příště to načasuj líp," směje se. Nezískal jsi peníze, ale zachoval respekt.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_respected: {
		id: "terminal_respected",
		type: "terminal",
		narrative: `🌟 **Respekt!**

Tvá pokora a technické schopnosti udělaly dojem. Šéf si tě poznamenal jako talentovaného člena týmu.

Získáváš **+450 mincí** (150 z průběhu + 300 bonus) a rostoucí reputaci!`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_promoted: {
		id: "terminal_promoted",
		type: "terminal",
		narrative: `🚀 **Povýšení!**

Šéf je ohromený! "Máš odvahu a talent. Od příštího měsíce jsi senior!"

Získáváš **+750 mincí** (150 z průběhu + 600 bonus) a povýšení! Nejlepší možný výsledek!`,
		coinsChange: 600,
		isPositiveEnding: true,
		xpMultiplier: 2.0,
	},

	terminal_hero: {
		id: "terminal_hero",
		type: "terminal",
		narrative: `🦸 **Hrdina!**

Podařilo se ti to opravit ještě před tím, než CTO objevil problém! Nikdo neví, že jsi to způsobil ty.

Získáváš **+200 mincí** za "rychlou reakci na incident".`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_saved_costly: {
		id: "terminal_saved_costly",
		type: "terminal",
		narrative: `💸 **Zachráněn, ale draze**

IT expert to opravil během 10 minut. Přiznal jsi se a musel jsi zaplatit část nákladů.

Ztrácíš **-200 mincí**, ale zachoval jsi práci a reputaci.`,
		coinsChange: -200,
		isPositiveEnding: true, // Still positive - kept job, minor loss
		xpMultiplier: 0.9,
	},

	// Negative endings (3)
	terminal_boss_credit: {
		id: "terminal_boss_credit",
		type: "terminal",
		narrative: `😤 **Šéf si bere zásluhy**

"Ano, povzbuzuji týmové aktivity jako tyto!" prohlašuje šéf.

Žádný bonus, žádné uznání. Cítíš se využitý.`,
		coinsChange: 0,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_jealousy: {
		id: "terminal_jealousy",
		type: "terminal",
		narrative: `😠 **Závist kolegů**

Kolegové jsou naštvaní, že jsi si vzal všechny zásluhy. Někdo to nahlásil HR za "narušování pracovního prostředí".

Dostáváš napomenutí a ztrácíš **-150 mincí** z platu jako sankci.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_it_angry: {
		id: "terminal_it_angry",
		type: "terminal",
		narrative: `🔥 **IT oddělení zuří!**

Vedoucí IT zjistil pravdu a je rozzuřený, že jsi je obvinil. Podal stížnost.

Musíš zaplatit **-250 mincí** jako náhradu škody a omluvu IT týmu.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_too_early: {
		id: "terminal_too_early",
		type: "terminal",
		narrative: `⏰ **Příliš brzy**

Šéf se zamračil. "To je trochu drzé po jednom žertíku... Uklidni se."

Atmosféra je napjatá. Ztratil jsi získané mince **-150** a reputaci.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_failed_worse: {
		id: "terminal_failed_worse",
		type: "terminal",
		narrative: `💥 **Ještě horší!**

Tvůj pokus o opravu vše zhoršil. CTO musel volat externí firmu. Oprava stála celou noc.

Zaplatil jsi **-400 mincí** a máš výpověď na stole. Totální katastrofa.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_apology_rejected: {
		id: "terminal_apology_rejected",
		type: "terminal",
		narrative: `😡 **OMLUVA ODMÍTNUTA**

Honza je příliš naštvaný. "Kvůli tobě jsem pokazil prezentaci před klientem!"

HR řeší stížnost. Ztrácíš **-180 mincí** a důvěru kolegy.`,
		coinsChange: -180,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_humble_overlooked: {
		id: "terminal_humble_overlooked",
		type: "terminal",
		narrative: `😐 **PŘEHLÉDNUT**

Tvá pokora byla příliš velká. Šéf si tě nezapamatoval a zásluhy připsal "týmové kultuře".

Žádný bonus, žádné uznání. Ztrácíš **-50 mincí** za promarněnou příležitost.`,
		coinsChange: -50,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_expert_too_late: {
		id: "terminal_expert_too_late",
		type: "terminal",
		narrative: `⏰ **EXPERT PŘIŠEL POZDĚ**

IT expert dorazil, ale firma byla offline příliš dlouho. Klienti si stěžují.

CTO nařizuje audit. Ztrácíš **-350 mincí** a máš záznam v HR.`,
		coinsChange: -350,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},
};

export const officePrankBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 22,
	averageReward: 180,
	maxPossibleReward: 750, // Complex success + promoted
	minPossibleReward: -400, // Complex fail + failed worse
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(officePrankBranchingStory);
