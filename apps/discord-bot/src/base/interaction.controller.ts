import type { Interaction } from 'discord.js';

/**
 * Abstract base class for interaction controllers.
 *
 * All controllers for Discord interactions (buttons, select menus, modals, autocomplete)
 * must extend this class and provide implementations for the {@link canHandle} and {@link handle} methods.
 * Ensures a consistent and type-safe interface for interaction handling throughout the application.
 *
 * Controllers are routed based on:
 * 1. The @Interaction decorator metadata (type and customIdPattern)
 * 2. The canHandle() method for additional runtime checks
 *
 * This contract enforces correct method signature and error signaling, promoting
 * robust and maintainable interaction logic for Discord interactions.
 *
 * @abstract
 *
 * @example
 * ```typescript
 * @singleton()
 * @Interaction({
 *   type: 'button',
 *   customIdPattern: 'shop:buy:*',
 *   description: 'Handles shop purchase buttons'
 * })
 * export class ShopBuyController extends InteractionController {
 *   canHandle(interaction: Interaction): boolean {
 *     // Additional checks beyond decorator metadata
 *     return true;
 *   }
 *
 *   async handle(interaction: Interaction): Promise<void> {
 *     // Handle the button click
 *   }
 * }
 * ```
 */
export abstract class InteractionController {
	/**
	 * Determines if this controller can handle the given interaction.
	 *
	 * This method is called after the decorator-based routing (type and pattern matching).
	 * Use it for additional runtime checks that can't be expressed in the decorator,
	 * such as checking user permissions, state, or complex conditions.
	 *
	 * For most cases, the decorator metadata is sufficient and this can return true.
	 *
	 * @param interaction - The Discord.js interaction to check.
	 * @returns True if this controller can handle the interaction, false otherwise.
	 */
	abstract canHandle(interaction: Interaction): boolean;

	/**
	 * Handles the interaction logic.
	 *
	 * Invoked automatically when an interaction matches this controller's criteria
	 * (both decorator metadata and canHandle() return true).
	 * Implementations should handle the main business logic for the interaction,
	 * including interacting with Discord's API and sending responses to the user.
	 *
	 * @param interaction - The Discord.js interaction object to handle.
	 * @returns Promise<void> Resolves when all interaction processing is complete, including asynchronous operations.
	 *
	 * @throws {CommandError} If interaction processing fails due to internal errors.
	 * @throws {PermissionError} If the invoker does not meet permission requirements for this interaction.
	 */
	abstract handle(interaction: Interaction): Promise<void>;
}

