# Zen Send

Cross-platform clipboard, text, and file transfer tool (like LocalSend)

<p align="center">
  <img src="https://img.shields.io/badge/Platforms-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS%20%7C%20Web-blue" alt="Platforms">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

## Features

- **Cross-Platform** - Supports Windows, macOS, Linux, Android, iOS, and Web browsers
- **File Transfer** - Large file support via S3 chunked multipart upload
- **Clipboard Sync** - Synchronize clipboard content across devices
- **Real-Time Communication** - Instant device discovery and transfer notifications via Socket.io
- **End-to-End Security** - JWT authentication + S3 presigned URL direct upload

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client Apps                        │
├──────────┬──────────┬──────────┬──────────┬────────────┤
│  Web     │   iOS    │ Android  │ Electron │   Mobile   │
│  (Vite)  │  (Expo)  │  (Expo)  │ Desktop │   (RN)     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴─────┬──────┘
     │          │          │          │           │
     └──────────┴──────────┴──────────┴───────────┘
                            │
                     Socket.io + REST
                            │
     ┌──────────────────────┴───────────────────────┐
     │              apps/server                      │
     │   Express.js + routing-controllers + Socket.io │
     │              typedi (IOC)                     │
     └──────────────────────┬───────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Drizzle ORM                  AWS S3
           (MySQL)               (Presigned URLs)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Web Frontend | React 19 + Vite + Tailwind CSS v4 + @rabjs/react |
| Mobile | React Native + Expo |
| Desktop | Electron 40 + Vite |
| Backend | Express.js + routing-controllers + Socket.io + typedi |
| Database | Drizzle ORM + MySQL |
| File Storage | AWS S3 (Presigned URL Direct Upload) |
| Package Manager | pnpm + Turbo |

## Quick Start

### Requirements

- Node.js 18+
- pnpm 8+
- MySQL 8+
- AWS S3 or compatible storage

### Installation

```bash
# Clone the project
git clone https://github.com/your-org/zen-send.git
cd zen-send

# Install dependencies
pnpm install

# Configure environment variables
cp apps/server/.env.example apps/server/.env
# Edit .env with your configuration
```

### Start Development

```bash
# Start all apps
pnpm dev

# Backend only
pnpm dev:server

# Web frontend only
pnpm dev:web

# Mobile app
pnpm dev:mobile

# Electron desktop app
cd apps/electron && pnpm dev
```

## Project Structure

```
zen-send/
├── apps/
│   ├── server/           # Express.js backend
│   ├── web/              # React Web app
│   ├── mobile/           # React Native mobile
│   └── electron/         # Electron desktop
├── packages/
│   ├── dto/              # Shared TypeScript interfaces
│   ├── shared/           # Shared types and utilities
│   └── logger/           # Logging utility
└── config/
    ├── eslint-config/    # ESLint configuration
    └── typescript-config/ # TypeScript configuration
```

## Commands Reference

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Run all apps
pnpm dev:server       # Run backend (port 3110)
pnpm dev:web          # Run web (port 5274)
pnpm dev:mobile       # Run Expo mobile

# Build
pnpm build            # Build all packages
pnpm clean            # Clean build outputs

# Code Quality
pnpm lint             # ESLint check
pnpm lint:fix         # ESLint auto-fix
pnpm format           # Prettier format
pnpm typecheck        # TypeScript check

# Database
pnpm --filter @zen-send/server migrate:generate  # Generate migration
pnpm --filter @zen-send/server migrate:migrate    # Run migration

# Electron Build
cd apps/electron && pnpm dist:mac    # Build macOS .app
cd apps/electron && pnpm dist:win    # Build Windows .exe
cd apps/electron && pnpm dist:linux  # Build Linux AppImage
```

## Environment Variables

```bash
# Backend config (apps/server/.env)
PORT=3110
NODE_ENV=development

# JWT Authentication
JWT_ACCESS_SECRET=<your-access-secret>
JWT_REFRESH_SECRET=<your-refresh-secret>

# S3 Storage
S3_REGION=us-east-1
S3_ENDPOINT=<s3-compatible-endpoint>  # Optional, for S3-compatible storage
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_BUCKET=zen-send-transfers
TRANSFER_TTL_DAYS=30
```

## License

MIT
