import { singleton, inject } from 'tsyringe';
import { LoggerService } from './logger.service';

/**
 * Singleton service responsible for centralized global process error and shutdown handling.
 * 
 * Registers handlers for unhandled promise rejections, uncaught exceptions, Node.js process warnings,
 * and system termination signals (SIGTERM, SIGINT). This ensures that all unexpected process failures,
 * critical errors, and shutdown events are logged and managed in a controlled fashion, protecting
 * application stability and integrity.
 * 
 * Usage: Call {@link initialize} once during application startup to activate all global error handlers.
 */
@singleton()
export class ErrorHandlerService {
	/**
	 * Indicates whether the shutdown sequence has already been initiated to prevent multiple triggers.
	 */
	private isShuttingDown = false;

	/**
	 * Constructs the ErrorHandlerService with an injected logger for reporting lifecycle events and errors.
	 * 
	 * @param _logger - The diagnostic logger service.
	 */
	constructor(@inject(LoggerService) private readonly _logger: LoggerService) {}

	/**
	 * Sets up all global process event handlers for error and shutdown management.
	 * 
	 * Must be invoked exactly once during application startup. Attaches listeners to process-level events:
	 * - `unhandledRejection`: Captures all unhandled promise rejections.
	 * - `uncaughtException`: Captures uncaught exceptions thrown in synchronous code.
	 * - `warning`: Captures process warnings (such as deprecations, memory issues, etc).
	 * - `SIGTERM` and `SIGINT`: Captures termination signals for graceful shutdown.
	 * 
	 * All handled events are logged with detailed diagnostics, and the process shutdown sequence
	 * is performed gracefully where appropriate.
	 */
	public initialize(): void {
		this._logger.info('ErrorHandler', 'Initializing global error handlers');

		process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
			this.handleUnhandledRejection(reason, promise);
		});

		process.on('uncaughtException', (error: Error) => {
			this.handleUncaughtException(error);
		});

		process.on('warning', (warning: Error) => {
			this.handleWarning(warning);
		});

		process.on('SIGTERM', () => {
			this.handleShutdown('SIGTERM');
		});

		process.on('SIGINT', () => {
			this.handleShutdown('SIGINT');
		});
	}

	/**
	 * Handles unhandled promise rejections by logging comprehensive error details.
	 * 
	 * The application remains running after notification; no exit is performed.
	 * 
	 * @param reason - The rejection reason, typically an Error or string.
	 * @param promise - The promise that was rejected.
	 */
	private handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
		const error = reason instanceof Error ? reason : new Error(String(reason));
		this._logger.error('ErrorHandler', 'Unhandled promise rejection detected', error, {
			promise: promise.toString(),
			reasonType: reason instanceof Error ? reason.constructor.name : typeof reason,
		});
		this._logger.info('ErrorHandler', 'Application will continue running...');
	}

	/**
	 * Handles uncaught exceptions thrown outside of promise chains.
	 * 
	 * Logs error details and context for diagnostics. The application remains running except for fatal exceptions.
	 * 
	 * @param error - The uncaught exception error object.
	 */
	private handleUncaughtException(error: Error): void {
		this._logger.error('ErrorHandler', 'Uncaught exception detected', error, {
			errorType: error.constructor.name,
		});
		this._logger.info('ErrorHandler', 'Application will continue running...');
	}

	/**
	 * Processes and logs all Node.js process warnings with diagnostic metadata.
	 * 
	 * These may include deprecation notices, memory warnings, etc.
	 * 
	 * @param warning - The process warning error object.
	 */
	private handleWarning(warning: Error): void {
		this._logger.warn('ErrorHandler', `Process warning: ${warning.message}`, {
			stack: warning.stack,
			warningType: warning.constructor.name,
		});
	}

	/**
	 * Handles graceful shutdown on receiving relevant system signals.
	 * 
	 * Initiates a controlled shutdown process, logs all progress, and forces process exit
	 * after a fixed delay to allow for resource cleanup and final logging.
	 * 
	 * Consecutive signals after the first are ignored to prevent duplicate shutdowns.
	 * 
	 * @param signal - The string code of the signal received (e.g., 'SIGINT', 'SIGTERM').
	 */
	private handleShutdown(signal: string): void {
		if (this.isShuttingDown) {
			return;
		}

		this.isShuttingDown = true;
		this._logger.info('ErrorHandler', `Received ${signal} signal. Initiating graceful shutdown...`);
		this._logger.info('ErrorHandler', 'Application will exit in 5 seconds...');

		setTimeout(() => {
			this._logger.info('ErrorHandler', 'Forcing exit...');
			process.exit(0);
		}, 5000);
	}
}
