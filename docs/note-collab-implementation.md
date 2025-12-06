# 笔记实时协作 — Yjs 细化实施方案

> 文档版本：2026-05-26  
> 技术栈：Yjs 13.x + y-codemirror.next + y-socket.io + Socket.io v4 + CodeMirror 6

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────┐
│  Client A (CodeMirror 6)                                │
│   YText ──► y-codemirror.next ──► CM6 ViewPlugin        │
│   Y.Doc  ──► SocketIOProvider ──► Socket.io client      │
└───────────────────────┬─────────────────────────────────┘
                        │  Socket events:
                        │  yjs:join / yjs:update / yjs:awareness
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Server (Express + Socket.io)                           │
│   Map<noteId, Y.Doc>  ──► 内存中维护文档状态             │
│   debounce persist ──► notes.yjs_state (MEDIUMBLOB)     │
│   notes.content ──► 明文快照（全文搜索/备份用）          │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│  Client B (CodeMirror 6) — 同上                         │
└─────────────────────────────────────────────────────────┘
```

### 数据流说明

1. **用户输入** → CM6 Transaction → y-codemirror.next 转换为 YText 操作
2. **YText 操作** → Yjs 编码为 `Uint8Array` binary update
3. **Binary update** → SocketIOProvider → `yjs:update` Socket 事件 → Server
4. **Server** → `Y.applyUpdate(doc, update)` → 广播给同 room 其他 client
5. **Server** → 防抖 5s → 持久化 `yjs_state` 到 DB（同时提取明文存 `content`）
6. **新 client 加入** → `yjs:join` → Server 返回 `yjs:sync`（当前完整状态）

---

## 二、依赖安装

### 前端 (`apps/web`)

```bash
pnpm --filter @zen-send/web add yjs y-codemirror.next y-socket.io
```

| 包 | 版本约束 | 用途 |
|----|---------|------|
| `yjs` | `^13.6` | CRDT 核心，YText 文档类型 |
| `y-codemirror.next` | `^0.3` | CM6 binding（ViewPlugin + Awareness decoration） |
| `y-socket.io` | `^2.0` | Socket.io Provider，处理 sync 和 awareness |

### 服务端 (`apps/server`)

```bash
pnpm --filter @zen-send/server add yjs
```

服务端只需 `yjs` 核心做文档合并，不需要 provider 库。

---

## 三、数据库变更

### Migration：`notes` 表新增 `yjs_state`

```sql
ALTER TABLE notes
  ADD COLUMN yjs_state MEDIUMBLOB NULL COMMENT 'Yjs binary state (Y.encodeStateAsUpdate)';
```

**字段说明：**
- `MEDIUMBLOB`：最大 16MB，足够存储大型笔记的 Yjs state
- 初始为 `NULL`：旧笔记首次被协作编辑时自动迁移
- `content` 字段保留：作为明文快照，用于列表展示、全文搜索

### Drizzle Schema 更新

```typescript
// apps/server/src/db/schema.ts
export const notes = mysqlTable('notes', {
  id: varchar('id', { length: 30 }).primaryKey(),
  userId: varchar('user_id', { length: 30 }).notNull(),
  title: varchar('title', { length: 100 }).notNull().default(''),
  content: text('content').notNull().default(''),
  yjsState: mediumblob('yjs_state'),           // 新增
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: int('created_at').notNull(),
  updatedAt: int('updated_at').notNull(),
});
```

---

## 四、服务端实现

### 4.1 NoteCollabService

新建 `apps/server/src/services/note-collab.service.ts`：

```typescript
import * as Y from 'yjs';
import { Service } from 'typedi';
import { DbService } from './db.service.js';
import { logger } from '@zen-send/logger';
import { eq } from 'drizzle-orm';
import { notes } from '../db/schema.js';

