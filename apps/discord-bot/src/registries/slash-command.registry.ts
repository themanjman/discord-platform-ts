import 'reflect-metadata';

import { singleton, container, inject } from 'tsyringe';
import {
	ApplicationCommandOptionType,
	ChatInputCommandInteraction,
	Collection,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';

import { SlashController } from '@/base';
import { getSlashCommandMetadata, isGuildOnly, isDMOnly, getRoleMetadata } from '@/decorators';
import { CommandError, PermissionError, isFrameworkError, isCommandError } from '@/errors';
import { ERROR_CODES } from '@/errors/error-codes';
import { PERMISSION_METADATA_KEY, type PermissionMetadata, type SlashCommandOptionConfig, type RoleMetadata } from '@/types';
import { LoggerService } from '@/services';
import { BotConfig } from '@/config';

/**
 * Type representing a Slash Command Controller constructor.
 */
type SlashControllerConstructor = new (..._args: unknown[]) => SlashController;

/**
 * Registry responsible for managing Discord Slash Commands.
 * 
 * Handles discovery, registration, metadata extraction, execution, and context validation
 * for slash command controllers. Maintains collections of controller classes and instances,
 * as well as the generated command data for Discord API registration.
 */
@singleton()
export class SlashCommandRegistry {
	constructor(
		@inject(LoggerService) private readonly _logger: LoggerService,
		@inject(BotConfig) private readonly _config: BotConfig,
	) {}

	/**
	 * The registry of controller instances, keyed by command name.
	 */
	private readonly controllers = new Collection<string, SlashController>();

	/**
	 * The registry of controller classes, keyed by command name.
	 */
	private readonly controllerClasses = new Collection<string, SlashControllerConstructor>();

	/**
	 * Cached array of generated SlashCommandBuilder JSON data.
	 */
	private readonly commandBuilders: ReturnType<SlashCommandBuilder['toJSON']>[] = [];

	/**
	 * Registers an array of controller classes with this registry.
	 * Controller classes must use the @SlashCommand decorator.
	 * Instantiates controllers using dependency injection.
	 * 
	 * @param controllerClasses Array of controller class constructors.
	 * @throws {CommandError} If any controller is missing the @SlashCommand decorator.
	 */
	public register(controllerClasses: readonly SlashControllerConstructor[]): void {
		if (this._config.disableAllSlashCommands) {
			this._logger.info('SlashRegistry', 'All slash commands are disabled, skipping registration');
			return;
		}
		for (const ControllerClass of controllerClasses) {
			this.registerController(ControllerClass);
		}
	}

	/**
	 * Registers a single controller, extracts metadata, instantiates and stores it.
	 * Also builds the slash command and stores its metadata for Discord API use.
	 * 
	 * @param ControllerClass The class of the controller to register.
	 * @throws {CommandError} If the class is missing its @SlashCommand decorator.
	 */
	private registerController(ControllerClass: SlashControllerConstructor): void {
		this._logger.debug('SlashRegistry', `Registering controller: ${ControllerClass.name}`);
		const metadata = getSlashCommandMetadata(ControllerClass);

		if (!metadata) {
			const error = new CommandError(
				`Controller ${ControllerClass.name} is missing @SlashCommand decorator`,
				ERROR_CODES.DECORATOR_MISSING,
			);
			this._logger.error('SlashRegistry', 'Controller missing decorator', error, {
				controllerName: ControllerClass.name,
			});
			throw error;
		}

		const { options } = metadata;

		// Skip registration if command is disabled
		if (this._config.disabledSlashCommands.has(options.name)) {
			this._logger.info('SlashRegistry', `Skipping disabled command: ${options.name}`, {
				commandName: options.name,
				controllerName: ControllerClass.name,
			});
			return;
		}
		const instance = container.resolve(ControllerClass);

		this._logger.debug('SlashRegistry', `Building slash command: ${options.name}`);
		const builder = new SlashCommandBuilder()
			.setName(options.name)
			.setDescription(options.description);

		// Apply default member permissions if specified
		if (options.defaultMemberPermissions !== undefined) {
			builder.setDefaultMemberPermissions(options.defaultMemberPermissions);
			this._logger.debug('SlashRegistry', `Set defaultMemberPermissions for command: ${options.name}`, {
				permissions: options.defaultMemberPermissions,
			});
		}

		this.applyContextRestrictions(builder, ControllerClass);

		if (options.options) {
			this._logger.debug('SlashRegistry', `Adding ${options.options.length} option(s) to command: ${options.name}`);
			for (const option of options.options) {
				this.addCommandOption(builder, option);
			}
		}

		this.commandBuilders.push(builder.toJSON());
		this.controllers.set(options.name, instance);
		this.controllerClasses.set(options.name, ControllerClass);
		this._logger.debug('SlashRegistry', `Registered command: ${options.name}`, {
			commandName: options.name,
			controllerName: ControllerClass.name,
			optionCount: options.options?.length || 0,
		});
	}

	/**
	 * Modifies the SlashCommandBuilder to constrain the command to allowed messaging contexts.
	 * Applies @Guild and/or @DM decorators by setting the InteractionContextType accordingly.
	 * 
	 * @param builder The command builder being configured.
	 * @param ControllerClass The controller's constructor, used for decorator checks.
	 */
	private applyContextRestrictions(
		builder: SlashCommandBuilder,
		ControllerClass: SlashControllerConstructor,
	): void {
		const guildOnly = isGuildOnly(ControllerClass);
		const dmOnly = isDMOnly(ControllerClass);

		if (guildOnly) {
			builder.setContexts(InteractionContextType.Guild);
		}
		else if (dmOnly) {
			builder.setContexts(
				InteractionContextType.BotDM,
				InteractionContextType.PrivateChannel,
			);
		}
		else {
			builder.setContexts(
				InteractionContextType.Guild,
				InteractionContextType.BotDM,
				InteractionContextType.PrivateChannel,
			);
		}
	}

	/**
	 * Adds a Discord slash command option of any supported type to the command builder.
	 * Handles constraints such as choices, required, value ranges and lengths.
	 * 
	 * @param builder The slash command builder to augment.
	 * @param option The option configuration to add.
	 */
	private addCommandOption(
		builder: SlashCommandBuilder,
		option: SlashCommandOptionConfig,
	): void {
		const baseOptions = {
			name: option.name,
			description: option.description,
			required: option.required ?? false,
		};

		switch (option.type) {
			case ApplicationCommandOptionType.String: {
				builder.addStringOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					if (option.minLength !== undefined) opt.setMinLength(option.minLength);
					if (option.maxLength !== undefined) opt.setMaxLength(option.maxLength);
					if (option.choices) {
						opt.addChoices(
							...option.choices.map(choice => ({
								name: choice.name,
								value: choice.value as string,
							})),
						);
					}
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Integer: {
				builder.addIntegerOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					if (option.minValue !== undefined) opt.setMinValue(option.minValue);
					if (option.maxValue !== undefined) opt.setMaxValue(option.maxValue);
					if (option.choices) {
						opt.addChoices(
							...option.choices.map(choice => ({
								name: choice.name,
								value: choice.value as number,
							})),
						);
					}
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Number: {
				builder.addNumberOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					if (option.minValue !== undefined) opt.setMinValue(option.minValue);
					if (option.maxValue !== undefined) opt.setMaxValue(option.maxValue);
					if (option.choices) {
						opt.addChoices(
							...option.choices.map(choice => ({
								name: choice.name,
								value: choice.value as number,
							})),
						);
					}
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Boolean: {
				builder.addBooleanOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.User: {
				builder.addUserOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Channel: {
				builder.addChannelOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Role: {
				builder.addRoleOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Mentionable: {
				builder.addMentionableOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Attachment: {
				builder.addAttachmentOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					return opt;
				});
				break;
			}

			case ApplicationCommandOptionType.Subcommand: {
				builder.addSubcommand((subcommand) => {
					subcommand.setName(baseOptions.name).setDescription(baseOptions.description);
					return subcommand;
				});
				break;
			}

			case ApplicationCommandOptionType.SubcommandGroup: {
				builder.addSubcommandGroup((group) => {
					group.setName(baseOptions.name).setDescription(baseOptions.description);
					return group;
				});
				break;
			}

			default: {
				this._logger.warn('SlashRegistry', `Unsupported option type: ${option.type}, defaulting to string`, {
					optionName: option.name,
					optionType: option.type,
				});
				builder.addStringOption((opt) => {
					opt.setName(baseOptions.name).setDescription(baseOptions.description);
					if (baseOptions.required) opt.setRequired(true);
					return opt;
				});
				break;
			}
		}
	}

	/**
	 * Retrieves all command data built for API registration.
	 * Excludes disabled commands. Returns empty array if all slash commands are disabled.
	 * 
	 * @returns Readonly array of command data objects.
	 */
	public getCommandBuilders(): readonly ReturnType<SlashCommandBuilder['toJSON']>[] {
		if (this._config.disableAllSlashCommands) {
			return [];
		}
		return this.commandBuilders.filter(cmd => 
			!this._config.disabledSlashCommands.has(cmd.name)
		);
	}

	/**
	 * Returns all registered controller instances keyed by their command names.
	 * Excludes disabled commands. Returns empty collection if all slash commands are disabled.
	 * 
	 * @returns Collection of controller instances.
	 */
	public getControllers(): Collection<string, SlashController> {
		if (this._config.disableAllSlashCommands) {
			return new Collection<string, SlashController>();
		}
		const filtered = new Collection<string, SlashController>();
		for (const [name, controller] of this.controllers) {
			if (!this._config.disabledSlashCommands.has(name)) {
				filtered.set(name, controller);
			}
		}
		return filtered;
	}

	/**
	 * Returns all registered controller classes keyed by their command names.
	 * 
	 * @returns Collection of controller class constructors.
	 */
	public getControllerClasses(): Collection<string, SlashControllerConstructor> {
		return this.controllerClasses;
	}

	/**
	 * Executes a slash command by its name using the provided Discord interaction.
	 * Handles lookup, context validation, execution, and error boundary with user-friendly replies.
	 * 
	 * @param name The command name to execute.
	 * @param interaction The Discord ChatInputCommandInteraction to process.
	 * @throws {CommandError} If the command cannot be found in the registry.
	 */
	public async executeCommand(
		name: string,
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		this._logger.debug('SlashRegistry', `Looking up command: ${name}`);

		// Check if all slash commands are disabled
		if (this._config.disableAllSlashCommands) {
			const error = new CommandError(
				'All slash commands are disabled',
				ERROR_CODES.NOT_FOUND,
				'Slash commands are currently unavailable.',
			);
			this._logger.debug('SlashRegistry', 'All slash commands are disabled');
			await this.sendEphemeralReply(interaction, 'Slash commands are currently unavailable.');
			throw error;
		}

		// Check if command is disabled
		if (this._config.disabledSlashCommands.has(name)) {
			const error = new CommandError(
				`Slash command "${name}" is disabled`,
				ERROR_CODES.NOT_FOUND,
				'This command is currently unavailable.',
			);
			this._logger.debug('SlashRegistry', 'Command is disabled', {
				commandName: name,
			});
			await this.sendEphemeralReply(interaction, 'This command is currently unavailable.');
			throw error;
		}

		const controller = this.controllers.get(name);
		const ControllerClass = this.controllerClasses.get(name);

		if (!controller || !ControllerClass) {
			const error = new CommandError(
				`Slash command "${name}" not found in registry`,
				ERROR_CODES.NOT_FOUND,
				'Command not found.',
			);
			this._logger.error('SlashRegistry', 'Command not found in registry', error, {
				commandName: name,
			});
			throw error;
		}

		this._logger.debug('SlashRegistry', `Command found, validating context: ${name}`);

		await this.validateContext(name, interaction, ControllerClass);
		await this.validateRoles(name, interaction, ControllerClass);

		this._logger.info('SlashRegistry', `Executing command: ${name}`, {
			commandName: name,
			userId: interaction.user.id,
			channelId: interaction.channel?.id,
			guildId: interaction.guild?.id,
		});

		try {
			await controller.execute(interaction);
			this._logger.debug('SlashRegistry', `Command executed successfully: ${name}`);
		}
		catch (error) {
			await this.handleExecutionError(error, interaction, name);
		}
	}

	/**
	 * Validates whether the given command can run in the current messaging context for this interaction.
	 * Sends an ephemeral reply and throws a PermissionError if the context is not permitted.
	 * 
	 * @param name The name of the command.
	 * @param interaction The Discord interaction received.
	 * @param ControllerClass The controller class constructor, used for metadata checks.
	 * @throws {PermissionError} If the interaction is not allowed in the detected context.
	 */
	private async validateContext(
		name: string,
		interaction: ChatInputCommandInteraction,
		ControllerClass: SlashControllerConstructor,
	): Promise<void> {
		const permissions: PermissionMetadata[] | undefined =
			Reflect.getMetadata(PERMISSION_METADATA_KEY, ControllerClass);

		if (!permissions) {
			this._logger.debug('SlashRegistry', `No context restrictions for command: ${name}`);
			return;
		}

		const isDM = interaction.channel?.isDMBased() ?? false;
		const guildOnly = permissions.some(p => p.type === 'guild');
		const dmOnly = permissions.some(p => p.type === 'dm');

		this._logger.debug('SlashRegistry', `Validating context for command: ${name}`, {
			isDM,
			guildOnly,
			dmOnly,
		});

		if (guildOnly && isDM) {
			await this.sendEphemeralReply(
				interaction,
				'This command can only be used in servers.',
			);
			const error = new PermissionError(
				`Command "${name}" is guild-only but was used in DM`,
				ERROR_CODES.GUILD_ONLY,
				'guild',
			);
			this._logger.warn('SlashRegistry', `Command "${name}" is guild-only but was used in DM`, {
				commandName: name,
				errorCode: ERROR_CODES.GUILD_ONLY,
				userId: interaction.user.id,
			});
			throw error;
		}

		if (dmOnly && !isDM) {
			await this.sendEphemeralReply(
				interaction,
				'This command can only be used in direct messages.',
			);
			const error = new PermissionError(
				`Command "${name}" is DM-only but was used in guild`,
				ERROR_CODES.DM_ONLY,
				'dm',
			);
			this._logger.warn('SlashRegistry', `Command "${name}" is DM-only but was used in guild`, {
				commandName: name,
				errorCode: ERROR_CODES.DM_ONLY,
				userId: interaction.user.id,
				guildId: interaction.guild?.id,
			});
			throw error;
		}
	}

	/**
	 * Validates whether the user has the required roles to execute the command.
	 * Uses OR logic: the user must have ANY of the specified roles.
	 * Sends an ephemeral reply and throws a PermissionError if the user lacks required roles.
	 * 
	 * @param name The name of the command.
	 * @param interaction The Discord interaction received.
	 * @param ControllerClass The controller class constructor, used for metadata checks.
	 * @throws {PermissionError} If the user does not have any of the required roles.
	 */
	private async validateRoles(
		name: string,
		interaction: ChatInputCommandInteraction,
		ControllerClass: SlashControllerConstructor,
	): Promise<void> {
		const roleMetadata: RoleMetadata[] | undefined = getRoleMetadata(ControllerClass);

		if (!roleMetadata || roleMetadata.length === 0) {
			this._logger.debug('SlashRegistry', `No role restrictions for command: ${name}`);
			return;
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
			return;
		}

		if (!interaction.guild) {
			await this.sendEphemeralReply(
				interaction,
				'This command can only be used in servers.',
			);
			const error = new PermissionError(
				`Command "${name}" requires roles but was used outside guild`,
				ERROR_CODES.INSUFFICIENT_PERMISSIONS,
			);
			this._logger.warn('SlashRegistry', `Command "${name}" requires roles but was used outside guild`, {
				commandName: name,
				errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
				userId: interaction.user.id,
			});
			throw error;
		}

		// Fetch the member to check their roles
		const member = await interaction.guild.members.fetch(interaction.user.id);
		
		// OR logic: user needs ANY of the required roles
		const hasRequiredRole = allRequiredRoleIds.some(roleId => 
			member.roles.cache.has(roleId)
		);

		if (!hasRequiredRole) {
			const errorMessage = customErrorMessage ?? 'You do not have permission to use this command.';
			await this.sendEphemeralReply(interaction, errorMessage);
			const error = new PermissionError(
				`User ${interaction.user.id} lacks required role(s) for command "${name}"`,
				ERROR_CODES.INSUFFICIENT_PERMISSIONS,
				undefined,
				errorMessage,
			);
			this._logger.warn('SlashRegistry', `User lacks required role(s) for command "${name}"`, {
				commandName: name,
				errorCode: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
				userId: interaction.user.id,
				guildId: interaction.guild.id,
				requiredRoleIds: allRequiredRoleIds,
				userRoleIds: Array.from(member.roles.cache.keys()),
			});
			throw error;
		}

		this._logger.debug('SlashRegistry', `Role validation passed for command: ${name}`, {
			userId: interaction.user.id,
			requiredRoleIds: allRequiredRoleIds,
		});
	}

	/**
	 * Handles and logs errors resulting from slash command execution.
	 * Differentiates user errors, framework errors, and unknown errors,
	 * replying with the most helpful message available.
	 * 
	 * @param error The error thrown during execution.
	 * @param interaction The Discord interaction.
	 * @param commandName The command that failed.
	 */
	private async handleExecutionError(
		error: unknown,
		interaction: ChatInputCommandInteraction,
		commandName: string,
	): Promise<void> {
		if (isCommandError(error)) {
			this._logger.error('SlashRegistry', `Command execution error: ${commandName}`, error, {
				commandName,
				errorCode: error.code,
				userId: interaction.user.id,
				channelId: interaction.channel?.id,
			});
			await this.sendEphemeralReply(interaction, error.userMessage);
		}
		else if (isFrameworkError(error)) {
			this._logger.error('SlashRegistry', `Framework error during command execution: ${commandName}`, error, {
				commandName,
				errorCode: error.code,
				userId: interaction.user.id,
				channelId: interaction.channel?.id,
			});
			await this.sendEphemeralReply(interaction, 'An error occurred.');
		}
		else {
			this._logger.error('SlashRegistry', `Unexpected error during command execution: ${commandName}`, error instanceof Error ? error : new Error(String(error)), {
				commandName,
				userId: interaction.user.id,
				channelId: interaction.channel?.id,
			});
			await this.sendEphemeralReply(interaction, 'An unexpected error occurred.');
		}
	}

	/**
	 * Safely attempts to send an ephemeral reply to a Discord interaction.
	 * If the interaction is already replied or deferred, uses followUp.
	 * 
	 * @param interaction The Discord interaction target.
	 * @param content The string to reply to the user with.
	 */
	private async sendEphemeralReply(
		interaction: ChatInputCommandInteraction,
		content: string,
	): Promise<void> {
		try {
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
			}
			else {
				await interaction.reply({ content, flags: MessageFlags.Ephemeral });
			}
		}
		catch {
			// Reply failed - already logged, nothing more we can do
		}
	}
}
