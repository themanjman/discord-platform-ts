import { singleton, inject } from 'tsyringe';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

import { PrefixController } from '@/base';
import { PrefixCommand, Guild } from '@/decorators';
import { BotConfig } from '@/config';
import { LoggerService } from '@/services';

/**
 * Controller for the "info" prefix command.
 *
 * Handles sending a well-formatted embedded bot information message in response to the `info` command.
 * Displays version, uptime, and detailed usage/help information.
 *
 * - Restricted to guild (server) contexts only.
 * - Logs debug and info events for auditability.
 * - Uses configuration and logger services via dependency injection.
 * - Utilizes Discord's rich embed formatting for improved user experience.
 *
 * Decorated to register as a singleton bot prefix command.
 */
@singleton()
@PrefixCommand({
	name: 'info',
	description: 'Displays bot information including version and uptime 📊',
})
@Guild()
export class InfoController extends PrefixController {
	/**
	 * Constructs the InfoController.
	 *
	 * @param _config The configuration provider containing bot metadata.
	 * @param _logger The logger service for debug/audit messages.
	 */
	constructor(
		@inject(BotConfig) private readonly _config: BotConfig,
		@inject(LoggerService) private readonly _logger: LoggerService,
	) {
		super();
	}

	/**
	 * Executes the info prefix command; sends a bot information embed to the triggering user.
	 *
	 * @param message Discord message that initiated the command.
	 * @param _args Command arguments array (unused for info command).
	 * @returns Promise that resolves when the embed message is sent.
	 */
	public async execute(message: Message, _args: string[]): Promise<void> {
		this._logger.debug('Controller', 'Executing info command', {
			userId: message.author.id,
			channelId: message.channel.id,
			guildId: message.guild?.id,
		});

		const botName = this._config.botName;
		const version = this._config.version;
		const supportURL = this._config.supportURL;

		const embed = new EmbedBuilder()
			.setColor(0x5865F2)
			.setTitle(`👋 Welcome to ${botName}!`)
			.setDescription(
				`Hello, **${message.author.username}**! I'm delighted to see you.\n\n` +
				'This bot is here to help and automate useful tasks for your community!\n\n' +
				'**Getting Started:**\n' +
				`• Use /help to see all available commands.\n` +
				(supportURL ? `• Join our Support Server if you have questions or need help: [Click here](${supportURL}).\n` : '\n') +
				'Thank you for using Discord Bot!'
			)
			.addFields(
				{ name: '🤖 Bot Version', value: `\`${version}\``, inline: false },
				{ name: '⏰ Uptime', value: `\`${this.getUptime()}\``, inline: false },
			)
			.setThumbnail(message.client.user?.displayAvatarURL() ?? '')
			.setFooter({ text: `${botName} © ${new Date().getFullYear()}` });

		await message.reply({ embeds: [embed] });
		this._logger.info('Controller', 'Info command executed successfully', {
			userId: message.author.id,
		});
	}

	/**
	 * Calculates and returns the bot's current uptime as a formatted string.
	 *
	 * @returns Bot uptime in the format "{hours}h {minutes}m {seconds}s".
	 */
	private getUptime(): string {
		const totalSeconds = Math.floor(process.uptime());
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;
		return `${hours}h ${minutes}m ${seconds}s`;
	}
}

