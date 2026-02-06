/**
 * @module base
 * @description
 * Provides abstract base classes for Discord bot controllers.
 *
 * Exports core controller base classes that establish a consistent interface for
 * implementing slash commands, prefix commands, and interaction handlers. These base
 * classes serve as the foundation for all bot controllers, enforcing type safety and
 * clear patterns for extension and customization.
 *
 * @exports SlashController
 * @exports PrefixController
 * @exports InteractionController
 */
export { InteractionController } from './interaction.controller';
export { PrefixController } from './prefix.controller';
export { SlashController } from './slash.controller';
