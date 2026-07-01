# Discord Platform TS

A modern, full-featured monorepo starter and framework for building your own Discord platform with TypeScript! Drawing from proven architectural patterns and developer experience found in popular server-side frameworks, it offers strong standards, scalable structure, and helpful conventions out of the box. Effortlessly create a powerful Discord bot, connect to any frontend or services, and extend your platform however you like. Perfect for developers who want to build, customize, and launch ambitious Discord-first applications with best practices from day one.

## Structure

```
discord-platform-ts/
├── apps/
│   └── discord-bot/        # Discord bot application
│       ├── src/
│       │   ├── base/       # Base controller classes
│       │   ├── cli/        # CLI utilities
│       │   ├── config/     # Configuration management
│       │   ├── controllers/# Command and interaction controllers
│       │   │   ├── slash/  # Slash command controllers
│       │   │   ├── prefix/ # Prefix command controllers
│       │   │   └── interactions/ # Interaction controllers (buttons, menus, modals)
│       │   ├── decorators/ # Command, interaction, and event decorators
│       │   ├── errors/     # Custom error classes
│       │   ├── events/     # Discord event handlers
│       │   ├── factories/  # Factory classes for DI
│       │   ├── middleware/ # Request middleware
│       │   ├── registries/ # Command and interaction registries
│       │   ├── repositories/# Guild config repositories (JSON persistence)
│       │   ├── services/   # Business logic services
│       │   ├── types/      # TypeScript type definitions
│       │   ├── utils/      # Utility functions
│       │   └── index.ts    # Entry point
│       └── package.json
├── package.json           # Root workspace configuration
└── tsconfig.json          # Base TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
pnpm install
```

### Discord Bot Setup

1. Create a `.env` file:
   - **For Docker deployment**: Create in project root
   - **For PM2/local development**: Create in `apps/discord-bot/`
   
   ```bash
   # Docker deployment
   touch .env
   
   # PM2/local development
   cd apps/discord-bot
   touch .env
   ```

2. Fill in your Discord bot credentials in the `.env` file:
   ```
   DISCORD_TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_client_id_here
   COMMAND_PREFIX=!
   GUILD_ID=your_guild_id_here  # Optional: for faster command registration during development
   ```

### Development

Run the Discord bot in development mode:
```bash
pnpm --filter @discord-platform-ts/discord-bot dev
```

Or from the bot directory:
```bash
cd apps/discord-bot
pnpm dev
```

### Building

Build all apps:
```bash
pnpm build
```

Build only the Discord bot:
```bash
pnpm --filter @discord-platform-ts/discord-bot build
```

### Type Checking

Run TypeScript type checking:
```bash
pnpm type-check
```

### Linting

Run ESLint:
```bash
pnpm lint
```

## Commands

The bot comes with the following built-in commands:

### Prefix Commands (Guild Only)

All prefix commands use the `COMMAND_PREFIX` from your `.env` file (default: `!`).

- **`!help`** - Displays a comprehensive list of all available prefix and slash commands
- **`!info`** - Shows bot information including version, uptime, and welcome message

### Slash Commands (Guild Only)

- **`/help`** - Displays a comprehensive list of all available prefix and slash commands
- **`/info`** - Shows bot information including version, uptime, and welcome message

All commands are restricted to guild (server) contexts only and cannot be used in direct messages.

### Command Restrictions

The framework supports multiple ways to restrict command access:

#### Permission Flags

Use Discord's permission flags to restrict who can see and use commands. Commands with permission restrictions will be hidden from users who don't have the required permissions:

```typescript
import { PermissionFlagsBits } from 'discord.js';
import { SlashCommand } from '@/decorators';

@SlashCommand({
  name: 'admin-command',
  description: 'Admin only command',
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
})
export class AdminController extends SlashController {
  // ...
}
```

#### Role-Based Restrictions

Restrict commands to users with specific Discord roles using the `@RequireRole` decorator. Supports single or multiple roles (OR logic - user needs ANY of the specified roles):

