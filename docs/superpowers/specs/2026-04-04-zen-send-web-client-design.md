# Zen Send Web/Electron Client Design

## 1. Overview

Zen Send 客户端（Web + Electron）用于设备间的内容传输（文件、文本、剪贴板），通过 WebSocket 实时推送，文件存储在 S3。

### 设计原则
- **广播模式**：内容发送到所有在线设备，无需选择目标
- **云端优先**：进入页面即显示云端历史文件列表
- **跨平台一致**：Web 和 Electron 共用同一套 React 代码，通过桥接 API 差异化处理

---

## 2. 技术架构

### 2.1 目录结构（目标状态）

```
apps/
├── electron/                    # [新建] Electron 桌面应用
│   ├── src/
│   │   ├── main/
│   │   │   ├── index.ts       # 主进程入口
│   │   │   ├── window.ts      # 窗口管理
│   │   │   ├── menu.ts       # 菜单栏
│   │   │   └── tray.ts       # 系统托盘
│   │   └── preload/
│   │       └── index.ts       # 预加载脚本，注入 zenBridge
│   ├── build/                  # 应用图标
│   ├── electron-builder.yml    # 构建配置
│   ├── vite.config.ts          # Vite + Electron 配置
│   ├── package.json
│   └── tsconfig.json
│
├── web/                        # Web 应用（Vite 开发服务器）
│   ├── index.html              # Electron 加载的页面
│   ├── src/
│   │   ├── main.tsx            # 应用入口（register 全局 Services）
│   │   ├── app.tsx             # 根组件
│   │   ├── pages/              # 页面组件
│   │   │   ├── home/
│   │   │   │   ├── index.tsx           # 主页组件
│   │   │   │   └── home.service.ts    # 主页 Service
│   │   │   ├── login/
│   │   │   │   ├── index.tsx
│   │   │   │   └── login.service.ts
│   │   │   ├── register/
│   │   │   │   ├── index.tsx
│   │   │   │   └── register.service.ts
│   │   │   └── setup/
│   │   │       ├── index.tsx           # 服务器配置页
│   │   │       └── setup.service.ts
│   │   ├── components/         # 通用组件
│   │   │   ├── header/
│   │   │   │   ├── index.tsx
│   │   │   │   └── header.service.ts
│   │   │   ├── send-toolbar/
│   │   │   │   ├── index.tsx
│   │   │   │   └── send-toolbar.service.ts
│   │   │   ├── transfer-list/
│   │   │   │   ├── index.tsx
│   │   │   │   └── transfer-list.service.ts
│   │   │   └── toast/
│   │   │       ├── index.tsx
│   │   │       └── toast.service.ts
│   │   ├── services/           # 全局 Services (register)
│   │   │   ├── auth.service.ts
│   │   │   ├── api.service.ts
│   │   │   ├── theme.service.ts
│   │   │   └── socket.service.ts
│   │   ├── hooks/              # 自定义 hooks
│   │   ├── theme/              # 主题系统
│   │   └── lib/                # 工具函数、桥接 API
│   └── ...
│
└── server/                     # API 服务器
    └── src/
        └── public/             # 生产环境静态文件
```

### 2.2 环境检测与桥接

**桥接 API（window.zenBridge）：**

```typescript
interface ZenBridge {
  isElectron: boolean;

  // 文件保存对话框（Electron 特有）
  saveFileDialog(options: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null>;

  // 选择文件（Electron 特有）
  openFileDialog(options?: {
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }): Promise<{ path: string; name: string; size: number }[] | null>;

  // 读取文件内容
  readFile(path: string): Promise<ArrayBuffer>;
}
```

**环境检测：**

```typescript
const isElectron = typeof window !== 'undefined' && !!(window as any).zenBridge?.isElectron;
```

---

## 3. 页面结构

### 3.1 路由设计

```
/                   → 主页（云端文件列表 + 发送区）
/login              → 登录页
/register           → 注册页
/setup              → 服务器配置页（首次或设置中）
```

### 3.2 服务器配置页（Setup）

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                      Zen Send                           │
│                                                         │
│              Welcome! Please enter                      │
│              your server address                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  https://zensend.aimo.plus                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │                   Connect                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│              💡 Contact your administrator               │
│                 for the server address                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.3 主页布局

