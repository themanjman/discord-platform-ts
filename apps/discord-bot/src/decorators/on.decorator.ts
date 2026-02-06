import 'reflect-metadata';

import { container } from 'tsyringe';
import type { Events } from 'discord.js';

import {
	EVENT_METADATA_KEY,
	type EventHandlerMetadata,
	type EventMetadata,
} from '@/types';
import { LoggerService } from '@/services';

/**
 * Method decorator that designates the decorated method as a persistent event listener for a specific Discord.js event.
 *
 * This decorator should be applied to a method inside a controller or service class to automatically register it
 * as a handler for the provided Discord.js event. The decorated method will be subscribed as a recurring listener and invoked
 * upon every emission of the targeted event by the Discord client.
 *
 * The decorator registers relevant handler metadata for runtime discovery, supporting automatic event binding at initialization.
 * Logging is performed for metadata registration when possible for diagnostic tracing.
 *
 * @param event The Discord.js event name (as a key of the Events type) that this method should handle.
 * @returns A decorator for use on class methods that handles the specified event.
 *
 * @throws {Error} If the decorator is applied to a property that is not a string method name.
 */
export function On(event: keyof typeof Events): MethodDecorator {
	return function(
		target: Object,
		propertyKey: string | symbol,
		_descriptor: PropertyDescriptor,
	): void {
		if (typeof propertyKey !== 'string') {
			throw new Error('Property key must be a string');
		}

		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Applying @On decorator to ${target.constructor.name}.${propertyKey}`, {
				className: target.constructor.name,
				methodName: propertyKey,
				event,
			});
		}
		catch {
			// Logger service may not be ready at decorator application time; skip logging if so.
		}

		const metadata: EventMetadata = {
			event,
			once: false,
		};

		const handlerMetadata: EventHandlerMetadata = {
			methodName: propertyKey,
			metadata,
		};

		const existingEvents: EventHandlerMetadata[] =
			Reflect.getMetadata(EVENT_METADATA_KEY, target.constructor) ?? [];

		Reflect.defineMetadata(
			EVENT_METADATA_KEY,
			[...existingEvents, handlerMetadata],
			target.constructor,
		);
	};
}