```typescript
import { RequireRole } from '@/decorators';

// Single role
@SlashCommand({
  name: 'mod-command',
  description: 'Moderator command',
})
@RequireRole('1234567890123456789')
export class ModController extends SlashController {
  // ...
}

// Multiple roles (user needs ANY of these roles)
@SlashCommand({
  name: 'staff-command',
  description: 'Staff command',
})
@RequireRole(['1234567890123456789', '9876543210987654321'])
export class StaffController extends SlashController {
  // ...
}

// With custom error message
@RequireRole('1234567890123456789', 'You need the Admin role to use this command.')
export class AdminController extends SlashController {
  // ...
}
```

**Note:** Role-based restrictions work for both slash and prefix commands. Permission flags are only available for slash commands.

### Interaction Controllers

The framework provides a powerful system for handling Discord interactions (buttons, select menus, modals, autocomplete):

```typescript
import { singleton } from 'tsyringe';
import type { Interaction } from 'discord.js';
import { InteractionController } from '@/base';
import { Interaction } from '@/decorators';

@singleton()
@Interaction({
  type: 'button',
  customIdPattern: 'action:confirm:*',
  description: 'Handles confirmation buttons'
})
export class ConfirmButtonController extends InteractionController {
  canHandle(interaction: Interaction): boolean {
    // Additional runtime checks (permissions, state, etc.)
    return true;
  }

  async handle(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    // Handle the button click
  }
}
```

**Supported Interaction Types:**
- `button` - Button clicks
- `selectMenu` - Select menu selections (string, user, role, channel, mentionable)
- `modal` - Modal form submissions
- `autocomplete` - Autocomplete suggestions
- `any` - Match all interaction types

**Custom ID Pattern Matching:**
- Use `*` as wildcard: `action:confirm:*` matches `action:confirm:yes`, `action:confirm:no`, etc.
- Segment-based: `task:*:complete` matches `task:123:complete`, `task:456:complete`, etc.
- Prefix matching: `action:cancel*` matches `action:cancel-task:123`, `action:cancel-order:456`, etc. (pattern ending with `*` matches if the segment starts with the prefix)

**Routing Flow:**
1. `@Interaction` decorator metadata (type + pattern)
2. `canHandle()` for runtime checks
3. `handle()` for business logic

## Architecture

The Discord bot follows a modular, enterprise-grade architecture with:

- **Strict TypeScript**: Full type safety with strict mode enabled
- **Decorator-Based Commands**: Declarative command registration using decorators
- **Dependency Injection**: Uses tsyringe for IoC container
- **Modular Structure**: Separated concerns (controllers, services, events, middleware)
- **Command Registries**: Centralized command registration and execution
- **Interaction Controllers**: Handle buttons, select menus, modals, and autocomplete
- **Event-Driven**: Decorator-based event handling system
- **Configuration Management**: Centralized config with environment validation
- **Error Handling**: Comprehensive error handling with custom error types
- **Structured Logging**: Winston-based logging with daily rotation

### Deployment Model

This framework is designed for **one bot per guild** deployment, where each guild (tenant) runs in a separate process. This approach provides:

- **Process Isolation**: Each guild bot runs independently, ensuring complete isolation between tenants
- **Singleton Pattern**: The codebase primarily uses the singleton pattern via tsyringe's `@singleton()` decorator, which works perfectly for this deployment model since each process has its own dependency injection container
- **Resource Efficiency**: Each process manages its own resources, making it easier to scale individual guild bots independently
- **Simplified Architecture**: No need for complex multi-tenant logic within a single process

When deploying, run separate instances of the bot application for each guild, each with its own configuration (Discord token, guild ID, etc.).

## Tech Stack

- **TypeScript**: Type-safe development with strict mode
- **Discord.js**: Discord API wrapper (v14) with modern API usage (MessageFlags for ephemeral replies)
- **tsyringe**: Dependency injection container
- **winston**: Structured logging
- **Turbo**: Monorepo build system
- **pnpm**: Fast, disk space efficient package manager
- **ESLint**: Code linting

## Deployment

### Prerequisites

