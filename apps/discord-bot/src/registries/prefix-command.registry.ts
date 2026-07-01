import 'reflect-metadata';

import { singleton, container, inject } from 'tsyringe';
import { Collection, Message } from 'discord.js';

import { PrefixController } from '@/base';
import { getPrefixCommandMetadata, getRoleMetadata } from '@/decorators';
import { CommandError, isFrameworkError, isCommandError } from '@/errors';
import { ERROR_CODES } from '@/errors/error-codes';
import { PERMISSION_METADATA_KEY, type PermissionMetadata, type RoleMetadata } from '@/types';
import { LoggerService } from '@/services';
import { BotConfig } from '@/config';

/**
 * Represents a constructor for PrefixController-derived classes.
 */
type PrefixControllerConstructor = new (..._args: unknown[]) => PrefixController;

/**
 * Manages the registration, storage, and execution of prefix (text) commands.
 *
 * This registry provides robust command discovery, context validation, error handling,
 * and logging for all registered prefix command controllers.
 *
 * Commands are discovered by name or alias, and the registry enforces proper context
 * (such as DM/guild restrictions) and error boundaries during execution.
 *
 * Controllers must be decorated with appropriate metadata and registered via the provided APIs.
 */
@singleton()
export class PrefixCommandRegistry {
	/**
	 * Logger for diagnostics and operational events.
	 */
	constructor(
		@inject(LoggerService) private readonly _logger: LoggerService,
		@inject(BotConfig) private readonly _config: BotConfig,
	) {}

	/**
	 * Stores instances of prefix controllers, keyed by canonical command name.
	 */
	private readonly controllers = new Collection<string, PrefixController>();

	/**
	 * Stores controller classes for metadata and context validation, keyed by command name.
	 */
	private readonly controllerClasses = new Collection<string, PrefixControllerConstructor>();

	/**
	 * Stores mapping of command aliases to their primary command names.
	 */
	private readonly aliases = new Collection<string, string>();

	/**
	 * Registers an array of prefix command controllers with the registry.
	 *
	 * Each controller class must be decorated to provide command metadata.
	 * The controllers will be resolved and instantiated via the DI container.
	 *
	 * @param controllerClasses An array of controller classes to register.
	 * @throws {CommandError} If a controller class is missing required command metadata.
	 */
	public register(controllerClasses: readonly PrefixControllerConstructor[]): void {
		if (this._config.disableAllPrefixCommands) {
			this._logger.info('PrefixRegistry', 'All prefix commands are disabled, skipping registration');
			return;
		}
		for (const ControllerClass of controllerClasses) {
			this.registerController(ControllerClass);
		}
	}

	/**
	 * Registers a single prefix command controller with the registry.
	 *
	 * Validates and extracts metadata; controller will be instantiated.
	 *
	 * @param ControllerClass The controller class to register.
	 * @throws {CommandError} If required metadata is missing.
	 */
	private registerController(ControllerClass: PrefixControllerConstructor): void {
		this._logger.debug('PrefixRegistry', `Registering controller: ${ControllerClass.name}`);
		const metadata = getPrefixCommandMetadata(ControllerClass);

		if (!metadata) {
			const error = new CommandError(
				`Controller ${ControllerClass.name} is missing @PrefixCommand decorator`,
				ERROR_CODES.DECORATOR_MISSING,
			);
			this._logger.error('PrefixRegistry', 'Controller missing decorator', error, {
				controllerName: ControllerClass.name,
			});
			throw error;
		}

		const { options } = metadata;

		// Skip registration if command is disabled
		if (this._config.disabledPrefixCommands.has(options.name)) {
			this._logger.info('PrefixRegistry', `Skipping disabled command: ${options.name}`, {
				commandName: options.name,
				controllerName: ControllerClass.name,
			});
			return;
		}

		const instance = container.resolve(ControllerClass);

		this.controllers.set(options.name, instance);
		this.controllerClasses.set(options.name, ControllerClass);
		this._logger.debug('PrefixRegistry', `Registered command: ${options.name}`, {
			commandName: options.name,
			controllerName: ControllerClass.name,
		});

		if (options.aliases) {
			for (const alias of options.aliases) {
				this.aliases.set(alias, options.name);
				this._logger.debug('PrefixRegistry', `Registered alias: ${alias} -> ${options.name}`);
			}
		}
	}

	/**
	 * Retrieves all registered controller instances, keyed by command name.
	 * Excludes disabled commands. Returns empty collection if all prefix commands are disabled.
	 *
	 * @returns Collection of command controllers.
	 */
	public getControllers(): Collection<string, PrefixController> {
		if (this._config.disableAllPrefixCommands) {
			return new Collection<string, PrefixController>();
		}
		const filtered = new Collection<string, PrefixController>();
		for (const [name, controller] of this.controllers) {
			if (!this._config.disabledPrefixCommands.has(name)) {
				filtered.set(name, controller);
			}
		}
		return filtered;
	}

