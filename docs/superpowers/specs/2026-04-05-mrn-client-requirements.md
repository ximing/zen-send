# Zen Send MRN (Mobile React Native) 客户端需求文档

**Date**: 2026-04-05
**Status**: Updated
**Based on**: Zen Send 设计规范文档集
**Last Updated**: 2026-04-05 (v3 - 简化：移除设备管理页面，仅保留账号密码和扫码登录)

---

## 1. 概述

Zen Send MRN 客户端是跨平台剪贴板、文本和文件传输工具的移动端实现，支持与 Web/Electron 客户端相同的传输功能。

### 1.1 设计原则

- **广播模式**：内容发送到所有在线设备，无需选择目标
- **云端优先**：进入页面即显示云端历史文件列表
- **跨平台一致**：移动端与 Web 端共用同一套 React 代码和服务端 API
- **移动优先**：针对移动端交互习惯优化

### 1.2 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React Native (Expo) |
| 状态管理 | @rabjs/react (observer/Service 模式) |
| 实时通信 | Socket.io client |
| 文件传输 | S3 分片上传 (1MB chunks) |
| API | REST + Socket.io |

---

## 2. 功能模块

### 2.1 认证模块

**登录页（两种登录方式）：**

1. **账号密码登录**
   - 邮箱 + 密码输入
   - 登录按钮
   - 错误提示

2. **扫码登录**
   - 显示扫码入口按钮
   - 点击打开相机扫描 Web 端的登录二维码
   - 二维码包含临时登录 token，扫码后自动登录

**状态管理：**
- Token 存储在安全存储 (Expo SecureStore)
- Axios 拦截器自动附加 Token
- Token 过期时自动刷新

**说明：** 不需要注册页面，新用户通过 Web 端注册。

### 2.2 发送模块

**文件选择：**
- 调用 Expo DocumentPicker 选择文件
- 支持多选文件
- 显示选中文件列表（名称、大小）
- 支持移除单个文件
- 支持拖拽文件上传

**上传进度展示：**
每个上传中的文件显示：
- 文件名
- 进度条 + 百分比
- 上传速度（bytes/second，滚动平均计算）
- 预计剩余时间（remainingBytes / currentSpeed）
- 取消按钮（调用 DELETE /api/transfers/:id）

**文本发送：**
- 文本输入框
- 点击"发送"调用 API
- 支持回车发送

**剪贴板：**
- 读取剪贴板内容
- 自动识别内容类型（文本/文件）
- 根据内容类型走对应处理流程

**发送流程：**
1. 调用 `POST /api/transfers/init` 初始化会话
2. 如果是文本且 ≤10KB (`TEXT_INLINE_MAX_SIZE`): 直接上传 content，服务器直接存数据库 (`storageType='db'`)
3. 如果是文件或文本 >10KB: 获取 presigned upload URLs (`storageType='s3'`)
4. 文件分块（1MB）直接 PUT 到 S3 presigned URL，**支持并行上传 chunks**
5. 每个 chunk 上传后调用 `POST /api/transfers/:id/chunks` 上报 etag
6. 所有 chunk 上传完成后调用 `POST /api/transfers/:id/complete`
7. Socket.io 发送 `transfer:notify` 到所有在线设备

**错误处理：**
- 单个 chunk 失败不影响其他 chunks，重试失败的 chunk（最多 3 次）
- 如果上传时收到 403/401，客户端重新请求新的 presigned URLs
- 维护 AbortController 用于取消上传

### 2.3 接收模块

**云端文件列表：**
- 调用 `GET /api/transfers?limit=50&offset=0` 获取历史
- 按时间倒序排列
- 显示类型图标、名称、大小、相对时间
- 支持筛选（全部/文件/文本）
- 分页加载：初始加载 50 条，点击"加载更多"时 offset = currentItems.length

**搜索功能：**
- SearchModal 组件
- 按文件名搜索（模糊匹配，客户端过滤）
- 时间筛选：全部/今天/本周/本月

**下载：**
- 调用 `GET /api/transfers/:id` 获取传输详情
- 根据 `storageType` 判断处理方式：
  - `storageType='db'`：直接读取 `content` 字段（文本内容）
  - `storageType='s3'`：调用 `GET /api/transfers/:id/download` 获取 presigned 下载链接，使用 Expo FileSystem 下载到本地
- 下载完成后调用下载记录接口

**删除传输：**
- 调用 `DELETE /api/transfers/:id`
- 如果上传进行中：服务器标记为 `cancelled`，后台清理 S3 分片上传
- 如果上传已完成：服务器同步删除 S3 对象

**新传输通知：**
- Socket.io 监听 `transfer:new`
- 显示本地通知
- 实时更新列表

### 2.4 实时状态

**Socket.io 事件：**

| 事件 | 方向 | 说明 |
|------|------|------|
| `device:register` | client→server | 设备上线 |
| `device:heartbeat` | client→server | 心跳保活 |
| `transfer:notify` | client→server | 通知目标设备（不填 targetDeviceId 则广播） |
| `transfer:complete` | client→server | 传输完成 |
| `transfer:new` | server→client | 新传输通知 |
| `transfer:progress` | server→client | 传输进度 |
| `transfer:complete` | server→client | 传输完成确认 |

