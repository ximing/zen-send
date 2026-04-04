# Web App Style Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the web interface with sidebar navigation, device management page, enhanced upload progress, and file management features.

**Architecture:**
- Replace fixed header with 64px fixed sidebar navigation
- Add `/devices` route for device management with QR code pairing
- Enhance upload progress UI with speed/ETA display
- Add file management: search, filter, preview, download, delete
- Add pagination to transfer list via "Load More" button

**Tech Stack:** React 19, React Router 7, @rabjs/react, Tailwind CSS v4, qrcode library

---

## Chunk 1: Sidebar Component

**Goal:** Create Sidebar component with navigation icons and bottom user actions section.

**Files:**
- Create: `apps/web/src/components/sidebar/index.tsx`
- Create: `apps/web/src/components/sidebar/sidebar-service.ts`
- Modify: `apps/web/src/services/auth.service.ts` (add deviceId methods)
- Modify: `apps/web/src/services/api.service.ts` (add deviceId header)

### Step 1.1: Create SidebarService

**Files:**
- Create: `apps/web/src/components/sidebar/sidebar-service.ts`

```typescript
import { Service } from '@rabjs/react';
import { Sun, Moon } from 'lucide-react';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';

const DEVICE_ID_KEY = 'zen-send-device-id';

export class SidebarService extends Service {
  get themeService() {
    return this.resolve(ThemeService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  get deviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  get themeIcon() {
    const Icon = this.themeService.resolvedTheme === 'dark' ? Sun : Moon;
    return <Icon size={20} className="text-[var(--text-secondary)]" />;
  }

  get userEmail() {
    return this.authService.user?.email || '';
  }

  get userInitial() {
    return this.userEmail.charAt(0).toUpperCase() || '?';
  }

  async logout() {
    await this.authService.logout();
  }
}
```

### Step 1.2: Create Sidebar Component

**Files:**
- Create: `apps/web/src/components/sidebar/index.tsx`

```tsx
import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FolderArchive,
  Smartphone,
  Settings,
  Sun,
  Moon,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { SidebarService } from './sidebar-service';

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: FolderArchive, label: 'Transfers', path: '/' },
  { icon: Smartphone, label: 'Devices', path: '/devices' },
];

const SidebarContent = observer(() => {
  const service = useService(SidebarService);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await service.logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-16 bg-[var(--bg-surface)] border-r border-[var(--border-default)] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-[var(--border-default)]">
        <span className="text-xs font-bold tracking-wider text-[var(--text-primary)]">ZS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="flex flex-col items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`group relative w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                  active
                    ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
                title={item.label}
              >
                <Icon size={22} />
                {/* Tooltip */}
                <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="py-4 border-t border-[var(--border-default)]">
        <div className="flex flex-col items-center gap-2">
          {/* Settings (placeholder for future) */}
          <button
            className="group relative w-12 h-12 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            title="Settings"
            disabled
          >
            <Settings size={20} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              Settings
            </span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => service.toggleTheme()}
            className="group relative w-12 h-12 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
            title="Toggle theme"
          >
            {service.themeIcon}
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              Theme
            </span>
          </button>

          {/* User avatar */}
          <div className="w-10 h-10 rounded-md bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center text-xs font-semibold">
            {service.userInitial}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="group relative w-12 h-12 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--color-error)] transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
            <span className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
              Logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
});

export default bindServices(SidebarContent, [SidebarService]);
```

### Step 1.3: Commit

```bash
git add apps/web/src/components/sidebar/
git commit -m "feat(web): add sidebar component with navigation

- Create SidebarService with theme toggle, user info, logout
- Add deviceId generation in localStorage for device identification
- Create Sidebar component with icon navigation and tooltips
- Bottom section has settings (placeholder), theme toggle, user avatar, logout
- Follows existing @rabjs/react service patterns

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: App Layout with Sidebar

**Goal:** Replace Header with Sidebar in HomePage layout.

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`
- Delete: `apps/web/src/components/header/index.tsx`
- Delete: `apps/web/src/components/header/header.service.tsx`
- Modify: `apps/web/src/app.tsx`

### Step 2.1: Update HomePage to Use Sidebar

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`