	/**
	 * Determines if a command exists by its name or alias.
	 * Returns false for disabled commands or if all prefix commands are disabled.
	 *
	 * @param nameOrAlias The user-supplied command name or alias.
	 * @returns True if the command is registered and not disabled, otherwise false.
	 */
	public hasCommand(nameOrAlias: string): boolean {
		if (this._config.disableAllPrefixCommands) {
			return false;
		}
		const name = this.resolveCommandName(nameOrAlias);
		return this.controllers.has(name) && !this._config.disabledPrefixCommands.has(name);
	}

	/**
	 * Resolves a command alias to its canonical command name.
	 *
	 * @param nameOrAlias The input command name or alias.
	 * @returns Canonical command name if alias, otherwise original name.
	 */
	private resolveCommandName(nameOrAlias: string): string {
		return this.aliases.get(nameOrAlias) ?? nameOrAlias;
	}

	/**
	 * Executes a registered prefix command by name or alias, including validation and error handling.
	 *
	 * Execution is wrapped in error and context boundaries to provide robust user and developer feedback.
	 *
	 * @param nameOrAlias The command name or alias to execute.
	 * @param message The Discord message invoking the command.
	 * @param _args Argument array parsed from the message.
	 * @returns A promise that resolves when command execution completes.
	 */
	public async executeCommand(
		nameOrAlias: string,
		message: Message,
		_args: string[],
	): Promise<void> {
		const name = this.resolveCommandName(nameOrAlias);
		this._logger.debug('PrefixRegistry', `Looking up command: ${nameOrAlias} -> ${name}`);

		// Check if all prefix commands are disabled
		if (this._config.disableAllPrefixCommands) {
			this._logger.debug('PrefixRegistry', 'All prefix commands are disabled');
			return;
		}

		// Check if command is disabled
		if (this._config.disabledPrefixCommands.has(name)) {
			this._logger.debug('PrefixRegistry', `Command is disabled: ${name}`, {
				commandName: name,
			});
			await message.reply('This command is currently unavailable.');
			return;
		}

		const controller = this.controllers.get(name);
		const ControllerClass = this.controllerClasses.get(name);

		if (!controller || !ControllerClass) {
			this._logger.debug('PrefixRegistry', `Command not found: ${nameOrAlias}`, {
				resolvedName: name,
			});
			return;
		}

		this._logger.debug('PrefixRegistry', `Command found, validating context: ${name}`);

		const contextValid = await this.validateContext(name, message, ControllerClass);
		if (!contextValid) {
			return;
		}

		const roleValid = await this.validateRoles(name, message, ControllerClass);
		if (!roleValid) {
			return;
		}

		this._logger.info('PrefixRegistry', `Executing command: ${name}`, {
			commandName: name,
			argsCount: _args.length,
			userId: message.author.id,
			channelId: message.channel.id,
			guildId: message.guild?.id,
		});

		try {
			await controller.execute(message, _args);
			this._logger.debug('PrefixRegistry', `Command executed successfully: ${name}`);
		}
		catch (error) {
			await this.handleExecutionError(error, message, name);
		}
	}

	/**
	 * Validates whether the command can be executed in the current context (e.g. DM/guild).
	 *
	 * Handles restrictions imposed by permission metadata and provides user feedback as needed.
	 *
	 * @param name The canonical command name.
	 * @param message The Discord message invoking the command.
	 * @param ControllerClass The controller class for metadata lookup.
	 * @returns Promise resolving to true if context is valid, otherwise false.
	 */
	private async validateContext(
		name: string,
		message: Message,
		ControllerClass: PrefixControllerConstructor,
	): Promise<boolean> {
		const permissions: PermissionMetadata[] | undefined =
			Reflect.getMetadata(PERMISSION_METADATA_KEY, ControllerClass);

		if (!permissions) {
			this._logger.debug('PrefixRegistry', `No context restrictions for command: ${name}`);
			return true;
		}

		const isDM = message.channel.isDMBased();
		const guildOnly = permissions.some(p => p.type === 'guild');
		const dmOnly = permissions.some(p => p.type === 'dm');

		this._logger.debug('PrefixRegistry', `Validating context for command: ${name}`, {
			isDM,
			guildOnly,
			dmOnly,
		});

		if (guildOnly && isDM) {
			await message.reply('This command can only be used in servers.');
			this._logger.warn('PrefixRegistry', `Command "${name}" is guild-only but was used in DM`, {
				commandName: name,
				errorCode: ERROR_CODES.GUILD_ONLY,
				userId: message.author.id,
			});
			return false;
		}

		if (dmOnly && !isDM) {
			await message.reply('This command can only be used in direct messages.');
			this._logger.warn('PrefixRegistry', `Command "${name}" is DM-only but was used in guild`, {
				commandName: name,
				errorCode: ERROR_CODES.DM_ONLY,
				userId: message.author.id,
				guildId: message.guild?.id,
			});
			return false;
		}

		return true;
	}

