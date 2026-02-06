import { singleton, inject } from 'tsyringe';
import type { Message } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

import { PrefixController } from '@/base';
import { PrefixCommand, Guild } from '@/decorators';
import { BotConfig } from '@/config';
import { PrefixCommandRegistry, SlashCommandRegistry } from '@/registries';
import { LoggerService } from '@/services';
import { getPrefixCommandMetadata } from '@/decorators';

/**
 * Controller for the "help" prefix command.
 *
 * Displays a comprehensive list of all available prefix and slash commands with their descriptions.
 * Helps users discover bot functionality and understand available commands.
 *
 * - Restricted to guild (server) contexts only.
 * - Integrates with command registries to provide up-to-date command listings.
 * - Utilizes Discord's rich embed formatting for improved user experience.
 *
 * Decorated to register as a singleton bot prefix command.
 */
@singleton()
@PrefixCommand({
	name: 'help',
	description: 'Displays a list of all available commands 📚',
})
@Guild()
export class HelpController extends PrefixController {
	/**
	 * Constructs the HelpController.
	 *
	 * @param _config The configuration provider containing bot metadata.
	 * @param _prefixRegistry Registry for prefix commands.
	 * @param _slashRegistry Registry for slash commands.
	 * @param _logger The logger service for debug/audit messages.
	 */
	constructor(
		@inject(BotConfig) private readonly _config: BotConfig,
		@inject(PrefixCommandRegistry) private readonly _prefixRegistry: PrefixCommandRegistry,
		@inject(SlashCommandRegistry) private readonly _slashRegistry: SlashCommandRegistry,
		@inject(LoggerService) private readonly _logger: LoggerService,
	) {
		super();
	}

	/**
	 * Executes the help prefix command; sends an embed listing all available commands.
	 *
	 * @param message Discord message that initiated the command.
	 * @param _args Command arguments array (unused for help command).
	 * @returns Promise that resolves when the embed message is sent.
	 */
	public async execute(message: Message, _args: string[]): Promise<void> {
		this._logger.debug('Controller', 'Executing help command', {
			userId: message.author.id,
			channelId: message.channel.id,
			guildId: message.guild?.id,
		});

		const prefix = this._config.commandPrefix;
		const prefixCommands = this._prefixRegistry.getControllers();

		// Build prefix commands list
		const prefixCommandsList: string[] = [];
		for (const [name, controller] of prefixCommands) {
			const ControllerClass = Object.getPrototypeOf(controller).constructor;
			const metadata = getPrefixCommandMetadata(ControllerClass);
			if (metadata) {
				const aliasesStr = metadata.options.aliases && metadata.options.aliases.length > 0
					? ` (${metadata.options.aliases.map(a => `\`${prefix}${a}\``).join(', ')})`
					: '';
				prefixCommandsList.push(`\`${prefix}${name}\`${aliasesStr} - ${metadata.options.description}`);
			}
		}

		// Build slash commands list
		const slashCommandsList: string[] = [];
		const slashCommandBuilders = this._slashRegistry.getCommandBuilders();
		for (const command of slashCommandBuilders) {
			slashCommandsList.push(`\`/${command.name}\` - ${command.description}`);
		}

		const embed = new EmbedBuilder()
			.setColor(0x5865F2)
			.setTitle('📚 Command Help')
			.setDescription(
				`Welcome to **${this._config.botName}**! Here are all available commands:\n\n` +
				`Use \`${prefix}help\` to see this message again.`
			);

		if (prefixCommandsList.length > 0) {
			embed.addFields({
				name: `🔹 Prefix Commands (${prefixCommandsList.length})`,
				value: prefixCommandsList.join('\n'),
				inline: false,
			});
		}

		if (slashCommandsList.length > 0) {
			embed.addFields({
				name: `⚡ Slash Commands (${slashCommandsList.length})`,
				value: slashCommandsList.join('\n'),
				inline: false,
			});
		}

		embed.setThumbnail(message.client.user?.displayAvatarURL() ?? '')
			.setFooter({ text: `${this._config.botName} © ${new Date().getFullYear()}` });

		await message.reply({ embeds: [embed] });
		this._logger.info('Controller', 'Help command executed successfully', {
			userId: message.author.id,
		});
	}
}