Replace:
```tsx
import Header from '../../components/header';
```

With:
```tsx
import Sidebar from '../../components/sidebar';
```

Replace the `<Header />` component with `<Sidebar />` and adjust main content margin:
```tsx
<div className="min-h-screen bg-[var(--bg-primary)] flex">
  <Sidebar />
  <main className="flex-1 ml-16 ...">
```

### Step 2.2: Delete Header Files

```bash
rm apps/web/src/components/header/index.tsx
rm apps/web/src/components/header/header.service.tsx
```

### Step 2.3: Commit

```bash
git add apps/web/src/pages/home/index.tsx
git rm apps/web/src/components/header/index.tsx apps/web/src/components/header/header.service.tsx
git commit -m "refactor(web): replace Header with Sidebar in HomePage

- Sidebar is now the main navigation element
- Removed old Header component and HeaderService
- Main content area now has left margin for sidebar

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Routing Setup

**Goal:** Add `/devices` route and placeholder SettingsPage route.

**Files:**
- Modify: `apps/web/src/app.tsx`

### Step 3.1: Update App Routes

**Files:**
- Modify: `apps/web/src/app.tsx`

```tsx
import { HashRouter, useRoutes } from 'react-router-dom';
import { ThemeProvider } from './theme/theme-provider';

import HomePage from './pages/home';
import DevicesPage from './pages/devices';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import SetupPage from './pages/setup';
import SettingsPage from './pages/settings'; // placeholder

const routeConfig = [
  { path: '/', element: <HomePage /> },
  { path: '/devices', element: <DevicesPage /> },
  { path: '/settings', element: <SettingsPage /> }, // placeholder
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/setup', element: <SetupPage /> },
];

// ... rest stays the same
```

### Step 3.2: Create Placeholder SettingsPage

**Files:**
- Create: `apps/web/src/pages/settings/index.tsx`

```tsx
import React from 'react';
import Sidebar from '../../components/sidebar';

const SettingsPage = () => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      <Sidebar />
      <main className="flex-1 ml-16 p-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-4 text-[var(--text-secondary)]">Settings page coming soon.</p>
      </main>
    </div>
  );
};

export default SettingsPage;
```

### Step 3.3: Commit

```bash
git add apps/web/src/app.tsx apps/web/src/pages/settings/
git commit -m "feat(web): add /devices and /settings routes

- Add DevicesPage route at /devices
- Add placeholder SettingsPage route at /settings
- Create placeholder SettingsPage component

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Server Pair Token Endpoint

**Goal:** Add `POST /api/devices/pair-token` endpoint for QR code generation.

**Files:**
- Create: `apps/server/src/validators/create-pair-token.validator.ts`
- Modify: `apps/server/src/controllers/device.controller.ts`

### Step 4.1: Create Validator

**Files:**
- Create: `apps/server/src/validators/create-pair-token.validator.ts`

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePairTokenDto {
  @IsString()
  @IsNotEmpty()
  deviceName!: string;
}
```

### Step 4.2: Add Endpoint to DeviceController

**Files:**
- Modify: `apps/server/src/controllers/device.controller.ts`

Add import:
```typescript
import { CreatePairTokenDto } from '../validators/create-pair-token.validator.js';
```

Add new method after `heartbeat`:
```typescript
@Post('/pair-token')
@HttpCode(201)
async createPairToken(@CurrentUser() user: TokenPayload, @Body() dto: CreatePairTokenDto) {
  const jwt = await this.deviceService.generatePairToken(user.userId, dto.deviceName);
  return ResponseUtil.created({ token: jwt.token, expiresAt: jwt.expiresAt });
}
```

### Step 4.3: Add generatePairToken to DeviceService

**Files:**
- Modify: `apps/server/src/services/device.service.ts`

Add method:
```typescript
async generatePairToken(userId: string, deviceName: string): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const payload = {
    userId,
    deviceName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
  };

  // Use JWT utility to sign - adapt based on your JWT implementation
  const token = signJwt(payload, process.env.JWT_REFRESH_SECRET || 'refresh-secret', { algorithm: 'HS256' });

  return { token, expiresAt };
}
```

Note: You may need to import your JWT signing utility. The exact implementation depends on how JWTs are signed in your project.

### Step 4.4: Commit

```bash
git add apps/server/src/validators/create-pair-token.validator.ts apps/server/src/controllers/device.controller.ts apps/server/src/services/device.service.ts
git commit -m "feat(server): add POST /api/devices/pair-token endpoint

