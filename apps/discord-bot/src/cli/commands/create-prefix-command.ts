import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';

/**
 * Transform a kebab-case or snake_case string into PascalCase.
 * 
 * @param str - Input string in kebab-case or snake_case format.
 * @returns The converted PascalCase string.
 */
function toPascalCase(str: string): string {
	return str
		.split(/[-_]/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join('');
}

/**
 * Convert a string to kebab-case.
 *
 * @param str - Input string in any format (camelCase, PascalCase, snake_case, etc.).
 * @returns The converted kebab-case string.
 */
function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[\s_]+/g, '-')
		.toLowerCase();
}

/**
 * Resolve the project root directory.
 *
 * @returns The absolute path to the project root.
 */
function getProjectRoot(): string {
	const cwd = process.cwd();
	return resolve(cwd);
}

/**
 * Generate a new PrefixCommand controller file and register it with the application.
 *
 * This function scaffolds a new controller TypeScript file for a prefix command based on the
 * provided command name, adds the controller to the controller registration index, and performs
 * related setup. It enforces naming conventions and prevents overwriting existing files.
 *
 * @param commandName - The command identifier provided by the user. Must start with a letter and contain only
 *                     letters, numbers, hyphens, or underscores.
 * @throws Will exit the process with an error message if validation fails, files already exist, or required
 *         index file is missing.
 */
export async function createPrefixCommand(commandName: string): Promise<void> {
	const projectRoot = getProjectRoot();
	const controllerName = toPascalCase(commandName) + 'Controller';
	const fileName = toKebabCase(commandName);
	const filePath = join(projectRoot, 'src/controllers/prefix', `${fileName}.controller.ts`);
	const indexPath = join(projectRoot, 'src/controllers/prefix/index.ts');

	// Verify naming conventions.
	if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(commandName)) {
		console.error('Error: Command name must start with a letter and contain only letters, numbers, hyphens, and underscores');
		process.exit(1);
	}

	// Prevent file overwrite.
	if (existsSync(filePath)) {
		console.error(`Error: Controller file already exists: ${filePath}`);
		process.exit(1);
	}

	const controllerTemplate = `import { singleton } from 'tsyringe';
import type { Message } from 'discord.js';

import { PrefixController } from '@/base';
import { PrefixCommand } from '@/decorators';

/**
 * Controller for the '${commandName}' prefix command.
 *
 * Implements application logic for handling the prefix command named '${commandName}'.
 */
@singleton()
@PrefixCommand({
	name: '${commandName}',
	description: 'Description of ${commandName} command',
})
export class ${controllerName} extends PrefixController {
	/**
	 * Execute handler for the '${commandName}' command.
	 *
	 * @param message - The incoming Discord.js message that triggered this command.
	 * @param args - The array of argument strings provided with the command, not including the command itself.
	 * @returns Promise<void> Resolves after sending reply or when logic is complete.
	 */
	public async execute(message: Message, args: string[]): Promise<void> {
		await message.reply('Hello from ${commandName}!');
	}
}
`;

	// Ensure the controller output directory exists.
	const controllerDir = dirname(filePath);
	if (!existsSync(controllerDir)) {
		mkdirSync(controllerDir, { recursive: true });
	}

	// Generate the controller file.
	writeFileSync(filePath, controllerTemplate, 'utf-8');
	console.log(`✓ Created controller: ${filePath}`);

	// Controller registration requires index.ts.
	if (!existsSync(indexPath)) {
		console.error(`Error: Index file not found: ${indexPath}`);
		process.exit(1);
	}

	let indexContent = readFileSync(indexPath, 'utf-8');

	// Prevent duplicate import/export/registration.
	if (indexContent.includes(controllerName)) {
		console.log('✓ Controller already registered in index.ts');
		return;
	}

	// Insert new import statement after existing imports.
	const importLine = `import { ${controllerName} } from './${fileName}.controller';`;
	const lastImportMatch = indexContent.match(/(import .+ from '\.\/.+\n)/);
	if (lastImportMatch) {
		const lastImportEnd = lastImportMatch.index! + lastImportMatch[0]!.length;
		indexContent = indexContent.slice(0, lastImportEnd) + importLine + '\n' + indexContent.slice(lastImportEnd);
	} else {
		const docEnd = indexContent.indexOf('*/');
		if (docEnd !== -1) {
			const insertPos = indexContent.indexOf('\n', docEnd) + 1;
			indexContent = indexContent.slice(0, insertPos) + '\n' + importLine + '\n' + indexContent.slice(insertPos);
		}
	}

	// Insert new export statement after existing controller exports.
	const exportLine = `export { ${controllerName} } from './${fileName}.controller';`;
	const lastExportMatch = indexContent.match(/(export { \w+Controller } from '\.\/.+\n)/);
	if (lastExportMatch) {
		const lastExportEnd = lastExportMatch.index! + lastExportMatch[0]!.length;
		indexContent = indexContent.slice(0, lastExportEnd) + exportLine + '\n' + indexContent.slice(lastExportEnd);
	}

	// Register the new controller in the registration array if present.
	const arrayMatch = indexContent.match(/(export const prefixControllers: .* = \[)([\s\S]*?)(\];)/);
	if (arrayMatch) {
		const existingControllers = arrayMatch[2]!.trim();
		const controllersList = existingControllers
			? existingControllers
				.split(',')
				.map((c) => c.trim())
				.filter((c) => c.length > 0)
				.join(',\n\t') + ','
			: '';

		const newArrayContent = `export const prefixControllers: Array<new (...args: unknown[]) => PrefixController> = [
	${controllersList}
	${controllerName},
];`;
		indexContent = indexContent.replace(arrayMatch[0]!, newArrayContent);
	}

	writeFileSync(indexPath, indexContent, 'utf-8');

	console.log(`✓ Registered controller in: ${indexPath}`);
	console.log('');
	console.log('Next steps:');
	console.log(`  1. Edit ${filePath} to implement your command logic`);
	console.log('  2. Update the command description and add aliases if needed');
	console.log('  3. Restart your bot to load the new command');
}
