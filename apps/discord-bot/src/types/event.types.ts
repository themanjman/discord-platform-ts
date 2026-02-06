import type { Events } from 'discord.js';

/**
 * Represents metadata attached by the event decorating functions (`@On`, `@Once`) to a class method.
 * 
 * This metadata specifies which Discord.js event the handler targets, and whether it is a one-time
 * or persistent subscription. It enables the automatic binding of decorated methods to Discord gateway events
 * at runtime, supporting event system extensibility and dynamic registration.
 * 
 * @property event      The Discord.js event name to subscribe to (corresponds to a `keyof typeof Events`).
 * @property once       Optional; if true, the handler will be registered for a single execution, removed after firing.
 */
export interface EventMetadata {
	readonly event: keyof typeof Events;
	readonly once?: boolean;
}

/**
 * Structure holding the full metadata for an event handler method, as recorded during decoration.
 * 
 * Includes both the name of the decorated method and the associated event subscription metadata, facilitating
 * introspection and registration within the event binding system.
 * 
 * @property methodName   The exact method name in the class that serves as the event handler.
 * @property metadata     The event metadata detailing the target event and handler semantics.
 */
export interface EventHandlerMetadata {
	readonly methodName: string;
	readonly metadata: EventMetadata;
}

/**
 * Unique symbol used as the metadata key for associating event handler metadata with class definitions.
 * 
 * Used by decorators and event registry logic to store and retrieve relevant metadata describing
 * event subscriptions and handler configurations, avoiding collisions with other metadata keys.
 */
export const EVENT_METADATA_KEY = Symbol('event:metadata');
