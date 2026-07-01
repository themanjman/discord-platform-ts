import 'reflect-metadata';

import { singleton, inject } from 'tsyringe';
import {
	Client,
	Events,
	GatewayIntentBits,
	Partials,
	REST,
	Routes,
} from 'discord.js';

import { BotConfig } from '@/config';
// Kept for future use when slash commands are re-enabled
import { slashControllers as _slashControllers } from '@/controllers/slash';
import { prefixControllers } from '@/controllers/prefix';
import { interactionControllers } from '@/controllers/interactions';
import { InteractionControllerRegistry, SlashCommandRegistry, PrefixCommandRegistry } from '@/registries';
import { EventRegistry } from '@/services/eventregistry.service';
import { EventLoader } from '@/services/eventloader.service';
import { LoggerService } from '@/services/logger.service';
import { InteractionEventHandler } from '@/events/interaction.event';
import { ReadyEventHandler } from '@/events/ready.event';
import { MessageEventHandler } from '@/events/message.event';

/**
 * Core service for initializing, configuring, and managing the lifecycle of the Discord bot instance.
 *
 * Responsibilities include client initialization with required intents and partials, controller registration,
 * event handler setup, bot startup, and management of command registration to the Discord API.
 * Integrates logging and robust error handling throughout the bot lifecycle.
 */
@singleton()
export class BotService {
	/**
	 * The internal Discord.js client instance that interacts with the Discord gateway.
	 */
	private readonly client: Client<boolean>;

	/**
	 * Constructs a new BotService.
	 *
	 * @param _config - Bot configuration settings, including tokens and environmental details.
	 * @param _slashCommandRegistry - Registry responsible for slash (/) command management.
	 * @param _prefixCommandRegistry - Registry responsible for prefix-based command management.
	 * @param _interactionControllerRegistry - Registry responsible for interaction controller management.
	 * @param _eventRegistry - Central event registry for handling decorator-based event registration.
	 * @param _eventLoader - Loader responsible for discovering and instantiating event handler classes.
	 * @param _readyHandler - Handler for the Discord client's ready event.
	 * @param _logger - Logger for structured diagnostics and lifecycle info.
	 */
	constructor(
		@inject(BotConfig) private readonly _config: BotConfig,
		@inject(SlashCommandRegistry) private readonly _slashCommandRegistry: SlashCommandRegistry,
		@inject(PrefixCommandRegistry) private readonly _prefixCommandRegistry: PrefixCommandRegistry,
		@inject(InteractionControllerRegistry) private readonly _interactionControllerRegistry: InteractionControllerRegistry,
		@inject(EventRegistry) private readonly _eventRegistry: EventRegistry,
		@inject(EventLoader) private readonly _eventLoader: EventLoader,
		@inject(ReadyEventHandler) private readonly _readyHandler: ReadyEventHandler,
		@inject(LoggerService) private readonly _logger: LoggerService,
	) {
		this._logger.debug('BotService', 'Creating BotService instance...');
		this.client = this.createClient();
		this.registerControllers();
		this.loadEventHandlers();
		this.setupEventHandlers();
		this._logger.debug('BotService', 'BotService instance created successfully');
	}

	/**
	 * Instantiates and configures the Discord.js client with robust gateway intents and required partials.
	 *
	 * @returns The fully configured and ready client instance.
	 */
	private createClient(): Client<boolean> {
		this._logger.debug('BotService', 'Creating Discord.js client...');
		const intents = [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.DirectMessageTyping,
			GatewayIntentBits.DirectMessageReactions,
		];

		this._logger.debug('BotService', 'Configuring client intents and partials', {
			intents: intents.length,
			partials: [
				'Message',
				'Channel',
				'Reaction',
				'User',
				'GuildMember',
			],
		});

		const client = new Client({
			intents,
			partials: [
				Partials.Message,
				Partials.Channel,
				Partials.Reaction,
				Partials.User,
				Partials.GuildMember,
			],
		});

		this._logger.debug('BotService', 'Discord.js client created successfully');
		return client;
	}

