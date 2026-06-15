/**
 * Contract for typed guild-scoped configuration persistence.
 *
 * Implementations handle storage only — load, save, and atomic update.
 * Domain logic belongs in app-level services that wrap a repository.
 */
export interface IGuildConfigRepository<T extends object> {
	get(): T;
	update(updater: (current: T) => T): T;
	save(config: T): void;
}
