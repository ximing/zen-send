# Server Architecture Refactor: routing-controllers + typedi + reflect-metadata

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the zen-send server from manual Express router setup to use routing-controllers, typedi, and reflect-metadata for declarative, decorator-based routing and dependency injection.

**Architecture:** Replace the current manual Express Router setup with routing-controllers decorators (@JsonController, @Get, @Post, etc.), use typedi for constructor-based dependency injection with @Service() decorators, and load all services dynamically via glob patterns at startup.

**Tech Stack:** routing-controllers, typedi, reflect-metadata, glob

---

## File Structure

```
apps/server/src/
├── index.ts                      # Entry point (import reflect-metadata first)
├── app.ts                        # createApp() with routing-controllers setup
├── ioc.ts                        # Dynamic service/controller loading via glob
├── controllers/
│   ├── index.ts                  # Exports all controllers as array
│   ├── auth.controller.ts        # @JsonController for /api/auth
│   ├── device.controller.ts       # @JsonController for /api/devices
│   └── transfer.controller.ts    # @JsonController for /api/transfers
├── services/
│   ├── auth.service.ts           # @Service() class
│   ├── device.service.ts          # @Service() class
│   └── transfer.service.ts       # @Service() class
├── dto/                          # class-validator DTOs
│   ├── auth.dto.ts
│   ├── device.dto.ts
│   └── transfer.dto.ts
├── middlewares/
│   └── error.middleware.ts       # Error handler for routing-controllers
├── types/
│   └── express.ts                # Express Request extension for user
├── socket/
│   └── socket.ts                 # Socket.io setup (kept separate)
├── config/
│   └── database.ts, jwt.ts, s3.ts # Config modules (unchanged)
├── db/
│   └── schema.ts, index.ts        # Database schema (unchanged)
└── utils/
    └── response.ts, id.ts         # Utilities (unchanged)

# REMOVED:
# - modules/ (entire directory - replaced by controllers/ and services/)
# - middleware/auth.ts (replaced by currentUserChecker in routing-controllers)
```

---

## Chunk 1: Dependencies & TypeScript Config

### Task 1: Add required dependencies

**Files:**
- Modify: `apps/server/package.json`

- [ ] **Step 1: Add routing-controllers, typedi, reflect-metadata, glob, class-validator, class-transformer dependencies**

```json
{
  "dependencies": {
    "routing-controllers": "^0.11.3",
    "typedi": "^0.10.0",
    "reflect-metadata": "^0.2.2",
    "glob": "^11.0.0",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1"
  }
}
```

Run: `pnpm --filter @zen-send/server add routing-controllers@^0.11.3 typedi@^0.10.0 reflect-metadata@^0.2.2 glob@^11.0.0 class-validator@^0.14.1 class-transformer@^0.5.1`

- [ ] **Step 2: Add dev dependencies for types**

Run: `pnpm --filter @zen-send/server add -D @types/glob@^8.1.0`

- [ ] **Step 3: Commit**

```bash
git add apps/server/package.json pnpm-lock.yaml
git commit -m "feat(server): add routing-controllers, typedi, reflect-metadata dependencies"
```

---

### Task 2: Update TypeScript config for decorator support

**Files:**
- Modify: `apps/server/tsconfig.json`

- [ ] **Step 1: Add decorator compiler options**

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

Run: `cat apps/server/tsconfig.json` to verify existing options are preserved

- [ ] **Step 2: Commit**

```bash
git add apps/server/tsconfig.json
git commit -m "feat(server): enable decorator metadata for routing-controllers and typedi"
```

---

## Chunk 2: Service Layer Refactor

### Task 3: Refactor AuthService to typedi @Service()

**Files:**
- Modify: `apps/server/src/services/auth.service.ts`
- Create: `apps/server/src/services/auth.service.ts`

- [ ] **Step 1: Refactor auth.service.ts to use @Service() decorator**

