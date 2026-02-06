import 'reflect-metadata';

import { container } from 'tsyringe';
import {
	INTERACTION_METADATA_KEY,
	type InteractionMetadata,
	type InteractionOptions,
} from '@/types';
import { LoggerService } from '@/services';

/**
 * Class decorator for registering a Discord interaction controller.
 *
 * Applying this decorator to a class attaches metadata that defines what types
 * of interactions the controller handles, including interaction type and custom ID patterns.
 * The decorated class should extend InteractionController and implement the `handle` method.
 *
 * During application, the decorator attempts to log its registration using the logger service.
 * Metadata is stored using the Reflect API for runtime discovery and registration when the bot initializes.
 *
 * @param options InteractionOptions object describing the interaction handling properties.
 * @returns A class decorator that registers the target as an interaction controller.
 *
 * @example
 * ```typescript
 * @singleton()
 * @Interaction({
 *   type: 'button',
 *   customIdPattern: 'shop:buy:*',
 *   description: 'Handles shop purchase buttons'
 * })
 * export class ShopBuyController extends InteractionController {
 *   async handle(interaction: Interaction): Promise<void> {
 *     // Handle the button click
 *   }
 * }
 * ```
 */
export function Interaction(options: InteractionOptions): ClassDecorator {
	return function <TFunction extends Function>(target: TFunction): TFunction {
		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Applying @Interaction decorator to ${target.name}`, {
				className: target.name,
				type: options.type,
				customIdPattern: options.customIdPattern ?? 'none',
			});
		}
		catch {
			// Logger not available yet, skip logging
		}

		const metadata: InteractionMetadata = {
			methodName: 'handle',
			options,
		};

		Reflect.defineMetadata(INTERACTION_METADATA_KEY, metadata, target);

		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Stored interaction metadata for ${target.name}`, {
				className: target.name,
				type: options.type,
				customIdPattern: options.customIdPattern ?? 'none',
			});
		}
		catch {
			// Logger not available yet, skip logging
		}

		return target;
	};
}

/**
 * Retrieves the interaction metadata associated with a decorated class.
 *
 * This function inspects the given class for interaction metadata, as set by the {@link Interaction} decorator.
 * If the class is a registered interaction controller, the stored metadata is returned.
 *
 * @param target The constructor of the class to inspect.
 * @returns The associated InteractionMetadata, or undefined if not present.
 */
export function getInteractionMetadata(
	target: Function,
): InteractionMetadata | undefined {
	return Reflect.getMetadata(INTERACTION_METADATA_KEY, target);
}

/**
 * Matches a custom ID against a pattern that supports wildcards.
 *
 * Patterns can include '*' as a wildcard that matches any string segment.
 * The matching is performed segment by segment, split by ':'.
 *
 * @param customId The actual custom ID from the interaction.
 * @param pattern The pattern to match against (e.g., 'shop:buy:*').
 * @returns True if the custom ID matches the pattern, false otherwise.
 *
 * @example
 * matchCustomIdPattern('shop:buy:premium-role', 'shop:buy:*') // true
 * matchCustomIdPattern('shop:buy:premium-role', 'shop:*:*') // true
 * matchCustomIdPattern('orders:view:123', 'shop:*') // false
 * matchCustomIdPattern('shop:cancel-order:123', 'shop:cancel*') // true (prefix matching)
 */
export function matchCustomIdPattern(customId: string, pattern: string): boolean {
	const customIdParts = customId.split(':');
	const patternParts = pattern.split(':');

	// If pattern has more parts than customId, it can't match
	if (patternParts.length > customIdParts.length) {
		return false;
	}

	// Check each part
	for (let i = 0; i < patternParts.length; i++) {
		const patternPart = patternParts[i];
		const customIdPart = customIdParts[i];

		// Wildcard matches anything
		if (patternPart === '*') {
			continue;
		}

		// Support prefix matching: pattern ending with * matches if customIdPart starts with the prefix
		if (patternPart.endsWith('*')) {
			const prefix = patternPart.slice(0, -1);
			if (!customIdPart.startsWith(prefix)) {
				return false;
			}
			continue;
		}

		// Exact match required
		if (patternPart !== customIdPart) {
			return false;
		}
	}

	return true;
}

