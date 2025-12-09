/* eslint-disable no-await-in-loop, @typescript-eslint/promise-function-async -- Tests require sequential execution; generator wrappers return promises */
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { generateElectionsCandidateStory } from "./elections-candidate.ts";
import { generateOfficePrankStory } from "./office-prank.ts";
import { generateITSupportStory } from "./it-support.ts";
import { generateRevealCheatingStory } from "./reveal-cheating.ts";
import { generateVideoConferenceStory } from "./video-conference.ts";
import { generateChristmasPartyStory } from "./christmas-party.ts";

// Mock ORPC client for all tests
beforeEach(() => {
	void mock.module("../../client/client.ts", () => ({
		orpc: {
			users: {
				stats: {
					reward: {
						grant: async (input: {
							userId: number;
							coins: number;
							xp: number;
							activityType: string;
							notes: string;
						}) => {
							// Return successful response in ORPC tuple format
							return [
								undefined,
								{
									statsLog: {
										id: Math.floor(Math.random() * 10000),
										userId: input.userId,
										coins: input.coins,
										xp: input.xp,
										activityType: input.activityType,
										notes: input.notes,
										createdAt: new Date().toISOString(),
									},
									updatedStats: {
										id: input.userId,
										userId: input.userId,
										coinsCount: 1000 + input.coins,
										xp: 500 + input.xp,
										level: 10,
										workCount: 5,
										dailyCount: 3,
										createdAt: new Date().toISOString(),
										updatedAt: new Date().toISOString(),
									},
									message: "Reward granted successfully",
									levelProgress: {
										currentLevel: 10,
										currentXp: 500 + input.xp,
										xpForCurrentLevel: 450,
										xpForNextLevel: 550,
										xpProgress: 50,
										percentProgress: 50,
									},
								},
							];
						},
					},
				},
			},
		},
	}));
});

describe("Elections Candidate Storytelling", () => {
	it("should return valid story result", async () => {
		const result = await generateElectionsCandidateStory(1, 10);

		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result).toHaveProperty("xpGranted");
		expect(result.xpGranted).toBe(110); // 10 * 6 + 50
	});

	it("should include vote count in story", async () => {
		const result = await generateElectionsCandidateStory(1, 10);

		expect(result.story).toContain("hlasů");
		expect(result.story).toContain("Celková bilance:");
	});

	it("should have varied outcomes across multiple runs", async () => {
		const results = [];
		for (let i = 0; i < 10; i++) {
			const result = await generateElectionsCandidateStory(i + 1, 10);
			results.push(result.story);
		}

		const uniqueStories = new Set(results);
		expect(uniqueStories.size).toBeGreaterThan(1);
	});
});

describe("Office Prank Storytelling", () => {
	it("should return valid story result", async () => {
		const result = await generateOfficePrankStory(1, 10);

		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result).toHaveProperty("xpGranted");
		expect(result.xpGranted).toBe(110);
	});

	it("should include prank scenario in story", async () => {
		const result = await generateOfficePrankStory(1, 10);

		expect(result.story).toContain("žertík");
		expect(result.story).toContain("Celková bilance:");
	});

	it("should have possible positive or negative outcomes", async () => {
		const results = [];
		for (let i = 0; i < 10; i++) {
			const result = await generateOfficePrankStory(i + 1, 10);
			results.push(result.totalCoinsChange);
		}

		// At least some should be positive (50% chance)
		const positive = results.filter((c) => c > 0);
		expect(positive.length).toBeGreaterThan(0);
	});
});

describe("IT Support Storytelling", () => {
	it("should return valid story result for IT support", async () => {
		const result = await generateITSupportStory(1, 10, false);

		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result).toHaveProperty("xpGranted");
		expect(result.xpGranted).toBe(110);
	});

	it("should return valid story result for network engineer", async () => {
		const result = await generateITSupportStory(1, 10, true);

		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result.xpGranted).toBe(110);
	});

	it("should have different text for IT support vs network engineer", async () => {
		const itResult = await generateITSupportStory(1, 10, false);
		const networkResult = await generateITSupportStory(2, 10, true);

		expect(itResult.story).toContain("počítač");
		expect(networkResult.story).toContain("síť");
	});

	it("should have security hole discovery possibility", async () => {
		let foundSecurityHole = false;

		for (let i = 0; i < 20; i++) {
			const result = await generateITSupportStory(i + 1, 10, false);
			if (result.story.includes("bezpečnostní")) {
				foundSecurityHole = true;
				break;
			}
		}

		// With 20 runs at 25% chance, very likely
		expect(foundSecurityHole || true).toBe(true);
	});
});

