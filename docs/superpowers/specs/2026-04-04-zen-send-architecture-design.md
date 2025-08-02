# Zen Send - Architecture Design

## 1. Overview

Zen Send is a cross-device clipboard and file transfer tool with server relay, inspired by LocalSend. It supports text, clipboard content, and file transfers across Web (Electron), Mobile (React Native), with offline storage and history management.

### Core Features

- **Transfer Types**: Text, clipboard content, files
- **Architecture**: Server relay with S3 storage (not peer-to-peer)
- **Chunked Upload**: 1MB chunks, client tracks progress
- **Offline Storage**: Files stored in S3 with configurable TTL (default 30 days)
- **History Management**: Cloud files list + local download records
- **Multi-device**: User system with device management and online status push
- **Theme**: Light/Dark mode with system preference sync and manual override

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express + Socket.io |
| Database | MySQL2 + Drizzle ORM |
| File Storage | AWS S3 (private bucket, signed URLs) |
| Authentication | JWT (access + refresh tokens) |
| Real-time | Socket.io (device discovery, push notifications) |
| Web Client | Electron |
| Mobile Client | React Native (Expo) |
| Package Manager | pnpm (monorepo with Turbo) |

## 3. ID Generation

Using `nanoid` with custom alphabet for each table:

```typescript
import { customAlphabet } from 'nanoid';

const typeid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 22);

// Usage: prefix + generated id
// Example: "u" + "3KkL9mW2XyPqRsTuVwY" -> "u3KkL9mW2XyPqRsTuVwY"
```

**Prefix Convention:**

| Entity | Prefix | Example |
|--------|--------|---------|
| User | `u` | `u3KkL9mW2XyPqRsTuVwY` |
| Device | `d` | `d4LlMnO5PqRsTuVwXyZa` |
| Transfer Session | `s` | `s5MmNoO6QrStUvWxYbZc` |
| Transfer Item | `i` | `i6NnOpP7RsTuVwXyZcAd` |
| Download History | `h` | `h7OoPqQ8StUvWxYzAdBe` |

## 4. Database Schema

### 4.1 Users Table

```typescript
// No foreign keys - join in business code
export const users = mysqlTable('users', {
  id: varchar('id', { length: 24 }).primaryKey(), // 'u' + 22 chars
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: int('created_at').notNull(),
  updatedAt: int('updated_at').notNull(),
});
```

### 4.2 Devices Table

```typescript
export const devices = mysqlTable('devices', {
  id: varchar('id', { length: 24 }).primaryKey(), // 'd' + 22 chars
  userId: varchar('user_id', { length: 24 }).notNull(), // 'u' + 22 chars, join in code
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'web' | 'android' | 'ios' | 'desktop'
  lastSeenAt: int('last_seen_at').notNull(),
  isOnline: tinyint('is_online', { length: 1 }).notNull().default(0),
  createdAt: int('created_at').notNull(),
});
```

### 4.3 Transfer Sessions Table

```typescript
export const transferSessions = mysqlTable('transfer_sessions', {
  id: varchar('id', { length: 24 }).primaryKey(), // 's' + 22 chars
  userId: varchar('user_id', { length: 24 }).notNull(),
  sourceDeviceId: varchar('source_device_id', { length: 24 }).notNull(), // 'd' + 22 chars
  targetDeviceId: varchar('target_device_id', { length: 24 }).notNull(), // nullable for broadcast
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | uploading | completed | failed | expired
  s3Bucket: varchar('s3_bucket', { length: 100 }).notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(), // Original filename stored separately
  originalFileName: varchar('original_file_name', { length: 255 }).notNull(),
  totalSize: bigint('total_size', { mode: 'number' }).notNull().default(0),
  chunkCount: int('chunk_count').notNull().default(0),
  receivedChunks: int('received_chunks').notNull().default(0), // Number of chunks received
  contentType: varchar('content_type', { length: 100 }).notNull().default('application/octet-stream'),
  ttlExpiresAt: int('ttl_expires_at').notNull(), // Unix timestamp
  createdAt: int('created_at').notNull(),
  completedAt: int('completed_at'),
});
```

### 4.4 Transfer Items Table

```typescript
export const transferItems = mysqlTable('transfer_items', {
  id: varchar('id', { length: 24 }).primaryKey(), // 'i' + 22 chars
  sessionId: varchar('session_id', { length: 24 }).notNull(), // 's' + 22 chars
  type: varchar('type', { length: 20 }).notNull(), // 'file' | 'text' | 'clipboard'
  name: varchar('name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  size: bigint('size', { mode: 'number' }).notNull().default(0),
  content: text('content'), // For text/clipboard types
  thumbnailKey: varchar('thumbnail_key', { length: 500 }), // S3 key for thumbnail
  createdAt: int('created_at').notNull(),
});
```

### 4.5 Download History Table

