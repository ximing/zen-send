# Zen Send Web/Electron Client Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Zen Send Web/Electron 客户端，包含认证、传输列表、文件发送、设备在线状态等功能

**Architecture:**
- Web 端使用 React 19 + Vite + @rabjs/react + Tailwind CSS v4
- Electron 桌面应用使用 vite-plugin-electron 打包，加载 Web 端页面
- 状态管理使用 Service 模式，全局 Services 通过 `register()` 注册，页面/组件级通过 `bindServices()`
- Web 和 Electron 共用同一套 React 代码，通过 `window.zenBridge` 桥接 API 做差异化处理

**Tech Stack:**
- React 19, Vite, Tailwind CSS v4, @rabjs/react
- Socket.io-client, react-router-dom
- electron, electron-builder, electron-store
- vite-plugin-electron, vite-plugin-electron-renderer

---

## Chunk 1: 项目脚手架 - Electron 基础结构

### Task 1: 创建 electron 目录结构

**Files:**
- Create: `apps/electron/src/main/index.ts`
- Create: `apps/electron/src/main/window.ts`
- Create: `apps/electron/src/main/menu.ts`
- Create: `apps/electron/src/main/tray.ts`
- Create: `apps/electron/src/preload/index.ts`
- Create: `apps/electron/vite.config.ts`
- Create: `apps/electron/package.json`
- Create: `apps/electron/tsconfig.json`
- Create: `apps/electron/electron-builder.yml`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "@zen-send/electron",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build && tsc -b",
    "typecheck": "tsc --noEmit",
    "dist": "electron-builder",
    "dist:mac": "electron-builder --mac"
  },
  "dependencies": {
    "electron-store": "^10.0.0"
  },
  "devDependencies": {
    "@zen-send/typescript-config": "workspace:*",
    "@types/node": "22.0.0",
    "electron": "^40.0.0",
    "electron-builder": "^26.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-electron": "^0.29.0",
    "vite-plugin-electron-renderer": "^0.14.0"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "extends": "@zen-send/typescript-config/node.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const DEV_SERVER_URL = isProduction ? '' : 'http://localhost:5274';

export default defineConfig({
  define: {
    'process.env.VITE_DEV_SERVER_URL': JSON.stringify(DEV_SERVER_URL),
    'process.env.VITE_IS_ELECTRON': JSON.stringify(true),
  },
  plugins: [
    electron({
      main: {
        entry: 'src/main/index.ts',
        onstart({ startup }) {
          startup();
        },
        vite: {
          build: {
            outDir: 'dist/main',
            rollupOptions: { external: ['electron'] },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          build: {
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
              output: { format: 'cjs', entryFileNames: '[name].cjs' },
            },
          },
        },
      },
    }),
    renderer(),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  appType: 'custom',
});
```

- [ ] **Step 4: 创建 electron-builder.yml**

```yaml
appId: com.zensend.app
productName: Zen Send
copyright: Copyright © 2024
directories:
  output: release
  buildResources: build
files:
  - dist/**/*
  - package.json
mac:
  target: dmg
  category: public.app-category.productivity
  icon: build/icon.png
```

- [ ] **Step 5: 创建主进程入口 src/main/index.ts**

```typescript
import { app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WindowManager } from './window';
import { TrayManager } from './tray';
import { MenuManager } from './menu';
import { logger } from '@zen-send/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || '';

let isQuitting = false;

export function getIsQuitting() { return isQuitting; }
export function setIsQuitting(value: boolean) { isQuitting = value; }

export async function initializeApp() {
  const windowManager = new WindowManager();
  const trayManager = new TrayManager(windowManager);
  const menuManager = new MenuManager(windowManager);

  menuManager.create();
  windowManager.create();

  setTimeout(() => {
    trayManager.create();
  }, 1000);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    windowManager.show();
  });

  app.on('before-quit', () => {
    setIsQuitting(true);
  });

  app.on('will-quit', () => {
    logger.close();
  });

  logger.info('Electron app initialized', { version: app.getVersion() });
}

app.whenReady().then(initializeApp);
```

- [ ] **Step 6: 创建窗口管理 src/main/window.ts**

```typescript
import { app, BrowserWindow, shell, screen } from 'electron';
import Store from 'electron-store';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@zen-send/logger';
import { PRELOAD_PATH, VITE_DEV_SERVER_URL, getIsQuitting, setIsQuitting } from './index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface WindowState {
  x: number; y: number; width: number; height: number; isMaximized: boolean;
}

