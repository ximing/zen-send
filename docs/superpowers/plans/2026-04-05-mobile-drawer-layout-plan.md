# Mobile Drawer Layout Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform mobile app header-based navigation to drawer-based layout with hamburger menu trigger

**Architecture:** Use react-native-drawer library to wrap main content. The drawer slides from the left with overlay backdrop. Header replaces theme/logout buttons with hamburger icon. Drawer content shows user info, theme toggle, and logout.

**Tech Stack:** react-native-drawer, expo-router, @rabjs/react

---

## Chunk 1: Install Dependencies

### Task 1: Install react-native-drawer

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install react-native-drawer**

Run in `apps/mobile`:
```bash
cd apps/mobile
npx expo install react-native-drawer react-native-gesture-handler
```

Expected: Package added to package.json dependencies

- [ ] **Step 2: Verify installation**

Run: `cat apps/mobile/package.json | grep -A 5 "dependencies"`
Expected: Both react-native-drawer and react-native-gesture-handler present

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore(mobile): add react-native-drawer and gesture-handler

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Create Drawer Component

### Task 2: Create DrawerContent Component

**Files:**
- Create: `apps/mobile/src/components/drawer/drawer-content.tsx`

- [ ] **Step 1: Create drawer content component**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useService, observer } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

function DrawerContentInner() {
  const router = useRouter();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  const handleThemeToggle = () => {
    themeService.toggleTheme();
  };

  const handleLogout = async () => {
    await authService.logout();
    router.replace('/(auth)/login');
  };

  const user = authService.user;
  const serverUrl = authService.serverUrl;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface }]}>
      {/* User Info Section */}
      <View style={[styles.userSection, { borderBottomColor: colors.borderSubtle }]}>
        <View style={[styles.avatar, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>
            {user?.email?.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.username, { color: colors.textPrimary }]}>
          {user?.email?.split('@')[0] ?? 'User'}
        </Text>
        <Text style={[styles.email, { color: colors.textSecondary }]}>
          {user?.email ?? ''}
        </Text>
        <Text style={[styles.serverUrl, { color: colors.textTertiary }]}>
          {serverUrl}
        </Text>
      </View>

      {/* Actions Section */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleThemeToggle}
        >
          <Text style={styles.actionIcon}>{themeService.isDark ? '☀️' : '🌙'}</Text>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            {themeService.isDark ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleLogout}
        >
          <Text style={styles.actionIcon}>🚪</Text>
          <Text style={[styles.actionText, { color: colors.textPrimary }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const DrawerContent = observer(DrawerContentInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  userSection: {
    alignItems: 'center',
    paddingBottom: 24,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    marginBottom: 2,
  },
  serverUrl: {
    fontSize: 12,
  },
  actionsSection: {
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  actionIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  actionText: {
    fontSize: 16,
  },
});

export default observer(DrawerContent);
```

- [ ] **Step 2: Verify file exists**

Run: `ls -la apps/mobile/src/components/drawer/`
Expected: drawer-content.tsx exists

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/drawer/drawer-content.tsx
git commit -m "feat(mobile): add drawer content component with user info and actions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Create Drawer Index Export

**Files:**
- Create: `apps/mobile/src/components/drawer/index.tsx`

- [ ] **Step 1: Create barrel export**

```tsx
export { default as DrawerContent } from './drawer-content';
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/drawer/index.tsx
git commit -m "feat(mobile): export drawer components

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: Modify Header Component

### Task 4: Update Header with Hamburger Menu

**Files:**
- Modify: `apps/mobile/src/components/header/index.tsx`

- [ ] **Step 1: Replace header content**

Replace the entire file content with:

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';

interface HeaderProps {
  onMenuPress: () => void;
  onSearchPress: () => void;
}

function HeaderInner({ onMenuPress, onSearchPress }: HeaderProps) {
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
      <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
        <Text style={[styles.menuIcon, { color: colors.textPrimary }]}>☰</Text>
      </TouchableOpacity>
      <Text style={[styles.logo, { color: colors.textPrimary }]}>ZEN_SEND</Text>
      <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
        <Text style={{ fontSize: 18 }}>🔍</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: 8,
    minWidth: 44,
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: '500',
  },
  logo: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  searchButton: {
    padding: 8,
    minWidth: 44,
    alignItems: 'flex-end',
  },
});

export default observer(HeaderInner);
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/components/header/index.tsx
git commit -m "refactor(mobile): simplify header to hamburger menu and search icons

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Integrate Drawer in Home Screen

### Task 5: Wrap Home Content with Drawer

**Files:**
- Modify: `apps/mobile/app/(main)/index.tsx`

- [ ] **Step 1: Add drawer state and integration**

Replace the import section and HomeContentInner function with:

```tsx
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useService, observer, bindServices } from '@rabjs/react';
import Drawer from 'react-native-drawer';
import { ThemeService } from '../../src/services/theme.service';
import { HomeService } from '../../src/services/home.service';
import Header from '../../src/components/header';
import { DrawerContent } from '../../src/components/drawer';
import FilterTabs from '../../src/components/filter-tabs';
import TransferList from '../../src/components/transfer-list';
import BottomToolbar from '../../src/components/bottom-toolbar';
import SelectedFiles from '../../src/components/selected-files';
import PreviewModal from '../../src/components/preview-modal';
import SearchModal from '../../src/components/search-modal';
import Toast from '../../src/components/toast';
import type { TransferSession } from '@zen-send/shared';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface HomeContentProps {
  homeService: HomeService;
}

function HomeContentInner({ homeService }: HomeContentProps) {
  const themeService = useService(ThemeService);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewTransfer, setPreviewTransfer] = useState<TransferSession | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);

  const handleDownload = async (transfer: TransferSession) => {
    setPreviewTransfer(null);
    const url = await homeService.downloadTransfer(transfer);
    if (url) {
      try {
        if (url.startsWith('http')) {
          const fileName = transfer.items?.[0]?.name ?? 'download';
          const destination = new File(Paths.document, fileName);
          const downloadedFile = await File.downloadFileAsync(url, destination);
          if (downloadedFile.exists && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(downloadedFile.uri);
          }
        } else if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(url);
        }
      } catch (err) {
        console.error('Failed to share download:', err);
      }
    }
  };

  return (
    <Drawer
      type="overlay"
      content={<DrawerContent />}
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      tapToClose={true}
      openDrawerOffset={0}
      panCloseMask={0.6}
      styles={{
        drawer: { backgroundColor: themeService.colors.bgSurface },
        main: { backgroundColor: themeService.colors.bgPrimary },
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: themeService.colors.bgPrimary }]} edges={['top', 'left', 'right', 'bottom']}>
        <Header
          onMenuPress={() => setDrawerOpen(true)}
          onSearchPress={() => setSearchVisible(true)}
        />
        <SelectedFiles />
        <FilterTabs />
        <TransferList
          onItemPress={setPreviewTransfer}
          onPreview={setPreviewTransfer}
          onDownload={handleDownload}
        />
        <BottomToolbar onSearchPress={() => setSearchVisible(true)} />
        <PreviewModal
          transfer={previewTransfer}
          onClose={() => setPreviewTransfer(null)}
          onDownload={handleDownload}
        />
        <SearchModal visible={searchVisible} onClose={() => setSearchVisible(false)} />
        <Toast />
      </SafeAreaView>
    </Drawer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd apps/mobile && pnpm typecheck`
Expected: No errors (or only pre-existing errors)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(main)/index.tsx
git commit -m "feat(mobile): integrate drawer with hamburger menu navigation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 5: Verification

### Task 6: Test the Implementation

- [ ] **Step 1: Run TypeScript check**

Run: `cd apps/mobile && pnpm typecheck`
Expected: PASS (no new errors introduced)

- [ ] **Step 2: Verify all imports work**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | head -30`
Expected: No module resolution errors

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(mobile): complete drawer layout implementation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Summary

**Files Created:**
- `apps/mobile/src/components/drawer/drawer-content.tsx`
- `apps/mobile/src/components/drawer/index.tsx`

**Files Modified:**
- `apps/mobile/package.json` (dependencies)
- `pnpm-lock.yaml`
- `apps/mobile/src/components/header/index.tsx`
- `apps/mobile/app/(main)/index.tsx`

**New Dependencies:**
- react-native-drawer
- react-native-gesture-handler
