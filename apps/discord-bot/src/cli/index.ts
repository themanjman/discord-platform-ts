#!/usr/bin/env node

/**
 * Discord Bot Framework CLI
 *
 * Provides a command-line interface for scaffolding and administrative operations
 * on Discord bot components, including prefix command controller generation and
 * slash command management (creation, deletion).
 *
 * Commands:
 *   - create:prefix <name>       Generate a new prefix command controller
 *   - delete:commands            Delete one or more registered Discord slash commands
 *
 * The CLI processes user input, parses arguments, applies validation and dispatches
 * execution to the appropriate command handler.
 */

import { createPrefixCommand } from './commands/create-prefix-command';
import { deleteCommands } from './commands/delete-commands';

// The base command to execute, e.g., 'create:prefix', 'delete:commands', etc.
const command = process.argv[2];
// Additional arguments or flags provided after the command.
const args = process.argv.slice(3);

/**
 * Parses CLI flags for command configuration.
 *
 * Recognizes the following flags:
 *   --global         Operate on global commands
 *   --guild <id>     Operate on a specific guild, identified by Snowflake ID
 *   --all            Target all commands
 *   --command <name> Target a specific command by name
 *
 * @param args The list of CLI arguments passed after the command
 * @returns An object mapping flag names to their values, with types reflecting expected syntax
 */
function parseFlags(args: string[]): {
	global?: boolean;
	guild?: string;
	all?: boolean;
	command?: string;
} {
	const flags: {
		global?: boolean;
		guild?: string;
		all?: boolean;
		command?: string;
	} = {};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--global') {
			flags.global = true;
		} else if (arg === '--guild' && i + 1 < args.length) {
			flags.guild = args[i + 1];
			i++;
		} else if (arg === '--all') {
			flags.all = true;
		} else if (arg === '--command' && i + 1 < args.length) {
			flags.command = args[i + 1];
			i++;
		}
	}

	return flags;
}

/**
 * The main entry point for the CLI.
 *
 * Orchestrates command dispatch, argument validation, and error printing. Terminates
 * the process with status 1 on fatal errors, or 0 on normal usage/help.
 *
 * @returns {Promise<void>} Resolves after command processing completes or help printing terminates the process.
 */
async function main(): Promise<void> {
	switch (command) {
		case 'create:prefix':
		case 'create-prefix': {
			if (args.length === 0) {
				console.error('Error: Command name is required');
				console.log('Usage: pnpm cli create:prefix <command-name>');
				process.exit(1);
			}
			const commandName = args[0];
			await createPrefixCommand(commandName);
			break;
		}

		case 'delete:commands': {
			const flags = parseFlags(args);

			// At least one of --global or --guild must be provided
			if (!flags.global && !flags.guild) {
				console.error('Error: Either --global or --guild <guildId> must be specified');
				console.log('Usage: pnpm cli delete:commands --global [--all | --command <name>]');
				console.log('   or: pnpm cli delete:commands --guild <guildId> [--all | --command <name>]');
				process.exit(1);
			}

			// Cannot specify both --global and --guild
			if (flags.global && flags.guild) {
				console.error('Error: Cannot use both --global and --guild');
				process.exit(1);
			}

			// Must specify either --all or --command
			if (!flags.all && !flags.command) {
				console.error('Error: Either --all or --command <name> must be specified');
				console.log('Usage: pnpm cli delete:commands --global [--all | --command <name>]');
				console.log('   or: pnpm cli delete:commands --guild <guildId> [--all | --command <name>]');
				process.exit(1);
			}

			// Cannot specify both --all and --command
			if (flags.all && flags.command) {
				console.error('Error: Cannot use both --all and --command');
				process.exit(1);
			}

			const scope = flags.global ? 'global' : 'guild';
			await deleteCommands({
				scope,
				guildId: flags.guild,
				commandName: flags.command,
			});
			break;
		}

		default: {
			if (command) {
				console.error(`Error: Unknown command "${command}"`);
			} else {
				console.log('Discord Bot Framework CLI');
				console.log('');
				console.log('Usage: pnpm cli <command> [options]');
				console.log('');
				console.log('Commands:');
				console.log('  create:prefix <name>              Create a new prefix command controller');
				console.log('  delete:commands --global [--all | --command <name>]');
				console.log('                                    Delete global slash commands');
				console.log('  delete:commands --guild <id> [--all | --command <name>]');
				console.log('                                    Delete guild-specific slash commands');
				console.log('');
			}
			process.exit(command ? 1 : 0);
		}
	}
}

/**
 * Handles uncaught errors at the top level of the CLI execution.
 *
 * Prints the error and terminates the process with an error code.
 */
main().catch((error: unknown) => {
	console.error('CLI Error:', error);
	process.exit(1);
});

