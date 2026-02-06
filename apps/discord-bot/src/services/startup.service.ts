import { singleton, container, inject } from 'tsyringe';
import { BotConfig } from '@/config';
import { PrefixCommandRegistry } from '@/registries';
import { LoggerService } from './logger.service';

/**
 * StartupService provides diagnostic feedback and structured status details during the application bootstrap process.
 *
 * This singleton is responsible for outputting banners, configuration insight, registered command diagnostics,
 * and application readiness state through console and logger facilities. All operations are non-blocking and intended for
 * direct invocation during the server start sequence.
 *
 * @remarks
 * - Designed for launch-time feedback to both the operator and log archives.
 * - Relies on dependency injection for logger and registry access.
 * - All methods are safe to call independently or in sequence.
 */
@singleton()
export class StartupService {
	/**
	 * Constructs the StartupService.
	 * @param _logger Logger service for structured status output.
	 */
	constructor(@inject(LoggerService) private readonly _logger: LoggerService) {}

	/**
	 * Outputs a stylized application startup banner showing core process and environment information.
	 * The banner is written to stdout and can assist operators in verifying instance launch, platform,
	 * and time. Includes timestamp, Node.js version, platform, and process ID.
	 */
	public displayStartupBanner(): void {
		const timestamp = new Date().toISOString();
		const nodeVersion = process.version;
		const platform = process.platform;
		const arch = process.arch;

		console.log('\n' + '='.repeat(70));
		console.log('  Discord Bot Framework - Starting Application');
		console.log('='.repeat(70));
		console.log(`  Timestamp:     ${timestamp}`);
		console.log(`  Node Version:  ${nodeVersion}`);
		console.log(`  Platform:      ${platform} (${arch})`);
		console.log(`  PID:           ${process.pid}`);
		console.log('='.repeat(70) + '\n');
	}

	/**
	 * Outputs high-level configuration parameters relevant to launch to the console and logger.
	 * Reads current configuration from DI and publishes command prefix, token preview, log level, and provider.
	 * Logs configuration information for audit trails and debugging.
	 *
	 * If configuration resolution fails, a warning is logged and displayed.
	 */
	public displayConfiguration(): void {
		try {
			const config = container.resolve(BotConfig);
			const prefix = config.commandPrefix;
			const tokenPreview = config.discordToken.substring(0, 10) + '...';

			console.log('  Configuration:');
			console.log(`    Command Prefix:  ${prefix}`);
			console.log(`    Token Preview:   ${tokenPreview}`);
			console.log('');

			this._logger.info('Startup', 'Configuration loaded', {
				commandPrefix: prefix,
				tokenPreview,
				logLevel: config.logLevel,
				logProvider: config.logProvider,
			});
		}
		catch (error) {
			this._logger.warn('Startup', 'Could not load configuration for display', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Displays an overview of registered prefix-based commands, including their count and identifiers.
	 * Retrieves controller registrations via DI and prints them for operator visibility, also logs summary details.
	 *
	 * If retrieval fails, a warning is surfaced on both console and logger.
	 */
	public displayCommandsInfo(): void {
		try {
			const prefixRegistry = container.resolve(PrefixCommandRegistry);
			const controllers = prefixRegistry.getControllers();
			const commandCount = controllers.size;

			console.log('  Commands:');
			console.log(`    Prefix Commands: ${commandCount}`);
			if (commandCount > 0) {
				const commandNames = Array.from(controllers.keys()).join(', ');
				console.log(`    Registered:      ${commandNames}`);
			}
			console.log('');

			this._logger.info('Startup', 'Command registration info', {
				prefixCommandCount: commandCount,
				commands: commandCount > 0 ? Array.from(controllers.keys()) : [],
			});
		}
		catch (error) {
			this._logger.warn('Startup', 'Could not load command information for display', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Shows a successful startup message, reporting full operational readiness.
	 * Prints key milestones to the console and logs application readiness.
	 */
	public displayStartupSuccess(): void {
		console.log('='.repeat(70));
		console.log('  ✓ Application started successfully');
		console.log('  ✓ All systems operational');
		console.log('  ✓ Ready to handle requests');
		console.log('='.repeat(70) + '\n');

		this._logger.info('Startup', 'Application started successfully - All systems operational');
	}

	/**
	 * Executes the main sequence of startup display routines, presenting all core diagnostic information.
	 * Invokes the banner, configuration, and command registration info outputs in a structured order.
	 */
	public displayAll(): void {
		this.displayStartupBanner();
		this.displayConfiguration();
		this.displayCommandsInfo();
	}
}