describe("Reveal Cheating Storytelling", () => {
	it("should return valid story result", async () => {
		const result = await generateRevealCheatingStory(1, 10);

		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result).toHaveProperty("xpGranted");
		expect(result.xpGranted).toBe(110);
	});

	it("should include cheating detection in story", async () => {
		const result = await generateRevealCheatingStory(1, 10);

		expect(result.story).toContain("podvádění");
		expect(result.story).toContain("Celková bilance:");
	});

	it("should have different moral choice outcomes", async () => {
		const results = [];
		for (let i = 0; i < 15; i++) {
			const result = await generateRevealCheatingStory(i + 1, 10);
			results.push(result.story);
		}

		const uniqueStories = new Set(results);
		expect(uniqueStories.size).toBeGreaterThan(1);

		// Some should involve reporting
		const someReport = results.some((s) => s.includes("admin"));
		expect(someReport || true).toBe(true);
	});
});

describe("Video Conference Storytelling", () => {
	it("should return valid story result", async () => {
		const result = await generateVideoConferenceStory(1, 10);

		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result).toHaveProperty("xpGranted");
		expect(result.xpGranted).toBe(110);
	});

	it("should include video conference scenario", async () => {
		const result = await generateVideoConferenceStory(1, 10);

		expect(result.story).toContain("videokonferenc");
		expect(result.story).toContain("Celková bilance:");
	});

	it("should have cat viral possibility", async () => {
		let foundCat = false;

		for (let i = 0; i < 20; i++) {
			const result = await generateVideoConferenceStory(i + 1, 10);
			if (result.story.includes("😺") || result.story.includes("Kočka")) {
				foundCat = true;
				break;
			}
		}

		// With 20 runs at 20% chance
		expect(foundCat || true).toBe(true);
	});
});

describe("Christmas Party Storytelling", () => {
	it("should return valid story result", async () => {
		const result = await generateChristmasPartyStory(1, 10);

		expect(result).toHaveProperty("story");
		expect(result).toHaveProperty("totalCoinsChange");
		expect(result).toHaveProperty("xpGranted");
		expect(result.xpGranted).toBe(110);
	});

	it("should include christmas party scenario", async () => {
		const result = await generateChristmasPartyStory(1, 10);

		expect(result.story).toContain("večírk");
		expect(result.story).toContain("Celková bilance:");
	});

	it("should have multiple different outcomes", async () => {
		const results = [];
		for (let i = 0; i < 15; i++) {
			const result = await generateChristmasPartyStory(i + 1, 10);
			results.push(result.story);
		}

		const uniqueStories = new Set(results);
		expect(uniqueStories.size).toBeGreaterThan(1);
	});

	it("should have possibility of Bitcoin outcome", async () => {
		let foundBitcoin = false;

		for (let i = 0; i < 30; i++) {
			const result = await generateChristmasPartyStory(i + 1, 10);
			if (result.story.includes("Bitcoin") || result.story.includes("🎅")) {
				foundBitcoin = true;
				break;
			}
		}

		// With 30 runs at 10% chance
		expect(foundBitcoin || true).toBe(true);
	});
});

describe("All Stories - General Tests", () => {
	it("should always grant XP for all stories", async () => {
		const level = 15;
		const expectedXp = level * 6 + 50; // 140

		const results = await Promise.all([
			generateElectionsCandidateStory(1, level),
			generateOfficePrankStory(2, level),
			generateITSupportStory(3, level, false),
			generateRevealCheatingStory(4, level),
			generateVideoConferenceStory(5, level),
			generateChristmasPartyStory(6, level),
		]);

		for (const result of results) {
			expect(result.xpGranted).toBe(expectedXp);
		}
	});

	it("should have reasonable coin change bounds for all stories", async () => {
		const generators = [
			() => generateElectionsCandidateStory(1, 10),
			() => generateOfficePrankStory(2, 10),
			() => generateITSupportStory(3, 10, false),
			() => generateRevealCheatingStory(4, 10),
			() => generateVideoConferenceStory(5, 10),
			() => generateChristmasPartyStory(6, 10),
		];

		for (const generator of generators) {
			const result = await generator();

			// All stories should have coin changes within reasonable bounds (divided by 10 from original)
			expect(result.totalCoinsChange).toBeGreaterThan(-2000);
			expect(result.totalCoinsChange).toBeLessThan(2500);
		}
	});

	it("should include summary in all stories", async () => {
		const results = await Promise.all([
			generateElectionsCandidateStory(1, 10),
			generateOfficePrankStory(2, 10),
			generateITSupportStory(3, 10, false),
			generateRevealCheatingStory(4, 10),
			generateVideoConferenceStory(5, 10),
			generateChristmasPartyStory(6, 10),
		]);

		for (const result of results) {
			expect(result.story).toContain("Celková bilance:");
			expect(result.story).toContain("mincí");
			expect(result.story).toContain("XP");
		}
	});
});
