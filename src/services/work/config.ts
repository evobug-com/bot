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
	 */
	storyChancePercent: 20,
} as const;
