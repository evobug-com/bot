import { mock } from "bun:test";
import type { CaptchaChallenge, CaptchaResult, CaptchaType } from "../../util/captcha.ts";

/**
 * Mock captcha challenge generator for predictable testing
 */
export class MockCaptchaChallenge {
	static create(overrides?: Partial<CaptchaChallenge>): CaptchaChallenge {
		return {
			type: "math",
			question: "5 + 3 = ?",
			correctAnswer: "8",
			options: ["8", "7", "9", "6"],
			embedTitle: "🔐 Test Captcha",
			embedDescription: "This is a test captcha",
			...overrides,
		};
	}

	static createMath(difficulty: "easy" | "medium" | "hard" = "easy"): CaptchaChallenge {
		const challenges = {
			easy: {
				question: "3 + 4 = ?",
				correctAnswer: "7",
				options: ["7", "6", "8", "5"],
			},
			medium: {
				question: "12 × 3 = ?",
				correctAnswer: "36",
				options: ["36", "34", "38", "32"],
			},
			hard: {
				question: "47 × 13 = ?",
				correctAnswer: "611",
				options: ["611", "601", "621", "591"],
			},
		};

		return {
			type: "math",
			embedTitle: "🔐 Math Captcha",
			embedDescription: "Solve this math problem:",
			...challenges[difficulty],
		};
	}

	static createEmoji(): CaptchaChallenge {
		return {
			type: "emoji",
			question: "🎮",
			correctAnswer: "🎮",
			options: ["🎮", "🎯", "🎲", "🎪"],
			embedTitle: "🔐 Emoji Captcha",
			embedDescription: "Click the button with this emoji: 🎮",
		};
	}

	static createWord(): CaptchaChallenge {
		return {
			type: "word",
			question: "RKOW",
			correctAnswer: "WORK",
			options: ["WORK", "WROK", "OWRK", "ROKW"],
			embedTitle: "🔐 Word Captcha",
			embedDescription: "Unscramble: **RKOW**\nHint: What you do every day",
		};
	}
}

/**
 * Mock captcha result for testing
 */
export class MockCaptchaResult {
	static success(responseTime = 3500, answer?: string): CaptchaResult {
		return {
			success: true,
			responseTime,
			attemptedAnswer: answer || "8",
			timedOut: false,
		};
	}

	static failure(responseTime = 2500, answer?: string): CaptchaResult {
		return {
			success: false,
			responseTime,
			attemptedAnswer: answer || "7",
			timedOut: false,
		};
	}

	static timeout(): CaptchaResult {
		return {
			success: false,
			responseTime: 30000,
			timedOut: true,
		};
	}

	static suspicious(): CaptchaResult {
		return {
			success: true,
			responseTime: 400, // Too fast
			attemptedAnswer: "8",
			timedOut: false,
		};
	}
}

/**
 * Mock timing simulator for generating realistic patterns
 */
export class MockTimingSimulator {
	/**
	 * Generate bot-like exact intervals
	 */
	static generateBotTimings(count: number, intervalMs: number, startTime?: Date): Date[] {
		const start = startTime || new Date(Date.now() - count * intervalMs);
		const timings: Date[] = [];

		for (let i = 0; i < count; i++) {
			timings.push(new Date(start.getTime() + i * intervalMs));
		}

		return timings;
	}

	/**
	 * Generate human-like irregular intervals
	 */
	static generateHumanTimings(count: number, minIntervalMs: number, maxIntervalMs: number, startTime?: Date): Date[] {
		const start = startTime || new Date(Date.now() - count * maxIntervalMs);
		const timings: Date[] = [];
		let currentTime = start.getTime();

		for (let i = 0; i < count; i++) {
			timings.push(new Date(currentTime));
			const interval = minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs);
			currentTime += interval;
		}

		return timings;
	}

	/**
	 * Generate sophisticated bot timings with small variations
	 */
	static generateSmartBotTimings(count: number, baseIntervalMs: number, deviationMs: number, startTime?: Date): Date[] {
		const start = startTime || new Date(Date.now() - count * baseIntervalMs);
		const timings: Date[] = [];

		for (let i = 0; i < count; i++) {
			const deviation = (Math.random() - 0.5) * 2 * deviationMs;
			timings.push(new Date(start.getTime() + i * baseIntervalMs + deviation));
		}

		return timings;
	}
}

/**
 * Mock response time generator
 */
export class MockResponseTimeGenerator {
	/**
	 * Generate realistic human response times
	 */
	static human(captchaType: CaptchaType): number {
		const baseTimes = {
			math: 3000 + Math.random() * 4000, // 3-7 seconds
			emoji: 1500 + Math.random() * 2500, // 1.5-4 seconds
			word: 4000 + Math.random() * 4000, // 4-8 seconds
		};

		return Math.floor(baseTimes[captchaType]);
	}

