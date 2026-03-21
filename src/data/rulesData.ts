import { type MessageCreateOptions, MessageFlags, SeparatorSpacingSize } from "discord.js";
import {
	ActionRowBuilder,
	ContainerBuilder,
	PrimaryButtonBuilder,
	SecondaryButtonBuilder,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
} from "@discordjs/builders";

/**
 * Rules message using Discord's Components V2 system
 * This provides rich formatting with containers, sections, and display components
 */

/**
 * Create the verification options container
 */
function createVerificationContainer() {
	return (
		new ContainerBuilder()
			.setAccentColor(0x00ff00) // Green for verification
			.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent("## 🔐 Možnosti verifikace\n\nVyber si, jak chceš získat přístup k serveru:"),
			)
			.addSeparatorComponents((separator) => separator.setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			// Full quiz option
			.addTextDisplayComponents(
				(textDisplay) => textDisplay.setContent("### 📝 Plný kvíz"),
				(textDisplay) =>
					textDisplay.setContent(
						"• Zodpověz **5 otázek** z pravidel\n" +
							"• Potřebuješ **4 správné odpovědi** (80%)\n" +
							"• Získáš **plný přístup** ke všem kanálům\n" +
							"• Trvá 2-3 minuty",
					),
			)
			.addSeparatorComponents((separator) => separator.setDivider(false).setSpacing(SeparatorSpacingSize.Small))
			// Quick access option
			.addTextDisplayComponents(
				(textDisplay) => textDisplay.setContent("### 🎤 Rychlý přístup"),
				(textDisplay) =>
					textDisplay.setContent(
						"• Stačí souhlasit s pravidly\n" + "• Přístup k **hlasovým místnostem 2xx**\n" + "• Okamžitý přístup",
					),
			)
	);
}

/**
 * Create info/help container
 */
function createInfoContainer() {
	return (
		new ContainerBuilder()
			// .setAccentColor(0xFFA500) // Orange for info
			.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					"### ℹ️ Důležité informace\n\n" +
						"• Porušování pravidel hlaste příkazem `/report`\n" +
						"• Problémy s verifikací? Navštivte <#1393664796867694713>\n" +
						"• Řídíme se pravidlem tří varování\n" +
						"• Z částečného přístupu můžete upgradovat na plný",
				),
			)
	);
}

