# User Avatar & Nickname Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user avatar (S3 presigned upload) and nickname support across server, web, and mobile.

**Architecture:** New `UserController` + `UserService` on server handle profile CRUD and avatar presign/confirm flow. Clients upload images directly to S3. Shared types and DTOs updated to carry `nickname` and `avatarUrl` (resolved presigned URL) in auth responses. Settings page on both platforms for editing.

**Tech Stack:** Express + routing-controllers + typedi + Drizzle + S3 (server), React + @rabjs/react + Tailwind (web), React Native + Expo + @rabjs/react (mobile)

---

## Chunk 1: Data Layer

### Task 1: Add DTO interfaces

**Files:**
- Modify: `packages/dto/src/index.ts`

- [ ] **Step 1: Add new DTO interfaces to packages/dto/src/index.ts**

Append after the existing `UploadChunkRequest` interface:

```typescript
// User Profile DTOs
export interface UpdateProfileRequest {
  nickname?: string;
  removeAvatar?: boolean;
}

export interface AvatarPresignRequest {
  contentType: string;
  fileSize?: number;
}

export interface AvatarPresignResponse {
  uploadUrl: string;
  key: string;
}

export interface AvatarConfirmRequest {
  key: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
}
```

- [ ] **Step 2: Build packages/dto**

