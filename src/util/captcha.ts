import {
	ActionRowBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	ComponentType,
	EmbedBuilder,
	MessageFlags,
	SecondaryButtonBuilder,
} from "discord.js";
import { captchaTracker } from "./captcha-tracker.ts";

export type CaptchaType = "math" | "emoji" | "word";

export interface CaptchaChallenge {
	type: CaptchaType;
	question: string;
	correctAnswer: string;
	options: string[];
	embedTitle: string;
	embedDescription: string;
}

export interface CaptchaResult {
	success: boolean;
	responseTime: number;
	attemptedAnswer?: string;
	timedOut?: boolean;
}

// Emojis for emoji captcha
const CAPTCHA_EMOJIS = ["🎮", "🎯", "🎲", "🎪", "🎨", "🎭", "🎫", "🎸", "⚽", "🏀", "🎾", "🎳", "🥊", "🎱", "🎰"];

/**
 * Scramble a word for captcha
 */
function scramble(word: string): string {
	const letters = word.split("");
	// Ensure we actually scramble it (not the same as original)
	const scrambled = [...letters];
	let attempts = 0;

	do {
		for (let i = scrambled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[scrambled[i], scrambled[j]] = [scrambled[j], scrambled[i]] as [string, string];
		}
		attempts++;
	} while (scrambled.join("") === word && attempts < 10);

	return scrambled.join("");
}

// Words for scramble captcha - Czech themed
const CAPTCHA_WORDS = [
	{ correct: "PRACE", hint: "Co děláš každý den (5 písmen)" },
	{ correct: "DENNI", hint: "_____ dávka (5 písmen)" },
	{ correct: "MINCE", hint: "Měna v ekonomice (5 písmen)" },
	{ correct: "LEVEL", hint: "Tvoje úroveň (5 písmen)" },
	{ correct: "BODY", hint: "Co sbíráš za aktivitu (4 písmena)" },
	{ correct: "ODMENA", hint: "Co dostaneš za práci (6 písmen)" },
	{ correct: "SERIE", hint: "Počet dní v řadě (5 písmen)" },
	{ correct: "BOOST", hint: "Zvýšení odměn (5 písmen)" },
];

/**
 * Generate a random captcha challenge
 */
export function generateCaptcha(difficulty: "easy" | "medium" | "hard" = "easy"): CaptchaChallenge {
	const types: CaptchaType[] =
		difficulty === "easy" ? ["math"] : difficulty === "medium" ? ["math", "emoji"] : ["math", "emoji", "word"];
	const type = types[Math.floor(Math.random() * types.length)];

	switch (type) {
		case "math":
			return generateMathCaptcha(difficulty);
		case "emoji":
			return generateEmojiCaptcha();
		case "word":
			return generateWordCaptcha();
		default:
			return generateMathCaptcha(difficulty);
	}
}

/**
 * Generate a math-based captcha
 */
function generateMathCaptcha(difficulty: "easy" | "medium" | "hard"): CaptchaChallenge {
	let a: number;
	let b: number;
	let operator: string;
	let result: number;

	if (difficulty === "easy") {
		// Simple addition/subtraction with small numbers
		a = Math.floor(Math.random() * 10) + 1;
		b = Math.floor(Math.random() * 10) + 1;
		operator = Math.random() < 0.5 ? "+" : "-";
		// For subtraction, ensure a >= b to avoid negative results
		if (operator === "-" && a < b) {
			[a, b] = [b, a]; // Swap to ensure positive result
		}
		result = operator === "+" ? a + b : a - b;
	} else if (difficulty === "medium") {
		// Include multiplication, larger numbers
		a = Math.floor(Math.random() * 20) + 5;
		b = Math.floor(Math.random() * 15) + 1;
		const ops = ["+", "-", "×"];
		operator = ops[Math.floor(Math.random() * ops.length)] || "+";
		// For subtraction, ensure a >= b to avoid negative results
		if (operator === "-" && a < b) {
			[a, b] = [b, a]; // Swap to ensure positive result
		}
		result = operator === "+" ? a + b : operator === "-" ? a - b : a * b;
	} else {
		// Complex operations
		a = Math.floor(Math.random() * 50) + 10;
		b = Math.floor(Math.random() * 20) + 5;
		const ops = ["+", "-", "×"];
		operator = ops[Math.floor(Math.random() * ops.length)] || "+";
		// For subtraction, ensure a >= b to avoid negative results
		if (operator === "-" && a < b) {
			[a, b] = [b, a]; // Swap to ensure positive result
		}
		result = operator === "+" ? a + b : operator === "-" ? a - b : a * b;
	}

	// Generate wrong answers
	const options = [String(result)];
	let attempts = 0;
	const maxAttempts = 100;

	while (options.length < 4 && attempts < maxAttempts) {
		attempts++;
		// Generate offset between -5 and +5 (excluding 0)
		let offset = Math.floor(Math.random() * 10) - 5;
		if (offset === 0) offset = 1;

		const wrongAnswer = result + offset;
		// Ensure wrong answer is not negative and not already in options
		if (wrongAnswer >= 0 && !options.includes(String(wrongAnswer))) {
			options.push(String(wrongAnswer));
		}
	}

	// If we couldn't generate enough options, fill with simple increments
	while (options.length < 4) {
		const nextValue = result + options.length;
		if (!options.includes(String(nextValue))) {
			options.push(String(nextValue));
		} else {
			options.push(String(result + options.length + 10));
		}
	}

	// Shuffle options
	options.sort(() => Math.random() - 0.5);

	return {
		type: "math",
		question: `${a} ${operator} ${b} = ?`,
		correctAnswer: String(result),
		options,
		embedTitle: "🔐 Ověření - Matematika",
		embedDescription: "Vyřeš tento jednoduchý matematický příklad:",
	};
}

