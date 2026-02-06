import { container } from 'tsyringe';
import { FrameworkError } from './base.error';
import type { ErrorCode } from './error-codes';
import { LoggerService } from '@/services';

/**
 * Represents an error occurring during the execution or resolution of a Discord command.
 *
 * This error type is thrown when a command cannot be found, fails validation, or encounters an internal failure.
 * In addition to a technical error message and strongly typed error code, it provides a user-facing message safe to display
 * directly to Discord users. Sensitive or internal details should only appear in the internal error message, not in the user message.
 *
 * The error is automatically logged upon creation if a logger is available.
 */
export class CommandError extends FrameworkError {
	/**
	 * Error code that uniquely identifies the type of command error, for error handling and diagnostics.
	 */
	public readonly code: ErrorCode;

	/**
	 * User-facing error message, appropriate for display to Discord end users.
	 * This message is sanitized to avoid disclosing sensitive implementation details.
	 */
	public readonly userMessage: string;

	/**
	 * Constructs a new CommandError instance.
	 * 
	 * @param message - Internal error message describing the nature of the failure (for diagnostics and logging).
	 * @param code - Error code corresponding to the type of command error.
	 * @param userMessage - Optional user-safe message for presentation to end users. If omitted, a default generic message is used.
	 */
	constructor(
		message: string,
		code: ErrorCode,
		userMessage?: string,
	) {
		super(message);
		this.code = code;
		this.userMessage = userMessage ?? 'An error occurred while executing the command.';

		// Attempt to log the creation of the command error.
		try {
			const logger = container.resolve(LoggerService);
			logger.error('Error', 'Command error created', this, {
				errorCode: code,
				userMessage: this.userMessage,
			});
		}
		catch {
			// Logger not available; skip logging.
		}
	}
}

/**
 * Type guard to determine if a given value is a CommandError instance.
 *
 * @param error - The value to check.
 * @returns True if the value is a CommandError, otherwise false.
 */
export function isCommandError(error: unknown): error is CommandError {
	return error instanceof CommandError;
}
