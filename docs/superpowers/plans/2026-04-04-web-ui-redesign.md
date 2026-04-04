# Zen Send Web UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Zen Send web interface from generic dashboard aesthetic to a Minimal Luxury monospace design with neutral palette and light/dark theme support.

**Architecture:** CSS-first redesign using Tailwind v4 with CSS custom properties. Replace all inline styles with utility classes using the new design tokens. No external icon library — use system emoji only.

**Tech Stack:** React 19, Tailwind CSS v4, @rabjs/react, TypeScript

---

## File Structure

### Files to Modify

| File | Purpose |
|------|---------|
| `apps/web/src/index.css` | Global styles, font import, base resets |
| `apps/web/src/theme/tokens.ts` | Theme token definitions |
| `apps/web/src/theme/theme-provider.tsx` | Theme provider (minor updates) |
| `apps/web/src/components/header/index.tsx` | Header with logo + user info + theme toggle |
| `apps/web/src/components/send-toolbar/index.tsx` | Send toolbar with 3 action buttons |
| `apps/web/src/components/transfer-list/index.tsx` | Transfer history list with filters |
| `apps/web/src/components/toast/index.tsx` | Toast notifications |
| `apps/web/src/pages/home/index.tsx` | Home page layout |
| `apps/web/src/pages/login/index.tsx` | Login form |
| `apps/web/src/pages/register/index.tsx` | Registration form |
| `apps/web/src/pages/setup/index.tsx` | Setup/connection form |

---

## Chunk 1: CSS Foundation

### Task 1: Rewrite `index.css` with Full Token System

**File:** `apps/web/src/index.css`

```css
@import "tailwindcss";

/* Google Font: Fira Code */
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap');

/* ============================================
   CSS Custom Properties — Light Mode (default)
   ============================================ */
:root {
  /* Typography */
  --font-mono: 'Fira Code', 'SF Mono', 'Cascadia Code', ui-monospace, monospace;

  /* Backgrounds */
  --bg-primary: #fafafa;
  --bg-surface: #ffffff;
  --bg-elevated: #f5f5f5;
  --bg-overlay: rgba(0, 0, 0, 0.5);

  /* Borders */
  --border-default: #e5e5e5;
  --border-subtle: #f0f0f0;
  --border-focus: #1a1a1a;

  /* Text — Light */
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-muted: #999999;
  --text-disabled: #cccccc;
  --on-surface: #1a1a1a;

  /* Semantic */
  --color-error: #dc2626;
  --color-success: #16a34a;
  --color-warning: #ca8a04;
  --color-info: #2563eb;

  /* Inverted (for primary buttons) */
  --on-primary: #ffffff;
  --primary: #1a1a1a;
  --primary-hover: #333333;
  --primary-pressed: #000000;
}

/* ============================================
   CSS Custom Properties — Dark Mode
   ============================================ */
.dark {
  /* Backgrounds */
  --bg-primary: #0f0f0f;
  --bg-surface: #141414;
  --bg-elevated: #1a1a1a;
  --bg-overlay: rgba(0, 0, 0, 0.7);

  /* Borders */
  --border-default: #2a2a2a;
  --border-subtle: #1f1f1f;
  --border-focus: #e5e5e5;

  /* Text — Dark */
  --text-primary: #e5e5e5;
  --text-secondary: #888888;
  --text-muted: #555555;
  --text-disabled: #333333;
  --on-surface: #e5e5e5;

  /* Semantic */
  --color-error: #f87171;
  --color-success: #4ade80;
  --color-warning: #fbbf24;
  --color-info: #60a5fa;

  /* Inverted */
  --on-primary: #0f0f0f;
  --primary: #e5e5e5;
  --primary-hover: #d4d4d4;
  --primary-pressed: #a3a3a3;
}

/* ============================================
   Base Styles
   ============================================ */
* {
  box-sizing: border-box;
}

html {
  font-family: var(--font-mono);
  font-size: 13px;
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  background: var(--bg-primary);
}

/* Monospace labels */
.label {
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-muted);
}

/* Focus visible */
*:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
}

/* Smooth transitions */
button, input, .card {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--border-default);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

- [ ] **Step 1: Backup existing index.css**

- [ ] **Step 2: Rewrite index.css with the full token system above**

- [ ] **Step 3: Verify the file is valid CSS**

---

### Task 2: Update `tokens.ts` to Match CSS

**File:** `apps/web/src/theme/tokens.ts`

```typescript
export const theme = {
  light: {
    bgPrimary: '#fafafa',
    bgSurface: '#ffffff',
    bgElevated: '#f5f5f5',
    bgOverlay: 'rgba(0, 0, 0, 0.5)',
    primary: '#1a1a1a',
    primaryHover: '#333333',
    primaryPressed: '#000000',
    onPrimary: '#ffffff',
    secondary: '#666666',
    secondaryHover: '#555555',
    accent: '#888888',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    textDisabled: '#cccccc',
    onSurface: '#1a1a1a',
    borderDefault: '#e5e5e5',
    borderSubtle: '#f0f0f0',
    borderFocus: '#1a1a1a',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    info: '#2563eb',
  },
  dark: {
    bgPrimary: '#0f0f0f',
    bgSurface: '#141414',
    bgElevated: '#1a1a1a',
    bgOverlay: 'rgba(0, 0, 0, 0.7)',
    primary: '#e5e5e5',
    primaryHover: '#d4d4d4',
    primaryPressed: '#a3a3a3',
    onPrimary: '#0f0f0f',
    secondary: '#888888',
    secondaryHover: '#999999',
    accent: '#666666',
    textPrimary: '#e5e5e5',
    textSecondary: '#888888',
    textMuted: '#555555',
    textDisabled: '#333333',
    onSurface: '#e5e5e5',
    borderDefault: '#2a2a2a',
    borderSubtle: '#1f1f1f',
    borderFocus: '#e5e5e5',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
  },
} as const satisfies Record<'light' | 'dark', Theme>;

