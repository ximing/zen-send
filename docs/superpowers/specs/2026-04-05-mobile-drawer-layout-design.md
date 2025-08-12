# Mobile Drawer Layout Design

## Overview

Transform the mobile app's main layout from the current header-based navigation to a drawer-based layout with a hamburger menu trigger.

## Layout Structure

### New Main Screen Layout

```
┌─────────────────────────────────────┐
│ ☰        ZEN_SEND           [🔍]  │  ← Header: 左侧抽屉按钮，右侧搜索
├─────────────────────────────────────┤
│                                     │
│          主内容区域                   │
│      (TransferList / 搜索结果)        │
│                                     │
├─────────────────────────────────────┤
│         BottomToolbar                │
└─────────────────────────────────────┘
```

### Drawer Content (Left Side)

```
┌─────────────────┐
│    [头像]        │  ← 用户头像（圆形，约 64px）
│    用户名        │
│    邮箱         │
│    服务器地址    │
│─────────────────│
│ 🌙 主题         │  ← 简单切换按钮
│ 🚪 退出登录      │
└─────────────────┘
     宽度：~280px
```

## Components

### 1. Header Component (`apps/mobile/src/components/header/index.tsx`)

**Changes:**
- Replace current theme toggle and logout buttons with hamburger menu icon
- Add search icon on the right (existing behavior)
- Hamburger icon triggers drawer open

**New Props:**
- `onMenuPress: () => void` - Opens the drawer

### 2. Drawer Component (New)

**Location:** `apps/mobile/src/components/drawer/index.tsx`

**Content:**
- User avatar (placeholder image or initials)
- Username and email from `AuthService.user`
- Server URL from `AuthService.serverUrl`
- Theme toggle button (Light/Dark)
- Logout button

**Behavior:**
- Slides in from left
- Semi-transparent backdrop overlay
- Close on backdrop tap
- Close on logout navigation

### 3. Drawer Service (New) - Optional

**Location:** `apps/mobile/src/services/drawer.service.ts`

If drawer state management becomes complex, create a simple service. Otherwise, can be controlled via local component state passed from parent.

## Implementation Approach

**Library:** `react-native-drawer`

```bash
cd apps/mobile
npx expo install react-native-drawer
```

**Integration with Expo Router:**

The drawer wraps the main screen content. The Expo Router Stack remains unchanged.

```tsx
// Conceptual integration in (main)/_layout.tsx or index.tsx
import Drawer from 'react-native-drawer';

// Wrap the main content with Drawer
<Drawer
  type="overlay"
  content={<DrawerContent />}
  open={drawerOpen}
  onClose={() => setDrawerOpen(false)}
  tapToClose={true}
>
  <MainContent />
</Drawer>
```

## File Changes

### Modified Files

1. `apps/mobile/src/components/header/index.tsx`
   - Replace theme/logout buttons with hamburger menu
   - Accept `onMenuPress` callback
   - Keep search icon behavior

2. `apps/mobile/app/(main)/index.tsx`
   - Integrate drawer wrapper around content
   - Pass drawer control to Header

### New Files

1. `apps/mobile/src/components/drawer/index.tsx` - Drawer content component
2. `apps/mobile/src/components/drawer/drawer-content.tsx` - User info, theme, logout sections

## State Management

- `drawerOpen`: boolean state in HomeScreen or DrawerService
- Controlled via `setDrawerOpen` callback passed to Header's hamburger button

## Error Handling

- If user is not authenticated, drawer still shows but logout redirects to login
- Theme preference persisted via existing `ThemeService`