/**
 * Generate an emoji-based captcha
 */
function generateEmojiCaptcha(): CaptchaChallenge {
	const targetEmoji = CAPTCHA_EMOJIS[Math.floor(Math.random() * CAPTCHA_EMOJIS.length)];
	if (!targetEmoji) {
		return generateMathCaptcha("easy");
	}

	// Get 3 other random emojis for wrong answers
	const options = [targetEmoji];
	const availableEmojis = CAPTCHA_EMOJIS.filter((e) => e !== targetEmoji);

	for (let i = 0; i < 3; i++) {
		const randomIndex = Math.floor(Math.random() * availableEmojis.length);
		const emoji = availableEmojis[randomIndex];
		if (emoji) {
			options.push(emoji);
			availableEmojis.splice(randomIndex, 1);
		}
	}

	// Shuffle options
	options.sort(() => Math.random() - 0.5);

	return {
		type: "emoji",
		question: targetEmoji,
		correctAnswer: targetEmoji,
		options,
		embedTitle: "🔐 Ověření - Emoji",
		embedDescription: `Klikni na tlačítko s tímto emoji: ${targetEmoji}`,
	};
}

/**
 * Generate a word scramble captcha
 */
function generateWordCaptcha(): CaptchaChallenge {
	const wordIndex = Math.floor(Math.random() * CAPTCHA_WORDS.length);
	const word = CAPTCHA_WORDS[wordIndex];
	if (!word) {
		return generateMathCaptcha("easy");
	}

	// Re-scramble the word for this specific captcha (so it's different each time)
	const freshScrambled = scramble(word.correct);

	// Generate wrong answers - variations of the correct word
	const options = [word.correct.toUpperCase()];

	// Create plausible wrong answers by swapping letters
	const wrongAnswers = [
		// Swap first two letters
		word.correct.length > 1
			? (word.correct[1] ?? "") + (word.correct[0] ?? "") + word.correct.slice(2)
			: word.correct + "A",
		// Swap last two letters
		word.correct.length > 1
			? word.correct.slice(0, -2) + word.correct.slice(-1) + word.correct.slice(-2, -1)
			: word.correct + "B",
		// Remove middle letter and add at end
		word.correct.length > 2
			? word.correct[0] + word.correct.slice(2) + word.correct[Math.floor(word.correct.length / 2)]
			: word.correct + "C",
	];

	for (const wrong of wrongAnswers) {
		if (wrong.toUpperCase() !== word.correct.toUpperCase() && options.length < 4) {
			options.push(wrong.toUpperCase());
		}
	}

	// If we still need more options, generate random similar-length words
	while (options.length < 4) {
		const randomLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
		let fakeWord = "";
		for (let i = 0; i < word.correct.length; i++) {
			fakeWord += randomLetters[Math.floor(Math.random() * randomLetters.length)];
		}
		if (!options.includes(fakeWord) && fakeWord !== word.correct) {
			options.push(fakeWord);
		}
	}

	// Shuffle options
	options.sort(() => Math.random() - 0.5);

	return {
		type: "word",
		question: freshScrambled,
		correctAnswer: word.correct.toUpperCase(),
		options,
		embedTitle: "🔐 Ověření - Slova",
		embedDescription: `Přeházená písmena: **${freshScrambled}**\nNápověda: ${word.hint}`,
	};
}

/**
 * Present a captcha challenge to the user and wait for response
 */
