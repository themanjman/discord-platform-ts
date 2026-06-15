import type { Guild, GuildMember } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';

/**
 * Returns true when the member is the guild owner.
 */
export function isGuildOwner(member: GuildMember, guild: Guild): boolean {
	return member.id === guild.ownerId;
}

/**
 * Returns true when the member has the Administrator permission.
 */
export function hasAdministrator(member: GuildMember): boolean {
	return member.permissions.has(PermissionFlagsBits.Administrator);
}
