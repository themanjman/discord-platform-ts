/**
 * Aggregates and exports all slash command controller classes for the Discord bot.
 *
 * This module centralizes the import, aggregation, and export of all classes
 * handling Discord slash (/) command interactions. Controllers listed here are
 * automatically registered and managed by the bot framework, ensuring discoverability
 * and modularity throughout the command infrastructure.
 *
 * @module controllers/slash
 * @see SlashController
 */

import type { SlashController } from '@/base';
import { HelpController } from './help.controller';
import { InfoController } from './info.controller';

/**
 * Re-exports all individual slash command controllers for advanced usage and direct imports.
 */
export { HelpController } from './help.controller';
export { InfoController } from './info.controller';

/**
 * Readonly array of all slash command controller classes eligible for bot registration.
 *
 * Controllers included in this array are instantiated and registered with the Discord
 * application interface at startup. To introduce a new slash command, implement a controller
 * and append its class to this collection.
 *
 * @type {ReadonlyArray<new (...args: any[]) => SlashController>}
 */
export const slashControllers: ReadonlyArray<new (...args: any[]) => SlashController> = [
	HelpController,
	InfoController,
];
