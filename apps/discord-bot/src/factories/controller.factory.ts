import { singleton, container, inject } from 'tsyringe';

import { SlashController, PrefixController } from '@/base';
import { LoggerService } from '@/services';

/**
 * Defines a type for any controller constructor leveraging dependency injection.
 *
 * Enables type-safe instantiation of controllers that require managed dependencies.
 *
 * @template TController Controller type to be constructed.
 */
type ControllerConstructor<TController> = new (..._args: unknown[]) => TController;

/**
 * Provides a strongly-typed factory for the construction of controller instances using the DI container.
 *
 * Enables the creation of slash command controllers, prefix command controllers, or generic controllers, 
 * all with dependencies automatically resolved by the tsyringe container.
 *
 * The factory applies structured debug logging for each instantiation operation to aid diagnostics and traceability.
 *
 * Utilizes the singleton pattern to ensure a single shared factory throughout the application's lifecycle.
 */
@singleton()
export class ControllerFactory {
	/**
	 * Constructs a ControllerFactory with a logger injected for diagnostics.
	 *
	 * @param _logger Logger instance used to emit debug information during controller creation.
	 */
	constructor(@inject(LoggerService) private readonly _logger: LoggerService) {}

	/**
	 * Instantiates a slash command controller of the specified type, injecting all registered dependencies.
	 *
	 * Emits debug logs before and after instantiation.
	 *
	 * @template TController The type of slash controller to create. Must extend {@link SlashController}.
	 * @param ControllerClass The controller class reference to instantiate.
	 * @returns A fully constructed controller instance of the provided type.
	 */
	public createSlashController<TController extends SlashController>(
		ControllerClass: ControllerConstructor<TController>,
	): TController {
		this._logger.debug('ControllerFactory', `Creating slash controller: ${ControllerClass.name}`);
		const controller = container.resolve(ControllerClass);
		this._logger.debug('ControllerFactory', `Slash controller created: ${ControllerClass.name}`);
		return controller;
	}

	/**
	 * Instantiates a prefix command controller of the specified type, injecting all registered dependencies.
	 *
	 * Debug logs are produced surrounding the instantiation operation.
	 *
	 * @template TController The type of prefix controller to create. Must extend {@link PrefixController}.
	 * @param ControllerClass The class reference for the prefix controller to instantiate.
	 * @returns A fully constructed controller instance of the specified type.
	 */
	public createPrefixController<TController extends PrefixController>(
		ControllerClass: ControllerConstructor<TController>,
	): TController {
		this._logger.debug('ControllerFactory', `Creating prefix controller: ${ControllerClass.name}`);
		const controller = container.resolve(ControllerClass);
		this._logger.debug('ControllerFactory', `Prefix controller created: ${ControllerClass.name}`);
		return controller;
	}

	/**
	 * Instantiates any class using the dependency injection container, resolving all constructor dependencies.
	 * 
	 * Emits debug logging before and after creation for traceability.
	 *
	 * @template TInstance The type of instance to create.
	 * @param Class The class reference to instantiate.
	 * @returns The instantiated object with dependencies injected.
	 */
	public create<TInstance>(
		Class: ControllerConstructor<TInstance>,
	): TInstance {
		this._logger.debug('ControllerFactory', `Creating controller: ${Class.name}`);
		const instance = container.resolve(Class);
		this._logger.debug('ControllerFactory', `Controller created: ${Class.name}`);
		return instance;
	}
}
