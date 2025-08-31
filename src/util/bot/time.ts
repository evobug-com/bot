import { t } from "./translations.js";

export interface TimeTranslations {
	time_seconds: (count: number) => string;
	time_minutes: (count: number) => string;
	time_hours: (count: number) => string;
	time_tomorrow: string;
	time_in: (time: string) => string;
}

export function formatCooldown(seconds: number): string {
	if (seconds < 60) {
		return t("time_seconds", { count: Math.ceil(seconds) });
	}

	if (seconds < 3600) {
		return t("time_minutes", { count: Math.ceil(seconds / 60) });
	}

	return t("time_hours", { count: Math.ceil(seconds / 3600) });
}

export function formatCooldownWithTranslations(seconds: number, translations: TimeTranslations): string {
	if (seconds < 60) {
		return translations.time_seconds(Math.ceil(seconds));
	}

	if (seconds < 3600) {
		return translations.time_minutes(Math.ceil(seconds / 60));
	}

	return translations.time_hours(Math.ceil(seconds / 3600));
}

export function formatNextAvailable(cooldownEndTime: string | null): string {
	if (!cooldownEndTime) {
		return t("time_tomorrow");
	}

	const endTime = new Date(cooldownEndTime);
	const now = new Date();
	const diffSeconds = Math.ceil((endTime.getTime() - now.getTime()) / 1000);

	if (diffSeconds <= 0) {
		return "now";
	}

	return t("time_in", { time: formatCooldown(diffSeconds) });
}

export function formatNextAvailableWithTranslations(
	cooldownEndTime: string | null,
	translations: TimeTranslations,
): string {
	if (!cooldownEndTime) {
		return translations.time_tomorrow;
	}

	const endTime = new Date(cooldownEndTime);
	const now = new Date();
	const diffSeconds = Math.ceil((endTime.getTime() - now.getTime()) / 1000);

	if (diffSeconds <= 0) {
		return "now";
	}

	return translations.time_in(formatCooldownWithTranslations(diffSeconds, translations));
}

// Simple version for Czech that takes seconds directly
export function formatNextAvailableSimple(seconds: number): string {
	if (seconds <= 0) {
		return "nyní";
	}

	if (seconds < 60) {
		return `za ${Math.ceil(seconds)} ${seconds === 1 ? "sekundu" : seconds < 5 ? "sekundy" : "sekund"}`;
	}

	if (seconds < 3600) {
		const minutes = Math.ceil(seconds / 60);
		return `za ${minutes} ${minutes === 1 ? "minutu" : minutes < 5 ? "minuty" : "minut"}`;
	}

	const hours = Math.ceil(seconds / 3600);
	return `za ${hours} ${hours === 1 ? "hodinu" : hours < 5 ? "hodiny" : "hodin"}`;
}

// Format time remaining as HHh MMm SSs
export function formatTimeRemaining(seconds: number): string {
	if (seconds <= 0) {
		return "0h 0m 0s";
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	// Build the string with proper formatting
	const parts = [];
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
	parts.push(`${secs}s`);

	return parts.join(" ");
}

export function isValidTimestamp(timestamp: string): boolean {
	const date = new Date(timestamp);
	return !Number.isNaN(date.getTime());
}

export function formatTimestamp(timestamp: string, includeTime = false, locale?: string): string {
	const date = new Date(timestamp);

	if (includeTime) {
		return date.toLocaleString(locale);
	}

	return date.toLocaleDateString(locale);
}

export function getSecondsUntilNextCooldown(cooldownEndTime: string): number {
	const endTime = new Date(cooldownEndTime);
	const now = new Date();
	return Math.max(0, Math.ceil((endTime.getTime() - now.getTime()) / 1000));
}
