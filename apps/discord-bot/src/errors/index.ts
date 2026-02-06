/**
 * @module errors
 * 
 * Provides core error codes, error base classes, and strongly-typed custom error classes for the Discord bot framework.
 * 
 * This module enables structured error handling, consistent error reporting, and robust error categorization throughout the codebase.
 * 
 * - Centralizes all framework error codes for programmatic reference.
 * - Exports abstract and concrete error classes such as {@link FrameworkError}, {@link CommandError}, {@link PermissionError}, and {@link ValidationError}.
 * - Facilitates user-facing and internal error messaging separation.
 * - Supports error type guards and strong typing for error-driven logic.
 * - Designed to be extended for additional error domains as the framework evolves.
 */

export * from './error-codes';
export * from './base.error';
export * from './command.error';
export * from './permission.error';
export * from './validation.error';
