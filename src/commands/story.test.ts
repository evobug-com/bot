import { describe, expect, it } from "bun:test";
import { workActivities, type StoryCategory } from "./work.ts";
import { Career, getCareerWeights, type CategoryWeights } from "../services/career/index.ts";
import { getSecureRandomIndex } from "../utils/random.ts";

// Interface for story activities
interface StoryActivity {
	id: string;
	title: string;
	activity: string;
	category: StoryCategory;
	branchingStoryId: string;
}

// Filter to story activities only (replicates logic from story.ts)
function getStoryActivities(): StoryActivity[] {
	const storyActivities: StoryActivity[] = [];
	for (const act of workActivities) {
		if (typeof act === "function") continue;
		if (!act.category.startsWith("story:")) continue;
		if (!("branchingStoryId" in act) || act.branchingStoryId === undefined) continue;
		storyActivities.push({
			id: act.id,
			title: act.title,
			activity: act.activity,
			category: act.category as StoryCategory,
			branchingStoryId: act.branchingStoryId,
		});
	}
	return storyActivities;
}

// Replicates weighted selection logic from story.ts
function selectWeightedStory(
	stories: StoryActivity[],
	weights: CategoryWeights,
): StoryActivity | null {
	if (stories.length === 0) return null;

	const weightedStories: { story: StoryActivity; weight: number }[] = [];

	for (const story of stories) {
		const category = story.category as keyof CategoryWeights;
		const weight = weights[category] ?? 1;
		weightedStories.push({ story, weight });
	}

	const totalWeight = weightedStories.reduce((sum, item) => sum + item.weight, 0);
	if (totalWeight <= 0) {
		const index = getSecureRandomIndex(stories.length);
		return stories[index] ?? null;
	}

	let random = Math.random() * totalWeight;
	for (const item of weightedStories) {
		random -= item.weight;
		if (random <= 0) {
			return item.story;
		}
	}

	const lastItem = weightedStories[weightedStories.length - 1];
	return lastItem?.story ?? null;
}

describe("Story command filtering", () => {
	it("should only include activities with story: category prefix", () => {
		const storyActivities = getStoryActivities();

		for (const activity of storyActivities) {
			expect(activity.category.startsWith("story:")).toBe(true);
		}
	});

	it("should only include activities with branchingStoryId", () => {
		const storyActivities = getStoryActivities();

		for (const activity of storyActivities) {
			expect(activity.branchingStoryId).toBeDefined();
			expect(typeof activity.branchingStoryId).toBe("string");
			expect(activity.branchingStoryId.length).toBeGreaterThan(0);
		}
	});

	it("should include all story categories", () => {
		const storyActivities = getStoryActivities();
		const categories = new Set(storyActivities.map((a) => a.category));

		expect(categories.has("story:work")).toBe(true);
		expect(categories.has("story:crime")).toBe(true);
		expect(categories.has("story:adventure")).toBe(true);
	});

	it("should have 15 story activities total", () => {
		const storyActivities = getStoryActivities();
		// Based on the categorization: 10 work + 2 crime + 3 adventure = 15
		expect(storyActivities.length).toBe(15);
	});
});

describe("Story command weighted selection", () => {
	it("should always return a story when stories are available", () => {
		const storyActivities = getStoryActivities();
		const weights = getCareerWeights(Career.CLERK);

		for (let i = 0; i < 100; i++) {
			const selected = selectWeightedStory(storyActivities, weights);
			expect(selected).not.toBeNull();
		}
	});

	it("should return null when no stories are available", () => {
		const weights = getCareerWeights(Career.CLERK);
		const selected = selectWeightedStory([], weights);
		expect(selected).toBeNull();
	});

	it("career weights should influence selection", () => {
		const storyActivities = getStoryActivities();
		const iterations = 1000;

		// Shadow career has high crime weight (4) and low work weight (0.5)
		const shadowWeights = getCareerWeights(Career.SHADOW);
		const shadowCrimeCount = countCategorySelections(storyActivities, shadowWeights, "story:crime", iterations);

		// Clerk career has low crime weight (0.5) and high work weight (3)
		const clerkWeights = getCareerWeights(Career.CLERK);
		const clerkCrimeCount = countCategorySelections(storyActivities, clerkWeights, "story:crime", iterations);

		// Shadow should get significantly more crime stories
		expect(shadowCrimeCount).toBeGreaterThan(clerkCrimeCount);
	});

	it("adventurer should get more adventure stories", () => {
		const storyActivities = getStoryActivities();
		const iterations = 1000;

		const adventurerWeights = getCareerWeights(Career.ADVENTURER);
		const adventurerAdventureCount = countCategorySelections(storyActivities, adventurerWeights, "story:adventure", iterations);

		const clerkWeights = getCareerWeights(Career.CLERK);
		const clerkAdventureCount = countCategorySelections(storyActivities, clerkWeights, "story:adventure", iterations);

		// Adventurer should get more adventure stories
		expect(adventurerAdventureCount).toBeGreaterThan(clerkAdventureCount);
	});
});

// Helper function to count selections of a specific category
function countCategorySelections(
	stories: StoryActivity[],
	weights: CategoryWeights,
	targetCategory: string,
	iterations: number,
): number {
	let count = 0;
	for (let i = 0; i < iterations; i++) {
		const selected = selectWeightedStory(stories, weights);
		if (selected && selected.category === targetCategory) {
			count++;
		}
	}
	return count;
}

describe("Story categories distribution", () => {
	it("should have story:work as the largest category", () => {
		const storyActivities = getStoryActivities();

		const workCount = storyActivities.filter((a) => a.category === "story:work").length;
		const crimeCount = storyActivities.filter((a) => a.category === "story:crime").length;
		const adventureCount = storyActivities.filter((a) => a.category === "story:adventure").length;

		expect(workCount).toBeGreaterThan(crimeCount);
		expect(workCount).toBeGreaterThan(adventureCount);
	});

	it("each story should have unique branchingStoryId", () => {
		const storyActivities = getStoryActivities();
		const storyIds = storyActivities.map((a) => a.branchingStoryId);
		const uniqueIds = new Set(storyIds);

		expect(uniqueIds.size).toBe(storyIds.length);
	});
});
