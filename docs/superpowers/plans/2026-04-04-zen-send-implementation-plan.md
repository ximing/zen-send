# Zen Send Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-device clipboard and file transfer tool with server relay, S3 storage, chunked upload, JWT auth, and multi-device management.

**Architecture:** Monorepo with Turbo. Backend: Express + Socket.io + MySQL/Drizzle + S3. Clients: Web (Electron) + Mobile (React Native). ID generation via nanoid with per-table prefixes.

**Tech Stack:** Node.js, Express, Socket.io, MySQL2, Drizzle ORM, AWS S3 SDK v3, JWT (access + refresh), React Native (Expo), Electron

---

## File Structure

```
zen-send/
├── apps/
│   ├── server/                    # Express + Socket.io backend
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point
│   │   │   ├── app.ts             # Express app setup
│   │   │   ├── config/
│   │   │   │   ├── database.ts    # Drizzle MySQL connection
│   │   │   │   ├── s3.ts          # S3 client config
│   │   │   │   └── jwt.ts         # JWT secret/config
│   │   │   ├── db/
│   │   │   │   ├── schema.ts      # Drizzle schema (all tables)
│   │   │   │   ├── index.ts       # DB exports
│   │   │   │   └── migrations/    # SQL migrations (if using file-based)
│   │   │   ├── modules/
│   │   │   │   ├── auth/          # Authentication module
│   │   │   │   │   ├── auth.router.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   └── auth.controller.ts
│   │   │   │   ├── device/        # Device management module
│   │   │   │   │   ├── device.router.ts
│   │   │   │   │   ├── device.service.ts
│   │   │   │   │   └── device.controller.ts
│   │   │   │   └── transfer/       # Transfer module
│   │   │   │       ├── transfer.router.ts
│   │   │   │       ├── transfer.service.ts
│   │   │   │       └── transfer.controller.ts
│   │   │   ├── socket/
│   │   │   │   └── socket.ts      # Socket.io setup & handlers
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts        # JWT verification middleware
│   │   │   │   └── error.ts       # Global error handler
│   │   │   └── utils/
│   │   │       ├── id.ts          # ID generation (nanoid)
│   │   │       └── response.ts    # API response helpers
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                       # Electron web client
│   │   ├── electron/
│   │   │   ├── main.ts            # Electron main process
│   │   │   └── preload.ts         # Preload script
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── api/               # API client
│   │       ├── hooks/             # Custom hooks
│   │       ├── stores/            # State management
│   │       ├── components/
│   │       │   ├── common/        # Shared UI components
│   │       │   ├── device/        # Device-related components
│   │       │   ├── transfer/      # Transfer-related components
│   │       │   └── settings/       # Settings components
│   │       ├── theme/
│   │       │   ├── tokens.ts       # Color tokens
│   │       │   └── ThemeProvider.tsx
│   │       └── pages/
│   │
│   └── mobile/                    # React Native (Expo) client
│       ├── app/                   # Expo Router pages
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   ├── devices.tsx
│       │   ├── transfers.tsx
│       │   └── settings.tsx
│       ├── components/
│       ├── hooks/
│       ├── api/
│       ├── stores/
│       └── theme/
│
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── index.ts           # Shared types
│       │   ├── api.ts             # API types
│       │   ├── socket.ts          # Socket events types
│       │   └── theme.ts           # Theme tokens (shared)
│       └── package.json
│
└── docs/superpowers/
    ├── specs/2026-04-04-zen-send-architecture-design.md
    └── plans/2026-04-04-zen-send-implementation-plan.md
```

---

## Chunk 1: Project Foundation

### Task 1: Server - Database Schema & ID Generation

**Files:**
- Create: `apps/server/src/db/schema.ts`
- Create: `apps/server/src/db/index.ts`
- Create: `apps/server/src/config/database.ts`
- Create: `apps/server/src/utils/id.ts`
- Modify: `apps/server/package.json` (add drizzle-orm, mysql2, drizzle-kit)
- Modify: `apps/server/tsconfig.json`

- [ ] **Step 1: Add dependencies**

```bash
cd apps/server
pnpm add drizzle-orm mysql2
pnpm add -D drizzle-kit @types/mysql2
```

- [ ] **Step 2: Create ID generation utility**

```typescript
// apps/server/src/utils/id.ts
import { customAlphabet } from 'nanoid';

const typeid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 22);

export const generateUid = (prefix: string) => `${prefix}${typeid()}`;

export const generateUserId = () => generateUid('u');
export const generateDeviceId = () => generateUid('d');
export const generateSessionId = () => generateUid('s');
export const generateItemId = () => generateUid('i');
export const generateHistoryId = () => generateUid('h');
export const generateChunkId = () => generateUid('c');
```

- [ ] **Step 3: Create database config**

```typescript
// apps/server/src/config/database.ts
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../db/schema';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'zen_send',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(pool, { schema });
```

- [ ] **Step 4: Create complete schema**

