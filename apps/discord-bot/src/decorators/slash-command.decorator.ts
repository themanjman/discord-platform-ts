import 'reflect-metadata';

import { container } from 'tsyringe';
import {
	SLASH_COMMAND_METADATA_KEY,
	type SlashCommandMetadata,
	type SlashCommandOptions,
} from '@/types';
import { LoggerService } from '@/services';

/**
 * Class decorator for registering a Discord slash command controller.
 *
 * Applying this decorator to a class attaches metadata that defines the class as a Discord slash command,
 * configured with the provided options (such as command name, description, and options array).
 * The decorated class should implement an `execute` method for command handling at runtime.
 *
 * During application, the decorator attempts to log its registration using the logger service (if available).
 * Metadata is stored using the Reflect API for runtime discovery and registration when the bot initializes.
 *
 * @param options SlashCommandOptions object describing the command properties.
 * @returns A class decorator that registers the target as a slash command controller.
 */
export function SlashCommand(options: SlashCommandOptions): ClassDecorator {
	return function <TFunction extends Function>(target: TFunction): TFunction {
		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Applying @SlashCommand decorator to ${target.name}`, {
				className: target.name,
				commandName: options.name,
				optionCount: options.options?.length || 0,
			});
		}
		catch {
			// Logger not available yet, skip logging
		}

		const metadata: SlashCommandMetadata = {
			methodName: 'execute',
			options,
		};

		Reflect.defineMetadata(SLASH_COMMAND_METADATA_KEY, metadata, target);

		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Stored slash command metadata for ${target.name}`, {
				className: target.name,
				commandName: options.name,
			});
		}
		catch {
			// Logger not available yet, skip logging
		}

		return target;
	};
}

/**
 * Retrieves the slash command metadata associated with a decorated class.
 *
 * This function inspects the given class for slash command metadata, as set by the {@link SlashCommand} decorator.
 * If the class is a registered slash command controller, the stored metadata is returned.
 *
 * @param target The constructor of the class to inspect.
 * @returns The associated SlashCommandMetadata, or undefined if not present.
 */
export function getSlashCommandMetadata(
	target: Function,
): SlashCommandMetadata | undefined {
	return Reflect.getMetadata(SLASH_COMMAND_METADATA_KEY, target);
}

