# Multi-stage Dockerfile for Discord Bot
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY package.json ./
COPY pnpm-workspace.yaml ./
COPY tsconfig.json ./
COPY turbo.json ./

# Copy the entire app directory
COPY apps/discord-bot ./apps/discord-bot

# Install dependencies
# For pnpm workspaces, install at root level
RUN pnpm install

# Build the application
RUN pnpm --filter @discord-platform-ts/discord-bot build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration
COPY package.json ./
COPY pnpm-workspace.yaml ./

# Copy app package files
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY apps/discord-bot/pnpm-lock.yaml ./apps/discord-bot/

# Install only production dependencies
# Install at root for workspace support, then install prod deps for app
RUN pnpm install --prod --filter @discord-platform-ts/discord-bot || \
    (cd apps/discord-bot && pnpm install --frozen-lockfile --prod)

# Copy built application from builder stage
COPY --from=builder /app/apps/discord-bot/dist ./apps/discord-bot/dist

# Create logs directory
RUN mkdir -p /app/apps/discord-bot/logs

# Set working directory to bot app
WORKDIR /app/apps/discord-bot

# Run the application
CMD ["node", "dist/index.js"]
