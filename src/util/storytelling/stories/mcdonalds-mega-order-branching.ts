/**
 * McDonald's Mega Order - Branching Story
 *
 * Branching narrative about picking up an absurdly large McDonald's order
 * for the team. Uses the actual order list from the original brief verbatim.
 *
 * Story Graph (strict layered shape: intro → decision1 → outcome1 → decision2 → outcome2 → terminal):
 *
 * [INTRO] → [DECISION 1: Jak objednat?]
 *   ├── App → [OUTCOME 1A: app projde?]
 *   │     ├── success → [DECISION 2A: kontrola obsahu]
 *   │     │     ├── Otevřít každý sáček → [OUTCOME 2A1] → terminal_perfect_haul / terminal_missing_truffle
 *   │     │     └── Důvěřovat aplikaci   → [OUTCOME 2A2] → terminal_team_hero      / terminal_blame_storm
 *   │     └── fail    → [DECISION 2B: app spadla]
 *   │           ├── Zavolat support      → [OUTCOME 2B1] → terminal_support_save  / terminal_charged_twice
 *   │           └── Jet na drive jako záloha → [OUTCOME 2B2] → terminal_drive_save / terminal_late_to_meeting
 *   └── Drive-thru → [OUTCOME 1B: zvládneš odříkat objednávku?]
 *         ├── success → [DECISION 2C: kdo zaplatí?]
 *         │     ├── Vybrat od týmu předem → [OUTCOME 2C1] → terminal_split_paid / terminal_one_zero_freerider
 *         │     └── Zaplatit svou kartou  → [OUTCOME 2C2] → terminal_corp_card  / terminal_broke_hero
 *         └── fail    → [DECISION 2D: dlouhá fronta]
 *               ├── Vyčkat                → [OUTCOME 2D1] → terminal_patience_pays / terminal_meeting_missed
 *               └── Jet do KFC vedle      → [OUTCOME 2D2] → terminal_kfc_pivot     / terminal_chaos_pivot
 *
 * 16 terminals total. 11 positive / 5 negative = 68.75% (within 60–80% target).
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "mcdonalds_mega_order_branching";
const STORY_TITLE = "Mega objednávka v McDonalds";
const STORY_EMOJI = "🍔";

const ORDER_LIST = `🛒 **Objednávka týmu:**
- 5× triple cheeseburger
- 3× velká cola zero
- 1× sýr lanýž
- 1× ramen
- 6× velké hranolky
- 6× koktejlová omáčka
- 1× Happy Meal nuggets
- 1× velký shake čoko
- 1× velký shake vanilka
- 1× velký shake jahoda
- 4× double Big Tasty
- 1× croissant čoko
- 1× muffin karamel
- 1× muffin třešeň
- 1× koblížek dubai
- 1× banana bread
- 1× srdíčko
- 1× croissant
- 1× triple cookie
- 1× koblížek meruňka
- 1× koblížek nugát`;

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Tým se rozhodl, že DNES je den, kdy se konečně objedná pořádný oběd. A kupodivu… padlo to na tebe.

Na Slacku se sype seznam a tobě klesá čelist:

${ORDER_LIST}

🥶 *Tohle není oběd. Tohle je casus belli.*

Tvůj úkol: dovézt to celé do kanceláře, **teplé, kompletní a před začátkem stand-upu za 45 minut**.`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Jak objednat?
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Stojíš na parkovišti před McDonalds a řešíš strategii. Buď klikneš všechno do appky a vyzvedneš to na pultě, nebo to prostě odříkáš drive-thru holce v okénku jedním dechem.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Objednat přes appku",
				description: "Naťukáš všech 21 položek do mobilní appky a vyzvedneš na pultě. Bezpečnější, ale pomalejší.",
				baseReward: 350,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_app",
			},
			choiceY: {
				id: "choiceY",
				label: "Drive-thru naživo",
				description: "Najedeš do drive-thru a budeš ten seznam diktovat. Rychlejší — pokud se nepokoušíš odříkat 4× double Big Tasty bez nadechnutí.",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_drive",
			},
		},
	},

	// =========================================================================
	// OUTCOME 1A: App
	// =========================================================================
	outcome_app: {
		id: "outcome_app",
		type: "outcome",
		narrative: `📱 Otevíráš McDonalds appku a začínáš klikat. Každé "+" jako další gram cholesterolu na karbu firemního konta.

Klikáš, klikáš, klikáš… 21 položek… *modrý kolečko se točí*…`,
		successChance: 70,
		successNodeId: "decision_2a_inspection",
		failNodeId: "decision_2b_app_crashed",
	},

	// =========================================================================
	// OUTCOME 1B: Drive-thru
	// =========================================================================
	outcome_drive: {
		id: "outcome_drive",
		type: "outcome",
		narrative: `🚗 Najedeš do drive-thru. Reproduktor zaprská: *"Dobrý den, co si dáte?"*

Nadechuješ se a začínáš: "Tak já si dám pět triple cheeseburgerů, tři velký cola zero, jeden sýr lanýž, jeden ramen, šest velkých hranolek..."

V okénku už nikdo nic nezapisuje. Někdo tam šeptá: *"Volej manažera."*`,
		successChance: 70,
		successNodeId: "decision_2c_payment",
		failNodeId: "decision_2d_long_queue",
	},

	// =========================================================================
	// DECISION 2A: Kontrola obsahu (po úspěšném app vyzvednutí)
	// =========================================================================
	decision_2a_inspection: {
		id: "decision_2a_inspection",
		type: "decision",
		narrative: `✅ **Objednávka přijata.** Po dvanácti minutách stojíš u pultu. Brigádník se na tebe dívá očima, které říkají "to fakt myslíš vážně?", a vyjede ti **šest** papírových sáčků.

Hodiny tikají. Stand-up za 25 minut. Co teď?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zkontrolovat každý sáček",
				description: "Položku po položce odškrtáš ze seznamu. Pomalé, ale jistota že nic nechybí.",
				baseReward: 300,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_2a_inspect",
			},
			choiceY: {
				id: "choiceY",
				label: "Důvěřovat appce",
				description: "Appka říká hotovo, tak to bude hotovo. Naložíš tašky a frčíš.",
				baseReward: 450,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_2a_trust",
			},
		},
	},

	// =========================================================================
	// DECISION 2B: App spadla
	// =========================================================================
	decision_2b_app_crashed: {
		id: "decision_2b_app_crashed",
		type: "decision",
		narrative: `💥 **APP SPADLA.** "Jejda, něco se pokazilo." Točí se jen prázdná obrazovka.

Banka ti ale **strhla 1 847 Kč**. Z appky žádný order code, žádné potvrzení. Stand-up za 30 minut.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zavolat zákaznický servis",
				description: "Zavoláš na linku McDonalds support a popíšeš co se stalo. Risk: čekání ve frontě 20 minut.",
				baseReward: 300,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_2b_support",
			},
			choiceY: {
				id: "choiceY",
				label: "Najet na drive-thru a objednat znovu",
				description: "Refund vyřešíš později. Hlavně teď přivézt jídlo. Zaplatíš podruhé z vlastního.",
				baseReward: 200,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_2b_emergency_drive",
			},
		},
	},

	// =========================================================================
	// DECISION 2C: Kdo zaplatí (po úspěšném drive-thru)
	// =========================================================================
	decision_2c_payment: {
		id: "decision_2c_payment",
		type: "decision",
		narrative: `🎉 **Objednávka přijata.** Manažerka se osobně postavila k pípě s milkshaky. Personál koordinuje balení jak NASA při startu rakety.

Účet: **1 847 Kč.** Co teď s placením?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Vybrat peníze od týmu předem",
				description: "Pošleš QR platbu do Slacku, vybereš všechny Revoluty a Cashy předem. Bezpečné, ale zdrží.",
				baseReward: 400,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_2c_collect",
			},
			choiceY: {
				id: "choiceY",
				label: "Zaplatit firemní kartou",
				description: "Vytáhneš firemní kreditku. \"Tým build, ne?\" — a vyřešíš to ve výkazu měsíc později.",
				baseReward: 500,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_2c_corporate",
			},
		},
	},

	// =========================================================================
	// DECISION 2D: Dlouhá fronta
	// =========================================================================
	decision_2d_long_queue: {
		id: "decision_2d_long_queue",
		type: "decision",
		narrative: `🐌 Manažer ti přes okýnko hlásí: *"Pane, takhle velkou objednávku musíme připravit zvlášť. Bude to **35 minut**, prosím přejeďte na vyhrazené stání."*

Stand-up za 40 minut. Kalkulačka v hlavě začíná blikat červeně.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Počkat",
				description: "Vyčkáš 35 minut. Tým bude jíst studené, ale bude jíst.",
				baseReward: 250,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_2d_wait",
			},
			choiceY: {
				id: "choiceY",
				label: "Jet do KFC vedle",
				description: "Naproti přes ulici je KFC. Nedonesl bys originál objednávku, ale donesl bys něco. Risk: nálady týmu.",
				baseReward: 200,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_2d_kfc",
			},
		},
	},

	// =========================================================================
	// OUTCOME 2 nodes (level 2 — lead to terminals)
	// =========================================================================
	outcome_2a_inspect: {
		id: "outcome_2a_inspect",
		type: "outcome",
		narrative: `🔍 Vytahuješ blok, otvíráš sáček po sáčku a odškrtáváš. *Triple cheese × 5… check. Cola zero × 3… check. Sýr lanýž… kde je sýr lanýž?*`,
		successChance: 70,
		successNodeId: "terminal_perfect_haul",
		failNodeId: "terminal_missing_truffle",
	},
	outcome_2a_trust: {
		id: "outcome_2a_trust",
		type: "outcome",
		narrative: `🚀 Hodíš všech šest sáčků do auta a frčíš. App zelená, brigádník mávl, co by se mohlo pokazit.`,
		successChance: 70,
		successNodeId: "terminal_team_hero",
		failNodeId: "terminal_blame_storm",
	},
	outcome_2b_support: {
		id: "outcome_2b_support",
		type: "outcome",
		narrative: `📞 Telefonní operátor po 11 minutách: *"Aha, vidím váš order, dvojitá platba, počkejte chvíli..."*

Ticho. Pak typing. Pak: *"Tak jsem to vyřešila, na pultě vás čeká kompletní objednávka a refund jde do 3 dnů."* — pokud se to fakt stalo.`,
		successChance: 70,
		successNodeId: "terminal_support_save",
		failNodeId: "terminal_charged_twice",
	},
	outcome_2b_emergency_drive: {
		id: "outcome_2b_emergency_drive",
		type: "outcome",
		narrative: `🚨 Najedeš do drive-thru a začneš odříkávat ten samý seznam podruhé. Tvoje karta zatím vychladla v peněžence dost na to, aby šla ještě jednou.`,
		successChance: 70,
		successNodeId: "terminal_drive_save",
		failNodeId: "terminal_late_to_meeting",
	},
	outcome_2c_collect: {
		id: "outcome_2c_collect",
		type: "outcome",
		narrative: `💸 QR kód letí do team channelu. *"Pošlete každý kolik máte v košíku, do 5 minut nebo to platím já."*

Telefon začne brnkat: Revolut, Revolut, Cash, Cash, Revolut...`,
		successChance: 70,
		successNodeId: "terminal_split_paid",
		failNodeId: "terminal_one_zero_freerider",
	},
	outcome_2c_corporate: {
		id: "outcome_2c_corporate",
		type: "outcome",
		narrative: `💳 Vytahuješ firemní vízu a v duchu se modlíš, aby finance neměli zase ten kvartální audit.`,
		successChance: 70,
		successNodeId: "terminal_corp_card",
		failNodeId: "terminal_broke_hero",
	},
	outcome_2d_wait: {
		id: "outcome_2d_wait",
		type: "outcome",
		narrative: `🪑 Sedíš na vyhrazeném stání 35 minut. Sleduješ jak se v okýnku objevují další zákazníci, dostávají svoje burgery, odjíždějí, a ty pořád jen čekáš.`,
		successChance: 70,
		successNodeId: "terminal_patience_pays",
		failNodeId: "terminal_meeting_missed",
	},
	outcome_2d_kfc: {
		id: "outcome_2d_kfc",
		type: "outcome",
		narrative: `🐔 Otáčíš auto, frčíš naproti do KFC. Tady fronta žádná. Budeš muset improvizovat: **kýbl** + **stripsy** + **pár twisterů** = ekvivalent 4 double Big Tasty?`,
		successChance: 70,
		successNodeId: "terminal_kfc_pivot",
		failNodeId: "terminal_chaos_pivot",
	},

	// =========================================================================
	// TERMINALS (16 total — 11 positive, 5 negative)
	// =========================================================================
	terminal_perfect_haul: {
		id: "terminal_perfect_haul",
		type: "terminal",
		narrative: `🏆 **PERFEKTNÍ DODÁVKA**

Sýr lanýž ležel na dně šestého sáčku. Všech 21 položek dorazilo do kanceláře. Ramen je teplý, shaky jsou studené, koblížek nugát ještě měkký.

Tým ti tleská. Šéfová ti pošle do Slacku zlatou medaili emoji. **+450 mincí** za chirurgickou přesnost.`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_missing_truffle: {
		id: "terminal_missing_truffle",
		type: "terminal",
		narrative: `😤 **CHYBÍ SÝR LANÝŽ**

Doneseš všechno do kanceláře. Tým rozbaluje, jí, chválí. Pak se ozve hlas z rohu: *"…a kde je můj sýr lanýž?"*

Ten brigádník ti to vážně zapomněl. Musíš jet podruhé. Pozdě na stand-up. **-150 mincí** za nedotažení.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_team_hero: {
		id: "terminal_team_hero",
		type: "terminal",
		narrative: `🦸 **HRDINA TÝMU**

Frčíš jak vítr. Ramen ještě páří, shaky jsou ledové, hranolky křupou. Stand-up začíná přesně, lidi sedí s pusou plnou triple cheese a kývají na tvůj report.

Šéf ti večer pošle DM: *"Příští týden jdeš s námi na večeři, platíme."* **+500 mincí.**`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_blame_storm: {
		id: "terminal_blame_storm",
		type: "terminal",
		narrative: `🌪️ **BURE V TÝMU**

App tě zradila. V autě se otvírají sáčky a chybí: shake jahoda (nahrazený druhým vanilkovým), 2× koktejlová omáčka, banana bread. Tři lidi z týmu mají hlad a teď i zlost.

Slack vybuchne emoji 🤬. **-250 mincí** a smutný nápis "next time já".`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_support_save: {
		id: "terminal_support_save",
		type: "terminal",
		narrative: `📞 **SUPPORT JAKO ANDĚL**

Operátorka udělala zázrak — order rozeslala do kuchyně, na pultě tě čekala kompletní zásilka, a refund dorazil na účet další den ráno.

Vyprávíš to v kanceláři jako legendu. **+300 mincí.**`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_charged_twice: {
		id: "terminal_charged_twice",
		type: "terminal",
		narrative: `💸 **ZAPLACENO 2×**

Operátorka tě 30 minut nechala čekat, pak se hovor "ztratil". Refund tickets bys měl mít 3, ale na účtě nic.

Tým dostal jídlo, ale ty máš -1 847 Kč na osobním účtu a tři týdny papírování s bankou. **-300 mincí.**`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_drive_save: {
		id: "terminal_drive_save",
		type: "terminal",
		narrative: `🚗 **DRIVE ZÁCHRANA**

Drive-thru zvládl, kompletní objednávka v autě, jedeš zpátky do kanceláře. Refund první platby přijde za týden.

Tým jí, šéf nic netuší. **+250 mincí** za pohotovost pod tlakem.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_late_to_meeting: {
		id: "terminal_late_to_meeting",
		type: "terminal",
		narrative: `⏰ **POZDĚ NA MEETING**

Drive trval 25 minut, dovoz dalších 15, do kanceláře jsi přijel **20 minut po stand-upu**. Tým už dávno objednal pizzu z Wolt.

McDonalds krabičky končí v lednici a v koši. **-200 mincí** a tichá kancelářská hanba.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_split_paid: {
		id: "terminal_split_paid",
		type: "terminal",
		narrative: `💰 **VYBRÁNO BEZ ZTRÁT**

QR kód do 4 minut sebral všechny platby. Účet vyrovnaný, jídlo dorazilo, tým je sytý a tiše respektuje tvoje organizační schopnosti.

**+400 mincí** za perfektní kasírský výkon.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_one_zero_freerider: {
		id: "terminal_one_zero_freerider",
		type: "terminal",
		narrative: `🐀 **JEDEN NEPŘIŠEL ZA SVOJÍ**

Z 12 lidí poslalo 11. Ten dvanáctý — nebudeme jmenovat, je to ten z marketingu — má **"zítra určitě"** už třetí týden.

Vyšel jsi na 0 (díky štědrosti zbylých 11). **+100 mincí** a poznámku v duchu.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_corp_card: {
		id: "terminal_corp_card",
		type: "terminal",
		narrative: `💳 **FIRMA PLATÍ**

Zaúčtoval jsi to jako *"team building lunch — quarterly morale boost"*. CFO ti ve výkazu napíše: *"Schvaluji. Příště nás pozvi."*

Hrdina firmy. **+550 mincí** + reputace.`,
		coinsChange: 550,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_broke_hero: {
		id: "terminal_broke_hero",
		type: "terminal",
		narrative: `🥲 **HRDINA NA SVOJI ÚČET**

Karta prošla, jídlo dorazilo, tým ti řekl *"dík, vyřešíme to"* — a nikdy nevyřešil.

Účet je tvůj, hrdinství je tvoje, **-1 847 Kč** je tvých. **-400 mincí** a trpká chuť triple cookie.`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_patience_pays: {
		id: "terminal_patience_pays",
		type: "terminal",
		narrative: `🧘 **TRPĚLIVOST SE VYPLATILA**

Po 35 minutách dorazila objednávka v takové úpravě, že ti vedoucí osobně přinesl tašky a poklonil se. Vše teplé, vše kompletní, dokonce přidali navrch dva malé sundae jako omluvu.

Stand-up jsi stihl s 4 minutami rezervy. **+350 mincí.**`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_meeting_missed: {
		id: "terminal_meeting_missed",
		type: "terminal",
		narrative: `⌛ **STAND-UP JEL BEZ TEBE**

Čekal jsi 35 minut, pak dalších 15 v autě cestou. Stand-up dávno skončil. Šéf řekl *"asi máme problém s prioritami"*.

Jídlo aspoň dorazilo. **-150 mincí** a důtka.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_kfc_pivot: {
		id: "terminal_kfc_pivot",
		type: "terminal",
		narrative: `🐔 **KFC PIVOT**

Vrátil ses s 2 kýbly stripsů, 6 twistery a hromadou hranolek. Tým chvíli zírá, pak někdo řekne: *"Vlastně sem chtěl spíš KFC."*

Improvizace zachráněná. **+250 mincí** za rychlý úsudek a sales pitch v kanceláři.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_chaos_pivot: {
		id: "terminal_chaos_pivot",
		type: "terminal",
		narrative: `🤡 **PIVOT DO PROPASTI**

Vrátíš se s KFC. Tři lidi jsou Halal, dva vegetariáni, jeden má alergii na koření. Z kýble jí jen jeden senior dev. Zbytek se kouká nešťastně.

Marketing si stěžuje na HR. **+50 mincí** a memo *"Příště ne ty."*`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},
};

export const mcdonaldsMegaOrderBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 16,
	averageReward: 175,
	maxPossibleReward: 550, // Drive-thru success → corporate card success
	minPossibleReward: -400, // Drive-thru success → broke hero
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(mcdonaldsMegaOrderBranchingStory);