@Service()
export class NoteCollabService {
  // noteId → Y.Doc 内存缓存
  private docs = new Map<string, Y.Doc>();
  // noteId → 防抖定时器
  private persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private db: DbService) {}

  /**
   * 获取或初始化 note 对应的 Y.Doc
   * 首次访问时从 DB 加载已持久化的 yjs_state
   */
  async getOrCreateDoc(noteId: string): Promise<Y.Doc> {
    if (this.docs.has(noteId)) {
      return this.docs.get(noteId)!;
    }

    const doc = new Y.Doc();

    // 从 DB 加载已有状态
    const row = await this.db.drizzle
      .select({ yjsState: notes.yjsState, content: notes.content })
      .from(notes)
      .where(eq(notes.id, noteId))
      .limit(1)
      .then((r) => r[0]);

    if (row?.yjsState) {
      // 已有 Yjs state，直接还原
      Y.applyUpdate(doc, new Uint8Array(row.yjsState));
    } else if (row?.content) {
      // 旧笔记（无 yjs_state）：用现有 content 初始化 YText
      const ytext = doc.getText('content');
      doc.transact(() => {
        ytext.insert(0, row.content);
      });
    }

    this.docs.set(noteId, doc);
    return doc;
  }

  /**
   * 应用来自客户端的 update，并广播 + 触发防抖持久化
   */
  applyUpdate(noteId: string, update: Uint8Array): void {
    const doc = this.docs.get(noteId);
    if (!doc) return;

    Y.applyUpdate(doc, update);
    this.schedulePersist(noteId, doc);
  }

  /**
   * 将当前 doc 状态编码为 update（用于新 client 同步）
   */
  encodeStateAsUpdate(noteId: string): Uint8Array | null {
    const doc = this.docs.get(noteId);
    if (!doc) return null;
    return Y.encodeStateAsUpdate(doc);
  }

  /**
   * 防抖 5 秒后持久化到 DB
   */
  private schedulePersist(noteId: string, doc: Y.Doc): void {
    const existing = this.persistTimers.get(noteId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        const yjsState = Buffer.from(Y.encodeStateAsUpdate(doc));
        const content = doc.getText('content').toString();
        const now = Math.floor(Date.now() / 1000);

        await this.db.drizzle
          .update(notes)
          .set({ yjsState, content, updatedAt: now })
          .where(eq(notes.id, noteId));

        logger.debug({ noteId }, 'Yjs state persisted');
      } catch (err) {
        logger.error({ err, noteId }, 'Failed to persist Yjs state');
      } finally {
        this.persistTimers.delete(noteId);
      }
    }, 5000);

    this.persistTimers.set(noteId, timer);
  }

  /**
   * 释放内存中的 Y.Doc（长期无活跃连接时调用）
   */
  releaseDoc(noteId: string): void {
    const doc = this.docs.get(noteId);
    if (doc) {
      doc.destroy();
      this.docs.delete(noteId);
    }
    const timer = this.persistTimers.get(noteId);
    if (timer) {
      clearTimeout(timer);
      this.persistTimers.delete(noteId);
    }
  }
}
```

### 4.2 Socket 事件扩展

在 `apps/server/src/socket/socket.ts` 的 `io.on('connection', ...)` 内追加笔记协作事件：

```typescript
import { NoteCollabService } from '../services/note-collab.service.js';
import { NoteService } from '../services/note.service.js';

// ── 笔记协作事件 ──────────────────────────────────

/**
 * 客户端加入 note room，Server 返回当前完整文档状态
 * payload: { noteId: string }
 */
