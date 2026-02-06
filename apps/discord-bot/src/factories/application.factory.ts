import { DependencyContainer, container } from 'tsyringe';
import { Application } from '@/services/application.service';
import { LoggerService } from '@/services/logger.service';

/**
 * Provides a bootstrapping factory for constructing the core Application instance.
 *
 * The ApplicationFactory centralizes application composition using dependency injection.
 * It abstracts the resolution of the root Application service from the DI container,
 * facilitating a controlled creation process with support for logging during instantiation.
 *
 * This factory supports supplying a custom dependency container, enhancing testability and modularity.
 * If available, a LoggerService will emit diagnostic events as the Application is constructed.
 */
export class ApplicationFactory {
	/**
	 * The dependency injection container used for resolution.
	 */
	private readonly diContainer: DependencyContainer;

	/**
	 * Logger instance for emitting application lifecycle diagnostics, or null if unavailable.
	 */
	private logger: LoggerService | null = null;

	/**
	 * Constructs an ApplicationFactory using the specified dependency container.
	 *
	 * @param diContainer - The DI container to use for object resolution. Defaults to the global container.
	 */
	constructor(diContainer: DependencyContainer = container) {
		this.diContainer = diContainer;
		try {
			this.logger = this.diContainer.resolve(LoggerService);
			this.logger.debug('ApplicationFactory', 'ApplicationFactory instance created');
		} catch {
			// Logger service is not available at construction time.
		}
	}

	/**
	 * Creates and resolves the Application instance with all dependencies injected.
	 *
	 * This method automatically resolves the entire dependency graph required by the Application.
	 * Logging is recorded before and after construction when a LoggerService is available.
	 *
	 * @returns {Application} The DI-initialized Application instance.
	 */
	public create(): Application {
		if (this.logger) {
			this.logger.debug('ApplicationFactory', 'Creating Application instance...');
		}
		const application = this.diContainer.resolve(Application);
		if (this.logger) {
			this.logger.debug('ApplicationFactory', 'Application instance created successfully');
		}
		return application;
	}
}
