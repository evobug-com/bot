/**
 * In-memory tracker for captcha failures
 * Tracks users who recently failed captcha to ensure they get another one
 */

interface FailedAttempt {
	userId: string;
	failedAt: Date;
	attempts: number;
}

class CaptchaFailureTracker {
	private failures = new Map<string, FailedAttempt>();
	private readonly FAILURE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
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
				attempts: 1
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
	 * Clean up expired entries
	 */
	private cleanup(): void {
		const now = Date.now();

		for (const [userId, failure] of this.failures.entries()) {
			if (now - failure.failedAt.getTime() > this.FAILURE_EXPIRY_MS) {
				this.failures.delete(userId);
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
export const captchaTracker = new CaptchaFailureTracker();