socket.on('note:collab:join', async (data: { noteId: string }) => {
  const { noteId } = data;
  const userId = socket.user?.userId;
  if (!userId) return;

  // 鉴权：确认用户有权访问该笔记
  const noteService = Container.get(NoteService);
  const note = await noteService.getNoteById(noteId, userId);
  if (!note) {
    socket.emit('note:collab:error', { noteId, message: 'Note not found' });
    return;
  }

  // 加入 note room
  socket.join(`note:${noteId}`);

  // 获取或初始化 Y.Doc
  const collabService = Container.get(NoteCollabService);
  const doc = await collabService.getOrCreateDoc(noteId);

  // 将完整状态同步给新加入的 client
  const stateUpdate = Y.encodeStateAsUpdate(doc);
  socket.emit('note:collab:sync', {
    noteId,
    update: Array.from(stateUpdate),  // Array<number> 便于 JSON 传输
  });

  logger.info({ socketId: socket.id, noteId, userId }, 'Client joined note room');
});

/**
 * 客户端广播 Yjs update
 * payload: { noteId: string; update: number[] }
 */
socket.on('note:collab:update', (data: { noteId: string; update: number[] }) => {
  const { noteId, update } = data;
  const userId = socket.user?.userId;
  if (!userId) return;

  const updateBytes = new Uint8Array(update);
  const collabService = Container.get(NoteCollabService);

  // 应用 update 到服务端 doc
  collabService.applyUpdate(noteId, updateBytes);

  // 广播给同 room 的其他 client（排除发送者）
  socket.to(`note:${noteId}`).emit('note:collab:update', { noteId, update });
});

/**
 * 客户端广播 Awareness（光标/选区/用户信息）
 * payload: { noteId: string; awareness: number[] }
 */
socket.on('note:collab:awareness', (data: { noteId: string; awareness: number[] }) => {
  const { noteId, awareness } = data;
  // Awareness 不持久化，直接转发
  socket.to(`note:${noteId}`).emit('note:collab:awareness', { noteId, awareness });
});

/**
 * 客户端离开 note room
 */
socket.on('note:collab:leave', (data: { noteId: string }) => {
  socket.leave(`note:${data.noteId}`);
  logger.debug({ socketId: socket.id, noteId: data.noteId }, 'Client left note room');
});

// disconnect 时自动离开所有 room（Socket.io 原生行为，无需额外处理）
```

> **注意**：`NoteService.getNoteById` 需新增一个支持传入 `userId` 的公开方法（现有方法已有此逻辑，暴露即可）。

---

## 五、前端实现

### 5.1 NoteCollabService

新建 `apps/web/src/services/note-collab.service.ts`：

```typescript
import { Service } from '@rabjs/react';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { SocketService } from './socket.service';

export interface CollabUser {
  name: string;
  color: string;
  clientId: number;
}

export class NoteCollabService extends Service {
  // 当前连接的 noteId
  activeNoteId: string | null = null;
  // 在线协作者（来自 Awareness）
  collaborators: CollabUser[] = [];
  // 是否已同步完成
  synced = false;

  private doc: Y.Doc | null = null;
  private awareness: awarenessProtocol.Awareness | null = null;
  private _cleanup: (() => void) | null = null;

  private get socketService() {
    return this.resolve(SocketService);
  }

  /**
   * 初始化协作会话，返回 { ytext, awareness }
   * 由 note-editor 在挂载时调用
   */
  joinNote(noteId: string, userName: string, userColor: string): {
    ytext: Y.Text;
    awareness: awarenessProtocol.Awareness;
  } {
    // 清理旧会话
    this.leaveNote();

    const doc = new Y.Doc();
    const ytext = doc.getText('content');
    const awareness = new awarenessProtocol.Awareness(doc);

    this.doc = doc;
    this.awareness = awareness;
    this.activeNoteId = noteId;
    this.synced = false;

    // 设置本地用户信息（用于光标显示）
    awareness.setLocalState({
      user: { name: userName, color: userColor },
    });

    const socket = this.socketService.socket;
    if (!socket) return { ytext, awareness };

    // ── 接收初始全量同步 ────────────────────────
    const onSync = (data: { noteId: string; update: number[] }) => {
      if (data.noteId !== noteId) return;
      Y.applyUpdate(doc, new Uint8Array(data.update));
      this.synced = true;
    };

    // ── 接收增量 update ─────────────────────────
    const onUpdate = (data: { noteId: string; update: number[] }) => {
      if (data.noteId !== noteId) return;
      Y.applyUpdate(doc, new Uint8Array(data.update));
    };

    // ── 接收 Awareness ──────────────────────────
    const onAwareness = (data: { noteId: string; awareness: number[] }) => {
      if (data.noteId !== noteId) return;
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        new Uint8Array(data.awareness),
        'remote'
      );
    };

