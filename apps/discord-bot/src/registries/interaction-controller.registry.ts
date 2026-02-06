import 'reflect-metadata';

import { singleton, container, inject } from 'tsyringe';
import type { Interaction } from 'discord.js';

import { InteractionController } from '@/base';
import { getInteractionMetadata, matchCustomIdPattern } from '@/decorators/interaction.decorator';
import { isFrameworkError, isCommandError } from '@/errors';
import { LoggerService } from '@/services';
import type { InteractionMetadata, InteractionType } from '@/types';

/**
 * Type representing an Interaction Controller constructor.
 */
type InteractionControllerConstructor = new (..._args: unknown[]) => InteractionController;

/**
 * Internal structure for storing controller registration data.
 */
interface RegisteredController {
	instance: InteractionController;
	controllerClass: InteractionControllerConstructor;
	metadata: InteractionMetadata | undefined;
}

/**
 * Registry responsible for managing Discord interaction controllers.
 *
 * Handles registration and execution of interaction controllers for all Discord
 * interaction types (buttons, select menus, modals, autocomplete). Routes interactions
 * to the appropriate controller based on:
 * 1. Interaction type matching (from @Interaction decorator)
 * 2. Custom ID pattern matching (from @Interaction decorator)
 * 3. canHandle() runtime check (from controller instance)
 *
 * @remarks
 * - Controllers are registered by their constructor classes
 * - Each controller must implement the InteractionController interface
 * - Controllers should be decorated with @Interaction for optimal routing
 * - Provides logging and error handling for interaction routing
 */
@singleton()
export class InteractionControllerRegistry {
	/**
	 * Constructs the InteractionControllerRegistry.
	 *
	 * @param _logger Logger service for diagnostic and audit messages.
	 */
	constructor(@inject(LoggerService) private readonly _logger: LoggerService) {}

	/**
	 * The registry of registered controllers with their metadata.
	 */
	private readonly controllers: RegisteredController[] = [];

	/**
	 * Registers an array of interaction controller classes with this registry.
	 * Instantiates controllers using dependency injection.
	 *
	 * @param controllerClasses Array of controller class constructors.
	 */
	public register(controllerClasses: readonly InteractionControllerConstructor[]): void {
		for (const ControllerClass of controllerClasses) {
			this.registerController(ControllerClass);
		}
	}

	/**
	 * Registers a single interaction controller, instantiates and stores it.
	 *
	 * @param ControllerClass The class of the controller to register.
	 */
	private registerController(ControllerClass: InteractionControllerConstructor): void {
		this._logger.debug('InteractionRegistry', `Registering controller: ${ControllerClass.name}`);
		
		const instance = container.resolve(ControllerClass);
		const metadata = getInteractionMetadata(ControllerClass);

		if (!metadata) {
			this._logger.warn('InteractionRegistry', `Controller ${ControllerClass.name} is missing @Interaction decorator. It will rely solely on canHandle() for routing.`, {
				controllerName: ControllerClass.name,
			});
		}

		this.controllers.push({
			instance,
			controllerClass: ControllerClass,
			metadata,
		});

		this._logger.debug('InteractionRegistry', `Registered interaction controller: ${ControllerClass.name}`, {
			controllerName: ControllerClass.name,
			type: metadata?.options.type ?? 'any',
			customIdPattern: metadata?.options.customIdPattern ?? 'none',
		});
	}

	/**
	 * Checks if an interaction matches the specified interaction type.
	 *
	 * @param interaction The Discord interaction to check.
	 * @param type The interaction type from the decorator.
	 * @returns True if the interaction matches the type, false otherwise.
	 */
	private matchesType(interaction: Interaction, type: InteractionType): boolean {
		switch (type) {
			case 'button':
				return interaction.isButton();
			case 'selectMenu':
				return interaction.isAnySelectMenu();
			case 'modal':
				return interaction.isModalSubmit();
			case 'autocomplete':
				return interaction.isAutocomplete();
			case 'any':
				return true;
			default:
				return false;
		}
	}