- Add CreatePairTokenDto validator
- Add generatePairToken method to DeviceService
- Generate 5-minute expiring JWT token for QR code pairing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Devices Page

**Goal:** Create DevicesPage with QR code display and device list.

**Files:**
- Create: `apps/web/src/pages/devices/index.tsx`
- Create: `apps/web/src/pages/devices/devices.service.ts`
- Create: `apps/web/src/services/device.service.ts`
- Modify: `apps/web/package.json` (add qrcode)

### Step 5.1: Add qrcode Dependency

**Files:**
- Modify: `apps/web/package.json`

Add to dependencies:
```json
"qrcode": "^1.5.3"
```

Run:
```bash
cd apps/web && pnpm add qrcode && cd ../..
```

### Step 5.2: Create DeviceService (Web)

**Files:**
- Create: `apps/web/src/services/device.service.ts`

```typescript
import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import type { Device, DeviceListResponse } from '@zen-send/shared';

export class DeviceService extends Service {
  private apiService = this.resolve(ApiService);

  private _devices: Device[] = [];
  private _pairToken: string | null = null;
  private _pairTokenExpiry: Date | null = null;
  private _loading = false;

  get devices() {
    return this._devices;
  }

  get loading() {
    return this._loading;
  }

  get pairToken() {
    return this._pairToken;
  }

  get pairTokenExpiry() {
    return this._pairTokenExpiry;
  }

  get currentDeviceId(): string {
    return localStorage.getItem('zen-send-device-id') || '';
  }

  isCurrentDevice(deviceId: string): boolean {
    return deviceId === this.currentDeviceId;
  }

  async loadDevices() {
    this._loading = true;
    try {
      // Server returns { success: true, data: { devices: [...] } }
      const response = await this.apiService.get<DeviceListResponse>('/api/devices');
      this._devices = response.devices || [];
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      this._loading = false;
    }
  }

  async generatePairToken(deviceName: string) {
    try {
      // Server returns { success: true, data: { token, expiresAt } }
      const response = await this.apiService.post<{ token: string; expiresAt: string }>('/api/devices/pair-token', {
        deviceName,
      });
      this._pairToken = response.token;
      this._pairTokenExpiry = new Date(response.expiresAt);
    } catch (error) {
      console.error('Failed to generate pair token:', error);
    }
  }

  async removeDevice(deviceId: string) {
    try {
      await this.apiService.delete(`/api/devices/${deviceId}`);
      this._devices = this._devices.filter((d) => d.id !== deviceId);
    } catch (error) {
      console.error('Failed to remove device:', error);
      throw error;
    }
  }

  async registerCurrentDevice() {
    const deviceId = this.currentDeviceId;
    const deviceName = navigator.userAgent.includes('Mobile') ? 'Web Mobile' : 'Web Browser';

    try {
      // Server generates ID internally, don't send it from client
      await this.apiService.post('/api/devices', {
        name: deviceName,
        type: 'web',
      });
    } catch (error) {
      // Device may already be registered, ignore
    }
  }
}
```

### Step 5.3: Create DevicesPage Component

**Files:**
- Create: `apps/web/src/pages/devices/index.tsx`

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import QRCode from 'qrcode';
import { Smartphone, Monitor, Trash2, RefreshCw, Copy, Check, X } from 'lucide-react';
import { DeviceService } from '../../services/device.service';
import { AuthService } from '../../services/auth.service';
import Sidebar from '../../components/sidebar';

const PAIR_URL = 'https://zensend.dev/pair?token=';

