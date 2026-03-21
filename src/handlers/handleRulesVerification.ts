/**
 * Rules Verification Handler
 *
 * This module manages the two-tier verification system:
 * - Full verification through quiz (VERIFIED role)
 * - Partial verification through simple acceptance (PARTIALLY_VERIFIED role)
 *
 * Features:
 * - Quiz-based full verification with questions from rules
 * - Quick partial verification for voice room access
 * - Session management and cooldowns for failed attempts
 * - Upgrade path from partial to full verification
 * - Multi-guild support with isolated tracking
 * - Persistence across bot restarts
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type ButtonInteraction,
	type Client,
	Events,
	type GuildMember,
	type Interaction,
	MessageFlags,
	type ModalSubmitInteraction,
	SeparatorSpacingSize,
	type StringSelectMenuInteraction,
} from "discord.js";
import {
	ActionRowBuilder,
	ContainerBuilder,
	EmbedBuilder,
	PrimaryButtonBuilder,
	SeparatorBuilder,
	StringSelectMenuBuilder,
} from "@discordjs/builders";
import { channelLink } from "@discordjs/formatters";
import {
	getMixedRandomQuestions,
	isCorrectAnswer,
	isNonNumericQuestion,
	isNumericQuestion,
	type MixedQuizConfig,
	type QuizQuestion,
	ruleQuestions,
} from "../data/rulesData.js";
import { ChannelManager, RoleManager } from "../util";
import { createLogger } from "../util/logger.ts";

const log = createLogger("RulesVerification");

/**
 * Configuration for rules verification feature
 */
const config = {
	/** Quiz settings */
	quiz: {
		/** Number of numeric (rule number) questions */
		numericQuestions: 3,
		/** Number of non-numeric (no rule exists) questions */
		nonNumericQuestions: 2,
		/** Minimum correct answers to pass (80% = 4 out of 5) */
		passingScore: 4,
		/** Maximum failed attempts before cooldown */
		maxFailedAttempts: 3,
		/** Cooldown duration in milliseconds (5 minutes) */
		cooldownDuration: 5 * 60 * 1000,
		/** Session timeout in milliseconds (1 hour) */
		sessionTimeout: 60 * 60 * 1000,
	},

	/** Persistence settings */
	persistence: {
		/** Path to file for verification data */
		filePath: join(__dirname, "../../rules_verification.json"),
	},
} as const;

/**
 * Active quiz sessions
 * Structure: userId -> QuizSession
 */
const activeSessions = new Map<string, QuizSession>();

/**
 * Failed attempt tracking
 * Structure: userId -> FailedAttemptData
 */
const failedAttempts = new Map<string, FailedAttemptData>();

/**
 * Generate answer options for quiz select menu
 */
function generateAnswerOptions(question: QuizQuestion): Array<{ label: string; value: string }> {
	const options = [];

	if (isNumericQuestion(question)) {
		// Add correct answer
		options.push({
			label: `Pravidlo ${question.ruleNumber}`,
			value: question.ruleNumber,
		});

		// Get wrong answers from different rule numbers
		const wrongOptions = ruleQuestions
			.filter((q) => q.ruleNumber !== question.ruleNumber)
			.sort(() => Math.random() - 0.5)
			.slice(0, 4); // Reduced to 4 to make room for "žádné"

		wrongOptions.forEach((q) => {
			options.push({
				label: `Pravidlo ${q.ruleNumber}`,
				value: q.ruleNumber,
			});
		});

		// Always add "žádné" option to prevent pattern recognition
		options.push({
			label: "Žádné pravidlo",
			value: "Žádné pravidlo",
		});
	} else if (isNonNumericQuestion(question)) {
		// Add correct answer
		options.push({
			label: question.correctAnswer,
			value: question.correctAnswer,
		});

		// Add wrong answers (these already include rule numbers)
		question.wrongAnswers.forEach((wrongAnswer) => {
			options.push({
				label: wrongAnswer,
				value: wrongAnswer,
			});
		});
	}

	// Shuffle all options
	return options.sort(() => Math.random() - 0.5);
}

/**
 * Create question display container (DRY helper)
 */
