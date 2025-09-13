# Server 规范

## 核心原则

### 1. IOC 容器加载顺序
`container.ts` 必须在所有控制器之前导入，确保 TypeDI 正确初始化。

### 2. Service 必须用 `@Service()` 装饰器
所有业务逻辑类必须使用 `@Service()` 注册到 TypeDI 容器。

### 3. Controller 注入 Service 通过构造器
```typescript
constructor(private authService: AuthService) {}
```
禁止在 Controller 中使用 `Container.get()`。

### 4. 时间戳存 Unix 秒
```typescript
Math.floor(Date.now() / 1000)
```
禁止使用毫秒、ISO 字符串。

## 文件命名

| 类型 | 后缀 | 示例 |
|------|------|------|
| Controller | `.controller.ts` | `auth.controller.ts` |
| Service | `.service.ts` | `device.service.ts` |
| Validator | `.validator.ts` | `auth.validator.ts` |
| Middleware | `.middleware.ts` | `auth.middleware.ts` |

## 目录结构

```
src/
├── index.ts              # 入口
├── app.ts                # createApp 工厂
├── ioc.ts                # IOC 初始化 (glob 加载)
├── container.ts          # TypeDI 容器设置
├── controllers/          # @JsonController
├── services/             # @Service
├── validators/           # class-validator DTO
├── middlewares/          # currentUserChecker
├── middleware/           # Express error handler
├── socket/               # Socket.io handlers
├── db/schema.ts          # Drizzle Schema
└── utils/                # jwt, response, id
```

## Server Architecture Key Points

- Uses `routing-controllers` for declarative API endpoints with validation
- Uses `typedi` for dependency injection (IOC via glob-loaded services/controllers)
- `AuthService`, `DeviceService`, `TransferService` contain business logic
- `DbService` wraps database operations
- `S3Service` handles S3 presigned URLs

## DTO 校验

Two-layer DTO system:
1. `packages/dto` — Pure TypeScript interfaces for compile-time type checking
2. `apps/server/src/validators/` — class-validator decorated classes for runtime validation

Validator 类必须 `implements` 对应的 `@zen-send/dto` 接口：

```typescript
// packages/dto
export interface RegisterRequest { email: string; password: string }

// validators
export class RegisterDto implements RegisterRequest {
  @IsEmail()
  email!: string;
  @IsString() @MinLength(6)
  password!: string;
}
```

Web imports types from `@zen-send/dto`, server imports types and adds validation decorators.

## ID 生成规则

| 前缀 | 类型 | 函数 |
|------|------|------|
| `u` | User | `generateUserId()` |
| `d` | Device | `generateDeviceId()` |
| `s` | Session | `generateSessionId()` |
| `i` | Item | `generateItemId()` |
| `h` | Download History | `generateHistoryId()` |
| `c` | Chunk | `generateChunkId()` |

使用 nanoid，22 字符，格式：`${prefix}${nanoid}`。

## Socket 处理器

Socket 处理器使用 `Container.get()` 获取 Service：

```typescript
io.on('connection', (socket) => {
  const deviceService = Container.get(DeviceService);
});
```

禁止构造器注入。

### Real-time Communication (Socket.io)

**Client → Server events:**
- `device:heartbeat` - Keep device marked as online
- `device:register` - Explicit device registration
- `transfer:notify` - Send transfer notification to target device
- `transfer:progress` - Emit progress updates to session room
- `transfer:complete` - Notify session of transfer completion

**Server → Client events:**
- `device:list` - List of user's devices (online/offline status)
- `transfer:new` - New incoming transfer notification

## Transfer Module (Chunked S3 Multipart Upload)

- Files are uploaded in 1MB chunks via S3 multipart upload
- Server generates presigned URLs for direct client-to-S3 upload
- Tracks chunk uploads in `chunkUploads` table
- Supports text and clipboard transfers in addition to files
- Transfer sessions expire after `TRANSFER_TTL_DAYS` (default 30)

## Database Schema (Drizzle ORM + MySQL)

**Tables:** `users`, `devices`, `transfer_sessions`, `transfer_items`, `download_history`, `chunk_uploads`
- **No foreign keys** - Joins done in business code
- **Unix timestamps** - All timestamps stored as integers (seconds, not milliseconds)
- **Schema location:** `apps/server/src/db/schema.ts`