export type Theme = {
  bgPrimary: string;
  bgSurface: string;
  bgElevated: string;
  bgOverlay: string;
  primary: string;
  primaryHover: string;
  primaryPressed: string;
  onPrimary: string;
  secondary: string;
  secondaryHover: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  onSurface: string;
  borderDefault: string;
  borderSubtle: string;
  borderFocus: string;
  success: string;
  warning: string;
  error: string;
  info: string;
};

export type ThemeMode = 'light' | 'dark' | 'system';
export const storageKey = 'zen-send-theme';

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}
```

- [ ] **Step 1: Update tokens.ts with the new neutral palette**

---

## Chunk 2: Header Component

### Task 3: Restyle Header Component

**File:** `apps/web/src/components/header/index.tsx`

```tsx
import React from 'react';
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
    <header className="h-16 flex items-center justify-between px-8 bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
      {/* Logo */}
      <h1 className="text-base font-semibold tracking-wider text-[var(--text-primary)]">
        ZEN_SEND
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {/* Theme toggle */}
        <button
          onClick={() => service.toggleTheme()}
          className="w-10 h-10 flex items-center justify-center rounded-md
                     hover:bg-[var(--bg-elevated)] transition-colors"
          title="Toggle theme"
        >
          {service.themeIcon}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-secondary)]">
            {service.userEmail}
          </span>
          <div className="w-8 h-8 rounded-md bg-[var(--primary)] text-[var(--on-primary)]
                          flex items-center justify-center text-xs font-semibold">
            {service.userEmail.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-xs tracking-wider uppercase
                     bg-[var(--bg-elevated)] hover:bg-[var(--border-default)]
                     rounded-md transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
});

