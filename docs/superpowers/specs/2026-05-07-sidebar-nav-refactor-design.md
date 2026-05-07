# Sidebar & Electron Nav Refactor Design

## 背景

Web 端当前是 Header + Drawer 模式（移动端优先），无宽屏响应式处理。Electron 端使用 `titleBarStyle: 'hidden'`，macOS 原生红绿灯按钮覆盖在 Header 左侧，与菜单汉堡按钮冲突。

## 目标

1. Web 宽屏（>=768px）下侧边栏常驻，窄屏保留 Drawer 覆盖模式
2. Electron 恢复原生标题栏，消除红绿灯与 Header 的冲突
3. 统一页面布局，各页面不再独立定义布局容器

## 架构

### 布局结构

宽屏 (>=768px):
```
┌──────────┬───────────────────────────────┐
│ Sidebar  │  Header                       │
│ (常驻)   ├───────────────────────────────┤
│          │                               │
│          │  Page Content                 │
│          │                               │
│          ├───────────────────────────────┤
│          │  Bottom Toolbar (首页)         │
└──────────┴───────────────────────────────┘
```

窄屏 (<768px):
```
┌───────────────────────────────────────┐
│ Header (菜单按钮触发 Drawer)           │
├───────────────────────────────────────┤
│                                       │
│  Page Content                         │
│                                       │
├───────────────────────────────────────┤
│ Bottom Toolbar (首页)                  │
└───────────────────────────────────────┘
+ Drawer 覆盖层（点击菜单打开）
```

### 路由与 AppLayout 包裹

AppLayout 仅包裹已认证路由。Auth 路由（/login、/register、/setup）不使用 AppLayout，保持独立的居中布局。

```
<Router>
  <Route path="/login" element={<Login />} />      <!-- 无 AppLayout -->
  <Route path="/register" element={<Register />} /> <!-- 无 AppLayout -->
  <Route path="/setup" element={<Setup />} />       <!-- 无 AppLayout -->
  <Route element={<AppLayout />}>                   <!-- 已认证路由 -->
    <Route path="/" element={<Home />} />
    <Route path="/devices" element={<Devices />} />
    <Route path="/downloads" element={<Downloads />} />
    <Route path="/search" element={<Search />} />
    <Route path="/settings" element={<Settings />} />
  </Route>
</Router>
```

### 组件拆分

| 组件 | 文件 | 职责 |
|------|------|------|
| `AppLayout` | `components/app-layout/index.tsx` | 统一布局容器，管理 Sidebar/Drawer 切换 |
| `Sidebar` | `components/sidebar/index.tsx` | 宽屏常驻侧边栏，渲染 NavContent |
| `NavContent` | `components/nav-content/index.tsx` | 从 Drawer 抽取的导航内容 |
| `Drawer` | `components/drawer/index.tsx` | 改造：内容委托给 NavContent，仅负责覆盖层动画 |
| `Header` | `components/header/index.tsx` | 改造：菜单按钮仅窄屏显示 |

删除：各页面独立的 `h-screen flex flex-col` 容器定义。

不变：`BottomToolbar` 保持现有逻辑不变。

### 组件接口

**AppLayout**:
```typescript
function AppLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // drawerOpen 状态传递给 Drawer 和 Header
}
```

**NavContent**:
```typescript
interface NavContentProps {
  onNavigate?: () => void; // 导航后回调，Drawer 用来关闭自身，Sidebar 不传或传 no-op
}
```

**Header** 改造为可选菜单按钮：
```typescript
interface HeaderProps {
  onMenuPress?: () => void;   // 窄屏时传入，宽屏时不传
  onSearchPress: () => void;
}
```

### Sidebar 规格

- 宽度：`w-[240px]`，比 Drawer 的 280px 略窄，适配 768px 断点（768 - 240 = 528px 主内容区）
- 导航项：首页、设备管理、下载（相比 Drawer 新增首页入口）
- 活跃路由指示：当前页面的导航项使用 `bg-[var(--bg-surface-hover)]` + 左侧 3px accent 色竖线高亮
- 用户头像和信息保留在 Sidebar 顶部
- 主题切换和退出保留在 Sidebar 底部

### 子页面标题栏

宽屏下子页面仍保留标题栏（返回按钮 + 页面标题）。返回按钮在宽屏下依然可用，因为 Sidebar 不覆盖所有导航场景（用户习惯返回按钮回到首页）。

### 响应式切换逻辑

- 断点：768px（Tailwind `md`）
- 使用 `useIsWide` hook（基于 `useSyncExternalStore` + `window.matchMedia`）
- `drawerOpen` 状态提升到 AppLayout，窄屏时 Header 菜单按钮控制
- 宽屏时不渲染 Drawer，Sidebar 始终可见
- Drawer 导航后自动关闭（保留现有行为）
- 窗口跨断点缩放时：若 Drawer 正在打开且视口变宽超过 768px，强制关闭 Drawer 并显示 Sidebar。Sidebar 出现时无动画（结构元素，非覆盖层）

### 拖拽上传

拖拽上传逻辑保留在 HomePage 组件内，不提升到 AppLayout。拖拽覆盖层的 `fixed inset-0` 改为仅在主内容区内显示（需考虑 Sidebar 偏移）。

### Toast 和 Modal 定位

Toast 和 PreviewModal 使用 `fixed` 定位覆盖整个视口，包含 Sidebar 区域。这是标准行为，不做特殊处理。

### Electron 改造

`apps/electron/src/main/window.ts` 中 BrowserWindow 选项：
- 删除 `titleBarStyle: 'hidden'`
- 不添加 `frame: false`
- 保持 `minWidth: 460`，Electron 窗口缩小时也支持 Drawer 模式
- 恢复系统原生标题栏，红绿灯/窗口控制按钮由系统绘制
- Header 无需任何平台特殊适配
- Electron 内容视口高度会因原生标题栏减少约 28-38px，`100vh` 在 Electron 中已自动适配为内容区域高度，无需额外调整

## 影响范围

- Web 布局层：AppLayout、Header、Drawer、新增 Sidebar 和 NavContent
- 各页面：移除独立的布局容器，改为被 AppLayout 包裹
- 路由：app.tsx 重构为嵌套路由，AppLayout 包裹已认证路由
- Electron 主进程：window.ts 删除 `titleBarStyle: 'hidden'`