```typescript
// apps/server/src/db/schema.ts
import { mysqlTable, varchar, text, int, bigint, tinyint } from 'drizzle-orm/mysql';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 24 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: int('created_at').notNull(),
  updatedAt: int('updated_at').notNull(),
});

export const devices = mysqlTable('devices', {
  id: varchar('id', { length: 24 }).primaryKey(),
  userId: varchar('user_id', { length: 24 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  lastSeenAt: int('last_seen_at').notNull(),
  isOnline: tinyint('is_online', { length: 1 }).notNull().default(0),
  createdAt: int('created_at').notNull(),
});

export const transferSessions = mysqlTable('transfer_sessions', {
  id: varchar('id', { length: 24 }).primaryKey(),
  userId: varchar('user_id', { length: 24 }).notNull(),
  sourceDeviceId: varchar('source_device_id', { length: 24 }).notNull(),
  targetDeviceId: varchar('target_device_id', { length: 24 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  s3Bucket: varchar('s3_bucket', { length: 100 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
  totalSize: bigint('total_size', { mode: 'number' }).notNull().default(0),
  chunkCount: int('chunk_count').notNull().default(0),
  receivedChunks: int('received_chunks').notNull().default(0),
  contentType: varchar('content_type', { length: 100 }).notNull().default('application/octet-stream'),
  ttlExpiresAt: int('ttl_expires_at').notNull(),
  createdAt: int('created_at').notNull(),
  completedAt: int('completed_at'),
});

export const transferItems = mysqlTable('transfer_items', {
  id: varchar('id', { length: 24 }).primaryKey(),
  sessionId: varchar('session_id', { length: 24 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: bigint('size', { mode: 'number' }).notNull().default(0),
  content: text('content'),
  thumbnailKey: varchar('thumbnail_key', { length: 500 }),
  createdAt: int('created_at').notNull(),
});

export const downloadHistory = mysqlTable('download_history', {
  id: varchar('id', { length: 24 }).primaryKey(),
  userId: varchar('user_id', { length: 24 }).notNull(),
  sessionId: varchar('session_id', { length: 24 }).notNull(),
  deviceId: varchar('device_id', { length: 24 }).notNull(),
  localPath: varchar('local_path', { length: 500 }),
  downloadedAt: int('downloaded_at').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('downloaded'),
});

export const chunkUploads = mysqlTable('chunk_uploads', {
  id: varchar('id', { length: 24 }).primaryKey(),
  sessionId: varchar('session_id', { length: 24 }).notNull(),
  chunkIndex: int('chunk_index').notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  etag: varchar('etag', { length: 100 }),
  uploadedAt: int('uploaded_at').notNull(),
});
```

- [ ] **Step 5: Create db index export**

```typescript
// apps/server/src/db/index.ts
export * from './schema';
```

- [ ] **Step 6: Test schema compilation**

Run: `cd apps/server && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/db apps/server/src/utils/id.ts apps/server/src/config/database.ts apps/server/package.json
git commit -m "feat(server): add database schema with Drizzle ORM and ID generation

- Add users, devices, transferSessions, transferItems, downloadHistory, chunkUploads tables
- Add ID generation utils with nanoid per-table prefixes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Server - S3 Configuration

**Files:**
- Create: `apps/server/src/config/s3.ts`
- Modify: `apps/server/package.json` (add @aws-sdk/client-s3, @aws-sdk/s3-request-presigner)

- [ ] **Step 1: Add AWS SDK dependencies**

```bash
cd apps/server
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

- [ ] **Step 2: Create S3 config**

```typescript
// apps/server/src/config/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT, // For S3-compatible storage (MinIO, etc.)
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO
});

export const S3_BUCKET = process.env.S3_BUCKET || 'zen-send-transfers';
export const TRANSFER_TTL_DAYS = Number(process.env.TRANSFER_TTL_DAYS) || 30;

// Generate presigned URL for upload
export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

// Generate presigned URL for download
export async function getPresignedDownloadUrl(key: string, originalFileName: string, expiresIn = 86400): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalFileName)}"`,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/config/s3.ts apps/server/package.json
git commit -m "feat(server): add S3 configuration with presigned URL generation

- Add S3Client with configurable endpoint (supports MinIO)
- Add getPresignedUploadUrl and getPresignedDownloadUrl helpers
- Support Content-Disposition header for original filename

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Server - JWT Configuration & Auth Middleware

**Files:**
- Create: `apps/server/src/config/jwt.ts`
- Create: `apps/server/src/middleware/auth.ts`
- Create: `apps/server/src/utils/response.ts`

- [ ] **Step 1: Create JWT config**

```typescript
// apps/server/src/config/jwt.ts
import jwt from 'jsonwebtoken';

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-change-in-production';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-change-in-production';
export const JWT_ACCESS_EXPIRES_IN = '15m';
export const JWT_REFRESH_EXPIRES_IN = '7d';

export interface TokenPayload {
  userId: string;
  deviceId?: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
```

- [ ] **Step 2: Create auth middleware**

```typescript
// apps/server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../config/jwt';
import { success, unauthorized } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    unauthorized(res, 'Missing or invalid authorization header');
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    unauthorized(res, 'Invalid or expired token');
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
  next();
}
```

- [ ] **Step 3: Create response helpers**