Run: `pnpm --filter @zen-send/dto build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Commit**

```bash
git add packages/dto/src/index.ts
git commit -m "feat(dto): add user profile DTOs for avatar and nickname"
```

### Task 2: Update shared types

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Update AuthTokens.user type to include nickname and avatarUrl**

In `packages/shared/src/index.ts`, change the `AuthTokens` interface:

```typescript
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    nickname?: string;
    avatarUrl?: string;
  };
}
```

- [ ] **Step 2: Add re-exports for new DTOs**

At the end of the re-export section, add:

```typescript
export type {
  UpdateProfileRequest,
  AvatarPresignRequest,
  AvatarPresignResponse,
  AvatarConfirmRequest,
  UserProfileResponse,
} from '@zen-send/dto';
```

- [ ] **Step 3: Build packages/shared**

Run: `pnpm --filter @zen-send/shared build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): add nickname and avatarUrl to AuthTokens, re-export profile DTOs"
```

### Task 3: Update database schema

**Files:**
- Modify: `apps/server/src/db/schema.ts`

- [ ] **Step 1: Add avatarKey and nickname columns to users table**

In `apps/server/src/db/schema.ts`, update the `users` table definition:

```typescript
export const users = mysqlTable('users', {
  id: varchar('id', { length: 24 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('passwordHash', { length: 255 }).notNull(),
  avatarKey: varchar('avatarKey', { length: 500 }),
  nickname: varchar('nickname', { length: 50 }),
  createdAt: int('createdAt').notNull(),
  updatedAt: int('updatedAt').notNull(),
});
```

- [ ] **Step 2: Generate Drizzle migration**

Run: `pnpm --filter @zen-send/server migrate:generate`
Expected: Migration file created with `ALTER TABLE users ADD COLUMN avatarKey VARCHAR(500), ADD COLUMN nickname VARCHAR(50)`

- [ ] **Step 3: Run migration**

Run: `pnpm --filter @zen-send/server migrate:migrate`
Expected: Migration applied successfully

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/db/schema.ts apps/server/drizzle/
git commit -m "feat(server): add avatarKey and nickname columns to users table"
```

---

## Chunk 2: Server API

### Task 4: Add getPresignedInlineUrl to S3Service

**Files:**
- Modify: `apps/server/src/services/s3.service.ts`

- [ ] **Step 1: Add getPresignedInlineUrl method after getPresignedDownloadUrl (after line 80)**

Unlike `getPresignedDownloadUrl` which sets `Content-Disposition: attachment`, this method omits `ResponseContentDisposition` so browsers display the image inline in `<img>` tags rather than triggering a download.

```typescript
async getPresignedInlineUrl(key: string, expiresIn = 86400): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: this.bucket,
    Key: key,
  });
  return getSignedUrl(this.getClient(), command, { expiresIn });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/s3.service.ts
git commit -m "feat(server): add getPresignedInlineUrl to S3Service for avatar display"
```

### Task 5: Add user validator

**Files:**
- Create: `apps/server/src/validators/user.validator.ts`

- [ ] **Step 1: Create user.validator.ts**

```typescript
import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, IsNumber, Max } from 'class-validator';
import type {
  UpdateProfileRequest,
  AvatarPresignRequest,
  AvatarConfirmRequest,
} from '@zen-send/dto';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

export class UpdateProfileDto implements UpdateProfileRequest {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  removeAvatar?: boolean;
}

export class AvatarPresignDto implements AvatarPresignRequest {
  @IsString()
  @IsIn(ALLOWED_AVATAR_TYPES)
  contentType!: string;

  @IsOptional()
  @IsNumber()
  @Max(MAX_AVATAR_SIZE)
  fileSize?: number;
}

export class AvatarConfirmDto implements AvatarConfirmRequest {
  @IsString()
  key!: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/validators/user.validator.ts
git commit -m "feat(server): add user profile validators"
```

### Task 6: Create UserService

**Files:**
- Create: `apps/server/src/services/user.service.ts`

- [ ] **Step 1: Create user.service.ts with proper TypeDI constructor injection**

```typescript
import { eq } from 'drizzle-orm';
import { Service } from 'typedi';
import { DbService } from './db.service.js';
import { S3Service } from './s3.service.js';
import { users } from '../db/schema.js';
import { logger } from '@zen-send/logger';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_KEY_PREFIX = 'avatars/';

@Service()
export class UserService {
  constructor(
    private dbService: DbService,
    private s3Service: S3Service,
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getProfile(userId: string) {
    const result = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (result.length === 0) {
      throw new Error('User not found');
    }
    const user = result[0];
    let avatarUrl: string | undefined;
    if (user.avatarKey) {
      avatarUrl = await this.s3Service.getPresignedInlineUrl(user.avatarKey);
    }
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname ?? undefined,
      avatarUrl,
    };
  }

  async updateProfile(userId: string, data: { nickname?: string; removeAvatar?: boolean }) {
    const now = Math.floor(Date.now() / 1000);
    const updates: Record<string, any> = { updatedAt: now };

    if (data.nickname !== undefined) {
      updates.nickname = data.nickname || null;
    }

    if (data.removeAvatar) {
      const result = await this.db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, userId)).limit(1);
      const oldKey = result[0]?.avatarKey;
      updates.avatarKey = null;
      if (oldKey) {
        await this.s3Service.deleteObject(oldKey).catch((err: Error) =>
          logger.warn({ err, key: oldKey }, 'Failed to delete old avatar')
        );
      }
    }

    await this.db.update(users).set(updates).where(eq(users.id, userId));
    return this.getProfile(userId);
  }

  async presignAvatar(userId: string, contentType: string, fileSize?: number) {
    if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
      throw new Error(`Invalid content type: ${contentType}. Allowed: ${ALLOWED_AVATAR_TYPES.join(', ')}`);
    }
    if (fileSize && fileSize > MAX_AVATAR_SIZE) {
      throw new Error(`File size ${fileSize} exceeds maximum ${MAX_AVATAR_SIZE} bytes`);
    }

    const ext = contentType.split('/')[1];
    const timestamp = Date.now();
    const key = `${AVATAR_KEY_PREFIX}${userId}/${timestamp}.${ext}`;
    const uploadUrl = await this.s3Service.getPresignedUploadUrl(key, contentType);

    return { uploadUrl, key };
  }

  async confirmAvatar(userId: string, key: string) {
    const expectedPrefix = `${AVATAR_KEY_PREFIX}${userId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new Error('Invalid avatar key');
    }

    const result = await this.db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, userId)).limit(1);
    const oldKey = result[0]?.avatarKey;

    const now = Math.floor(Date.now() / 1000);
    await this.db.update(users).set({ avatarKey: key, updatedAt: now }).where(eq(users.id, userId));

    if (oldKey && oldKey !== key) {
      await this.s3Service.deleteObject(oldKey).catch((err: Error) =>
        logger.warn({ err, key: oldKey }, 'Failed to delete old avatar')
      );
    }

    return this.getProfile(userId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/user.service.ts
git commit -m "feat(server): add UserService for profile and avatar operations"
```

### Task 7: Create UserController

**Files:**
- Create: `apps/server/src/controllers/user.controller.ts`
- Modify: `apps/server/src/controllers/index.ts`

- [ ] **Step 1: Create user.controller.ts**

```typescript
// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import {
  JsonController,
  Get,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpError,
  CurrentUser,
  Authorized,
} from 'routing-controllers';
import { Service } from 'typedi';
import { UserService } from '../services/user.service.js';
import {
  UpdateProfileDto,
  AvatarPresignDto,
  AvatarConfirmDto,
} from '../validators/user.validator.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../utils/jwt.js';

