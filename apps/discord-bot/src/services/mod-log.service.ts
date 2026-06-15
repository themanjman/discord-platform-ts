import { singleton, inject } from 'tsyringe';
import type { Client, TextChannel } from 'discord.js';
import { EmbedBuilder } from 'discord.js';

import { LoggerService } from './logger.service';

export interface ModLogField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface ModLogEntry {
	title: string;
	color?: number;
	fields: ModLogField[];
}

/**
 * Posts structured moderation embeds to a configured log channel.
 *
 * Falls back to Winston logging when the channel is missing or send fails.
 */
@singleton()
export class ModLogService {
	constructor(@inject(LoggerService) private readonly _logger: LoggerService) {}

	async send(client: Client, logChannelId: string | null, entry: ModLogEntry): Promise<void> {
		if (!logChannelId) {
			this._logger.warn('ModLogService', 'Mod log channel not configured; logging to Winston only', {
				title: entry.title,
				fields: entry.fields,
			});
			return;
		}

		try {
			const channel = await client.channels.fetch(logChannelId);

			if (!channel || !channel.isTextBased()) {
				this._logger.warn('ModLogService', 'Mod log channel is missing or not text-based', {
					logChannelId,
					title: entry.title,
				});
				return;
			}

			const embed = new EmbedBuilder()
				.setTitle(entry.title)
				.setTimestamp();

			if (entry.color !== undefined) {
				embed.setColor(entry.color);
			}

			if (entry.fields.length > 0) {
				embed.addFields(entry.fields);
			}

			await (channel as TextChannel).send({ embeds: [embed] });
		} catch (error) {
			this._logger.error(
				'ModLogService',
				'Failed to send mod log embed',
				error instanceof Error ? error : new Error(String(error)),
				{
					logChannelId,
					title: entry.title,
					fields: entry.fields,
				},
			);
		}
	}
}