function createQuestionDisplay(
	questionNumber: number,
	totalQuestions: number,
	question: QuizQuestion,
	previousResult?: { isCorrect: boolean; correctAnswer?: string },
	stats?: { correct: number; answered: number },
): ContainerBuilder {
	let headerText = `# 📝 Kvíz pravidel - Otázka ${questionNumber}/${totalQuestions}\n\n`;

	if (previousResult) {
		if (previousResult.isCorrect) {
			headerText += `✅ Předchozí odpověď byla **správná**!\n\n`;
		} else if (previousResult.correctAnswer) {
			headerText += `❌ Předchozí odpověď byla **špatná**. Správně: ${previousResult.correctAnswer}\n\n`;
		}
	}

	headerText += `**${question.question}**\n\n`;

	if (stats) {
		headerText += `📊 Průběh: ${stats.correct}/${stats.answered} správně | Zbývá: ${totalQuestions - stats.answered}`;
	} else {
		headerText += `📊 Průběh: 0/${totalQuestions} zodpovězeno`;
	}

	return new ContainerBuilder()
		.setAccentColor(previousResult?.isCorrect ? 0x00ff00 : previousResult ? 0xff0000 : 0x5865f2)
		.addTextDisplayComponents((display) => display.setContent(headerText));
}

/**
 * Initialize the rules verification system
 * Sets up event listeners and loads existing data
 *
 * @param client - Discord client instance
 */
export const handleRulesVerification = async (client: Client<true>) => {
	await loadVerificationData();

	// Register event listeners
	client.on(Events.InteractionCreate, handleInteractionCreate);

	// Clean up old sessions periodically
	setInterval(cleanupSessions, 30 * 60 * 1000); // Every 30 minutes

	log("info", "Rules verification system initialized");
};

async function handleInteractionCreate(interaction: Interaction) {
	// Sometimes the interaction is null/undefined, catch it here
	if (interaction == null) return;

	if (interaction.isButton()) {
		await handleButtonInteraction(interaction);
	} else if (interaction.isModalSubmit()) {
		await handleModalSubmit(interaction);
	} else if (interaction.isStringSelectMenu()) {
		await handleSelectMenuInteraction(interaction);
	}
}

/**
 * Handle button interactions for verification
 */
async function handleButtonInteraction(interaction: ButtonInteraction) {
	// Full quiz verification
	if (interaction.customId === "start_full_quiz") {
		await handleStartFullQuiz(interaction);
	}
	// Partial verification
	else if (interaction.customId === "accept_partial_rules") {
		await handlePartialVerification(interaction);
	}
	// Retry quiz after failure
	else if (interaction.customId === "retry_quiz") {
		await handleStartFullQuiz(interaction);
	}
	// Upgrade from partial to full
	else if (interaction.customId === "upgrade_verification") {
		await handleStartFullQuiz(interaction);
	}
}

/**
 * Handle select menu interactions for quiz answers
 */
async function handleSelectMenuInteraction(interaction: StringSelectMenuInteraction) {
	if (interaction.customId.startsWith("quiz_select_")) {
		await handleQuizSelectAnswer(interaction);
	}
}

/**
 * Handle quiz answer selection from select menu
 */
