import { singleton, inject } from 'tsyringe';
import type { Interaction } from 'discord.js';

import { On } from '@/decorators';
import { InteractionControllerRegistry } from '@/registries';
import { LoggerService } from '@/services';

/**
 * Main event handler for Discord interaction events.
 *
 * This event handler acts as a router/dispatcher for all Discord interactions.
 * It delegates interaction processing to module-specific interaction controllers
 * registered in the InteractionControllerRegistry.
 *
 * @remarks
 * - Utilizes dependency injection for all core dependencies.
 * - Operates as a singleton to ensure consistent behavior across the bot's lifecycle.
 * - Routes interactions to appropriate module controllers via the registry.
 * - Handles all interaction types (buttons, select menus, modals, autocomplete)
 *
 * @see InteractionControllerRegistry
 * @see LoggerService
 */
@singleton()
export class InteractionEventHandler {
	/**
	 * Constructs the interaction event handler.
	 *
	 * @param _interactionRegistry The registry managing all interaction controllers.
	 * @param _logger Logger service used for diagnostic and event logging.
	 */
	constructor(
		@inject(InteractionControllerRegistry) private readonly _interactionRegistry: InteractionControllerRegistry,
		@inject(LoggerService) private readonly _logger: LoggerService,
	) {}

	/**
	 * Handles the Discord 'InteractionCreate' event.
	 *
	 * Routes all incoming interactions to the appropriate module-specific controller
	 * via the InteractionControllerRegistry. The registry finds the first controller
	 * that can process the interaction and delegates execution to it.
	 *
	 * @param interaction The Discord interaction instance received in the event.
	 * @returns A Promise resolving when interaction processing is complete.
	 */
	@On('InteractionCreate')
	public async handleInteraction(interaction: Interaction): Promise<void> {
		this._logger.debug('InteractionEvent', 'Interaction received', {
			interactionType: interaction.type,
			customId: 'customId' in interaction ? interaction.customId : 'N/A',
			userId: interaction.user.id,
			channelId: interaction.channel?.id,
			guildId: interaction.guild?.id,
		});

		// Route interaction to appropriate controller via registry
		await this._interactionRegistry.handleInteraction(interaction);
	}
}

