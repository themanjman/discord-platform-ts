/**
 * Centralized export module for all Discord bot controllers.
 *
 * Provides named and grouped exports for all controller classes and registration arrays.
 * This facilitates unified controller management, clear namespace separation, and automated
 * registration for both slash (/) and prefix (!) command handlers. Namespacing is enforced
 * on potentially conflicting controller names to maintain clarity and prevent import ambiguity.
 *
 * @module controllers
 * @see {@link ./slash} for slash command controllers and registration array.
 * @see {@link ./prefix} for prefix command controllers and registration array.
 * @see {@link ./interactions} for interaction controller classes and registration array.
 */

// Export the arrays that contain all registers for slash, prefix, and interaction controllers.
export { slashControllers } from './slash';
export { prefixControllers } from './prefix';
export { interactionControllers } from './interactions';