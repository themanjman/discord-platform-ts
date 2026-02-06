/**
 * @module registries
 * 
 * Central entry point for all command and interaction registries used by the Discord bot framework.
 * 
 * Registries exposed here are responsible for managing the registration, execution, and validation
 * of slash commands, prefix commands, and interaction controllers. These constructs ensure consistent handling of commands including:
 * - Dispatching user interactions to the correct handlers
 * - Enforcing execution context and input validation
 * - Providing robust error boundaries for command execution
 * - Integrating command management with the application lifecycle
 * 
 * All registries adhere to framework conventions regarding extensibility, error propagation,
 * and structured registration of commands and interactions.
 */
export { InteractionControllerRegistry } from './interaction-controller.registry';
export { PrefixCommandRegistry } from './prefix-command.registry';
export { SlashCommandRegistry } from './slash-command.registry';