```typescript
// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { Service } from 'typedi';
import { db } from '../config/database.js';
import { users } from '../db/schema.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from '../config/jwt.js';
import { logger } from '@zen-send/logger';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

@Service()
export class AuthService {
  private invalidatedTokens = new Set<string>();

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private generateTokens(payload: TokenPayload): AuthTokens {
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  async register(input: RegisterInput): Promise<AuthTokens> {
    logger.info({ email: input.email }, 'Starting registration');
    const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
    logger.info({ existingUserCount: existingUser.length }, 'Checked existing user');

    if (existingUser.length > 0) {
      throw new AuthError('User already exists', 'DUPLICATE_USER');
    }

    logger.info('Hashing password');
    const passwordHash = await this.hashPassword(input.password);
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    logger.info({ id, now }, 'Inserting user');

    await db.insert(users).values({
      id,
      email: input.email,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    logger.info('Generating tokens');
    return this.generateTokens({ userId: id });
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const result = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

    if (result.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result[0];
    const isValid = await this.verifyPassword(input.password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens({ userId: user.id });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    if (this.invalidatedTokens.has(refreshToken)) {
      throw new Error('Token has been invalidated');
    }

    const payload = verifyRefreshToken(refreshToken);

    if (!payload.userId) {
      throw new Error('Invalid refresh token');
    }

    return this.generateTokens({ userId: payload.userId });
  }

  logout(refreshToken: string): void {
    this.invalidatedTokens.add(refreshToken);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/auth.service.ts
git commit -m "refactor(server): convert AuthService to typedi @Service()"
```

---

### Task 4: Refactor DeviceService to typedi @Service()

**Files:**
- Modify: `apps/server/src/services/device.service.ts`

- [ ] **Step 1: Refactor device.service.ts to use @Service() decorator**

```typescript
// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import { eq, and } from 'drizzle-orm';
import { Service } from 'typedi';
import { db } from '../config/database.js';
import { devices } from '../db/schema.js';
import { generateDeviceId } from '../utils/id.js';

export interface DeviceInfo {
  id: string;
  userId: string;
  name: string;
  type: 'web' | 'android' | 'ios' | 'desktop';
  lastSeenAt: number;
  isOnline: number;
  createdAt: number;
}

export interface RegisterDeviceInput {
  userId: string;
  name: string;
  type: 'web' | 'android' | 'ios' | 'desktop';
}

@Service()
export class DeviceService {
  async registerDevice(input: RegisterDeviceInput): Promise<DeviceInfo> {
    const id = generateDeviceId();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(devices).values({
      id,
      userId: input.userId,
      name: input.name,
      type: input.type,
      lastSeenAt: now,
      isOnline: 1,
      createdAt: now,
    });

    return {
      id,
      userId: input.userId,
      name: input.name,
      type: input.type,
      lastSeenAt: now,
      isOnline: 1,
      createdAt: now,
    };
  }

  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const result = await db.select().from(devices).where(eq(devices.userId, userId));
    return result as DeviceInfo[];
  }

  async getDeviceById(id: string): Promise<DeviceInfo | null> {
    const result = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
    return (result[0] as DeviceInfo) ?? null;
  }

  async updateDeviceHeartbeat(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await db
      .update(devices)
      .set({ lastSeenAt: now, isOnline: 1 })
      .where(eq(devices.id, id));
  }

  async setDeviceOffline(id: string): Promise<void> {
    await db.update(devices).set({ isOnline: 0 }).where(eq(devices.id, id));
  }

  async unbindDevice(id: string, userId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(devices)
      .where(and(eq(devices.id, id), eq(devices.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db.delete(devices).where(and(eq(devices.id, id), eq(devices.userId, userId)));
    return true;
  }

  async getOnlineDevices(userId: string): Promise<DeviceInfo[]> {
    const result = await db
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.isOnline, 1)));
    return result as DeviceInfo[];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/device.service.ts
git commit -m "refactor(server): convert DeviceService to typedi @Service()"
```

---

### Task 5: Refactor TransferService to typedi @Service()

**Files:**
- Modify: `apps/server/src/services/transfer.service.ts`