	/**
	 * Registers all controllers for slash commands, prefix commands, and interactions with their appropriate registries.
	 * Enables the bot framework to properly route and manage incoming command and interaction events.
	 */
	private registerControllers(): void {
		this._logger.debug('BotService', 'Registering command controllers...');

		this._slashCommandRegistry.register(_slashControllers);
		this._logger.info('BotService', `Registered ${_slashControllers.length} slash command(s)`, {
			commandCount: _slashControllers.length,
		});

		this._prefixCommandRegistry.register(prefixControllers);
		this._logger.info('BotService', `Registered ${prefixControllers.length} prefix command(s)`, {
			commandCount: prefixControllers.length,
		});

		this._interactionControllerRegistry.register(interactionControllers);
		this._logger.info('BotService', `Registered ${interactionControllers.length} interaction controller(s)`, {
			controllerCount: interactionControllers.length,
		});
	}

	/**
	 * Discovers and loads event handler classes for decorator-driven event registration.
	 * Ensures that all custom and core event handlers are available to the event system.
	 */
	private loadEventHandlers(): void {
		this._logger.debug('BotService', 'Loading event handlers...');
		const handlers: Array<
			typeof InteractionEventHandler | typeof MessageEventHandler
		> = [InteractionEventHandler];

		if (!this._config.disableAllPrefixCommands) {
			handlers.push(MessageEventHandler);
		}
		else {
			this._logger.info('BotService', 'Prefix commands disabled, skipping MessageEventHandler');
		}

		this._eventLoader.loadEventHandlers(handlers);
		this._logger.debug('BotService', 'Event handlers loaded', {
			handlerCount: handlers.length,
		});
	}

	/**
	 * Attaches event listeners to the Discord.js client for ready state, error, warnings,
	 * chat commands, and integrates decorator-based event handling with the framework.
	 * Centralizes event assignment and logging for observability and error management.
	 */
	private setupEventHandlers(): void {
		this._logger.debug('BotService', 'Setting up Discord.js event handlers...');

		this.client.once(Events.ClientReady, (client) => {
			this._logger.debug('BotService', 'ClientReady event received');
			this._readyHandler.handle(client);
		});

		this.client.on(Events.Error, (error: Error) => {
			this._logger.error('BotService', 'Discord client error', error);
		});

		this.client.on(Events.Warn, (warning: string) => {
			this._logger.warn('BotService', `Discord client warning: ${warning}`);
		});

		this.client.on(Events.InteractionCreate, async (interaction) => {
			if (!interaction.isChatInputCommand()) {
				return;
			}
			await this._slashCommandRegistry.executeCommand(
				interaction.commandName,
				interaction,
			);
		});

		this._logger.debug('BotService', 'Registering decorator-based event handlers...');
		this._eventRegistry.registerWithClient(this.client);
		this._logger.debug('BotService', 'Event handlers setup completed');
	}

	/**
	 * Boots the Discord bot process.
	 *
	 * Authenticates with the Discord API.
	 * Registers slash commands with Discord based on their scope (guild or global).
	 * Throws if authentication fails.
	 *
	 * @returns A promise that resolves when the bot has logged in and registered commands.
	 * @throws Any errors encountered during login or command registration.
	 */
	public async start(): Promise<void> {
		this._logger.info('BotService', 'Connecting to Discord...');
		try {
			await this.client.login(this._config.discordToken);
			this._logger.info('BotService', 'Connected to Discord successfully', {
				userId: this.client.user?.id,
				username: this.client.user?.username,
			});
		}
		catch (error) {
			this._logger.error('BotService', 'Failed to connect to Discord', error instanceof Error ? error : new Error(String(error)));
			throw error;
		}

		await this._registerSlashCommands();
	}

