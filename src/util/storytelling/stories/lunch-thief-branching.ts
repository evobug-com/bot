/**
 * Lunch Thief - Branching Story
 *
 * A Mass Effect-style branching narrative about investigating a stolen lunch.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Investigation approach]
 *   -> Security cameras -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Confrontation style]
 *       -> Public confrontation -> [OUTCOME] -> [TERMINAL: Justice/Backfire]
 *       -> Private talk         -> [OUTCOME] -> [TERMINAL: Apology/Denial]
 *     -> Failure -> [DECISION 2b: No camera evidence]
 *       -> Ask around  -> [OUTCOME] -> [TERMINAL: Found/Accused]
 *       -> Give up     -> [TERMINAL: Let it go]
 *   -> Check yourself -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: You ate it]
 *       -> Order pizza -> [TERMINAL: Dignity saved]
 *       -> Admit it    -> [OUTCOME] -> [TERMINAL: Laughs/Mocked]
 *     -> Failure -> [TERMINAL: Someone took it]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "lunch_thief_branching";
const STORY_TITLE = "Zloděj obědů";
const STORY_EMOJI = "🍱";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `🍱 **${STORY_TITLE}**

Otevíráš ledničku v kancelářské kuchyňce, abys si vzal svůj pečlivě připravený oběd...

😱 **TEN TU NENÍ!** Někdo ti ukradl oběd! Tvůj žaludek vrtí prázdnotou a vztek stoupá.

🕵️ *Čas vypátrat zloděje... nebo ne?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Investigation approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Stojíš před prázdnou lednicí a rozhoduješ se, jak postupovat. Můžeš jít za security a žádat záznamy z kamer, nebo nejdřív zkontrolovat, jestli jsi ho náhodou nesnědl sám...`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Jít za security",
				description: "Oficiální cesta. Pokud najdeš důkazy, spravedlnost zvítězí!",
				baseReward: 350,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_security",
			},
			choiceY: {
				id: "choiceY",
				label: "Zkontrolovat sám sebe",
				description: "Než obviníš druhé, radši se ujisti, že jsi ho opravdu nesnědl...",
				baseReward: 150,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_self_check",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Security footage
	// =========================================================================
	outcome_security: {
		id: "outcome_security",
		type: "outcome",
		narrative: `📹 Jdeš za security a žádáš o přístup k záznamům z kamer v kuchyňce.

Sedíš u monitoru a přetáčíš záznamy...`,
		successChance: 70,
		successNodeId: "decision_2a_confrontation",
		failNodeId: "decision_2b_no_evidence",
	},

	// =========================================================================
	// DECISION 2a: Found thief on camera - confrontation style
	// =========================================================================
	decision_2a_confrontation: {
		id: "decision_2a_confrontation",
		type: "decision",
		narrative: `👀 **Našel jsi ho!** Na videu jasně vidíš kolegu z účetního, jak bere tvou krabičku a spokojeně odchází!

Teď musíš rozhodnout, jak ho konfrontovat.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Veřejná konfrontace",
				description: "Konfrontuješ ho před celou kanceláří. Riskantní, ale efektní.",
				baseReward: 400,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_public",
			},
			choiceY: {
				id: "choiceY",
				label: "Soukromý rozhovor",
				description: "Zavoláš ho stranou a promluvíš si s ním v klidu.",
				baseReward: 250,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_private",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: No camera evidence
	// =========================================================================
	decision_2b_no_evidence: {
		id: "decision_2b_no_evidence",
		type: "decision",
		narrative: `😞 **Smůla!** Kamera v kuchyňce nefungovala - údržba ji včera vypnula kvůli opravě.

Security ti nemůže pomoci. Co teď?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zeptat se kolegů",
				description: "Obejdeš kancelář a zeptáš se, jestli někdo něco neviděl.",
				baseReward: 200,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_ask_around",
			},
			choiceY: {
				id: "choiceY",
				label: "Nechat to být",
				description: "Není to za to. Prostě si koupíš něco nového.",
				baseReward: 0,
				riskMultiplier: 0.5,
				nextNodeId: "terminal_let_it_go",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Public confrontation
	// =========================================================================
	outcome_public: {
		id: "outcome_public",
		type: "outcome",
		narrative: `📢 Postavíš se doprostřed open spaceu a začneš mluvit nahlas...

"Jen pro informaci, právě jsem na kamerách viděl, kdo krade obědy!"`,
		successChance: 70,
		successNodeId: "terminal_justice",
		failNodeId: "terminal_backfire",
	},

	// =========================================================================
	// OUTCOME: Private talk
	// =========================================================================
	outcome_private: {
		id: "outcome_private",
		type: "outcome",
		narrative: `🤫 Pošleš kolegovi zprávu: "Potřebuju si s tebou promluvit. Soukromě."

Setkáte se v prázdné jednací místnosti...`,
		successChance: 70,
		successNodeId: "terminal_apology",
		failNodeId: "terminal_denial",
	},

	// =========================================================================
	// OUTCOME: Ask around
	// =========================================================================
	outcome_ask_around: {
		id: "outcome_ask_around",
		type: "outcome",
		narrative: `🗣️ Procházíš kanceláří a diskrétně se ptáš kolegů, jestli něco neviděli...

Většina krčí rameny, ale pak se jedna kolegyně zarazí...`,
		successChance: 70,
		successNodeId: "terminal_witness_found",
		failNodeId: "terminal_falsely_accused",
	},

	// =========================================================================
	// OUTCOME: Self check
	// =========================================================================
	outcome_self_check: {
		id: "outcome_self_check",
		type: "outcome",
		narrative: `🤔 Než začneš obviňovat druhé, podíváš se pod svůj stůl, do koše...

Počkat, co to tam je?`,
		successChance: 70,
		successNodeId: "decision_2c_ate_it",
		failNodeId: "terminal_someone_took_it",
	},

	// =========================================================================
	// DECISION 2c: You ate it yourself
	// =========================================================================
	decision_2c_ate_it: {
		id: "decision_2c_ate_it",
		type: "decision",
		narrative: `😅 **TO JE TVOJE KRABIČKA!** Prázdná krabička v koši... Ty jsi ho snědl v 10 ráno a úplně zapomněl!

🤦 Už jsi u toho stihl docela drama. Jak to napravíš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Objednat pizzu pro všechny",
				description: "Zachráníš si důstojnost tím, že všem koupíš pizzu.",
				baseReward: -200,
				riskMultiplier: 0.6,
				nextNodeId: "terminal_pizza_dignity",
			},
			choiceY: {
				id: "choiceY",
				label: "Přiznat to nahlas",
				description: "Upřímně se přiznáš. Možná se všichni zasmějí...",
				baseReward: 50,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_admit_it",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Admitting you ate it
	// =========================================================================
	outcome_admit_it: {
		id: "outcome_admit_it",
		type: "outcome",
		narrative: `😳 Postavíš se před kolegy a přiznáš pravdu...

"Ehm... zjistil jsem, že... já jsem ten oběd snědl. V 10 ráno. Zapomněl jsem."`,
		successChance: 70,
		successNodeId: "terminal_good_laughs",
		failNodeId: "terminal_mocked",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_justice: {
		id: "terminal_justice",
		type: "terminal",
		narrative: `🏆 **SPRAVEDLNOST ZVÍTĚZILA!**

Kolega zbledne. Ostatní začnou přitakávat - není to poprvé, co ho někdo podezříval!

HR ho volá na kobereček. Dostává výpověď jako sériový lunch thief. Jeho stůl ti připadá - včetně celé sbírky energy drinků v hodnotě **+400 mincí**.

Jsi hrdina kanceláře!`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_apology: {
		id: "terminal_apology",
		type: "terminal",
		narrative: `🙏 **Upřímná omluva**

Kolega se zhroutí. "Promiň... měl jsem hrozný hlad a zapomněl jsem peněženku doma. Vím, že to není omluva..."

Rozhodneš se mu odpustit. Na oplátku tě vezme do nejdražší restaurace v okolí a zaplatí. Ušetříš **+280 mincí** a získáš nového kámoše.`,
		coinsChange: 280,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_witness_found: {
		id: "terminal_witness_found",
		type: "terminal",
		narrative: `🎯 **Svědek se našel!**

"Jo, viděla jsem to! Ten týpek z IT si vzal tvou krabičku. Myslela jsem, že jste kámoši..."

Jdeš za ním s důkazy. Vrací ti **+200 mincí** jako kompenzaci a přísahá, že se to už nestane.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_let_it_go: {
		id: "terminal_let_it_go",
		type: "terminal",
		narrative: `🚶 **Klid je základ**

Rozhodneš se to nechat být. Koupíš si sendvič v bufetu a vrátíš se k práci.

Žádný zisk, žádná ztráta. Někdy je lepší neztrácet energii na malichernosti.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_pizza_dignity: {
		id: "terminal_pizza_dignity",
		type: "terminal",
		narrative: `🍕 **Důstojnost zachráněna**

Objednáš 5 pizz pro celou kancelář. "Omlouvám se za drama, všichni si dejte!"

Kolegové tě ocení za upřímnost i velkorysost. Stojí tě to **-200 mincí**, ale zachováváš si respekt.`,
		coinsChange: -200,
		isPositiveEnding: true,
		xpMultiplier: 1.1,
	},

	terminal_good_laughs: {
		id: "terminal_good_laughs",
		type: "terminal",
		narrative: `😂 **Zdravý smích**

Kancelář vybuchne smíchem, ale je to přátelský smích. "To se stává každému!"

Jeden kolega ti dokonce koupí kávu jako útěchu. Získáváš **+50 mincí** a respekt za upřímnost.`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_someone_took_it: {
		id: "terminal_someone_took_it",
		type: "terminal",
		narrative: `🔍 **Ztraceno a nenalezeno**

Zkontroloval jsi všude - pod stolem, v koši, dokonce v autě. Nic.

Někdo ti ho opravdu vzal, ale bez důkazů to nemůžeš vyřešit. Jdeš si koupit oběd a zapomínáš na to.

Žádná ztráta, žádný zisk. Jen hlad.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_denial: {
		id: "terminal_denial",
		type: "terminal",
		narrative: `🙅 **Popření**

"Co? Ne, to jsem nebyl já! Musí být chyba v kamerách nebo něco..."

Kolega vehementně popírá. Bez veřejného tlaku nemáš jak ho donutit přiznat se.

Aspoň víš, komu už nikdy nevěřit. Získáváš opatrnost, ale **0 mincí**.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.7,
	},

	// Negative endings (3)
	terminal_backfire: {
		id: "terminal_backfire",
		type: "terminal",
		narrative: `😱 **KATASTROFA!**

"Ty idiote, to není moje krabička! Já mám MODROU, tohle je ZELENÁ!"

Máš pravdu - zmýlil ses. Obvinil jsi nevinného člověka před celou kanceláří.

Musíš se veřejně omluvit a koupit týmu kávu jako odškodné. Stojí tě to **-350 mincí** a reputaci.`,
		coinsChange: -350,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_falsely_accused: {
		id: "terminal_falsely_accused",
		type: "terminal",
		narrative: `🎭 **Falešné obvinění**

"Viděla jsem toho týpka z účetního, určitě to byl on!"

Konfrontuješ ho, ale on má dokonalé alibi - byl celé dopoledne na meetingu. Záznamy to potvrzují.

Zostudil ses. Musíš mu koupit oběd jako omluvu. **-250 mincí**.`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_mocked: {
		id: "terminal_mocked",
		type: "terminal",
		narrative: `😂 **Výsměch**

Kancelář vybuchne smíchem, ale tentokrát je to krutý smích.

"Vážně? Celé tohle drama a ty jsi ho snědl SÁM?!"

Stal ses meme kanceláře. Musíš koupit dort jako odškodnění. **-150 mincí** a trauma.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},
};

export const lunchThiefBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 18,
	averageReward: 150,
	maxPossibleReward: 400, // Security -> Public confrontation success
	minPossibleReward: -350, // Security -> Public confrontation fail (backfire)
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(lunchThiefBranchingStory);
