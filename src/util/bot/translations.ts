type TranslationKey = keyof typeof translations.en;
type TranslationParams = Record<string, string | number>;

const translations = {
	en: {
		// Common
		error_occurred: "An error occurred: {{error}}",
		cooldown_active: "You are on cooldown! Please wait {{time}}.",
		user_not_found: "User not found. Please register first using /register.",
		command_disabled: "This command is temporarily disabled.",

		// Daily Command
		daily_claimed: "Daily Reward Claimed!",
		daily_description: "You have successfully claimed your daily reward!",
		daily_xp_earned: "XP Earned",
		daily_coins_earned: "Coins Earned",
		daily_streak: "Current Streak",
		daily_total_xp: "Total XP",
		daily_total_coins: "Total Coins",
		daily_current_level: "Current Level",
		daily_progress: "Level Progress",
		daily_next_claim: "Next claim available",

		// Work Command
		work_completed: "Work Completed!",
		work_description: "You have successfully completed your work!",
		work_xp_earned: "XP Earned",
		work_coins_earned: "Coins Earned",
		work_total_xp: "Total XP",
		work_total_coins: "Total Coins",
		work_current_level: "Current Level",
		work_progress: "Level Progress",
		work_next_work: "Next work available",

		// Top Command
		top_title: "Top {{metric}} Leaderboard",
		top_no_users: "No users found for this leaderboard.",
		top_rank: "Rank",
		top_user: "User",
		top_value: "Value",

		// Level Up
		level_up_title: "Level Up!",
		level_up_description: "{{message}}\nBonus coins earned: {{coins}}",

		// Admin Commands
		admin_streak_set: "Successfully set daily streak to {{value}} for user.",
		admin_recovery_success: "Recovery successful: {{message}}",
		admin_recovery_failed: "Recovery failed: {{message}}",
		admin_permission_denied: "You do not have permission to use this command.",

		// Registration
		register_success: "Registration successful! Welcome {{username}}!",
		register_already_exists: "You are already registered!",
		register_error: "Failed to register. Please try again later.",

		// Verification
		verify_error: "Verification failed. Please try again.",

		// Time formatting
		time_seconds: "{{count}} seconds",
		time_minutes: "{{count}} minutes",
		time_hours: "{{count}} hours",
		time_tomorrow: "tomorrow",
		time_in: "in {{time}}",
	},

	cs: {
		// Common
		error_occurred: "Nastala chyba: {{error}}",
		cooldown_active: "Jste na cooldownu! Prosím počkejte {{time}}.",
		user_not_found: "Uživatel nenalezen. Nejprve se prosím zaregistrujte pomocí /register.",
		command_disabled: "Tento příkaz je dočasně zakázán.",

		// Daily Command
		daily_claimed: "Denní odměna získána!",
		daily_description: "Úspěšně jste získali svou denní odměnu!",
		daily_xp_earned: "Získané XP",
		daily_coins_earned: "Získané mince",
		daily_streak: "Aktuální série",
		daily_total_xp: "Celkové XP",
		daily_total_coins: "Celkové mince",
		daily_current_level: "Aktuální úroveň",
		daily_progress: "Postup úrovně",
		daily_next_claim: "Další odměna dostupná",

		// Work Command
		work_completed: "Práce dokončena!",
		work_description: "Úspěšně jste dokončili svou práci!",
		work_xp_earned: "Získané XP",
		work_coins_earned: "Získané mince",
		work_total_xp: "Celkové XP",
		work_total_coins: "Celkové mince",
		work_current_level: "Aktuální úroveň",
		work_progress: "Postup úrovně",
		work_next_work: "Další práce dostupná",

		// Top Command
		top_title: "Top {{metric}} žebříček",
		top_no_users: "Pro tento žebříček nebyli nalezeni žádní uživatelé.",
		top_rank: "Pořadí",
		top_user: "Uživatel",
		top_value: "Hodnota",

		// Level Up
		level_up_title: "Nová úroveň!",
		level_up_description: "{{message}}\nBonusové mince získány: {{coins}}",

		// Admin Commands
		admin_streak_set: "Úspěšně nastavena denní série na {{value}} pro uživatele.",
		admin_recovery_success: "Obnova úspěšná: {{message}}",
		admin_recovery_failed: "Obnova selhala: {{message}}",
		admin_permission_denied: "Nemáte oprávnění používat tento příkaz.",

		// Registration
		register_success: "Registrace úspěšná! Vítejte {{username}}!",
		register_already_exists: "Již jste zaregistrováni!",
		register_error: "Registrace selhala. Zkuste to prosím později.",

		// Verification
		verify_error: "Ověření selhalo. Zkuste to prosím znovu.",

		// Time formatting
		time_seconds: "{{count}} sekund",
		time_minutes: "{{count}} minut",
		time_hours: "{{count}} hodin",
		time_tomorrow: "zítra",
		time_in: "za {{time}}",
	},
};

export function t(key: TranslationKey, params?: TranslationParams): string {
	const language = "cs" as keyof typeof translations;
	const languageTranslations = translations[language] || translations.en;
	const translation = languageTranslations[key] || translations.en[key] || key;

	if (!params) {
		return translation;
	}

	// Replace placeholders with actual values
	return Object.entries(params).reduce((text, [key, value]) => {
		return text.replace(new RegExp(`{{${key}}}`, "g"), String(value));
	}, translation);
}