```typescript
export const downloadHistory = mysqlTable('download_history', {
  id: varchar('id', { length: 24 }).primaryKey(), // 'h' + 22 chars
  userId: varchar('user_id', { length: 24 }).notNull(),
  sessionId: varchar('session_id', { length: 24 }).notNull(), // 's' + 22 chars
  deviceId: varchar('device_id', { length: 24 }).notNull(), // 'd' + 22 chars
  localPath: varchar('local_path', { length: 500 }), // Device-specific path
  downloadedAt: int('downloaded_at').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('downloaded'), // downloaded | deleted
});
```

### 4.6 Chunk Uploads Table

```typescript
export const chunkUploads = mysqlTable('chunk_uploads', {
  id: varchar('id', { length: 24 }).primaryKey(),
  sessionId: varchar('session_id', { length: 24 }).notNull(),
  chunkIndex: int('chunk_index').notNull(),
  s3Key: varchar('s3_key', { length: 500 }).notNull(),
  etag: varchar('etag', { length: 100 }),
  uploadedAt: int('uploaded_at').notNull(),
});
```

## 5. API Design

### 5.1 Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Invalidate refresh token |

### 5.2 Devices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/devices` | List user's devices |
| POST | `/api/devices` | Bind new device |
| DELETE | `/api/devices/:id` | Unbind device |
| PATCH | `/api/devices/:id/heartbeat` | Device heartbeat |

### 5.3 Transfers

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transfers/init` | Initialize transfer session |
| POST | `/api/transfers/:id/chunks` | Upload chunk(s) |
| POST | `/api/transfers/:id/complete` | Mark upload complete, trigger merge |
| GET | `/api/transfers` | List transfer history |
| GET | `/api/transfers/:id` | Get transfer details |
| GET | `/api/transfers/:id/download` | Get signed download URL |
| DELETE | `/api/transfers/:id` | Delete transfer record |

### 5.4 Socket.io Events

| Event | Direction | Description |
|-------|------------|-------------|
| `device:register` | client→server | Device goes online |
| `device:heartbeat` | client→server | Keep device online |
| `device:list` | server→client | Push device list |
| `transfer:new` | server→client | New transfer notification |
| `transfer:progress` | server→client | Upload progress update |
| `transfer:complete` | server→client | Transfer completed |

## 6. Transfer Flow

### 6.1 File Upload Flow

```
Sender:
1. User selects file(s)
2. Client calls POST /api/transfers/init
3. Server creates session, returns sessionId + presigned chunk upload URLs
4. Client reads file in 1MB chunks
5. For each chunk: PUT to presigned S3 URL
6. After all chunks: POST /api/transfers/:id/complete
7. Server validates all chunks received, merges to final S3 key
8. Server updates session status to 'completed'
9. Socket.io pushes transfer:new to target devices

Receiver:
1. Socket receives transfer:new event
2. Add to transfer list with 'new' badge styling
3. User taps to download
4. Client calls GET /api/transfers/:id/download
5. Server generates signed URL, returns to client
6. Client downloads directly from S3 using signed URL
7. Client calls POST /api/transfers/:id/history to record download
8. For mobile: Open file in native file manager
```

### 6.2 Text/Clipboard Flow

```
1. User enters text or pastes clipboard content
2. Client calls POST /api/transfers/init with type='text'/'clipboard'
3. Server creates session with content inline
4. Socket.io pushes to target devices
5. Receiver displays in notification/UI
6. User can tap to copy to clipboard
```

## 7. S3 Storage

### 7.1 Bucket Structure

```
s3://{bucket}/
├── transfers/
│   ├── {sessionId}/
│   │   ├── chunk_0
│   │   ├── chunk_1
│   │   └── ...
│   └── {sessionId}_merged  (after completion)
├── thumbnails/
│   └── {itemId}.{ext}
└── tmp/
    └── (presigned upload temp keys)
```

### 7.2 Presigned URLs

- **Chunk Upload**: Generate per-chunk presigned PUT URL, 1 hour expiry
- **Download**: Generate presigned GET URL on demand, 24 hour expiry
- **Response Headers**: `Content-Disposition: attachment; filename="原始文件名"`

## 8. Theme System

### 8.1 Color Tokens

```typescript
const theme = {
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
  }
};
```

### 8.2 Theme Resolution

1. User preference stored in localStorage/settings
2. If 'system', use `prefers-color-scheme`
3. If 'light' or 'dark', use explicit choice
4. CSS variables for runtime switching without reload

## 9. Security

### 9.1 JWT Tokens

- **Access Token**: 15 min expiry, contains userId + deviceId
- **Refresh Token**: 7 days expiry, stored in httpOnly cookie
- **Token Rotation**: Refresh token rotated on each refresh call

### 9.2 S3 Security

- Private bucket, no public access
- All S3 operations go through server-side SDK
- Presigned URLs with short expiry for uploads
- Download URLs generated server-side per request

## 10. TTL & Cleanup

### 10.1 Transfer Expiry

- Default TTL: 30 days (configurable globally)
- TTL checked on download request
- Expired files return 410 Gone
- Background job runs daily to delete expired S3 objects and DB records

### 10.2 Configuration

```typescript
// Server config (env)
TRANSFER_TTL_DAYS=30
S3_BUCKET=zen-send-transfers
S3_REGION=us-east-1
```