const DEFAULT_STATE: WindowState = { x: 0, y: 0, width: 1200, height: 800, isMaximized: false };

const windowStore = new Store<WindowState>({ name: 'window-state', defaults: DEFAULT_STATE });

export class WindowManager {
  private window: BrowserWindow | null = null;

  getWindow() { return this.window; }

  private getIconPath() {
    return path.join(__dirname, '../../build/icon.png');
  }

  private loadSavedState() {
    const saved = windowStore.store;
    const displays = screen.getAllDisplays();
    const isValid = displays.some(d =>
      saved.x >= d.bounds.x - d.bounds.width && saved.x <= d.bounds.x + d.bounds.width &&
      saved.y >= d.bounds.y - d.bounds.height && saved.y <= d.bounds.y + d.bounds.height
    );
    return { bounds: isValid ? saved : DEFAULT_STATE, isValid };
  }

  private saveState() {
    if (!this.window) return;
    windowStore.set('isMaximized', this.window.isMaximized());
    if (!this.window.isMaximized()) {
      const b = this.window.getBounds();
      windowStore.set({ x: b.x, y: b.y, width: b.width, height: b.height });
    }
  }

  create() {
    const { bounds, isValid } = this.loadSavedState();
    const iconPath = this.getIconPath();

    this.window = new BrowserWindow({
      x: bounds.x, y: bounds.y,
      width: bounds.width || 1200, height: bounds.height || 800,
      minWidth: 800, minHeight: 600,
      show: false, title: 'Zen Send', icon: iconPath,
      webPreferences: { preload: PRELOAD_PATH, contextIsolation: true, nodeIntegration: false, sandbox: false },
    });

    if (bounds.isMaximized && isValid) this.window.maximize();

    this.window.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https:')) shell.openExternal(url);
      return { action: 'deny' };
    });

    this.window.on('will-navigate', (event) => {
      if (event.url.startsWith('file://')) event.preventDefault();
    });

    if (VITE_DEV_SERVER_URL) {
      this.window.loadURL(VITE_DEV_SERVER_URL);
    }

    this.window.once('ready-to-show', () => this.window?.show());

    this.window.on('close', (event) => {
      this.saveState();
      if (!getIsQuitting()) { event.preventDefault(); this.window?.hide(); }
    });

    logger.info('[WindowManager] Window created');
  }

  show() {
    if (!this.window) { this.create(); return; }
    if (this.window.isMinimized()) this.window.restore();
    this.window.show();
    this.window.focus();
    if (process.platform === 'darwin') { app.focus({ steal: true }); this.window.moveTop(); }
  }

  hide() { this.window?.hide(); }
  minimize() { this.window?.minimize(); }
  close() { setIsQuitting(true); app.quit(); }
}
```

- [ ] **Step 7: 创建菜单栏 src/main/menu.ts**

```typescript
import { app, Menu, BrowserWindow } from 'electron';

export class MenuManager {
  constructor(private windowManager: { getWindow: () => BrowserWindow | null }) {}

  create() {
    const template: Electron.MenuItemConstructorOptions[] = [
      { label: app.name, submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const },
      ]},
      { label: 'Edit', submenu: [
        { role: 'undo' as const }, { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const }, { role: 'copy' as const }, { role: 'paste' as const },
        { role: 'selectAll' as const },
      ]},
      { label: 'View', submenu: [
        { role: 'reload' as const }, { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const }, { role: 'zoomIn' as const }, { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ]},
      { label: 'Window', submenu: [
        { role: 'minimize' as const }, { role: 'close' as const },
        { type: 'separator' as const },
        { role: 'front' as const },
      ]},
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}
```

- [ ] **Step 8: 创建托盘 src/main/tray.ts**

```typescript
import { Tray, Menu, app, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WindowManager } from './window';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TrayManager {
  private tray: Tray | null = null;

  constructor(private windowManager: WindowManager) {}

  create() {
    const iconPath = path.join(__dirname, '../../build/icon.png');
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    this.tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Zen Send', click: () => this.windowManager.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => this.windowManager.close() },
    ]);

    this.tray.setToolTip('Zen Send');
    this.tray.setContextMenu(contextMenu);
    this.tray.on('click', () => this.windowManager.show());
  }
}
```

- [ ] **Step 9: 创建 Preload 入口 src/preload/index.ts**

```typescript
import { ipcRenderer, contextBridge, app } from 'electron';
import Store from 'electron-store';

