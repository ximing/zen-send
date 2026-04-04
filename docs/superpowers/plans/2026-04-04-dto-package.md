# DTO Package Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `packages/dto` package with shared TypeScript types for request/response DTOs that both web and server can import for compile-time type checking. Server will keep class-validator decorators for runtime validation.

**Architecture:**
- Create `packages/dto` with plain TypeScript interface types (no class-validator)
- Server DTOs in `apps/server/src/dto/` will extend/implement these types and add class-validator decorators for runtime validation
- Web will import DTO types from `@zen-send/dto` for type checking
- `packages/shared` will re-export from `packages/dto` to maintain backwards compatibility

**Tech Stack:** TypeScript, pnpm workspaces

---

## Chunk 1: Create packages/dto Package

### Task 1: Create packages/dto directory structure

**Files:**
- Create: `packages/dto/package.json`
- Create: `packages/dto/tsconfig.json`
- Create: `packages/dto/src/index.ts`

- [ ] **Step 1: Create packages/dto/package.json**

```json
{
  "name": "@zen-send/dto",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/"
  },
  "devDependencies": {
    "@zen-send/typescript-config": "workspace:*",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create packages/dto/tsconfig.json**

```json
{
  "extends": "@zen-send/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/dto/src/index.ts with all DTO types**

```typescript
// Auth DTOs
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Device DTOs
export interface RegisterDeviceRequest {
  name: string;
  type: 'web' | 'android' | 'ios' | 'desktop';
}

// Transfer DTOs
export interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: 'file' | 'text' | 'clipboard';
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount: number;
}

export interface UploadChunkRequest {
  chunkIndex: number;
  etag: string;
}
```

- [ ] **Step 4: Add dto package to workspace and install**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm install`
Expected: dto package is recognized and linked

- [ ] **Step 5: Commit**

```bash
git add packages/dto/
git commit -m "feat(dto): create @zen-send/dto package with shared DTO types"
```

---

### Task 2: Update server to use @zen-send/dto types

**Files:**
- Modify: `apps/server/src/dto/auth.dto.ts`
- Modify: `apps/server/src/dto/device.dto.ts`
- Modify: `apps/server/src/dto/transfer.dto.ts`
- Modify: `apps/server/package.json`

- [ ] **Step 1: Add @zen-send/dto dependency to server**

Modify `apps/server/package.json`:
```json
"@zen-send/dto": "workspace:*",
```

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm install`

- [ ] **Step 2: Update apps/server/src/dto/auth.dto.ts**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import type { RegisterRequest, LoginRequest, RefreshTokenRequest } from '@zen-send/dto';

export class RegisterDto implements RegisterRequest {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto implements LoginRequest {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto implements RefreshTokenRequest {
  @IsString()
  refreshToken!: string;
}
```

- [ ] **Step 3: Update apps/server/src/dto/device.dto.ts**

```typescript
import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import type { RegisterDeviceRequest } from '@zen-send/dto';

export class RegisterDeviceDto implements RegisterDeviceRequest {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(['web', 'android', 'ios', 'desktop'])
  type!: 'web' | 'android' | 'ios' | 'desktop';
}
```

- [ ] **Step 4: Update apps/server/src/dto/transfer.dto.ts**

```typescript
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  MinLength,
  IsInt,
  IsPositive,
} from 'class-validator';
import type { InitTransferRequest, UploadChunkRequest } from '@zen-send/dto';

export class InitTransferDto implements InitTransferRequest {
  @IsString()
  sourceDeviceId!: string;

  @IsOptional()
  @IsString()
  targetDeviceId?: string;

  @IsEnum(['file', 'text', 'clipboard'])
  type!: 'file' | 'text' | 'clipboard';

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsNumber()
  @IsInt()
  @IsPositive()
  totalSize!: number;

  @IsNumber()
  @IsInt()
  @IsPositive()
  chunkCount!: number;
}

export class UploadChunkDto implements UploadChunkRequest {
  @IsNumber()
  @IsInt()
  @Min(0)
  chunkIndex!: number;

  @IsString()
  @MinLength(1)
  etag!: string;
}
```

- [ ] **Step 5: Verify server builds**

Run: `pnpm --filter @zen-send/server typecheck`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/dto/ apps/server/package.json
git commit -m "refactor(server): use @zen-send/dto types in server DTOs"
```

---

### Task 3: Update web to use @zen-send/dto types

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/services/auth.service.ts`

- [ ] **Step 1: Add @zen-send/dto dependency to web**

Modify `apps/web/package.json`:
```json
"@zen-send/dto": "workspace:*",
```

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm install`

- [ ] **Step 2: Update apps/web/src/services/auth.service.ts to import from @zen-send/dto**

```typescript
// Stub service - will be replaced in Task 3
import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import type { LoginRequest, RegisterRequest, AuthTokens } from '@zen-send/dto';
```

Wait - `AuthTokens` is not a request/response DTO, it's in `packages/shared`. Need to check what types are needed.

Actually, looking at auth.service.ts line 4:
```typescript
import type { LoginRequest, RegisterRequest, AuthTokens } from '@zen-send/shared';
```

`LoginRequest` and `RegisterRequest` should come from `@zen-send/dto`, but `AuthTokens` stays in `packages/shared` since it's a response type with user data.

- [ ] **Step 3: Verify web builds**

Run: `pnpm --filter @zen-send/web typecheck`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/src/services/auth.service.ts
git commit -m "refactor(web): use @zen-send/dto for request types"
```

---

### Task 4: Update packages/shared to re-export DTO types (backwards compatibility)

**Files:**
- Modify: `packages/shared/src/index.ts`

Note: This step is optional - only if we want to maintain backwards compatibility for any imports from `@zen-send/shared`. If web is the only consumer and we just updated it, we can skip this step.

If needed:
- [ ] **Step 1: Re-export DTO types from shared**

Add to `packages/shared/src/index.ts`:
```typescript
// Re-export DTOs from @zen-send/dto for backwards compatibility
export type { RegisterRequest, LoginRequest, RefreshTokenRequest } from '@zen-send/dto';
export type { RegisterDeviceRequest } from '@zen-send/dto';
export type { InitTransferRequest, UploadChunkRequest } from '@zen-send/dto';
```

- [ ] **Step 2: Commit** (if doing this step)

```bash
git add packages/shared/src/index.ts
git commit -m "chore(shared): re-export DTO types from @zen-send/dto"
```

---

## Chunk 2: Verify and Cleanup

### Task 5: Run full typecheck

- [ ] **Step 1: Run typecheck on all packages**

Run: `pnpm typecheck`
Expected: All packages pass type checking

- [ ] **Step 2: Commit final changes**

---

## Summary of Changes

| Package | Change |
|---------|--------|
| `packages/dto` | **Created** - new package with TypeScript DTO interfaces |
| `apps/server` | Updated DTOs to implement types from `@zen-send/dto`, kept class-validator decorators |
| `apps/web` | Import request DTOs from `@zen-send/dto` instead of duplicating |
| `packages/shared` | Optional: re-export DTO types for backwards compatibility |

## Verification Commands

```bash
# Type check all
pnpm typecheck

# Build all packages
pnpm build

# Run server dev
pnpm dev:server

# Run web dev
pnpm dev:web
```