**说明：** 移除了 `device:list` 事件，不再需要显示设备列表。

---

## 3. 界面设计

### 3.1 页面结构

```
├── AuthNavigator (未登录)
│   └── LoginScreen
│
└── MainNavigator (已登录)
    └── HomeScreen (传输列表 + 发送区 + 底部工具栏)
```

### 3.2 HomeScreen 布局

**布局结构（参照 Bottom Toolbar 设计）：**
```
┌─────────────────────────────────┐
│  Header: Logo + Theme Toggle     │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐ │
│  │  📎 选择文件    🔍 搜索   │ │  ← BottomToolbar 图标行
│  │  ┌─────────────────┐  ➤  │ │
│  │  │ 输入文字...      │ 发送 │ │  ← 输入行
│  │  └─────────────────┘      │ │
│  └───────────────────────────┘ │
│                                 │
│  Filter: [全部] [文件] [文本]    │
│                                 │
│  ┌───────────────────────────┐ │
│  │  📎 document.pdf  2.4 MB │ │
│  │  📎 image.png    856 KB  │ │
│  │  ✏️ Hello world  Text   │ │
│  │  ...                     │ │
│  └───────────────────────────┘ │
│                                 │
│  [加载更多]                     │
│                                 │
├─────────────────────────────────┤
│  📱 Online: MacBook, iPhone     │
└─────────────────────────────────┘
```

**BottomToolbar 组件：**
- 固定在页面底部
- 图标行：文件选择 + 搜索按钮
- 输入行：文本输入框 + 发送按钮
- 支持拖拽文件上传（拖到整个消息区域）
- 拖拽时显示半透明遮罩 + "释放文件" 提示

**设备颜色（用于设备标识）：**
| 设备类型 | 颜色 | Hex |
|---------|------|-----|
| Web | 蓝色 | #3B82F6 |
| Android | 绿色 | #22C55E |
| iOS | 紫色 | #A855F7 |
| Desktop | 橙色 | #F97316 |

### 3.3 设计规范

**颜色系统** (与 Web 端一致):

Light Mode:
- `--bg-primary`: #F7F5F2 (页面背景)
- `--bg-surface`: #FFFFFF (卡片背景)
- `--accent`: #8B9A7D (Sage Green)

Dark Mode:
- `--bg-primary`: #1C1C1E
- `--bg-surface`: #242426
- `--accent`: #8B9A7D

**字体：**
- 使用系统字体
- 标题: 18-20px, Medium
- 正文: 14-16px, Regular
- 辅助文字: 12px

**间距：**
- 页面边距: 16px
- 卡片间距: 12px
- 内边距: 16px

### 3.4 组件清单

| 组件 | 说明 |
|------|------|
| Header | Logo、主题切换 |
| BottomToolbar | 底部输入工具栏（文件选择、搜索、文本输入、发送） |
| SearchModal | 搜索弹窗（按文件名搜索 + 时间筛选） |
| PreviewModal | 预览弹窗（图片预览、文本查看、文件信息） |
| FileSelector | 文件选择区 |
| SelectedFiles | 已选文件列表（含进度条、速度、ETA） |
| TransferList / TransferChat | 传输历史列表（对话式时间线） |
| TransferItem / MessageBubble | 单个传输项/消息气泡 |
| FilterTabs | 筛选标签 |
| OnlineDevices | 在线设备显示 |
| EmptyState | 空状态提示 |

---

## 4. API 接口

### 4.1 认证

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/auth/logout` | 登出 |

### 4.2 传输

**InitTransferRequest:**
```typescript
interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId: string;
  type: 'file' | 'text';  // 注意：已移除 'clipboard' 类型
  fileName?: string;
  contentType: string;
  totalSize: number;
  chunkCount?: number;
  content?: string;  // <=10KB 的文本内容
}
```

**InitTransferResponse:**
```typescript
interface InitTransferResponse {
  sessionId: string;
  presignedUrls?: string[];  // S3 分片上传 URL 列表（文件或 >10KB 文本时返回）
  chunkSize?: number;        // 分片大小（仅 S3 时返回）
}
```

**TransferSessionResponse (GET /api/transfers/:id):**
```typescript
interface TransferSessionResponse {
  id: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  items: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    storageType: 'db' | 's3';
    content?: string;        // storageType = 'db' 时返回
    downloadUrl?: string;    // storageType = 's3' 时返回，预签名 URL，24 小时有效
  }[];
}
```

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/transfers/init` | 初始化传输 |
| POST | `/api/transfers/:id/chunks` | 上报 chunk |
| POST | `/api/transfers/:id/complete` | 完成传输 |
| GET | `/api/transfers` | 获取传输列表，支持 `?type=file\|text&limit=50&offset=0` |
| GET | `/api/transfers/:id` | 获取传输详情（含 storageType 判断） |
| GET | `/api/transfers/:id/download` | 获取下载链接（仅 storageType='s3'） |
| DELETE | `/api/transfers/:id` | 删除传输 |

