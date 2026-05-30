# Mobile Notes 功能设计

**日期**：2026-05-30  
**状态**：待实现

---

## 背景与目标

Web 端已有完整的笔记功能：基于 CodeMirror 6 的多语言块编辑器、Yjs 实时协作、语法高亮、笔记列表管理。Mobile 端目前没有笔记入口。

目标：Mobile 端完整对标 Web 端笔记能力，包括块编辑、语法高亮、实时协作。

---

## 核心约束

CodeMirror 6 依赖浏览器 DOM，无法在 React Native 中直接运行。因此 Mobile 不重新实现编辑器，而是通过 WebView 内嵌 Web 端编辑器，复用全部编辑器逻辑。

---

## 整体架构

```
Mobile App                                      Web App
────────────────────────────────────────────────────────────
NoteService            REST /api/notes          已有后端（零改动）
  loadNoteList()      ──────────────►
  createNote()
  deleteNote()

NoteListScreen

NoteEditorScreen
  └─ WebView ──── GET /notes/embed/:id ────►   NoteEmbedPage（新增）
                  ?access_token=<jwt>            └─ EmbedAuthService（新增）
                                                 └─ NoteEditor（零改动）
                                                 └─ NoteCollabService（零改动）
```

Web 端新增一个 embed 页面，**所有编辑器逻辑、Yjs 协作、Socket.io 均零改动**，Mobile 端是纯壳子。

---

## Web 端改动

### 新增路由 `/notes/embed/:id`

新增 `NoteEmbedPage`，负责：

1. 从 `location.search` 读取 `access_token`
2. 通过 `EmbedAuthService` 将 token 注入 `ApiService`（Authorization header）和 `SocketService`（握手 auth）
3. 等待 auth 注入完成后渲染 `NoteEditor`（组件本身零改动）
4. 样式：隐藏侧边栏、隐藏顶部导航壳、隐藏分享按钮、全屏铺满，适配移动端字号

### EmbedAuthService

```ts
// apps/web/src/pages/notes-embed/embed-auth.service.ts
export class EmbedAuthService extends Service {
  ready = false

  init(accessToken: string): void {
    // 注入 ApiService default header
    // 注入 SocketService auth token
    this.ready = true
  }
}
```

### 新增文件

```
apps/web/src/pages/notes-embed/
├── index.tsx             # EmbedPage：读 token → 初始化 EmbedAuthService → 渲染 NoteEditor
└── embed-auth.service.ts # token 注入逻辑
apps/web/src/router.tsx   # 注册 /notes/embed/:id 路由
```

---

## Mobile 端改动

### NoteService

镜像 Web 端的 REST 操作，不含编辑器状态：

```ts
// apps/mobile/src/services/note.service.ts
export class NoteService extends Service {
  notes: NoteListItem[] = []

  get apiService() { return this.resolve(ApiService) }

  async loadNoteList(): Promise<void>
  async createNote(): Promise<NoteListItem>
  async deleteNote(id: string): Promise<void>
}
```

在 `app/_layout.tsx` 全局注册。

### NoteListScreen

路径：`app/(main)/notes/index.tsx`

- 笔记列表，每行显示 title + 相对更新时间
- 右上角 `+` 按钮：调用 `noteService.createNote()`，创建后跳转编辑器
- 左滑删除（`Swipeable` 或 `ReanimatedSwipeable`）
- 空态：引导文案 + 创建按钮

### NoteEditorScreen

路径：`app/(main)/notes/[id].tsx`

- 全屏 `WebView`，加载：
  ```
  ${SERVER_URL}/notes/embed/${id}?access_token=${authService.accessToken}
  ```
- `KeyboardAvoidingView` 包裹，`behavior="padding"`（iOS）/ `"height"`（Android）
- 顶部 Back 按钮返回列表
- Token 刷新处理：监听 `authService.accessToken` 变化，变化时调用 `webviewRef.current?.reload()`

### 导航集成

**Drawer**（`src/components/drawer/drawer-content.tsx`）：
- 加入 Notes 入口，图标 `Ionicons "document-text-outline"`，点击跳转 `/(main)/notes`

**Stack Layout**（`app/(main)/_layout.tsx`）：
- 添加两个 Screen：
  ```tsx
  <Stack.Screen name="notes/index" />
  <Stack.Screen name="notes/[id]" />
  ```

### 新增文件

```
app/(main)/notes/
├── index.tsx                              # NoteListScreen
└── [id].tsx                               # NoteEditorScreen（WebView）
apps/mobile/src/services/note.service.ts  # NoteService（REST CRUD）
```

### 改动文件

```
app/(main)/_layout.tsx                              # 注册 NoteService，添加 Stack.Screen
apps/mobile/src/components/drawer/drawer-content.tsx  # 添加 Notes 入口
```

---

## Auth Token 安全与刷新

| 问题 | 处理方式 |
|------|---------|
| Token 出现在 URL | Expo WebView 不记录 WebView 内部 URL 到 OS history；生产环境使用 HTTPS，明文风险可控 |
| Token 过期（access token 短期） | `NoteEditorScreen` 订阅 `authService.accessToken`，token 刷新时重载 WebView |
| 401 响应 | Web embed 页捕获 ApiService 401 错误，postMessage 通知 Native（可选增强） |

---

## 不在本次范围内

- Mobile 端笔记分享功能（后续迭代）
- 离线编辑（WebView 无网络时的降级）
- 笔记排序拖拽

---

## 实现顺序建议

1. Web：新增 `/notes/embed/:id` 路由 + `EmbedAuthService`，在浏览器验证 token 注入正常
2. Mobile：`NoteService` + `NoteListScreen`（先用真实 API 跑通列表）
3. Mobile：`NoteEditorScreen` WebView 接入，验证编辑器加载 + 协作正常
4. Mobile：导航集成（Drawer 入口 + Stack Screen）
5. 联调：token 刷新、键盘避让、返回时保存状态
