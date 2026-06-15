import { join } from 'path';

import type { LoggerService } from '@/services/logger.service';

import { JsonGuildConfigRepository } from './json-guild-config.repository';

export interface CreateJsonGuildConfigRepositoryOptions<T extends object> {
	dataDir: string;
	guildId: string;
	defaultConfig: T;
}

/**
 * Constructs a {@link JsonGuildConfigRepository} for `data/guild-{guildId}.json`.
 */
export function createJsonGuildConfigRepository<T extends object>(
	opts: CreateJsonGuildConfigRepositoryOptions<T>,
	logger: LoggerService,
): JsonGuildConfigRepository<T> {
	const filePath = join(opts.dataDir, `guild-${opts.guildId}.json`);

	return new JsonGuildConfigRepository(filePath, opts.defaultConfig, logger);
}
