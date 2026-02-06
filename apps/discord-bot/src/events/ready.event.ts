import { singleton, inject } from 'tsyringe';
import { Events, type ClientEvents } from 'discord.js';
import { LoggerService } from '@/services';

/**
 * Defines the interface for handling the Discord client's ready event.
 *
 * Implementations of this interface process the event emitted when the Discord bot successfully connects and is operational.
 *
 * @method handle Receives the arguments emitted with the ready event from Discord.js,
 *                typically including the client instance with connection information.
 */
export interface IReadyEventHandler {
	handle(...args: ClientEvents[Events.ClientReady]): void;
}

/**
 * Event handler for the Discord ClientReady event.
 *
 * This handler is responsible for processing logic to be executed after the bot has successfully connected
 * and is ready for interaction. It logs essential information about the connected bot user, such as
 * username, tag, and user ID, using the provided LoggerService.
 *
 * This class is implemented as a singleton to ensure a single handler instance exists
 * during the application's lifecycle.
 */
@singleton()
export class ReadyEventHandler implements IReadyEventHandler {
	/**
	 * Constructs the ReadyEventHandler with a required logger dependency.
	 *
	 * @param _logger - LoggerService instance for emitting event diagnostics and connection status.
	 */
	constructor(@inject(LoggerService) private readonly _logger: LoggerService) {}

	/**
	 * Handles the Discord client's ready event.
	 *
	 * Triggered when the client successfully establishes a connection to Discord.
	 * Logs relevant information about the authenticated bot user, including user ID,
	 * username, and tag. Intended for diagnostics and validation that the bot
	 * is fully operational and ready to process events.
	 *
	 * @param args - Arguments received from the Discord.js ClientReady event.
	 *               The first argument is the ready client instance.
	 */
	public handle(...args: ClientEvents[Events.ClientReady]): void {
		const [readyClient] = args;
		this._logger.info('ReadyEvent', `Ready! Logged in as ${readyClient.user.tag}`, {
			userId: readyClient.user.id,
			username: readyClient.user.username,
			tag: readyClient.user.tag,
		});
	}
}