export const rulesText = `# \uD83D\uDCDC PRAVIDLA SERVERU ALLCOM
**Vítej na serveru allcom** *(all - všeobecná, com - komunita)*

**TL;DR:** Text držíme PG-13 (žádný sexual/gore, žádné útoky na lidi). Voice může být slovně "slanější", ale bez šikany, slurů a výhrůžek. Žádný dvojí metr – platí pro všechny. Pinguj s rozumem. Moderace jedná rychle.
### Základní chování
101. Respekt. Žádná šikana, výhrůžky, nenávist, extremismus ani osobní urážky.
102. Soukromí. Žádné doxxování; cizí osobní údaje jen s výslovným souhlasem.
103. Bezpečí. Zakázán obsah podporující sebepoškozování či sebevraždu.
104. Nelegální/škodlivé. Žádné podvody, phishing, malware, návody k hackingu, warez, hazard, prodej/propagace regulovaného zboží.
105. Bez výjimek pro "kamarády". Pravidla platí shodně pro všechny.
106. Autorská práva. Nesdílej cizí obsah bez práv.
### Text & Voice
201. Text = PG-13. Žádný sexuální obsah, erotika, sexualizace nezletilých, gore nebo grafické násilí. Žádné slury/nenávistné symboly.
202. Voice = volnější slovník, stejné hranice respektu. Nadávky k hře/frustraci ok, ne na lidi. Žádné slury, výhrůžky, obtěžování. Soundboardy a hlasitost tak, aby to nerušilo – na pokyn moderátora okamžitě ztlumit/ukončit.
203. Vizuality & náhledy. Žádný 18+ v avatarech, nickách, emoji, bannerech. Náhledy/linky s NSFW/šok obsahem sem nepatří.
204. Spoilery/citlivé. Označuj spoilerem; co není PG-13, sem nedávej.
### Spam, mentions a formátování
301. Mentions. @everyone/@here jen staff. Nepinguj role/lidi bez důvodu. Max 1 ping na problém, žádné bumpování pingy.
302. Flood & opakování. Neskládej 5 krátkých zpráv; spoj je. Delší text/logy → thread nebo příloha/paste.
303. Kapitálky. CELÝ TEXT VELKÝMI jen výjimečně pro krátké zdůraznění.
304. [Markdown](https://support.discord.com/hc/en-us/articles/210298617-Markdown-Text-101-Chat-Formatting-Bold-Italic-Underline). Nadpisy pro strukturu, ne "křik". Code-blocky jen na kód/logy. Nezneužívej spoiler k maskování urážek/NSFW.
305. Reakce/emoji. Žádný reaction-spam ani tapety z emoji.
306. Citace. Necituj celé stěny textu; max dvě úrovně.
### Obsah & kanály
401. Téma. Sdílej ve správných kanálech; off-topic do threadu/správné místnosti.
402. Odkazy. Žádné podezřelé/obcházející zabezpečení.
403. Memes. Používej #memes-sfw – žádný sexual/gore/nenávistné symboly.
### Reklama
501. Reklama jen v <#1325528362583588925>. Žádné skryté promo, referral spam, klik-farming.
502. Žádná nevyžádaná reklama v DM. DM promo = mute/ban.
### Identita & soukromí
601. Zákaz vydávání se za jiné osoby/staff. Ani "napodobovací" nick/avatar.
602. Nezveřejňuj soukromé konverzace bez souhlasu.
### Jazyk
701. Čeština/Slovenština mimo kanály pro cizí jazyky.
702. Klení: míra a kontext. Frustrace ok, ne mířené na uživatele. Žádné obcházení slovníků.
### Technické & účty
801. Žádné self-boty, raidování, umělé navyšování aktivity.
802. Alternativní účty jen se souhlasem staff při řešení problémů.
803. Nahlášení problémů přes #modmail / ticket.
### Věk & zákony
901. Věk. CZ 15+, SK 16+, ostatní dle minima Discordu pro jejich zemi (nejméně 13).
902. Dodržuj zákony své země.
### Moderace
1001. Postihy. Varování → timeout → kick/ban. Těžké prohřešky (hrozby, doxx, slury, malware, raid) = okamžitý ban.
1002. Odstranění obsahu. Moderátoři můžou mazat/přesouvat obsah, který porušuje pravidla nebo rozbíjí konverzaci.
1003. Odvolání. Piš do #modmail; posuzujeme podle důkazů.
1004. [Zásady Discordu](https://allcom.zone/discord/guidelines). Platí vždy a mají přednost.`;

/**
 * Create ultra-condensed rules container with all rules in single TextDisplay
 */
export const createRulesContainer = () => {
	return new ContainerBuilder().addTextDisplayComponents((textDisplay) => textDisplay.setContent(rulesText));
};

/**
 * Main rules message using Components V2
 */
export const rulesData: MessageCreateOptions = {
	components: [
		createRulesContainer(),
		new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Large),
		createVerificationContainer(),
		new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
		// Action row with verification buttons
		new ActionRowBuilder().addComponents(
			new PrimaryButtonBuilder()
				.setCustomId("start_full_quiz")
				.setLabel("Plný kvíz - Kompletní přístup")
				.setEmoji({ name: "📝" }),
			new SecondaryButtonBuilder()
				.setCustomId("accept_partial_rules")
				.setLabel("Rychlý přístup - Hlasové místnosti")
				.setEmoji({ name: "🎤" }),
		),
	],
	flags: MessageFlags.IsComponentsV2,
};

export const infoData: MessageCreateOptions = {
	components: [
		createInfoContainer(),
		new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
		createExplanationContainer(),
	],
	flags: MessageFlags.IsComponentsV2,
};

/**
 * Create explanation container for why rules are structured this way
 */
function createExplanationContainer() {
	return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`### 📎 "Proč to tak je" – vysvětlení
**Chceme být otevření nováčkům.** PG-13 text a jednotná pravidla = předvídatelné prostředí.
**Voice není výjimka.** Je volnější na slovník, ne na chování. Nadávat na hru ≠ nadávat lidem.
**Humor a ostří zůstává.** Jen bez sexual/gore v textu a bez útoků na lidi.
**Žádný dvojí metr.** \\"Kamarád\\" ≠ volná vstupenka.
**Moderace chrání konverzaci, ne ego.** Rychlé zásahy s minimem byrokracie.`),
	);
}

