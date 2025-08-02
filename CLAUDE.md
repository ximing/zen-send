# CLAUDE.md

Zen Send - Cross-platform clipboard, text, and file transfer tool (like LocalSend)

## Project Overview

Zen Send is a monorepo containing a server, web frontend, and React Native mobile app for cross-device content transfer.

## Architecture

### Apps
- **apps/server**: Express.js backend with Socket.io for real-time communication
- **apps/web**: React 19 frontend with Vite
- **apps/mobile**: React Native (Expo) for Android and iOS

### Packages
- **packages/shared**: Shared TypeScript types and DTOs
- **packages/logger**: Pino-based logging utility

### Config
- **config/eslint-config**: Shared ESLint configuration
- **config/typescript-config**: Shared TypeScript configurations

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Run all apps in dev mode
pnpm dev:web          # Run web frontend (port 5274)
pnpm dev:server       # Run backend server (port 3110)
pnpm dev:mobile       # Run Expo mobile app
pnpm build            # Build all packages
pnpm clean            # Clean all dist outputs
pnpm lint             # Run ESLint
pnpm lint:fix         # Auto-fix ESLint issues
pnpm format           # Format code with Prettier
pnpm typecheck        # Run TypeScript type checking

# Server-specific
pnpm --filter @zen-send/server dev    # Run server only
pnpm --filter @zen-send/server build  # Build server
pnpm --filter @zen-send/server typecheck

# Web-specific
cd apps/web && pnpm dev          # Run web only
cd apps/web && pnpm build        # Build web for production (outputs to server/public)
cd apps/web && pnpm typecheck   # Type-check web only
```

## Code Organization

### Server (Express + Socket.io)
- `src/index.ts` - Entry point, starts HTTP server and Socket.io
- `src/app.ts` - Express app creation with CORS, JSON parsing, route mounting
- `src/socket/socket.ts` - Socket.io setup with JWT auth middleware and device management
- `src/config/` - Configuration modules:
  - `jwt.ts` - JWT signing/verification (access token: 15m, refresh token: 7d)
  - `s3.ts` - S3 client and presigned URL generation for chunked uploads
  - `database.ts` - Drizzle ORM database connection
- `src/modules/*/` - Feature modules using controller/service/router pattern:
  - **auth** - Login, register, logout, token refresh
  - **device** - Device registration and management
  - **transfer** - File/text/clipboard transfer with S3 multipart upload support
- `src/middleware/` - Auth middleware and error handlers
- `src/db/` - Drizzle ORM schema and database config
- `src/utils/id.ts` - ID generation utilities (sessionId, itemId, chunkId)

### Transfer Module (Chunked S3 Multipart Upload)
- Files are uploaded in 1MB chunks via S3 multipart upload
- Server generates presigned URLs for direct client-to-S3 upload
- Tracks chunk uploads in `chunkUploads` table
- Supports text and clipboard transfers in addition to files
- Transfer sessions expire after `TRANSFER_TTL_DAYS` (default 30)

### Shared Package (`packages/shared`)
- All TypeScript interfaces and DTOs used by server, web, and mobile
- Device types, TransferSession, TransferItem, Socket events, API response wrappers

### Web App (React 19 + Vite + Tailwind CSS 4 + @rabjs/react)
- **Styling**: Tailwind CSS v4 with CSS variables for theming, custom design tokens in `tailwind.config.js`
- **State Management**: @rabjs/react for reactive state with observer/Service patterns
- **Theme System**: `src/theme/` - Light/dark mode via CSS variables injected on `:root`, `dark` class on `<html>` for Tailwind dark mode
- **Real-time**: Socket.io client connected to server for device discovery and transfers
- `src/app.tsx` - Main app entry
- `src/theme/tokens.ts` - Theme token definitions (light/dark palettes)
- `src/theme/theme-provider.tsx` - React context for theme with system preference detection

### Real-time Communication (Socket.io)
**Server events handled:**
- `device:heartbeat` - Keep device marked as online
- `device:register` - Explicit device registration
- `transfer:notify` - Send transfer notification to target device
- `transfer:progress` - Emit progress updates to session room
- `transfer:complete` - Notify session of transfer completion

**Server events emitted:**
- `device:list` - List of user's devices (online/offline status)
- `transfer:new` - New incoming transfer notification

### Mobile App (React Native + Expo + expo-router)
- Uses file-based routing via expo-router

## Naming Conventions

- **Files and folders**: Use lowercase English with hyphens as separators (e.g., `feature-name`, `use-auth.ts`)
- **No camelCase** in file or directory names

### Component Organization (for pages/*/components/)

```
components/
├── feature-name/                 # Feature module (all related code together)
│   ├── index.ts                 # Barrel export for all public APIs
│   ├── feature-name.ts          # Main component
│   ├── feature-name.service.ts  # Service class (if using service pattern)
│   ├── feature-name-header.tsx  # Sub-components (header, footer, etc.)
│   ├── feature-name-content.tsx
│   ├── helper-component.tsx      # Helper components used only by this feature
│   └── hooks/                   # Custom hooks
│       └── use-hook.ts
```

## Tech Stack

- **Package Manager**: pnpm with workspaces
- **Build Tool**: Turbo
- **Server**: Express.js + Socket.io
- **Web**: React 19 + Vite + Tailwind CSS v4 + @rabjs/react
- **Mobile**: React Native + Expo
- **Shared Types**: TypeScript

## Development

1. Copy `.env.example` to `.env` in `apps/server`
2. Run `pnpm install`
3. Run `pnpm dev:server` to start the backend on port 3110
4. Run `pnpm dev:web` for frontend (runs on port 5274, proxies API to 3100)

### Environment Variables

**Server (`apps/server/.env`):**
```
PORT=3110
NODE_ENV=development

# JWT (required in production)
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>

# S3 (for file transfers)
S3_REGION=us-east-1
S3_ENDPOINT=<s3-compatible-endpoint>  # Optional, for S3-compatible storage
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=zen-send-transfers
TRANSFER_TTL_DAYS=30
```

### Web-Specific
- **Tailwind CSS v4**: Uses `@tailwindcss/postcss` plugin with PostCSS. Custom tokens defined in `tailwind.config.js` extend the default theme with colors, shadows, animations, and fonts
- **Theme Tokens**: Design tokens in `src/theme/tokens.ts` are applied as CSS variables on `:root`, making them available as Tailwind utilities (e.g., `bg-primary`, `text-text-secondary`)
- **Dark Mode**: Controlled via `dark` class on `<html>` element. ThemeProvider handles class toggle based on user preference or system setting
- **@rabjs/react**: Service-based state management using observer/view patterns with dependency injection

### Git Hooks
- **commitlint** validates commit messages (Conventional Commits format) on commit
- **changesets** manages versioning and changelogs (run `pnpm changeset` to create)