```typescript
// apps/server/src/utils/response.ts
import { Response } from 'express';

export function success<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({ success: true, data });
}

export function created<T>(res: Response, data: T): void {
  success(res, data, 201);
}

export function error(res: Response, message: string, code?: string, statusCode = 400): void {
  res.status(statusCode).json({ success: false, error: message, code });
}

export function badRequest(res: Response, message: string): void {
  error(res, message, 'BAD_REQUEST', 400);
}

export function unauthorized(res: Response, message: string): void {
  error(res, message, 'UNAUTHORIZED', 401);
}

export function notFound(res: Response, message: string): void {
  error(res, message, 'NOT_FOUND', 404);
}

export function gone(res: Response, message: string): void {
  error(res, message, 'GONE', 410);
}

export function serverError(res: Response, message: string): void {
  error(res, message, 'INTERNAL_ERROR', 500);
}
```

- [ ] **Step 4: Add jsonwebtoken dependency**

```bash
cd apps/server
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/config/jwt.ts apps/server/src/middleware/auth.ts apps/server/src/utils/response.ts apps/server/package.json
git commit -m "feat(server): add JWT config and authentication middleware

- Add JWT signing/verification with access + refresh tokens
- Add authenticate and optionalAuth middleware
- Add response helper functions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Authentication Module

### Task 4: Server - Auth Service & Controller

**Files:**
- Create: `apps/server/src/modules/auth/auth.service.ts`
- Create: `apps/server/src/modules/auth/auth.controller.ts`
- Create: `apps/server/src/modules/auth/auth.router.ts`
- Create: `apps/server/src/modules/auth/index.ts`
- Modify: `apps/server/src/app.ts` (register auth router)
- Modify: `apps/server/package.json` (add bcrypt)

- [ ] **Step 1: Add bcrypt dependency**

```bash
cd apps/server
pnpm add bcryptjs
pnpm add -D @types/bcryptjs
```

- [ ] **Step 2: Create auth service**

```typescript
// apps/server/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { generateUserId } from '../../utils/id';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../../config/jwt';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

export async function register(input: RegisterInput): Promise<AuthTokens> {
  const { email, password } = input;

  // Check if user exists
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error('User already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);
  const id = generateUserId();
  const now = Math.floor(Date.now() / 1000);

  // Create user
  await db.insert(users).values({
    id,
    email,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  // Generate tokens
  const payload: TokenPayload = { userId: id };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { accessToken, refreshToken, user: { id, email } };
}

export async function login(input: LoginInput): Promise<AuthTokens> {
  const { email, password } = input;

  // Find user
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const payload: TokenPayload = { userId: user.id };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  return { accessToken, refreshToken, user: { id: user.id, email: user.email } };
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const payload = verifyRefreshToken(refreshToken);
  const { userId } = payload;

  // Get user
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error('User not found');
  }

  // Generate new tokens
  const newPayload: TokenPayload = { userId };
  const accessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken(newPayload);

  return { accessToken, refreshToken: newRefreshToken, user: { id: user.id, email: user.email } };
}
```

- [ ] **Step 3: Create auth controller**

```typescript
// apps/server/src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { success, created, badRequest, unauthorized } from '../../utils/response';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      badRequest(res, 'Email and password are required');
      return;
    }

    if (password.length < 8) {
      badRequest(res, 'Password must be at least 8 characters');
      return;
    }

    const result = await authService.register({ email, password });
    created(res, result);
  } catch (err) {
    if (err instanceof Error && err.message === 'User already exists') {
      badRequest(res, err.message);
    } else {
      next(err);
    }
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      badRequest(res, 'Email and password are required');
      return;
    }

    const result = await authService.login({ email, password });
    success(res, result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Invalid credentials') {
      unauthorized(res, err.message);
    } else {
      next(err);
    }
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
      badRequest(res, 'Refresh token is required');
      return;
    }

    const result = await authService.refresh(refreshToken);
    success(res, result);
  } catch (err) {
    unauthorized(res, 'Invalid or expired refresh token');
  }
}
```

- [ ] **Step 4: Create auth router**

```typescript
// apps/server/src/modules/auth/auth.router.ts
import { Router } from 'express';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

export default router;
```

- [ ] **Step 5: Create module index**

```typescript
// apps/server/src/modules/auth/index.ts
export { default as authRouter } from './auth.router';
```

- [ ] **Step 6: Modify app.ts to register auth router**

```typescript
// apps/server/src/app.ts (partial modification)
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API routes
app.use('/api/auth', authRouter);

export default app;
```

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/modules/auth apps/server/src/app.ts apps/server/package.json
git commit -m "feat(server): add authentication module

- Add register, login, refresh endpoints
- Password hashing with bcrypt
- JWT access + refresh token flow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Device Management Module

### Task 5: Server - Device Service & Controller

**Files:**
- Create: `apps/server/src/modules/device/device.service.ts`
- Create: `apps/server/src/modules/device/device.controller.ts`
- Create: `apps/server/src/modules/device/device.router.ts`
- Create: `apps/server/src/modules/device/index.ts`
- Modify: `apps/server/src/app.ts` (register device router)
- Modify: `apps/server/src/socket/socket.ts` (device registration)

- [ ] **Step 1: Create device service**

```typescript
// apps/server/src/modules/device/device.service.ts
import { db } from '../../db';
import { devices } from '../../db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { generateDeviceId } from '../../utils/id';

