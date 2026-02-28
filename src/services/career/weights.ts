import { Career, type CareerType, type CategoryWeights } from "./types";

/**
 * Career-specific weights for activity/story categories.
 * Higher weight = more likely to get activities from that category.
 *
 * For /work command: only work:* categories apply
 * For /story command: only story:* categories apply
 */
export const CAREER_WEIGHTS: Record<CareerType, CategoryWeights> = {
	[Career.CLERK]: {
		// Office-focused career
		"work:office": 3,    // Strong bias toward office activities
		"work:dev": 1,       // Some tech exposure
		"work:misc": 1,      // Normal misc
		"work:community": 1, // Normal community
		"story:work": 3,     // Office drama stories
		"story:crime": 0.5,  // Less crime
		"story:adventure": 1,// Normal adventure
	},
	[Career.DEVELOPER]: {
		// Tech-focused career
		"work:office": 1,    // Some office work
		"work:dev": 4,       // Strong dev bias
		"work:misc": 1,      // Normal misc
		"work:community": 2, // More community (bot-related)
		"story:work": 2,     // Tech stories (hackathon, deploy, etc.)
		"story:crime": 0.5,  // Less crime
		"story:adventure": 1,// Normal adventure
	},
	[Career.SALESPERSON]: {
		// Client-focused career
		"work:office": 2,    // Moderate office
		"work:dev": 0.5,     // Less dev
		"work:misc": 1,      // Normal misc
		"work:community": 1, // Normal community
		"story:work": 3,     // Client meetings, negotiations
		"story:crime": 1,    // Normal crime
		"story:adventure": 1,// Normal adventure
	},
	[Career.ADVENTURER]: {
		// Variety-focused career
		"work:office": 1,    // Normal office
		"work:dev": 1,       // Normal dev
		"work:misc": 2,      // More random stuff
		"work:community": 2, // More community
		"story:work": 1,     // Normal work stories
		"story:crime": 1,    // Normal crime
		"story:adventure": 3,// Strong adventure bias
	},
	[Career.SHADOW]: {
		// Morally gray career
		"work:office": 0.5,  // Less office
		"work:dev": 1,       // Normal dev
		"work:misc": 2,      // More random
		"work:community": 1, // Normal community
		"story:work": 0.5,   // Less work stories
		"story:crime": 4,    // Strong crime bias
		"story:adventure": 2,// More adventure
	},
};

/**
 * Get the weight for a specific category and career.
 * Returns 1 if not found (default weight).
 */
export function getCategoryWeight(career: CareerType, category: keyof CategoryWeights): number {
	return CAREER_WEIGHTS[career]?.[category] ?? 1;
}

/**
 * Get all weights for a career.
 */
export function getCareerWeights(career: CareerType): CategoryWeights {
	return CAREER_WEIGHTS[career];
}
