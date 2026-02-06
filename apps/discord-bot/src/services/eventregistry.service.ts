import { singleton, inject } from 'tsyringe';
import { Client, Events, type ClientEvents } from 'discord.js';
import { EVENT_METADATA_KEY } from '@/types';
import { LoggerService } from './logger.service';

/**
 * Handles discovery, registration, and management of decorated Discord event handler classes.
 * 
 * Maintains a dynamic registry of event handler methods, enabling automatic binding to the Discord.js client
 * in accordance with registered decorator metadata. Supports both one-time and persistent event listeners.
 * Operates as a framework-level event adapter that connects dependency-injected classes to Discord's gateway events.
 * 
 * Logically separates event discovery, registration, and error-wrapped listener binding with comprehensive diagnostics.
 * 
 * Intended for framework-internal use.
 */
@singleton()
export class EventRegistry {
	constructor(@inject(LoggerService) private readonly _logger: LoggerService) {}

	/**
	 * Stores mappings from Discord event names to lists of registered handler methods and their owning instances.
	 * The map key is the Discord event name (corresponding to `Events` keys); the value is an array of handler records.
	 * Each record holds an owning instance and the method reference.
	 * @private
	 */
	private eventHandlers = new Map<string, Array<{
		instance: any;
		handler: (..._args: any[]) => void | Promise<void>;
	}>>();

	/**
	 * Registers an event handler class and its relevant methods extracted from event decorator metadata.
	 * Looks for metadata on both the provided handler class type and the constructed instance's type.
	 * 
	 * If no event handler methods are found, no action occurs.
	 * 
	 * @param handlerClass The constructor of the handler class.
	 * @param instance The DI-resolved instance of the handler.
	 */
	public registerEventHandler(
		handlerClass: new (..._args: any[]) => any,
		instance: any,
	): void {
		this._logger.debug('EventRegistry', `Registering event handler: ${handlerClass.name}`);
		let metadata = Reflect.getMetadata(EVENT_METADATA_KEY, handlerClass);
		if (!metadata || metadata.length === 0) {
			metadata = Reflect.getMetadata(EVENT_METADATA_KEY, instance.constructor);
		}

		if (!metadata || metadata.length === 0) {
			this._logger.debug('EventRegistry', `No event handlers found in ${handlerClass.name}`);
			return;
		}

		for (const { methodName, metadata: eventMetadata } of metadata) {
			const eventName = eventMetadata.event;
			const handler = instance[methodName].bind(instance);

			if (!this.eventHandlers.has(eventName)) {
				this.eventHandlers.set(eventName, []);
			}
			this.eventHandlers.get(eventName)!.push({
				instance,
				handler,
			});

			this._logger.debug(
				'EventRegistry',
				`Registered event handler: ${eventName} -> ${handlerClass.name}.${methodName}`,
				{
					eventName,
					handlerClass: handlerClass.name,
					methodName,
					once: eventMetadata.once,
				},
			);
		}
	}

	/**
	 * Activates all discovered event handlers by binding them as listeners on the supplied Discord.js client.
	 * Handles both persistent (`.on`) and one-shot (`.once`) listener registration per handler's metadata.
	 * Wraps all handlers in error-safe async wrappers to ensure propagation of exceptions to the logger.
	 * 
	 * This should be called when the bot client is fully constructed and capable of receiving events.
	 * 
	 * @param client The Discord.js client to attach event listeners to.
	 */
	public registerWithClient(client: Client): void {
		this._logger.debug('EventRegistry', 'Registering event handlers with Discord client');

		for (const [eventName, handlers] of this.eventHandlers.entries()) {
			const eventKey = eventName as keyof typeof Events;
			const eventValue = Events[eventKey];
			const event = eventValue as keyof ClientEvents;

			this._logger.debug('EventRegistry', `Setting up ${handlers.length} handler(s) for event: ${eventName}`, {
				eventName,
				handlerCount: handlers.length,
			});

			for (const { handler, instance } of handlers) {
				const metadata = Reflect.getMetadata(EVENT_METADATA_KEY, instance.constructor);
				const eventMetadata = metadata?.find((m: any) => m.metadata.event === eventName);

				const wrappedHandler = async (...handlerArgs: any[]) => {
					try {
						await handler(...handlerArgs);
					} catch (error) {
						this._logger.error(
							'EventRegistry',
							`Error in handler for ${event}`,
							error instanceof Error ? error : new Error(String(error)),
							{
								eventName,
								event,
								handlerClass: instance.constructor.name,
							},
						);
					}
				};

				if (eventMetadata?.metadata.once) {
					client.once(event, wrappedHandler as any);
					this._logger.debug('EventRegistry', `Registered once handler for: ${eventName}`);
				} else {
					client.on(event, wrappedHandler as any);
					this._logger.debug('EventRegistry', `Registered persistent handler for: ${eventName}`);
				}
			}
		}
		this._logger.debug('EventRegistry', 'All event handlers registered with Discord client');
	}

	/**
	 * Retrieves the full registry of all mapped event names and their corresponding handlers.
	 * 
	 * @returns A `Map` associating each event name with all registered handler records for that event.
	 */
	public getEventHandlers(): Map<string, Array<{ instance: any; handler: (..._args: any[]) => void | Promise<void> }>> {
		return this.eventHandlers;
	}
}
