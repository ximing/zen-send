# CLAUDE.md

Zen Send - Cross-platform clipboard, text, and file transfer tool (like LocalSend)

## Architecture

### Apps
- **apps/server**: Express.js backend with Socket.io for real-time communication
- **apps/web**: React 19 frontend with Vite (port 5274, proxies API to server)
- **apps/mobile**: React Native (Expo) for Android and iOS
- **apps/electron**: Electron desktop app for Windows/macOS/Linux

### Packages
- **packages/dto**: Shared TypeScript interface types for request/response DTOs
- **packages/shared**: Re-exports from `@zen-send/dto` plus domain types (Device, TransferSession, Socket events)
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
pnpm --filter @zen-send/server migrate:generate  # Generate Drizzle migrations
pnpm --filter @zen-send/server migrate:migrate    # Run Drizzle migrations

# Web-specific
cd apps/web && pnpm dev          # Run web only
cd apps/web && pnpm build        # Build web for production (outputs to server/public)
cd apps/web && pnpm typecheck   # Type-check web only

# Electron-specific
cd apps/electron && pnpm dev     # Run Electron app in dev mode
cd apps/electron && pnpm dist:mac  # Build macOS .app
cd apps/electron && pnpm dist:win  # Build Windows .exe
cd apps/electron && pnpm dist:linux  # Build Linux AppImage
```

## Naming Conventions

- **Files and folders**: Use lowercase English with hyphens as separators (e.g., `feature-name`, `use-auth.ts`)
- **No camelCase** in file or directory names
- **Validators**: `*.validator.ts` suffix (e.g., `auth.validator.ts`)
- **Controllers**: `*.controller.ts` suffix

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
- **Server**: Express.js + routing-controllers + Socket.io + typedi
- **Web**: React 19 + Vite + Tailwind CSS v4 + @rabjs/react
- **Mobile**: React Native + Expo
- **Desktop**: Electron 40 + Vite + @rabjs/react
- **Validation**: class-validator + class-transformer
- **Database**: Drizzle ORM + MySQL
- **File Storage**: AWS S3 (presigned URLs for direct client upload)

## Development

1. Copy `.env.example` to `.env` in `apps/server`
2. Run `pnpm install`
3. Run `pnpm dev:server` to start the backend (auto-reload on file changes)
4. Run `pnpm dev:web` for frontend (runs on port 5274, proxies API to server port)

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

### Git Hooks
- **commitlint** validates commit messages (Conventional Commits format) on commit
- **changesets** manages versioning and changelogs (run `pnpm changeset` to create)

## Subsystem-Specific Rules

Detailed rules for each subsystem live in their own directories:
- `apps/server/CLAUDE.md` — Server architecture, IOC, DTO, database, Socket.io, transfer module
- `apps/web/CLAUDE.md` — Web @rabjs/react rules, design system, directory structure
- `apps/mobile/CLAUDE.md` — Mobile @rabjs/react rules, design system, platform specifics
- `.claude/rules/rabjs.md` — Cross-app @rabjs/react critical rules (web + electron + mobile)

使用中文对话