/**
 * Prefix command controller module.
 *
 * This module consolidates all prefix-based command controllers, enabling their
 * unified registration and management by the Discord bot framework. Each controller
 * is responsible for handling a particular prefix command and encapsulates all logic
 * and metadata for its corresponding operation. {@link prefixControllers} is an
 * aggregation of all command controller classes intended for automatic registration.
 *
 * @module controllers/prefix
 */

import type { PrefixController } from '@/base';
import { HelpController } from './help.controller';
import { InfoController } from './info.controller';

/**
 * HelpController - Displays a list of all available commands.
 * InfoController - Manages interactive greeting and bot information commands.
 *
 * These exports enable ease of direct import elsewhere for advanced integrations or custom bootstrapping.
 */
export { HelpController } from './help.controller';
export { InfoController } from './info.controller';

/**
 * Collection of all prefix command controller classes to be registered with the bot.
 * Any new prefix command controller should be added to this array to be recognized
 * and instantiated by the framework. Controllers are expected to extend PrefixController.
 *
 * @type {Array<new (...args: any[]) => PrefixController>}
 * @readonly
 */
export const prefixControllers: Array<new (...args: any[]) => PrefixController> = [
	HelpController,
	InfoController,
];
