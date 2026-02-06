import 'reflect-metadata';

import { container } from 'tsyringe';
import { PERMISSION_METADATA_KEY, type PermissionMetadata } from '@/types';
import { LoggerService } from '@/services';

/**
 * Class decorator that restricts the application of a command controller to Direct Message (DM) contexts only.
 *
 * When applied to a command controller class (such as those handling slash or prefix commands), this decorator ensures
 * that the decorated command is available exclusively in user-to-bot direct messages and not in Discord guild (server) channels.
 * An attempt to invoke the decorated command from a guild context will be blocked and an error may be surfaced to the user.
 * 
 * The decorator applies a "dm" permission metadata, which can be used by the framework to filter command execution contexts.
 * 
 * This restriction supports both slash and prefix command styles by marking the class with the appropriate permission metadata
 * for runtime checks. Decorators are processed at class definition time, and logger diagnostics may be attempted during decoration.
 * 
 * @returns {ClassDecorator} - A decorator that marks a controller as DM-context only.
 */
export function DM(): ClassDecorator {
	return function <TFunction extends Function>(target: TFunction): TFunction {
		// Attempt to log the application of the decorator at definition time
		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Applying @DM decorator to ${target.name}`, {
				className: target.name,
			});
		}
		catch {
			// Logger not available yet, skip logging
		}

		const metadata: PermissionMetadata = {
			type: 'dm',
			methodName: 'execute',
		};

		// Attach the DM-only permission metadata to the class, preserving any previously applied permissions
		const existingPermissions: PermissionMetadata[] =
			Reflect.getMetadata(PERMISSION_METADATA_KEY, target) ?? [];

		Reflect.defineMetadata(
			PERMISSION_METADATA_KEY,
			[...existingPermissions, metadata],
			target,
		);

		return target;
	};
}

/**
 * Checks if a given controller class has been decorated to restrict execution to Direct Message (DM) contexts.
 *
 * @param target {Function} - The controller class to check for DM-only permission.
 * @returns {boolean} - Returns true if the class has @DM applied, otherwise false.
 */
export function isDMOnly(target: Function): boolean {
	const permissions: PermissionMetadata[] | undefined =
		Reflect.getMetadata(PERMISSION_METADATA_KEY, target);

	return permissions?.some(p => p.type === 'dm') ?? false;
}