    socket.on('note:collab:sync', onSync);
    socket.on('note:collab:update', onUpdate);
    socket.on('note:collab:awareness', onAwareness);

    // ── 本地 doc 变更 → 发送 update ─────────────
    const onDocUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return; // 避免回环
      socket.emit('note:collab:update', {
        noteId,
        update: Array.from(update),
      });
    };

    // ── Awareness 变更 → 广播 ────────────────────
    const onAwarenessUpdate = ({
      added, updated, removed,
    }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = [...added, ...updated, ...removed];
      const encoded = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients);
      socket.emit('note:collab:awareness', {
        noteId,
        awareness: Array.from(encoded),
      });

      // 更新本地协作者列表
      this.collaborators = Array.from(awareness.getStates().entries())
        .filter(([id]) => id !== doc.clientID)
        .map(([id, state]) => ({
          clientId: id,
          name: state.user?.name ?? 'Anonymous',
          color: state.user?.color ?? '#999',
        }));
    };

    doc.on('update', onDocUpdate);
    awareness.on('update', onAwarenessUpdate);

    // 加入 room，触发 Server 推送 sync
    socket.emit('note:collab:join', { noteId });

    // 清理函数
    this._cleanup = () => {
      socket.off('note:collab:sync', onSync);
      socket.off('note:collab:update', onUpdate);
      socket.off('note:collab:awareness', onAwareness);
      doc.off('update', onDocUpdate);
      awareness.off('update', onAwarenessUpdate);
      socket.emit('note:collab:leave', { noteId });
      // 标记本地用户为离线
      awareness.setLocalState(null);
    };

    return { ytext, awareness };
  }

  leaveNote(): void {
    this._cleanup?.();
    this._cleanup = null;
    this.doc?.destroy();
    this.doc = null;
    this.awareness?.destroy();
    this.awareness = null;
    this.activeNoteId = null;
    this.collaborators = [];
    this.synced = false;
  }
}
```

### 5.2 CodeMirror 协作扩展

在 `apps/web/src/pages/notes/components/note-editor/editor-setup.ts` 中添加协作扩展工厂函数：

```typescript
import { yCollab } from 'y-codemirror.next';
import type * as Y from 'yjs';
import type * as awarenessProtocol from 'y-protocols/awareness';
import { Extension } from '@codemirror/state';

/**
 * 创建 Yjs 协作扩展
 * 包含：文档同步 + 远端光标/选区显示
 */
export function createCollabExtensions(
  ytext: Y.Text,
  awareness: awarenessProtocol.Awareness
): Extension {
  return yCollab(ytext, awareness, {
    // 光标样式配置
    cursors: true,   // 显示远端光标
    selections: true, // 显示远端选区
  });
}
```

### 5.3 note-editor 组件集成

在 `apps/web/src/pages/notes/components/note-editor/index.tsx` 中集成协作：

```typescript
import { useService } from '@rabjs/react';
import { NoteCollabService } from '../../../../services/note-collab.service';
import { AuthService } from '../../../../services/auth.service';
import { createCollabExtensions } from './editor-setup';
import { useEffect, useRef } from 'react';

// 在编辑器初始化时，额外挂载协作扩展
const noteCollabService = useService(NoteCollabService);
const authService = useService(AuthService);
const collabExtRef = useRef<Extension | null>(null);