```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo + Theme Toggle + User Menu               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  [📎 Select]  [✏️ Text]  [📋 Clipboard]        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  (发送区 - 有选中内容时显示)                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Selected: file.zip (12.5 MB)  [Send]  [×]     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Filter: [All] [Files] [Text] [Clipboard]              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  📎 document.pdf               2.4 MB    2m    │   │
│  │  📎 image.png                 856 KB     5m    │   │
│  │  ✏️ Hello world             Text       1h    │   │
│  │  📋 Screenshot              Clip       2h    │   │
│  │  ...                                            │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  📱 Online: MacBook Pro, iPhone (3 devices)           │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 功能模块

### 4.1 认证模块

**登录页：**
- 邮箱 + 密码输入
- 登录按钮
- 跳转注册链接
- 错误提示

**注册页：**
- 邮箱 + 密码 + 确认密码
- 注册按钮
- 跳转登录链接
- 错误提示

**状态管理：**
- Token 存储在 localStorage
- Axios 拦截器自动附加 Token
- Token 过期时自动刷新

### 4.2 发送模块

**文件选择：**
- Electron：调用 `zenBridge.openFileDialog()`
- 浏览器：`<input type="file" multiple>`
- 显示选中文件列表（名称、大小）
- 支持移除单个文件

**文本发送：**
- 点击"文本"按钮打开 Modal
- Textarea 输入框
- 点击"发送"调用 API

**剪贴板：**
- 点击"剪贴板"读取剪贴板内容
- 自动填充到文本发送 Modal

**发送流程：**
1. 调用 `POST /api/transfers/init` 初始化会话，返回 presigned upload URLs
2. 文件分块（1MB）直接 PUT 到 S3 presigned URL
3. 每个 chunk 上传后调用 `POST /api/transfers/:id/chunks` 上报 etag
4. 所有 chunk 上传完成后调用 `POST /api/transfers/:id/complete`
5. Socket.io 广播 `transfer:notify` 到所有在线设备

### 4.3 接收模块

**云端文件列表：**
- 调用 `GET /api/transfers` 获取历史
- 按时间倒序排列
- 显示类型图标、名称、大小、相对时间
- 支持筛选（全部/文件/文本/剪贴板）

**下载：**
- Electron：调用 `zenBridge.saveFileDialog()` 选择保存位置，然后下载
- 浏览器：直接触发下载
- 下载完成后调用下载记录接口

**新传输通知：**
- Socket.io 监听 `transfer:new`
- 显示 Toast 通知
- 实时更新列表

### 4.4 设备在线状态

**Socket.io 监听：**
- `device:list` - 更新设备列表
- `device:register` - 注册设备
- `device:heartbeat` - 心跳保活

**显示：**
- 底部显示在线设备数量
- 用户点击可展开设备列表

---

## 5. 组件清单

### 5.1 布局组件

| 组件 | 说明 |
|------|------|
| `Header` | Logo、主题切换、用户菜单 |
| `Container` | 页面容器，最大宽度限制 |

### 5.2 认证组件

| 组件 | 说明 |
|------|------|
| `LoginForm` | 登录表单 |
| `RegisterForm` | 注册表单 |
| `SetupForm` | 服务器配置表单 |

### 5.3 发送组件

| 组件 | 说明 |
|------|------|
| `SendToolbar` | 文件/文本/剪贴板按钮工具栏 |
| `FileSelector` | 文件选择区（Electron 特有） |
| `SelectedFiles` | 已选文件列表 |
| `TextSendModal` | 文本发送弹窗 |
| `SendButton` | 发送按钮，带加载状态 |

### 5.4 列表组件

| 组件 | 说明 |
|------|------|
| `TransferList` | 传输历史列表 |
| `TransferItem` | 单个传输项 |
| `FilterTabs` | 筛选标签（全部/文件/文本/剪贴板） |
| `EmptyState` | 空状态提示 |

### 5.5 状态组件

| 组件 | 说明 |
|------|------|
| `OnlineDevices` | 在线设备显示 |
| `ConnectionStatus` | WebSocket 连接状态 |
| `Toast` | 通知提示 |

---

## 6. API 接口

### 6.1 认证

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/auth/logout` | 登出 |

