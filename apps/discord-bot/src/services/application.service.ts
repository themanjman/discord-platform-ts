import { singleton, inject, container } from 'tsyringe';
import { BotService } from './bot.service';
import { ErrorHandlerService } from './error-handler.service';
import { StartupService } from './startup.service';
import { LoggerService } from './logger.service';

/**
 * The Application class serves as the entry point and primary orchestrator for the Discord bot framework.
 *
 * This service is responsible for performing all application-level bootstrapping, 
 * including initializing error handling, presenting startup diagnostics, and launching
 * the bot's core services. It defines the root of the dependency injection graph 
 * and coordinates the controlled startup sequence of critical framework components.
 * 
 * Implements robust logging for each phase of startup, and ensures
 * that application errors are handled gracefully from the earliest stage of initialization.
 * 
 * Designed for singleton usage and managed via dependency injection to guarantee
 * a single, consistent application lifecycle manager instance throughout the application lifetime.
 */
@singleton()
export class Application {
	/**
	 * Constructs the Application service with injected dependencies.
	 * 
	 * @param _botService - The core BotService to be started and managed by the application.
	 * @param _logger - LoggerService used for all startup and lifecycle event diagnostics.
	 */
	constructor(
		@inject(BotService) private readonly _botService: BotService,
		@inject(LoggerService) private readonly _logger: LoggerService,
	) {}

	/**
	 * Performs the complete initialization and controlled startup of the application.
	 * 
	 * This method sets up global error handling, displays startup metadata and diagnostics,
	 * initializes all core framework components, and starts the bot instance. It must be called once to 
	 * bootstrap the application lifecycle and activate the Discord integration.
	 * 
	 * Provides granular debug and informational logging throughout the process. Ensures
	 * that services are initialized in the correct order and startup errors are centrally handled.
	 * 
	 * @returns Promise<void> Resolves when startup is complete and the bot is running.
	 * @throws Propagates any fatal startup errors not handled by ErrorHandlerService.
	 */
	public async start(): Promise<void> {
		this._logger.info('Application', 'Starting application initialization...');

		// Setup global error handling to capture all initialization errors
		this._logger.debug('Application', 'Initializing error handler service...');
		const errorHandler = container.resolve(ErrorHandlerService);
		errorHandler.initialize();

		// Display version, environment, configuration, and diagnostics as part of startup
		this._logger.debug('Application', 'Displaying startup information...');
		const startupService = container.resolve(StartupService);
		startupService.displayAll();

		// Start the Discord bot and related subsystems
		this._logger.debug('Application', 'Starting bot service...');
		await this._botService.start();

		// Mark successful startup completion and notify via logging
		this._logger.debug('Application', 'Displaying startup success message...');
		startupService.displayStartupSuccess();

		this._logger.info('Application', 'Application startup completed successfully');
	}
}
