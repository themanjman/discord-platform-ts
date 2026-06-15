/**
 * @module services
 * @description
 * Provides central exports of all singleton core service classes
 * that power the Discord bot framework. These include the application orchestrator,
 * bot lifecycle management, error handling, dependency-injected event registration,
 * logging and structured startup diagnostics.
 *
 * Each service is intended for use as a singleton (managed via dependency injection)
 * to ensure controlled, modular, and robust framework behavior spanning:
 *  - Application entry and bootstrapping
 *  - Discord client and gateway lifecycle
 *  - Structured event handler discovery and registration
 *  - Logging and operational diagnostics
 *  - Error and shutdown safety mechanisms
 *
 * Import these types for composition and extension of bot platform features,
 * infrastructure, and integration points within the framework.
 */

export { Application } from './application.service';
export { BotService } from './bot.service';
export { ErrorHandlerService } from './error-handler.service';
export { EventLoader } from './eventloader.service';
export { EventRegistry } from './eventregistry.service';
export { LoggerService } from './logger.service';
export { ModLogService, type ModLogEntry, type ModLogField } from './mod-log.service';
export { StartupService } from './startup.service';
