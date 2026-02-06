import 'reflect-metadata';

import { container } from 'tsyringe';
import { ROLE_METADATA_KEY, type RoleMetadata } from '@/types';
import { LoggerService } from '@/services';

/**
 * Decorator to restrict a command controller class to users with specific Discord role(s).
 *
 * This class decorator enforces that only users possessing at least one of the specified role IDs
 * may execute the associated command. When multiple role IDs are provided, the logic operates as OR:
 * access is permitted if the user holds any of the roles.
 *
 * This restriction is checked at runtime using the user's present role IDs. The decorator can be applied
 * to both slash and prefix command types and attaches role requirements metadata to the target class.
 *
 * During decorator application, if logging is available, a debug statement is emitted to facilitate diagnostics.
 *
 * @param {string | readonly string[]} roleIds - A role ID or an array of role IDs. The user must have at least one.
 * @param {string} [errorMessage] - Optional message returned to users lacking required roles. Falls back to a default if omitted.
 * @returns {ClassDecorator} The decorator function to apply to a controller class.
 */
export function RequireRole(
	roleIds: string | readonly string[],
	errorMessage?: string,
): ClassDecorator {
	return function <TFunction extends Function>(target: TFunction): TFunction {
		try {
			const logger = container.resolve(LoggerService);
			const roleArray = Array.isArray(roleIds) ? roleIds : [roleIds];
			logger.debug('Decorator', `Applying @RequireRole decorator to ${target.name}`, {
				className: target.name,
				roleIds: roleArray,
				hasCustomMessage: !!errorMessage,
			});
		}
		catch {
			// Logger not available at decorator application time
		}

		const roleArray = Array.isArray(roleIds) ? roleIds : [roleIds];
		const metadata: RoleMetadata = {
			roleIds: roleArray,
			methodName: 'execute',
			errorMessage,
		};

		const existingRoles: RoleMetadata[] =
			Reflect.getMetadata(ROLE_METADATA_KEY, target) ?? [];

		Reflect.defineMetadata(
			ROLE_METADATA_KEY,
			[...existingRoles, metadata],
			target,
		);

		return target;
	};
}

/**
 * Obtain all role-based restriction metadata associated with a decorated command class.
 *
 * Inspects the target constructor for metadata set by the {@link RequireRole} decorator. Any stored
 * role requirement information for the given class will be returned.
 *
 * @param {Function} target - The class constructor to inspect for role metadata.
 * @returns {RoleMetadata[] | undefined} Array of role metadata objects if present, undefined otherwise.
 */
export function getRoleMetadata(
	target: Function,
): RoleMetadata[] | undefined {
	return Reflect.getMetadata(ROLE_METADATA_KEY, target);
}

/**
 * Check if a controller class is protected by at least one role restriction via the @RequireRole decorator.
 *
 * Determines if the class contains any metadata indicating the presence of required role(s). This function is commonly used
 * to programmatically guard command execution based on user roles.
 *
 * @param {Function} target - The class to check for existing role restrictions.
 * @returns {boolean} True if one or more role restrictions are present, false otherwise.
 */
export function hasRoleRestrictions(target: Function): boolean {
	const roles = getRoleMetadata(target);
	return roles !== undefined && roles.length > 0;
}