@JsonController('/api/users')
@Service()
@Authorized()
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/me')
  async getProfile(@CurrentUser() user: TokenPayload) {
    try {
      const profile = await this.userService.getProfile(user.userId);
      return ResponseUtil.success(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      if (message.includes('not found')) {
        throw new HttpError(404, message);
      }
      throw new HttpError(400, message);
    }
  }

  @Patch('/me')
  @HttpCode(200)
  async updateProfile(@CurrentUser() user: TokenPayload, @Body() dto: UpdateProfileDto) {
    try {
      const profile = await this.userService.updateProfile(user.userId, {
        nickname: dto.nickname,
        removeAvatar: dto.removeAvatar,
      });
      return ResponseUtil.success(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      throw new HttpError(400, message);
    }
  }

  @Post('/me/avatar/presign')
  @HttpCode(200)
  async presignAvatar(@CurrentUser() user: TokenPayload, @Body() dto: AvatarPresignDto) {
    try {
      const result = await this.userService.presignAvatar(
        user.userId,
        dto.contentType,
        dto.fileSize
      );
      return ResponseUtil.success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to presign avatar';
      throw new HttpError(400, message);
    }
  }

  @Post('/me/avatar/confirm')
  @HttpCode(200)
  async confirmAvatar(@CurrentUser() user: TokenPayload, @Body() dto: AvatarConfirmDto) {
    try {
      const profile = await this.userService.confirmAvatar(user.userId, dto.key);
      return ResponseUtil.success(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm avatar';
      throw new HttpError(400, message);
    }
  }
}
```

- [ ] **Step 2: Register UserController in controllers/index.ts**

In `apps/server/src/controllers/index.ts`, add:

```typescript
import { UserController } from './user.controller.js';

export const controllers = [
  AuthController,
  DeviceController,
  HealthController,
  TransferController,
  ExternalLinkController,
  UserController,
];
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/controllers/user.controller.ts apps/server/src/controllers/index.ts
git commit -m "feat(server): add UserController with profile and avatar endpoints"
```

### Task 8: Update AuthService to include nickname/avatarUrl in auth response

**Files:**
- Modify: `apps/server/src/services/auth.service.ts`

- [ ] **Step 1: Add S3Service import**

Add at the top of the file:

```typescript
import { S3Service } from './s3.service.js';
```

- [ ] **Step 2: Update AuthTokens interface to include nickname and avatarUrl**

Change the `AuthTokens` interface (lines 16-23):

```typescript
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user?: {
    id: string;
    email: string;
    nickname?: string;
    avatarUrl?: string;
  };
}
```

- [ ] **Step 3: Update constructor to inject S3Service**

Change the constructor (line 49):

```typescript
constructor(
  private dbService: DbService,
  private s3Service: S3Service,
) {}
```

- [ ] **Step 4: Update generateTokens to accept and pass nickname/avatarUrl**

Change `generateTokens` method (line 63):

```typescript
private generateTokens(
  payload: TokenPayload,
  user?: { id: string; email: string; nickname?: string; avatarUrl?: string }
): AuthTokens {
  const tokens: AuthTokens = {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
  if (user) {
    tokens.user = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    };
  }
  return tokens;
}
```

- [ ] **Step 5: Update login method to resolve avatarKey and pass nickname/avatarUrl**

```typescript
async login(input: LoginInput): Promise<AuthTokens> {
  const result = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);

  if (result.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result[0];
  const isValid = await this.verifyPassword(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  let avatarUrl: string | undefined;
  if (user.avatarKey) {
    avatarUrl = await this.s3Service.getPresignedInlineUrl(user.avatarKey);
  }

  return this.generateTokens(
    { userId: user.id },
    { id: user.id, email: user.email, nickname: user.nickname ?? undefined, avatarUrl }
  );
}
```

- [ ] **Step 6: Update refresh method similarly**

```typescript
async refresh(refreshToken: string): Promise<AuthTokens> {
  if (this.invalidatedTokens.has(refreshToken)) {
    throw new Error('Token has been invalidated');
  }

  const payload = verifyRefreshToken(refreshToken);

  if (!payload.userId) {
    throw new Error('Invalid refresh token');
  }

  const result = await this.db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
  if (result.length === 0) {
    throw new Error('User not found');
  }
  const user = result[0];

  let avatarUrl: string | undefined;
  if (user.avatarKey) {
    avatarUrl = await this.s3Service.getPresignedInlineUrl(user.avatarKey);
  }

  return this.generateTokens(
    { userId: payload.userId },
    { id: user.id, email: user.email, nickname: user.nickname ?? undefined, avatarUrl }
  );
}
```

Note: The `register` method does not need changes — new users have no avatar or nickname, so `generateTokens` is called with `{ id, email }` only, and `nickname`/`avatarUrl` default to `undefined`.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/services/auth.service.ts
git commit -m "feat(server): include nickname and avatarUrl in auth response"
```

### Task 9: Verify server builds and typecheck

- [ ] **Step 1: Run server typecheck**

Run: `pnpm --filter @zen-send/server typecheck`
Expected: No type errors

- [ ] **Step 2: Run server build**

Run: `pnpm --filter @zen-send/server build`
Expected: Build succeeds

- [ ] **Step 3: If errors, fix and re-commit**

---

## Chunk 3: Web Client

### Task 10: Update web AuthService user type

**Files:**
- Modify: `apps/web/src/services/auth.service.ts`

- [ ] **Step 1: Update user type to include nickname and avatarUrl**

Change line 12:

```typescript
user: { id: string; email: string; nickname?: string; avatarUrl?: string } | null = null;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/services/auth.service.ts
git commit -m "feat(web): add nickname and avatarUrl to AuthService user type"
```

### Task 11: Add upload method to web ApiService

**Files:**
- Modify: `apps/web/src/services/api.service.ts`

- [ ] **Step 1: Add uploadPresignedUrl method to ApiService**

Add after the `patch` method (after line 77):

```typescript
async uploadPresignedUrl(presignedUrl: string, file: File): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/services/api.service.ts
git commit -m "feat(web): add uploadPresignedUrl method to ApiService"
```

### Task 12: Create web UserService

**Files:**
- Create: `apps/web/src/services/user.service.ts`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Create user.service.ts**

UserService is registered as a global service (not page-level) because NavContent also needs access to profile data for avatar display.

```typescript
import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type {
  UpdateProfileRequest,
  AvatarPresignResponse,
  UserProfileResponse,
} from '@zen-send/dto';

@Service()
export class UserService {
  get apiService() {
    return this.resolve(ApiService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  async getProfile(): Promise<UserProfileResponse> {
    const profile = await this.apiService.get<UserProfileResponse>('/api/users/me');
    this.syncLocalUser(profile);
    return profile;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    const profile = await this.apiService.patch<UserProfileResponse>('/api/users/me', data);
    this.syncLocalUser(profile);
    return profile;
  }

  async uploadAvatar(file: File): Promise<UserProfileResponse> {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File size must be less than 2MB');
    }

    const presignResult = await this.apiService.post<AvatarPresignResponse>(
      '/api/users/me/avatar/presign',
      { contentType: file.type, fileSize: file.size }
    );

    await this.apiService.uploadPresignedUrl(presignResult.uploadUrl, file);

    const profile = await this.apiService.post<UserProfileResponse>(
      '/api/users/me/avatar/confirm',
      { key: presignResult.key }
    );

    this.syncLocalUser(profile);
    return profile;
  }

  private syncLocalUser(profile: UserProfileResponse) {
    if (this.authService.user) {
      this.authService.user = {
        ...this.authService.user,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      };
    }
  }
}
```

- [ ] **Step 2: Register UserService as global service in main.tsx**

In `apps/web/src/main.tsx`, add:

```typescript
import { UserService } from './services/user.service';

register(UserService);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/services/user.service.ts apps/web/src/main.tsx
git commit -m "feat(web): add UserService for profile and avatar operations"
```

### Task 13: Update web NavContent for avatar and nickname display

**Files:**
- Modify: `apps/web/src/components/nav-content/index.tsx`

- [ ] **Step 1: Add Settings icon to imports**

```typescript
import { Home, Download, Sun, Moon, LogOut, Smartphone, Settings } from 'lucide-react';
```

- [ ] **Step 2: Update avatar section to show image when available**

Replace lines 56-67 (the user info section `div`) with:

```typescript
{/* User Info Section */}
<div
  className="flex flex-col items-center pb-6 border-b border-[var(--border-subtle)] mb-4 pt-5 px-5 cursor-pointer"
  onClick={() => { navigate('/settings'); onNavigate?.(); }}
>
  {user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt="Avatar"
      className="w-16 h-16 rounded-full object-cover mb-3"
    />
  ) : (
    <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-3">
      <span className="text-2xl font-semibold text-[var(--accent)]">
        {user?.email?.charAt(0).toUpperCase() ?? '?'}
      </span>
    </div>
  )}
  <span className="text-lg font-semibold text-[var(--text-primary)]">
    {user?.nickname || user?.email?.split('@')[0] || 'User'}
  </span>
  <span className="text-sm text-[var(--text-secondary)]">{user?.email ?? ''}</span>
  <span className="text-xs text-[var(--text-muted)]">{serverUrl}</span>
</div>
```

- [ ] **Step 3: Add settings nav item**

Add to the `navItems` array:

```typescript
{ path: '/settings', label: '设置', icon: Settings, onClick: () => { navigate('/settings'); onNavigate?.(); } },
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/nav-content/index.tsx
git commit -m "feat(web): show avatar image and nickname in NavContent"
```

### Task 14: Build web settings page

**Files:**
- Modify: `apps/web/src/pages/settings/index.tsx`

- [ ] **Step 1: Replace stub with full settings page**

```tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { ChevronLeft, Camera } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

function SettingsPageInner() {
  const navigate = useNavigate();
  const authService = useService(AuthService);
  const userService = useService(UserService);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = authService.user;
  const [nickname, setNickname] = useState(user?.nickname || user?.email?.split('@')[0] || '');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Fetch fresh profile on mount to handle presigned URL expiry
  useEffect(() => {
    userService.getProfile().catch(console.error);
  }, []);

  const handleSaveNickname = async () => {
    setIsSavingNickname(true);
    try {
      await userService.updateProfile({ nickname });
    } catch (err) {
      console.error('Failed to save nickname:', err);
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await userService.uploadAvatar(file);
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await userService.updateProfile({ removeAvatar: true });
    } catch (err) {
      console.error('Failed to remove avatar:', err);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-2 py-2 shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        <button
          onClick={() => navigate('/')}
          className="p-1 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <ChevronLeft size={24} className="text-[var(--text-primary)]" />
        </button>
        <span className="flex-1 text-lg font-semibold text-[var(--text-primary)] ml-2">
          Settings
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                <span className="text-4xl font-semibold text-[var(--accent)]">
                  {user?.email?.charAt(0).toUpperCase() ?? '?'}
                </span>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              <Camera size={16} />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
          {user?.avatarUrl && (
            <button
              onClick={handleRemoveAvatar}
              className="mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Remove avatar
            </button>
          )}
          {isUploadingAvatar && (
            <span className="mt-2 text-sm text-[var(--text-muted)]">Uploading...</span>
          )}
        </div>

        {/* Nickname Section */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Nickname
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={user?.email?.split('@')[0] || 'Enter nickname'}
              maxLength={50}
              className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            <button
              onClick={handleSaveNickname}
              disabled={isSavingNickname}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSavingNickname ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="mt-6 space-y-2">
          <label className="block text-sm font-medium text-[var(--text-secondary)]">
            Email
          </label>
          <div className="px-3 py-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] text-sm">
            {user?.email ?? ''}
          </div>
        </div>
      </div>
    </div>
  );
}

export default observer(SettingsPageInner);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/settings/index.tsx
git commit -m "feat(web): build settings page with avatar and nickname editing"
```

### Task 15: Verify web builds

- [ ] **Step 1: Run web typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: No type errors

- [ ] **Step 2: If errors, fix and re-commit**

---

## Chunk 4: Mobile Client

### Task 16: Update mobile AuthService user type

**Files:**
- Modify: `apps/mobile/src/services/auth.service.ts`

- [ ] **Step 1: Update user type to include nickname and avatarUrl**

Change line 16:

```typescript
user: { id: string; email: string; nickname?: string; avatarUrl?: string } | null = null;
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/services/auth.service.ts
git commit -m "feat(mobile): add nickname and avatarUrl to AuthService user type"
```

### Task 17: Add upload method to mobile ApiService

**Files:**
- Modify: `apps/mobile/src/services/api.service.ts`

- [ ] **Step 1: Add uploadPresignedUrl method after the patch method**

```typescript
async uploadPresignedUrl(presignedUrl: string, fileUri: string, contentType: string): Promise<void> {
  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
    body: {
      uri: fileUri,
      type: contentType,
      name: 'avatar',
    } as any,
  });
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status}`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/services/api.service.ts
git commit -m "feat(mobile): add uploadPresignedUrl method to ApiService"
```

### Task 18: Create mobile UserService

**Files:**
- Create: `apps/mobile/src/services/user.service.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Create user.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type {
  UpdateProfileRequest,
  AvatarPresignResponse,
  UserProfileResponse,
} from '@zen-send/dto';

@Service()
export class UserService {
  get apiService() {
    return this.resolve(ApiService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  async getProfile(): Promise<UserProfileResponse> {
    const profile = await this.apiService.get<UserProfileResponse>('/api/users/me');
    this.syncLocalUser(profile);
    return profile;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    const profile = await this.apiService.patch<UserProfileResponse>('/api/users/me', data);
    this.syncLocalUser(profile);
    return profile;
  }

  async uploadAvatar(fileUri: string, contentType: string, fileSize: number): Promise<UserProfileResponse> {
    if (fileSize > 2 * 1024 * 1024) {
      throw new Error('File size must be less than 2MB');
    }

    const presignResult = await this.apiService.post<AvatarPresignResponse>(
      '/api/users/me/avatar/presign',
      { contentType, fileSize }
    );

    await this.apiService.uploadPresignedUrl(presignResult.uploadUrl, fileUri, contentType);

    const profile = await this.apiService.post<UserProfileResponse>(
      '/api/users/me/avatar/confirm',
      { key: presignResult.key }
    );

    this.syncLocalUser(profile);
    return profile;
  }

  private syncLocalUser(profile: UserProfileResponse) {
    if (this.authService.user) {
      this.authService.user = {
        ...this.authService.user,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      };
    }
  }
}
```

- [ ] **Step 2: Register UserService in _layout.tsx**

In `apps/mobile/app/_layout.tsx`, add:

```typescript
import { UserService } from '../src/services/user.service';

register(UserService);
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/user.service.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add UserService for profile and avatar operations"
```

### Task 19: Update mobile DrawerContent for avatar and nickname display

**Files:**
- Modify: `apps/mobile/src/components/drawer/drawer-content.tsx`

- [ ] **Step 1: Update imports — add Image**

```typescript
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
```

- [ ] **Step 2: Update avatar section — change View to TouchableOpacity for navigation**

Replace the user info section (the `<View style={[styles.userSection, ...]}>` block) with:

```tsx
{/* User Info Section */}
<TouchableOpacity
  style={[styles.userSection, { borderBottomColor: colors.borderSubtle }]}
  onPress={() => { onClose?.(); router.push('/(main)/settings'); }}
>
  {user?.avatarUrl ? (
    <Image
      source={{ uri: user.avatarUrl }}
      style={styles.avatarImage}
    />
  ) : (
    <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.avatarText, { color: colors.accent }]}>
        {user?.email?.charAt(0).toUpperCase() ?? '?'}
      </Text>
    </View>
  )}
  <Text style={[styles.username, { color: colors.textPrimary }]}>
    {user?.nickname || user?.email?.split('@')[0] || 'User'}
  </Text>
  <Text style={[styles.email, { color: colors.textSecondary }]}>
    {user?.email ?? ''}
  </Text>
  <Text style={[styles.serverUrl, { color: colors.textMuted }]}>
    {serverUrl}
  </Text>
</TouchableOpacity>
```

- [ ] **Step 3: Add avatarImage style to StyleSheet**

```typescript
avatarImage: {
  width: 64,
  height: 64,
  borderRadius: 32,
  marginBottom: 12,
},
```

- [ ] **Step 4: Add settings action button in the actions section**

Add after the downloads action button:

```tsx
<TouchableOpacity
  style={styles.actionButton}
  onPress={() => { onClose?.(); router.push('/(main)/settings'); }}
>
  <Ionicons name="settings-outline" size={20} color={colors.textPrimary} />
  <Text style={[styles.actionText, { color: colors.textPrimary }]}>
    设置
  </Text>
</TouchableOpacity>
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/drawer/drawer-content.tsx
git commit -m "feat(mobile): show avatar image, nickname, and settings in Drawer"
```

### Task 20: Create mobile settings page

**Files:**
- Create: `apps/mobile/app/(main)/settings.tsx`
- Modify: `apps/mobile/app/(main)/_layout.tsx`

- [ ] **Step 1: Create settings.tsx**

```tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { observer, useService } from '@rabjs/react';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { ThemeService } from '../../src/services/theme.service';
import { showToast } from '../../src/components/toast';

function SettingsPageInner() {
  const authService = useService(AuthService);
  const userService = useService(UserService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const user = authService.user;
  const [nickname, setNickname] = useState(user?.nickname || user?.email?.split('@')[0] || '');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Fetch fresh profile on mount to handle presigned URL expiry
  useEffect(() => {
    userService.getProfile().catch(console.error);
  }, []);

  const handleSaveNickname = async () => {
    setIsSavingNickname(true);
    try {
      await userService.updateProfile({ nickname });
      showToast('Nickname saved');
    } catch (err) {
      showToast('Failed to save nickname');
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
      showToast('File size must be less than 2MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      await userService.uploadAvatar(
        asset.uri,
        asset.mimeType || 'image/jpeg',
        asset.fileSize || 0
      );
      showToast('Avatar updated');
    } catch (err) {
      showToast('Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await userService.updateProfile({ removeAvatar: true });
      showToast('Avatar removed');
    } catch (err) {
      showToast('Failed to remove avatar');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.avatarPlaceholderText, { color: colors.accent }]}>
                  {user?.email?.charAt(0).toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={isUploadingAvatar}
              style={[styles.cameraButton, { backgroundColor: colors.accent }]}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          {user?.avatarUrl && (
            <TouchableOpacity onPress={handleRemoveAvatar}>
              <Text style={[styles.removeAvatarText, { color: colors.textMuted }]}>
                Remove avatar
              </Text>
            </TouchableOpacity>
          )}
          {isUploadingAvatar && (
            <ActivityIndicator size="small" color={colors.accent} style={styles.uploadIndicator} />
          )}
        </div>

        {/* Nickname Section */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nickname</Text>
          <View style={styles.nicknameRow}>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder={user?.email?.split('@')[0] || 'Enter nickname'}
              placeholderTextColor={colors.textMuted}
              maxLength={50}
              style={[
                styles.nicknameInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.bgElevated,
                  borderColor: colors.borderSubtle,
                },
              ]}
            />
            <TouchableOpacity
              onPress={handleSaveNickname}
              disabled={isSavingNickname}
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.saveButtonText}>
                {isSavingNickname ? '...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Email (read-only) */}
        <View style={styles.fieldSection}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Email</Text>
          <View style={[styles.readOnlyField, { backgroundColor: colors.bgElevated }]}>
            <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>
              {user?.email ?? ''}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 36,
    fontWeight: '600',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAvatarText: {
    fontSize: 14,
    marginTop: 8,
  },
  uploadIndicator: {
    marginTop: 8,
  },
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  nicknameRow: {
    flexDirection: 'row',
    gap: 8,
  },
  nicknameInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  readOnlyField: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  readOnlyText: {
    fontSize: 14,
  },
});

export default observer(SettingsPageInner);
```

- [ ] **Step 2: Register settings screen in (main)/_layout.tsx**

In `apps/mobile/app/(main)/_layout.tsx`, add `<Stack.Screen name="settings" />` inside the `Stack` component:

```typescript
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="search" />
  <Stack.Screen name="settings" />
</Stack>
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(main)/settings.tsx apps/mobile/app/(main)/_layout.tsx
git commit -m "feat(mobile): create settings page with avatar and nickname editing"
```

### Task 21: Verify mobile builds

- [ ] **Step 1: Run mobile typecheck**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No type errors

- [ ] **Step 2: If errors, fix and re-commit**

### Task 22: Final integration verification

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: All packages pass

- [ ] **Step 2: Run full lint**

Run: `pnpm lint`
Expected: No new lint errors

- [ ] **Step 3: Manual smoke test — start dev server**

Run: `pnpm dev:server`
Verify: Server starts without errors

- [ ] **Step 4: Manual smoke test — start web dev**

Run: `pnpm dev:web`
Verify: Web app loads, login works, settings page accessible