export interface RegisterDeviceInput {
  userId: string;
  name: string;
  type: 'web' | 'android' | 'ios' | 'desktop';
  socketId?: string;
}

export interface DeviceInfo {
  id: string;
  userId: string;
  name: string;
  type: string;
  lastSeenAt: number;
  isOnline: number;
  createdAt: number;
}

export async function registerDevice(input: RegisterDeviceInput): Promise<DeviceInfo> {
  const { userId, name, type, socketId } = input;
  const id = generateDeviceId();
  const now = Math.floor(Date.now() / 1000);

  await db.insert(devices).values({
    id,
    userId,
    name,
    type,
    lastSeenAt: now,
    isOnline: 1,
    createdAt: now,
  });

  return { id, userId, name, type, lastSeenAt: now, isOnline: 1, createdAt: now };
}

export async function getUserDevices(userId: string): Promise<DeviceInfo[]> {
  return db.select().from(devices).where(eq(devices.userId, userId));
}

export async function getDeviceById(id: string): Promise<DeviceInfo | null> {
  const results = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
  return results[0] || null;
}

export async function updateDeviceHeartbeat(id: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.update(devices).set({ lastSeenAt: now, isOnline: 1 }).where(eq(devices.id, id));
}

export async function setDeviceOffline(id: string): Promise<void> {
  await db.update(devices).set({ isOnline: 0 }).where(eq(devices.id, id));
}

export async function unbindDevice(id: string, userId: string): Promise<boolean> {
  const result = await db.delete(devices).where(and(eq(devices.id, id), eq(devices.userId, userId)));
  return result.rowCount > 0;
}

export async function getOnlineDevices(userId: string): Promise<DeviceInfo[]> {
  return db.select().from(devices).where(
    and(eq(devices.userId, userId), eq(devices.isOnline, 1))
  );
}
```

- [ ] **Step 2: Create device controller**

```typescript
// apps/server/src/modules/device/device.controller.ts
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import * as deviceService from './device.service';
import { success, created, notFound, badRequest } from '../../utils/response';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const devices = await deviceService.getUserDevices(userId);
    success(res, { devices });
  } catch (err) {
    next(err);
  }
}

export async function bind(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { name, type } = req.body;

    if (!name || !type) {
      badRequest(res, 'Name and type are required');
      return;
    }

    if (!['web', 'android', 'ios', 'desktop'].includes(type)) {
      badRequest(res, 'Invalid device type');
      return;
    }

    const device = await deviceService.registerDevice({ userId, name, type });
    created(res, { device });
  } catch (err) {
    next(err);
  }
}

export async function unbind(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const deleted = await deviceService.unbindDevice(id, userId);
    if (!deleted) {
      notFound(res, 'Device not found');
      return;
    }

    success(res, { message: 'Device unbound successfully' });
  } catch (err) {
    next(err);
  }
}

export async function heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await deviceService.updateDeviceHeartbeat(id);
    success(res, { message: 'Heartbeat updated' });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Create device router**

```typescript
// apps/server/src/modules/device/device.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as deviceController from './device.controller';

const router = Router();

router.use(authenticate);

router.get('/', deviceController.list);
router.post('/', deviceController.bind);
router.delete('/:id', deviceController.unbind);
router.patch('/:id/heartbeat', deviceController.heartbeat);

export default router;
```

- [ ] **Step 4: Create module index**

```typescript
// apps/server/src/modules/device/index.ts
export { default as deviceRouter } from './device.router';
```

- [ ] **Step 5: Update app.ts**

```typescript
// Add to app.ts imports
import { deviceRouter } from './modules/device';

// Add to app.ts after auth router
app.use('/api/devices', deviceRouter);
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/device apps/server/src/app.ts
git commit -m "feat(server): add device management module

- Add list, bind, unbind, heartbeat endpoints
- Device online/offline tracking
- All endpoints require JWT authentication

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Transfer Module (Core)

### Task 6: Server - Transfer Service (Init, Chunk Upload, Complete)

**Files:**
- Create: `apps/server/src/modules/transfer/transfer.service.ts`
- Create: `apps/server/src/modules/transfer/transfer.controller.ts`
- Create: `apps/server/src/modules/transfer/transfer.router.ts`
- Create: `apps/server/src/modules/transfer/index.ts`
- Modify: `apps/server/src/app.ts` (register transfer router)

- [ ] **Step 1: Create transfer service**

```typescript
// apps/server/src/modules/transfer/transfer.service.ts
import { db } from '../../db';
import { transferSessions, transferItems, chunkUploads } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateSessionId, generateItemId, generateChunkId } from '../../utils/id';
import { S3_BUCKET, TRANSFER_TTL_DAYS, getPresignedUploadUrl, getPresignedDownloadUrl } from '../../config/s3';
import { getPresignedUploadUrl as getUploadUrl } from '../../config/s3';

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