	/**
	 * Generate bot response times (too fast)
	 */
	static bot(captchaType: CaptchaType): number {
		const botTimes = {
			math: 300 + Math.random() * 700, // 0.3-1 seconds
			emoji: 200 + Math.random() * 300, // 0.2-0.5 seconds
			word: 500 + Math.random() * 1000, // 0.5-1.5 seconds
		};

		return Math.floor(botTimes[captchaType]);
	}

	/**
	 * Generate smart bot response times (trying to appear human)
	 */
	static smartBot(captchaType: CaptchaType): number {
		const smartTimes = {
			math: 2100 + Math.random() * 900, // 2.1-3 seconds (just above threshold)
			emoji: 1100 + Math.random() * 400, // 1.1-1.5 seconds
			word: 3100 + Math.random() * 900, // 3.1-4 seconds
		};

		return Math.floor(smartTimes[captchaType]);
	}
}

/**
 * Mock pattern generator for testing detection
 */
export class MockPatternGenerator {
	/**
	 * Generate work/daily claim pattern
	 */
	static generateClaimPattern(pattern: string[]): Array<{ command: "work" | "daily"; timestamp: Date }> {
		const result: Array<{ command: "work" | "daily"; timestamp: Date }> = [];
		const baseTime = Date.now() - pattern.length * 3600000;

		pattern.forEach((command, index) => {
			result.push({
				command: command as "work" | "daily",
				timestamp: new Date(baseTime + index * 3600000),
			});
		});

		return result;
	}

	/**
	 * Generate time-of-day pattern (bot active at specific hours)
	 */
	static generateTimeOfDayPattern(hours: number[], days: number): Date[] {
		const timestamps: Date[] = [];
		const now = new Date();

		for (let day = 0; day < days; day++) {
			for (const hour of hours) {
				const date = new Date(now);
				date.setDate(date.getDate() - day);
				date.setHours(hour, 0, 0, 0);
				timestamps.push(date);
			}
		}

		return timestamps;
	}
}

/**
 * Mock button interaction for captcha testing
 */
export class MockButtonInteraction {
	customId: string;
	user: { id: string };
	updateMock: any;

	constructor(userId: string, buttonIndex: number) {
		this.customId = `captcha_${buttonIndex}`;
		this.user = { id: userId };
		this.updateMock = mock(() => Promise.resolve());
	}

	async update(options: any): Promise<void> {
		this.updateMock(options);
	}
}

/**
 * Mock Discord channel for captcha presentation
 */
export class MockCaptchaChannel {
	private buttonInteraction: MockButtonInteraction | null = null;
	private timeout = false;
	awaitComponentMock: any;

	constructor() {
		this.awaitComponentMock = mock();
	}

	setButtonResponse(buttonIndex: number, userId: string): void {
		this.buttonInteraction = new MockButtonInteraction(userId, buttonIndex);
	}

	setTimeout(shouldTimeout: boolean): void {
		this.timeout = shouldTimeout;
	}

	async awaitMessageComponent(options: any): Promise<MockButtonInteraction | null> {
		this.awaitComponentMock(options);

		if (this.timeout) {
			throw new Error("Collector time ended");
		}

		// Simulate response delay
		const delay = options.time && options.time < 1000 ? 0 : 100;
		await new Promise((resolve) => setTimeout(resolve, delay));

		return this.buttonInteraction;
	}
}

/**
 * Captcha test scenarios
 */
export const CaptchaTestScenarios = {
	legitimateUser: {
		workCount: 15,
		suspiciousScore: 0,
		responseTime: () => MockResponseTimeGenerator.human("math"),
		successRate: 0.85, // 85% success rate
	},

	suspiciousUser: {
		workCount: 50,
		suspiciousScore: 45,
		responseTime: () => MockResponseTimeGenerator.smartBot("math"),
		successRate: 0.95,
	},

	confirmedBot: {
		workCount: 200,
		suspiciousScore: 85,
		responseTime: () => MockResponseTimeGenerator.bot("math"),
		successRate: 1.0, // 100% success
	},

	newUser: {
		workCount: 0,
		suspiciousScore: 0,
		responseTime: () => MockResponseTimeGenerator.human("math"),
		successRate: 0.7,
	},
};

export default {
	MockCaptchaChallenge,
	MockCaptchaResult,
	MockTimingSimulator,
	MockResponseTimeGenerator,
	MockPatternGenerator,
	MockButtonInteraction,
	MockCaptchaChannel,
	CaptchaTestScenarios,
};
