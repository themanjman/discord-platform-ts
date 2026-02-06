import 'reflect-metadata';

import { container } from 'tsyringe';
import { PERMISSION_METADATA_KEY, type PermissionMetadata } from '@/types';
import { LoggerService } from '@/services';

/**
 * Class decorator that restricts a command controller to execution solely within Discord guild (server) contexts.
 *
 * When applied to a command controller class, this decorator ensures the decorated command is available exclusively 
 * in guild environments and not in direct messages. The decorator is compatible with both slash and prefix command types.
 * 
 * The restriction is enforced at runtime by marking the target class with guild-only permission metadata, 
 * which can be programmatically inspected to control command execution eligibility.
 *
 * Logging is attempted at decorator application for diagnostic purposes, if the logging service is available at load time.
 *
 * @returns {ClassDecorator} A decorator that marks the controller as guild-context only.
 */
export function Guild(): ClassDecorator {
	return function <TFunction extends Function>(target: TFunction): TFunction {
		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Decorator', `Applying @Guild decorator to ${target.name}`, {
				className: target.name,
			});
		}
		catch {
			// Logger not available at this time; decoration proceeds without logging.
		}

		const metadata: PermissionMetadata = {
			type: 'guild',
			methodName: 'execute',
		};

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
 * Determines whether the provided class is restricted to execution in Discord guilds by the @Guild decorator.
 *
 * Inspects permission metadata attached to the class to assert the presence of a guild-only constraint.
 *
 * @param target The controller class to inspect.
 * @returns {boolean} True if the class is decorated with guild-only restriction, otherwise false.
 */
export function isGuildOnly(target: Function): boolean {
	const permissions: PermissionMetadata[] | undefined =
		Reflect.getMetadata(PERMISSION_METADATA_KEY, target);

	return permissions?.some(p => p.type === 'guild') ?? false;
}
