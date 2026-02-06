import type { ApplicationCommandOptionType } from 'discord.js';

/**
 * Defines a configuration structure for an option within a Discord slash command.
 *
 * Slash command options allow users to specify arguments when invoking commands,
 * supporting multiple input types such as strings, numbers, users, channels, or roles.
 *
 * @property name        The name of the option (lowercase, no spaces, 1-32 characters).
 * @property description The human-readable explanation of the option (1-100 characters).
 * @property type        The option type, as defined by Discord's {@link ApplicationCommandOptionType}.
 * @property required    Whether the option must be provided by the user to execute the command (defaults to false).
 * @property choices     Optional fixed set of accepted values (for string/integer/number types).
 * @property minValue    Optional minimum allowed value (for number/integer types).
 * @property maxValue    Optional maximum allowed value (for number/integer types).
 * @property minLength   Optional minimum number of characters (for string types).
 * @property maxLength   Optional maximum number of characters (for string types).
 */
export interface SlashCommandOptionConfig {
	readonly name: string;
	readonly description: string;
	readonly type: ApplicationCommandOptionType;
	readonly required?: boolean;
	readonly choices?: ReadonlyArray<{
		readonly name: string;
		readonly value: string | number;
	}>;
	readonly minValue?: number;
	readonly maxValue?: number;
	readonly minLength?: number;
	readonly maxLength?: number;
}

/**
 * Declares configuration options for registering a Discord slash command via the decorator.
 *
 * These options govern how a command appears in the Discord UI and how it is invoked and structured in the framework.
 * The command must include a name and description, and can define one or more options/arguments for user input.
 *
 * @property name        Unique command identifier (lowercase, no spaces, 1-32 characters).
 * @property description The command's visible description in Discord (1-100 characters).
 * @property options     Optional ordered list of input options (parameters) that users can supply.
 * @property guildOnly   If true, restricts the command registration to a single Discord guild.
 *                      If false or omitted, registers the command globally.
 * @property defaultMemberPermissions Optional permission flags that restrict who can see and use this command.
 *                      Uses Discord's PermissionFlagsBits. If set, only users with these permissions can see the command.
 *                      Can be a single permission flag, combination of flags (using bitwise OR), or null to allow everyone.
 */
export interface SlashCommandOptions {
	readonly name: string;
	readonly description: string;
	readonly options?: ReadonlyArray<SlashCommandOptionConfig>;
	readonly guildOnly?: boolean;
	readonly defaultMemberPermissions?: string | bigint | null;
}

/**
 * Represents the metadata contract stored by the framework for each method decorated as a slash command.
 *
 * Internal use: Allows auto-discovery, validation, and registration of slash commands using reflection.
 *
 * @property methodName  The name of the class method decorated with @SlashCommand.
 * @property options     The associated configuration object specifying how the command should be registered.
 */
export interface SlashCommandMetadata {
	readonly methodName: string;
	readonly options: SlashCommandOptions;
}

/**
 * Unique symbol used as a metadata key for attaching slash command metadata to classes and methods.
 * 
 * Ensures safe, collision-free reflection-based registration and retrieval of slash command details.
 */
export const SLASH_COMMAND_METADATA_KEY = Symbol('slash-command:metadata');
