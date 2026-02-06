import { container } from 'tsyringe';
import { FrameworkError } from './base.error';
import type { ErrorCode } from './error-codes';
import { LoggerService } from '@/services';

/**
 * Represents an error that occurs when user input fails validation.
 *
 * Thrown when command options, arguments, or any input payload is invalid, missing required values, or does not conform to expected constraints.
 * 
 * - Associated with an {@link ErrorCode} for programmatic classification and diagnostics.
 * - Provides a `fieldName` property to pinpoint the specific argument or field that caused the validation failure, if applicable.
 * - Exposes a user-safe error message suitable for direct display to end users, free of sensitive implementation details.
 * - Upon creation, the error is logged automatically at `warn` level using the logging service if available.
 *
 * This error type streamlines error handling and feedback for all validation-related failures in command or argument processing.
 */
export class ValidationError extends FrameworkError {
	/**
	 * Error code identifying the type of validation error.
	 * Used for error handling and structured logging.
	 */
	public readonly code: ErrorCode;

	/**
	 * Name of the field or option that failed validation.
	 * Can be undefined if the error is not specific to a field.
	 */
	public readonly fieldName: string | undefined;

	/**
	 * End-user-safe message describing the validation failure.
	 * Suitable for exposing directly to Discord users.
	 */
	public readonly userMessage: string;

	/**
	 * Constructs a new ValidationError instance.
	 *
	 * @param message - Internal error message for diagnostic and logging purposes.
	 * @param code - Error code representing the type of validation error.
	 * @param fieldName - Name of the field that failed validation, if applicable.
	 * @param userMessage - Optional user-facing error message. Defaults to a generic validation message if not specified.
	 */
	constructor(
		message: string,
		code: ErrorCode,
		fieldName?: string,
		userMessage?: string,
	) {
		super(message);
		this.code = code;
		this.fieldName = fieldName;
		this.userMessage = userMessage ?? 'Invalid input provided.';

		// Log validation error creation at warning level if LoggerService is available.
		try {
			const logger = container.resolve(LoggerService);
			logger.warn('Error', 'Validation error created', {
				errorCode: code,
				fieldName,
				userMessage: this.userMessage,
			});
		}
		catch {
			// Logger not available, skip logging.
		}
	}
}

/**
 * Determines whether a given error is a ValidationError.
 *
 * Type guard function that checks if the provided error is an instance of ValidationError.
 *
 * @param error - The value to check for ValidationError type.
 * @returns True if the value is a ValidationError instance; otherwise, false.
 */
export function isValidationError(error: unknown): error is ValidationError {
	return error instanceof ValidationError;
}
