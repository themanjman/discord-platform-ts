import { singleton, inject } from 'tsyringe';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BotConfig } from '@/config';

/**
 * Provides an application-wide, dependency-injected logger using Winston.
 *
 * Features:
 * - Multi-level logging (debug, info, warn, error).
 * - Structured message formatting using metadata and module source.
 * - Daily file rotation for all log levels, with separate files for combined, debug, info, warn, and error logs.
 * - Automatic creation of a logs directory if absent.
 * - Human-readable console formatting and structured JSON formatting for files.
 * - Flexible log level configuration via application config.
 * - Ensured singleton for consistent log output throughout codebase.
 */
@singleton()
export class LoggerService {
	private readonly logger: winston.Logger;
	private readonly logDir = 'logs';

	/**
	 * Constructs the logging service, optionally creating the logs directory.
	 * Initializes all transports and log level configurations.
	 * @param _config Application configuration for logger.
	 */
	constructor(@inject(BotConfig) private readonly _config: BotConfig) {
		if (!existsSync(this.logDir)) {
			mkdirSync(this.logDir, { recursive: true });
		}
		this.logger = this.createLogger();
	}

	/**
	 * Instantiates and configures the core Winston logger with transports.
	 * Validates configuration and sets up formatting, rotation, and log files.
	 * @returns Configured Winston logger instance.
	 * @throws When unsupported log providers are specified in configuration.
	 */
	private createLogger(): winston.Logger {
		const { logLevel, logProvider } = this._config;
		if (logProvider !== 'winston') {
			throw new Error(`Unsupported log provider: ${logProvider}. Only 'winston' is currently supported.`);
		}

		const logFormat = winston.format.combine(
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
			winston.format.errors({ stack: true }),
			winston.format.json(),
		);

		const consoleFormat = winston.format.combine(
			winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
			winston.format.colorize(),
			winston.format.printf((info: any) => {
				const { timestamp, level, module, message, stack, ...meta } = info;
				let log = `${timestamp} [${level}] [${module || 'Unknown'}] ${message}`;
				if (stack) {
					log += `\n${stack}`;
				}
				if (Object.keys(meta).length > 0) {
					log += `\n${JSON.stringify(meta, null, 2)}`;
				}
				return log;
			}),
		);

		const baseOptions = {
			datePattern: 'YYYY-MM-DD',
			maxSize: '20m',
			maxFiles: '14d',
			format: logFormat,
			zippedArchive: true,
		} as const;

		const transports: winston.transport[] = [
			new winston.transports.Console({
				level: logLevel,
				format: consoleFormat,
			}),
			new DailyRotateFile({
				...baseOptions,
				filename: join(this.logDir, 'combined-%DATE%.log'),
				level: logLevel,
			} as DailyRotateFile.DailyRotateFileTransportOptions),
			new DailyRotateFile({
				...baseOptions,
				filename: join(this.logDir, 'debug-%DATE%.log'),
				level: 'debug',
			} as DailyRotateFile.DailyRotateFileTransportOptions),
			new DailyRotateFile({
				...baseOptions,
				filename: join(this.logDir, 'info-%DATE%.log'),
				level: 'info',
			} as DailyRotateFile.DailyRotateFileTransportOptions),
			new DailyRotateFile({
				...baseOptions,
				filename: join(this.logDir, 'warn-%DATE%.log'),
				level: 'warn',
			} as DailyRotateFile.DailyRotateFileTransportOptions),
			new DailyRotateFile({
				...baseOptions,
				filename: join(this.logDir, 'error-%DATE%.log'),
				level: 'error',
			} as DailyRotateFile.DailyRotateFileTransportOptions),
		];

		return winston.createLogger({
			level: logLevel,
			format: logFormat,
			transports,
			exitOnError: false,
		});
	}

	/**
	 * Logs a message at the debug level.
	 * 
	 * @param module Name representing the calling module or class.
	 * @param message Log message describing the entry or diagnostic event.
	 * @param meta Optional object containing structured metadata for context.
	 */
	public debug(module: string, message: string, meta?: object): void {
		this.logger.debug(message, { module, ...meta });
	}

	/**
	 * Logs a message at the info level.
	 *
	 * @param module Name representing the calling module or class.
	 * @param message Log message illustrating a successful or benign event.
	 * @param meta Optional metadata for additional context.
	 */
	public info(module: string, message: string, meta?: object): void {
		this.logger.info(message, { module, ...meta });
	}

	/**
	 * Logs a message at the warning level.
	 * 
	 * @param module Name or identifier for the calling module or layer.
	 * @param message Descriptive warning for non-critical issues.
	 * @param meta Optional supplemental structured data.
	 */
	public warn(module: string, message: string, meta?: object): void {
		this.logger.warn(message, { module, ...meta });
	}

	/**
	 * Logs a message at the error level, accepting Error objects or custom error metadata.
	 * Accommodates structured logging and enriches entries with stack traces where available.
	 *
	 * @param module Name or symbol representing the invocation context.
	 * @param message Short description for the error event.
	 * @param error Optional Error object or plain object providing error details.
	 * @param meta Optional supplemental context or diagnostic fields.
	 */
	public error(module: string, message: string, error?: Error | object, meta?: object): void {
		if (error instanceof Error) {
			this.logger.error(message, {
				module,
				error: {
					name: error.name,
					message: error.message,
					stack: error.stack,
				},
				...meta,
			});
		}
		else if (error) {
			this.logger.error(message, { module, ...error, ...meta });
		}
		else {
			this.logger.error(message, { module, ...meta });
		}
	}

	/**
	 * Retrieves the underlying Winston logger instance.
	 * Designed for advanced or fine-grained logging use cases.
	 *
	 * @returns Winston.Logger used as the backend logger.
	 */
	public getLogger(): winston.Logger {
		return this.logger;
	}
}
