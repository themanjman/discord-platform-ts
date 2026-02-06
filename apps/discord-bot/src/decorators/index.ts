/**
 * Central index for all custom decorators used within the Discord bot framework.
 *
 * Provides unified exports for command, permission, interaction, and event decorators to facilitate
 * concise and organized decorator imports throughout the application source code.
 * 
 * - Command decorators annotate and register handler classes for both slash and prefix commands.
 * - Interaction decorators annotate and register handler classes for button, select menu, modal, and autocomplete interactions.
 * - Permission decorators restrict command execution context to Discord guilds or direct messages.
 * - Event decorators enable method-level registration for handling Discord client events.
 * 
 * @module decorators
 */

// Command-related decorators for registering slash and prefix command handlers.
export { SlashCommand, getSlashCommandMetadata } from './slash-command.decorator';
export { PrefixCommand, getPrefixCommandMetadata } from './prefix-command.decorator';

// Interaction decorator for registering interaction handlers (buttons, select menus, modals, autocomplete).
export { Interaction, getInteractionMetadata, matchCustomIdPattern } from './interaction.decorator';

// Decorators for enforcing permission and context restrictions on commands.
export { Guild, isGuildOnly } from './guild.decorator';
export { DM, isDMOnly } from './dm.decorator';
export { RequireRole, getRoleMetadata, hasRoleRestrictions } from './role.decorator';

// Event handler decorator for subscribing methods to Discord client events.
export { On } from './on.decorator';