	/**
	 * Checks if a controller can handle the given interaction based on decorator metadata.
	 *
	 * @param interaction The Discord interaction to check.
	 * @param metadata The controller's decorator metadata.
	 * @returns True if the metadata matches, false otherwise.
	 */
	private matchesMetadata(interaction: Interaction, metadata: InteractionMetadata | undefined): boolean {
		// If no metadata, rely on canHandle() only
		if (!metadata) {
			return true;
		}

		// Check interaction type
		if (!this.matchesType(interaction, metadata.options.type)) {
			return false;
		}

		// Check custom ID pattern if specified
		if (metadata.options.customIdPattern) {
			// Get custom ID from interaction (not all interactions have one)
			const customId = 'customId' in interaction ? interaction.customId : undefined;
			
			if (!customId) {
				return false;
			}

			if (!matchCustomIdPattern(customId, metadata.options.customIdPattern)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Routes an interaction to the appropriate controller and executes it.
	 *
	 * Routing is performed in the following order:
	 * 1. Check @Interaction decorator metadata (type and customIdPattern)
	 * 2. Call controller.canHandle() for additional runtime checks
	 * 3. Execute controller.handle() if both checks pass
	 *
	 * @param interaction The Discord interaction to route and execute.
	 * @returns Promise that resolves when the interaction is handled or if no handler is found.
	 */
	public async handleInteraction(interaction: Interaction): Promise<void> {
		// Skip ChatInputCommand interactions - they are handled by SlashCommandRegistry
		if (interaction.isChatInputCommand()) {
			return;
		}

		const customId = 'customId' in interaction ? interaction.customId : 'N/A';

		this._logger.debug('InteractionRegistry', 'Routing interaction', {
			interactionType: interaction.type,
			customId,
			userId: interaction.user.id,
			channelId: interaction.channel?.id,
			guildId: interaction.guild?.id,
		});

		// Find the first controller that can handle this interaction
		for (const { instance, controllerClass, metadata } of this.controllers) {
			// Step 1: Check decorator metadata (type and pattern)
			if (!this.matchesMetadata(interaction, metadata)) {
				continue;
			}

			// Step 2: Check canHandle() for additional runtime checks
			if (!instance.canHandle(interaction)) {
				continue;
			}

			// Step 3: Execute the handler
			this._logger.debug('InteractionRegistry', 'Found matching controller', {
				controllerName: controllerClass.name,
				interactionType: interaction.type,
				customId,
			});

			try {
				await instance.handle(interaction);
				this._logger.debug('InteractionRegistry', 'Interaction handled successfully', {
					controllerName: controllerClass.name,
					interactionType: interaction.type,
				});
				return;
			}
			catch (error) {
				// If it's a framework error, re-throw it
				if (isFrameworkError(error)) {
					this._logger.error(
						'InteractionRegistry',
						'Framework error in interaction handler',
						error instanceof Error ? error : new Error(String(error)),
						{
							controllerName: controllerClass.name,
							interactionType: interaction.type,
						},
					);
					throw error;
				}

				// If it's a command error, re-throw it
				if (isCommandError(error)) {
					this._logger.error(
						'InteractionRegistry',
						'Command error in interaction handler',
						error instanceof Error ? error : new Error(String(error)),
						{
							controllerName: controllerClass.name,
							interactionType: interaction.type,
						},
					);
					throw error;
				}

				// For unexpected errors, log and re-throw
				this._logger.error(
					'InteractionRegistry',
					'Unexpected error in interaction handler',
					error instanceof Error ? error : new Error(String(error)),
					{
						controllerName: controllerClass.name,
						interactionType: interaction.type,
					},
				);
				throw error;
			}
		}

		// No controller handled the interaction
		this._logger.debug('InteractionRegistry', 'No controller found for interaction', {
			interactionType: interaction.type,
			customId,
		});
	}

	/**
	 * Retrieves all registered controller instances.
	 *
	 * @returns Array of registered interaction controller instances.
	 */
	public getControllers(): InteractionController[] {
		return this.controllers.map(c => c.instance);
	}

	/**
	 * Retrieves all registered controller constructor classes.
	 *
	 * @returns Array of registered interaction controller constructor classes.
	 */
	public getControllerClasses(): InteractionControllerConstructor[] {
		return this.controllers.map(c => c.controllerClass);
	}
}