- [ ] **Step 1: Refactor transfer.service.ts to use @Service() decorator**

```typescript
// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { Service } from 'typedi';
import { db } from '../config/database.js';
import { transferSessions, transferItems, chunkUploads } from '../db/schema.js';
import { generateSessionId, generateItemId, generateChunkId } from '../utils/id.js';
import { getPresignedUploadUrl, getPresignedDownloadUrl, S3_BUCKET, TRANSFER_TTL_DAYS } from '../config/s3.js';

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

export interface InitTransferInput {
  userId: string;
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: 'file' | 'text' | 'clipboard';
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount: number;
}

export interface InitTransferOutput {
  sessionId: string;
  s3Bucket: string;
  s3Key: string;
  chunkCount: number;
  chunkSize: number;
  presignedUrls: { chunkIndex: number; url: string; s3Key: string }[];
}

export interface TransferSessionInfo {
  id: string;
  userId: string;
  sourceDeviceId: string;
  targetDeviceId: string | null;
  status: string;
  s3Bucket: string;
  s3Key: string;
  originalFileName: string;
  totalSize: number;
  chunkCount: number;
  receivedChunks: number;
  contentType: string;
  ttlExpiresAt: number;
  createdAt: number;
  completedAt: number | null;
}

export interface TransferItemInfo {
  id: string;
  sessionId: string;
  type: string;
  name: string | null;
  mimeType: string | null;
  size: number;
  content: string | null;
  thumbnailKey: string | null;
  createdAt: number;
}

@Service()
export class TransferService {
  async initTransfer(input: InitTransferInput): Promise<InitTransferOutput> {
    const sessionId = generateSessionId();
    const now = Math.floor(Date.now() / 1000);
    const ttlExpiresAt = now + TRANSFER_TTL_DAYS * 24 * 60 * 60;
    const s3Key = `transfers/${sessionId}/`;
    const contentType = input.contentType || 'application/octet-stream';
    const fileName = input.fileName || 'untitled';

    const presignedUrls: { chunkIndex: number; url: string; s3Key: string }[] = [];
    for (let i = 0; i < input.chunkCount; i++) {
      const chunkS3Key = `transfers/${sessionId}/chunk_${i}`;
      const url = await getPresignedUploadUrl(chunkS3Key, contentType);
      presignedUrls.push({ chunkIndex: i, url, s3Key: chunkS3Key });
    }

    await db.insert(transferSessions).values({
      id: sessionId,
      userId: input.userId,
      sourceDeviceId: input.sourceDeviceId,
      targetDeviceId: input.targetDeviceId || null,
      status: 'pending',
      s3Bucket: S3_BUCKET,
      s3Key,
      originalFileName: fileName,
      totalSize: input.totalSize,
      chunkCount: input.chunkCount,
      receivedChunks: 0,
      contentType,
      ttlExpiresAt,
      createdAt: now,
    });

    return {
      sessionId,
      s3Bucket: S3_BUCKET,
      s3Key,
      chunkCount: input.chunkCount,
      chunkSize: CHUNK_SIZE,
      presignedUrls,
    };
  }

  async uploadChunk(sessionId: string, chunkIndex: number, etag: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const chunkId = generateChunkId();
    const s3Key = `transfers/${sessionId}/chunk_${chunkIndex}`;

    await db.insert(chunkUploads).values({
      id: chunkId,
      sessionId,
      chunkIndex,
      s3Key,
      etag,
      uploadedAt: now,
    });

    await db
      .update(transferSessions)
      .set({ receivedChunks: sql`${transferSessions.receivedChunks} + 1` })
      .where(eq(transferSessions.id, sessionId));
  }

  async completeTransfer(sessionId: string, userId: string): Promise<{ status: string; downloadUrl?: string }> {
    const now = Math.floor(Date.now() / 1000);

    const sessions = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Transfer session not found');
    }

    const session = sessions[0];

    if (session.receivedChunks < session.chunkCount) {
      throw new Error(`Transfer incomplete: ${session.receivedChunks}/${session.chunkCount} chunks received`);
    }

    await db
      .update(transferSessions)
      .set({ status: 'completed', completedAt: now })
      .where(eq(transferSessions.id, sessionId));

    const downloadUrl = await getPresignedDownloadUrl(session.s3Key, session.originalFileName);

    return { status: 'completed', downloadUrl };
  }

  async getTransferList(userId: string, limit = 50, offset = 0): Promise<TransferSessionInfo[]> {
    const results = await db
      .select()
      .from(transferSessions)
      .where(eq(transferSessions.userId, userId))
      .orderBy(desc(transferSessions.createdAt))
      .limit(limit)
      .offset(offset);

    return results as TransferSessionInfo[];
  }

  async getTransferById(sessionId: string, userId: string): Promise<TransferSessionInfo | null> {
    const results = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const session = results[0] as TransferSessionInfo;

    const items = await db
      .select()
      .from(transferItems)
      .where(eq(transferItems.sessionId, sessionId));

    return { ...session };
  }

  async getDownloadUrl(sessionId: string, userId: string): Promise<string> {
    const sessions = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Transfer session not found');
    }

    const session = sessions[0];
    return getPresignedDownloadUrl(session.s3Key, session.originalFileName);
  }

  async addTransferItem(
    sessionId: string,
    type: 'file' | 'text' | 'clipboard',
    name: string | null,
    mimeType: string | null,
    size: number,
    content: string | null,
    thumbnailKey: string | null
  ): Promise<TransferItemInfo> {
    const itemId = generateItemId();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(transferItems).values({
      id: itemId,
      sessionId,
      type,
      name,
      mimeType,
      size,
      content,
      thumbnailKey,
      createdAt: now,
    });

    return {
      id: itemId,
      sessionId,
      type,
      name,
      mimeType,
      size,
      content,
      thumbnailKey,
      createdAt: now,
    };
  }

  async deleteTransfer(sessionId: string, userId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db.delete(transferSessions).where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)));
    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/transfer.service.ts
git commit -m "refactor(server): convert TransferService to typedi @Service()"
```