export async function presentCaptcha(
	interaction: ChatInputCommandInteraction,
	challenge: CaptchaChallenge,
	timeoutMs = 30000,
): Promise<CaptchaResult> {
	const startTime = Date.now();

	// Create embed with user identification
	const embed = new EmbedBuilder()
		.setColor(0xffcc00)
		.setTitle(challenge.embedTitle)
		.setDescription(`<@${interaction.user.id}> - ${challenge.embedDescription}`)
		.setFooter({ text: `Máš ${timeoutMs / 1000} sekund na odpověď` });

	if (challenge.type === "math") {
		embed.addFields({ name: "Příklad", value: `**${challenge.question}**`, inline: false });
	}

	// Create buttons
	const row = new ActionRowBuilder();
	for (let i = 0; i < challenge.options.length; i++) {
		const label = challenge.options[i];
		if (!label) continue;

		row.addComponents(new SecondaryButtonBuilder().setCustomId(`captcha_${i}`).setLabel(label));
	}

	// Send captcha
	await interaction.editReply({
		embeds: [embed],
		components: [row],
	});

	try {
		// Wait for button interaction
		const buttonInteraction = await interaction.channel?.awaitMessageComponent({
			componentType: ComponentType.Button,
			time: timeoutMs,
			filter: (i) => {
				// If it's not the right user, send ephemeral message
				if (i.user.id !== interaction.user.id && i.customId.startsWith("captcha_")) {
					i.reply({
						content: `❌ Hej <@${i.user.id}>, toto ověření není pro tebe! Je určeno pro ${interaction.user.username}.`,
						flags: MessageFlags.Ephemeral,
					}).catch(() => {});
					return false;
				}
				return i.user.id === interaction.user.id && i.customId.startsWith("captcha_");
			},
		});

		if (!buttonInteraction) {
			return {
				success: false,
				responseTime: Date.now() - startTime,
				timedOut: true,
			};
		}

		// Get the selected answer
		const selectedIndex = Number.parseInt(buttonInteraction.customId.split("_")[1] || "0", 10);
		const selectedAnswer = challenge.options[selectedIndex] || "";
		const isCorrect = selectedAnswer === challenge.correctAnswer;

		// Update the message to show result
		const resultEmbed = new EmbedBuilder()
			.setColor(isCorrect ? 0x00ff00 : 0xff0000)
			.setTitle(isCorrect ? "✅ Správně!" : "❌ Špatně")
			.setDescription(
				isCorrect
					? `<@${interaction.user.id}> - Ověření bylo úspěšné.`
					: `<@${interaction.user.id}> - Nesprávná odpověď. Správná odpověď byla: **${challenge.correctAnswer}**`,
			);

		await buttonInteraction.update({
			embeds: [resultEmbed],
			components: [],
		});

		return {
			success: isCorrect,
			responseTime: Date.now() - startTime,
			attemptedAnswer: selectedAnswer,
			timedOut: false,
		};
	} catch (error) {
		// Timeout
		const timeoutEmbed = new EmbedBuilder()
			.setColor(0xff0000)
			.setTitle("⏰ Čas vypršel")
			.setDescription(`<@${interaction.user.id}> - Nestihl jsi odpovědět včas. Zkus to znovu později.`);

		await interaction.editReply({
			embeds: [timeoutEmbed],
			components: [],
		});

		return {
			success: false,
			responseTime: Date.now() - startTime,
			timedOut: true,
		};
	}
}

/**
 * Result from captcha check including the trigger reason
 */
export interface CaptchaCheckResult {
	showCaptcha: boolean;
	triggerReason?: string;
}

/**
 * Determine if a user should be shown a captcha based on their history
 * Returns both the decision and the reason for showing captcha
 */
export function shouldShowCaptcha(claimCount: number, suspiciousScore: number, discordUserId?: string): CaptchaCheckResult {
	// Check if user has recent captcha failure (in-memory)
	if (discordUserId && captchaTracker.hasRecentFailure(discordUserId)) {
		return { showCaptcha: true, triggerReason: "recent_failure" };
	}

	// Always show for suspicious users
	if (suspiciousScore > 50) {
		return { showCaptcha: true, triggerReason: `suspicious_score_${suspiciousScore}` };
	}

	// For periodic checks, use a fixed interval based on first random call
	// When Math.random() returns 0, interval will be 3
	const randomValue = Math.random();
	const interval = 3 + Math.floor(randomValue * 3);

	// Show every 3-5 claims for normal users
	if (claimCount > 0 && claimCount % interval === 0) {
		return { showCaptcha: true, triggerReason: `periodic_check_interval_${interval}` };
	}

	// 20% random chance (use the same random value for consistency in tests)
	if (randomValue < 0.2) {
		return { showCaptcha: true, triggerReason: "random_check" };
	}

	return { showCaptcha: false };
}

/**
 * Get difficulty based on user's suspicious score
 */
export function getCaptchaDifficulty(suspiciousScore: number): "easy" | "medium" | "hard" {
	if (suspiciousScore < 30) return "easy";
	if (suspiciousScore < 70) return "medium";
	return "hard";
}

/**
 * Check if response time is suspicious (too fast to be human)
 */
export function isSuspiciousResponseTime(responseTimeMs: number, captchaType: CaptchaType): boolean {
	// Minimum reasonable human response times
	const minTimes = {
		math: 2000, // At least 2 seconds to read and calculate
		emoji: 1000, // At least 1 second to identify and click
		word: 3000, // At least 3 seconds to unscramble
	};

	return responseTimeMs < minTimes[captchaType];
}
