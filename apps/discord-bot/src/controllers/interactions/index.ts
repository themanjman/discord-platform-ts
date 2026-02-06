/**
 * Aggregates and exports all interaction controller classes for the Discord bot.
 *
 * This module centralizes the import, aggregation, and export of all classes
 * handling Discord interaction events (buttons, select menus, modals, autocomplete).
 * Controllers listed here are automatically registered and managed by the bot framework,
 * ensuring discoverability and modularity throughout the interaction infrastructure.
 *
 * @module controllers/interactions
 * @see InteractionController
 */

import type { InteractionController } from '@/base';

/**
 * Re-exports all individual interaction controllers for advanced usage and direct imports.
 * Add exports here as you create new interaction controllers.
 */

/**
 * Readonly array of all interaction controller classes eligible for bot registration.
 *
 * Controllers included in this array are instantiated and registered with the
 * InteractionControllerRegistry at startup. To introduce a new interaction controller,
 * implement a controller class extending InteractionController and append its class to this collection.
 *
 * @type {ReadonlyArray<new (...args: any[]) => InteractionController>}
 */
export const interactionControllers: ReadonlyArray<new (...args: any[]) => InteractionController> = [
	// Add interaction controllers here
];