export interface InitTransferInput {
  userId: string;
  sourceDeviceId: string;
  targetDeviceId?: string;
  items: Array<{
    type: 'file' | 'text' | 'clipboard';
    name?: string;
    mimeType?: string;
    size?: number;
    content?: string;
  }>;
}

export interface InitTransferOutput {
  session: {
    id: string;
    status: string;
    s3Bucket: string;
    s3Key: string;
    chunkCount: number;
    totalSize: number;
    originalFileName: string;
  };
  items: Array<{
    id: string;
    type: string;
    name: string | null;
    size: number;
  }>;
  presignedUrls?: string[];
}

export async function initTransfer(input: InitTransferInput): Promise<InitTransferOutput> {
  const { userId, sourceDeviceId, targetDeviceId, items } = input;

  // Calculate total size and chunk count for file items
  let totalSize = 0;
  let chunkCount = 0;

  for (const item of items) {
    if (item.type === 'file') {
      totalSize += item.size || 0;
      chunkCount += Math.ceil((item.size || 0) / CHUNK_SIZE);
    }
  }

  const sessionId = generateSessionId();
  const s3Key = `transfers/${sessionId}`;
  const now = Math.floor(Date.now() / 1000);
  const ttlExpiresAt = now + (TRANSFER_TTL_DAYS * 24 * 60 * 60);

  // Determine content type and filename from first file
  let contentType = 'application/octet-stream';
  let originalFileName = 'unknown';

  const firstFile = items.find(item => item.type === 'file');
  if (firstFile) {
    originalFileName = firstFile.name || 'unknown';
    contentType = firstFile.mimeType || contentType;
  }

  // Create session
  await db.insert(transferSessions).values({
    id: sessionId,
    userId,
    sourceDeviceId,
    targetDeviceId,
    status: 'pending',
    s3Bucket: S3_BUCKET,
    s3Key,
    originalFileName,
    totalSize,
    chunkCount,
    receivedChunks: 0,
    contentType,
    ttlExpiresAt,
    createdAt: now,
  });

  // Create transfer items
  const createdItems = [];
  for (const item of items) {
    const itemId = generateItemId();
    await db.insert(transferItems).values({
      id: itemId,
      sessionId,
      type: item.type,
      name: item.name,
      mimeType: item.mimeType,
      size: item.size || 0,
      content: item.content,
      createdAt: now,
    });
    createdItems.push({
      id: itemId,
      type: item.type,
      name: item.name || null,
      size: item.size || 0,
    });
  }

  // Generate presigned URLs for chunks if there are file items
  let presignedUrls: string[] | undefined;
  if (chunkCount > 0) {
    presignedUrls = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkKey = `${s3Key}/chunk_${i}`;
      const url = await getUploadUrl(chunkKey, 'application/octet-stream');
      presignedUrls.push(url);
    }
  }

  return {
    session: {
      id: sessionId,
      status: 'pending',
      s3Bucket: S3_BUCKET,
      s3Key,
      chunkCount,
      totalSize,
      originalFileName,
    },
    items: createdItems,
    presignedUrls,
  };
}

export async function uploadChunk(sessionId: string, chunkIndex: number, etag: string): Promise<void> {
  const s3Key = `transfers/${sessionId}/chunk_${chunkIndex}`;
  const now = Math.floor(Date.now() / 1000);

  // Record chunk upload
  await db.insert(chunkUploads).values({
    id: generateChunkId(),
    sessionId,
    chunkIndex,
    s3Key,
    etag,
    uploadedAt: now,
  });

  // Update received chunks count
  const [session] = await db.select().from(transferSessions).where(eq(transferSessions.id, sessionId)).limit(1);
  if (session) {
    await db.update(transferSessions)
      .set({ receivedChunks: session.receivedChunks + 1 })
      .where(eq(transferSessions.id, sessionId));
  }
}

export async function completeTransfer(sessionId: string, userId: string): Promise<{ status: string; downloadUrl?: string }> {
  const [session] = await db.select().from(transferSessions)
    .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
    .limit(1);

  if (!session) {
    throw new Error('Transfer not found');
  }

  // Verify all chunks received
  if (session.receivedChunks < session.chunkCount) {
    throw new Error('Not all chunks uploaded');
  }

  // Update status to completed
  const now = Math.floor(Date.now() / 1000);
  await db.update(transferSessions)
    .set({ status: 'completed', completedAt: now })
    .where(eq(transferSessions.id, sessionId));

  // Generate download URL
  const downloadUrl = await getPresignedDownloadUrl(session.s3Key, session.originalFileName);

  return { status: 'completed', downloadUrl };
}