const store = new Store<{ serverUrl: string }>({ name: 'config' });

contextBridge.exposeInMainWorld('zenBridge', {
  isElectron: true,
  platform: process.platform,
  getVersion: () => app.getVersion(),

  // 文件操作
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[]; multiple?: boolean }) =>
    ipcRenderer.invoke('dialog:openFile', options),

  saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:saveFile', options),

  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),

  writeFile: (filePath: string, data: ArrayBuffer) => ipcRenderer.invoke('fs:writeFile', filePath, data),

  // 服务器配置
  getServerUrl: () => store.get('serverUrl', ''),
  setServerUrl: (url: string) => { store.set('serverUrl', url); },
});

declare global {
  interface Window {
    zenBridge: {
      isElectron: boolean;
      platform: string;
      getVersion: () => string;
      openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[]; multiple?: boolean }) =>
        Promise<{ path: string; name: string; size: number }[] | null>;
      saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
        Promise<string | null>;
      readFile: (filePath: string) => Promise<ArrayBuffer>;
      writeFile: (filePath: string, data: ArrayBuffer) => Promise<void>;
      getServerUrl: () => string;
      setServerUrl: (url: string) => void;
    };
  }
}
```

- [ ] **Step 10: 创建占位图标**

```bash
mkdir -p apps/electron/build
# 复制现有图标或创建占位
cp apps/web/public/icon.png apps/electron/build/icon.png 2>/dev/null || echo "需要添加图标"
```

- [ ] **Step 11: Commit**

```bash
git add apps/electron/
git commit -m "feat(electron): add electron app scaffold with main process and preload"
```

---

## Chunk 2: 桥接 API 与类型定义

### Task 2: 定义 zenBridge 类型和 Web 端 fallback

**Files:**
- Create: `apps/web/src/lib/zen-bridge.ts`
- Create: `apps/web/src/lib/env.ts`
- Modify: `apps/web/src/main.tsx` - 添加全局 Services 注册

- [ ] **Step 1: 创建环境检测工具 apps/web/src/lib/env.ts**

```typescript
// 检测是否运行在 Electron 中
export const isElectron = typeof window !== 'undefined' &&
  !!(window as unknown as { zenBridge?: { isElectron?: boolean } }).zenBridge?.isElectron;

// 检测开发/生产模式
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// API 基础 URL
export const getApiBaseUrl = () => {
  if (isElectron) {
    // Electron 模式下，从桥接获取配置的服务器地址
    return (window as unknown as { zenBridge?: { getServerUrl?: () => string } }).zenBridge?.getServerUrl?.() || '';
  }
  // 浏览器模式下使用当前域名
  return window.location.origin;
};

// Socket.io URL
export const getSocketUrl = () => {
  const base = getApiBaseUrl();
  return base.replace(/^http/, 'ws');
};
```

- [ ] **Step 2: 创建 zenBridge 类型和 fallback 实现 apps/web/src/lib/zen-bridge.ts**

```typescript
// ZenBridge 接口类型
export interface ZenBridgeFile {
  path: string;
  name: string;
  size: number;
}

export interface ZenBridge {
  isElectron: boolean;
  platform?: string;
  getVersion?: () => string;

  // 文件操作
  openFileDialog?: (options?: {
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }) => Promise<ZenBridgeFile[] | null>;

