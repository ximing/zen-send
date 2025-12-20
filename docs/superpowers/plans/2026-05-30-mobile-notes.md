# Mobile Notes 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Mobile 端通过 WebView 内嵌 Web 编辑器实现完整笔记能力（块编辑、语法高亮、Yjs 实时协作）。

**Architecture:** Web 端新增 `/notes/embed/:id?access_token=<jwt>&user_id=<id>&user_name=<name>` 路由，渲染去掉导航壳的 `NoteEditor`；Mobile 端 `NoteEditorScreen` 用 `WebView` 加载该路由；`NoteListScreen` 通过 REST API 管理笔记列表。

**Tech Stack:** react-native-webview, @rabjs/react Service 模式, Expo Router file-based 路由, react-native-gesture-handler Swipeable

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|------|------|
| `apps/web/src/pages/notes-embed/embed-auth.service.ts` | 从 URL 读取 token 并注入 AuthService + SocketService |
| `apps/web/src/pages/notes-embed/index.tsx` | Embed 页面 shell，渲染 NoteEditor |
| `apps/mobile/src/services/note.service.ts` | 笔记列表 REST CRUD |
| `apps/mobile/app/(main)/notes/index.tsx` | 笔记列表 Screen |
| `apps/mobile/app/(main)/notes/[id].tsx` | 编辑器 Screen（WebView） |

### 修改文件

| 文件 | 改动 |
|------|------|
| `apps/web/src/app.tsx` | 注册 `/notes/embed/:id` 路由 |
| `apps/web/src/main.tsx` | register(EmbedAuthService) |
| `apps/mobile/app/_layout.tsx` | register(NoteService) |
| `apps/mobile/src/components/drawer/drawer-content.tsx` | 添加 Notes 入口 |

---

## Task 1：安装 react-native-webview

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: 安装依赖**

```bash
cd apps/mobile && npx expo install react-native-webview
```

Expected: 输出安装成功，`package.json` 新增 `"react-native-webview"` 条目。

- [ ] **Step 2: 验证**

```bash
cd apps/mobile && pnpm typecheck
```

Expected: 无报错（此时 WebView 尚未使用）。

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore(mobile): add react-native-webview dependency"
```

---

## Task 2：Web - EmbedAuthService

**Files:**
- Create: `apps/web/src/pages/notes-embed/embed-auth.service.ts`

- [ ] **Step 1: 创建 EmbedAuthService**

```typescript
// apps/web/src/pages/notes-embed/embed-auth.service.ts
import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';

export class EmbedAuthService extends Service {
  ready = false;

