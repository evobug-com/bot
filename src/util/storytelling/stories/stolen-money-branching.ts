/**
 * Stolen Money - Branching Story
 *
 * Branching narrative about finding a wallet.
 * Features 3 decision layers and 11 unique endings.
 *
 * Story Graph:
 * [INTRO] -> [DECISION 1: Steal or Return]
 *   -> Steal -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2a: What to do with money]
 *       -> Invest -> [OUTCOME] -> [TERMINAL: Rich/Scammed]
 *       -> Spend  -> [OUTCOME] -> [TERMINAL: Happy/Broke]
 *     -> Failure -> [DECISION 2b: Caught by witness]
 *       -> Run    -> [OUTCOME] -> [TERMINAL: Escaped/Caught]
 *       -> Bribe  -> [TERMINAL: Bribed witness]
 *   -> Return -> [OUTCOME 70/30]
 *     -> Success -> [DECISION 2c: Lady offers reward]
 *       -> Accept  -> [TERMINAL: Modest reward]
 *       -> Decline -> [OUTCOME] -> [TERMINAL: Karma/Nothing]
 *     -> Failure -> [TERMINAL: Lady suspicious]
 */

import type { BranchingStory, StoryNode } from "../types";
import { randomInt } from "../types";

const STORY_ID = "stolen_money_branching";
const STORY_TITLE = "Ukradené peníze";
const STORY_EMOJI = "💰";