  saveFileDialog?: (options?: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;

  readFile?: (path: string) => Promise<ArrayBuffer>;
  writeFile?: (path: string, data: ArrayBuffer) => Promise<void>;

  // 服务器配置（仅 Electron）
  getServerUrl?: () => string;
  setServerUrl?: (url: string) => void;
}

// 获取 zenBridge 实例
export function getZenBridge(): ZenBridge {
  if (typeof window !== 'undefined' && (window as unknown as { zenBridge?: ZenBridge }).zenBridge) {
    return (window as unknown as { zenBridge: ZenBridge }).zenBridge;
  }
  // 浏览器 fallback
  return {
    isElectron: false,
  };
}

// 判断是否支持文件对话框
export function hasFileDialogSupport(): boolean {
  const bridge = getZenBridge();
  return bridge.isElectron && typeof bridge.openFileDialog === 'function';
}

// 浏览器环境下打开文件选择器
export async function browserOpenFileDialog(options?: {
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
}): Promise<ZenBridgeFile[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options?.multiple ?? true;

    if (options?.filters?.length) {
      input.accept = options.filters.map(f => f.extensions.join(',')).join(',');
    }

    input.onchange = async () => {
      if (!input.files?.length) {
        resolve(null);
        return;
      }

      const files: ZenBridgeFile[] = [];
      for (const file of Array.from(input.files)) {
        files.push({
          name: file.name,
          size: file.size,
          path: '', // 浏览器无法获取真实路径
        });
      }
      resolve(files);
    };

    input.click();
  });
}
```

- [ ] **Step 3: 修改 main.tsx 添加路由和全局 Services 注册**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { register } from '@rabjs/react';
import App from './app';
import './index.css';

// 全局 Services
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { SocketService } from './services/socket.service';
import { ConfigService } from './services/config.service';

// 注册全局 Services
register(ApiService);
register(AuthService);
register(ThemeService);
register(SocketService);
register(ConfigService);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<App />} />
        <Route path="/register" element={<App />} />
        <Route path="/setup" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/ apps/web/src/main.tsx
git commit -m "feat(web): add zenBridge types and env detection utilities"
```

---

## Chunk 3: 全局 Services 实现

### Task 3: 创建全局 Services

**Files:**
- Create: `apps/web/src/services/api.service.ts`
- Create: `apps/web/src/services/auth.service.ts`
- Create: `apps/web/src/services/theme.service.ts`
- Create: `apps/web/src/services/socket.service.ts`
- Create: `apps/web/src/services/config.service.ts`

- [ ] **Step 1: 创建 ApiService apps/web/src/services/api.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { getApiBaseUrl } from '../lib/env';

export class ApiService extends Service {
  private baseUrl: string = '';

  constructor() {
    super();
    this.baseUrl = getApiBaseUrl();
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}
```

- [ ] **Step 2: 创建 AuthService apps/web/src/services/auth.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import type { LoginRequest, RegisterRequest, AuthTokens } from '@zen-send/shared';

const TOKEN_KEY = 'zen_send_tokens';

export class AuthService extends Service {
  accessToken: string | null = null;
  refreshToken: string | null = null;
  user: { id: string; email: string } | null = null;

  constructor() {
    super();
    this.loadTokens();
  }

  get isAuthenticated() {
    return !!this.accessToken;
  }

  private loadTokens() {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      if (stored) {
        const tokens: AuthTokens = JSON.parse(stored);
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.user = tokens.user;
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  private saveTokens(tokens: AuthTokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.user = tokens.user;
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  async login(request: LoginRequest): Promise<void> {
    const response = await this.apiService.post<{ data: AuthTokens }>('/api/auth/login', request);
    if (response.data) {
      this.saveTokens(response.data);
    }
  }

  async register(request: RegisterRequest): Promise<void> {
    const response = await this.apiService.post<{ data: AuthTokens }>('/api/auth/register', request);
    if (response.data) {
      this.saveTokens(response.data);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.apiService.post('/api/auth/logout');
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      this.accessToken = null;
      this.refreshToken = null;
      this.user = null;
    }
  }

  async refreshToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token');
    }
    const response = await this.apiService.post<{ data: AuthTokens }>('/api/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    if (response.data) {
      this.saveTokens(response.data);
    }
  }

  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) return {};
    return { Authorization: `Bearer ${this.accessToken}` };
  }
}
```

- [ ] **Step 3: 创建 ThemeService apps/web/src/services/theme.service.ts**

```typescript
import { Service } from '@rabjs/react';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'zen-send-theme';

export class ThemeService extends Service {
  mode: ThemeMode = 'system';
  resolvedTheme: 'light' | 'dark' = 'light';

  constructor() {
    super();
    this.loadMode();
    this.updateResolvedTheme();
  }

  private loadMode() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      this.mode = stored;
    }
  }

  setMode(mode: ThemeMode) {
    this.mode = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    this.updateResolvedTheme();
  }

  private updateResolvedTheme() {
    if (this.mode === 'system') {
      this.resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      this.resolvedTheme = this.mode;
    }
    this.applyTheme();
  }

  private applyTheme() {
    const root = document.documentElement;
    if (this.resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  toggleTheme() {
    this.setMode(this.resolvedTheme === 'dark' ? 'light' : 'dark');
  }
}
```

- [ ] **Step 4: 创建 SocketService apps/web/src/services/socket.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../lib/env';
import { AuthService } from './auth.service';
import type { Device } from '@zen-send/shared';

export class SocketService extends Service {
  private socket: Socket | null = null;
  isConnected = false;

