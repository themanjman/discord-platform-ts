import { container } from 'tsyringe';
import type { ErrorCode } from './error-codes';
import { LoggerService } from '@/services';

/**
 * Abstract base class for framework-specific errors.
 *
 * All custom errors within the framework should extend this class to ensure consistent
 * error structure and handling. This class enforces the presence of an error code and
 * maintains proper stack traces. Error objects derived from this base class are suitable
 * for programmatic identification, logging, and user-facing messaging.
 *
 * Each subclass must define a unique error code as a readonly property to facilitate
 * robust error tracking and filtering. Stack trace information is preserved for all errors.
 *
 * Logger service is invoked at error creation and serialization, if available, to provide
 * diagnostic logging and traceability of error occurrences.
 *
 * @abstract
 */
export abstract class FrameworkError extends Error {
	/**
	 * Error code uniquely identifying this error type.
	 * Used for diagnostic logging and structured error handling.
	 */
	public abstract readonly code: ErrorCode;

	/**
	 * Constructs a new FrameworkError instance.
	 *
	 * @param message - The error message describing the error context.
	 */
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;

		// Ensure clean stack trace for V8 engines.
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}

		// Attempt to log the error creation, if LoggerService is available.
		try {
			const logger = container.resolve(LoggerService);
			logger.error('Error', `Error created: ${this.constructor.name}`, this, {
				errorName: this.name,
				errorCode: (this as any).code,
			});
		}
		catch {
			// Logger not available, skip logging.
		}
	}

	/**
	 * Generates a string representation of the error including the code.
	 *
	 * @returns A formatted error string containing the error code and message.
	 */
	public override toString(): string {
		const result = `[${this.code}] ${this.name}: ${this.message}`;

		// Attempt to log error serialization, if LoggerService is available.
		try {
			const logger = container.resolve(LoggerService);
			logger.debug('Error', `Error serialized: ${this.constructor.name}`, {
				errorName: this.name,
				errorCode: (this as any).code,
			});
		}
		catch {
			// Logger not available, skip logging.
		}

		return result;
	}
}

/**
 * Type guard to determine if a given error is an instance of FrameworkError.
 *
 * This function enables reliable identification of framework-specific errors in
 * error handling routines, allowing for specialized handling or reporting.
 *
 * @param error - The value to be checked.
 * @returns True if the error is a FrameworkError, otherwise false.
 */
export function isFrameworkError(error: unknown): error is FrameworkError {
	return error instanceof FrameworkError;
}