useEffect(() => {
  if (!noteId || !editorView) return;

  const userName = authService.currentUser?.username ?? 'Anonymous';
  // 根据 userId hash 生成固定颜色
  const userColor = hashToColor(authService.currentUser?.id ?? '');

  const { ytext, awareness } = noteCollabService.joinNote(noteId, userName, userColor);
  collabExtRef.current = createCollabExtensions(ytext, awareness);

  // 向 CM6 EditorView 动态添加协作扩展
  editorView.dispatch({
    effects: StateEffect.appendConfig.of(collabExtRef.current),
  });

  return () => {
    noteCollabService.leaveNote();
  };
}, [noteId, editorView]);
```

### 5.4 用户颜色分配

```typescript
// apps/web/src/pages/notes/components/note-editor/collab-colors.ts

const COLLAB_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

export function hashToColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}
```

### 5.5 Service 注册

在 `apps/web/src/main.tsx` 中全局注册：

```typescript
import { NoteCollabService } from './services/note-collab.service';
register(NoteCollabService);
```

---

## 六、Socket 事件协议总结

| 方向 | 事件名 | Payload | 说明 |
|------|--------|---------|------|
| C→S | `note:collab:join` | `{ noteId }` | 加入协作，触发服务端推送全量状态 |
| S→C | `note:collab:sync` | `{ noteId, update: number[] }` | 全量 Yjs state（新 client 初始化） |
| C→S | `note:collab:update` | `{ noteId, update: number[] }` | 增量 Yjs update |
| S→C | `note:collab:update` | `{ noteId, update: number[] }` | 广播给同 room 其他 client |
| C→S | `note:collab:awareness` | `{ noteId, awareness: number[] }` | 光标/用户状态（Awareness） |
| S→C | `note:collab:awareness` | `{ noteId, awareness: number[] }` | 广播 Awareness |
| C→S | `note:collab:leave` | `{ noteId }` | 离开协作 room |
| S→C | `note:collab:error` | `{ noteId, message }` | 鉴权失败等错误通知 |

**传输格式**：`update` 和 `awareness` 均为 `number[]`（`Array.from(Uint8Array)`），避免 Socket.io JSON 序列化问题。服务端接收时用 `new Uint8Array(array)` 还原。

---

## 七、与现有 NoteService 的兼容策略

### 保留现有 REST 保存路径（`PATCH /api/notes/:id`）

协作模式下，Yjs 负责实时同步，REST API 作为最终一致性保障：

| 场景 | 走哪条路 |
|------|---------|
| 协作模式活跃 | Yjs 实时同步 + Server 5s 防抖写 DB |
| 断网重连 | Yjs CRDT 自动合并离线编辑 |
| 独自编辑（无他人） | 现有 debounce 2s REST 保存继续工作 |

### 迁移策略：避免冲突

```typescript
// note-editor 组件内：协作模式激活时，禁用原有 REST debounce 保存
useEffect(() => {
  if (noteCollabService.activeNoteId === noteId) {
    // 协作模式下关闭 REST 自动保存，Yjs 接管
    noteService.disableAutoSave();
  }
  return () => {
    noteService.enableAutoSave();
  };
}, [noteCollabService.activeNoteId, noteId]);
```

> `NoteService` 需新增 `disableAutoSave()` / `enableAutoSave()` 方法，切换 debounce 行为。

---

## 八、Heynote 块格式的处理

Heynote 文档由多个块组成，格式如下：

```
∞∞∞markdown
# 标题
内容