/**
 * Rules explanation message using Components V2
 */
export const rulesExplanation: MessageCreateOptions = {
	components: [createExplanationContainer()],
	flags: MessageFlags.IsComponentsV2,
};

/**
 * Simplified version with just the verification buttons
 */
export const rulesComponentsV2Simple: MessageCreateOptions = {
	components: [
		new TextDisplayBuilder().setContent(
			"# 📜 PRAVIDLA SERVERU\n\n" +
				"**Základní pravidla:**\n" +
				"• Respektuj ostatní\n" +
				"• Žádný spam nebo nevhodný obsah\n" +
				"• Český/Slovenský jazyk\n" +
				"• Min. věk: CZ 15, SK 16 let\n\n" +
				"**Kompletní pravidla jsou k dispozici po verifikaci.**",
		),
		new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
		new SectionBuilder().addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent("**Vyber způsob verifikace:**"),
		),
		new ActionRowBuilder().addComponents(
			new PrimaryButtonBuilder()
				.setCustomId("start_full_quiz")
				.setLabel("Plný kvíz - Kompletní přístup")
				.setEmoji({ name: "📝" }),
			new SecondaryButtonBuilder()
				.setCustomId("accept_partial_rules")
				.setLabel("Rychlý přístup - Hlasové místnosti")
				.setEmoji({ name: "🎤" }),
		),
	],
	flags: MessageFlags.IsComponentsV2,
};

export interface RuleQuestion {
	question: string;
	ruleNumber: string;
	category: string;
}

export interface NonNumericRuleQuestion {
	question: string;
	correctAnswer: string;
	wrongAnswers: string[];
	category: string;
}