  get authService() {
    return this.resolve(AuthService);
  }

  connect() {
    if (this.socket?.connected) return;

    const socketUrl = getSocketUrl();
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.registerDevice();
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.isConnected = false;
  }

  registerDevice() {
    if (!this.socket?.connected) return;
    this.socket.emit('device:register', {
      name: this.getDeviceName(),
      type: this.getDeviceType(),
    });
  }

  private getDeviceName(): string {
    // 可以从 localStorage 或配置中获取
    return 'Web Device';
  }

  private getDeviceType(): string {
    return 'web';
  }

  sendHeartbeat() {
    if (!this.socket?.connected) return;
    this.socket.emit('device:heartbeat');
  }

  onDeviceList(callback: (devices: Device[]) => void) {
    this.socket?.on('device:list', (data: { devices: Device[] }) => callback(data.devices));
  }

  onTransferNew(callback: (session: unknown) => void) {
    this.socket?.on('transfer:new', (session) => callback(session));
  }

  onTransferProgress(callback: (data: { sessionId: string; progress: number }) => void) {
    this.socket?.on('transfer:progress', callback);
  }

  onTransferComplete(callback: (data: { sessionId: string }) => void) {
    this.socket?.on('transfer:complete', callback);
  }

  emitTransferComplete(sessionId: string) {
    this.socket?.emit('transfer:complete', { sessionId });
  }

  removeAllListeners() {
    this.socket?.removeAllListeners('device:list');
    this.socket?.removeAllListeners('transfer:new');
    this.socket?.removeAllListeners('transfer:progress');
    this.socket?.removeAllListeners('transfer:complete');
  }
}
```

- [ ] **Step 5: 创建 ConfigService apps/web/src/services/config.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { getZenBridge } from '../lib/zen-bridge';
import { isElectron } from '../lib/env';

export class ConfigService extends Service {
  serverUrl: string = '';
  isConfigured = false;

  constructor() {
    super();
    if (isElectron) {
      const bridge = getZenBridge();
      this.serverUrl = bridge.getServerUrl?.() || '';
      this.isConfigured = !!this.serverUrl;
    } else {
      // 浏览器模式下默认开发服务器
      this.serverUrl = 'http://localhost:5274';
      this.isConfigured = true;
    }
  }

  async loadServerUrl(): Promise<string> {
    if (!isElectron) {
      this.serverUrl = window.location.origin;
      return this.serverUrl;
    }

    const bridge = getZenBridge();
    this.serverUrl = bridge.getServerUrl?.() || '';
    this.isConfigured = !!this.serverUrl;
    return this.serverUrl;
  }

  async saveServerUrl(url: string): Promise<void> {
    if (!isElectron) return;

    const bridge = getZenBridge();
    bridge.setServerUrl?.(url);
    this.serverUrl = url;
    this.isConfigured = true;
  }

  getDefaultDevUrl(): string {
    return 'http://localhost:5274';
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/services/
git commit -m "feat(web): add global services - ApiService, AuthService, ThemeService, SocketService, ConfigService"
```

---

## Chunk 4: Setup 页面

### Task 4: 创建 Setup 页面组件

**Files:**
- Create: `apps/web/src/pages/setup/index.tsx`
- Create: `apps/web/src/pages/setup/setup.service.ts`

- [ ] **Step 1: 创建 SetupService apps/web/src/pages/setup/setup.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { ConfigService } from '../../services/config.service';
import { isElectron } from '../../lib/env';

export class SetupService extends Service {
  serverUrl: string = '';
  isLoading = false;
  error: string | null = null;

  get configService() {
    return this.resolve(ConfigService);
  }

  constructor() {
    super();
    if (!isElectron) {
      // 浏览器模式下不显示 setup
      this.serverUrl = '';
    }
  }

