/**
 * Represents the context in which a command may be executed, determining its permission restriction.
 *
 * @remarks
 * - 'guild' restricts command usage to Discord servers (guilds).
 * - 'dm' restricts command usage to direct messages.
 *
 * Used by permission decorators to control command availability.
 */
export type PermissionType = 'guild' | 'dm';

/**
 * Encapsulates metadata captured by permission decorators for permission-restricted handlers.
 *
 * @property type        The permission context required for the decorated handler. Specifies whether
 *                       execution is permitted only in guilds or only in direct messages (see {@link PermissionType}).
 * @property methodName  The exact name of the class method to which the decorator was applied.
 *
 * @remarks
 * Registered internally by the framework for context checking and validation during command dispatch.
 * Not intended for direct user construction.
 */
export interface PermissionMetadata {
	readonly type: PermissionType;
	readonly methodName: string;
}

/**
 * Unique symbol serving as the metadata key for associating {@link PermissionMetadata}
 * with class definitions in the framework's internal reflection system.
 *
 * @remarks
 * Ensures metadata is isolated and does not collide with userland keys.
 */
export const PERMISSION_METADATA_KEY = Symbol('permission:metadata');

/**
 * Encapsulates metadata for role-based command restrictions.
 *
 * @property roleIds     Array of Discord role IDs that are allowed to execute the command.
 *                      Uses OR logic: the user must have ANY of the specified roles.
 * @property methodName  The exact name of the class method to which the decorator was applied.
 * @property errorMessage Optional custom error message to display when the user lacks required roles.
 *                      If not provided, a generic message will be used.
 *
 * @remarks
 * Registered internally by the framework for role checking during command dispatch.
 * Not intended for direct user construction.
 */
export interface RoleMetadata {
	readonly roleIds: readonly string[];
	readonly methodName: string;
	readonly errorMessage?: string;
}

/**
 * Unique symbol serving as the metadata key for associating {@link RoleMetadata}
 * with class definitions in the framework's internal reflection system.
 *
 * @remarks
 * Ensures metadata is isolated and does not collide with userland keys.
 */
export const ROLE_METADATA_KEY = Symbol('role:metadata');