export async function getTransferList(userId: string, limit = 50, offset = 0): Promise<any[]> {
  const results = await db.select()
    .from(transferSessions)
    .where(eq(transferSessions.userId, userId))
    .orderBy(desc(transferSessions.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}

export async function getTransferById(sessionId: string, userId: string): Promise<any | null> {
  const [session] = await db.select()
    .from(transferSessions)
    .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
    .limit(1);

  if (!session) return null;

  const items = await db.select()
    .from(transferItems)
    .where(eq(transferItems.sessionId, sessionId));

  return { ...session, items };
}

export async function getDownloadUrl(sessionId: string, userId: string): Promise<string> {
  const [session] = await db.select()
    .from(transferSessions)
    .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
    .limit(1);

  if (!session) {
    throw new Error('Transfer not found');
  }

  if (session.status !== 'completed') {
    throw new Error('Transfer not completed');
  }

  const now = Math.floor(Date.now() / 1000);
  if (session.ttlExpiresAt < now) {
    throw new Error('Transfer expired');
  }

  return getPresignedDownloadUrl(session.s3Key, session.originalFileName);
}
```

- [ ] **Step 2: Create transfer controller**

```typescript
// apps/server/src/modules/transfer/transfer.controller.ts
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import * as transferService from './transfer.service';
import { success, created, notFound, badRequest, gone } from '../../utils/response';

export async function initTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { sourceDeviceId, targetDeviceId, items } = req.body;

    if (!sourceDeviceId || !items || !Array.isArray(items) || items.length === 0) {
      badRequest(res, 'sourceDeviceId and items are required');
      return;
    }

    const result = await transferService.initTransfer({ userId, sourceDeviceId, targetDeviceId, items });
    created(res, result);
  } catch (err) {
    next(err);
  }
}

export async function uploadChunk(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { chunkIndex, etag } = req.body;

    if (chunkIndex === undefined || !etag) {
      badRequest(res, 'chunkIndex and etag are required');
      return;
    }

    await transferService.uploadChunk(id, chunkIndex, etag);
    success(res, { message: 'Chunk recorded' });
  } catch (err) {
    next(err);
  }
}

export async function completeTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await transferService.completeTransfer(id, userId);
    success(res, result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Transfer not found') {
        notFound(res, err.message);
      } else if (err.message === 'Not all chunks uploaded') {
        badRequest(res, err.message);
      } else {
        next(err);
      }
    } else {
      next(err);
    }
  }
}

export async function listTransfers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const transfers = await transferService.getTransferList(userId, limit, offset);
    success(res, { transfers });
  } catch (err) {
    next(err);
  }
}

export async function getTransfer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const transfer = await transferService.getTransferById(id, userId);
    if (!transfer) {
      notFound(res, 'Transfer not found');
      return;
    }

    success(res, { transfer });
  } catch (err) {
    next(err);
  }
}

export async function getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const url = await transferService.getDownloadUrl(id, userId);
    success(res, { url });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Transfer not found') {
        notFound(res, err.message);
      } else if (err.message === 'Transfer expired') {
        gone(res, err.message);
      } else {
        next(err);
      }
    } else {
      next(err);
    }
  }
}
```

- [ ] **Step 3: Create transfer router**

```typescript
// apps/server/src/modules/transfer/transfer.router.ts
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as transferController from './transfer.controller';

const router = Router();

router.use(authenticate);

router.post('/init', transferController.initTransfer);
router.post('/:id/chunks', transferController.uploadChunk);
router.post('/:id/complete', transferController.completeTransfer);
router.get('/', transferController.listTransfers);
router.get('/:id', transferController.getTransfer);
router.get('/:id/download', transferController.getDownloadUrl);

export default router;
```

- [ ] **Step 4: Create module index**

```typescript
// apps/server/src/modules/transfer/index.ts
export { default as transferRouter } from './transfer.router';
```

- [ ] **Step 5: Update app.ts**

```typescript
// Add to app.ts imports
import { transferRouter } from './modules/transfer';

// Add to app.ts after device router
app.use('/api/transfers', transferRouter);
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/modules/transfer apps/server/src/app.ts
git commit -m "feat(server): add transfer module with chunked upload

- Add init, uploadChunk, complete, list, get, download endpoints
- Support file, text, clipboard transfer types
- S3 presigned URLs for direct upload/download
- Track chunk progress in database

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Socket.io Real-time Communication

### Task 7: Server - Socket.io Setup & Handlers

**Files:**
- Create: `apps/server/src/socket/socket.ts`
- Modify: `apps/server/src/index.ts` (integrate socket)

- [ ] **Step 1: Create socket handler**

```typescript
// apps/server/src/socket/socket.ts
import { Server, Socket } from 'socket.io';
import { db } from '../db';
import { devices, transferSessions, transferItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAccessToken } from '../config/jwt';
import { updateDeviceHeartbeat, setDeviceOffline, getOnlineDevices } from '../modules/device/device.service';
import { logger } from '@zen-send/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  deviceId?: string;
}

export function setupSocket(io: Server): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.userId;
      socket.deviceId = payload.deviceId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    logger.info({ socketId: socket.id, userId: socket.userId }, 'Socket connected');

    // Register device as online
    if (socket.deviceId) {
      await updateDeviceHeartbeat(socket.deviceId);
    }

    // Emit device list to user
    if (socket.userId) {
      const userDevices = await getOnlineDevices(socket.userId);
      socket.emit('device:list', { devices: userDevices });
    }

    // Handle device heartbeat
    socket.on('device:heartbeat', async () => {
      if (socket.deviceId) {
        await updateDeviceHeartbeat(socket.deviceId);
      }
    });

    // Handle new transfer notification
    socket.on('transfer:notify', async (data: { targetDeviceId: string; sessionId: string }) => {
      const { targetDeviceId, sessionId } = data;

      // Find target device's socket
      const targetSockets = await io.fetchSockets();
      for (const s of targetSockets) {
        const targetSocket = s as AuthenticatedSocket;
        if (targetSocket.deviceId === targetDeviceId) {
          // Get transfer details
          const [session] = await db.select().from(transferSessions).where(eq(transferSessions.id, sessionId)).limit(1);
          const items = await db.select().from(transferItems).where(eq(transferItems.sessionId, sessionId));

          targetSocket.emit('transfer:new', {
            session: { ...session, items },
          });
          break;
        }
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
      if (socket.deviceId) {
        await setDeviceOffline(socket.deviceId);
      }
    });
  });
}
```

