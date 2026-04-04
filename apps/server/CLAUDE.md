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

## DTO 校验

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

## ID 生成规则

| 前缀 | 类型 | 函数 |
|------|------|------|
| `u` | User | `generateUserId()` |
| `d` | Device | `generateDeviceId()` |
| `s` | Session | `generateSessionId()` |
| `i` | Item | `generateItemId()` |
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
