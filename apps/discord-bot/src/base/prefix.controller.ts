import type { Message } from 'discord.js';

/**
 * Abstract base class for prefix command controllers.
 *
 * Prefix command controllers are responsible for handling commands invoked by messages
 * that begin with a specified prefix (such as ! or .). All controllers handling prefix-based
 * commands must extend this class and provide an implementation for the {@link execute} method.
 *
 * The design enforces a contract for responding to user-issued command messages, ensuring
 * consistent interface and expected error signaling for command execution and permission logic.
 *
 * @abstract
 */
export abstract class PrefixController {
	/**
	 * Execute the logic associated with the prefix command.
	 *
	 * Called when a message matches a registered prefix command. Implementations should parse any
	 * arguments and perform the appropriate command action in response. Must handle errors gracefully
	 * and return a resolved Promise upon completion.
	 *
	 * @param _message - The original Discord.js message instance that triggered the command.
	 * @param _args - An array of parsed arguments from the user input, excluding the command name itself.
	 * @returns Promise<void> Resolves when command execution (including asynchronous operations) completes.
	 *
	 * @throws {CommandError} If command execution fails due to internal errors.
	 * @throws {PermissionError} If the user does not meet permission requirements for this command.
	 */
	abstract execute(_message: Message, _args: string[]): Promise<void>;
}
