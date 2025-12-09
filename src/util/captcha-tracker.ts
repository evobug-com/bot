/**
 * In-memory tracker for captcha failures
 * Tracks users who recently failed captcha to ensure they get another one
 */

interface FailedAttempt {
	userId: string;
	failedAt: Date;
	attempts: number;
}

interface UserCaptchaState {
	userId: string;
	interval: number; // The consistent interval for this user (3-5)
	lastCaptchaAtClaim: number; // The claim count when last captcha was shown
	assignedAt: Date; // When the interval was assigned
}

class CaptchaTracker {
	private failures = new Map<string, FailedAttempt>();
	private userStates = new Map<string, UserCaptchaState>();
	private readonly FAILURE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
	private readonly STATE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
	private readonly MAX_CLEANUP_SIZE = 1000; // Cleanup when map gets too large

	/**
	 * Record a failed captcha attempt
	 */
	recordFailure(userId: string): void {
		const existing = this.failures.get(userId);

		if (existing) {
			existing.attempts++;
			existing.failedAt = new Date();
		} else {
			this.failures.set(userId, {
				userId,
				failedAt: new Date(),
				attempts: 1,
			});
		}

		// Cleanup old entries if map gets too large
		if (this.failures.size > this.MAX_CLEANUP_SIZE) {
			this.cleanup();
		}
	}

	/**
	 * Check if user has recent failures
	 */
	hasRecentFailure(userId: string): boolean {
		const failure = this.failures.get(userId);

		if (!failure) {
			return false;
		}

		const now = Date.now();
		const failedTime = failure.failedAt.getTime();

		// Check if failure is still within the expiry window
		if (now - failedTime > this.FAILURE_EXPIRY_MS) {
			this.failures.delete(userId);
			return false;
		}

		return true;
	}

	/**
	 * Clear a user's failure record (after successful captcha)
	 */
	clearFailure(userId: string): void {
		this.failures.delete(userId);
	}

	/**
	 * Get the number of recent failures for a user
	 */
	getFailureCount(userId: string): number {
		const failure = this.failures.get(userId);

		if (!failure) {
			return 0;
		}

		const now = Date.now();
		const failedTime = failure.failedAt.getTime();

		// Check if failure is still valid
		if (now - failedTime > this.FAILURE_EXPIRY_MS) {
			this.failures.delete(userId);
			return 0;
		}

		return failure.attempts;
	}

	/**
	 * Get or create a consistent interval for a user
	 */
	getUserInterval(userId: string): number {
		let state = this.userStates.get(userId);

		if (!state) {
			// Assign a new interval (3-5) that will stay consistent for this user
			const interval = 3 + Math.floor(Math.random() * 3);
			state = {
				userId,
				interval,
				lastCaptchaAtClaim: 0,
				assignedAt: new Date(),
			};
			this.userStates.set(userId, state);
		}

		return state.interval;
	}

	/**
	 * Check if user should get a periodic captcha based on their interval
	 */
	shouldShowPeriodicCaptcha(userId: string, claimCount: number): boolean {
		const state = this.userStates.get(userId);

		if (!state) {
			// First time user, initialize their state
			this.getUserInterval(userId);
			return false; // Don't show on first claim
		}

		// Check if enough claims have passed since last captcha
		const claimsSinceLastCaptcha = claimCount - state.lastCaptchaAtClaim;
		return claimsSinceLastCaptcha >= state.interval;
	}

	/**
	 * Record that a captcha was shown to a user
	 */
	recordCaptchaShown(userId: string, claimCount: number): void {
		let state = this.userStates.get(userId);

		if (!state) {
			void this.getUserInterval(userId); // Initialize state if missing
			state = this.userStates.get(userId);
			if (!state) {
				// State should exist after getUserInterval, but handle edge case
				return;
			}
		}

		state.lastCaptchaAtClaim = claimCount;
	}

	/**
	 * Clean up expired entries
	 */
	private cleanup(): void {
		const now = Date.now();

		// Clean up failures
		for (const [userId, failure] of this.failures.entries()) {
			if (now - failure.failedAt.getTime() > this.FAILURE_EXPIRY_MS) {
				this.failures.delete(userId);
			}
		}

		// Clean up old user states
		for (const [userId, state] of this.userStates.entries()) {
			if (now - state.assignedAt.getTime() > this.STATE_EXPIRY_MS) {
				this.userStates.delete(userId);
			}
		}
	}

	/**
	 * Get all current failures (for debugging)
	 */
	getAllFailures(): Map<string, FailedAttempt> {
		this.cleanup();
		return new Map(this.failures);
	}
}

// Export singleton instance
export const captchaTracker = new CaptchaTracker();