- [ ] **Step 2: Update index.ts to integrate socket**

```typescript
// apps/server/src/index.ts (update existing)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from '@zen-send/logger';
import { setupSocket } from './socket/socket';
import { authRouter } from './modules/auth';
import { deviceRouter } from './modules/device';
import { transferRouter } from './modules/transfer';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/transfers', transferRouter);

// Setup Socket.io
setupSocket(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/socket apps/server/src/index.ts
git commit -m "feat(server): add Socket.io real-time communication

- Device online status tracking
- transfer:new event for push notifications
- device:heartbeat for keeping connection alive
- JWT authentication for socket connections

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Shared Package Updates

### Task 8: Shared - Update Shared Types

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/package.json` (add necessary types)

- [ ] **Step 1: Update shared types**

```typescript
// packages/shared/src/index.ts
// Shared types and DTOs for zen-send

// Device types
export type DeviceType = 'web' | 'android' | 'ios' | 'desktop';

// Device interface
export interface Device {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  lastSeenAt: number;
  isOnline: number;
  createdAt: number;
}

// Transfer item types
export type TransferItemType = 'file' | 'text' | 'clipboard';
export type TransferStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'expired';

// Transfer item
export interface TransferItem {
  id: string;
  sessionId: string;
  type: TransferItemType;
  name: string | null;
  mimeType: string | null;
  size: number;
  content?: string;
  thumbnailKey?: string;
  createdAt: number;
}

// Transfer session
export interface TransferSession {
  id: string;
  userId: string;
  sourceDeviceId: string;
  targetDeviceId: string | null;
  status: TransferStatus;
  s3Bucket: string;
  s3Key: string;
  originalFileName: string;
  totalSize: number;
  chunkCount: number;
  receivedChunks: number;
  contentType: string;
  ttlExpiresAt: number;
  createdAt: number;
  completedAt?: number;
  items?: TransferItem[];
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Auth types
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

// Device types
export interface RegisterDeviceRequest {
  name: string;
  type: DeviceType;
}

export interface DeviceResponse {
  device: Device;
}

export interface DeviceListResponse {
  devices: Device[];
}

// Transfer types
export interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId?: string;
  items: Array<{
    type: TransferItemType;
    name?: string;
    mimeType?: string;
    size?: number;
    content?: string;
  }>;
}

export interface InitTransferResponse {
  session: {
    id: string;
    status: string;
    s3Bucket: string;
    s3Key: string;
    chunkCount: number;
    totalSize: number;
    originalFileName: string;
  };
  items: Array<{
    id: string;
    type: string;
    name: string | null;
    size: number;
  }>;
  presignedUrls?: string[];
}

export interface UploadChunkRequest {
  chunkIndex: number;
  etag: string;
}

export interface CompleteTransferResponse {
  status: string;
  downloadUrl?: string;
}

export interface TransferListResponse {
  transfers: TransferSession[];
}

export interface TransferDetailResponse {
  transfer: TransferSession;
}

export interface DownloadUrlResponse {
  url: string;
}

// Socket events
export interface SocketEvents {
  'device:register': { deviceId: string };
  'device:heartbeat': void;
  'device:list': { devices: Device[] };
  'transfer:new': { session: TransferSession };
  'transfer:progress': { sessionId: string; progress: number };
  'transfer:complete': { sessionId: string };
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): update shared types for auth, transfer, socket

- Add full API request/response types
- Add Socket event types
- Add Device, TransferSession, TransferItem interfaces

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 7: Theme System

### Task 9: Web - Theme System Implementation

**Files:**
- Create: `apps/web/src/theme/tokens.ts`
- Create: `apps/web/src/theme/ThemeProvider.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Create theme tokens**

```typescript
// apps/web/src/theme/tokens.ts
export const theme = {
  light: {
    // Backgrounds
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceElevated: '#F5F5F5',

    // Primary - Indigo
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryPressed: '#4338CA',
    onPrimary: '#FFFFFF',

    // Secondary - Violet
    secondary: '#8B5CF6',
    secondaryHover: '#7C3AED',

    // Accent - Cyan
    accent: '#06B6D4',

    // Text
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    onSurface: '#1F2937',

    // Borders
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.1)',
    shadowStrong: 'rgba(0, 0, 0, 0.15)',
  },

  dark: {
    // Backgrounds
    background: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceElevated: '#262626',

    // Primary - Indigo
    primary: '#818CF8',
    primaryHover: '#6366F1',
    primaryPressed: '#4F46E5',
    onPrimary: '#1F2937',

    // Secondary - Violet
    secondary: '#A78BFA',
    secondaryHover: '#8B5CF6',

    // Accent - Cyan
    accent: '#22D3EE',

    // Text
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    onSurface: '#F9FAFB',

    // Borders
    border: '#374151',
    borderStrong: '#4B5563',

    // Status
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',

    // Shadows
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowStrong: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export type Theme = typeof theme.light;
export type ThemeMode = 'light' | 'dark' | 'system';

export const storageKey = 'zen-send-theme';

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
}
```