async function handleQuizSelectAnswer(interaction: StringSelectMenuInteraction) {
	try {
		// Parse custom ID: quiz_select_userId_questionIndex
		const parts = interaction.customId.split("_");
		const userId = parts[2];
		const questionIndex = Number.parseInt(parts[3] || "0", 10);

		const session = activeSessions.get(userId || "");

		if (!session) {
			await interaction.reply({
				content: "❌ Kvíz vypršel. Klikni na tlačítko znovu pro nový kvíz.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Check session timeout
		if (Date.now() - session.startedAt > config.quiz.sessionTimeout) {
			activeSessions.delete(userId || "");
			await interaction.reply({
				content: "❌ Kvíz vypršel. Klikni na tlačítko znovu pro nový kvíz.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const selectedAnswer = interaction.values[0] || "";
		const currentQuestion = session.questions[questionIndex];

		if (!currentQuestion || questionIndex !== session.currentQuestionIndex) {
			await interaction.reply({
				content: "❌ Nastala chyba s otázkou. Zkus to prosím znovu.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const isCorrect = isCorrectAnswer(currentQuestion, selectedAnswer);

		// Store the answer
		session.answers.push({
			question: currentQuestion,
			userAnswer: selectedAnswer,
			isCorrect,
		});

		// Check if there are more questions
		if (session.currentQuestionIndex < session.questions.length - 1) {
			// Move to next question
			session.currentQuestionIndex++;
			const nextQuestion = session.questions[session.currentQuestionIndex];

			if (!nextQuestion) {
				await interaction.reply({
					content: "❌ Nastala chyba při načítání další otázky.",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			// Create next question display using DRY helper
			const correctCount = session.answers.filter((a) => a.isCorrect).length;
			const answeredCount = session.answers.length;

			const correctAnswerText = isNumericQuestion(currentQuestion)
				? currentQuestion.ruleNumber
				: isNonNumericQuestion(currentQuestion)
					? currentQuestion.correctAnswer
					: "";

			const questionContainer = createQuestionDisplay(
				session.currentQuestionIndex + 1,
				session.questions.length,
				nextQuestion,
				{ isCorrect, correctAnswer: correctAnswerText },
				{ correct: correctCount, answered: answeredCount },
			);

			// Create select menu for next question
			const selectMenu = new StringSelectMenuBuilder()
				.setCustomId(`quiz_select_${userId}_${session.currentQuestionIndex}`)
				.setPlaceholder(isNumericQuestion(nextQuestion) ? "Vyber správné číslo pravidla" : "Vyber správnou odpověď")
				.addOptions(generateAnswerOptions(nextQuestion));

			const actionRow = new ActionRowBuilder().addComponents(selectMenu);

			// Update the message with next question
			await interaction.update({
				components: [questionContainer, actionRow],
				flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
			});
		} else {
			// Quiz completed - evaluate results
			await handleQuizCompletion(interaction, session);
		}
	} catch (error) {
		log("error", "Failed to handle quiz answer:", error);
		await interaction.reply({
			content: "❌ Nastala chyba při zpracování odpovědi. Zkus to prosím znovu.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Handle modal submissions for quiz answers
 */
async function handleModalSubmit(_interaction: ModalSubmitInteraction) {
	// Modal handling removed - using select menus instead
}

/**
 * Start the full quiz verification process
 */
async function handleStartFullQuiz(interaction: ButtonInteraction) {
	try {
		if (!interaction.guild) {
			await interaction.reply({
				content: "❌ Tento příkaz lze použít pouze na serveru.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const member = interaction.member as GuildMember;
		if (!member) {
			await interaction.reply({
				content: "❌ Nepodařilo se načíst informace o uživateli.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Check if user is already fully verified
		if (process.env.NODE_ENV !== "development") {
			if (await RoleManager.hasRole(member, "VERIFIED")) {
				await interaction.reply({
					content: "✅ Již jsi plně verifikován!",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		}

		// Check for cooldown
		const failedData = failedAttempts.get(interaction.user.id);
		if (failedData && failedData.attempts >= config.quiz.maxFailedAttempts) {
			const cooldownEnd = failedData.lastAttempt + config.quiz.cooldownDuration;
			if (Date.now() < cooldownEnd) {
				const remainingMinutes = Math.ceil((cooldownEnd - Date.now()) / 60000);
				await interaction.reply({
					content: `⏳ Překročil jsi maximální počet pokusů. Zkus to znovu za ${remainingMinutes} minut.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
			// Reset attempts after cooldown
			failedAttempts.delete(interaction.user.id);
		}

		// Create quiz session with mixed questions
		const totalQuestions = config.quiz.numericQuestions + config.quiz.nonNumericQuestions;
		const quizConfig: MixedQuizConfig = {
			totalQuestions,
			numericQuestions: config.quiz.numericQuestions,
			nonNumericQuestions: config.quiz.nonNumericQuestions,
		};

		const questions = getMixedRandomQuestions(quizConfig);
		activeSessions.set(interaction.user.id, {
			userId: interaction.user.id,
			guildId: interaction.guild.id,
			questions,
			currentQuestionIndex: 0,
			answers: [],
			startedAt: Date.now(),
		});

		// Get first question
		const firstQuestion = questions[0];
		if (!firstQuestion) {
			await interaction.reply({
				content: "❌ Nepodařilo se načíst otázky. Zkus to prosím znovu.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Create Components V2 question display using DRY helper
		const questionContainer = createQuestionDisplay(1, totalQuestions, firstQuestion);

		// Create select menu with answer options
		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId(`quiz_select_${interaction.user.id}_0`)
			.setPlaceholder(isNumericQuestion(firstQuestion) ? "Vyber správné číslo pravidla" : "Vyber správnou odpověď")
			.addOptions(generateAnswerOptions(firstQuestion));

		const actionRow = new ActionRowBuilder().addComponents(selectMenu);

		// Send the question
		await interaction.reply({
			components: [questionContainer, actionRow],
			flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
		});

		log("info", `Quiz started for user ${interaction.user.tag} with ${questions.length} questions`);
	} catch (error) {
		log("error", "Failed to start quiz:", error);
		await interaction.reply({
			content: "❌ Nastala chyba při spuštění kvízu. Zkus to prosím znovu.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Handle partial verification (quick access)
 */
async function handlePartialVerification(interaction: ButtonInteraction) {
	try {
		if (!interaction.guild) {
			await interaction.reply({
				content: "❌ Tento příkaz lze použít pouze na serveru.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const member = interaction.member as GuildMember;
		if (!member) {
			await interaction.reply({
				content: "❌ Nepodařilo se načíst informace o uživateli.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Check if user already has any
		if (process.env.NODE_ENV !== "development") {
			if (await RoleManager.hasRole(member, "VERIFIED")) {
				await interaction.reply({
					content: "✅ Již jsi plně verifikován!",
					flags: MessageFlags.Ephemeral,
				});
				return;
			}
		}

		if (await RoleManager.hasRole(member, "PARTIALLY_VERIFIED")) {
			// Offer upgrade option
			const upgradeEmbed = new EmbedBuilder()
				.setColor(0xffa500)
				.setTitle("🔄 Již máš částečný přístup")
				.setDescription("Máš částečně ověřený přístup k hlasovým místnostem 2xx. Chceš získat plný přístup?")
				.addFields(
					{ name: "Současný přístup", value: "✅ Hlasové místnosti 2xx" },
					{
						name: "Plný přístup zahrnuje",
						value: "✅ Všechny textové kanály\n✅ Všechny hlasové kanály\n✅ Kompletní funkce serveru",
					},
				);

			const upgradeButton = new PrimaryButtonBuilder()
				.setCustomId("upgrade_verification")
				.setLabel("Získat plný přístup")
				.setEmoji({ name: "📈" });

			const row = new ActionRowBuilder().addComponents(upgradeButton);

			await interaction.reply({
				embeds: [upgradeEmbed],
				components: [row.toJSON()],
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		// Grant partial verification
		const success = await RoleManager.addRole(member, "PARTIALLY_VERIFIED");

		if (success) {
			const successEmbed = new EmbedBuilder()
				.setColor(0x00ff00)
				.setTitle("✅ Částečný přístup udělen!")
				.setDescription("Souhlasil jsi s pravidly a získal jsi částečný přístup k serveru.")
				.addFields(
					{ name: "Tvůj přístup", value: "✅ Hlasové místnosti 2xx" },
					{ name: "Pro plný přístup", value: "Můžeš kdykoli dokončit kvíz kliknutím na tlačítko 'Plný kvíz'" },
				)
				.setTimestamp();

			await interaction.reply({
				embeds: [successEmbed],
				flags: MessageFlags.Ephemeral,
			});

			// Save verification state
			await saveVerificationData();
			log("info", `Partial verification granted to user ${interaction.user.tag}`);

			// Try to send welcome DM
			try {
				const dmEmbed = new EmbedBuilder()
					.setColor(0x00ff00)
					.setTitle("Vítej na serveru!")
					.setDescription(
						"Získal jsi částečný přístup k serveru. Máš přístup k hlasovým místnostem 2xx. Pro plný přístup můžeš kdykoli dokončit kvíz.",
					)
					.setTimestamp();

				await interaction.user.send({ embeds: [dmEmbed] });
			} catch {
				// User has DMs disabled
			}
		} else {
			await interaction.reply({
				content: "❌ Nepodařilo se přidat roli. Kontaktuj prosím administrátora.",
				flags: MessageFlags.Ephemeral,
			});
		}
	} catch (error) {
		log("error", "Failed to grant partial verification:", error);
		await interaction.reply({
			content: "❌ Nastala chyba při udělování přístupu. Zkus to prosím znovu.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Handle quiz completion and grant/deny verification
 */
async function handleQuizCompletion(interaction: StringSelectMenuInteraction, session: QuizSession) {
	try {
		const correctAnswers = session.answers.filter((a) => a.isCorrect).length;
		const totalQuestions = session.questions.length;
		const passed = correctAnswers >= config.quiz.passingScore;

		if (!interaction.guild) {
			await interaction.reply({
				content: "❌ Tento příkaz lze použít pouze na serveru.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const member = interaction.member as GuildMember;
		if (!member) {
			await interaction.reply({
				content: "❌ Nepodařilo se načíst informace o uživateli.",
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (passed) {
			// Passed the quiz - grant full verification

			// Remove partial verification if present
			if (await RoleManager.hasRole(member, "PARTIALLY_VERIFIED")) {
				await RoleManager.removeRole(member, "PARTIALLY_VERIFIED");
			}

			// Add full verification
			const success = await RoleManager.addRole(member, "VERIFIED");

			if (success) {
				// Clear session and failed attempts
				activeSessions.delete(session.userId);
				failedAttempts.delete(session.userId);

				// Create success Components V2 display
				const resultDetails = session.answers
					.map((a, i) => {
						const q = a.question;
						const correctAnswer = isNumericQuestion(q)
							? `Pravidlo ${q.ruleNumber}`
							: isNonNumericQuestion(q)
								? q.correctAnswer
								: "N/A";
						return `${i + 1}. ${a.isCorrect ? "✅" : "❌"} Správně: ${correctAnswer} | Tvoje: ${a.userAnswer}`;
					})
					.join("\n");

				const successContainer = new ContainerBuilder()
					.setAccentColor(0x00ff00)
					.addTextDisplayComponents((display) =>
						display.setContent(
							`# 🎉 Kvíz dokončen - ÚSPĚCH!\n\n` +
								`Gratulujeme! Úspěšně jsi prošel kvízem a byl jsi plně verifikován.\n\n` +
								`## 📊 Výsledky\n` +
								`• **Správných odpovědí:** ${correctAnswers}/${totalQuestions}\n` +
								`• **Úspěšnost:** ${Math.round((correctAnswers / totalQuestions) * 100)}%\n` +
								`• **Status:** ✅ Plný přístup udělen\n\n` +
								`## 📝 Podrobnosti\n` +
								`${resultDetails}`,
						),
					);

				await interaction.update({
					components: [successContainer],
					flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
				});

				await saveVerificationData();
				log(
					"info",
					`Full verification granted to user ${interaction.user.tag} (${correctAnswers}/${totalQuestions} correct)`,
				);

				// Send welcome DM
				try {
					const dmEmbed = new EmbedBuilder()
						.setColor(0x00ff00)
						.setTitle("Vítej na serveru!")
						.setDescription(
							`Byl jsi úspěšně plně verifikován s výsledkem ${correctAnswers}/${totalQuestions}. Doufáme, že jsi pravidla četl a budeš je dodržovat. Řídíme se pravidlem tří varování.`,
						)
						.setTimestamp();

					await interaction.user.send({ embeds: [dmEmbed] });
				} catch {
					// User has DMs disabled
				}
			} else {
				await interaction.reply({
					content: "❌ Nepodařilo se přidat roli. Kontaktuj prosím administrátora.",
					flags: MessageFlags.Ephemeral,
				});
			}
		} else {
			// Failed the quiz
			const attempts = failedAttempts.get(session.userId) || { attempts: 0, lastAttempt: 0 };
			attempts.attempts++;
			attempts.lastAttempt = Date.now();
			failedAttempts.set(session.userId, attempts);

			const remainingAttempts = config.quiz.maxFailedAttempts - attempts.attempts;

			// Create failure Components V2 display
			const resultDetails = session.answers
				.map((a, i) => {
					const q = a.question;
					const correctAnswer = isNumericQuestion(q)
						? `Pravidlo ${q.ruleNumber}`
						: isNonNumericQuestion(q)
							? q.correctAnswer
							: "N/A";
					return `${i + 1}. ${a.isCorrect ? "✅" : "❌"} Správně: ${correctAnswer} | Tvoje: ${a.userAnswer}`;
				})
				.join("\n");

			const failContainer = new ContainerBuilder()
				.setAccentColor(0xff0000)
				.addTextDisplayComponents((display) =>
					display.setContent(
						`# ❌ Kvíz dokončen - NEÚSPĚCH\n\n` +
							(remainingAttempts > 0
								? `Bohužel jsi nezískal dostatečný počet bodů. Potřebuješ alespoň ${config.quiz.passingScore} správných odpovědí.\n\n**Zbývající pokusy: ${remainingAttempts}**`
								: `Bohužel jsi nezískal dostatečný počet bodů a vyčerpal jsi všechny pokusy. Zkus to znovu za 5 minut.`) +
							`\n\n## 📊 Výsledky\n` +
							`• **Správných odpovědí:** ${correctAnswers}/${totalQuestions}\n` +
							`• **Úspěšnost:** ${Math.round((correctAnswers / totalQuestions) * 100)}%\n` +
							`• **Status:** ❌ Nedostatečné\n` +
							`• **Potřeba ke splnění:** ${config.quiz.passingScore}/${totalQuestions} (${Math.round((config.quiz.passingScore / totalQuestions) * 100)}%)\n\n` +
							`## 📝 Podrobnosti\n` +
							`${resultDetails}`,
					),
				);

			if (remainingAttempts > 0) {
				const retryButton = new PrimaryButtonBuilder()
					.setCustomId("retry_quiz")
					.setLabel("Zkusit znovu")
					.setEmoji({ name: "🔄" });

				const row = new ActionRowBuilder().addComponents(retryButton);

				await interaction.update({
					components: [failContainer, row],
					flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
				});
			} else {
				// Get quiz problem channel
				const problemChannel = ChannelManager.getTextChannel(interaction.guild, "QUIZ_PROBLEM");
				const problemChannelMention = problemChannel ? channelLink(problemChannel.id) : "kanál podpory";

				const helpContainer = new ContainerBuilder()
					.setAccentColor(0xffa500)
					.addTextDisplayComponents((display) =>
						display.setContent(
							`### 💡 Potřebuješ pomoc?\n` +
								`Pokud máš problémy s kvízem, můžeš požádat o pomoc v ${problemChannelMention}.`,
						),
					);

				await interaction.update({
					components: [failContainer, new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small), helpContainer],
					flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
				});
			}

			// Clear session
			activeSessions.delete(session.userId);
			log(
				"info",
				`Quiz failed for user ${interaction.user.tag} (${correctAnswers}/${totalQuestions} correct), attempts: ${attempts.attempts}`,
			);
		}
	} catch (error) {
		log("error", "Failed to handle quiz completion:", error);
		await interaction.reply({
			content: "❌ Nastala chyba při vyhodnocení kvízu. Kontaktuj prosím administrátora.",
			flags: MessageFlags.Ephemeral,
		});
	}
}

/**
 * Clean up old sessions
 */
function cleanupSessions() {
	const now = Date.now();
	let cleaned = 0;

	for (const [userId, session] of activeSessions) {
		if (now - session.startedAt > config.quiz.sessionTimeout) {
			activeSessions.delete(userId || "");
			cleaned++;
		}
	}

	if (cleaned > 0) {
		log("info", `Cleaned up ${cleaned} expired sessions`);
	}
}

/**
 * Load verification data from persistence
 */
async function loadVerificationData() {
	try {
		const data = await readFile(config.persistence.filePath, "utf-8");
		const savedData = JSON.parse(data) as SavedVerificationData;

		// Restore failed attempts
		for (const [userId, attemptData] of Object.entries(savedData.failedAttempts || {})) {
			failedAttempts.set(userId, attemptData);
		}

		log("info", "Loaded verification data from persistence");
	} catch {
		// File doesn't exist or is invalid, start fresh
		log("info", "No existing verification data found, starting fresh");
	}
}

/**
 * Save verification data to persistence
 */
async function saveVerificationData() {
	try {
		const data: SavedVerificationData = {
			failedAttempts: Object.fromEntries(failedAttempts),
			savedAt: new Date().toISOString(),
		};

		await writeFile(config.persistence.filePath, JSON.stringify(data, null, 2));
	} catch (error) {
		log("error", "Failed to save verification data:", error);
	}
}

/**
 * Quiz session data
 */
interface QuizSession {
	userId: string;
	guildId: string;
	questions: QuizQuestion[];
	currentQuestionIndex: number;
	answers: Array<{
		question: QuizQuestion;
		userAnswer: string;
		isCorrect: boolean;
	}>;
	startedAt: number;
}

/**
 * Failed attempt tracking data
 */
interface FailedAttemptData {
	attempts: number;
	lastAttempt: number;
}

/**
 * Saved verification data structure
 */
interface SavedVerificationData {
	failedAttempts: Record<string, FailedAttemptData>;
	savedAt: string;
}
