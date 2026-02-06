/**
 * @module factories
 * 
 * This module centralizes and exposes all root-level factory classes used within the Discord bot framework.
 * 
 * Factories exported here are responsible for constructing core service and controller instances,
 * leveraging dependency injection and configuration to automate application composition and bootstrapping.
 * 
 * - Use ApplicationFactory for orchestrating application startup and dependency graph resolution.
 * - Use ControllerFactory for creating command/controller classes with managed lifecycles and injected dependencies.
 * 
 * All factories should be strongly-typed, DI-compliant, and adhere to framework creation policies.
 */
export { ApplicationFactory } from './application.factory';
export { ControllerFactory } from './controller.factory';