  get authService() {
    return this.resolve(AuthService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  initFromToken(accessToken: string, userId: string, userName: string): void {
    this.authService.accessToken = accessToken;
    this.authService.user = { id: userId, email: '', nickname: userName };
    this.socketService.connect();
    this.ready = true;
  }
}
```

- [ ] **Step 2: 注册为全局 Service（在 main.tsx）**

在 `apps/web/src/main.tsx` 中，已有 `register(NoteCollabService);` 后面加：

```typescript
import { EmbedAuthService } from './pages/notes-embed/embed-auth.service';
// ...（已有 imports）

// 在 register(NoteCollabService); 后添加：
register(EmbedAuthService);
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @zen-send/web typecheck
```

Expected: 无报错。

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/notes-embed/embed-auth.service.ts apps/web/src/main.tsx
git commit -m "feat(web): add EmbedAuthService for WebView token injection"
```

---

## Task 3：Web - NoteEmbedPage + 路由注册

**Files:**
- Create: `apps/web/src/pages/notes-embed/index.tsx`
- Modify: `apps/web/src/app.tsx`

- [ ] **Step 1: 创建 NoteEmbedPage**

```tsx
// apps/web/src/pages/notes-embed/index.tsx
import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { observer, useService } from '@rabjs/react';
import { EmbedAuthService } from './embed-auth.service';
import { NoteService } from '../../services/note.service';
import NoteEditor from '../notes/components/note-editor';

function NoteEmbedPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const embedAuthService = useService(EmbedAuthService);
  const noteService = useService(NoteService);

  useEffect(() => {
    if (!id) return;
    const accessToken = searchParams.get('access_token') ?? '';
    const userId = searchParams.get('user_id') ?? '';
    const userName = decodeURIComponent(searchParams.get('user_name') ?? 'Mobile User');
    if (accessToken && !embedAuthService.ready) {
      embedAuthService.initFromToken(accessToken, userId, userName);
      noteService.loadNote(id);
    }
  }, []);

  if (!embedAuthService.ready) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          加载中...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--bg-primary)' }}>
      <NoteEditor />
    </div>
  );
}

export default observer(NoteEmbedPage);
```

- [ ] **Step 2: 注册路由到 app.tsx**

在 `apps/web/src/app.tsx` 中，找到 `<Route path="/notes/shared/:token" element={<SharedNotePage />} />` 这一行，在其后添加：

```tsx
import NoteEmbedPage from './pages/notes-embed';

// 在 SharedNotePage 路由下方添加（同级，在 AppLayout 外）：
<Route path="/notes/embed/:id" element={<NoteEmbedPage />} />
```

完整 Routes 片段（仅展示 auth-free 路由部分）：

```tsx
{/* Auth routes - no AppLayout */}
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/setup" element={<SetupPage />} />
<Route path="/notes/shared/:token" element={<SharedNotePage />} />
<Route path="/notes/embed/:id" element={<NoteEmbedPage />} />
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @zen-send/web typecheck
```

Expected: 无报错。

- [ ] **Step 4: 在浏览器手动验证**

1. 运行 `pnpm dev:web` 和 `pnpm dev:server`
2. 先在正常 web 登录，从 localStorage 获取 access_token（DevTools → Application → Local Storage → `zen_send_tokens` → 复制 `accessToken`）
3. 先创建一个笔记，记录其 ID（URL 中可见）
4. 新开 tab 访问：`http://localhost:5274/#/notes/embed/<note-id>?access_token=<token>&user_id=test&user_name=TestUser`
5. Expected: 全屏编辑器加载，可以输入，title 显示正确

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/notes-embed/index.tsx apps/web/src/app.tsx
git commit -m "feat(web): add /notes/embed/:id route for mobile WebView"
```

---

## Task 4：Mobile - NoteService

**Files:**
- Create: `apps/mobile/src/services/note.service.ts`

- [ ] **Step 1: 创建 NoteService**

```typescript
// apps/mobile/src/services/note.service.ts
import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import type { NoteListItem, NoteDetail } from '@zen-send/dto';

export class NoteService extends Service {
  notes: NoteListItem[] = [];

  get apiService() {
    return this.resolve(ApiService);
  }

  async loadNoteList(): Promise<void> {
    this.notes = await this.apiService.get<NoteListItem[]>('/api/notes');
  }

  async createNote(): Promise<NoteListItem> {
    const note = await this.apiService.post<NoteDetail>('/api/notes', {});
    const listItem: NoteListItem = {
      id: note.id,
      title: note.title,
      sortOrder: note.sortOrder,
      updatedAt: note.updatedAt,
    };
    this.notes.unshift(listItem);
    return listItem;
  }

  async deleteNote(id: string): Promise<void> {
    await this.apiService.delete<void>(`/api/notes/${id}`);
    this.notes = this.notes.filter((n) => n.id !== id);
  }
}
```

- [ ] **Step 2: 在 app/_layout.tsx 注册**

在 `apps/mobile/app/_layout.tsx` 中，找到 `register(UserService);` 后添加：

```typescript
import { NoteService } from '../src/services/note.service';

// 在 register(UserService); 后添加：
register(NoteService);
```

- [ ] **Step 3: typecheck**

```bash
pnpm --filter @zen-send/mobile typecheck
```

Expected: 无报错。

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/note.service.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): add NoteService for note list CRUD"
```

---

## Task 5：Mobile - NoteListScreen

**Files:**
- Create: `apps/mobile/app/(main)/notes/index.tsx`

- [ ] **Step 1: 创建 NoteListScreen**

```tsx
// apps/mobile/app/(main)/notes/index.tsx
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useService, observer } from '@rabjs/react';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { NoteService } from '../../../src/services/note.service';
import { ThemeService } from '../../../src/services/theme.service';
import { showToast } from '../../../src/components/toast';
import type { NoteListItem } from '@zen-send/dto';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() / 1000 - timestamp;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  const d = new Date(timestamp * 1000);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function NoteListScreenInner() {
  const router = useRouter();
  const noteService = useService(NoteService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;

  useEffect(() => {
    noteService.loadNoteList();
  }, []);

  const handleCreate = async () => {
    try {
      const note = await noteService.createNote();
      router.push(`/(main)/notes/${note.id}`);
    } catch {
      showToast('创建笔记失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await noteService.deleteNote(id);
    } catch {
      showToast('删除失败');
    }
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: '#FF3B30' }]}
      onPress={() => handleDelete(id)}
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: NoteListItem }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <TouchableOpacity
        style={[styles.item, { backgroundColor: colors.bgSurface }]}
        onPress={() => router.push(`/(main)/notes/${item.id}`)}
        activeOpacity={0.7}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.title || '未命名笔记'}
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatRelativeTime(item.updatedAt)}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>笔记</Text>
        <TouchableOpacity onPress={handleCreate} style={styles.addButton}>
          <Ionicons name="add" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {noteService.notes.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>还没有笔记</Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.accent }]}
            onPress={handleCreate}
          >
            <Text style={styles.emptyButtonText}>新建笔记</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={noteService.notes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginRight: 8 },
  heading: { flex: 1, fontSize: 17, fontWeight: '600' },
  addButton: { padding: 4 },
  list: { paddingTop: 8, paddingHorizontal: 16 },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 15, fontWeight: '500', flex: 1, marginRight: 12 },
  time: { fontSize: 12 },
  deleteAction: {
    width: 72,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 15 },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default observer(NoteListScreenInner);
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @zen-send/mobile typecheck
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(main)/notes/index.tsx"
git commit -m "feat(mobile): add NoteListScreen"
```

---

## Task 6：Mobile - NoteEditorScreen

**Files:**
- Create: `apps/mobile/app/(main)/notes/[id].tsx`

- [ ] **Step 1: 创建 NoteEditorScreen**

```tsx
// apps/mobile/app/(main)/notes/[id].tsx
import { View, StyleSheet, Platform, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useEffect } from 'react';
import { KeyboardAvoidingView } from 'react-native';
import WebView from 'react-native-webview';
import { useService, observer } from '@rabjs/react';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../../../src/services/auth.service';
import { ThemeService } from '../../../src/services/theme.service';

function NoteEditorScreenInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const authService = useService(AuthService);
  const themeService = useService(ThemeService);
  const colors = themeService.colors;
  const webViewRef = useRef<WebView>(null);
  const prevTokenRef = useRef(authService.accessToken);

  // Reload WebView if token refreshes
  useEffect(() => {
    if (prevTokenRef.current !== authService.accessToken) {
      prevTokenRef.current = authService.accessToken;
      webViewRef.current?.reload();
    }
  }, [authService.accessToken]);

  const displayName = encodeURIComponent(
    authService.user?.nickname ?? authService.user?.email ?? 'Mobile User'
  );
  const userId = authService.user?.id ?? '';
  const token = authService.accessToken ?? '';

  // In production the web app is served from the same server.
  // In dev, replace serverUrl port with 5274 (web dev server) or run `pnpm build` first.
  const embedUrl = `${authService.serverUrl}/#/notes/embed/${id}?access_token=${token}&user_id=${userId}&user_name=${displayName}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Minimal header: just a back button */}
      <View style={[styles.header, { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderSubtle }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]} numberOfLines={1}>
          编辑中
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <WebView
          ref={webViewRef}
          source={{ uri: embedUrl }}
          style={styles.flex}
          allowsInlineMediaPlayback
          keyboardDisplayRequiresUserAction={false}
          scrollEnabled={false}
          contentInsetAdjustmentBehavior="never"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 14 },
});