---

## Chunk 3: Controller Layer Refactor

### Task 6: Create DTOs for validation

**Files:**
- Create: `apps/server/src/dto/auth.dto.ts`
- Create: `apps/server/src/dto/device.dto.ts`
- Create: `apps/server/src/dto/transfer.dto.ts`

- [ ] **Step 1: Create auth DTOs**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
```

- [ ] **Step 2: Create device DTOs**

```typescript
import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(['web', 'android', 'ios', 'desktop'])
  type!: 'web' | 'android' | 'ios' | 'desktop';
}
```

- [ ] **Step 3: Create transfer DTOs**

```typescript
import { IsString, IsOptional, IsNumber, IsEnum, Min, IsInt, Positive } from 'class-validator';

export class InitTransferDto {
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
  @Positive()
  totalSize!: number;

  @IsNumber()
  @IsInt()
  @Positive()
  chunkCount!: number;
}

export class UploadChunkDto {
  @IsNumber()
  @IsInt()
  @Min(0)
  chunkIndex!: number;

  @IsString()
  @MinLength(1)
  etag!: string;
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/dto/auth.dto.ts apps/server/src/dto/device.dto.ts apps/server/src/dto/transfer.dto.ts
git commit -m "feat(server): add validation DTOs for routing-controllers"
```

---

### Task 7: Create AuthController with routing-controllers

**Files:**
- Create: `apps/server/src/controllers/auth.controller.ts`

- [ ] **Step 1: Create auth controller using routing-controllers decorators**

```typescript
// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import { JsonController, Post, Body, HttpCode, HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { AuthService, AuthError } from '../services/auth.service.js';
import { RegisterDto, LoginDto, RefreshTokenDto } from '../dto/auth.dto.js';
import { ResponseUtil } from '../utils/response.js';

@JsonController('/api/auth')
@Service()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/register')
  async register(@Body() dto: RegisterDto) {
    try {
      const tokens = await this.authService.register(dto);
      return ResponseUtil.created(tokens);
    } catch (error) {
      if (error instanceof AuthError && error.code === 'DUPLICATE_USER') {
        throw new HttpError(409, 'Registration failed');
      }
      throw new HttpError(400, 'Registration failed');
    }
  }

