# Sidebar & Electron Nav Refactor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent sidebar on wide screens (>=768px) while keeping Drawer on narrow screens, and restore native title bar on Electron to fix traffic light overlap.

**Architecture:** Create a shared `AppLayout` component that renders `Sidebar` on wide screens and `Drawer` on narrow screens, using a `useIsWide` hook for responsive detection. Extract navigation content into `NavContent` shared between Sidebar and Drawer. Restructure routes to nest authenticated pages under AppLayout. Remove `titleBarStyle: 'hidden'` from Electron BrowserWindow config.

**Tech Stack:** React 19, React Router v6, Tailwind CSS v4, @rabjs/react (observer/useService), useSyncExternalStore

**Spec:** `docs/superpowers/specs/2026-05-07-sidebar-nav-refactor-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `apps/web/src/hooks/use-is-wide.ts` | Responsive breakpoint hook |
| Create | `apps/web/src/components/nav-content/index.tsx` | Shared navigation content (extracted from Drawer) |
| Create | `apps/web/src/components/sidebar/index.tsx` | Persistent sidebar for wide screens |
| Create | `apps/web/src/components/app-layout/index.tsx` | Unified layout container |
| Modify | `apps/web/src/components/drawer/index.tsx` | Delegate content to NavContent |
| Modify | `apps/web/src/components/header/index.tsx` | Optional menu button, search button |
| Modify | `apps/web/src/app.tsx` | Nested routes with AppLayout |
| Modify | `apps/web/src/pages/home/index.tsx` | Remove layout container, Drawer state |
| Modify | `apps/web/src/pages/devices/index.tsx` | Remove layout container |
| Modify | `apps/web/src/pages/downloads/index.tsx` | Remove layout container |
| Modify | `apps/web/src/pages/search/index.tsx` | Remove layout container |
| Modify | `apps/web/src/pages/settings/index.tsx` | Remove layout container |
| Modify | `apps/electron/src/main/window.ts` | Remove titleBarStyle: 'hidden' |

---

## Chunk 1: Foundation (useIsWide hook + NavContent extraction)

### Task 1: Create useIsWide hook

**Files:**
- Create: `apps/web/src/hooks/use-is-wide.ts`

- [ ] **Step 1: Create the useIsWide hook**

```typescript
import { useSyncExternalStore } from 'react';

const QUERY = '(min-width: 768px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useIsWide(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-is-wide.ts
git commit -m "feat(web): add useIsWide responsive breakpoint hook"
```

### Task 2: Extract NavContent from Drawer

**Files:**
- Create: `apps/web/src/components/nav-content/index.tsx`
- Modify: `apps/web/src/components/drawer/index.tsx`

- [ ] **Step 1: Create NavContent component**

Extract the `DrawerContent` from `apps/web/src/components/drawer/index.tsx` (lines 13-100) into a new `NavContent` component. Changes from original DrawerContent:
- Rename `onClose` to `onNavigate` (semantics: called after navigation, Drawer uses it to close itself)
- Add Home navigation item (new) with `Home` icon from lucide-react
- Add `isActive` prop to highlight current route (for Sidebar use)
- Use `useLocation` from react-router-dom to determine active route
- Remove `pt-[60px]` top padding (that was Drawer-specific for traffic light clearance)

```typescript
import React from 'react';
import { observer, useService } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Download, Sun, Moon, LogOut, Smartphone } from 'lucide-react';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

interface NavContentProps {
  onNavigate?: () => void;
}

