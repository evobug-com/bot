/**
 * Video Conference - Branching Story
 *
 * Branching narrative about a high-stakes video conference with international colleagues.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Technical Setup or Wing It]
 *   -> Tech Setup -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Presentation style]
 *       -> Professional -> [OUTCOME] -> [TERMINAL: Impressed/Boring]
 *       -> Creative    -> [OUTCOME] -> [TERMINAL: Viral/Cringe]
 *     -> Failure -> [DECISION 2b: Technical crisis]
 *       -> Restart     -> [OUTCOME] -> [TERMINAL: Saved/Lost]
 *       -> Phone Backup -> [TERMINAL: Phone hero]
 *   -> Wing It -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Unexpected event]
 *       -> Handle Pro -> [OUTCOME] -> [TERMINAL: Cat Star/Disaster]
 *       -> Laugh Off  -> [TERMINAL: Relatable human]
 *     -> Failure -> [DECISION 2d: Damage control]
 *       -> Apologize -> [TERMINAL: Forgiven]
 *       -> Blame Tech -> [TERMINAL: Unprofessional]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "video_conference_branching";
const STORY_TITLE = "Videokonference";
const STORY_EMOJI = "📹";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Máš před sebou důležitou videokonferenci s indickými kolegy z Bangaloru. Je to klíčová prezentace projektu, který může rozhodnout o budoucnosti celého týmu.

Za 5 minut začíná meeting. Jak se připravíš?`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Technical Setup or Wing It
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Otevřel jsi aplikaci pro videokonference. Máš ještě pár minut na přípravu.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Důkladně se připravit",
				description: "Otestovat mikrofon, kameru, osvětlení a připojení. Zabere to čas, ale budeš ready.",
				baseReward: 400,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_tech_setup",
			},
			choiceY: {
				id: "choiceY",
				label: "Rovnou se připojit",
				description: "Wing it! Funguje to vždycky, ne? Začneš dřív a budeš vypadat proaktivně.",
				baseReward: 500,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_wing_it",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Technical Setup
	// =========================================================================
	outcome_tech_setup: {
		id: "outcome_tech_setup",
		type: "outcome",
		narrative: `🎤 Testuješ mikrofon... Kontroluješ kameru... Upravuješ světlo...`,
		successChance: 70,
		successNodeId: "decision_2a_presentation",
		failNodeId: "decision_2b_tech_crisis",
	},

	// =========================================================================
	// DECISION 2a: Presentation Style (after successful setup)
	// =========================================================================
	decision_2a_presentation: {
		id: "decision_2a_presentation",
		type: "decision",
		narrative: `✅ **Vše funguje perfektně!** Připojuješ se včas, všichni kolegové jsou online.

Team leader z Bangaloru říká: "Ready for your pitch? We're excited to hear it!"

Jaký styl prezentace zvolíš?`,
		coinsChange: 100,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Profesionální přístup",
				description: "Strukturovaná prezentace s daty, grafy a business jazykem.",
				baseReward: 500,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_professional",
			},
			choiceY: {
				id: "choiceY",
				label: "Kreativní storytelling",
				description: "Použiješ humor, příběhy a netradiční přístup. Riskantní, ale může zaujmout.",
				baseReward: 800,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_creative",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Technical Crisis (after setup failure)
	// =========================================================================
	decision_2b_tech_crisis: {
		id: "decision_2b_tech_crisis",
		type: "decision",
		narrative: `⚠️ **Problém!** Při testování se objevily divné artefakty na kameře a mikrofon šumí.

Meeting začíná za 30 sekund. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Rychlý restart",
				description: "Vypneš a zapneš všechno. Možná to pomůže, ale můžeš přijít pozdě.",
				baseReward: 300,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_restart",
			},
			choiceY: {
				id: "choiceY",
				label: "Záložní telefon",
				description: "Připojíš se z telefonu. Méně profesionální, ale funguje.",
				baseReward: 250,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_phone_backup",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Professional Presentation
	// =========================================================================
	outcome_professional: {
		id: "outcome_professional",
		type: "outcome",
		narrative: `📊 Spouštíš prezentaci. Grafy, data, ROI analýzy... Mluvíš jasně a strukturovaně.

Kolegyně z Bangaloru si dělají poznámky...`,
		successChance: 70,
		successNodeId: "terminal_impressed",
		failNodeId: "terminal_boring",
	},

	// =========================================================================
	// OUTCOME: Creative Presentation
	// =========================================================================
	outcome_creative: {
		id: "outcome_creative",
		type: "outcome",
		narrative: `🎨 "Představte si, že náš produkt je jako Taj Mahal digitálního světa..."

Začínáš s neobvyklou analogií. Někdo se usmívá, někdo vypadá zmatený...`,
		successChance: 70,
		successNodeId: "terminal_viral",
		failNodeId: "terminal_cringe",
	},

	// =========================================================================
	// OUTCOME: Restart
	// =========================================================================
	outcome_restart: {
		id: "outcome_restart",
		type: "outcome",
		narrative: `🔄 Mačkáš Ctrl+Alt+Del... Zavíráš aplikace... Modlíš se k IT bohům...`,
		successChance: 70,
		successNodeId: "terminal_saved",
		failNodeId: "terminal_lost",
	},

	// =========================================================================
	// OUTCOME: Wing It
	// =========================================================================
	outcome_wing_it: {
		id: "outcome_wing_it",
		type: "outcome",
		narrative: `🚀 Připojuješ se bez přípravy. Jsi první v místnosti. Vypadáš proaktivně!

Meeting začíná, ty začínáš prezentovat...`,
		successChance: 70,
		successNodeId: "decision_2c_unexpected",
		failNodeId: "decision_2d_damage_control",
	},

	// =========================================================================
	// DECISION 2c: Unexpected Event (after wing it success)
	// =========================================================================
	decision_2c_unexpected: {
		id: "decision_2c_unexpected",
		type: "decision",
		narrative: `🎯 **Zatím to jde skvěle!** Jsi uprostřed prezentace, když se stane něco nečekaného...

😺 **Tvoje kočka vskočila na stůl!** Prochází před kamerou a mňouká. Všichni vidí.

Team leader se směje: "Aww, who's that?"`,
		coinsChange: 100,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Profesionálně to zvládnout",
				description: "Rychle odstraníš kočku a vrátíš se k prezentaci jako by se nic nestalo.",
				baseReward: 600,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_cat_handled",
			},
			choiceY: {
				id: "choiceY",
				label: "Využít to pro humor",
				description: "Představíš kočku jako 'nového člena týmu' a uděláš z toho vtip.",
				baseReward: 400,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_humor",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Damage Control (after wing it failure)
	// =========================================================================
	decision_2d_damage_control: {
		id: "decision_2d_damage_control",
		type: "decision",
		narrative: `😰 **Katastrofa!** Tvůj mikrofon nefunguje správně - hlas se seká, někdy vůbec není slyšet.

"Sorry, can you repeat that? Your audio is breaking up," říká team leader frustrovaně.

Jak zareaguješ?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Upřímně se omluvit",
				description: "Přiznej chybu, omluv se a navrhni pokračovat přes chat nebo přeplánovat.",
				baseReward: 100,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_apologize",
			},
			choiceY: {
				id: "choiceY",
				label: "Svalit to na techniku",
				description: "Řekneš, že IT oddělení nezajistilo správný software a není to tvoje vina.",
				baseReward: 0,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_blame_tech",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Cat Handled
	// =========================================================================
	outcome_cat_handled: {
		id: "outcome_cat_handled",
		type: "outcome",
		narrative: `😺 Rychle odneseš kočku pryč a vrátíš se. "Sorry about that, where were we?"

Marketing tým si toho všiml...`,
		successChance: 70,
		successNodeId: "terminal_cat_star",
		failNodeId: "terminal_cat_disaster",
	},

	// =========================================================================
	// OUTCOME: Phone backup
	// =========================================================================
	outcome_phone_backup: {
		id: "outcome_phone_backup",
		type: "outcome",
		narrative: `📱 Rychle vytahuješ telefon a připojuješ se přes mobilní aplikaci. Obraz je menší, ale funkční...`,
		successChance: 70,
		successNodeId: "terminal_phone_hero",
		failNodeId: "terminal_phone_fail",
	},

	// =========================================================================
	// OUTCOME: Humor with cat
	// =========================================================================
	outcome_humor: {
		id: "outcome_humor",
		type: "outcome",
		narrative: `😸 "Meet our newest team member!" Zvedáš kočku ke kameře a všichni se smějí...

Team leader reaguje...`,
		successChance: 70,
		successNodeId: "terminal_relatable",
		failNodeId: "terminal_humor_fail",
	},

	// =========================================================================
	// OUTCOME: Apologizing
	// =========================================================================
	outcome_apologize: {
		id: "outcome_apologize",
		type: "outcome",
		narrative: `🙏 "Omlouvám se, měl jsem si vše lépe připravit. Můžeme to přeplánovat?"

Team leader chvíli přemýšlí...`,
		successChance: 70,
		successNodeId: "terminal_forgiven",
		failNodeId: "terminal_apology_rejected",
	},

	// =========================================================================
	// OUTCOME: Blaming tech
	// =========================================================================
	outcome_blame_tech: {
		id: "outcome_blame_tech",
		type: "outcome",
		narrative: `🖥️ "IT oddělení nám nedalo správný software. Není to moje chyba..."

Team leader si tě měří pohledem...`,
		successChance: 70,
		successNodeId: "terminal_blame_accepted",
		failNodeId: "terminal_unprofessional",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_impressed: {
		id: "terminal_impressed",
		type: "terminal",
		narrative: `👏 **Naprosto skvělé!**

Team leader je viditelně pod dojmem. "This is exactly what we needed. Very professional presentation!"

Dostáváš **+500 mincí** jako bonus a potvrzení, že projekt je schválen.`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_viral: {
		id: "terminal_viral",
		type: "terminal",
		narrative: `🌟 **Virální úspěch!**

Tvoje kreativní prezentace okouzlila všechny! "This was the best pitch I've seen in years!"

Marketing tým sdílí tvoje video na LinkedIn - máš **+900 mincí** a jsi hvězda firmy!`,
		coinsChange: 900,
		isPositiveEnding: true,
		xpMultiplier: 1.8,
	},

	terminal_saved: {
		id: "terminal_saved",
		type: "terminal",
		narrative: `💪 **Zachráněno v poslední chvíli!**

Restart pomohl! Připojuješ se 2 minuty pozdě, ale vše funguje. Team leader je tolerantní.

Prezentace proběhla dobře. Získáváš **+350 mincí** a respekt za cool nervy.`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_phone_hero: {
		id: "terminal_phone_hero",
		type: "terminal",
		narrative: `📱 **Improvizace vítězí!**

"Sorry, I had to switch to phone backup." Team leader ocení tvoji vynalézavost.

Prezentace z telefonu proběhla překvapivě dobře. Získáváš **+300 mincí** za quick thinking.`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_cat_star: {
		id: "terminal_cat_star",
		type: "terminal",
		narrative: `🐱🌟 **Nejlepší kolega!**

Marketing zachytil moment s kočkou a video má miliony zhlédnutí! "Best PR we ever had!"

Firma využila video v kampani. Dostáváš **+700 mincí** a kočka má vlastní LinkedIn profil!`,
		coinsChange: 700,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_relatable: {
		id: "terminal_relatable",
		type: "terminal",
		narrative: `😄 **Lidský moment!**

"Meet Fluffy, our newest team member!" Všichni se smějí. Atmosféra je uvolněná.

Tvoje upřímnost a humor zlomily ledy. Získáváš **+450 mincí** a reputaci sympaťáka.`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_forgiven: {
		id: "terminal_forgiven",
		type: "terminal",
		narrative: `🙏 **Upřímnost se vyplácí**

"No problem, technical issues happen. Let's reschedule." Team leader oceňuje tvoji upřímnost.

Dostáváš druhou šanci a **+150 mincí** za profesionální přístup ke krizové situaci.`,
		coinsChange: 150,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_boring: {
		id: "terminal_boring",
		type: "terminal",
		narrative: `😴 **Příliš suché**

Prezentace byla korektní, ale... "It was okay. We'll review and get back to you."

Žádný bonus, ale aspoň jsi neudělal chybu. **+0 mincí**. Příště zkus přidat energii.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_phone_fail: {
		id: "terminal_phone_fail",
		type: "terminal",
		narrative: `📵 **Telefon selhal!**

Mobilní aplikace se zasekla a nedokázal ses připojit. Data na telefonu nestačila.

"We'll continue without you," napíše team leader do chatu. Ztrácíš **-200 mincí**.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_humor_fail: {
		id: "terminal_humor_fail",
		type: "terminal",
		narrative: `😬 **Vtip nesedl**

Kočka se vylekala a poškrábala tě. Na kameru to vypadalo divně.

"Can we get back to business?" říká team leader chladně. Ztrácíš **-100 mincí**.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_apology_rejected: {
		id: "terminal_apology_rejected",
		type: "terminal",
		narrative: `😞 **Omluva nestačila**

"We don't have time to reschedule. This was your chance." Team leader je frustrovaný.

Projekt jde dál bez tebe. Ztrácíš **-250 mincí**.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_blame_accepted: {
		id: "terminal_blame_accepted",
		type: "terminal",
		narrative: `🤷 **Výmluva prošla**

Team leader pokrčí rameny. "OK, IT should fix this. Let's reschedule for next week."

Dostal jsi druhou šanci. Získáváš **+50 mincí** za přežití.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	// Negative endings (3)
	terminal_cringe: {
		id: "terminal_cringe",
		type: "terminal",
		narrative: `😬 **Cringe moment**

Tvoje kreativní přístup minul cíl. Team leader vypadá zmatený. "I... don't understand the metaphor."

Projekt není schválen. Ztrácíš **-200 mincí** za marnou přípravu. Někdy je lepší držet se klasiky.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_lost: {
		id: "terminal_lost",
		type: "terminal",
		narrative: `❌ **Totální selhání**

Restart nepomohl. Když se konečně připojíš, meeting už skončil.

"We had to move on without you." Ztrácíš **-300 mincí** a důvěru týmu. Příště přijď včas.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_unprofessional: {
		id: "terminal_unprofessional",
		type: "terminal",
		narrative: `🚫 **Neprofesionální chování**

"This is your responsibility, not IT's." Team leader je naštvaný tvým postojem.

Reputace je poškozená. Ztrácíš **-250 mincí** a pravděpodobně příští příležitost. Odpovědnost je důležitá.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_cat_disaster: {
		id: "terminal_cat_disaster",
		type: "terminal",
		narrative: `🙀 **Kočičí chaos!**

Při odstraňování kočky jsi převrhl láhev vody na laptop! Vše se vypnulo.

Team je v šoku. Ztrácíš **-400 mincí** za zničenou prezentaci a musíš koupit nový laptop.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.3,
	},
};

export const videoConferenceBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 22,
	averageReward: 300,
	maxPossibleReward: 1100, // Wing it success + cat star success (100 + 100 + 700)
	minPossibleReward: -400, // Wing it success + cat disaster
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(videoConferenceBranchingStory);
