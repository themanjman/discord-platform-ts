import { container } from 'tsyringe';
import { FrameworkError } from './base.error';
import type { ErrorCode } from './error-codes';
import { LoggerService } from '@/services';

/**
 * Represents the execution context required for a command.
 * May be either a Discord server (guild) or direct message (dm).
 */
export type CommandContext = 'guild' | 'dm';

/**
 * Represents an error indicating insufficient permissions or incorrect context for command execution.
 *
 * Thrown when a user attempts to execute a command in an invalid context (such as guild-only or DM-only restriction),
 * or when the required Discord permissions are not met.
 * 
 * Provides structured properties for error code, required execution context, and a user-facing message.
 * 
 * Internal errors are intended for logging and diagnostics, while userMessage is suitable for direct user display.
 *
 * The error is automatically logged using the logger service if available at creation time.
 */
export class PermissionError extends FrameworkError {
	/**
	 * Unique error code signifying the permission failure type.
	 */
	public readonly code: ErrorCode;

	/**
	 * Required invocation context for the command ('guild', 'dm'), if applicable.
	 */
	public readonly requiredContext: CommandContext | undefined;

	/**
	 * Message suitable for direct user display, sanitized to avoid leaking sensitive details.
	 */
	public readonly userMessage: string;

	/**
	 * Constructs a new PermissionError with context and display customization.
	 *
	 * @param message - Internal description for diagnostics and logging.
	 * @param code - Error code specifying the kind of permission error.
	 * @param requiredContext - Execution context required for the command (optional).
	 * @param userMessage - Optional user-friendly description to present to end users.
	 */
	constructor(
		message: string,
		code: ErrorCode,
		requiredContext?: CommandContext,
		userMessage?: string,
	) {
		super(message);
		this.code = code;
		this.requiredContext = requiredContext;
		this.userMessage = userMessage ?? this.getDefaultUserMessage();

		// Log permission error creation at warn level
		try {
			const logger = container.resolve(LoggerService);
			logger.warn('Error', 'Permission error created', {
				errorCode: code,
				requiredContext,
				userMessage: this.userMessage,
			});
		}
		catch {
			// Logger not available, skip logging
		}
	}

	/**
	 * Generates a default user-facing message based on the required context.
	 *
	 * @returns An appropriate message for missing context or permission.
	 */
	private getDefaultUserMessage(): string {
		if (this.requiredContext === 'guild') {
			return 'This command can only be used in servers.';
		}
		if (this.requiredContext === 'dm') {
			return 'This command can only be used in direct messages.';
		}
		return 'You do not have permission to use this command.';
	}
}

/**
 * Determines whether a given error is a PermissionError instance.
 *
 * @param error - Value to check.
 * @returns Boolean indicating if the error is a PermissionError.
 */
export function isPermissionError(error: unknown): error is PermissionError {
	return error instanceof PermissionError;
}