function NavContentInner({ onNavigate }: NavContentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);

  const handleThemeToggle = () => {
    themeService.toggleTheme();
    onNavigate?.();
  };

  const handleLogout = async () => {
    await authService.logout();
    onNavigate?.();
    navigate('/login');
  };

  const handleDownloads = () => {
    navigate('/downloads');
    onNavigate?.();
  };

  const handleDevices = () => {
    navigate('/devices');
    onNavigate?.();
  };

  const handleHome = () => {
    navigate('/');
    onNavigate?.();
  };

  const user = authService.user;
  const serverUrl = window.location.origin;

  const navItems = [
    { path: '/', label: '首页', icon: Home, onClick: handleHome },
    { path: '/devices', label: '设备管理', icon: Smartphone, onClick: handleDevices },
    { path: '/downloads', label: '下载', icon: Download, onClick: handleDownloads },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* User Info Section */}
      <div className="flex flex-col items-center pb-6 border-b border-[var(--border-subtle)] mb-4 pt-5 px-5">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-3">
          <span className="text-2xl font-semibold text-[var(--accent)]">
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </span>
        </div>
        <span className="text-lg font-semibold text-[var(--text-primary)]">
          {user?.email?.split('@')[0] ?? 'User'}
        </span>
        <span className="text-sm text-[var(--text-secondary)]">{user?.email ?? ''}</span>
        <span className="text-xs text-[var(--text-muted)]">{serverUrl}</span>
      </div>

      {/* Navigation Items */}
      <div className="pt-2 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 py-3.5 px-3 rounded-lg transition-colors relative
                ${isActive
                  ? 'bg-[var(--bg-surface-hover)] text-[var(--accent)]'
                  : 'hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-[var(--accent)]" />
              )}
              <Icon size={20} />
              <span className="text-base">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto px-3 pb-4">
        <button
          onClick={handleThemeToggle}
          className="w-full flex items-center gap-3 py-3.5 px-3 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          {themeService.resolvedTheme === 'dark' ? (
            <Sun size={20} className="text-[var(--text-primary)]" />
          ) : (
            <Moon size={20} className="text-[var(--text-primary)]" />
          )}
          <span className="text-base text-[var(--text-primary)]">
            {themeService.resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-3.5 px-3 hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <LogOut size={20} className="text-[var(--text-primary)]" />
          <span className="text-base text-[var(--text-primary)]">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default observer(NavContentInner);
```

- [ ] **Step 2: Refactor Drawer to use NavContent**

Modify `apps/web/src/components/drawer/index.tsx`:
- Remove the `DrawerContent` component (lines 13-100)
- Import `NavContent` from `../nav-content`
- Replace `<DrawerContent onClose={onClose} />` with `<NavContent onNavigate={onClose} />`
- Keep the overlay/panel structure unchanged

The refactored file:

```typescript
import React from 'react';
import { observer } from '@rabjs/react';
import NavContent from '../nav-content';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function DrawerInner({ isOpen, onClose }: DrawerProps) {
  return (
    <div
      className={`fixed inset-0 z-50 transition-colors duration-[250ms]
        ${isOpen ? 'visible' : 'invisible'}`}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-[250ms]
          ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[280px] bg-[var(--bg-surface)]
          transition-transform duration-[250ms] ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <NavContent onNavigate={onClose} />
      </div>
    </div>
  );
}

export default observer(DrawerInner);
```

- [ ] **Step 3: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS

- [ ] **Step 4: Verify dev server renders correctly**

Run: `pnpm dev:web` and verify Drawer still works (opens/closes, navigation, theme toggle, logout).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/nav-content/index.tsx apps/web/src/components/drawer/index.tsx
git commit -m "refactor(web): extract NavContent from Drawer for sidebar reuse"
```

---

## Chunk 2: Sidebar + AppLayout + Header refactor

### Task 3: Create Sidebar component

**Files:**
- Create: `apps/web/src/components/sidebar/index.tsx`

- [ ] **Step 1: Create Sidebar component**

The Sidebar renders NavContent in a persistent vertical panel for wide screens.

```typescript
import React from 'react';
import { observer } from '@rabjs/react';
import NavContent from '../nav-content';

function SidebarInner() {
  return (
    <aside className="w-[240px] shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col h-full">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <NavContent />
      </div>
    </aside>
  );
}

export default observer(SidebarInner);
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sidebar/index.tsx
git commit -m "feat(web): add Sidebar component for wide-screen layout"
```

### Task 4: Refactor Header for optional menu button

**Files:**
- Modify: `apps/web/src/components/header/index.tsx`

- [ ] **Step 1: Refactor Header props**

Modify `apps/web/src/components/header/index.tsx`:
- Make `onMenuPress` optional (remove when undefined = wide screen, no menu button)
- Keep `onSearchPress` required

```typescript
import React from 'react';
import { observer, useService } from '@rabjs/react';
import { Menu, Search } from 'lucide-react';
import { SocketService } from '../../services/socket.service';

interface HeaderProps {
  onMenuPress?: () => void;
  onSearchPress: () => void;
}

function HeaderInner({ onMenuPress, onSearchPress }: HeaderProps) {
  const socketService = useService(SocketService);

  return (
    <header
      className="h-14 flex items-center justify-between px-4 shrink-0
                 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]"
    >
      {onMenuPress ? (
        <button
          onClick={onMenuPress}
          className="p-2 min-w-[44px] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
        >
          <Menu size={24} className="text-[var(--text-primary)]" />
        </button>
      ) : (
        <div className="min-w-[44px]" />
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-base font-semibold tracking-widest text-[var(--text-primary)]">
          ZEN_SEND
        </span>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: socketService.isConnected ? '#22C55E' : '#EF4444' }}
        />
      </div>

      <button
        onClick={onSearchPress}
        className="p-2 min-w-[44px] flex justify-end hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
      >
        <Search size={22} className="text-[var(--text-primary)]" />
      </button>
    </header>
  );
}

export default observer(HeaderInner);
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/header/index.tsx
git commit -m "refactor(web): make Header menu button optional for sidebar layout"
```

### Task 5: Create AppLayout component

**Files:**
- Create: `apps/web/src/components/app-layout/index.tsx`

- [ ] **Step 1: Create AppLayout component**

The AppLayout manages the Sidebar/Drawer switching based on viewport width. It also serves as the auth guard for all authenticated routes.

```typescript
import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, Navigate } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { useIsWide } from '../../hooks/use-is-wide';
import { AuthService } from '../../services/auth.service';
import Sidebar from '../sidebar';
import Drawer from '../drawer';
import Header from '../header';

function AppLayoutInner() {
  const isWide = useIsWide();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const authService = useService(AuthService);

  // Auth guard - redirect to login if not authenticated
  if (!authService.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Close drawer when viewport crosses to wide
  useEffect(() => {
    if (isWide && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [isWide, drawerOpen]);

  return (
    <div className="h-screen bg-[var(--bg-primary)] flex overflow-hidden">
      {/* Sidebar: wide screen only */}
      {isWide && <Sidebar />}

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header: narrow screen shows menu button */}
        <Header
          onMenuPress={isWide ? undefined : () => setDrawerOpen(true)}
          onSearchPress={() => navigate('/search')}
        />

        {/* Page content */}
        <Outlet />
      </div>

      {/* Drawer: narrow screen only */}
      {!isWide && (
        <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}
    </div>
  );
}

export default observer(AppLayoutInner);
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/app-layout/index.tsx
git commit -m "feat(web): add AppLayout with sidebar/drawer responsive switching"
```

---

## Chunk 3: Route restructuring + page migration

### Task 6: Restructure routes in app.tsx

**Files:**
- Modify: `apps/web/src/app.tsx`

- [ ] **Step 1: Restructure app.tsx with nested routes**

Change from flat route config to nested routes where AppLayout wraps authenticated routes. Also remove the `RootRoute` component since auth checking moves into AppLayout's `Outlet` children.

```typescript
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';
import AppLayout from './components/app-layout';

import HomePage from './pages/home';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';
import DevicesPage from './pages/devices';
import SettingsPage from './pages/settings';
import SearchPage from './pages/search';
import DownloadsPage from './pages/downloads';

function App() {
  return (
    <HashRouter>
      <ThemeProvider>
        <Routes>
          {/* Auth routes - no AppLayout */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/setup" element={<SetupPage />} />

          {/* Authenticated routes - wrapped by AppLayout */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </HashRouter>
  );
}

export default App;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app.tsx
git commit -m "refactor(web): nest authenticated routes under AppLayout"
```

### Task 7: Migrate HomePage to use AppLayout

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`

- [ ] **Step 1: Refactor HomePage**

Remove: outer `<div className="h-screen ...">` container, `drawerOpen` state, `<Header>`, `<Drawer>`, inline auth check (now handled by AppLayout).
Keep: all drag-and-drop logic, SelectedFiles, FilterTabs, TransferList, BottomToolbar, Toast.
The drag overlay must now use `absolute inset-0` instead of `fixed inset-0` since it's inside the main content area.

```typescript
import React, { useEffect, useCallback, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import { Upload } from 'lucide-react';
import { HomeService } from './home.service';
import { SocketService } from '../../services/socket.service';
import FilterTabs from '../../components/filter-tabs';
import TransferList from '../../components/transfer-list';
import SelectedFiles from '../../components/selected-files';
import BottomToolbar from '../../components/bottom-toolbar';
import Toast from '../../components/toast';
import { getMimeTypeFromExtension } from '../../lib/zen-bridge';

const HomeContent = observer(() => {
  const homeService = useService(HomeService);
  const socketService = useService(SocketService);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    homeService.loadTransfers();
    socketService.connect();
  }, [homeService, socketService]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files: { name: string; size: number; type?: string; data?: ArrayBuffer }[] = [];
      const items = e.dataTransfer.items;
      const MAX_DEPTH = 10;

      const processEntry = async (entry: FileSystemEntry, depth: number): Promise<void> => {
        if (depth > MAX_DEPTH) return;

        if (entry.isFile) {
          const fileEntry = entry as FileSystemFileEntry;
          const file = await new Promise<File>((resolve, reject) => {
            fileEntry.file(resolve, reject);
          });

          if (file.name.startsWith('.')) return;

          const buffer = await file.arrayBuffer();
          const type = file.type || getMimeTypeFromExtension(file.name);
          files.push({ name: file.name, size: file.size, type, data: buffer });
        } else if (entry.isDirectory) {
          const dirEntry = entry as FileSystemDirectoryEntry;
          const reader = dirEntry.createReader();
          const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
            reader.readEntries(resolve, reject);
          });
          for (const childEntry of entries) {
            await processEntry(childEntry, depth + 1);
          }
        }
      };

      for (const item of Array.from(items)) {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          await processEntry(entry, 0);
        } else {
          const file = item.getAsFile();
          if (file && !file.name.startsWith('.')) {
            const buffer = await file.arrayBuffer();
            const type = file.type || getMimeTypeFromExtension(file.name);
            files.push({ name: file.name, size: file.size, type, data: buffer });
          }
        }
      }

      if (files.length > 0) {
        homeService.addFiles(files);
        homeService.uploadFiles();
      }
    },
    [homeService]
  );

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col relative
        ${isDragging ? 'ring-2 ring-[var(--accent)] ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SelectedFiles />
      <FilterTabs />
      <TransferList />
      <BottomToolbar />

      {isDragging && (
        <div className="absolute inset-0 bg-[var(--bg-primary)]/80 flex items-center justify-center z-50">
          <div className="rounded-2xl p-16 text-center bg-[var(--bg-surface)]">
            <Upload size={64} className="text-[var(--accent)] mx-auto mb-4" />
            <p className="text-xl text-[var(--text-primary)] font-medium">Release to upload</p>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
});

export default HomeContent;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/home/index.tsx
git commit -m "refactor(web): migrate HomePage to AppLayout, remove standalone layout"
```

### Task 8: Migrate sub-pages to use AppLayout

**Files:**
- Modify: `apps/web/src/pages/devices/index.tsx`
- Modify: `apps/web/src/pages/downloads/index.tsx`
- Modify: `apps/web/src/pages/search/index.tsx`
- Modify: `apps/web/src/pages/settings/index.tsx`

Each sub-page needs the same pattern:
1. Remove the outermost `<div className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden">` wrapper
2. Replace with `<div className="flex-1 min-h-0 flex flex-col overflow-hidden">` — fills the AppLayout content area
3. Keep the inline header (back button + title) and all page-specific content unchanged

- [ ] **Step 1: Migrate DevicesPage**

In `apps/web/src/pages/devices/index.tsx`, change the outermost div:
- From: `className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden"`
- To: `className="flex-1 min-h-0 flex flex-col overflow-hidden"`

Also remove `bg-[var(--bg-primary)]` since the background is now provided by AppLayout.

Result: `className="flex-1 min-h-0 flex flex-col overflow-hidden"`

- [ ] **Step 2: Migrate DownloadsPage**

In `apps/web/src/pages/downloads/index.tsx`, same change:
- From: `className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden"`
- To: `className="flex-1 min-h-0 flex flex-col overflow-hidden"`

- [ ] **Step 3: Migrate SearchPage**

In `apps/web/src/pages/search/index.tsx`, same change:
- From: `className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden"`
- To: `className="flex-1 min-h-0 flex flex-col overflow-hidden"`

- [ ] **Step 4: Migrate SettingsPage**

In `apps/web/src/pages/settings/index.tsx`, same change:
- From: `className="h-screen bg-[var(--bg-primary)] flex flex-col overflow-hidden"`
- To: `className="flex-1 min-h-0 flex flex-col overflow-hidden"`

- [ ] **Step 5: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/web typecheck`
Expected: PASS

- [ ] **Step 6: Verify dev server renders correctly**

Run: `pnpm dev:web` and verify:
- Wide screen: Sidebar visible with active route indicator, Header shows no menu button, all pages render in content area
- Narrow screen: Sidebar hidden, Header shows menu button, Drawer opens/closes, navigation works
- Sub-pages: back buttons still work, content scrolls correctly

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/devices/index.tsx apps/web/src/pages/downloads/index.tsx apps/web/src/pages/search/index.tsx apps/web/src/pages/settings/index.tsx
git commit -m "refactor(web): migrate sub-pages to AppLayout, remove standalone layout containers"
```

---

## Chunk 4: Electron native title bar

### Task 9: Remove titleBarStyle: 'hidden' from Electron

**Files:**
- Modify: `apps/electron/src/main/window.ts`

- [ ] **Step 1: Remove titleBarStyle: 'hidden'**

In `apps/electron/src/main/window.ts`, line 99, remove:
```
titleBarStyle: 'hidden',
```

The BrowserWindow config (lines 89-106) becomes:
```typescript
this.window = new BrowserWindow({
  x: bounds.x,
  y: bounds.y,
  width: bounds.width ?? 460,
  height: bounds.height ?? 800,
  minWidth: 460,
  minHeight: 600,
  show: false,
  title: 'Zen Send',
  icon: iconPath,
  webPreferences: {
    preload: PRELOAD_PATH,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
  },
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm --filter @zen-send/electron typecheck` (if available) or verify the file compiles.

- [ ] **Step 3: Test Electron app**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm dev:web && cd apps/electron && pnpm dev`
Verify:
- Native title bar appears with traffic light buttons
- Header is not overlapped by traffic lights
- Window can be dragged by the native title bar
- Sidebar/Drawer responsive switching works (narrow window shows Drawer, wide shows Sidebar)

- [ ] **Step 4: Commit**

```bash
git add apps/electron/src/main/window.ts
git commit -m "fix(electron): restore native title bar, remove titleBarStyle hidden"
```

---

## Chunk 5: Verification and cleanup

### Task 10: Full integration verification

- [ ] **Step 1: Run full typecheck**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `cd /Users/ximing/project/mygithub/zen-send && pnpm lint`
Expected: PASS (fix any issues)

- [ ] **Step 3: Visual verification checklist**

Manually verify in browser (or report any issues found):

Wide screen (>=768px):
- [ ] Sidebar visible on left with nav content
- [ ] Sidebar shows Home, Devices, Downloads nav items
- [ ] Active route is highlighted with accent left bar
- [ ] User avatar/info at top, theme toggle + logout at bottom
- [ ] Header shows no menu button (left side empty)
- [ ] Content area fills remaining space
- [ ] Sub-pages show back button + title in content area header
- [ ] Drag-and-drop upload works on home page (overlay within content area)

Narrow screen (<768px):
- [ ] Sidebar hidden
- [ ] Header shows menu button
- [ ] Drawer opens/closes with menu button
- [ ] Drawer content matches Sidebar (Home, Devices, Downloads)
- [ ] Navigation from Drawer closes it

Resize crossing breakpoint:
- [ ] Dragging from wide to narrow: Sidebar disappears, menu button appears
- [ ] Dragging from narrow to wide: Sidebar appears, if Drawer was open it closes
- [ ] No visual glitches during transition

Electron:
- [ ] Native title bar visible
- [ ] Traffic light buttons not overlapping Header
- [ ] Responsive layout works at minWidth (460px)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(web): address integration issues from sidebar refactor"
```