export const ruleQuestions: RuleQuestion[] = [
	// Základní chování (100)
	{
		question: "Které pravidlo zakazuje šikanu, výhrůžky, nenávist a extremismus?",
		ruleNumber: "101",
		category: "Základní chování",
	},
	{
		question: "Které pravidlo zakazuje zveřejňování osobních údajů bez souhlasu?",
		ruleNumber: "102",
		category: "Základní chování",
	},
	{
		question: "Které pravidlo zakazuje obsah podporující sebepoškozování?",
		ruleNumber: "103",
		category: "Základní chování",
	},
	{
		question: "Které pravidlo zakazuje podvody, phishing a malware?",
		ruleNumber: "104",
		category: "Základní chování",
	},
	{
		question: "Které pravidlo říká, že výjimky pro kamarády neexistují?",
		ruleNumber: "105",
		category: "Základní chování",
	},
	{
		question: "Které pravidlo zakazuje sdílení cizího obsahu bez práv?",
		ruleNumber: "106",
		category: "Základní chování",
	},
	// Text & Voice (200)
	{
		question: "Které pravidlo stanovuje PG-13 limit pro textový obsah?",
		ruleNumber: "201",
		category: "Text & Voice",
	},
	{
		question: "Které pravidlo povoluje volnější slovník ve voice, ale se zachováním respektu?",
		ruleNumber: "202",
		category: "Text & Voice",
	},
	{
		question: "Které pravidlo zakazuje 18+ obsah v avatarech a nickech?",
		ruleNumber: "203",
		category: "Text & Voice",
	},
	{
		question: "Které pravidlo vyžaduje označování spoilerů?",
		ruleNumber: "204",
		category: "Text & Voice",
	},
	// Spam, mentions a formátování (300)
	{
		question: "Které pravidlo omezuje používání @everyone/@here pouze na staff?",
		ruleNumber: "301",
		category: "Spam, mentions a formátování",
	},
	{
		question: "Které pravidlo zakazuje skládání 5 krátkých zpráv?",
		ruleNumber: "302",
		category: "Spam, mentions a formátování",
	},
	{
		question: "Které pravidlo omezuje používání kapitálek?",
		ruleNumber: "303",
		category: "Spam, mentions a formátování",
	},
	{
		question: "Které pravidlo se týká správného používání markdown formátování?",
		ruleNumber: "304",
		category: "Spam, mentions a formátování",
	},
	{
		question: "Které pravidlo zakazuje reaction-spam a emoji tapety?",
		ruleNumber: "305",
		category: "Spam, mentions a formátování",
	},
	{
		question: "Které pravidlo omezuje citování na max dvě úrovně?",
		ruleNumber: "306",
		category: "Spam, mentions a formátování",
	},
	// Obsah & kanály (400)
	{
		question: "Které pravidlo vyžaduje sdílení obsahu ve správných kanálech?",
		ruleNumber: "401",
		category: "Obsah & kanály",
	},
	{
		question: "Které pravidlo zakazuje podezřelé odkazy?",
		ruleNumber: "402",
		category: "Obsah & kanály",
	},
	{
		question: "Které pravidlo upravuje používání memes v #memes-sfw?",
		ruleNumber: "403",
		category: "Obsah & kanály",
	},
	// Reklama (500)
	{
		question: "Které pravidlo povoluje reklamu pouze v reklamním kanále?",
		ruleNumber: "501",
		category: "Reklama",
	},
	{
		question: "Které pravidlo zakazuje nevyžádanou reklamu v DM?",
		ruleNumber: "502",
		category: "Reklama",
	},
	// Identita & soukromí (600)
	{
		question: "Které pravidlo zakazuje vydávání se za jiné osoby/staff?",
		ruleNumber: "601",
		category: "Identita & soukromí",
	},
	{
		question: "Které pravidlo zakazuje zveřejňování soukromých konverzací?",
		ruleNumber: "602",
		category: "Identita & soukromí",
	},
	// Jazyk (700)
	{
		question: "Které pravidlo vyžaduje používání češtiny/slovenštiny?",
		ruleNumber: "701",
		category: "Jazyk",
	},
	{
		question: "Které pravidlo upravuje klení a jeho kontext?",
		ruleNumber: "702",
		category: "Jazyk",
	},
	// Technické & účty (800)
	{
		question: "Které pravidlo zakazuje self-boty a raidování?",
		ruleNumber: "801",
		category: "Technické & účty",
	},
	{
		question: "Které pravidlo upravuje používání alternativních účtů?",
		ruleNumber: "802",
		category: "Technické & účty",
	},
	{
		question: "Které pravidlo stanovuje způsob nahlašování problémů?",
		ruleNumber: "803",
		category: "Technické & účty",
	},
	// Věk & zákony (900)
	{
		question: "Které pravidlo stanovuje minimální věk pro české a slovenské uživatele?",
		ruleNumber: "901",
		category: "Věk & zákony",
	},
	{
		question: "Které pravidlo vyžaduje dodržování zákonů své země?",
		ruleNumber: "902",
		category: "Věk & zákony",
	},
	// Moderace (1000)
	{
		question: "Které pravidlo popisuje systém postihů?",
		ruleNumber: "1001",
		category: "Moderace",
	},
	{
		question: "Které pravidlo upravuje odstranění obsahu moderátory?",
		ruleNumber: "1002",
		category: "Moderace",
	},
	{
		question: "Které pravidlo popisuje proces odvolání?",
		ruleNumber: "1003",
		category: "Moderace",
	},
	{
		question: "Které pravidlo odkazuje na Zásady Discordu?",
		ruleNumber: "1004",
		category: "Moderace",
	},
];

