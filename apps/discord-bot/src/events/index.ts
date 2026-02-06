/**
 * @module events
 * 
 * Exports event handler entry points for the Discord bot framework.
 * 
 * This module centralizes all high-level event handler exports, facilitating
 * organized event-driven architecture within the bot. It provides unified access
 * points for handlers such as message, interaction, and ready events, enabling modularity and
 * maintainability in event processing pipelines.
 * 
 * - All event handlers should be exported from this module.
 * - Promotes strong typing and discoverability for events across the codebase.
 * - Ensures that only public, intended handlers are exposed for framework consumption.
 */

export { InteractionEventHandler } from './interaction.event';
export { MessageEventHandler } from './message.event';
export { ReadyEventHandler } from './ready.event';