export default observer(NoteEditorScreenInner);
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @zen-send/mobile typecheck
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(main)/notes/[id].tsx"
git commit -m "feat(mobile): add NoteEditorScreen with WebView embed"
```

---

## Task 7：Mobile - Drawer 导航入口

**Files:**
- Modify: `apps/mobile/src/components/drawer/drawer-content.tsx`

- [ ] **Step 1: 在 Drawer 的 actionsSection 中添加 Notes 入口**

找到 `drawer-content.tsx` 中的 `actionsSection` View，当前只有 Downloads 入口。在 Downloads 入口**之前**添加 Notes：

```tsx
{/* actionsSection 内，handleDownloads 按钮上方添加： */}
<TouchableOpacity
  style={styles.actionButton}
  onPress={() => {
    onClose?.();
    router.push('/(main)/notes');
  }}
>
  <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} />
  <Text style={[styles.actionText, { color: colors.textPrimary }]}>笔记</Text>
</TouchableOpacity>
```

- [ ] **Step 2: typecheck**

```bash
pnpm --filter @zen-send/mobile typecheck
```

Expected: 无报错。

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/drawer/drawer-content.tsx
git commit -m "feat(mobile): add Notes entry to drawer navigation"
```

---

## Task 8：联调验证

- [ ] **Step 1: 启动服务**

```bash
# 终端 1：启动 server
pnpm dev:server

# 终端 2：构建 web 并让 server 提供静态文件（生产模式联调）
cd apps/web && pnpm build

# 或开发模式联调（跳过 build，web 独立运行）：
pnpm dev:web
```

- [ ] **Step 2: 启动 Mobile**

```bash
pnpm dev:mobile
```

- [ ] **Step 3: 验证笔记列表**

1. 打开 App，登录后从 Drawer 点击「笔记」
2. Expected：跳转 NoteListScreen，显示已有笔记列表（或空态）
3. 点击 `+` 创建新笔记 → Expected：创建成功，跳转编辑器

- [ ] **Step 4: 验证编辑器加载**

1. 编辑器 WebView 应加载，显示 CodeMirror 编辑界面
2. 在编辑器内输入文字 → Expected：内容正常显示，无明显卡顿
3. **注意**：开发模式下，`serverUrl` 指向 server(3110) 但 web app 在 5274；需将手机/模拟器的 serverUrl 设置为 `http://localhost:5274`，或先 build web。

- [ ] **Step 5: 验证实时协作**

1. 同时在 Web 端打开同一笔记
2. 在 Mobile 输入文字 → Expected：Web 端实时同步显示

- [ ] **Step 6: 验证左滑删除**

1. 在 NoteListScreen 左滑一条笔记 → Expected：出现红色删除按钮
2. 点击删除 → Expected：笔记从列表消失

---

## 已知限制（不在本次范围）

- embed 编辑器内的「分享」按钮在 WebView 中功能受限（打开 web 内 modal，不影响主功能）
- embed 编辑器左上角的「返回」按钮会在 WebView 内跳转到 web 笔记列表，而非返回 Native
- 生产 vs 开发的 serverUrl 差异（开发需手动指向 web dev server `5274`）
- 离线编辑（WebView 无网络时的降级处理）
