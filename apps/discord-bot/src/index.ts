/**
 * @file Entry point for the Discord Bot Framework.
 * @summary Bootstraps the application and manages high-level process lifecycle for the Discord bot.
 *
 * Loads reflection metadata, initializes core dependencies via dependency injection,
 * and coordinates application startup in a fault-tolerant manner.
 * 
 * Handles all exceptions that may arise during initialization, including both synchronous and
 * asynchronous failures, and delegates error processing to a centralized error handler service.
 * Ensures that failures are logged appropriately and that the process lifecycle remains managed,
 * with no unexpected exits on boot errors.
 *
 * @module discord-bot
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { ApplicationFactory } from '@/factories';
import { LoggerService } from '@/services';

/**
 * Orchestrates initialization of the Discord bot application.
 *
 * Attempts to retrieve the logger service at boot, logging key startup stages. Handles errors
 * that may occur during startup by logging them through the logger service (if available), or
 * falling back to console output as a last resort.
 *
 * Relies on a centralized error handler service to determine process recovery or uptime management,
 * and never exits the process directly from the bootstrap logic.
 *
 * @throws {Error} If initialization fails, errors are logged and surfaced to the central handler, but the process remains alive.
 * @returns {Promise<void>} Resolves when the application starts, or in the event of errors, once they are handled or logged.
 */
async function bootstrap(): Promise<void> {
	let logger: LoggerService | null = null;

	try {
		try {
			logger = container.resolve(LoggerService);
			logger.info('Bootstrap', 'Starting application bootstrap...');
		} catch {
			// Logger not available; continue bootstrapping and fall back to console logging if needed
		}

		const applicationFactory = new ApplicationFactory();
		const application = applicationFactory.create();
		await application.start();

		if (logger) {
			logger.info('Bootstrap', 'Application bootstrap completed successfully');
		}
	} catch (error) {
		if (logger) {
			logger.error(
				'Bootstrap',
				'Failed to start application',
				error instanceof Error ? error : new Error(String(error)),
				{
					errorType: error instanceof Error ? error.constructor.name : typeof error,
				}
			);
			logger.info('Bootstrap', 'Application will attempt to continue...');
		} else {
			// Fallback logging to console
			const timestamp = new Date().toISOString();
			console.error(`[${timestamp}] [BOOTSTRAP_ERROR] Failed to start application:`);
			if (error instanceof Error) {
				console.error(`  Error: ${error.message}`);
				if (error.stack) {
					console.error(`  Stack: ${error.stack}`);
				}
			} else {
				console.error('  Error:', error);
			}
		}
		// Do not exit process here; error handler service governs recovery strategy
	}
}

/**
 * Initiates the Discord bot startup process and ensures robust global error management.
 *
 * Invokes the bootstrap routine; captures any unhandled errors that escape the initialization phase.
 * All critical failures during initialization are logged via the logger service if available,
 * or otherwise output to the console. Delegates lifecycle management and recovery to a central
 * error handler, never terminating the process directly in this entry point.
 */
bootstrap().catch((error: unknown) => {
	let logger: LoggerService | null = null;
	try {
		logger = container.resolve(LoggerService);
	} catch {
		// Logger service unavailable; fall back to console
	}

	if (logger) {
		logger.error(
			'Bootstrap',
			'Critical error during bootstrap',
			error instanceof Error ? error : new Error(String(error)),
			{
				errorType: error instanceof Error ? error.constructor.name : typeof error,
				fatal: true,
			}
		);
	} else {
		const timestamp = new Date().toISOString();
		console.error(`[${timestamp}] [BOOTSTRAP_FATAL] Critical error during bootstrap:`, error);
	}
	// Let error handling services handle process lifecycle; never exit directly here
});