- Node.js >= 18.0.0 (for PM2 deployment)
- Docker and Docker Compose (for Docker deployment)
- Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)

### Environment Variables

Create a `.env` file in the project root (or in `apps/discord-bot/` for PM2):

**Required:**
- `DISCORD_TOKEN`: Your Discord bot token

**Optional:**
- `COMMAND_PREFIX`: Command prefix (default: `!`)
- `BOT_NAME`: Bot display name (default: `Discord Bot`)
- `VERSION`: Bot version string (default: `1.0.0`)
- `LOG_LEVEL`: Logging level - `error`, `warn`, `info`, `debug` (default: `info`)
- `LOG_PROVIDER`: Log provider (default: `winston`)
- `GUILD_ID`: Guild ID for faster command registration
- `CLIENT_ID`: Discord application client ID
- `SUPPORT_URL`: Support URL for your bot

**Command Disabling:**
- `DISABLED_SLASH_COMMANDS`: Comma-separated list of slash command names to disable (e.g., `info,help`)
- `DISABLED_PREFIX_COMMANDS`: Comma-separated list of prefix command names to disable (e.g., `info,help`)
- `DISABLE_ALL_SLASH_COMMANDS`: Set to `true` or `1` to disable all slash commands
- `DISABLE_ALL_PREFIX_COMMANDS`: Set to `true` or `1` to disable all prefix commands

> **Note:** You can also configure disabled commands directly in `apps/discord-bot/src/config/bot.config.ts` by editing the `disabledSlashCommands` and `disabledPrefixCommands` arrays, or setting the `disableAllSlashCommandsInline` and `disableAllPrefixCommandsInline` boolean flags.

### Docker Deployment (Recommended)

The project includes Docker configuration for easy deployment with Portainer or Docker Compose.

#### Quick Start with Docker Compose

```bash
# Create .env file in project root
cp .env.example .env
nano .env  # Edit with your values

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f discord-bot
```

#### Managing Docker Deployment

**View Logs:**
```bash
docker-compose logs -f discord-bot
```

**Restart:**
```bash
docker-compose restart discord-bot
```

**Stop:**
```bash
docker-compose stop
```

**Update:**
```bash
git pull
docker-compose up -d --build
```

**Remove:**
```bash
docker-compose down
```

### PM2 Deployment (Alternative)

For servers using PM2 process management:

1. **Build the application:**
   ```bash
   pnpm build
   ```

2. **Create `.env` file in `apps/discord-bot/`:**
   ```bash
   cd apps/discord-bot
   cp .env.example .env
   nano .env
   ```

3. **Start with PM2:**
   ```bash
   # From project root
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup  # Run the command it gives you
   ```

4. **Manage with PM2:**
   ```bash
   pm2 status
   pm2 logs discord-bot
   pm2 restart discord-bot
   pm2 stop discord-bot
   ```

### Troubleshooting

**Bot Not Starting:**
- Check logs: `docker-compose logs discord-bot` or `pm2 logs discord-bot`
- Verify `DISCORD_TOKEN` is set correctly
- Check token validity in Discord Developer Portal

**Container Keeps Restarting:**
- Check logs for errors
- Verify all required environment variables are set
- Check if the Discord token is valid

**Logs Not Persisting:**
- Ensure the `logs` directory exists and has proper permissions
- Check volume mount configuration in docker-compose.yml

**Build Failures:**
- Check Docker build logs
- Ensure all dependencies are properly installed
- Verify Node.js version compatibility (requires Node 18+)

### Command Configuration

You can disable commands in two ways:

#### Method 1: Environment Variables (Recommended for Docker/PM2)

Add to your `.env` file:
```bash
# Disable specific commands
DISABLED_SLASH_COMMANDS=info,help
DISABLED_PREFIX_COMMANDS=info,shop

# Or disable all commands of a type
DISABLE_ALL_SLASH_COMMANDS=true
DISABLE_ALL_PREFIX_COMMANDS=true
```

#### Method 2: Inline Configuration (Recommended for Development)

