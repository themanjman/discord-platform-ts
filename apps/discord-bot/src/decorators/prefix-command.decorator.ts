import 'reflect-metadata';

import { container } from 'tsyringe';
import {
	PREFIX_COMMAND_METADATA_KEY,
	type PrefixCommandMetadata,
	type PrefixCommandOptions,
} from '@/types';
import { LoggerService } from '@/services';

/**
 * Class decorator that registers a Discord bot prefix (text-based) command controller.
 *
 * When applied, this decorator associates the target controller class with metadata describing the
 * command's invocation string, aliases, and options. Prefix commands are triggered when a Discord
 * message begins with the configured command prefix followed by the specified name or alias.
 * 
 * The decorated class must implement an `execute` method to handle command logic at runtime.
 * Metadata is stored programmatically and can be inspected for router registration and command discovery.
 * 
 * Wherever possible, diagnostic logging is performed at decoration time to assist development and tracing,
 * but logging will be silently skipped if the logger is not available at module load.
 *
 * @param options {PrefixCommandOptions} - Configuration object specifying command name, aliases, and other behaviors.
 * @returns {ClassDecorator} A decorator that registers the class as a prefix command controller. 
 */
export function PrefixCommand(options: PrefixCommandOptions): ClassDecorator {
	return function <TFunction extends Function>(target: TFunction): TFunction {
		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Applying @PrefixCommand decorator to ${target.name}`, {
				className: target.name,
				commandName: options.name,
				aliases: options.aliases,
			});
		}
		catch {
			// Logger not available yet, skip logging
		}

		const metadata: PrefixCommandMetadata = {
			methodName: 'execute',
			options,
		};

		Reflect.defineMetadata(PREFIX_COMMAND_METADATA_KEY, metadata, target);

		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Stored prefix command metadata for ${target.name}`, {
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
 * Retrieves prefix command metadata attached to the provided controller class.
 *
 * Inspects the target for associated metadata as applied by the {@link PrefixCommand} decorator,
 * returning details such as the command's invocation name and properties. 
 * If the class is not decorated, returns undefined.
 *
 * @param target {Function} - The controller class to inspect.
 * @returns {PrefixCommandMetadata | undefined} Metadata for the prefix command, or undefined if not present.
 */
export function getPrefixCommandMetadata(
	target: Function,
): PrefixCommandMetadata | undefined {
	return Reflect.getMetadata(PREFIX_COMMAND_METADATA_KEY, target);
}
