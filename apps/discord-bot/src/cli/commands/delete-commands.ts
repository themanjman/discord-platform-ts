import dotenv from 'dotenv';
import { REST, Routes } from 'discord.js';

dotenv.config();

/**
 * Removes one or more slash commands from Discord, either globally or for a specific guild.
 *
 * This function will use the bot application's credentials to interact with Discord's REST API and
 * perform deletion of application slash commands. It can delete a single command (by name) or remove
 * all commands depending on the provided options.
 *
 * Environment Variables:
 * - DISCORD_TOKEN: Bot/application token for authentication with Discord API
 * - CLIENT_ID: Application (client) ID of your Discord bot
 *
 * @param options - Command deletion configuration
 * @param options.scope - Decides if deletion is global or restricted to a specific guild. Must be 'global' or 'guild'.
 * @param options.guildId - Snowflake ID of the guild (required if scope is 'guild'). Omit for global deletion.
 * @param options.commandName - Name of the command to delete. If omitted, all commands in the scope will be deleted.
 *
 * @returns {Promise<void>} Resolves when command(s) are deleted; rejects or terminates if an error occurs.
 *
 * @throws Will terminate the process if required environment variables are missing or invalid options are supplied.
 */
export async function deleteCommands(options: {
	scope: 'global' | 'guild';
	guildId?: string;
	commandName?: string;
}): Promise<void> {
	const { scope, guildId, commandName } = options;

	const token = process.env.DISCORD_TOKEN;
	const clientId = process.env.CLIENT_ID;

	if (!token) {
		console.error('Error: DISCORD_TOKEN environment variable is not set');
		process.exit(1);
	}

	if (!clientId) {
		console.error('Error: CLIENT_ID environment variable is not set');
		process.exit(1);
	}

	if (scope === 'guild' && !guildId) {
		console.error('Error: --guild <guildId> is required when using --guild scope');
		process.exit(1);
	}

	const rest = new REST().setToken(token);

	try {
		if (commandName) {
			await deleteSpecificCommand(rest, clientId, scope, guildId, commandName);
		} else {
			await deleteAllCommands(rest, clientId, scope, guildId);
		}
	} catch (error) {
		console.error('Error deleting commands:', error);
		process.exit(1);
	}
}

/**
 * Removes a specific slash command by name from the selected application scope (global or guild).
 *
 * This helper function fetches all defined commands in the specified scope, locates the command
 * matching the given name, and deletes it using its unique identifier (command ID).
 *
 * @param rest - Initialized REST client with authentication token.
 * @param clientId - Application (client) ID of the Discord bot.
 * @param scope - 'global' to target all servers, or 'guild' to restrict to a specific server.
 * @param guildId - Guild ID (required if scope is 'guild', ignored otherwise).
 * @param commandName - Name of the slash command to delete.
 *
 * @returns {Promise<void>} Resolves after deletion is confirmed; rejects or terminates if not found or on API errors.
 *
 * @throws Will terminate the process if the command is not found in the specified scope.
 */
async function deleteSpecificCommand(
	rest: REST,
	clientId: string,
	scope: 'global' | 'guild',
	guildId: string | undefined,
	commandName: string,
): Promise<void> {
	// Fetch commands in the relevant scope
	const commands = scope === 'global'
		? (await rest.get(Routes.applicationCommands(clientId))) as Array<{ id: string; name: string }>
		: (await rest.get(Routes.applicationGuildCommands(clientId, guildId!))) as Array<{ id: string; name: string }>;

	const command = commands.find(cmd => cmd.name === commandName);

	if (!command) {
		const location = scope === 'global' ? 'globally' : `in guild ${guildId}`;
		console.error(`Error: Command "${commandName}" not found ${location}`);
		process.exit(1);
	}

	const route = scope === 'global'
		? Routes.applicationCommand(clientId, command.id)
		: Routes.applicationGuildCommand(clientId, guildId!, command.id);

	await rest.delete(route);

	const location = scope === 'global' ? 'globally' : `from guild ${guildId}`;
	console.log(`✓ Successfully deleted command "${commandName}" ${location}`);
}

/**
 * Removes all slash commands for the selected application scope (global or guild).
 *
 * This helper function retrieves the list of all commands in the chosen scope and iterates
 * over them, deleting each one. The function provides status output for each command and summary once complete.
 *
 * @param rest - Initialized REST client authenticated with the bot token.
 * @param clientId - Application (client) ID of the Discord bot.
 * @param scope - 'global' to affect all servers, or 'guild' for a specific server only.
 * @param guildId - Guild ID (required if scope is 'guild', ignored otherwise).
 *
 * @returns {Promise<void>} Resolves after all deletions have completed or if there are no commands to delete.
 */
async function deleteAllCommands(
	rest: REST,
	clientId: string,
	scope: 'global' | 'guild',
	guildId: string | undefined,
): Promise<void> {
	const commands = scope === 'global'
		? (await rest.get(Routes.applicationCommands(clientId))) as Array<{ id: string; name: string }>
		: (await rest.get(Routes.applicationGuildCommands(clientId, guildId!))) as Array<{ id: string; name: string }>;

	if (commands.length === 0) {
		const location = scope === 'global' ? 'globally' : `in guild ${guildId}`;
		console.log(`No commands found ${location}`);
		return;
	}

	console.log(`Deleting ${commands.length} command(s)...`);

	for (const command of commands) {
		const route = scope === 'global'
			? Routes.applicationCommand(clientId, command.id)
			: Routes.applicationGuildCommand(clientId, guildId!, command.id);

		try {
			await rest.delete(route);
			console.log(`✓ Deleted command "${command.name}"`);
		} catch (error) {
			console.error(`✗ Failed to delete command "${command.name}":`, error);
		}
	}

	const location = scope === 'global' ? 'globally' : `from guild ${guildId}`;
	console.log(`\n✓ Successfully deleted ${commands.length} command(s) ${location}`);
}
