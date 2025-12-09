/**
 * Bot-side anti-cheat handler
 * Interfaces with the API anti-cheat system to check users before allowing economy commands
 */

import type { ChatInputCommandInteraction } from "discord.js";
import { orpc } from "../client/client.ts";
import { captchaTracker } from "./captcha-tracker.ts";
import { generateCaptcha, getCaptchaDifficulty, presentCaptcha } from "./captcha.ts";

export interface AntiCheatCheckResult {
	allowed: boolean;
	action: "none" | "monitor" | "rate_limit" | "captcha" | "restrict";
	message?: string;
	requiresCaptcha: boolean;
	captchaType?: "button" | "image";
	rateLimitMultiplier?: number;
	suspicionScore: number;
	trustScore: number;
}

export interface CommandExecutionContext {
	userId: number;
	guildId: string;
	commandName: "work" | "daily";
	interaction: ChatInputCommandInteraction;
}

/**
 * Check user before allowing command execution
 * This is the main entry point for anti-cheat checks
 */
export async function checkUserBeforeCommand(
	context: CommandExecutionContext,
): Promise<AntiCheatCheckResult> {
	const { userId, guildId, commandName } = context;

	// Check if anti-cheat endpoints are available (they won't be in test environments)
	try {
		// Record command attempt (this triggers async analysis in the background)
		const [recordError] = await orpc.users.anticheat.command.record({
			userId,
			guildId,
			commandName,
			success: false, // Will be updated to true after successful execution
		});

		if (recordError) {
			console.error("[ANTICHEAT] Error recording command execution:", recordError);
			// Don't block the user if recording fails - fail open
		}

		// Get enforcement action from API
		const [enforcementError, enforcementData] = await orpc.users.anticheat.enforcement.get({
			userId,
			guildId,
		});

		if (enforcementError) {
			console.error("[ANTICHEAT] Error getting enforcement action:", enforcementError);
			// Fail open - allow the command if we can't get enforcement data
			return {
				allowed: true,
				action: "none",
				requiresCaptcha: false,
				suspicionScore: 0,
				trustScore: 500,
			};
		}

		// Process enforcement action
		const result: AntiCheatCheckResult = {
			allowed: false,
			action: enforcementData.action,
			message: enforcementData.message,
			requiresCaptcha: enforcementData.action === "captcha",
			captchaType: enforcementData.captchaType,
			rateLimitMultiplier: enforcementData.rateLimitMultiplier,
			suspicionScore: enforcementData.suspicionScore,
			trustScore: enforcementData.trustScore,
		};

		// Handle each enforcement action
		switch (enforcementData.action) {
			case "none":
				result.allowed = true;
				break;

			case "monitor":
				// Enhanced monitoring - just log, don't block
				console.log(
					`[ANTICHEAT] Enhanced monitoring enabled for user ${userId} (score: ${enforcementData.suspicionScore})`,
				);
				result.allowed = true;
				break;

			case "rate_limit":
				// Soft rate limit - reduce their limits but still allow
				console.log(
					`[ANTICHEAT] Rate limit applied for user ${userId} (multiplier: ${enforcementData.rateLimitMultiplier})`,
				);
				result.allowed = true;
				break;

			case "captcha":
				// Require captcha verification
				result.allowed = false;
				result.requiresCaptcha = true;
				break;

			case "restrict":
				// Block completely
				result.allowed = false;
				break;
		}

		return result;
	} catch {
		// Anti-cheat system not available - fail open
		console.warn("[ANTICHEAT] Anti-cheat system not available, allowing command");
		return {
			allowed: true,
			action: "none",
			requiresCaptcha: false,
			suspicionScore: 0,
			trustScore: 500,
		};
	}
}

/**
 * Enforce the anti-cheat action (show captcha, apply restrictions, etc.)
 * Returns true if user passed verification, false otherwise
 */
export async function enforceAntiCheatAction(
	context: CommandExecutionContext,
	checkResult: AntiCheatCheckResult,
): Promise<boolean> {
	const { interaction, userId } = context;

	// If no action needed, return success
	if (checkResult.action === "none" || checkResult.action === "monitor" || checkResult.action === "rate_limit") {
		return true;
	}

	// Handle captcha requirement
	if (checkResult.requiresCaptcha && checkResult.captchaType) {
		const difficulty = getCaptchaDifficulty(checkResult.suspicionScore);
		const captcha = generateCaptcha(difficulty);
		const captchaResult = await presentCaptcha(interaction, captcha);

		// Log captcha attempt
		const [logError] = await orpc.users.stats.captcha.log({
			userId,
			captchaType: captcha.type,
			success: captchaResult.success,
			responseTime: captchaResult.responseTime,
			command: context.commandName,
			triggerReason: `anticheat_${checkResult.action}`,
			suspiciousScore: checkResult.suspicionScore,
			claimCount: 0, // Not applicable for anticheat-triggered captchas
			difficulty,
		});

		if (logError) {
			console.error("[ANTICHEAT] Error logging captcha:", logError);
		}

		if (!captchaResult.success) {
			// Record failure
			captchaTracker.recordFailure(interaction.user.id);
			await orpc.users.stats.captcha.failedCount.update({ userId });

			// Update trust score (negative)
			await orpc.users.anticheat.trust.update({
				userId,
				guildId: context.guildId,
				delta: -10,
				reason: "Failed captcha verification",
			});

			return false;
		}

		// Captcha passed - clear failure tracking and increase trust
		captchaTracker.clearFailure(interaction.user.id);
		await orpc.users.anticheat.trust.update({
			userId,
			guildId: context.guildId,
			delta: +5,
			reason: "Passed captcha verification",
		});

		return true;
	}

	// Handle restriction
	if (checkResult.action === "restrict") {
		// User is restricted - don't allow
		return false;
	}

	// Default: allow
	return true;
}

/**
 * Record successful command completion
 * Updates trust score and marks command as successful
 */
export async function recordCommandCompletion(context: CommandExecutionContext): Promise<void> {
	try {
		const { userId, guildId, commandName } = context;

		// Update command as successful
		await orpc.users.anticheat.command.record({
			userId,
			guildId,
			commandName,
			success: true,
		});

		// Reward good behavior with small trust score increase
		await orpc.users.anticheat.trust.update({
			userId,
			guildId,
			delta: +1,
			reason: `Successful ${commandName} command`,
		});
	} catch {
		// Silently fail if anti-cheat not available
		// This is expected in test environments
	}
}

/**
 * Complete anti-cheat flow for a command
 * Returns true if command should proceed, false if it should be blocked
 */
export async function executeWithAntiCheat(
	context: CommandExecutionContext,
	commandExecutor: () => Promise<void>,
): Promise<void> {
	// 1. Check user before command
	const checkResult = await checkUserBeforeCommand(context);

	// 2. Enforce anti-cheat action (captcha, restrict, etc.)
	const canProceed = await enforceAntiCheatAction(context, checkResult);

	if (!canProceed) {
		// User failed verification or is restricted
		return;
	}

	try {
		// 3. Execute the actual command
		await commandExecutor();

		// 4. Record successful completion
		await recordCommandCompletion(context);
	} catch (error) {
		console.error(`[ANTICHEAT] Error executing command ${context.commandName}:`, error);
		// Don't record as successful
	}
}
