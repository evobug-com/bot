/**
 * Client Meeting - Branching Story
 *
 * Branching narrative about a crucial client presentation.
 * Features 3 decision layers and 12 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Prepare thoroughly or wing it]
 *   -> Prepare -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: Demo goes well]
 *       -> Show new features -> [OUTCOME] -> [TERMINAL: Impressed/Technical issues]
 *       -> Play it safe      -> [OUTCOME] -> [TERMINAL: Contract extended/Unimpressed]
 *     -> Failure -> [DECISION 2b: Technical problem during prep]
 *       -> Call tech support -> [OUTCOME] -> [TERMINAL: Fixed/Still broken]
 *       -> Use backup laptop -> [TERMINAL: Saved by backup]
 *   -> Wing it -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Client asks tough questions]
 *       -> Bluff confidently -> [OUTCOME] -> [TERMINAL: Sold it/Called out]
 *       -> Admit limits      -> [TERMINAL: Honest approach]
 *     -> Failure -> [DECISION 2d: Demo crashes]
 *       -> Blame infrastructure -> [TERMINAL: Poor excuse]
 *       -> Turn it around       -> [OUTCOME] -> [TERMINAL: Recovery/Complete disaster]
 */

import type { BranchingStory, StoryNode } from "../types";

const STORY_ID = "client_meeting_branching";
const STORY_TITLE = "Schůzka s klientem";
const STORY_EMOJI = "💼";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: `Za hodinu máš klíčovou prezentaci pro potenciálního klienta. Je to velká ryba - kontrakt by mohl znamenat **500+ mincí** provize.

Tvůj šéf právě poslal zprávu: "Tohle musí vyjít. Klient je náročný, ale má peníze."

*Jak se připravíš?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Preparation approach
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Hodiny tikají. Máš čas na důkladnou přípravu, nebo spoléháš na improvizaci?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Připravit se důkladně",
				description: "Projdeš si prezentaci, otestuješ demo, připravíš záložní plány.",
				baseReward: 400,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_prepare",
			},
			choiceY: {
				id: "choiceY",
				label: "Improvizovat",
				description: "Jsi profík, zvládneš to z hlavy. Využiješ čas jinak.",
				baseReward: 600,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_wing_it",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Preparation
	// =========================================================================
	outcome_prepare: {
		id: "outcome_prepare",
		type: "outcome",
		narrative: `📚 Soustředěně se připravuješ. Kontroluješ každý slide, spouštíš testovací demo...`,
		successChance: 70,
		successNodeId: "decision_2a_demo_ready",
		failNodeId: "decision_2b_tech_problem",
	},

	// =========================================================================
	// DECISION 2a: Demo ready and working
	// =========================================================================
	decision_2a_demo_ready: {
		id: "decision_2a_demo_ready",
		type: "decision",
		narrative: `✅ **Vše funguje!** Prezentace vypadá skvěle, demo běží jako hodinky.

