import { ViolationType } from "../../data/violationData.ts";
import { RuleSection, RULE_TO_VIOLATION_TYPE, SECTION_TO_VIOLATION_TYPE, SEVERE_RULES } from "./config.ts";

/**
 * Extracted section and violation type from AI categories
 */
export interface MappedViolation {
	ruleNumbers: string[];
	sections: RuleSection[];
	primarySection: RuleSection;
	violationType: ViolationType;
	isSevere: boolean;
}

/**
 * Extract rule section from a rule number string
 * @param ruleNumber - The rule number (e.g., "101", "1001")
 * @returns The section (100, 200, ... 1000)
 */
export function extractSectionFromRule(ruleNumber: string): RuleSection | null {
	const num = Number.parseInt(ruleNumber, 10);
	if (Number.isNaN(num) || num < 100) return null;

	// For 1000+ rules, return 1000
	if (num >= 1000) return RuleSection.MODERATION;

	// Round down to nearest hundred
	const section = Math.floor(num / 100) * 100;

	// Validate it's a known section
	if (Object.values(RuleSection).includes(section)) {
		return section as RuleSection;
	}

	return null;
}

/**
 * Get violation type for a specific rule number
 * First checks for specific rule overrides, then falls back to section default
 */
export function getViolationTypeForRule(ruleNumber: string): ViolationType {
	// Check for specific rule override
	const ruleOverride = RULE_TO_VIOLATION_TYPE[ruleNumber];
	if (ruleOverride !== undefined) {
		return ruleOverride;
	}

	// Fall back to section-based mapping
	const section = extractSectionFromRule(ruleNumber);
	if (section !== null) {
		const sectionType = SECTION_TO_VIOLATION_TYPE[section];
		if (sectionType !== undefined) {
			return sectionType;
		}
	}

	// Default to OTHER
	return ViolationType.OTHER;
}

/**
 * Check if a rule number is considered severe (immediate escalation)
 */
export function isSevereRule(ruleNumber: string): boolean {
	return SEVERE_RULES.includes(ruleNumber);
}

/**
 * Extract all sections from an array of AI-detected categories (rule numbers)
 * @param categories - Array of rule number strings from AI (e.g., ["101", "201"])
 * @returns Array of unique sections
 */
export function extractSectionsFromCategories(categories: string[]): RuleSection[] {
	const sections = new Set<RuleSection>();

	for (const category of categories) {
		// Handle rule numbers like "101", "201", "1001"
		const match = category.match(/^(\d{3,4})$/);
		if (match?.[1]) {
			const section = extractSectionFromRule(match[1]);
			if (section !== null) {
				sections.add(section);
			}
		}
	}

	return Array.from(sections);
}

/**
 * Map AI categories to a complete violation mapping
 * Determines the primary section, violation type, and severity indicators
 */
export function mapCategoriesToViolation(categories: string[]): MappedViolation | null {
	const ruleNumbers = categories.filter((c) => /^\d{3,4}$/.test(c));
	if (ruleNumbers.length === 0) return null;

	const sections = extractSectionsFromCategories(ruleNumbers);
	if (sections.length === 0) return null;

	// Use the first section as primary (guaranteed to exist since we checked length > 0)
	const primarySection = sections[0];
	if (primarySection === undefined) return null;

	// Determine if any severe rules are present
	const isSevere = ruleNumbers.some(isSevereRule);

	// Get violation types for all rules and pick the most severe
	const violationTypesSet = new Set(ruleNumbers.map(getViolationTypeForRule));

	// Priority order for violation types (most severe first)
	const typePriority: ViolationType[] = [
		ViolationType.ILLEGAL,
		ViolationType.SELF_HARM,
		ViolationType.EVASION,
		ViolationType.PRIVACY,
		ViolationType.IMPERSONATION,
		ViolationType.NSFW,
		ViolationType.TOXICITY,
		ViolationType.ADVERTISING,
		ViolationType.SPAM,
		ViolationType.OTHER,
	];

	// Find the highest priority violation type
	let primaryViolationType = ViolationType.OTHER;
	for (const type of typePriority) {
		if (violationTypesSet.has(type)) {
			primaryViolationType = type;
			break;
		}
	}

	return {
		ruleNumbers,
		sections,
		primarySection,
		violationType: primaryViolationType,
		isSevere,
	};
}

/**
 * Get the policy string to store in violation record
 * Stores all violated rule numbers comma-separated
 */
export function formatPolicyViolated(ruleNumbers: string[]): string {
	return ruleNumbers.join(",");
}