  @Post('/login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    try {
      const tokens = await this.authService.login(dto);
      return ResponseUtil.success(tokens);
    } catch (error) {
      throw new HttpError(401, 'Login failed');
    }
  }

  @Post('/refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      const tokens = await this.authService.refresh(dto.refreshToken);
      return ResponseUtil.success(tokens);
    } catch (error) {
      throw new HttpError(401, 'Refresh failed');
    }
  }

  @Post('/logout')
  @HttpCode(200)
  async logout(@Body() dto: RefreshTokenDto) {
    try {
      this.authService.logout(dto.refreshToken);
      return ResponseUtil.success({ message: 'Logged out successfully' });
    } catch (error) {
      throw new HttpError(500, 'Logout failed');
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/controllers/auth.controller.ts
git commit -m "feat(server): create AuthController with routing-controllers"
```

---

### Task 8: Create DeviceController with routing-controllers

**Files:**
- Create: `apps/server/src/controllers/device.controller.ts`

- [ ] **Step 1: Create device controller using routing-controllers decorators**

```typescript
// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import {
  JsonController,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpError,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';
import { DeviceService } from '../services/device.service.js';
import { RegisterDeviceDto } from '../dto/device.dto.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../config/jwt.js';

@JsonController('/api/devices')
@Service()
export class DeviceController {
  constructor(private deviceService: DeviceService) {}

  @Get()
  async list(@CurrentUser() user: TokenPayload) {
    const devices = await this.deviceService.getUserDevices(user.userId);
    return ResponseUtil.success({ devices });
  }

  @Post()
  async register(@CurrentUser() user: TokenPayload, @Body() dto: RegisterDeviceDto) {
    const device = await this.deviceService.registerDevice({
      userId: user.userId,
      name: dto.name,
      type: dto.type,
    });
    return ResponseUtil.created({ device });
  }

  @Delete('/:id')
  async unbind(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const device = await this.deviceService.getDeviceById(id);
    if (!device) {
      throw new HttpError(404, 'Device not found');
    }

    if (device.userId !== user.userId) {
      throw new HttpError(403, 'Cannot unbind another user\'s device');
    }

    const deleted = await this.deviceService.unbindDevice(id, user.userId);
    if (!deleted) {
      throw new HttpError(404, 'Device not found');
    }

    return ResponseUtil.success({ deleted: true });
  }

  @Patch('/:id/heartbeat')
  @HttpCode(200)
  async heartbeat(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const device = await this.deviceService.getDeviceById(id);
    if (!device) {
      throw new HttpError(404, 'Device not found');
    }

    if (device.userId !== user.userId) {
      throw new HttpError(403, 'Cannot update another user\'s device');
    }

    await this.deviceService.updateDeviceHeartbeat(id);
    return ResponseUtil.success({ ok: true });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/controllers/device.controller.ts
git commit -m "feat(server): create DeviceController with routing-controllers"
```

---

### Task 9: Create TransferController with routing-controllers

**Files:**
- Create: `apps/server/src/controllers/transfer.controller.ts`

- [ ] **Step 1: Create transfer controller using routing-controllers decorators**

```typescript
// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import {
  JsonController,
  Get,
  Post,
  Delete,
  Param,
  QueryParams,
  Body,
  HttpCode,
  HttpError,
  CurrentUser,
} from 'routing-controllers';
import { Service } from 'typedi';
import { TransferService } from '../services/transfer.service.js';
import { InitTransferDto, UploadChunkDto } from '../dto/transfer.dto.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../config/jwt.js';

@JsonController('/api/transfers')
@Service()
export class TransferController {
  constructor(private transferService: TransferService) {}

  @Post('/init')
  async init(@CurrentUser() user: TokenPayload, @Body() dto: InitTransferDto) {
    try {
      const result = await this.transferService.initTransfer({
        userId: user.userId,
        sourceDeviceId: dto.sourceDeviceId,
        targetDeviceId: dto.targetDeviceId,
        type: dto.type,
        fileName: dto.fileName,
        contentType: dto.contentType,
        totalSize: dto.totalSize,
        chunkCount: dto.chunkCount,
      });
      return ResponseUtil.created(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize transfer';
      throw new HttpError(400, message);
    }
  }

  @Post('/:id/chunks')
  @HttpCode(200)
  async uploadChunk(
    @CurrentUser() user: TokenPayload,
    @Param('id') id: string,
    @Body() dto: UploadChunkDto
  ) {
    const session = await this.transferService.getTransferById(id, user.userId);
    if (!session) {
      throw new HttpError(404, 'Transfer session not found');
    }

    await this.transferService.uploadChunk(id, dto.chunkIndex, dto.etag);
    return ResponseUtil.success({ received: true });
  }

  @Post('/:id/complete')
  @HttpCode(200)
  async complete(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    try {
      const result = await this.transferService.completeTransfer(id, user.userId);
      return ResponseUtil.success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete transfer';
      if (message.includes('not found')) {
        throw new HttpError(404, message);
      }
      throw new HttpError(400, message);
    }
  }

  @Get()
  async list(
    @CurrentUser() user: TokenPayload,
    @QueryParams('limit') limit?: string,
    @QueryParams('offset') offset?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 0 || isNaN(parsedOffset) || parsedOffset < 0) {
      throw new HttpError(400, 'Invalid limit or offset parameter');
    }

    const transfers = await this.transferService.getTransferList(user.userId, parsedLimit, parsedOffset);
    return ResponseUtil.success({ transfers });
  }

  @Get('/:id')
  async get(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const transfer = await this.transferService.getTransferById(id, user.userId);
    if (!transfer) {
      throw new HttpError(404, 'Transfer not found');
    }
    return ResponseUtil.success({ transfer });
  }

  @Get('/:id/download')
  async getDownloadUrl(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    try {
      const url = await this.transferService.getDownloadUrl(id, user.userId);
      return ResponseUtil.success({ downloadUrl: url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get download URL';
      if (message.includes('not found')) {
        throw new HttpError(404, message);
      }
      throw new HttpError(400, message);
    }
  }

  @Delete('/:id')
  @HttpCode(200)
  async delete(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
    const deleted = await this.transferService.deleteTransfer(id, user.userId);
    if (!deleted) {
      throw new HttpError(404, 'Transfer not found');
    }
    return ResponseUtil.success({ message: 'Transfer deleted successfully' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/controllers/transfer.controller.ts
git commit -m "feat(server): create TransferController with routing-controllers"
```

---

## Chunk 4: Infrastructure (IOC, Middleware, App Setup)

### Task 10: Update ResponseUtil and Error Handler

**Files:**
- Modify: `apps/server/src/utils/response.ts`
- Modify: `apps/server/src/middleware/error.ts`

- [ ] **Step 1: Update ResponseUtil to use object literal (matching zen-send existing pattern)**

```typescript
export const ResponseUtil = {
  success<T>(data: T, statusCode = 200) {
    return {
      success: true,
      data,
      statusCode,
    };
  },

  created<T>(data: T) {
    return this.success(data, 201);
  },

  error(message: string, code?: string, statusCode = 400) {
    return {
      success: false,
      error: message,
      code,
      statusCode,
    };
  },

  badRequest(message: string) {
    return this.error(message, 'BAD_REQUEST', 400);
  },

  unauthorized(message = 'Unauthorized') {
    return this.error(message, 'UNAUTHORIZED', 401);
  },

  forbidden(message = 'Forbidden') {
    return this.error(message, 'FORBIDDEN', 403);
  },

  notFound(message = 'Not found') {
    return this.error(message, 'NOT_FOUND', 404);
  },
};
```

- [ ] **Step 2: Update error handler to work with routing-controllers HttpError**

```typescript
import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'routing-controllers';
import { logger } from '@zen-send/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error({ err: error, path: req.path, method: req.method }, 'Request error');

  if (error instanceof HttpError) {
    res.status(error.httpCode).json({
      success: false,
      error: error.message,
      code: 'HTTP_ERROR',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/utils/response.ts apps/server/src/middleware/error.ts
git commit -m "refactor(server): update ResponseUtil and error handler for routing-controllers"
```

---

### Task 11: Add Express types extension

**Files:**
- Create: `apps/server/src/types/express.ts`

- [ ] **Step 1: Create types/express.ts to extend Express Request**

```typescript
import type { TokenPayload } from '../config/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/types/express.ts
git commit -m "feat(server): add Express Request type extension"
```

---

### Task 12: Create IOC loader for dynamic service loading

**Files:**
- Create: `apps/server/src/ioc.ts`

- [ ] **Step 1: Create ioc.ts for dynamic loading**

```typescript
import { parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import glob from 'glob';
import { logger } from '@zen-send/logger';

const __dirname = parse(fileURLToPath(import.meta.url)).dir;
const isProduction = process.env.NODE_ENV === 'production';

function findFileNamesFromGlob(globString: string) {
  return glob.sync(globString);
}

export async function initIOC() {
  const patterns = [
    `${__dirname}/services/**/*.${isProduction ? 'js' : 'ts'}`,
    `${__dirname}/controllers/**/*.${isProduction ? 'js' : 'ts'}`,
  ];

  for (const globString of patterns) {
    const filePaths = findFileNamesFromGlob(globString);
    logger.info('IOC: Loading files', { pattern: globString, count: filePaths.length });

    for (const fileName of filePaths) {
      try {
        const module = await import(fileName);
        logger.debug('Loaded module', { module: module.default?.name || module.name });
      } catch (error: any) {
        logger.error(`Failed to import ${fileName}: ${error.message}`);
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/ioc.ts
git commit -m "feat(server): add IOC loader for dynamic service/controller loading"
```

---

### Task 13: Create routing-controllers currentUserChecker middleware

**Files:**
- Create: `apps/server/src/middlewares/auth.middleware.ts`

- [ ] **Step 1: Create auth middleware/interceptor**

```typescript
import { Action, ExpressRequest } from 'routing-controllers';
import { verifyAccessToken, type TokenPayload } from '../config/jwt.js';

export async function currentUserChecker(action: Action): Promise<TokenPayload | null> {
  const request = action.request as ExpressRequest;
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    return payload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/middlewares/auth.middleware.ts
git commit -m "feat(server): add currentUserChecker for routing-controllers"
```

---

### Task 14: Create controllers index

**Files:**
- Create: `apps/server/src/controllers/index.ts`

- [ ] **Step 1: Create controllers barrel export**

```typescript
import { AuthController } from './auth.controller.js';
import { DeviceController } from './device.controller.js';
import { TransferController } from './transfer.controller.js';

export const controllers = [AuthController, DeviceController, TransferController];
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/controllers/index.ts
git commit -m "feat(server): add controllers barrel export"
```

---

### Task 15: Refactor app.ts to use routing-controllers

**Files:**
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Refactor app.ts to integrate routing-controllers**

```typescript
import 'reflect-metadata';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { useExpressServer, useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import { logger } from '@zen-send/logger';
import { setupSocket } from './socket/socket.js';
import { initIOC } from './ioc.js';
import { controllers } from './controllers/index.js';
import { currentUserChecker } from './middlewares/auth.middleware.js';
import { errorHandler } from './middleware/error.js';

useContainer(Container);

export async function createApp(): Promise<{ app: ReturnType<typeof useExpressServer>; io: SocketIOServer }> {
  await initIOC();

  const httpServer = createServer();

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  setupSocket(io);

  const app = useExpressServer(httpServer, {
    controllers,
    validation: true,
    defaultErrorHandler: false,
    currentUserChecker,
    errorHandler,
  });

  const PORT = process.env.PORT || 3110;
  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  return { app, io };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "refactor(server): integrate routing-controllers in app.ts"
```

---

### Task 16: Update index.ts entry point

**Files:**
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Update index.ts to call createApp**

```typescript
import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { logger } from '@zen-send/logger';

async function bootstrap() {
  try {
    const { io } = await createApp();
    logger.info('Server bootstrapped successfully');
  } catch (error) {
    logger.error('Failed to bootstrap server', error);
    process.exit(1);
  }
}

bootstrap();
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/index.ts
git commit -m "refactor(server): update index.ts entry point"
```

---

## Chunk 5: Cleanup & Remove Legacy Files

### Task 17: Remove legacy router and controller files

**Files:**
- Delete: `apps/server/src/modules/auth/auth.controller.ts`
- Delete: `apps/server/src/modules/auth/auth.router.ts`
- Delete: `apps/server/src/modules/device/device.controller.ts`
- Delete: `apps/server/src/modules/device/device.router.ts`
- Delete: `apps/server/src/modules/transfer/transfer.controller.ts`
- Delete: `apps/server/src/modules/transfer/transfer.router.ts`
- Delete: `apps/server/src/modules/auth/index.ts`
- Delete: `apps/server/src/modules/device/index.ts`
- Delete: `apps/server/src/modules/transfer/index.ts`
- Delete: `apps/server/src/modules/` (entire directory)
- Delete: `apps/server/src/middleware/auth.ts`

- [ ] **Step 1: Remove legacy files**

```bash
rm -rf apps/server/src/modules
rm apps/server/src/middleware/auth.ts
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(server): remove legacy routers and controllers"
```

---

### Task 18: Run typecheck and verify build

- [ ] **Step 1: Run typecheck**

Run: `pnpm --filter @zen-send/server typecheck`
Expected: No TypeScript errors

- [ ] **Step 2: Test dev server startup**

Run: `pnpm --filter @zen-send/server dev`
Expected: Server starts without errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix(server): ensure typecheck passes"
```

---

## Summary

**5 Chunks / 18 Tasks**

| Chunk | Tasks |
|-------|-------|
| 1. Dependencies & TS Config | Task 1-2 |
| 2. Service Layer Refactor | Task 3-5 |
| 3. Controller Layer Refactor | Task 6-9 |
| 4. Infrastructure | Task 10-16 |
| 5. Cleanup | Task 17-18 |

After this refactor:

1. **Controllers** use `@JsonController()` decorator with `@Get()`, `@Post()`, `@Delete()`, `@Patch()` for routes
2. **Services** use `@Service()` decorator and are injected via constructor
3. **Dynamic loading** via `ioc.ts` glob patterns loads all services/controllers at startup
4. **Validation** uses class-validator DTOs passed via `@Body()` decorator
5. **Authentication** uses `@CurrentUser()` decorator with custom `currentUserChecker`
6. **Legacy** manual router setup in `modules/` is removed
7. **Express types** extended to include `user` property on Request

**Key Files Changed:**
- `package.json` - added routing-controllers, typedi, reflect-metadata, glob, class-validator
- `tsconfig.json` - enabled `emitDecoratorMetadata` and `experimentalDecorators`
- `src/services/*.ts` - converted to `@Service()` classes
- `src/controllers/*.ts` - new routing-controllers controllers
- `src/dto/*.ts` - class-validator DTOs for request validation
- `src/ioc.ts` - dynamic loader
- `src/app.ts` - routing-controllers integration
- `src/middleware/error.ts` - updated for routing-controllers HttpError
- `src/types/express.ts` - Express Request extension
- `src/utils/response.ts` - object literal ResponseUtil

**Removed:**
- `src/modules/` - entire legacy module directory
- `src/middleware/auth.ts` - replaced by currentUserChecker