export default bindServices(HeaderContent, [HeaderService]);
```

- [ ] **Step 1: Read current header/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

## Chunk 3: Auth Pages (Login, Register)

### Task 4: Restyle Login Page

**File:** `apps/web/src/pages/login/index.tsx`

```tsx
import React from 'react';
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
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-base font-semibold tracking-widest text-[var(--text-primary)] mb-2">
            ZEN_SEND
          </h1>
          <p className="label">SIGN_IN</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label className="label block">EMAIL</label>
            <input
              type="email"
              value={service.email}
              onChange={(e) => { service.email = e.target.value; }}
              placeholder="email@example.com"
              autoComplete="email"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="label block">PASSWORD</label>
            <input
              type="password"
              value={service.password}
              onChange={(e) => { service.password = e.target.value; }}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
              required
            />
          </div>

          {/* Error */}
          {service.error && (
            <p className="text-xs text-[var(--color-error)]">{service.error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full h-12 bg-[var(--primary)] text-[var(--on-primary)]
                       rounded-md font-medium tracking-wider uppercase text-sm
                       hover:bg-[var(--primary-hover)] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'SIGNING_IN...' : 'SIGN_IN'}
          </button>
        </form>

        {/* Link */}
        <p className="text-center text-sm text-[var(--text-secondary)] mt-8">
          No account?{' '}
          <Link to="/register" className="text-[var(--text-primary)] hover:underline">
            SIGN_UP
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(LoginContent, [LoginService]);
```

- [ ] **Step 1: Read current login/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

### Task 5: Restyle Register Page

**File:** `apps/web/src/pages/register/index.tsx`

```tsx
import React from 'react';
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
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-base font-semibold tracking-widest text-[var(--text-primary)] mb-2">
            ZEN_SEND
          </h1>
          <p className="label">CREATE_ACCOUNT</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label className="label block">EMAIL</label>
            <input
              type="email"
              value={service.email}
              onChange={(e) => { service.email = e.target.value; }}
              placeholder="email@example.com"
              autoComplete="email"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="label block">PASSWORD</label>
            <input
              type="password"
              value={service.password}
              onChange={(e) => { service.password = e.target.value; }}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
              required
            />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="label block">CONFIRM_PASSWORD</label>
            <input
              type="password"
              value={service.confirmPassword}
              onChange={(e) => { service.confirmPassword = e.target.value; }}
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
              required
            />
          </div>

          {/* Error */}
          {service.error && (
            <p className="text-xs text-[var(--color-error)]">{service.error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full h-12 bg-[var(--primary)] text-[var(--on-primary)]
                       rounded-md font-medium tracking-wider uppercase text-sm
                       hover:bg-[var(--primary-hover)] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'CREATING...' : 'CREATE_ACCOUNT'}
          </button>
        </form>

        {/* Link */}
        <p className="text-center text-sm text-[var(--text-secondary)] mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--text-primary)] hover:underline">
            SIGN_IN
          </Link>
        </p>
      </div>
    </div>
  );
});

export default bindServices(RegisterContent, [RegisterService]);
```

- [ ] **Step 1: Read current register/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

### Task 6: Restyle Setup Page

**File:** `apps/web/src/pages/setup/index.tsx`

```tsx
import React, { useEffect } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { SetupService } from './setup.service';
import { isElectron } from '../../lib/env';

const SetupContent = observer(() => {
  const service = useService(SetupService);
  const navigate = useNavigate();

  if (!isElectron) {
    navigate('/');
    return null;
  }

  useEffect(() => {
    service.init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await service.saveAndConnect();
    if (success) {
      navigate('/');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-base font-semibold tracking-widest text-[var(--text-primary)] mb-2">
            ZEN_SEND
          </h1>
          <p className="label">SERVER_CONNECTION</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Server URL */}
          <div className="space-y-2">
            <label className="label block">SERVER_URL</label>
            <input
              type="url"
              value={service.serverUrl}
              onChange={(e) => { service.serverUrl = e.target.value; }}
              placeholder="https://zensend.example.com"
              className="w-full h-12 px-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                         rounded-md text-[var(--text-primary)] placeholder-[var(--text-muted)]
                         focus:outline-none focus:border-[var(--border-focus)]"
              required
            />
          </div>

          {/* Error */}
          {service.error && (
            <p className="text-xs text-[var(--color-error)]">{service.error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={service.isLoading}
            className="w-full h-12 bg-[var(--primary)] text-[var(--on-primary)]
                       rounded-md font-medium tracking-wider uppercase text-sm
                       hover:bg-[var(--primary-hover)] transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {service.isLoading ? 'CONNECTING...' : 'CONNECT'}
          </button>
        </form>

        {/* Help text */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-8">
          Contact your administrator for the server address
        </p>
      </div>
    </div>
  );
});

export default bindServices(SetupContent, [SetupService]);
```

- [ ] **Step 1: Read current setup/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

## Chunk 4: Home Page Components

### Task 7: Restyle Send Toolbar

**File:** `apps/web/src/components/send-toolbar/index.tsx`

```tsx
import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { SendToolbarService } from './send-toolbar.service';
import { getZenBridge, browserOpenFileDialog } from '../../lib/zen-bridge';

const SendToolbarContent = observer(() => {
  const service = useService(SendToolbarService);
  const homeService = service.homeService;

  const handleSelectFile = async () => {
    const bridge = getZenBridge();
    if (bridge.openFileDialog) {
      const files = await bridge.openFileDialog({ multiple: true });
      if (files && files.length > 0) {
        service.addFiles(files);
      }
    } else {
      const files = await browserOpenFileDialog({ multiple: true });
      if (files && files.length > 0) {
        service.addFiles(files);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)]
                      rounded-xl p-6 mb-8">
        {/* Action buttons grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Select File */}
          <button
            onClick={handleSelectFile}
            className="flex flex-col items-center gap-2 p-4
                       bg-[var(--bg-elevated)] hover:bg-[var(--border-default)]
                       border border-[var(--border-default)] rounded-lg transition-colors"
          >
            <span className="text-xl">📎</span>
            <span className="label text-[var(--text-secondary)]">SELECT_FILE</span>
          </button>

          {/* Enter Text */}
          <button
            onClick={() => service.openModal('text')}
            className="flex flex-col items-center gap-2 p-4
                       bg-[var(--bg-elevated)] hover:bg-[var(--border-default)]
                       border border-[var(--border-default)] rounded-lg transition-colors"
          >
            <span className="text-xl">✏️</span>
            <span className="label text-[var(--text-secondary)]">ENTER_TEXT</span>
          </button>

          {/* Clipboard */}
          <button
            onClick={() => service.openModal('clipboard')}
            className="flex flex-col items-center gap-2 p-4
                       bg-[var(--bg-elevated)] hover:bg-[var(--border-default)]
                       border border-[var(--border-default)] rounded-lg transition-colors"
          >
            <span className="text-xl">📋</span>
            <span className="label text-[var(--text-secondary)]">CLIPBOARD</span>
          </button>
        </div>

        {/* Selected files */}
        {homeService.selectedFiles.length > 0 && (
          <div className="border-t border-[var(--border-default)] pt-5">
            <div className="label mb-3">
              SELECTED — {homeService.selectedFiles.length} {homeService.selectedFiles.length === 1 ? 'FILE' : 'FILES'}
            </div>
            <div className="flex flex-wrap gap-2">
              {homeService.selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 px-3 py-2
                             bg-[var(--bg-elevated)] border border-[var(--border-default)]
                             rounded-md"
                >
                  <span className="text-sm">📄</span>
                  <span className="text-sm text-[var(--text-primary)] truncate max-w-[120px]">
                    {file.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    onClick={() => homeService.removeFile(index)}
                    className="text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => homeService.clearFiles()}
              className="mt-3 text-xs text-[var(--text-muted)] hover:text-[var(--color-error)] transition-colors"
            >
              CLEAR_ALL
            </button>
          </div>
        )}
      </div>

      {/* Text Modal */}
      {service.modalType === 'text' && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)]
                          rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-medium tracking-wider text-[var(--text-primary)]">
                ENTER_TEXT
              </h3>
              <button
                onClick={() => service.closeModal()}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              <textarea
                value={service.textInput}
                onChange={(e) => service.setTextInput(e.target.value)}
                placeholder="Type something..."
                className="w-full h-40 px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)]
                           rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)]
                           focus:outline-none focus:border-[var(--border-focus)] resize-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border-default)]">
              <button
                onClick={() => service.closeModal()}
                className="px-4 py-2 text-xs tracking-wider uppercase
                           text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => service.submitText()}
                disabled={!service.textInput.trim()}
                className="px-4 py-2 text-xs tracking-wider uppercase
                           bg-[var(--primary)] text-[var(--on-primary)] rounded-md
                           hover:bg-[var(--primary-hover)] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ADD_TEXT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clipboard Modal */}
      {service.modalType === 'clipboard' && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)]
                          rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-medium tracking-wider text-[var(--text-primary)]">
                CLIPBOARD_CONTENT
              </h3>
              <button
                onClick={() => service.closeModal()}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-5">
              {service.clipboardContent ? (
                <textarea
                  value={service.clipboardContent}
                  readOnly
                  className="w-full h-40 px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border-default)]
                             rounded-lg text-[var(--text-primary)] resize-none"
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-[var(--text-muted)]">
                  CLIPBOARD_IS_EMPTY_OR_ACCESS_DENIED
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-[var(--border-default)]">
              <button
                onClick={() => service.closeModal()}
                className="px-4 py-2 text-xs tracking-wider uppercase
                           text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => service.submitClipboard()}
                disabled={!service.clipboardContent?.trim()}
                className="px-4 py-2 text-xs tracking-wider uppercase
                           bg-[var(--primary)] text-[var(--on-primary)] rounded-md
                           hover:bg-[var(--primary-hover)] transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ADD_CLIPBOARD
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default bindServices(SendToolbarContent, [SendToolbarService]);
```

- [ ] **Step 1: Read current send-toolbar/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

### Task 8: Restyle Transfer List

**File:** `apps/web/src/components/transfer-list/index.tsx`

```tsx
import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { TransferListService, type TransferFilter } from './transfer-list.service';
import type { TransferSession, TransferItemType } from '@rabjs/react';

const FILTERS: { label: string; value: TransferFilter }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'FILES', value: 'file' },
  { label: 'TEXT', value: 'text' },
  { label: 'CLIPBOARD', value: 'clipboard' },
];

const TYPE_ICONS: Record<TransferItemType, string> = {
  file: '📄',
  text: '✏️',
  clipboard: '📋',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'JUST_NOW';
  if (minutes < 60) return `${minutes}M_AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H_AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D_AGO`;
}

function getTransferIcon(transfer: TransferSession): string {
  const firstItem = transfer.items?.[0];
  if (firstItem?.type) {
    return TYPE_ICONS[firstItem.type];
  }
  if (transfer.contentType.startsWith('text/') || transfer.originalFileName) {
    return TYPE_ICONS.file;
  }
  return TYPE_ICONS.clipboard;
}

function getTransferName(transfer: TransferSession): string {
  return transfer.items?.[0]?.name || transfer.originalFileName || 'UNKNOWN';
}

// FilterTabs component
const FilterTabsComponent = observer(() => {
  const service = useService(TransferListService);

  return (
    <div className="flex gap-2 mb-4">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => service.setFilter(f.value)}
          className={`px-4 py-2 rounded-md text-xs tracking-wider transition-colors
            ${service.filter === f.value
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
            }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
});

// TransferItem component
const TransferItem = observer(({ transfer }: { transfer: TransferSession }) => {
  const icon = getTransferIcon(transfer);
  const name = getTransferName(transfer);
  const size = formatSize(transfer.totalSize);
  const time = formatRelativeTime(transfer.createdAt);

  return (
    <div className="p-4 bg-[var(--bg-surface)] border border-[var(--border-default)]
                    rounded-lg hover:border-[var(--border-subtle)] transition-colors cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{icon}</span>
          <div className="flex flex-col">
            <span className="text-[var(--text-primary)] font-medium">{name}</span>
            <span className="text-xs text-[var(--text-muted)]">{size}</span>
          </div>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{time}</span>
      </div>
    </div>
  );
});

// EmptyState component
const EmptyStateComponent = observer(() => {
  const service = useService(TransferListService);
  const filterLabel = FILTERS.find((f) => f.value === service.filter)?.label ?? 'ALL';

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <span className="text-4xl mb-4">📭</span>
      <p className="text-[var(--text-muted)]">
        NO_{filterLabel}_TRANSFERS_YET
      </p>
    </div>
  );
});

const TransferListContent = observer(() => {
  const service = useService(TransferListService);

  return (
    <div className="space-y-3">
      <FilterTabsComponent />

      {service.filteredTransfers.length === 0 ? (
        <EmptyStateComponent />
      ) : (
        service.filteredTransfers.map((transfer) => (
          <TransferItem key={transfer.id} transfer={transfer} />
        ))
      )}
    </div>
  );
});

export default bindServices(TransferListContent, [TransferListService]);
```

- [ ] **Step 1: Read current transfer-list/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

### Task 9: Restyle Home Page

**File:** `apps/web/src/pages/home/index.tsx`

```tsx
import React, { useEffect } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService } from './home.service';
import { AuthService } from '../../services/auth.service';
import { SendToolbarService } from '../../components/send-toolbar/send-toolbar.service';
import { TransferListService } from '../../components/transfer-list/transfer-list.service';
import SendToolbar from '../../components/send-toolbar';
import TransferList from '../../components/transfer-list';
import Header from '../../components/header';
import Toast from '../../components/toast';

const HomeContent = observer(() => {
  const service = useService(HomeService);
  const authService = useService(AuthService);
  const navigate = useNavigate();

  if (!authService.isAuthenticated) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    service.loadTransfers();
  }, [service]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <SendToolbar />
        <TransferList />

        {/* Online devices */}
        <div className="mt-10 p-5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
          <h3 className="label mb-2">ONLINE_DEVICES</h3>
          <p className="text-sm text-[var(--text-muted)]">No devices online</p>
        </div>
      </main>

      <Toast />
    </div>
  );
});

export default bindServices(HomeContent, [HomeService, SendToolbarService, TransferListService]);
```

- [ ] **Step 1: Read current home/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

## Chunk 5: Toast Component

### Task 10: Restyle Toast Component

**File:** `apps/web/src/components/toast/index.tsx`

```tsx
import React from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { ToastService } from './toast.service';

const ToastContent = observer(() => {
  const service = useService(ToastService);

  if (service.toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {service.toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg border shadow-lg text-sm
            ${toast.type === 'success'
              ? 'bg-[var(--bg-surface)] border-[var(--color-success)] text-[var(--color-success)]'
              : toast.type === 'error'
              ? 'bg-[var(--bg-surface)] border-[var(--color-error)] text-[var(--color-error)]'
              : toast.type === 'warning'
              ? 'bg-[var(--bg-surface)] border-[var(--color-warning)] text-[var(--color-warning)]'
              : 'bg-[var(--bg-surface)] border-[var(--color-info)] text-[var(--color-info)]'
            }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
});

export default bindServices(ToastContent, [ToastService]);
```

- [ ] **Step 1: Read current toast/index.tsx**

- [ ] **Step 2: Rewrite with new minimal luxury styling**

- [ ] **Step 3: Verify TypeScript compiles**

---

## Chunk 6: Verification

### Task 11: Run TypeScript Check

- [ ] **Step 1: Run `pnpm --filter @zen-send/web typecheck`**

- [ ] **Step 2: Fix any TypeScript errors**

### Task 12: Visual Testing

- [ ] **Step 1: Run `pnpm --filter @zen-send/web dev`**

- [ ] **Step 2: Open browser and verify:**
  - Light mode renders correctly
  - Dark mode (toggle theme) renders correctly
  - All pages (login, register, setup, home) display correctly
  - No console errors

---

## Summary

| Chunk | Tasks | Files |
|-------|-------|-------|
| 1 | 1-2 | `index.css`, `tokens.ts` |
| 2 | 3 | `header/index.tsx` |
| 3 | 4-6 | `login/index.tsx`, `register/index.tsx`, `setup/index.tsx` |
| 4 | 7-9 | `send-toolbar/index.tsx`, `transfer-list/index.tsx`, `home/index.tsx` |
| 5 | 10 | `toast/index.tsx` |
| 6 | 11-12 | Verification |

**Total: 12 tasks across 6 chunks**