Edit `apps/discord-bot/src/config/bot.config.ts`:
```typescript
// Disable specific commands
const disabledSlashCommands: string[] = ['info', 'help'];
const disabledPrefixCommands: string[] = ['info', 'shop'];

// Or disable all commands
const disableAllSlashCommandsInline: boolean = true;
const disableAllPrefixCommandsInline: boolean = true;
```

**Behavior:**
- Disabled commands won't be registered with Discord (slash commands won't appear in Discord's command list)
- Disabled commands won't appear in help/info listings
- Users attempting to use individually disabled commands will receive: "This command is currently unavailable."
- If all slash commands are disabled, users will receive: "Slash commands are currently unavailable."
- If all prefix commands are disabled, the bot does not register `MessageEventHandler` and never processes prefixed messages (avoids conflicting with other bots sharing the same prefix).

### Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use Portainer secrets** or Docker secrets for sensitive data in production
3. **Keep Docker images updated** regularly
4. **Set proper file permissions** (600 for `.env` files)
5. **Limit container resources** if needed (CPU, memory limits)

### Guild Config Persistence

The framework includes a generic JSON repository for per-guild configuration files.

- **Storage path:** `{DATA_DIR}/guild-{GUILD_ID}.json` (default `apps/discord-bot/data/` when running locally)
- **Configure via env:** `DATA_DIR=data` (relative to process cwd) or an absolute path
- **Docker volume:** `./apps/discord-bot/data` is mounted in `docker-compose.yml`

**Usage in an app:**

```typescript
import { createJsonGuildConfigRepository } from '@/repositories';
import { BotConfig } from '@/config';
import { LoggerService } from '@/services';

interface MyGuildConfig {
  featureEnabled: boolean;
}

const repo = createJsonGuildConfigRepository<MyGuildConfig>(
  {
    dataDir: config.dataDir,
    guildId: config.guildId!,
    defaultConfig: { featureEnabled: false },
  },
  logger,
);

repo.update(current => ({ ...current, featureEnabled: true }));
```

Wrap the repository in an app-level `@singleton()` service for domain methods (`isProtected`, etc.).

### Mod Log Service

`ModLogService` posts structured embeds to a configured text channel. Inject it and call `send(client, logChannelId, entry)` from event handlers or services.

```typescript
await modLogService.send(client, logChannelId, {
  title: 'Moderation action',
  color: 0xff0000,
  fields: [
    { name: 'User', value: `<@${userId}>`, inline: true },
    { name: 'Action', value: 'Ban', inline: true },
  ],
});
```

If the log channel is unset or unreachable, the entry is written to Winston instead.

### Permission Utilities

`isGuildOwner(member, guild)` and `hasAdministrator(member)` in `@/utils` are for runtime checks in event handlers. Slash commands should continue to use `defaultMemberPermissions` on the decorator.

## Recent Changes

- **Guild Config Persistence**: Added `JsonGuildConfigRepository`, `IGuildConfigRepository`, and `BotConfig.dataDir` for typed per-guild JSON storage
- **Mod Log Service**: Added `ModLogService` for structured moderation embeds with Winston fallback
- **Permission Utilities**: Added `isGuildOwner` and `hasAdministrator` helpers for event-handler checks
  - Disable individual commands via arrays in `bot.config.ts` or environment variables
  - Disable all slash or prefix commands with boolean flags
  - Disabled commands are excluded from registration, help listings, and return friendly messages when attempted
  - Supports both inline configuration and environment variable overrides
- **Interaction Controller Architecture**: Added modular system for handling Discord interactions (buttons, select menus, modals, autocomplete)
  - `@Interaction` decorator with type and custom ID pattern matching
  - `InteractionController` base class with `canHandle()` and `handle()` methods
  - `InteractionControllerRegistry` for smart routing
  - Wildcard pattern matching for custom IDs
- Added `help` command (both prefix and slash) to display all available commands
- Added `info` command (both prefix and slash) to display bot information
- Replaced `hello` prefix command with `info`
- Updated to use `MessageFlags.Ephemeral` instead of deprecated `ephemeral` option for Discord.js v14 compatibility
- All new commands are guild-only (server contexts only)

