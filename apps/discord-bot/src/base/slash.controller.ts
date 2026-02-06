import type { ChatInputCommandInteraction } from 'discord.js';

/**
 * Abstract base class for slash command controllers.
 *
 * All controllers for slash commands must extend this class and provide
 * an implementation for the {@link execute} method. Ensures a consistent
 * and type-safe interface for slash command handling throughout the application.
 *
 * This contract enforces correct method signature and error signaling, promoting
 * robust and maintainable command logic for Discord slash interactions.
 *
 * @abstract
 */
export abstract class SlashController {
	/**
	 * Execute the logic associated with the slash command.
	 *
	 * Invoked automatically when the relevant slash command is issued
	 * by a user. Implementations should handle the main business logic
	 * for the command, including interacting with Discord's API and
	 * sending responses to the user.
	 *
	 * @param _interaction - The Discord.js interaction object representing the user command.
	 * @returns Promise<void> Resolves when all command processing is complete, including asynchronous operations.
	 *
	 * @throws {CommandError} If command processing fails due to internal errors.
	 * @throws {PermissionError} If the invoker does not meet permission requirements for this command.
	 */
	abstract execute(_interaction: ChatInputCommandInteraction): Promise<void>;
}