### 4.3 设备

| Method | Path | 说明 |
|--------|------|------|
| POST | `/api/devices` | 注册设备 |
| PATCH | `/api/devices/:id/heartbeat` | 心跳保活 |
| DELETE | `/api/devices/:id` | 解绑设备 |

**说明：** 移动端不需要设备列表查询和解绑功能。

---

## 5. 状态管理 (@rabjs/react)

### 5.1 全局 Services

| Service | 说明 | 生命周期 |
|---------|------|----------|
| AuthService | 用户认证状态、Token 管理 | 应用级 |
| ApiService | API 请求封装、拦截器 | 应用级 |
| ThemeService | 主题模式管理 | 应用级 |
| SocketService | Socket.io 连接管理 | 应用级 |

### 5.2 页面级 Services

| Service | 说明 | 绑定页面 |
|---------|------|----------|
| HomeService | 传输列表、发送逻辑 | HomeScreen |

---

## 6. 与 Web 端的差异

### 6.1 交互差异

| 功能 | Web | Mobile |
|------|-----|--------|
| 文件选择 | input[type=file] | Expo DocumentPicker |
| 文件下载 | 浏览器下载 | Expo FileSystem |
| 主题切换 | Header 按钮 | Header 下拉菜单 |
| 文本输入 | 回车发送 | 回车发送 |

### 6.2 移动端特有功能

1. **二维码扫描登录**
   - 使用 Expo Camera 扫描 Web 端的登录二维码
   - 解析 token 并完成登录

2. **本地通知**
   - 新传输到达时显示本地推送通知
   - 使用 Expo Notifications

3. **文件预览**
   - PreviewModal 组件
   - **图片**：居中显示，支持缩放（scroll/pinch）、拖拽平移，点击外部或 ESC 关闭
     - 最大预览尺寸：50MB（超过显示信息 + 下载按钮）
   - **文本文件**：内联查看器（.txt, .md, .json 等）
     - 最大预览尺寸：10MB（超过显示信息 + 下载按钮）
   - **其他类型**：显示文件信息，提供下载

4. **预览操作**
   - 预览按钮：查看文件内容
   - 下载按钮：下载文件到本地

---

## 7. 实现优先级

### Phase 1: 基础功能
1. 项目脚手架 (Expo + Navigation)
2. 认证模块 (登录/注册)
3. API 和 Socket.io 基础连接
4. 传输列表基础展示

### Phase 2: 核心功能
1. 文件选择和上传
2. 文本发送
3. 文件下载
4. 设备注册和心跳

### Phase 3: 增强功能
1. 二维码扫描登录
2. 本地通知
3. 主题切换

### Phase 4: UI/UX 优化
1. 设计规范实施
2. 加载状态和错误处理
3. 空状态设计
4. 动画和过渡

---

## 8. 依赖包

```json
{
  "dependencies": {
    "expo": "~52.x",
    "expo-secure-store": "~14.x",
    "expo-document-picker": "~13.x",
    "expo-file-system": "~18.x",
    "expo-camera": "~16.x",
    "expo-notifications": "~0.x",
    "@react-navigation/native": "^7.x",
    "@react-navigation/native-stack": "^7.x",
    "@rabjs/react": "^4.x",
    "socket.io-client": "^4.x",
    "axios": "^1.x"
  }
}
```

---

## 9. 文件结构

```
apps/mobile/
├── src/
│   ├── main.tsx                 # 应用入口
│   ├── App.tsx                 # 根组件
│   ├── navigation/
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── screens/
│   │   ├── login/
│   ├── components/
│   │   ├── header/
│   │   ├── bottom-toolbar/
│   │   ├── search-modal/
│   │   ├── preview-modal/
│   │   ├── transfer-list/
│   │   └── ...
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── api.service.ts
│   │   ├── theme.service.ts
│   │   ├── socket.service.ts
│   │   └── home.service.ts
│   ├── hooks/
│   ├── theme/
│   │   └── tokens.ts
│   └── lib/
│       └── api.ts
├── app.json
├── package.json
└── tsconfig.json
```

---

## 10. 重要说明

### 10.1 storageType 字段

服务端在 `transferItems` 表新增 `storageType` 字段：
- `'db'`: 文本内容直接存数据库（≤10KB）
- `'s3'`: 内容存 S3（文件或 >10KB 文本）

客户端必须根据此字段决定如何获取内容。

### 10.2 传输类型

**已移除 `clipboard` 类型**。剪贴板内容读取后，根据实际 MIME 类型判断是文本还是文件，走对应处理流程。

### 10.3 文档一致性

**注意**：部分旧设计文档（如 Architecture Design）可能仍包含过时的信息（如 `clipboard` 类型）。应以 **Text Storage Optimization** 和 **MRN Requirements** 文档为准。
