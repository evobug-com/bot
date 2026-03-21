/**
 * Returns the list of admin Discord user IDs from the ADMIN_IDS env var.
 */
export function getAdminIds(): string[] {
	const adminIds = process.env.ADMIN_IDS;
	if (!adminIds) return [];
	return adminIds.split(",").map((id) => id.trim());
}

/**
 * Checks if a Discord user ID is in the admin list.
 */
export function isAdmin(userId: string): boolean {
	return getAdminIds().includes(userId);
}