∞∞∞javascript
console.log('hello')
```

**Yjs 处理方式**：块分隔符（`∞∞∞js\n`）作为普通字符存在 `YText` 中，CRDT 天然支持，无需特殊处理。

**并发操作的边界情况**：
- 两人同时在同一块末尾添加新块分隔符 → CRDT 会并发插入两个分隔符，编辑器需做校验
- 一人删除整个块（包含分隔符）+ 另一人在该块内编辑 → Yjs 的 CRDT 特性会保留插入内容，块分隔符被删除后内容合并到前一块

**建议**：Phase 1 阶段先保持现有块编辑逻辑不变，仅验证基础同步。块级冲突的 UI 提示在 Phase 3 处理。

---

## 九、Yjs 状态 GC 策略

随着编辑历史积累，`Y.encodeStateAsUpdate` 的大小会增长（因为 Yjs 保留删除操作的 tombstone）。

### GC 方案：定期快照重建

```typescript
/**
 * 对超过阈值大小的 doc 做 GC：重建为最小 update
 * 触发时机：Server 重启时 或 yjs_state > 1MB 时
 */
function gcDoc(doc: Y.Doc): Y.Doc {
  const content = doc.getText('content').toString();
  const fresh = new Y.Doc();
  fresh.getText('content').insert(0, content);
  return fresh;
}
```

**触发规则**：
- Server 启动加载 doc 时，若 `yjs_state` > 1MB，触发重建
- 或者每隔 24h 扫一次超阈值的 doc

---

## 十、实施阶段计划

### Phase 1（基础同步，~3 天）

**目标**：同一用户多设备/多标签页实时同步

- [ ] DB 添加 `yjs_state` 字段并执行 migration
- [ ] 实现 `NoteCollabService`（服务端）
- [ ] 扩展 `socket.ts` 添加协作事件
- [ ] 实现前端 `NoteCollabService`
- [ ] 在 `note-editor` 中挂载 `yCollab` 扩展
- [ ] 在 `main.tsx` 注册 `NoteCollabService`
- [ ] 验证：两个标签页打开同一笔记，编辑实时同步

**验收标准**：
- 标签页 A 输入内容，标签页 B 实时出现（<100ms 延迟）
- 标签页 B 离线，A 继续编辑，B 重连后自动合并
- DB 每 5s 自动持久化最新状态

### Phase 2（多用户共享，~5 天）

**目标**：将笔记共享给其他用户协同编辑

- [ ] 新增 `note_shares` 表
- [ ] API：`POST /api/notes/:id/share`、`GET /api/notes/shared`
- [ ] Socket `note:collab:join` 加入共享权限校验
- [ ] UI：共享入口（邀请链接/用户搜索）
- [ ] UI：显示协作者头像（来自 Awareness）

### Phase 3（体验优化，~3 天）

- [ ] 远端光标样式（每用户固定颜色，显示用户名 tooltip）
- [ ] 在线用户列表（编辑器右上角头像堆叠）
- [ ] 离线提示 + 重连自动合并动画
- [ ] Yjs GC 自动任务
- [ ] 历史版本（基于定期快照）

---

## 十一、关键注意事项

### `y-socket.io` vs 手写 Socket 事件

本方案**不使用** `y-socket.io` 库（它假设有独立 WebSocket server），而是在**现有 Socket.io** 连接上手动实现 Yjs 同步协议。这样可以：
- 复用现有 JWT 认证中间件
- 复用现有 `user:${userId}` room 机制
- 不引入额外的 WebSocket 连接

手写协议只需 3 个事件（join/update/awareness），实现成本低，可控性高。

### Uint8Array 序列化

Socket.io 默认用 JSON 传输，`Uint8Array` 需转为 `number[]` 再传输：
```typescript
// 发送
socket.emit('note:collab:update', { update: Array.from(uint8array) });
// 接收
const bytes = new Uint8Array(data.update);
```

如果启用 Socket.io 的 `parser: msgpack`（二进制），可直接传 `Buffer`，性能更好，但需前后端同步配置。Phase 1 先用 JSON，Phase 3 优化时考虑切换。

### 内存管理

服务端 `docs` Map 会随使用积累。需要 LRU 淘汰策略：
```typescript
// 30分钟无活跃连接的 doc 从内存释放
// 释放前先确保已持久化到 DB
```

Phase 1 暂不实现，Phase 2 补充。