- [ ] **Step 2: Create ThemeProvider**

```typescript
// apps/web/src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { theme, ThemeMode, Theme, storageKey, getResolvedTheme, getSystemTheme } from './tokens';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  colors: Theme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(storageKey) as ThemeMode) || 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => getResolvedTheme(mode));

  useEffect(() => {
    const updateResolvedTheme = () => {
      setResolvedTheme(getResolvedTheme(mode));
    };

    updateResolvedTheme();

    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateResolvedTheme);
      return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
    }
  }, [mode]);

  useEffect(() => {
    const colors = resolvedTheme === 'dark' ? theme.dark : theme.light;
    const root = document.documentElement;

    // Set CSS custom properties
    root.setProperty('--background', colors.background);
    root.setProperty('--surface', colors.surface);
    root.setProperty('--surface-elevated', colors.surfaceElevated);
    root.setProperty('--primary', colors.primary);
    root.setProperty('--primary-hover', colors.primaryHover);
    root.setProperty('--primary-pressed', colors.primaryPressed);
    root.setProperty('--on-primary', colors.onPrimary);
    root.setProperty('--secondary', colors.secondary);
    root.setProperty('--secondary-hover', colors.secondaryHover);
    root.setProperty('--accent', colors.accent);
    root.setProperty('--text', colors.text);
    root.setProperty('--text-secondary', colors.textSecondary);
    root.setProperty('--text-tertiary', colors.textTertiary);
    root.setProperty('--on-surface', colors.onSurface);
    root.setProperty('--border', colors.border);
    root.setProperty('--border-strong', colors.borderStrong);
    root.setProperty('--success', colors.success);
    root.setProperty('--warning', colors.warning);
    root.setProperty('--error', colors.error);
    root.setProperty('--info', colors.info);
    root.setProperty('--shadow', colors.shadow);
    root.setProperty('--shadow-strong', colors.shadowStrong);

    // Set data attribute for component-level styling
    root.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(storageKey, newMode);
  };

  const colors = resolvedTheme === 'dark' ? theme.dark : theme.light;

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

- [ ] **Step 3: Update App.tsx to use ThemeProvider**

```typescript
// apps/web/src/App.tsx
import { ThemeProvider } from './theme/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      {/* App content */}
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/theme apps/web/src/App.tsx
git commit -m "feat(web): add theme system with light/dark mode

- Add CSS custom properties for colors
- Support system preference detection
- Local storage for user preference

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 8: Error Handler & Server Entry Update

### Task 10: Server - Error Handler & Final Integration

**Files:**
- Create: `apps/server/src/middleware/error.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create error middleware**

```typescript
// apps/server/src/middleware/error.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '@zen-send/logger';
import { serverError } from '../utils/response';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  serverError(res, 'Internal server error');
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
  });
}
```

- [ ] **Step 2: Update app.ts**

```typescript
// apps/server/src/app.ts (complete)
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth';
import { deviceRouter } from './modules/device';
import { transferRouter } from './modules/transfer';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/devices', deviceRouter);
app.use('/api/transfers', transferRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
```

- [ ] **Step 3: Update index.ts**

```typescript
// apps/server/src/index.ts (complete)
import dotenv from 'dotenv';
dotenv.config();

import { app } from './app';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { logger } from '@zen-send/logger';
import { setupSocket } from './socket/socket';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Setup Socket.io
setupSocket(io);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/middleware/error.ts apps/server/src/index.ts apps/server/src/app.ts
git commit -m "feat(server): add error handling middleware and finalize integration

- Add 404 handler for unknown routes
- Add global error handler with logging
- Export app from app.ts for testing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Execution Notes

### Prerequisite Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=zen_send

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# S3
S3_REGION=us-east-1
S3_BUCKET=zen-send-transfers
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT= # Optional, for S3-compatible storage like MinIO

# Transfer
TRANSFER_TTL_DAYS=30
```

### Next Steps After Chunk 1-8

1. **Test server** - Start server, test auth flow, device CRUD, transfer init
2. **Web client** - Build UI components (DeviceList, TransferList, Settings)
3. **Mobile client** - Build React Native UI with Expo Router
4. **Clipboard detection** - Web: Clipboard API, Mobile: expo-clipboard
5. **File picker** - Web: File input, Mobile: expo-document-picker
6. **Download handler** - Mobile: Open file in native viewer
7. **Background jobs** - TTL cleanup cron job
8. **E2E tests** - Test full transfer flow

---

**Plan complete.** Ready to execute using subagent-driven-development?