  async init() {
    if (!isElectron) return;
    this.isLoading = true;
    try {
      this.serverUrl = await this.configService.loadServerUrl();
      if (!this.serverUrl) {
        this.serverUrl = this.configService.getDefaultDevUrl();
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load config';
    } finally {
      this.isLoading = false;
    }
  }

  async saveAndConnect(): Promise<boolean> {
    if (!this.serverUrl.trim()) {
      this.error = 'Please enter a server address';
      return false;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.configService.saveServerUrl(this.serverUrl.trim());
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to save config';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}
```

- [ ] **Step 2: 创建 Setup 页面 apps/web/src/pages/setup/index.tsx**

```typescript
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { SetupService } from './setup.service';
import { isElectron } from '../../lib/env';

const SetupContent = observer(() => {
  const service = useService(SetupService);
  const navigate = useNavigate();

  // 浏览器模式下重定向到主页
  if (!isElectron) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await service.saveAndConnect();
    if (success) {
      navigate('/');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Zen Send</h1>
          <p className="text-text-secondary">Welcome! Please enter your server address</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="url"
              value={service.serverUrl}
              onChange={(e) => { service.serverUrl = e.target.value; }}
              placeholder="https://zensend.aimo.plus"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {service.error && (
            <p className="text-error text-sm">{service.error}</p>
          )}

          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full py-3 bg-primary text-on-primary rounded-lg font-medium
                       hover:bg-primary-hover transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>

        <p className="text-center text-text-muted text-sm mt-6">
          Contact your administrator for the server address
        </p>
      </div>
    </div>
  );
});

export default bindServices(SetupContent, [SetupService]);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/setup/
git commit -m "feat(web): add setup page for server configuration"
```

---

## Chunk 5: 认证页面

### Task 5: 创建登录和注册页面

**Files:**
- Create: `apps/web/src/pages/login/index.tsx`
- Create: `apps/web/src/pages/login/login.service.ts`
- Create: `apps/web/src/pages/register/index.tsx`
- Create: `apps/web/src/pages/register/register.service.ts`

- [ ] **Step 1: 创建 LoginService apps/web/src/pages/login/login.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';

export class LoginService extends Service {
  email = '';
  password = '';
  isLoading = false;
  error: string | null = null;

  get authService() {
    return this.resolve(AuthService);
  }

  async login(): Promise<boolean> {
    if (!this.email || !this.password) {
      this.error = 'Please fill in all fields';
      return false;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.authService.login({
        email: this.email,
        password: this.password,
      });
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Login failed';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}
```

- [ ] **Step 2: 创建登录页面 apps/web/src/pages/login/index.tsx**

```typescript
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginService } from './login.service';

const LoginContent = observer(() => {
  const service = useService(LoginService);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await service.login();
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Zen Send</h1>
          <p className="text-text-secondary">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={service.email}
              onChange={(e) => { service.email = e.target.value; }}
              placeholder="Email"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={service.password}
              onChange={(e) => { service.password = e.target.value; }}
              placeholder="Password"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {service.error && (
            <p className="text-error text-sm">{service.error}</p>
          )}

          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full py-3 bg-primary text-on-primary rounded-lg font-medium
                       hover:bg-primary-hover transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          No account?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(LoginContent, [LoginService]);
```

- [ ] **Step 3: 创建 RegisterService apps/web/src/pages/register/register.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';

export class RegisterService extends Service {
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  error: string | null = null;

  get authService() {
    return this.resolve(AuthService);
  }

  async register(): Promise<boolean> {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.error = 'Please fill in all fields';
      return false;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return false;
    }

    if (this.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return false;
    }

    this.isLoading = true;
    this.error = null;

    try {
      await this.authService.register({
        email: this.email,
        password: this.password,
      });
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Registration failed';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}
```

- [ ] **Step 4: 创建注册页面 apps/web/src/pages/register/index.tsx**

```typescript
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterService } from './register.service';

const RegisterContent = observer(() => {
  const service = useService(RegisterService);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await service.register();
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Zen Send</h1>
          <p className="text-text-secondary">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={service.email}
              onChange={(e) => { service.email = e.target.value; }}
              placeholder="Email"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={service.password}
              onChange={(e) => { service.password = e.target.value; }}
              placeholder="Password"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          <div>
            <input
              type="password"
              value={service.confirmPassword}
              onChange={(e) => { service.confirmPassword = e.target.value; }}
              placeholder="Confirm password"
              className="w-full px-4 py-3 bg-surface border border-border-default rounded-lg
                         text-text-primary placeholder-text-muted
                         focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {service.error && (
            <p className="text-error text-sm">{service.error}</p>
          )}

          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full py-3 bg-primary text-on-primary rounded-lg font-medium
                       hover:bg-primary-hover transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p className="text-center text-text-secondary text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(RegisterContent, [RegisterService]);
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/login/ apps/web/src/pages/register/
git commit -m "feat(web): add login and register pages"
```

---

## Chunk 6: 主页基础布局和组件

### Task 6: 创建主页基础结构

**Files:**
- Create: `apps/web/src/pages/home/index.tsx`
- Create: `apps/web/src/pages/home/home.service.ts`
- Create: `apps/web/src/components/header/index.tsx`
- Create: `apps/web/src/components/header/header.service.ts`
- Create: `apps/web/src/components/toast/index.tsx`
- Create: `apps/web/src/components/toast/toast.service.ts`

- [ ] **Step 1: 创建 HomeService apps/web/src/pages/home/home.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text' | 'clipboard';

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  selectedFiles: { name: string; size: number; data?: ArrayBuffer }[] = [];
  filter: TransferFilter = 'all';
  isLoading = false;
  error: string | null = null;

  get authService() {
    return this.resolve(AuthService);
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  get filteredTransfers() {
    if (this.filter === 'all') return this.transfers;
    return this.transfers.filter(t =>
      t.items?.some(item => item.type === this.filter)
    );
  }

  async loadTransfers() {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await this.apiService.get<{ data: { transfers: TransferSession[] } }>(
        '/api/transfers'
      );
      this.transfers = response.data?.transfers || [];
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load transfers';
    } finally {
      this.isLoading = false;
    }
  }

  setFilter(filter: TransferFilter) {
    this.filter = filter;
  }

  addFiles(files: { name: string; size: number; data?: ArrayBuffer }[]) {
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  clearFiles() {
    this.selectedFiles = [];
  }

  async logout() {
    await this.authService.logout();
  }
}
```

- [ ] **Step 2: 创建 HeaderService apps/web/src/components/header/header.service.ts**

```typescript
import { Service } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

export class HeaderService extends Service {
  get themeService() {
    return this.resolve(ThemeService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get themeIcon() {
    return this.themeService.resolvedTheme === 'dark' ? '☀️' : '🌙';
  }

  get userEmail() {
    return this.authService.user?.email || '';
  }

  async logout() {
    await this.authService.logout();
  }
}
```

- [ ] **Step 3: 创建 Header 组件 apps/web/src/components/header/index.tsx**

```typescript
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HeaderService } from './header.service';

const HeaderContent = observer(() => {
  const service = useService(HeaderService);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await service.logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between px-5 py-4 bg-surface border-b border-border-default">
      <h1 className="text-xl font-semibold text-text-primary">Zen Send</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={() => service.toggleTheme()}
          className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
          title="Toggle theme"
        >
          {service.themeIcon}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">{service.userEmail}</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-bg-elevated hover:bg-border-default
                       rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
});

export default bindServices(HeaderContent, [HeaderService]);
```

- [ ] **Step 4: 创建 ToastService apps/web/src/components/toast/toast.service.ts**

```typescript
import { Service } from '@rabjs/react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export class ToastService extends Service {
  toasts: ToastMessage[] = [];

  show(message: string, type: ToastMessage['type'] = 'info') {
    const id = Date.now().toString();
    this.toasts = [...this.toasts, { id, type, message }];

    setTimeout(() => {
      this.dismiss(id);
    }, 5000);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
```

- [ ] **Step 5: 创建 Toast 组件 apps/web/src/components/toast/index.tsx**

```typescript
import { observer, useService, bindServices } from '@rabjs/react';
import { ToastService } from './toast.service';

const ToastContent = observer(() => {
  const service = useService(ToastService);

  if (service.toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {service.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg min-w-[250px] max-w-md
            ${toast.type === 'success' ? 'bg-success text-white' : ''}
            ${toast.type === 'error' ? 'bg-error text-white' : ''}
            ${toast.type === 'info' ? 'bg-info text-white' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => service.dismiss(toast.id)}
              className="ml-2 opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});

export default bindServices(ToastContent, [ToastService]);
```

- [ ] **Step 6: 创建主页页面 apps/web/src/pages/home/index.tsx**

```typescript
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService, type TransferFilter } from './home.service';
import { AuthService } from '../../services/auth.service';
import { isElectron } from '../../lib/env';
import Header from '../../components/header';
import Toast from '../../components/toast';

const HomeContent = observer(() => {
  const service = useService(HomeService);
  const authService = useService(AuthService);
  const navigate = useNavigate();

  // 未登录则跳转登录页
  if (!authService.isAuthenticated) {
    navigate('/login');
    return null;
  }

  const filters: { label: string; value: TransferFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Files', value: 'file' },
    { label: 'Text', value: 'text' },
    { label: 'Clipboard', value: 'clipboard' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <Header />

      <main className="max-w-4xl mx-auto p-5">
        {/* 发送工具栏 */}
        <div className="flex gap-3 mb-6">
          <button className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-medium
                           hover:bg-primary-hover transition-colors">
            📎 Select File
          </button>
          <button className="flex-1 py-3 bg-surface border border-border-default text-text-primary
                           rounded-lg font-medium hover:bg-bg-elevated transition-colors">
            ✏️ Enter Text
          </button>
          <button className="flex-1 py-3 bg-surface border border-border-default text-text-primary
                           rounded-lg font-medium hover:bg-bg-elevated transition-colors">
            📋 Clipboard
          </button>
        </div>

        {/* 筛选标签 */}
        <div className="flex gap-2 mb-4">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => service.setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${service.filter === f.value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface border border-border-default text-text-secondary hover:bg-bg-elevated'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 传输列表 */}
        <div className="space-y-3">
          {service.isLoading ? (
            <p className="text-text-muted text-center py-8">Loading...</p>
          ) : service.filteredTransfers.length === 0 ? (
            <p className="text-text-muted text-center py-8">No transfers yet</p>
          ) : (
            service.filteredTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="p-4 bg-surface border border-border-default rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-text-primary">
                      {transfer.items?.[0]?.name || transfer.originalFileName}
                    </span>
                    <span className="ml-2 text-sm text-text-muted">
                      {formatSize(transfer.totalSize)}
                    </span>
                  </div>
                  <span className="text-sm text-text-muted">
                    {formatTime(transfer.createdAt)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 在线设备 */}
        <div className="mt-8 p-4 bg-surface border border-border-default rounded-lg">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            📱 Online Devices
          </h3>
          <p className="text-text-muted text-sm">No devices online</p>
        </div>
      </main>

      <Toast />
    </div>
  );
});

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default bindServices(HomeContent, [HomeService]);
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/home/ apps/web/src/components/header/ apps/web/src/components/toast/
git commit -m "feat(web): add home page with basic layout, header, toast components"
```

---

## Chunk 7: App 路由整合

### Task 7: 更新 App 组件整合路由

**Files:**
- Modify: `apps/web/src/app.tsx`

- [ ] **Step 1: 更新 App.tsx**

```typescript
import { observer } from '@rabjs/react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup" element={<SetupPage />} />
    </Routes>
  );
}

export default observer(App);
```

- [ ] **Step 2: 更新 main.tsx 移除重复的路由**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { register } from '@rabjs/react';
import App from './app';
import './index.css';

// 全局 Services
import { ApiService } from './services/api.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { SocketService } from './services/socket.service';
import { ConfigService } from './services/config.service';

register(ApiService);
register(AuthService);
register(ThemeService);
register(SocketService);
register(ConfigService);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app.tsx apps/web/src/main.tsx
git commit -m "refactor(web): integrate routing in App component"
```

---

## Chunk 8: 安装依赖

### Task 8: 安装必要的依赖

- [ ] **Step 1: 添加 package.json 依赖**

在 `apps/web/package.json` 添加：

```json
{
  "dependencies": {
    "react-router-dom": "^7.0.0",
    "@rabjs/react": "^4.0.0",
    "socket.io-client": "^4.7.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd apps/web && pnpm install
cd apps/electron && pnpm install
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json
git commit -m "chore: add routing and socket.io dependencies"
```

---

## 实现顺序说明

1. **Chunk 1**: Electron 脚手架 - 创建主进程、窗口管理、预加载脚本
2. **Chunk 2**: 桥接 API - zenBridge 类型定义和浏览器 fallback
3. **Chunk 3**: 全局 Services - ApiService, AuthService, ThemeService, SocketService, ConfigService
4. **Chunk 4**: Setup 页面 - 服务器配置
5. **Chunk 5**: 认证页面 - 登录、注册
6. **Chunk 6**: 主页布局 - Header, Toast, 基础页面结构
7. **Chunk 7**: 路由整合 - App 组件
8. **Chunk 8**: 依赖安装

后续还有：
- 发送功能（文件选择、文本/剪贴板）
- 传输列表完善
- 实时功能（Socket.io 事件）
- Electron 端完整 IPC 处理

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-04-zen-send-web-client-implementation.md`. Ready to execute?**
