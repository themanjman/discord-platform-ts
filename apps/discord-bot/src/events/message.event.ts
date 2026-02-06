import { singleton, inject } from 'tsyringe';
import type { Message } from 'discord.js';

import { BotConfig } from '@/config';
import { On } from '@/decorators';
import { PrefixCommandRegistry } from '@/registries';
import { LoggerService } from '@/services';

/**
 * Handles Discord message events for the bot framework.
 *
 * This event handler is responsible for processing newly created Discord messages,
 * identifying prefixed command invocations, and delegating those commands to the
 * command registry for execution. It ensures bot messages are ignored, routinely logs
 * event details for diagnostics, and provides robust command argument parsing.
 *
 * @remarks
 * - Utilizes dependency injection for all core dependencies.
 * - Operates as a singleton to ensure consistent behavior across the bot's lifecycle.
 * - Only processes messages that begin with the configured prefix.
 * - All command execution and error boundaries are handled by the command registry.
 *
 * @see PrefixCommandRegistry
 * @see LoggerService
 * @see BotConfig
 */
@singleton()
export class MessageEventHandler {
	/**
	 * Constructs the message event handler.
	 *
	 * @param prefixCommandRegistry - The registry responsible for managing and executing prefix commands.
	 * @param config - Bot configuration containing the command prefix and related options.
	 * @param _logger - Logger service used for diagnostic and event logging.
	 */
	constructor(
		@inject(PrefixCommandRegistry) private readonly prefixCommandRegistry: PrefixCommandRegistry,
		@inject(BotConfig) private readonly config: BotConfig,
		@inject(LoggerService) private readonly _logger: LoggerService,
	) {}

	/**
	 * Handles the Discord 'MessageCreate' event.
	 *
	 * Parses each incoming message to determine if it is a command invocation by checking the configured prefix.
	 * Ignores messages sent by bots. If a prefixed command is detected, extracts the command name and arguments,
	 * logs relevant processing metadata, and delegates command execution to the command registry. Halts further
	 * processing if the message does not match the command prefix or lacks a valid command name.
	 *
	 * @param message - The Discord message instance received in the event.
	 * @returns A Promise resolving when command parsing and execution are complete.
	 */
	@On('MessageCreate')
	public async handleMessage(message: Message): Promise<void> {
		this._logger.debug('MessageEvent', 'Message received', {
			messageId: message.id,
			authorId: message.author.id,
			authorTag: message.author.tag,
			channelId: message.channel.id,
			guildId: message.guild?.id,
		});

		// Ignore messages sent by bots
		if (message.author.bot) {
			this._logger.debug('MessageEvent', 'Ignoring bot message', {
				authorId: message.author.id,
			});
			return;
		}

		// Retrieve and check the configured prefix for commands
		const prefix = this.config.commandPrefix;
		if (!message.content.startsWith(prefix)) {
			this._logger.debug('MessageEvent', 'Message does not start with prefix', {
				prefix,
				contentPreview: message.content.substring(0, 20),
			});
			return;
		}

		// Extract command name and arguments from message content
		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const commandName = args.shift()?.toLowerCase();

		if (!commandName) {
			this._logger.debug('MessageEvent', 'No command name found after prefix');
			return;
		}

		this._logger.info('MessageEvent', `Executing command: ${commandName}`, {
			commandName,
			args: args.length,
			authorId: message.author.id,
			channelId: message.channel.id,
			guildId: message.guild?.id,
		});

		// Delegate command execution; registry manages error boundaries and response flow
		await this.prefixCommandRegistry.executeCommand(commandName, message, args);
	}
}
