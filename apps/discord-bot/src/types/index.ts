/**
 * @module types
 * @description
 * Central export hub for all core type definitions used in the Discord bot framework.
 * 
 * Re-exports foundational structures, event metadata interfaces, permission specifications,
 * and command-related type contracts. This gateway enables consistent and strongly-typed
 * framework development by exposing all public type APIs in one place.
 * 
 * All individual type modules are documented in their respective files and collectively
 * facilitate safe extension, plugin development, and strict type-checking throughout
 * the codebase. Consume these exports for controller, registry, service, and decorator
 * development across the Discord bot system.
 *
 * Exports:
 *  - Event and event handler metadata types
 *  - Permission and role specifications
 *  - Prefix and slash command structures and definitions
 *  - Interaction controller metadata and options
 */

export * from './event.types';
export * from './permission.types';
export * from './prefix-command.types';
export * from './slash-command.types';
export * from './interaction.types';