const DevicesContent = observer(() => {
  const deviceService = useService(DeviceService);
  const authService = useService(AuthService);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated) return;
    deviceService.registerCurrentDevice();
    deviceService.loadDevices();
    deviceService.generatePairToken('Web Browser');
  }, [authService, deviceService]);

  useEffect(() => {
    if (deviceService.pairToken) {
      const url = PAIR_URL + deviceService.pairToken;
      QRCode.toDataURL(url, { width: 200, margin: 2 }).then(setQrDataUrl);
    }
  }, [deviceService.pairToken]);

  const handleCopyToken = async () => {
    if (deviceService.pairToken) {
      await navigator.clipboard.writeText(PAIR_URL + deviceService.pairToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefreshToken = () => {
    deviceService.generatePairToken('Web Browser');
  };

  const handleRemoveDevice = async (deviceId: string) => {
    await deviceService.removeDevice(deviceId);
    setShowRemoveModal(null);
  };

  const getDeviceIcon = (type?: string) => {
    return type === 'mobile' ? Smartphone : Monitor;
  };

  // Device.lastSeenAt is a number timestamp, isOnline is 0 or 1 (not boolean)
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex">
      <Sidebar />
      <main className="flex-1 ml-16 p-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-8">Device Management</h1>

        {/* QR Code Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">Scan to Add Device</h2>
            <div className="flex flex-col items-center">
              {qrDataUrl ? (
                <div className="relative">
                  <img src={qrDataUrl} alt="Pairing QR Code" className="w-48 h-48 rounded-lg" />
                  <button
                    onClick={handleRefreshToken}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center hover:bg-[var(--border-default)]"
                    title="Refresh QR code"
                  >
                    <RefreshCw size={16} className="text-[var(--text-secondary)]" />
                  </button>
                </div>
              ) : (
                <div className="w-48 h-48 bg-[var(--bg-elevated)] rounded-lg flex items-center justify-center">
                  <RefreshCw size={24} className="text-[var(--text-muted)] animate-spin" />
                </div>
              )}
              <p className="mt-4 text-sm text-[var(--text-secondary)] text-center">
                Open Zen Send on your device and scan this QR code
              </p>
              {deviceService.pairToken && (
                <button
                  onClick={handleCopyToken}
                  className="mt-2 flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
              )}
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
            <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">How it works</h2>
            <ol className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center text-xs">1</span>
                Open Zen Send on your target device
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center text-xs">2</span>
                Go to Add Device or Settings
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center text-xs">3</span>
                Scan the QR code above
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--on-primary)] flex items-center justify-center text-xs">4</span>
                Your device will appear below
              </li>
            </ol>
          </div>
        </div>

        {/* Device List */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-6">
          <h2 className="text-lg font-medium text-[var(--text-primary)] mb-4">My Devices</h2>

          {deviceService.loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw size={24} className="text-[var(--text-muted)] animate-spin" />
            </div>
          ) : deviceService.devices.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-8 text-center">No devices registered yet</p>
          ) : (
            <div className="space-y-3">
              {deviceService.devices.map((device) => {
                const Icon = getDeviceIcon(device.type);
                const isCurrent = deviceService.isCurrentDevice(device.id);
                const isOnline = device.isOnline === 1; // isOnline is 0 or 1
                return (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-4 bg-[var(--bg-elevated)] rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className="text-[var(--text-secondary)]" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{device.name}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-xs bg-[var(--primary)] text-[var(--on-primary)] rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[var(--text-muted)]">
                          {isOnline ? 'Online' : `Last seen ${formatTimeAgo(device.lastSeenAt)}`}
                        </span>
                      </div>
                    </div>
                    {!isCurrent && (
                      <button
                        onClick={() => setShowRemoveModal(device.id)}
                        className="p-2 text-[var(--text-muted)] hover:text-[var(--color-error)] rounded hover:bg-[var(--bg-surface)]"
                        title="Remove device"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Remove Confirmation Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[var(--bg-surface)] rounded-xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-[var(--text-primary)]">Remove Device</h3>
                <button onClick={() => setShowRemoveModal(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Are you sure you want to remove this device? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveModal(null)}
                  className="flex-1 py-2 px-4 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-default)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveDevice(showRemoveModal)}
                  className="flex-1 py-2 px-4 text-sm bg-[var(--color-error)] text-white rounded-lg hover:opacity-90"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
});

export default bindServices(DevicesContent, [DeviceService]);
```

Note: The Device type from `@zen-send/dto` may not have all the fields used above. You'll need to add them to the shared types if missing. The Device type should include: `id`, `name`, `type`, `isOnline`, `updatedAt`.

### Step 5.4: Commit

```bash
git add apps/web/src/pages/devices/ apps/web/src/services/device.service.ts apps/web/package.json
git commit -m "feat(web): add devices page with QR code pairing

- Create DeviceService for device management API calls
- Create DevicesPage with QR code display for pairing
- Add device list with online/offline status
- Remove device functionality with confirmation modal
- Add qrcode dependency for QR generation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 6: Upload Enhancements

**Goal:** Enhance upload progress UI with speed and ETA display.

**Files:**
- Modify: `apps/web/src/pages/home/home.service.ts`
- Modify: `apps/web/src/pages/home/index.tsx`

### Step 6.1: Update HomeService Upload Tracking

**Files:**
- Modify: `apps/web/src/pages/home/home.service.ts`

Add to UploadingFile interface:
```typescript
export interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  sessionId?: string;
  error?: string;
  // New fields
  speed?: number; // bytes per second
  eta?: number; // seconds remaining
  startTime?: number; // timestamp
  uploadedBytes?: number;
}
```

Update executeUpload method to track speed/ETA:
- Track start time when upload begins
- Calculate speed every 500ms using rolling average
- Update ETA based on remaining bytes and current speed

### Step 6.2: Update Upload Progress UI

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`

Update renderUploadProgress to display speed and ETA:
```tsx
const renderUploadProgress = (upload: UploadingFile) => {
  // ... existing code ...

  // Add after progress bar
  {upload.status === 'uploading' && upload.speed !== undefined && (
    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
      <span>{formatSpeed(upload.speed)}</span>
      {upload.eta !== undefined && <span>• {formatEta(upload.eta)} left</span>}
    </div>
  )}
};

const formatSpeed = (bytesPerSec: number): string => {
  if (bytesPerSec > 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  }
  return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
};

const formatEta = (seconds: number): string => {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};
```

### Step 6.3: Enhance Drag Overlay

Update the drag overlay to match spec design:
- Full-screen with semi-transparent overlay
- Dashed border
- Centered "Release to upload" text

```tsx
{isDragging && (
  <div className="fixed inset-0 bg-[var(--primary)]/10 flex items-center justify-center z-50">
    <div className="border-2 border-dashed border-[var(--primary)] rounded-2xl p-16 text-center">
      <Upload size={64} className="text-[var(--primary)] mx-auto mb-4" />
      <p className="text-xl text-[var(--text-primary)] font-medium">Release to upload</p>
    </div>
  </div>
)}
```

### Step 6.4: Commit

```bash
git add apps/web/src/pages/home/home.service.ts apps/web/src/pages/home/index.tsx
git commit -m "feat(web): enhance upload progress with speed and ETA

- Add speed and eta fields to UploadingFile interface
- Calculate upload speed using rolling average
- Display speed and ETA in upload progress UI
- Enhance drag overlay with dashed border design

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 7: File Management

**Goal:** Add search, filter, preview, download, and delete functionality.

**Files:**
- Create: `apps/web/src/components/search-bar/index.tsx`
- Create: `apps/web/src/components/preview-modal/index.tsx`
- Modify: `apps/web/src/components/transfer-list/index.tsx`
- Modify: `apps/web/src/pages/home/home.service.ts`
- Modify: `apps/web/src/services/api.service.ts`

### Step 7.1: Add API Methods for File Operations

**Files:**
- Modify: `apps/web/src/services/api.service.ts`

The server's download endpoint returns a presigned URL, not a direct blob. The client must:
1. Call `GET /api/transfers/:id/download` to get the presigned URL
2. Fetch that URL to download the file

Add methods:
```typescript
async getTransferDownloadUrl(transferId: string): Promise<string> {
  // Server returns { success: true, data: { downloadUrl: "..." } }
  const response = await this.get<{ downloadUrl: string }>(`/api/transfers/${transferId}/download`);
  return response.downloadUrl;
}

async getTransferFile(transferId: string): Promise<Blob> {
  // First get the presigned URL
  const downloadUrl = await this.getTransferDownloadUrl(transferId);
  // Then fetch the actual file using the presigned URL (no auth needed)
  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error('Failed to download file');
  return response.blob();
}

async deleteTransfer(transferId: string): Promise<void> {
  await this.delete(`/api/transfers/${transferId}`);
}
```

### Step 7.2: Create SearchBar Component

**Files:**
- Create: `apps/web/src/components/search-bar/index.tsx`

```tsx
import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';

type FilterType = 'all' | 'file' | 'text';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

const SearchBarContent = observer(() => {
  const service = useService(HomeService);
  const [typeOpen, setTypeOpen] = React.useState(false);
  const [timeOpen, setTimeOpen] = React.useState(false);

  const typeLabels: Record<FilterType, string> = {
    all: 'All',
    file: 'Files',
    text: 'Text',
  };

  const timeLabels: Record<TimeFilter, string> = {
    all: 'All time',
    today: 'Today',
    week: 'This week',
    month: 'This month',
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Search files..."
          value={service.searchQuery}
          onChange={(e) => service.setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      {/* Type Filter */}
      <div className="relative">
        <button
          onClick={() => { setTypeOpen(!typeOpen); setTimeOpen(false); }}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--border-default)]"
        >
          {typeLabels[service.typeFilter]}
          <ChevronDown size={14} />
        </button>
        {typeOpen && (
          <div className="absolute top-full right-0 mt-1 w-32 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-lg z-10">
            {(['all', 'file', 'text'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => { service.setTypeFilter(type); setTypeOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-elevated)] first:rounded-t-lg last:rounded-b-lg ${
                  service.typeFilter === type ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {typeLabels[type]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Time Filter */}
      <div className="relative">
        <button
          onClick={() => { setTimeOpen(!timeOpen); setTypeOpen(false); }}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--border-default)]"
        >
          {timeLabels[service.timeFilter]}
          <ChevronDown size={14} />
        </button>
        {timeOpen && (
          <div className="absolute top-full right-0 mt-1 w-32 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg shadow-lg z-10">
            {(['all', 'today', 'week', 'month'] as TimeFilter[]).map((time) => (
              <button
                key={time}
                onClick={() => { service.setTimeFilter(time); setTimeOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-[var(--bg-elevated)] first:rounded-t-lg last:rounded-b-lg ${
                  service.timeFilter === time ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {timeLabels[time]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default bindServices(SearchBarContent, [HomeService]);
```

### Step 7.3: Create PreviewModal Component

**Files:**
- Create: `apps/web/src/components/preview-modal/index.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';

const PreviewModalContent = observer(() => {
  const service = useService(HomeService);
  const apiService = useService(ApiService);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { previewTransfer, setPreviewTransfer } = service;

  useEffect(() => {
    if (previewTransfer) {
      loadPreview();
    }
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [previewTransfer]);

  const loadPreview = async () => {
    if (!previewTransfer?.id) return;
    setLoading(true);
    try {
      const blob = await apiService.getTransferFile(previewTransfer.id);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPreviewTransfer(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(Math.max(s + delta, 0.5), 3));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setDragging(false);

  const handleDownload = async () => {
    if (!blobUrl || !previewTransfer) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = previewTransfer.name;
    a.click();
  };

  if (!previewTransfer) return null;

  const isImage = previewTransfer.type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(previewTransfer.name);
  const isText = /\.(txt|md|json|js|css|html|ts|tsx|xml|yaml|yml)$/i.test(previewTransfer.name);
  const tooLargeForPreview = (previewTransfer.size || 0) > 50 * 1024 * 1024;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={handleClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-black/50">
        <div className="flex items-center gap-4">
          <span className="text-white text-sm font-medium">{previewTransfer.name}</span>
          <span className="text-white/60 text-xs">{(previewTransfer.size || 0).toLocaleString()} bytes</span>
        </div>
        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.min(s + 0.25, 3)); }} className="p-2 text-white/80 hover:text-white rounded hover:bg-white/10">
                <ZoomIn size={20} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setScale((s) => Math.max(s - 0.25, 0.5)); }} className="p-2 text-white/80 hover:text-white rounded hover:bg-white/10">
                <ZoomOut size={20} />
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="p-2 text-white/80 hover:text-white rounded hover:bg-white/10">
            <Download size={20} />
          </button>
          <button onClick={handleClose} className="p-2 text-white/80 hover:text-white rounded hover:bg-white/10">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        className="max-w-full max-h-full p-16"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
      >
        {loading ? (
          <div className="flex items-center justify-center text-white">Loading...</div>
        ) : tooLargeForPreview ? (
          <div className="text-center text-white">
            <p className="mb-4">File too large to preview</p>
            <button onClick={handleDownload} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg">
              Download instead
            </button>
          </div>
        ) : isImage ? (
          <img
            src={blobUrl}
            alt={previewTransfer.name}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` }}
            draggable={false}
          />
        ) : isText ? (
          <iframe src={blobUrl} className="w-[800px] h-[600px] bg-white rounded-lg" title="Preview" />
        ) : (
          <div className="text-center text-white">
            <p className="mb-4">Cannot preview this file type</p>
            <button onClick={handleDownload} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg">
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default bindServices(PreviewModalContent, [HomeService, ApiService]);
```

### Step 7.4: Update TransferList Component

**Files:**
- Modify: `apps/web/src/components/transfer-list/index.tsx`

Add action buttons to each transfer item:
```tsx
// Add imports
import { Eye, Download, Trash2 } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import SearchBar from '../search-bar';

// In the item render, add action buttons:
<div className="flex items-center gap-2">
  <button
    onClick={() => service.setPreviewTransfer(item)}
    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded hover:bg-[var(--bg-elevated)]"
    title="Preview"
  >
    <Eye size={14} />
  </button>
  <button
    onClick={() => service.downloadTransfer(item.id)}
    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--primary)] rounded hover:bg-[var(--bg-elevated)]"
    title="Download"
  >
    <Download size={14} />
  </button>
  <button
    onClick={() => service.setDeleteConfirm(item.id)}
    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--color-error)] rounded hover:bg-[var(--bg-elevated)]"
    title="Delete"
  >
    <Trash2 size={14} />
  </button>
</div>
```

Add SearchBar at top of list:
```tsx
<div className="mb-4">
  <SearchBar />
</div>
```

### Step 7.5: Update HomeService

**Files:**
- Modify: `apps/web/src/pages/home/home.service.ts`

Add new state and methods:
```typescript
// State
searchQuery = '';
typeFilter: 'all' | 'file' | 'text' = 'all';
timeFilter: 'all' | 'today' | 'week' | 'month' = 'all';
previewTransfer: TransferSession | null = null;
deleteConfirmId: string | null = null;

// Computed - update filteredTransfers to apply search and time filter
get filteredTransfers() {
  let result = [...this.transfers];

  // Apply type filter
  if (this.typeFilter !== 'all') {
    result = result.filter((t) => t.type === this.typeFilter);
  }

  // Apply time filter
  if (this.timeFilter !== 'all') {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    result = result.filter((t) => {
      const created = new Date(t.createdAt).getTime();
      if (this.timeFilter === 'today') return created > now - dayMs;
      if (this.timeFilter === 'week') return created > now - 7 * dayMs;
      if (this.timeFilter === 'month') return created > now - 30 * dayMs;
      return true;
    });
  }

  // Apply search
  if (this.searchQuery) {
    const query = this.searchQuery.toLowerCase();
    result = result.filter((t) =>
      (t.name || '').toLowerCase().includes(query) ||
      (t.originalFileName || '').toLowerCase().includes(query)
    );
  }

  return result.sort((a, b) => b.createdAt - a.createdAt);
}

// Methods
setSearchQuery(query: string) { this.searchQuery = query; }
setTypeFilter(filter: 'all' | 'file' | 'text') { this.typeFilter = filter; }
setTimeFilter(filter: 'all' | 'today' | 'week' | 'month') { this.timeFilter = filter; }
setPreviewTransfer(transfer: TransferSession | null) { this.previewTransfer = transfer; }
setDeleteConfirm(id: string | null) { this.deleteConfirmId = id; }

async deleteTransfer(id: string) {
  await this.apiService.deleteTransfer(id);
  this.transfers = this.transfers.filter((t) => t.id !== id);
  this.deleteConfirmId = null;
}

async downloadTransfer(id: string) {
  const blob = await this.apiService.getTransferFile(id);
  const transfer = this.transfers.find((t) => t.id === id);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = transfer?.name || 'download';
  a.click();
  URL.revokeObjectURL(url);
}
```

### Step 7.6: Commit

```bash
git add apps/web/src/components/search-bar/ apps/web/src/components/preview-modal/ apps/web/src/components/transfer-list/index.tsx apps/web/src/pages/home/home.service.ts apps/web/src/services/api.service.ts
git commit -m "feat(web): add file management features

- Add SearchBar component with search and filter dropdowns
- Add PreviewModal for image and text file previews
- Add download and delete actions to transfer items
- Update HomeService with search/filter state and methods
- Support zoom/pan for image preview
- Note: TransferSession uses originalFileName/totalSize, not name/size

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 8: Pagination

**Goal:** Add "Load More" pagination to transfer list.

**Files:**
- Modify: `apps/web/src/pages/home/home.service.ts`
- Modify: `apps/web/src/components/transfer-list/index.tsx`

### Step 8.1: Update HomeService for Pagination

**Files:**
- Modify: `apps/web/src/pages/home/home.service.ts`

Update loadTransfers to accept offset:
```typescript
async loadTransfers(offset = 0, limit = 50) {
  const response = await this.apiService.get<{ transfers: TransferSession[] }>(
    `/transfers?limit=${limit}&offset=${offset}`
  );

  if (offset === 0) {
    this.transfers = response.transfers;
  } else {
    // Append and re-sort for merged dataset
    const existingIds = new Set(this.transfers.map((t) => t.id));
    const newTransfers = response.transfers.filter((t) => !existingIds.has(t.id));
    this.transfers = [...this.transfers, ...newTransfers].sort((a, b) => b.createdAt - a.createdAt);
  }

  this._hasMore = response.transfers.length === limit;
}

get hasMore() { return this._hasMore; }
```

Add new fields:
```typescript
private _hasMore = true;
```

Update load method:
```typescript
async load() {
  this.loading = true;
  try {
    await this.loadTransfers(0);
    await this.loadDevices();
  } finally {
    this.loading = false;
  }
}
```

Add loadMore method:
```typescript
async loadMoreTransfers() {
  if (this.loading || !this._hasMore) return;
  this.loading = true;
  try {
    await this.loadTransfers(this.transfers.length);
  } finally {
    this.loading = false;
  }
}
```

### Step 8.2: Update TransferList Component

**Files:**
- Modify: `apps/web/src/components/transfer-list/index.tsx`

Add "Load More" button at bottom:
```tsx
{service.hasMore && (
  <div className="mt-4 text-center">
    <button
      onClick={() => service.loadMoreTransfers()}
      disabled={service.loading}
      className="px-6 py-2 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--border-default)] disabled:opacity-50"
    >
      {service.loading ? 'Loading...' : 'Load More'}
    </button>
  </div>
)}
```

### Step 8.3: Commit

```bash
git add apps/web/src/pages/home/home.service.ts apps/web/src/components/transfer-list/index.tsx
git commit -m "feat(web): add pagination to transfer list

- Add offset-based pagination to loadTransfers
- Add loadMoreTransfers method to HomeService
- Add Load More button to TransferList
- Re-sort merged dataset after loading more

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Final Summary

After completing all chunks, the following will be implemented:

1. **Sidebar** - Fixed 64px left sidebar with icon navigation, tooltips, and bottom user actions
2. **Routing** - `/devices` and `/settings` routes added
3. **Devices Page** - QR code pairing and device list management
4. **Upload Enhancements** - Speed/ETA display and improved drag overlay
5. **File Management** - Search, filter, preview, download, delete
6. **Pagination** - Load More button for transfer history

Run `pnpm typecheck` and `pnpm build` after all changes to verify everything compiles correctly.
