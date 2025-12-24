/**
 * Work command configuration
 * All configurable values are centralized here for easy adjustment
 *
 * Note: Users can individually opt-out of story work via /settings command.
 * These global settings act as a system-wide kill switch and default chance.
 */
export const WORK_CONFIG = {
	/**
	 * Global kill switch for story work feature
	 * When false, no users will get story activities regardless of their personal settings
	 */
	storyWorkEnabled: true,

	/**
	 * Chance (0-100) for a story activity to appear during /work
	 * Only applies when both global and user settings are enabled
	 * NOTE: This is now configurable via /work-settings command (stored in SQLite)
	 * This value serves as the default if no custom setting exists.
	 */
	storyChancePercent: 20,

	/**
	 * AI story reward bounds - enforced during generation
	 */
	aiStoryRewards: {
		/** Minimum base reward for choices */
		minBaseReward: 100,
		/** Maximum base reward for choices */
		maxBaseReward: 500,
		/** Minimum terminal coins change (can be negative for losses) */
		minTerminalCoins: -400,
		/** Maximum terminal coins change */
		maxTerminalCoins: 600,
		/** Minimum XP multiplier */
		minXpMultiplier: 0.5,
		/** Maximum XP multiplier */
		maxXpMultiplier: 2.0,
		/** Minimum risk multiplier (lower = easier) */
		minRiskMultiplier: 0.5,
		/** Maximum risk multiplier (higher = harder) */
		maxRiskMultiplier: 1.5,
	},
} as const;