### 6.2 传输

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/transfers/init` | 初始化传输，返回 presigned upload URLs |
| POST | `/api/transfers/:id/chunks` | 上报 chunk 上传结果（etag） |
| POST | `/api/transfers/:id/complete` | 完成传输，触发 merge |
| GET | `/api/transfers` | 获取传输列表，支持 `?type=file\|text\|clipboard` 筛选 |
| GET | `/api/transfers/:id` | 获取传输详情 |
| GET | `/api/transfers/:id/download` | 获取下载链接（presigned GET URL） |
| DELETE | `/api/transfers/:id` | 删除传输 |

### 6.3 设备

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/devices` | 注册设备 |
| GET | `/api/devices` | 获取设备列表 |
| PATCH | `/api/devices/:id/heartbeat` | 心跳 |
| DELETE | `/api/devices/:id` | 解绑设备 |

---

## 7. Socket.io 事件

### 客户端发送

| Event | Payload | 说明 |
|-------|---------|------|
| `device:register` | `{ name, type }` | 注册设备 |
| `device:heartbeat` | - | 心跳保活 |
| `transfer:notify` | `{ targetDeviceId?, sessionId }` | 通知目标设备（可选 targetDeviceId 表示单播，不填则广播） |
| `transfer:complete` | `{ sessionId }` | 传输完成 |

### 服务端推送

| Event | Payload | 说明 |
|-------|---------|------|
| `device:list` | `{ devices }` | 设备列表更新 |
| `transfer:new` | `{ session }` | 新传输通知 |
| `transfer:progress` | `{ sessionId, progress }` | 传输进度 |
| `transfer:complete` | `{ sessionId }` | 传输完成确认 |

---

## 8. Electron 构建配置

基于 `vite-plugin-electron/simple` + `vite-plugin-electron-renderer`，参考 `console/apps/client` 项目。

### 8.1 技术栈

- `vite-plugin-electron`: 构建主进程和预加载脚本
- `electron-builder`: 打包应用
- `electron-store`: 配置持久化（服务器地址、窗口状态）

### 8.2 服务器地址配置

**首次启动流程：**
```
Electron 启动
  ↓
检查本地是否有服务器地址配置
  ↓
无配置 → 显示"服务器配置"页面 → 用户输入地址 → 保存到 electron-store
  ↓
有配置 → 直接加载对应地址
```

**服务器地址规则：**
- **开发模式**：`http://localhost:5274`（默认，可修改）
- **生产模式**：用户配置的服务器地址（如 `https://zensend.aimo.plus`）
- 地址保存后，后续启动直接加载，不再显示配置页面
- 用户可在设置中修改服务器地址

### 8.3 主进程职责

- 窗口管理（创建、关闭、最小化、状态持久化）
- 菜单栏、托盘图标
- 服务器地址的读取和保存（通过 electron-store）
- 调用 preload 桥接 API
- 应用生命周期管理

### 8.4 Preload 职责

- 注入 `window.zenBridge`
- 暴露文件对话框 API (`openFileDialog`, `saveFileDialog`)
- 暴露文件系统 API (`readFile`)
- 暴露服务器配置 API (`getServerUrl`, `setServerUrl`)
- 使用 `contextBridge` 暴露 API，确保 `contextIsolation: true`

### 8.5 Preload API 扩展

```typescript
interface ZenBridge {
  isElectron: boolean;

  // 文件操作
  openFileDialog(options?: {
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }): Promise<{ path: string; name: string; size: number }[] | null>;

  saveFileDialog(options?: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }): Promise<string | null>;

  readFile(path: string): Promise<ArrayBuffer>;

  // 服务器配置
  getServerUrl(): Promise<string>;
  setServerUrl(url: string): Promise<void>;
}
```

### 8.6 Vite 配置

```typescript
// vite.config.ts
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    electron({
      main: {
        entry: 'src/main/index.ts',
        vite: {
          build: { outDir: 'dist/main' }
        }
      },
      preload: {
        input: 'src/preload/index.ts',
        vite: {
          build: {
            outDir: 'dist/preload',
            rollupOptions: { output: { format: 'cjs', entryFileNames: '[name].cjs' } }
          }
        }
      }
    }),
    renderer()
  ]
});
```

---

## 9. 状态管理 (@rabjs/react)

使用 Service 模式，所有业务逻辑封装在 Service 类中。

### 9.1 全局 Services（main.tsx 中 register）

