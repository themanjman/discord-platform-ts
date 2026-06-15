import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import type { LoggerService } from '@/services/logger.service';

import type { IGuildConfigRepository } from './guild-config.repository.interface';

/**
 * Filesystem-backed guild config repository.
 *
 * Persists one typed JSON document per file with an in-memory cache.
 * Creates parent directories on first write.
 */
export class JsonGuildConfigRepository<T extends object> implements IGuildConfigRepository<T> {
	private cache: T | null = null;

	constructor(
		private readonly filePath: string,
		private readonly defaultConfig: T,
		private readonly logger: LoggerService,
	) {}

	get(): T {
		if (this.cache !== null) {
			return this.cache;
		}

		if (!existsSync(this.filePath)) {
			this.cache = structuredClone(this.defaultConfig);
			return this.cache;
		}

		try {
			const raw = readFileSync(this.filePath, 'utf-8');
			this.cache = { ...structuredClone(this.defaultConfig), ...JSON.parse(raw) } as T;
			return this.cache;
		} catch (error) {
			this.logger.error(
				'JsonGuildConfigRepository',
				`Failed to read guild config from ${this.filePath}`,
				error instanceof Error ? error : new Error(String(error)),
				{ filePath: this.filePath },
			);
			this.cache = structuredClone(this.defaultConfig);
			return this.cache;
		}
	}

	update(updater: (current: T) => T): T {
		const current = this.get();
		const next = updater(structuredClone(current));
		this.save(next);
		return next;
	}

	save(config: T): void {
		try {
			const dir = dirname(this.filePath);
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}

			writeFileSync(this.filePath, JSON.stringify(config, null, 2), 'utf-8');
			this.cache = config;
		} catch (error) {
			this.logger.error(
				'JsonGuildConfigRepository',
				`Failed to write guild config to ${this.filePath}`,
				error instanceof Error ? error : new Error(String(error)),
				{ filePath: this.filePath },
			);
			throw error;
		}
	}
}
