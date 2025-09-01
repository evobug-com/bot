/** biome-ignore-all lint/complexity/noStaticOnlyClass: This is a manager class with static methods */
import type { Guild, GuildMember, Role } from "discord.js";
import { DISCORD_ROLES, getRoleByConfig, reportError } from "../config/roles.js";

export class RoleManager {
	private static roleCache = new Map<string, string>(); // roleKey -> actualRoleId

	/**
	 * Get a role with automatic fallback and error reporting
	 */
	static async getRole(guild: Guild, roleKey: keyof typeof DISCORD_ROLES): Promise<Role | null> {
		const roleConfig = DISCORD_ROLES[roleKey];
		const cacheKey = `${guild.id}-${roleKey}`;

		// Check cache first
		const cachedId = RoleManager.roleCache.get(cacheKey);
		if (cachedId) {
			const role = guild.roles.cache.get(cachedId);
			if (role) return role;
		}

		const result = await getRoleByConfig(guild, roleConfig);

		if (!result) {
			await reportError(guild, "Role Not Found", `Role "${roleConfig.name}" (${roleKey}) not found in guild`, {
				expectedId: roleConfig.id,
				roleName: roleConfig.name,
			});
			return null;
		}

		// Update cache
		RoleManager.roleCache.set(cacheKey, result.role.id);

		// Report if ID changed
		if (result.updated) {
			await reportError(guild, "Role ID Changed", `Role "${roleConfig.name}" has a different ID than expected`, {
				expectedId: roleConfig.id,
				actualId: result.role.id,
				roleName: roleConfig.name,
				action: "Please update the role configuration",
			});
		}

		return result.role;
	}

	/**
	 * Add a role to a member with error handling
	 */
	static async addRole(member: GuildMember, roleKey: keyof typeof DISCORD_ROLES): Promise<boolean> {
		try {
			const role = await RoleManager.getRole(member.guild, roleKey);
			if (!role) {
				throw new Error(`Role ${roleKey} not found`);
			}

			await member.roles.add(role);
			return true;
		} catch (error) {
			const roleConfig = DISCORD_ROLES[roleKey];
			await reportError(
				member.guild,
				"Failed to Add Role",
				`Could not add role "${roleConfig.name}" to user ${member.user.tag}`,
				{
					userId: member.id,
					roleKey,
					error: error,
				},
			);
			return false;
		}
	}

	/**
	 * Remove a role from a member with error handling
	 */
	static async removeRole(member: GuildMember, roleKey: keyof typeof DISCORD_ROLES): Promise<boolean> {
		try {
			const role = await RoleManager.getRole(member.guild, roleKey);
			if (!role) {
				throw new Error(`Role ${roleKey} not found`);
			}

			await member.roles.remove(role);
			return true;
		} catch (error) {
			const roleConfig = DISCORD_ROLES[roleKey];
			await reportError(
				member.guild,
				"Failed to Remove Role",
				`Could not remove role "${roleConfig.name}" from user ${member.user.tag}`,
				{
					userId: member.id,
					roleKey,
					error: error instanceof Error ? error.message : String(error),
				},
			);
			return false;
		}
	}

	/**
	 * Check if a member has a role
	 */
	static async hasRole(member: GuildMember, roleKey: keyof typeof DISCORD_ROLES): Promise<boolean> {
		const role = await RoleManager.getRole(member.guild, roleKey);
		if (!role) return false;

		return member.roles.cache.has(role.id);
	}
}