| Service | 说明 | 生命周期 |
|---------|------|----------|
| `AuthService` | 用户认证状态、Token 管理 | 应用级 |
| `ApiService` | API 请求封装、拦截器 | 应用级 |
| `ThemeService` | 主题模式管理 | 应用级 |
| `SocketService` | Socket.io 连接管理 | 应用级 |
| `ConfigService` | 服务器地址配置（Electron 特有） | 应用级 |

### 9.2 页面级 Services（bindServices）

| Service | 说明 | 绑定页面 |
|---------|------|----------|
| `HomeService` | 传输列表、发送逻辑 | 主页 |
| `LoginService` | 登录表单逻辑 | 登录页 |
| `RegisterService` | 注册表单逻辑 | 注册页 |
| `SetupService` | 服务器地址配置逻辑 | 服务器配置页 |

### 9.3 组件级 Services

| Service | 说明 | 绑定组件 |
|---------|------|----------|
| `SendToolbarService` | 发送工具栏状态 | SendToolbar |
| `TransferListService` | 传输列表状态 | TransferList |
| `ToastService` | Toast 通知状态 | Toast |

### 9.4 Service 结构示例

```typescript
// 全局 Service - 在 main.tsx 中 register
export class AuthService extends Service {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  user: { id: string; email: string } | null = null;

  get isAuthenticated() {
    return !!this.accessToken;
  }

  async login(email: string, password: string) { ... }
  async logout() { ... }
  async refreshToken() { ... }
}

// 全局 Service - 服务器配置（Electron 特有）
export class ConfigService extends Service {
  serverUrl: string = '';  // 通过 zenBridge 获取/保存

  async loadServerUrl() { ... }
  async saveServerUrl(url: string) { ... }
}

// 页面级 Service - 使用 bindServices
export class HomeService extends Service {
  transfers: TransferSession[] = [];
  selectedFiles: File[] = [];
  filter: 'all' | 'file' | 'text' | 'clipboard' = 'all';

  get filteredTransfers() { ... }
  async loadTransfers() { ... }
  async sendFiles() { ... }
}
```

### 9.5 组件使用方式

```typescript
// 组件必须用 observer 包裹
const HomeContent = observer(() => {
  const homeService = useService(HomeService);

  return <div>{homeService.transfers.length}</div>;
});

// 使用 bindServices 注册 Service
export default bindServices(HomeContent, [HomeService]);
```

---

## 10. 主题系统

沿用现有 `tokens.ts` 和 `ThemeProvider`，CSS 变量通过 Tailwind 暴露。

### 暗色模式

- `dark` class 附加在 `<html>` 元素
- ThemeProvider 监听系统偏好

---

## 11. Electron 启动流程

### 11.1 启动判断逻辑

```typescript
// App 组件中
async function determineStartPage() {
  if (isElectron) {
    // Electron 模式：检查服务器地址是否已配置
    const serverUrl = await window.zenBridge.getServerUrl();
    if (serverUrl) {
      return '/';  // 已配置，跳转主页
    } else {
      return '/setup';  // 未配置，显示设置页
    }
  } else {
    return '/';  // 浏览器模式直接跳转主页
  }
}
```

### 11.2 首次配置流程

1. 用户启动 Electron 客户端
2. 检查 electron-store 中的 serverUrl
3. 如果没有配置 → 显示 /setup 页面
4. 用户输入服务器地址
5. 调用 `window.zenBridge.setServerUrl(url)` 保存
6. 跳转到主页

### 11.3 后续启动流程

1. 用户启动 Electron 客户端
2. 读取 electron-store 中的 serverUrl
3. 直接加载对应地址

---

## 12. 实现顺序

1. **项目脚手架**
   - 创建 `apps/electron` 目录结构
   - 配置 TypeScript 和 Electron 构建

2. **桥接 API**
   - 定义 `window.zenBridge` 类型
   - 实现 Electron preload 脚本
   - Web 端 fallback 实现

3. **服务器配置（Setup）**
   - Setup 页面组件
   - ConfigService
   - 服务器地址保存/读取

4. **认证模块**
   - 登录/注册页面
   - AuthService
   - Token 管理

5. **传输列表**
   - 获取和显示历史传输
   - 筛选功能

6. **发送功能**
   - 文件选择（Electron/Browser）
   - 文本/剪贴板发送
   - 分块上传

7. **实时功能**
   - Socket.io 连接
   - 新传输通知
   - 设备在线状态

8. **UI 优化**
   - 主题切换
   - 空状态
   - 错误处理
