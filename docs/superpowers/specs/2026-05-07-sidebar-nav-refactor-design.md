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

### 组件拆分

| 组件 | 文件 | 职责 |
|------|------|------|
| `AppLayout` | `components/app-layout/index.tsx` | 统一布局容器，管理 Sidebar/Drawer 切换 |
| `Sidebar` | `components/sidebar/index.tsx` | 宽屏常驻侧边栏，渲染 NavContent |
| `NavContent` | `components/nav-content/index.tsx` | 从 Drawer 抽取的导航内容（设备管理、下载、主题、退出） |
| `Drawer` | `components/drawer/index.tsx` | 改造：内容委托给 NavContent，仅负责覆盖层动画 |
| `Header` | `components/header/index.tsx` | 改造：菜单按钮仅窄屏显示，Electron 下设为可拖拽区域 |

删除：各页面独立的 `h-screen flex flex-col` 容器定义。

不变：`BottomToolbar` 保持现有逻辑不变。

### 响应式切换逻辑

- 断点：768px（Tailwind `md`）
- 使用 `useIsWide` hook 检测屏幕宽度（基于 `window.matchMedia('(min-width: 768px)')`）
- `drawerOpen` 状态提升到 AppLayout，窄屏时 Header 菜单按钮控制
- 宽屏时不渲染 Drawer，Sidebar 始终可见
- Drawer 导航后自动关闭（保留现有行为）

### Electron 改造

`apps/electron/src/main/window.ts` 中 BrowserWindow 选项：
- 删除 `titleBarStyle: 'hidden'`
- 不添加 `frame: false`
- 恢复系统原生标题栏，红绿灯/窗口控制按钮由系统绘制
- Header 无需任何平台特殊适配

## 影响范围

- Web 布局层：AppLayout、Header、Drawer、新增 Sidebar 和 NavContent
- 各页面：移除独立的布局容器，改为被 AppLayout 包裹
- Electron 主进程：window.ts 删除一行配置
