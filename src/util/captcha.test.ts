import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import type {
	ButtonInteraction,
	ChatInputCommandInteraction,
	InteractionCollector,
	Message,
	TextBasedChannel,
} from "discord.js";
import {
	type CaptchaChallenge,
	type CaptchaResult,
	generateCaptcha,
	getCaptchaDifficulty,
	isSuspiciousResponseTime,
	presentCaptcha,
	shouldShowCaptcha,
} from "./captcha.ts";

describe("Captcha Generation", () => {
	describe("generateCaptcha", () => {
		describe("Math Captcha", () => {
			it("should generate easy math problems with correct operators", () => {
				// Test multiple generations to ensure consistency
				for (let i = 0; i < 10; i++) {
					const captcha = generateCaptcha("easy");

					if (captcha.type === "math") {
						// Parse the question
						const match = captcha.question.match(/(\d+)\s*([+\-×])\s*(\d+)/);
						expect(match).toBeTruthy();

						if (match) {
							const [, a, operator, b] = match;
							const numA = parseInt(a as string);
							const numB = parseInt(b as string);

							// Easy mode should have numbers 1-10
							expect(numA).toBeGreaterThanOrEqual(1);
							expect(numA).toBeLessThanOrEqual(10);
							expect(numB).toBeGreaterThanOrEqual(1);
							expect(numB).toBeLessThanOrEqual(10);

							// Easy mode should only have + or -
							expect(["+", "-"]).toContain(operator as string);

							// Verify correct answer
							let expectedAnswer: number;
							if (operator === "+") {
								expectedAnswer = numA + numB;
							} else {
								expectedAnswer = numA - numB;
							}
							expect(captcha.correctAnswer).toBe(String(expectedAnswer));
						}
					}
				}
			});

			it("should generate medium math problems with multiplication", () => {
				for (let i = 0; i < 10; i++) {
					const captcha = generateCaptcha("medium");

					if (captcha.type === "math") {
						const match = captcha.question.match(/(\d+)\s*([+\-×])\s*(\d+)/);
						expect(match).toBeTruthy();

						if (match) {
							const [, a, , b] = match;
							const numA = parseInt(a as string);
							const numB = parseInt(b as string);

							// Medium mode should have larger numbers
							expect(numA).toBeGreaterThanOrEqual(5);
							expect(numA).toBeLessThanOrEqual(35);
							expect(numB).toBeGreaterThanOrEqual(1);
							expect(numB).toBeLessThanOrEqual(15);
						}
					}
				}
			});

			it("should generate exactly 4 unique options", () => {
				const captcha = generateCaptcha("easy");

				// Should have exactly 4 options
				expect(captcha.options).toHaveLength(4);

				// All options should be unique
				const uniqueOptions = new Set(captcha.options);
				expect(uniqueOptions.size).toBe(4);

				// Correct answer should be in options
				expect(captcha.options).toContain(captcha.correctAnswer);
			});

			it("should generate reasonable wrong answers", () => {
				const captcha = generateCaptcha("easy");

				if (captcha.type === "math") {
					const correctNum = parseInt(captcha.correctAnswer);

					for (const option of captcha.options) {
						const optionNum = parseInt(option);
						// Wrong answers should be within reasonable range
						expect(Math.abs(optionNum - correctNum)).toBeLessThanOrEqual(10);
						// No negative numbers in options
						expect(optionNum).toBeGreaterThanOrEqual(0);
					}
				}
			});
		});

		describe("Emoji Captcha", () => {
			it("should generate emoji captcha with 4 unique options", () => {
				// Generate multiple to ensure we sometimes get emoji type
				let emojiCaptcha: CaptchaChallenge | null = null;
				for (let i = 0; i < 20; i++) {
					const captcha = generateCaptcha("medium");
					if (captcha.type === "emoji") {
						emojiCaptcha = captcha;
						break;
					}
				}

				// Skip if we didn't get an emoji captcha (randomness)
				if (emojiCaptcha) {
					expect(emojiCaptcha.options).toHaveLength(4);
					expect(new Set(emojiCaptcha.options).size).toBe(4);
					expect(emojiCaptcha.options).toContain(emojiCaptcha.correctAnswer);
					expect(emojiCaptcha.question).toBe(emojiCaptcha.correctAnswer);
				}
			});
		});

		describe("Word Captcha", () => {
			it("should generate word scramble with correct answer in options", () => {
				// Generate multiple to ensure we sometimes get word type
				let wordCaptcha: CaptchaChallenge | null = null;
				for (let i = 0; i < 30; i++) {
					const captcha = generateCaptcha("hard");
					if (captcha.type === "word") {
						wordCaptcha = captcha;
						break;
					}
				}

				if (wordCaptcha) {
					expect(wordCaptcha.options).toHaveLength(4);
					expect(wordCaptcha.options).toContain(wordCaptcha.correctAnswer);
					// Check that scrambled word is provided
					expect(wordCaptcha.question).toBeTruthy();
					expect(wordCaptcha.embedDescription).toContain(wordCaptcha.question);
				}
			});
		});
	});

	describe("shouldShowCaptcha", () => {
		it("should always show captcha for suspicious users", () => {
			// Suspicious score > 50 should always trigger captcha
			expect(shouldShowCaptcha(1, 60).showCaptcha).toBe(true);
			expect(shouldShowCaptcha(100, 80).showCaptcha).toBe(true);
			expect(shouldShowCaptcha(5, 100).showCaptcha).toBe(true);
			// Check trigger reason for suspicious score
			expect(shouldShowCaptcha(1, 60).triggerReason).toBe("suspicious_score_60");
		});

		it("should show captcha periodically for normal users", () => {
			// Mock Math.random to control randomness
			const originalRandom = Math.random;

			// Test periodic check (every 3-5 claims)
			// When Math.random returns 0: interval = 3, and randomValue (0) < 0.2 is true
			Math.random = () => 0; // Will make it every 3 claims, BUT also triggers 20% chance
			expect(shouldShowCaptcha(3, 0).showCaptcha).toBe(true); // 3 % 3 = 0, periodic check triggers
			expect(shouldShowCaptcha(6, 10).showCaptcha).toBe(true); // 6 % 3 = 0, periodic check triggers
			expect(shouldShowCaptcha(9, 20).showCaptcha).toBe(true); // 9 % 3 = 0, periodic check triggers

			// Non-multiples of 3 will still return true because random (0) < 0.2
			expect(shouldShowCaptcha(4, 0).showCaptcha).toBe(true); // 4 % 3 != 0, but random chance triggers
			expect(shouldShowCaptcha(5, 10).showCaptcha).toBe(true); // 5 % 3 != 0, but random chance triggers

			// Test with random value above 0.2 threshold
			Math.random = () => 0.25; // interval = 3, but random 0.25 > 0.2
			expect(shouldShowCaptcha(4, 0).showCaptcha).toBe(false); // 4 % 3 != 0, random chance doesn't trigger
			expect(shouldShowCaptcha(5, 10).showCaptcha).toBe(false); // 5 % 3 != 0, random chance doesn't trigger

			// Check trigger reasons
			Math.random = () => 0;
			const result = shouldShowCaptcha(3, 0);
			expect(result.triggerReason).toBe("periodic_check_interval_3");

			Math.random = originalRandom;
		});

		it("should have 20% random chance for normal users", () => {
			const originalRandom = Math.random;

			// Mock to trigger random chance
			Math.random = () => 0.15; // Below 0.2 threshold
			const result1 = shouldShowCaptcha(1, 0);
			expect(result1.showCaptcha).toBe(true);
			expect(result1.triggerReason).toBe("random_check");

			Math.random = () => 0.25; // Above 0.2 threshold
			const result2 = shouldShowCaptcha(1, 0);
			expect(result2.showCaptcha).toBe(false);
			expect(result2.triggerReason).toBeUndefined();

			Math.random = originalRandom;
		});
	});

	describe("getCaptchaDifficulty", () => {
		it("should return easy for low suspicious scores", () => {
			expect(getCaptchaDifficulty(0)).toBe("easy");
			expect(getCaptchaDifficulty(15)).toBe("easy");
			expect(getCaptchaDifficulty(29)).toBe("easy");
		});

		it("should return medium for moderate suspicious scores", () => {
			expect(getCaptchaDifficulty(30)).toBe("medium");
			expect(getCaptchaDifficulty(50)).toBe("medium");
			expect(getCaptchaDifficulty(69)).toBe("medium");
		});

		it("should return hard for high suspicious scores", () => {
			expect(getCaptchaDifficulty(70)).toBe("hard");
			expect(getCaptchaDifficulty(85)).toBe("hard");
			expect(getCaptchaDifficulty(100)).toBe("hard");
		});
	});

	describe("isSuspiciousResponseTime", () => {
		it("should flag too-fast math responses", () => {
			// Less than 2 seconds for math is suspicious
			expect(isSuspiciousResponseTime(500, "math")).toBe(true);
			expect(isSuspiciousResponseTime(1500, "math")).toBe(true);
			expect(isSuspiciousResponseTime(1999, "math")).toBe(true);
			expect(isSuspiciousResponseTime(2000, "math")).toBe(false);
			expect(isSuspiciousResponseTime(3000, "math")).toBe(false);
		});

		it("should flag too-fast emoji responses", () => {
			// Less than 1 second for emoji is suspicious
			expect(isSuspiciousResponseTime(500, "emoji")).toBe(true);
			expect(isSuspiciousResponseTime(999, "emoji")).toBe(true);
			expect(isSuspiciousResponseTime(1000, "emoji")).toBe(false);
			expect(isSuspiciousResponseTime(2000, "emoji")).toBe(false);
		});

		it("should flag too-fast word responses", () => {
			// Less than 3 seconds for word is suspicious
			expect(isSuspiciousResponseTime(1000, "word")).toBe(true);
			expect(isSuspiciousResponseTime(2500, "word")).toBe(true);
			expect(isSuspiciousResponseTime(2999, "word")).toBe(true);
			expect(isSuspiciousResponseTime(3000, "word")).toBe(false);
			expect(isSuspiciousResponseTime(5000, "word")).toBe(false);
		});
	});

	describe("presentCaptcha", () => {
		let mockInteraction: any;
		let mockChannel: any;
		let mockCollector: any;
		let mockButtonInteraction: any;

		beforeEach(() => {
			// Reset all mocks
			mockButtonInteraction = {
				customId: "captcha_0",
				user: { id: "123" },
				update: mock(() => Promise.resolve()),
			};

			mockCollector = {
				on: mock(() => mockCollector),
			};

			mockChannel = {
				awaitMessageComponent: mock(() => Promise.resolve(mockButtonInteraction)),
				createMessageComponentCollector: mock(() => mockCollector),
			};

			mockInteraction = {
				user: { id: "123" },
				channel: mockChannel,
				editReply: mock(() => Promise.resolve()),
				followUp: mock(() => Promise.resolve()),
			};
		});

		it("should return success when correct answer is selected", async () => {
			const challenge: CaptchaChallenge = {
				type: "math",
				question: "5 + 3 = ?",
				correctAnswer: "8",
				options: ["8", "7", "9", "6"],
				embedTitle: "Test",
				embedDescription: "Test",
			};

			mockButtonInteraction.customId = "captcha_0"; // First option is correct

			// Add a small delay to simulate actual response time
			mockChannel.awaitMessageComponent = mock(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return mockButtonInteraction;
			});

			const result = await presentCaptcha(mockInteraction as unknown as ChatInputCommandInteraction, challenge, 5000);

			expect(result.success).toBe(true);
			expect(result.attemptedAnswer).toBe("8");
			expect(result.responseTime).toBeGreaterThanOrEqual(10);
			expect(mockButtonInteraction.update).toHaveBeenCalled();
		});

		it("should return failure when wrong answer is selected", async () => {
			const challenge: CaptchaChallenge = {
				type: "math",
				question: "5 + 3 = ?",
				correctAnswer: "8",
				options: ["8", "7", "9", "6"],
				embedTitle: "Test",
				embedDescription: "Test",
			};

			mockButtonInteraction.customId = "captcha_1"; // Second option is wrong

			const result = await presentCaptcha(mockInteraction as unknown as ChatInputCommandInteraction, challenge, 5000);

			expect(result.success).toBe(false);
			expect(result.attemptedAnswer).toBe("7");
			expect(result.timedOut).toBe(false);
			expect(mockButtonInteraction.update).toHaveBeenCalled();
		});

		it("should handle timeout correctly", async () => {
			const challenge: CaptchaChallenge = {
				type: "math",
				question: "5 + 3 = ?",
				correctAnswer: "8",
				options: ["8", "7", "9", "6"],
				embedTitle: "Test",
				embedDescription: "Test",
			};

			// Simulate timeout by rejecting the promise
			mockChannel.awaitMessageComponent = mock(() => Promise.reject(new Error("Collector time ended")));

			const result = await presentCaptcha(mockInteraction as unknown as ChatInputCommandInteraction, challenge, 1000);

			expect(result.success).toBe(false);
			expect(result.timedOut).toBe(true);
			expect(mockInteraction.editReply).toHaveBeenCalledTimes(2); // Initial and timeout message
		});

		it("should track response time accurately", async () => {
			const challenge: CaptchaChallenge = {
				type: "math",
				question: "5 + 3 = ?",
				correctAnswer: "8",
				options: ["8", "7", "9", "6"],
				embedTitle: "Test",
				embedDescription: "Test",
			};

			// Add artificial delay in mock
			mockChannel.awaitMessageComponent = mock(async () => {
				await new Promise((resolve) => setTimeout(resolve, 100));
				return mockButtonInteraction;
			});

			const result = await presentCaptcha(mockInteraction as unknown as ChatInputCommandInteraction, challenge, 5000);

			expect(result.responseTime).toBeGreaterThanOrEqual(100);
			expect(result.responseTime).toBeLessThan(200);
		});
	});
});
