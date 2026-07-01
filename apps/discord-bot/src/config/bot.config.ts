import { resolve } from 'path';

import { singleton } from 'tsyringe';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Interface defining immutable bot configuration properties required for operation.
 * All properties represent critical app-level configuration loaded from environment variables.
 *
 * @property {string} discordToken The authentication token for the Discord bot; must be present in environment.
 * @property {string} commandPrefix The character(s) used to invoke prefix commands.
 * @property {string} version The version identifier for the bot release.
 * @property {string} botName The display name of the bot.
 * @property {string} logLevel The granularity threshold for application logging.
 * @property {string} logProvider The underlying provider or library used for logging.
 * @property {string} guildId Optional guild (server) ID for guild-specific registration of Discord commands.
 * @property {string} supportURL Optional support URL for the bot.
 * @property {ReadonlySet<string>} disabledSlashCommands Set of disabled slash command names.
 * @property {ReadonlySet<string>} disabledPrefixCommands Set of disabled prefix command names.
 * @property {boolean} disableAllSlashCommands If true, all slash commands are disabled.
 * @property {boolean} disableAllPrefixCommands If true, all prefix commands are disabled.
 * @property {string} dataDir Absolute path for guild-scoped JSON persistence.
 */
export interface IBotConfig {
	readonly discordToken: string;
	readonly commandPrefix: string;
	readonly version: string;
	readonly botName: string;
	readonly logLevel: string;
	readonly logProvider: string;
	readonly guildId?: string;
	readonly supportURL?: string;
	readonly disabledSlashCommands: ReadonlySet<string>;
	readonly disabledPrefixCommands: ReadonlySet<string>;
	readonly disableAllSlashCommands: boolean;
	readonly disableAllPrefixCommands: boolean;
	readonly dataDir: string;
}

/**
 * Provides type-safe, validated and immutable access to bot configuration sourced from environment variables.
 * Ensures that all required values are present and exposes settings as readonly properties.
 *
 * @class
 * @implements {IBotConfig}
 *
 * @throws {Error} If the required DISCORD_TOKEN environment variable is not defined.
 */
@singleton()
export class BotConfig implements IBotConfig {
	/** The Discord bot authentication token. */
	public readonly discordToken: string;

	/** The prefix used for bot commands (e.g., "!"). */
	public readonly commandPrefix: string;

	/** The current version string of the bot. */
	public readonly version: string;

	/** The name of the bot. */
	public readonly botName: string;

	/** The logging level, controlling verbosity of output. */
	public readonly logLevel: string;

	/** The logger provider implementation to use. */
	public readonly logProvider: string;

	/** Optional guild ID for guild-specific command registration. */
	public readonly guildId?: string;

	/** Optional support URL for the bot. */
	public readonly supportURL?: string;

	/** Set of disabled slash command names. Commands in this set will not be registered or executable. */
	public readonly disabledSlashCommands: ReadonlySet<string>;

	/** Set of disabled prefix command names. Commands in this set will not be registered or executable. */
	public readonly disabledPrefixCommands: ReadonlySet<string>;

	/** If true, all slash commands are disabled regardless of individual settings. */
	public readonly disableAllSlashCommands: boolean;

	/** If true, all prefix commands are disabled regardless of individual settings. */
	public readonly disableAllPrefixCommands: boolean;

	/** Absolute path for guild-scoped JSON persistence. */
	public readonly dataDir: string;

	/**
	 * Constructs and validates the bot config, reading required and optional settings from process.env.
	 * Throws if authentication token is missing to protect application from invalid state.
	 */
	constructor() {
		const discordToken: string | undefined = process.env.DISCORD_TOKEN;
		const commandPrefix: string | undefined = process.env.COMMAND_PREFIX;
		const version: string | undefined = process.env.VERSION;
		const botName: string | undefined = process.env.BOT_NAME;
		const logLevel: string | undefined = process.env.LOG_LEVEL;
		const logProvider: string | undefined = process.env.LOG_PROVIDER;
		const guildId: string | undefined = process.env.GUILD_ID;
		const supportURL: string | undefined = process.env.SUPPORT_URL;
		const dataDirRaw: string = process.env.DATA_DIR || 'data';

		if (!discordToken) {
			throw new Error('DISCORD_TOKEN environment variable is required but not set');
		}

		this.discordToken = discordToken;
		this.commandPrefix = commandPrefix || '!';
		this.version = version || '1.0.0';
		this.botName = botName || 'Discord Bot';
		this.logLevel = logLevel || 'info';
		this.logProvider = logProvider || 'winston';
		this.guildId = guildId;
		this.supportURL = supportURL;
		this.dataDir = resolve(process.cwd(), dataDirRaw);

		// Disabled commands configuration
		// Add command names here to disable them (they won't appear in help/info and will return 404 if executed)
		// Example: ['info', 'some-other-command']
		const disabledSlashCommands: string[] = [
		];

		const disabledPrefixCommands: string[] = [
		];

		// Allow override via environment variable (comma-separated list)
		if (process.env.DISABLED_SLASH_COMMANDS) {
			disabledSlashCommands.push(...process.env.DISABLED_SLASH_COMMANDS.split(',').map(c => c.trim()));
		}
		if (process.env.DISABLED_PREFIX_COMMANDS) {
			disabledPrefixCommands.push(...process.env.DISABLED_PREFIX_COMMANDS.split(',').map(c => c.trim()));
		}

		// Disable all commands flags
		// Set to true here to disable ALL slash or prefix commands
		// Can also be set via environment variables: DISABLE_ALL_SLASH_COMMANDS=true or DISABLE_ALL_PREFIX_COMMANDS=true
		// disableAllSlashCommandsInline: set to true to disable all slash commands
		// disableAllPrefixCommandsInline: set to true to disable all prefix commands
		const disableAllSlashCommandsInline: boolean = false;
		const disableAllPrefixCommandsInline: boolean = false;

		const disableAllSlashCommands: boolean =
			process.env.DISABLE_ALL_SLASH_COMMANDS === 'true' ||
			process.env.DISABLE_ALL_SLASH_COMMANDS === '1' ||
			disableAllSlashCommandsInline;

		const disableAllPrefixCommands: boolean =
			process.env.DISABLE_ALL_PREFIX_COMMANDS === 'true' ||
			process.env.DISABLE_ALL_PREFIX_COMMANDS === '1' ||
			disableAllPrefixCommandsInline;

		this.disabledSlashCommands = new Set(disabledSlashCommands);
		this.disabledPrefixCommands = new Set(disabledPrefixCommands);
		this.disableAllSlashCommands = disableAllSlashCommands;
		this.disableAllPrefixCommands = disableAllPrefixCommands;
	}
}