export const nonNumericRuleQuestions: NonNumericRuleQuestion[] = [
	{
		question: "Které pravidlo povoluje sdílení warez?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 104", "Pravidlo 501", "Pravidlo 401", "Pravidlo 701", "Pravidlo 901"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo povoluje výjimku pro spam v kanálech?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 302", "Pravidlo 306", "Pravidlo 401", "Pravidlo 204", "Pravidlo 601"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo povoluje urážky ostatních uživatelů ve speciálních případech?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 101", "Pravidlo 202", "Pravidlo 702", "Pravidlo 103", "Pravidlo 501"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo umožňuje reklamu v obecném chatu?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 501", "Pravidlo 502", "Pravidlo 401", "Pravidlo 201", "Pravidlo 304"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo povoluje používání angličtiny v hlavních kanálech?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 701", "Pravidlo 702", "Pravidlo 304", "Pravidlo 202", "Pravidlo 306"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo umožňuje vydávání se za moderátory?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 601", "Pravidlo 101", "Pravidlo 501", "Pravidlo 102", "Pravidlo 305"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo povoluje sdílení osobních údajů cizích lidí bez souhlasu?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 102", "Pravidlo 602", "Pravidlo 104", "Pravidlo 702", "Pravidlo 203"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo dává vyjímku k porušování Discord ToS?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 1004", "Pravidlo 901", "Pravidlo 101", "Pravidlo 104", "Pravidlo 501"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo povoluje používání více účtů k obcházení banů?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 802", "Pravidlo 801", "Pravidlo 601", "Pravidlo 102", "Pravidlo 702"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo dovoluje prodej věcí na serveru?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 501", "Pravidlo 502", "Pravidlo 401", "Pravidlo 1004", "Pravidlo 204"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo umožňuje sdílení NSFW obsahu?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 104", "Pravidlo 201", "Pravidlo 203", "Pravidlo 1004", "Pravidlo 401"],
		category: "Zakázané činnosti",
	},
	{
		question: "Které pravidlo povoluje používání kapitálek ve všech zprávách?",
		correctAnswer: "Žádné pravidlo",
		wrongAnswers: ["Pravidlo 303", "Pravidlo 201", "Pravidlo 304", "Pravidlo 204", "Pravidlo 102"],
		category: "Zakázané činnosti",
	},
];

export interface MixedQuizConfig {
	totalQuestions: number;
	numericQuestions: number;
	nonNumericQuestions: number;
}

export type QuizQuestion = RuleQuestion | NonNumericRuleQuestion;

export function isNumericQuestion(question: QuizQuestion): question is RuleQuestion {
	return "ruleNumber" in question;
}

export function isNonNumericQuestion(question: QuizQuestion): question is NonNumericRuleQuestion {
	return "correctAnswer" in question && "wrongAnswers" in question;
}

export function getMixedRandomQuestions(config: MixedQuizConfig): QuizQuestion[] {
	const { totalQuestions, numericQuestions, nonNumericQuestions } = config;

	// Validate config
	if (numericQuestions + nonNumericQuestions !== totalQuestions) {
		throw new Error("Sum of numeric and non-numeric questions must equal total questions");
	}

	const selectedQuestions: QuizQuestion[] = [];

	// Get numeric questions
	const availableNumeric = [...ruleQuestions];
	const numericCount = Math.min(numericQuestions, availableNumeric.length);

	for (let i = 0; i < numericCount; i++) {
		const randomIndex = Math.floor(Math.random() * availableNumeric.length);
		const question = availableNumeric.splice(randomIndex, 1)[0];
		if (question) {
			selectedQuestions.push(question);
		}
	}

	// Get non-numeric questions
	const availableNonNumeric = [...nonNumericRuleQuestions];
	const nonNumericCount = Math.min(nonNumericQuestions, availableNonNumeric.length);

	for (let i = 0; i < nonNumericCount; i++) {
		const randomIndex = Math.floor(Math.random() * availableNonNumeric.length);
		const question = availableNonNumeric.splice(randomIndex, 1)[0];
		if (question) {
			selectedQuestions.push(question);
		}
	}

	// Shuffle the combined array to mix question types
	return selectedQuestions.sort(() => Math.random() - 0.5);
}

export function isCorrectAnswer(question: QuizQuestion, answer: string): boolean {
	if (isNumericQuestion(question)) {
		// Normalize the answer - remove spaces and convert to lowercase
		const normalizedAnswer = answer.trim().toLowerCase();
		const normalizedRuleNumber = question.ruleNumber.toLowerCase();

		// Accept answers with or without dots (e.g., "501" or "5.0.1")
		const answerWithoutDots = normalizedAnswer.replace(/\./g, "");

		return normalizedRuleNumber === answerWithoutDots;
	} else if (isNonNumericQuestion(question)) {
		// For non-numeric questions, compare with the correct answer (case-insensitive)
		const normalizedAnswer = answer.trim().toLowerCase();
		const normalizedCorrect = question.correctAnswer.toLowerCase();
		return normalizedAnswer === normalizedCorrect;
	}

	return false;
}
