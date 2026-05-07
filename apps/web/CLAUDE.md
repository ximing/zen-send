# Web App - Claude Code 指南

## 核心规则（不可违背）

### 1. Service 注册规则

| 类型 | 注册方式 | 位置 |
|------|---------|------|
| 全局 Service | `register()` | `main.tsx` |
| 页面级 Service | `bindServices()` | 组件导出处 |

```typescript
// ✅ 全局 Service - main.tsx
register(ApiService);
register(HomeService);
register(ToastService);

// ✅ 页面 Service - 组件导出
export default bindServices(LoginContent, [LoginService]);
```

**注意**：`HomeService` 是全局 Service，在 `main.tsx` 中注册，因为 Search/Downloads 等多个页面需要访问它。

### 2. 响应式规则

组件必须用 `observer` 包裹才能响应状态变化：

```typescript
// ✅ 正确
const Component = observer(() => {
  return <div>{service.count}</div>;
});

// ❌ 错误：忘记 observer，不会响应变化
const Component = () => {
  return <div>{service.count}</div>;
}
```

### 3. 不可解构 Observable

```typescript
// ❌ 错误：解构破坏响应式
const { count } = service;

// ✅ 正确：直接访问
service.count;
```

### 4. resolve() 必须用 Getter

```typescript
// ❌ 错误：直接赋值
private apiService = this.resolve(ApiService);

// ✅ 正确：getter 延迟解析
get apiService() {
  return this.resolve(ApiService);
}
```

### 5. Service 访问模式

全局 Service 通过 `useService()` 直接访问，`resolve()` 获取其他 Service：

```typescript
// 组件中使用全局 Service
const homeService = useService(HomeService);
const apiService = useService(ApiService);

// Service 中通过 resolve 访问其他 Service
export class HomeService extends Service {
  get apiService() {
    return this.resolve(ApiService);
  }
}
```

### 6. API 类型定义

`ApiService` 已自动提取 `data` 包装层，类型写真实结构：

```typescript
// ✅ 正确：类型是真实数据结构
const { transfers } = await this.apiService.get<{ transfers: TransferSession[] }>('/api/transfers');

// ❌ 错误：类型包含 data 包装（已由 ApiService 处理）
const { transfers } = await this.apiService.get<{ data: { transfers: [...] } }>(...);
```

## Web-Specific

- **Tailwind CSS v4**: Uses `@tailwindcss/postcss` plugin with PostCSS
- **Theme Tokens**: Design tokens in `src/theme/tokens.ts` are applied as CSS variables on `:root`
- **Dark Mode**: Controlled via `dark` class on `<html>` element
- **@rabjs/react**: Service-based state management using observer/view patterns with dependency injection
- **Web build output**: `apps/server/public/` (served by Express in production)
- **Layout**: Header + Drawer 模式（对齐 Mobile），非 Sidebar

## 目录结构

```
src/
├── services/              # 全局 Service（register() in main.tsx）
├── pages/                 # 页面 + 页面级 Service
│   ├── home/              # 首页（HomeService 全局注册）
│   ├── login/             # 登录页
│   ├── register/          # 注册页
│   ├── search/            # 搜索页
│   ├── downloads/         # 下载页
│   ├── devices/           # 设备管理页
│   ├── settings/          # 设置页
│   └── setup/             # Electron 配置页
└── components/            # 通用组件
    ├── header/            # 顶部导航栏（菜单 + Logo + 搜索）
    ├── drawer/            # 侧边抽屉（用户信息 + 操作）
    ├── filter-tabs/       # ALL/FILES/TEXT 过滤标签
    ├── transfer-list/     # 传输列表
    ├── transfer-item/     # 传输项卡片
    ├── selected-files/    # 上传进度卡片
    ├── bottom-toolbar/    # 底部工具栏
    ├── preview-modal/     # 预览弹窗
    └── toast/             # 通知提示
```

## 页面布局模式

所有已认证页面使用统一的 Header 布局：

```
┌─────────────────────────────┐
│ Header (56px)               │  ← 菜单 + ZEN_SEND + 搜索
├─────────────────────────────┤
│ Content                     │
│                             │
│                             │
│                             │
├─────────────────────────────┤
│ Bottom Toolbar (首页)       │  ← 文件选择 + 文字输入
└─────────────────────────────┘
```

子页面（Search、Downloads、Devices、Settings）使用返回按钮替代菜单按钮。

## Design System

**设计方向**: Editorial Minimal with Sage Accent — 克制、小众先锋、温暖编辑感、大量留白

- **大量留白** — 呼吸感优先
- **黑白灰** — 承担 95% 视觉重量
- **点缀色** — 仅在 5% 关键位置出现（Sage Green）
- **无边框** — 用背景色差代替边框
- **无渐变** — 除非必要

### 颜色

**Accent - Sage Green**: `#8B9A7D`

| 用途 | 颜色 |
|------|------|
| 背景 | `#F7F5F2` (暖灰) / `#FFFFFF` |
| 文字主色 | `#2C2C2C` |
| 文字次色 | `#9A958F` |
| 文字弱色 | `#B5AFA8` |
| 边框默认 | `#DDD8D0` |
| 边框弱色 | `#EDEBE7` |
| 点缀色 | `#8B9A7D` |
| 点缀色软 | `#8B9A7D20` (12% 透明度) |

### 图标

使用 `lucide-react` 图标库，与 Mobile 的 Ionicons 保持视觉一致：

| Mobile (Ionicons) | Web (lucide-react) |
|-------------------|-------------------|
| menu | Menu |
| search | Search |
| chevron-back | ChevronLeft |
| folder-outline | FolderOpen |
| image-outline | Image |
| clipboard-outline | Clipboard |
| send | ArrowUp / Send |
| create-outline | PenLine |
| document-outline | FileText |
| copy-outline | Copy |
| download-outline | Download |
| link-outline | Link |
| trash-outline | Trash2 |
