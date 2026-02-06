/**
 * @module interaction.types
 * @description
 * Type definitions for the interaction controller system, including
 * configuration options, metadata structures, and type constants.
 */

/**
 * Supported Discord interaction types for the interaction controller framework.
 *
 * These types correspond to Discord.js interaction type checks:
 * - button: interaction.isButton()
 * - selectMenu: interaction.isAnySelectMenu()
 * - modal: interaction.isModalSubmit()
 * - autocomplete: interaction.isAutocomplete()
 * - any: matches all interaction types
 */
export type InteractionType = 'button' | 'selectMenu' | 'modal' | 'autocomplete' | 'any';

/**
 * Configuration options for the @Interaction decorator.
 *
 * Defines how an interaction controller should be registered and what
 * interactions it should handle. The framework uses these options to
 * route interactions to the appropriate controller.
 *
 * @property type - The type of interaction this controller handles.
 *                  Use 'any' to handle multiple types within the controller.
 * @property customIdPattern - A pattern to match against the interaction's custom ID.
 *                             Supports wildcards (*) for flexible matching.
 *                             Examples: 'shop:buy:*', 'orders:*', 'confirm:*:*'
 * @property description - Optional description for documentation and debugging.
 */
export interface InteractionOptions {
	readonly type: InteractionType;
	readonly customIdPattern?: string;
	readonly description?: string;
}

/**
 * Represents the metadata stored by the framework for each class decorated with @Interaction.
 *
 * Internal use: Allows auto-discovery, validation, and registration of interaction
 * controllers using reflection.
 *
 * @property methodName - The name of the class method to invoke (always 'handle').
 * @property options - The associated configuration specifying how to route interactions.
 */
export interface InteractionMetadata {
	readonly methodName: string;
	readonly options: InteractionOptions;
}

/**
 * Unique symbol used as a metadata key for attaching interaction metadata to classes.
 *
 * Ensures safe, collision-free reflection-based registration and retrieval of
 * interaction controller details.
 */
export const INTERACTION_METADATA_KEY = Symbol('interaction:metadata');

