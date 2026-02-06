import { singleton, inject, container } from 'tsyringe';

import { EventRegistry } from '@/services/eventregistry.service';
import { LoggerService } from '@/services/logger.service';

/**
 * Defines a constructor signature for event handler classes.
 * This enables dependency-injected instantiation of event handlers,
 * supporting arbitrary constructor arguments according to DI rules.
 */
type EventHandlerConstructor = new (..._args: any[]) => object;

/**
 * Service to load, instantiate, and register Discord event handler classes.
 *
 * The EventLoader is responsible for orchestrating the creation and registration of
 * event handler instances. It leverages the dependency injection (DI) container to ensure
 * every handler is resolved with its dependencies, and registers each instance with the EventRegistry.
 * 
 * Logging is performed at each stage to provide visibility into the event loading process,
 * including startup diagnostics, instantiation, and registration of every handler.
 */
@singleton()
export class EventLoader {
	/**
	 * Constructs the EventLoader.
	 * 
	 * @param _registry The event registry used to register handler instances.
	 * @param _logger Logger service for diagnostic and lifecycle output.
	 */
	constructor(
		@inject(EventRegistry) private readonly _registry: EventRegistry,
		@inject(LoggerService) private readonly _logger: LoggerService,
	) {}

	/**
	 * Loads and registers an array of event handler classes.
	 * 
	 * Each event handler class provided is instantiated through the DI container, which
	 * automatically injects its declared dependencies. Every resulting handler instance is then
	 * registered with the EventRegistry for use by the bot framework.
	 * 
	 * Performs structured logging at info and debug levels regarding the number of handlers,
	 * their instantiation, and successful registration.
	 * 
	 * @param handlerClasses - The list of event handler class constructors to process and register.
	 */
	public loadEventHandlers(handlerClasses: readonly EventHandlerConstructor[]): void {
		this._logger.info('EventLoader', `Loading ${handlerClasses.length} event handler(s)...`, {
			handlerCount: handlerClasses.length,
		});

		for (const HandlerClass of handlerClasses) {
			this._logger.debug('EventLoader', `Instantiating event handler: ${HandlerClass.name}`);
			const instance = container.resolve(HandlerClass);
			this._logger.debug('EventLoader', `Registering event handler: ${HandlerClass.name}`);
			this._registry.registerEventHandler(HandlerClass, instance);
		}

		this._logger.info('EventLoader', `Successfully loaded ${handlerClasses.length} event handler(s)`);
	}
}