const nodes: Record<string, StoryNode> = {
	// =========================================================================
	// INTRO
	// =========================================================================
	intro: {
		id: "intro",
		type: "intro",
		narrative: () => `Procházíš parkem, když si všimneš starší paní, která upustila peněženku. Rychle ji sebereš - je v ní **${randomInt(400, 600)} mincí**!

Paní si ničeho nevšimla a pomalu odchází. Srdce ti buší... *co uděláš?*`,
		nextNodeId: "decision_1",
	},

	// =========================================================================
	// DECISION 1: Steal or Return
	// =========================================================================
	decision_1: {
		id: "decision_1",
		type: "decision",
		narrative: `Peněženka je ve tvých rukou. Máš na výběr - můžeš se pokusit utéct s penězi, nebo je vrátit majitelce.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Utéct s penězi",
				description: "Riskantní, ale potenciálně výnosné. Někdo tě ale může vidět!",
				baseReward: 500,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_steal",
			},
			choiceY: {
				id: "choiceY",
				label: "Vrátit peněženku",
				description: "Čestná varianta. Možná ti paní dá odměnu za poctivost.",
				baseReward: 200,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_return",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Stealing
	// =========================================================================
	outcome_steal: {
		id: "outcome_steal",
		type: "outcome",
		narrative: `🏃 Rozhodneš se utéct s peněženkou. Srdce ti buší, nohy se dávají do pohybu...`,
		successChance: 70,
		successNodeId: "decision_2a_money",
		failNodeId: "decision_2b_caught",
	},

	// =========================================================================
	// DECISION 2a: Successfully stole - what to do with money
	// =========================================================================
	decision_2a_money: {
		id: "decision_2a_money",
		type: "decision",
		narrative: () => {
			const amount = randomInt(400, 600);
			return `🍀 **Štěstí!** Utekl jsi bez problémů a nikdo tě neviděl.

Teď máš **${amount} mincí** navíc. Co s nimi uděláš?`;
		},
		coinsChange: () => randomInt(400, 600),
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Investovat",
				description: "Kolega ti říkal o skvělé investiční příležitosti...",
				baseReward: 800,
				riskMultiplier: 1.2,
				nextNodeId: "outcome_invest",
			},
			choiceY: {
				id: "choiceY",
				label: "Utrácet",
				description: "Zajdeš do hospody a pozveš kamarády na pivo.",
				baseReward: 200,
				riskMultiplier: 0.8,
				nextNodeId: "outcome_spend",
			},
		},
	},

	// =========================================================================
	// DECISION 2b: Caught by witness
	// =========================================================================
	decision_2b_caught: {
		id: "decision_2b_caught",
		type: "decision",
		narrative: `😰 **Někdo tě viděl!** Kolemjdoucí si všiml, jak bereš peněženku, a jde k tobě.

"Hej, to není tvoje!" volá na tebe.`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Utéct",
				description: "Zkusíš rychle zmizet, než tě chytí.",
				baseReward: 300,
				riskMultiplier: 1.3,
				nextNodeId: "outcome_run",
			},
			choiceY: {
				id: "choiceY",
				label: "Podplatit svědka",
				description: "Nabídneš mu polovinu, ať drží hubu.",
				baseReward: 250,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_bribe",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Investment
	// =========================================================================
	outcome_invest: {
		id: "outcome_invest",
		type: "outcome",
		narrative: `📈 Kolega ti ukázal "zaručenou" investici do kryptoměn. Vložíš všechny peníze...`,
		successChance: 70,
		successNodeId: "terminal_rich",
		failNodeId: "terminal_scammed",
	},

	// =========================================================================
	// OUTCOME: Spending
	// =========================================================================
	outcome_spend: {
		id: "outcome_spend",
		type: "outcome",
		narrative: `🍺 V hospodě objednáváš rundu za rundou. Večer plyne...`,
		successChance: 70,
		successNodeId: "terminal_happy_drunk",
		failNodeId: "terminal_broke_drunk",
	},

	// =========================================================================
	// OUTCOME: Running from witness
	// =========================================================================
	outcome_run: {
		id: "outcome_run",
		type: "outcome",
		narrative: `🏃💨 Dáváš se na útěk! Svědek volá za tebou...`,
		successChance: 70,
		successNodeId: "terminal_escaped_witness",
		failNodeId: "terminal_caught_police",
	},

	// =========================================================================
	// OUTCOME: Returning wallet
	// =========================================================================
	outcome_return: {
		id: "outcome_return",
		type: "outcome",
		narrative: `👵 "Paní, počkejte! Upustila jste peněženku!" voláš a běžíš za ní...`,
		successChance: 70,
		successNodeId: "decision_2c_reward",
		failNodeId: "decision_2d_suspicious",
	},

	// =========================================================================
	// DECISION 2c: Lady offers reward
	// =========================================================================
	decision_2c_reward: {
		id: "decision_2c_reward",
		type: "decision",
		narrative: () => {
			const reward = randomInt(150, 250);
			return `😊 Paní se rozzáří vděčností. "Ach, děkuji vám mnohokrát! Jste tak hodný!"

Sahá do peněženky a nabízí ti **${reward} mincí** jako odměnu.`;
		},
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Přijmout odměnu",
				description: "Zasloužíš si to za poctivost.",
				baseReward: 200,
				riskMultiplier: 0.5,
				nextNodeId: "outcome_accept_reward",
			},
			choiceY: {
				id: "choiceY",
				label: "Odmítnout odměnu",
				description: '"Ne, to není třeba." Možná se ti to vrátí jinak.',
				baseReward: 100,
				riskMultiplier: 1.0,
				nextNodeId: "outcome_karma",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Karma for declining reward
	// =========================================================================
	outcome_karma: {
		id: "outcome_karma",
		type: "outcome",
		narrative: `✨ Paní ti vděčně stiskne ruku a odchází. Cítíš se dobře...

Cestou domů najdeš na zemi něco zajímavého...`,
		successChance: 70,
		successNodeId: "terminal_karma_reward",
		failNodeId: "terminal_nothing",
	},

	// =========================================================================
	// OUTCOME: Bribing the witness
	// =========================================================================
	outcome_bribe: {
		id: "outcome_bribe",
		type: "outcome",
		narrative: `🤫 Vytahuješ peníze a nabízíš je svědkovi. "Tady máš, a zapomeň, co jsi viděl..."`,
		successChance: 70,
		successNodeId: "terminal_bribed",
		failNodeId: "terminal_bribe_failed",
	},

	// =========================================================================
	// OUTCOME: Accepting the reward
	// =========================================================================
	outcome_accept_reward: {
		id: "outcome_accept_reward",
		type: "outcome",
		narrative: `🙏 Natáhneš ruku pro odměnu. Paní se usmívá a sahá do peněženky...`,
		successChance: 70,
		successNodeId: "terminal_accepted_reward",
		failNodeId: "terminal_reward_awkward",
	},

	// =========================================================================
	// DECISION 2d: Suspicious lady - how to react
	// =========================================================================
	decision_2d_suspicious: {
		id: "decision_2d_suspicious",
		type: "decision",
		narrative: `🤨 Paní se na tebe dívá podezíravě. "Kde jste tu peněženku vzal? Viděla jsem, jak jste ji sebral ze země!"

Situace je napjatá. Jak zareaguješ?`,
		choices: {
			choiceX: {
				id: "choiceX",
				label: "Vysvětlit situaci",
				description: "Klidně jí vysvětlíš, že jsi viděl, jak jí peněženka vypadla.",
				baseReward: 150,
				riskMultiplier: 0.9,
				nextNodeId: "outcome_explain",
			},
			choiceY: {
				id: "choiceY",
				label: "Vrátit a odejít",
				description: "Podáš jí peněženku, nic neříkáš a rychle odcházíš.",
				baseReward: 50,
				riskMultiplier: 0.7,
				nextNodeId: "outcome_leave_quickly",
			},
		},
	},

	// =========================================================================
	// OUTCOME: Explaining to suspicious lady
	// =========================================================================
	outcome_explain: {
		id: "outcome_explain",
		type: "outcome",
		narrative: `🗣️ "Paní, viděl jsem, jak vám vypadla. Běžel jsem za vámi, abych vám ji vrátil..."

Paní tě pozorně poslouchá...`,
		successChance: 70,
		successNodeId: "terminal_suspicious_resolved",
		failNodeId: "terminal_suspicious",
	},

	// =========================================================================
	// OUTCOME: Leaving quickly
	// =========================================================================
	outcome_leave_quickly: {
		id: "outcome_leave_quickly",
		type: "outcome",
		narrative: `🚶 Podáváš peněženku a otáčíš se k odchodu. Paní něco volá za tebou...`,
		successChance: 70,
		successNodeId: "terminal_quiet_exit",
		failNodeId: "terminal_suspicious_police",
	},

	// =========================================================================
	// TERMINAL NODES (11 endings)
	// =========================================================================

	// Positive endings (8)
	terminal_rich: {
		id: "terminal_rich",
		type: "terminal",
		narrative: `🚀 **JACKPOT!**

Investice vyšla! Kryptoměna vystřelila nahoru a tvůj zisk je **+800 mincí**!

Někdy se zločin vyplácí... ale pamatuj, štěstí netrvá věčně.`,
		coinsChange: 800,
		isPositiveEnding: true,
		xpMultiplier: 1.5,
	},

	terminal_happy_drunk: {
		id: "terminal_happy_drunk",
		type: "terminal",
		narrative: `🎉 **Skvělý večer!**

Měl jsi parádní večer s kamarády. Sice jsi utratil většinu peněz, ale zůstalo ti **+200 mincí** a spousta vzpomínek.

Někdy je lepší užívat si přítomnost.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_escaped_witness: {
		id: "terminal_escaped_witness",
		type: "terminal",
		narrative: `🏃 **Útěk se podařil!**

Svědek tě ztratil z dohledu. Schováš se za roh a počkáš, než se situace uklidní.

Necháváš si **+400 mincí**, ale srdce ti pořád buší.`,
		coinsChange: 400,
		isPositiveEnding: true,
		xpMultiplier: 1.3,
	},

	terminal_bribed: {
		id: "terminal_bribed",
		type: "terminal",
		narrative: `🤝 **Dohoda uzavřena**

"Tady máš 250, a na nic jsi neviděl, jasný?"

Svědek přikývne a zmizí. Necháváš si **+250 mincí**. Korupce funguje.`,
		coinsChange: 250,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_accepted_reward: {
		id: "terminal_accepted_reward",
		type: "terminal",
		narrative: `🙏 **Poctivost se vyplácí**

Přijímáš odměnu s úsměvem. Paní ti děkuje a přeje hezký den.

Získáváš **+200 mincí** a dobrý pocit z poctivého jednání.`,
		coinsChange: 200,
		isPositiveEnding: true,
		xpMultiplier: 1.2,
	},

	terminal_karma_reward: {
		id: "terminal_karma_reward",
		type: "terminal",
		narrative: `🍀 **Karma!**

Na chodníku najdeš **100 mincí**! Vypadá to, že vesmír odměňuje dobré skutky.

Dnes je tvůj šťastný den - získáváš **+100 mincí** a čisté svědomí.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 1.4,
	},

	terminal_nothing: {
		id: "terminal_nothing",
		type: "terminal",
		narrative: `🚶 **Normální den**

Nic zvláštního se nestalo. Odmítl jsi odměnu a šel domů.

Nezískal jsi nic, ale ani jsi nic neztratil. Někdy je to tak.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_suspicious: {
		id: "terminal_suspicious",
		type: "terminal",
		narrative: `🤨 **Podezření**

Paní se na tebe divně dívá. "Kde jste tu peněženku vzal? Viděla jsem, jak jste ji sebral ze země!"

Než stihneš něco říct, odchází s podezíravým výrazem. Žádná odměna.`,
		coinsChange: 0,
		isPositiveEnding: true, // Still positive - no loss
		xpMultiplier: 0.8,
	},

	terminal_bribe_failed: {
		id: "terminal_bribe_failed",
		type: "terminal",
		narrative: `🚔 **Úplatek selhal!**

Svědek se naštval: "Ty mě chceš podplatit?! Volám policii!"

Přijíždí hlídka a musíš zaplatit pokutu. Ztrácíš **-200 mincí**.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	terminal_reward_awkward: {
		id: "terminal_reward_awkward",
		type: "terminal",
		narrative: `😅 **Trapný moment**

Paní otevře peněženku a zjistí, že má jen drobné. "Ach, je mi to trapné, nemám moc..."

Dostaneš pár korun a oba se cítíte nesvůj. Získáváš **+50 mincí**.`,
		coinsChange: 50,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_suspicious_resolved: {
		id: "terminal_suspicious_resolved",
		type: "terminal",
		narrative: `😊 **Nedorozumění vyřešeno!**

Paní ti nakonec uvěřila. "Promiňte, jsem stará a podezíravá. Děkuji vám!"

Získáváš **+100 mincí** jako malou odměnu za trpělivost.`,
		coinsChange: 100,
		isPositiveEnding: true,
		xpMultiplier: 1.0,
	},

	terminal_quiet_exit: {
		id: "terminal_quiet_exit",
		type: "terminal",
		narrative: `🚶 **Tichý odchod**

Paní za tebou volá poděkování, ale ty už jsi pryč. Dobrý skutek bez odměny.

Nezískal jsi nic, ale svědomí máš čisté. **+0 mincí**.`,
		coinsChange: 0,
		isPositiveEnding: true,
		xpMultiplier: 0.9,
	},

	terminal_suspicious_police: {
		id: "terminal_suspicious_police",
		type: "terminal",
		narrative: `🚔 **Policie!**

Paní si myslela, že utíkáš, a zavolala policii. Musíš vysvětlovat situaci na stanici.

Ztratil jsi čas a nervy. Ztrácíš **-100 mincí**.`,
		coinsChange: -100,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},

	// Negative endings (3)
	terminal_scammed: {
		id: "terminal_scammed",
		type: "terminal",
		narrative: `💸 **Podvod!**

"Investice" byla podvod! Kolega zmizel i s tvými penězi.

Ztrácíš **-300 mincí**. Příště si dej pozor, komu věříš.`,
		coinsChange: -300,
		isPositiveEnding: false,
		xpMultiplier: 0.7,
	},

	terminal_broke_drunk: {
		id: "terminal_broke_drunk",
		type: "terminal",
		narrative: `😵 **Kocovina a prázdná kapsa**

Ráno se probouzíš s bolestí hlavy a prázdnou peněženkou. Utratil jsi všechno a ještě jsi někomu dlužil.

Ztrácíš **-150 mincí**. Příště pomaleji.`,
		coinsChange: -150,
		isPositiveEnding: false,
		xpMultiplier: 0.8,
	},

	terminal_caught_police: {
		id: "terminal_caught_police",
		type: "terminal",
		narrative: `🚔 **Chycen!**

Svědek tě dostihl a zavolal policii. Musíš zaplatit pokutu a vrátit peníze.

Ztrácíš **-200 mincí**. Zločin se nevyplácí.`,
		coinsChange: -200,
		isPositiveEnding: false,
		xpMultiplier: 0.6,
	},
};

export const stolenMoneyBranchingStory: BranchingStory = {
	id: STORY_ID,
	title: STORY_TITLE,
	emoji: STORY_EMOJI,
	startNodeId: "intro",
	nodes,

	// Balance metadata
	expectedPaths: 20,
	averageReward: 200,
	maxPossibleReward: 1300, // Steal success + invest success
	minPossibleReward: -300, // Steal success + invest fail (scammed)
};

// Auto-register the story when imported
import { registerStory } from "../engine";
registerStory(stolenMoneyBranchingStory);