	/**
	 * Validates whether the user has the required roles to execute the command.
	 * Uses OR logic: the user must have ANY of the specified roles.
	 * Sends a reply and returns false if the user lacks required roles.
	 *
	 * @param name The canonical command name.
	 * @param message The Discord message invoking the command.
	 * @param ControllerClass The controller class for metadata lookup.
	 * @returns Promise resolving to true if user has required roles, otherwise false.
	 */
	private async validateRoles(
		name: string,
		message: Message,
		ControllerClass: PrefixControllerConstructor,
	): Promise<boolean> {
		const roleMetadata: RoleMetadata[] | undefined = getRoleMetadata(ControllerClass);

		if (!roleMetadata || roleMetadata.length === 0) {
			this._logger.debug('PrefixRegistry', `No role restrictions for command: ${name}`);
			return true;
		}

		// Collect all required role IDs from all @RequireRole decorators (supports multiple decorators)
		const allRequiredRoleIds: string[] = [];
		let customErrorMessage: string | undefined;

		for (const metadata of roleMetadata) {
			allRequiredRoleIds.push(...metadata.roleIds);
			// Use the first custom error message found, if any
			if (metadata.errorMessage && !customErrorMessage) {
				customErrorMessage = metadata.errorMessage;
			}
		}

		if (allRequiredRoleIds.length === 0) {
			return true;
		}

		if (!message.guild) {
			await message.reply('This command can only be used in servers.');
			this._logger.warn('PrefixRegistry', `Command "${name}" requires roles but was used outside guild`, {
				commandName: name,
				errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
				userId: message.author.id,
			});
			return false;
		}

		// Fetch the member to check their roles
		const member = await message.guild.members.fetch(message.author.id);

		// OR logic: user needs ANY of the required roles
		const hasRequiredRole = allRequiredRoleIds.some(roleId =>
			member.roles.cache.has(roleId),
		);

		if (!hasRequiredRole) {
			const errorMessage = customErrorMessage ?? 'You do not have permission to use this command.';
			await message.reply(errorMessage);
			this._logger.warn('PrefixRegistry', `User lacks required role(s) for command "${name}"`, {
				commandName: name,
				errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
				userId: message.author.id,
				guildId: message.guild.id,
				requiredRoleIds: allRequiredRoleIds,
				userRoleIds: Array.from(member.roles.cache.keys()),
			});
			return false;
		}

		this._logger.debug('PrefixRegistry', `Role validation passed for command: ${name}`, {
			userId: message.author.id,
			requiredRoleIds: allRequiredRoleIds,
		});

		return true;
	}

	/**
	 * Handles and logs errors that occur during command execution, and provides suitable user responses.
	 *
	 * Distinguishes among user errors, framework errors, and unexpected/unhandled errors.
	 *
	 * @param error The error thrown during command execution.
	 * @param message The original message context.
	 * @param commandName The canonical name of the command.
	 */
	private async handleExecutionError(
		error: unknown,
		message: Message,
		commandName: string,
	): Promise<void> {
		if (isCommandError(error)) {
			this._logger.error('PrefixRegistry', `Command execution error: ${commandName}`, error, {
				commandName,
				errorCode: error.code,
				userId: message.author.id,
				channelId: message.channel.id,
			});
			await this.sendErrorReply(message, error.userMessage);
		}
		else if (isFrameworkError(error)) {
			this._logger.error('PrefixRegistry', `Framework error during command execution: ${commandName}`, error, {
				commandName,
				errorCode: error.code,
				userId: message.author.id,
				channelId: message.channel.id,
			});
			await this.sendErrorReply(message, 'An error occurred.');
		}
		else {
			this._logger.error('PrefixRegistry', `Unexpected error during command execution: ${commandName}`, error instanceof Error ? error : new Error(String(error)), {
				commandName,
				userId: message.author.id,
				channelId: message.channel.id,
			});
			await this.sendErrorReply(message, 'An unexpected error occurred.');
		}
	}

	/**
	 * Sends a user-facing error reply to a Discord message.
	 *
	 * Failure to send is silently ignored.
	 *
	 * @param message The Discord message to reply to.
	 * @param content The error content to send.
	 */
	private async sendErrorReply(message: Message, content: string): Promise<void> {
		try {
			await message.reply(content);
		}
		catch {
			// Reply failed - already logged, nothing more we can do
		}
	}
}