	/**
	 * Registers all slash commands with the Discord API, separating global and guild-specific commands.
	 *
	 * - If a command is marked as guild-only, it's registered for the configured guild.
	 * - All other commands are registered globally.
	 * - Missing required environment variables or configuration will be logged as errors.
	 * - Handles exceptions thrown by the Discord API for each registration type.
	 *
	 * @returns Promise that resolves once all commands are registered.
	 */
	private async _registerSlashCommands(): Promise<void> {
		this._logger.debug('BotService', 'Registering slash commands with Discord API...');
		const rest = new REST().setToken(this._config.discordToken);
		const allCommands = this._slashCommandRegistry.getCommandBuilders();
		const controllerClasses = this._slashCommandRegistry.getControllerClasses();
		const { getSlashCommandMetadata } = await import('@/decorators');

		const clientId = process.env.CLIENT_ID;
		if (!clientId) {
			this._logger.error('BotService', 'CLIENT_ID environment variable is not set');
			return;
		}

		const guildId = this._config.guildId;

		const globalCommands: typeof allCommands[number][] = [];
		const guildOnlyCommands: typeof allCommands[number][] = [];

		for (const cmd of allCommands) {
			const ControllerClass = controllerClasses.get(cmd.name);
			if (ControllerClass) {
				const metadata = getSlashCommandMetadata(ControllerClass);
				if (metadata?.options.guildOnly) {
					guildOnlyCommands.push(cmd);
				}
				else {
					globalCommands.push(cmd);
				}
			}
			else {
				globalCommands.push(cmd);
			}
		}

		if (guildOnlyCommands.length > 0) {
			if (!guildId) {
				this._logger.error('BotService', `Cannot register ${guildOnlyCommands.length} guild-only command(s): GUILD_ID environment variable is not set`, {
					commandCount: guildOnlyCommands.length,
					commandNames: guildOnlyCommands.map(cmd => cmd.name),
				});
			}
			else {
				try {
					this._logger.info('BotService', `Registering ${guildOnlyCommands.length} guild-only slash command(s) for guild ${guildId}...`, {
						commandCount: guildOnlyCommands.length,
						guildId,
						clientId,
						commandNames: guildOnlyCommands.map((cmd: { name: string }) => cmd.name),
					});

					await rest.put(
						Routes.applicationGuildCommands(clientId, guildId),
						{ body: guildOnlyCommands },
					);

					this._logger.info('BotService', `Successfully registered ${guildOnlyCommands.length} guild-only slash command(s) for guild ${guildId}`, {
						commandCount: guildOnlyCommands.length,
						guildId,
					});
				}
				catch (error) {
					this._logger.error('BotService', `Failed to register guild-only slash commands for guild ${guildId}`, error instanceof Error ? error : new Error(String(error)), {
						commandCount: guildOnlyCommands.length,
						guildId,
						clientId,
					});
				}
			}
		}

		if (globalCommands.length > 0) {
			try {
				this._logger.info('BotService', `Registering ${globalCommands.length} global slash command(s)...`, {
					commandCount: globalCommands.length,
					clientId,
					commandNames: globalCommands.map((cmd: { name: string }) => cmd.name),
				});

				await rest.put(
					Routes.applicationCommands(clientId),
					{ body: globalCommands },
				);

				this._logger.info('BotService', `Successfully registered ${globalCommands.length} global slash command(s)`, {
					commandCount: globalCommands.length,
				});
			}
			catch (error) {
				this._logger.error('BotService', 'Failed to register global slash commands', error instanceof Error ? error : new Error(String(error)), {
					commandCount: globalCommands.length,
					clientId,
				});
			}
		}

		if (globalCommands.length === 0 && guildOnlyCommands.length === 0) {
			this._logger.warn('BotService', 'No slash commands to register');
		}
	}

	/**
	 * Provides access to the underlying Discord.js client used by the bot.
	 *
	 * @returns The instantiated Discord.js client that is used for bot operations.
	 */
	public getClient(): Client<boolean> {
		this._logger.debug('BotService', 'Getting Discord client instance');
		return this.client;
	}
}
