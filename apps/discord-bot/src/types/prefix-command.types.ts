/**
 * Defines the configuration structure for text-based prefix commands in the framework.
 *
 * Used by the {@link PrefixCommand} decorator to specify how a command is invoked,
 * provide alternate names, and document its purpose within help systems.
 *
 * @property name         The main identifier for the prefix command. This triggers the command when used after the prefix.
 * @property aliases      Optional set of alternative names for triggering the command.
 * @property description  Optional human-readable explanation of the command, may be used in documentation or help output.
 */
export interface PrefixCommandOptions {
	/**
	 * The main trigger word for the prefix command.
	 */
	readonly name: string;

	/**
	 * Optional alternative trigger phrases for this command.
	 */
	readonly aliases?: ReadonlyArray<string>;

	/**
	 * Optional description of what the command does.
	 */
	readonly description?: string;
}

/**
 * Captures complete metadata for a method decorated via {@link PrefixCommand}.
 *
 * Registers both the handler method's identifier and its associated options for internal frameworks,
 * enabling auto-discovery, reflection, and user documentation.
 *
 * @property methodName  The exact method name within the controller class decorated as a prefix command.
 * @property options     The configuration struct detailing command triggers and description.
 */
export interface PrefixCommandMetadata {
	/**
	 * The name of the class method decorated with @PrefixCommand.
	 */
	readonly methodName: string;

	/**
	 * The configuration options used to set up the prefix command.
	 */
	readonly options: PrefixCommandOptions;
}

/**
 * Unique symbol serving as the metadata key for identifying prefix command registrations within
 * the reflection and registry subsystems. Ensures collision-free storage when applying decorators.
 */
export const PREFIX_COMMAND_METADATA_KEY = Symbol('prefix-command:metadata');