Klient právě dorazil. Je čas na show. Jak povedeš prezentaci?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Ukázat nové funkce",
				description: "Riskneš to s nejnovějšími featury, které ještě nejsou úplně stabilní.",
				baseReward: 550,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_show_new",
			},
			choiceY: {
				id: "choiceY",
				label: "Hrát na jistotu",
				description: "Ukážeš jen ověřené, stabilní funkce.",
				baseReward: 350,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_play_safe",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Technical problem during preparation
	// =========================================================================
	decision_2b_tech_problem: {
		id: "decision_2b_tech_problem",
		type: "decision",
		narrative: `⚠️ **Problém!** Demo přestalo fungovat. Chybová hláška, kterou jsi nikdy neviděl.

Klient dorazí za 15 minut. Co uděláš?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Zavolat tech support",
				description: "Zkusíš to rychle vyřešit s pomocí IT týmu.",
				baseReward: 300,
				riskMultiplier: 1.1,
				nextNodeId: "outcome_tech_support",
			},
			choiceY: {
				id: "choiceY",
				label: "Použít záložní laptop",
				description: "Máš starší backup laptop se starší verzí, která funguje.",
				baseReward: 250,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_backup_laptop",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Winging it
	// =========================================================================
	outcome_wing_it: {
		id: "outcome_wing_it",
		type: "outcome",
		narrative: `😎 Vsadíš na své zkušenosti. Projdeš si jen základy a jdeš na to...`,
		successChance: 70,
		successNodeId: "decision_2c_tough_questions",
		failNodeId: "decision_2d_demo_crash",
	},

	// =========================================================================
	// DECISION 2c: Client asks tough questions
	// =========================================================================
	decision_2c_tough_questions: {
		id: "decision_2c_tough_questions",
		type: "decision",
		narrative: `🤔 Prezentace běží dobře, ale klient začíná klást technické otázky, na které nejsi úplně připravený.

"A jak řešíte soulad s GDPR?" ptá se důrazně.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Blafovat s jistotou",
				description: "Odpovíš sebevědomě, i když si nejsi úplně jistý.",
				baseReward: 500,
				riskMultiplier: 1.4,
				nextNodeId: "outcome_bluff",
			},
			choiceY: {
				id: "choiceY",
				label: "Přiznat limity",
				description: "Budeš upřímný: 'To vám přesně nezodpovím, ale zjistím.'",
				baseReward: 300,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_honest",
			},
		},
	},

	// =========================================================================
	// DECISION 2d: Demo crashes
	// =========================================================================
	decision_2d_demo_crash: {
		id: "decision_2d_demo_crash",
		type: "decision",
		narrative: `💥 **CRASH!** Demo zamrzlo uprostřed klíčové části prezentace.

Klient zvedá obočí. "To se stává často?" ptá se skepticky.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Svalit to na infrastrukturu",
				description: '"Je to problém s jejich WiFi, normálně to funguje perfektně..."',
				baseReward: 100,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_blame_infra",
			},
			choiceY: {
				id: "choiceY",
				label: "Otočit situaci",
				description: "Použiješ to jako ukázku, jak rychle řešíte problémy.",
				baseReward: 400,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_recovery",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Showing new features
	// =========================================================================
	outcome_show_new: {
		id: "outcome_show_new",
		type: "outcome",
		narrative: `🚀 "A teď vám ukážu naši nejnovější technologii..." začínáš s nadšením...`,
		successChance: 70,
		successNodeId: "terminal_mega_impressed",
		failNodeId: "terminal_technical_issues",
	},

	// =========================================================================
	// OUTCOME: Playing it safe
	// =========================================================================
	outcome_play_safe: {
		id: "outcome_play_safe",
		type: "outcome",
		narrative: `📊 Systematicky prezentuješ osvědčené funkce. Vše běží hladce...`,
		successChance: 70,
		successNodeId: "terminal_contract_extended",
		failNodeId: "terminal_unimpressed",
	},

	// =========================================================================
	// OUTCOME: Tech support
	// =========================================================================
	outcome_tech_support: {
		id: "outcome_tech_support",
		type: "outcome",
		narrative: `📞 "IT podporo, potřebujeme zázrak během 10 minut!" Kolega ti slibuje, že to zkusí...`,
		successChance: 70,
		successNodeId: "terminal_support_fixed",
		failNodeId: "terminal_still_broken",
	},

	// =========================================================================
	// OUTCOME: Bluffing
	// =========================================================================
	outcome_bluff: {
		id: "outcome_bluff",
		type: "outcome",
		narrative: `🎭 "Samozřejmě, máme kompletní GDPR certifikaci..." odpovídáš s přesvědčivým úsměvem...`,
		successChance: 70,
		successNodeId: "terminal_sold_it",
		failNodeId: "terminal_called_out",
	},

	// =========================================================================
	// OUTCOME: Recovery attempt
	// =========================================================================
	outcome_recovery: {
		id: "outcome_recovery",
		type: "outcome",
		narrative: `💡 "Vlastně, tohle je skvělá příležitost ukázat vám náš monitoring systém..." improvizuješ...`,
		successChance: 70,
		successNodeId: "terminal_brilliant_recovery",
		failNodeId: "terminal_complete_disaster",
	},

	// =========================================================================
	// OUTCOME: Backup laptop
	// =========================================================================
	outcome_backup_laptop: {
		id: "outcome_backup_laptop",
		type: "outcome",
		narrative: `💻 Rychle vytahuješ záložní laptop a spouštíš starší verzi dema. Klient čeká...`,
		successChance: 70,
		successNodeId: "terminal_backup_laptop",
		failNodeId: "terminal_backup_too_old",
	},

	// =========================================================================
	// OUTCOME: Honest approach
	// =========================================================================
	outcome_honest: {
		id: "outcome_honest",
		type: "outcome",
		narrative: `🤝 "Upřímně, na tuto otázku vám teď přesně neodpovím. Ale zjistím to a pošlu vám detailní odpověď do zítřka."

Klient tě pozorně sleduje...`,
		successChance: 70,
		successNodeId: "terminal_honest_approach",
		failNodeId: "terminal_honesty_backfired",
	},

	// =========================================================================
	// OUTCOME: Blaming infrastructure
	// =========================================================================
	outcome_blame_infra: {
		id: "outcome_blame_infra",
		type: "outcome",
		narrative: `🌐 "Omlouvám se, je to problém s jejich WiFi. Normálně to funguje perfektně..."

Klient zvedá obočí a kontroluje svůj telefon...`,
		successChance: 70,
		successNodeId: "terminal_excuse_accepted",
		failNodeId: "terminal_poor_excuse",
	},

	// =========================================================================
	// TERMINAL NODES (12 endings: 8 positive, 4 negative)
	// =========================================================================

	// Positive endings (8)
	terminal_mega_impressed: {
		id: "terminal_mega_impressed",
		type: "terminal",
		narrative: `🌟 **PERFEKTNÍ DEMO!**

Nové funkce fungují bezchybně. Klient je naprosto ohromený!

"Tohle je přesně to, co potřebujeme! Kde podepisuju?" říká nadšeně.

**Získáváš mega kontrakt a provizi +550 mincí!**`,
		coinsChange: 550,
		isPositiveEnding: true,
		xpMultiplier: 1.8,
	},

	terminal_contract_extended: {
		id: "terminal_contract_extended",
		type: "terminal",
		narrative: `✅ **PROFESIONÁLNÍ PREZENTACE**

Stabilní demo a jasná prezentace udělaly dojem. Klient souhlasí s podpisem smlouvy.

"Solidní práce. Začneme s roční smlouvou," říká spokojeně.

**Získáváš kontrakt a provizi +400 mincí!**`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_backup_laptop: {
		id: "terminal_backup_laptop",
		type: "terminal",
		narrative: `💻 **ZÁCHRANA V POSLEDNÍ CHVÍLI**

Rychle přepneš na záložní laptop. Sice běží starší verze, ale funguje perfektně.

"Vždy mít backup - to se mi líbí," usmívá se klient.

**Získáváš kontrakt a provizi +300 mincí!**`,
		coinsChange: 300,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_support_fixed: {
		id: "terminal_support_fixed",
		type: "terminal",
		narrative: `🔧 **IT TÝM ZACHRAŇUJE DEN**

S minutou do schůzky přichází zpráva: "Hotovo, mělo to být OK!"

Spouštíš demo před klientem - funguje! "Výborná týmová práce," komentuje klient.

**Získáváš kontrakt a provizi +350 mincí!**`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_sold_it: {
		id: "terminal_sold_it",
		type: "terminal",
		narrative: `🎯 **MISTROVSKÁ IMPROVIZACE**

Tvá sebevědomá odpověď klienta přesvědčila. Pokyvuje hlavou a dělá si poznámky.

"Přesně takový přístup hledáme. Pošleme smlouvu tento týden."

**Získáváš kontrakt a provizi +500 mincí!**`,
		coinsChange: 500,
		isPositiveEnding: true,
		xpMultiplier: 1.6,
	},

	terminal_honest_approach: {
		id: "terminal_honest_approach",
		type: "terminal",
		narrative: `🤝 **UPŘÍMNOST SE VYPLÁCÍ**

"Oceňuji vaši upřímnost," říká klient. "Radši přesná odpověď později než nepřesná hned."

Po schůzce ti posílá email s potvrzením zájmu. Získal si jeho respekt.

**Získáváš kontrakt a provizi +350 mincí!**`,
		coinsChange: 350,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_brilliant_recovery: {
		id: "terminal_brilliant_recovery",
		type: "terminal",
		narrative: `🎪 **GENIÁLNÍ OBRAT**

Tvá improvizace je brilantní! Crash jsi otočil ve výhodu a ukázal další funkce.

"Wow, tohle bylo působivé. Váš tým musí být excelentní!" Klient je nadšený.

**Získáváš kontrakt a bonusovou provizi +450 mincí!**`,
		coinsChange: 450,
		isPositiveEnding: true,
		xpMultiplier: 1.7,
	},

	terminal_unimpressed: {
		id: "terminal_unimpressed",
		type: "terminal",
		narrative: `😐 **PRŮMĚRNÁ PREZENTACE**

Demo funguje, ale klient vypadá unuděně. "To všechno už mají ostatní..."

Slíbí, že se ozve, ale víš, že to znamená ne. Aspoň jsi nedostal košem přímo.

**Žádný kontrakt, ale aspoň žádné ztráty. +50 mincí za pokus.**`,
		coinsChange: 50,
		isPositiveEnding: true,
		xpMultiplier: 0.8,
	},

	terminal_backup_too_old: {
		id: "terminal_backup_too_old",
		type: "terminal",
		narrative: `📟 **ZASTARALÁ VERZE**

Záložní laptop běží příliš starou verzi. Klient vidí chybějící funkce a zastaralý design.

"Tohle vypadá jako z roku 2015..." komentuje skepticky.

**Kontrakt ztracen, ztráta -150 mincí.**`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_honesty_backfired: {
		id: "terminal_honesty_backfired",
		type: "terminal",
		narrative: `😕 **UPŘÍMNOST NESTAČILA**

Klient se zamračí. "Potřebujeme dodavatele, který zná odpovědi hned. Nemáme čas čekat."

Tvá upřímnost byla oceněná, ale nestačila. **Ztráta -100 mincí.**`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_excuse_accepted: {
		id: "terminal_excuse_accepted",
		type: "terminal",
		narrative: `🤷 **VÝMLUVA PROŠLA**

Klient pokrčí rameny. "Dobře, ukažte mi to příště, až bude WiFi lepší."

Dostal jsi druhou šanci. Získáváš **+100 mincí** za přežití.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	// Negative endings (4)
	terminal_technical_issues: {
		id: "terminal_technical_issues",
		type: "terminal",
		narrative: `⚠️ **NESTABILNÍ TECHNOLOGIE**

Nové funkce začaly padat jedna za druhou. Chybové hlášky, zamrznutí, restart...

"Tohle je Beta verze, že?" ptá se klient sarkasticky. Vstává a odchází.

**Kontrakt ztracen, náklady na přípravu: -250 mincí.**`,
		coinsChange: -250,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_still_broken: {
		id: "terminal_still_broken",
		type: "terminal",
		narrative: `❌ **PROBLÉM NEODSTRANITELNÝ**

IT tým se snažil, ale demo stále nefunguje. Klient čeká, pak se podívá na hodinky.

"Nemám na tohle čas. Ozveme se vám... možná." Odchází frustrovaný.

**Kontrakt ztracen, ušlý zisk a náklady: -300 mincí.**`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.5,
	},

	terminal_called_out: {
		id: "terminal_called_out",
		type: "terminal",
		narrative: `🚨 **BLAF ODHALEN**

"Zajímavé," říká klient ledově. "Právě jsem se díval na váš web a GDPR certifikaci tam nemáte..."

Tvůj blaf byl prozrazen. Klient balí věci: "Nesnáším lháře."

**Kontrakt ztracen, pošramocená reputace: -400 mincí.**`,
		coinsChange: -400,
		isPositiveEnding: false,
		xpMultiplier: 0.4,
	},

	terminal_poor_excuse: {
		id: "terminal_poor_excuse",
		type: "terminal",
		narrative: `🤦 **PRŮHLEDNÁ VÝMLUVA**

Klient vytáhne telefon: "Podívejte, moje WiFi funguje perfektně. Netflix mi tu běží v 4K."

Tvá výmluva byla patetická. "Díky za váš čas," říká klient chladně a odchází.

**Kontrakt ztracen, náklady a hanba: -200 mincí.**`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_complete_disaster: {
		id: "terminal_complete_disaster",
		type: "terminal",
		narrative: `💥 **TOTÁLNÍ FIASKO**

Tvůj pokus o záchranu situace to jen zhoršil. Další funkce padají, systém se úplně zhroutil.

"To je dost," říká klient rozčíleně. "A já si s vámi měl podepsat roční smlouvu?"

**Kontrakt ztracen, pošramocená firma, právní náklady: -350 mincí.**`,
		coinsChange: -350,
		isPositiveEnding: false,
		xpMultiplier: 0.3,
	},
};

export const clientMeetingBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 24,
	averageReward: 250,
	maxPossibleReward: 550, // Best path: prepare -> show new features -> success
	minPossibleReward: -400, // Worst path: wing it -> bluff -> called out
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(clientMeetingBranchingStory);
