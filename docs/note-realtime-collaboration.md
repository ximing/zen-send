# 笔记实时协作方案调研

> 调研日期：2026-05-26  
> 当前技术栈：CodeMirror 6 + Socket.io v4 + Express + MySQL

---

## 一、现状分析

### 已有基础

- **编辑器**：CodeMirror 6，Heynote 风格多块文档（每块独立语言）
- **实时通信**：Socket.io v4，已有用户级 room（`user:${userId}`）和 JWT 认证
- **保存机制**：2秒 debounce 后 `PATCH /api/notes/:id` 发送全文内容
- **数据模型**：`notes` 表单用户模型（`userId` 归属），无共享/协作字段

### 关键挑战

1. **并发冲突**：多用户同时编辑同一块内容，全文覆盖会丢失其他人的修改
2. **共享模型**：当前笔记按 `userId` 隔离，需要引入共享/权限机制
3. **Heynote 块格式**：块边界（`∞∞∞js\n` 等分隔符）是自定义格式，协作算法需感知块结构
4. **光标同步**：多人光标/选区显示，CodeMirror 6 需要 decoration 层扩展

---

## 二、核心技术：OT vs CRDT

实时协作编辑有两种主流算法：

### OT（Operational Transformation）

- **原理**：将编辑操作（insert/delete/retain）序列化为 op，通过中心服务器做操作变换，保证最终一致性
- **代表**：Google Docs 内部算法、ShareDB（open-source OT 框架）
- **优点**：中心化控制，易审计，服务器是权威源
- **缺点**：服务器必须在线参与变换，断网离线合并复杂；变换逻辑随操作类型增加而复杂

### CRDT（Conflict-free Replicated Data Type）

- **原理**：数据结构本身保证任意顺序合并不冲突，无需中心协调
- **代表**：Yjs（最主流前端 CRDT 库）、Automerge
- **优点**：天然支持离线编辑、P2P 同步；合并算法与传输层解耦
- **缺点**：内存占用比纯文本高；历史操作（tombstone）需要定期 GC

**结论**：对于 Zen Send 当前架构（有中心服务器、需要持久化），两者均可行。但 **Yjs 生态对 CodeMirror 6 支持最好**，是首选。

---

## 三、方案对比

### 方案 A：Yjs + y-codemirror.next（推荐）

**技术组合**

```
Yjs (CRDT)  +  y-codemirror.next (CM6 binding)  +  y-socket.io (传输)
```

**核心库**

| 库 | 版本 | 作用 |
|----|------|------|
| `yjs` | ^13.6 | CRDT 核心，YText 文档类型 |
| `y-codemirror.next` | ^0.3 | CM6 的 Yjs binding（ViewPlugin + Awareness） |
| `y-socket.io` | ^2.0 | Socket.io Provider，处理 awareness 和文档同步 |
| `y-protocols` | ^1.0 | Yjs 同步协议编解码 |
| `lib0` | ^0.2 | Yjs 依赖的底层工具库 |

**工作流程**

```
[Client A: CM6]                    [Server]                    [Client B: CM6]
     │                                │                               │
     │  用户输入 → CM6 Transaction    │                               │
     │  → y-codemirror 转为 YText op  │                               │
     │  → Yjs 编码为 Update Binary    │                               │
     │──── Socket: yjs:update ───────>│                               │
     │                                │  广播给同房间其他 client       │
     │                                │──── Socket: yjs:update ──────>│
     │                                │  持久化 Yjs doc state 到 DB   │  → CM6 自动应用
     │                                │                               │
     │  ← Awareness（光标位置同步）──>│<── Awareness ────────────────>│
```

**服务端实现要点**

```typescript
// server 端：管理每个 noteId 对应的 Y.Doc 实例
const docs = new Map<string, Y.Doc>()

function getDoc(noteId: string): Y.Doc {
  if (!docs.has(noteId)) {
    const doc = new Y.Doc()
    // 从数据库加载已持久化的 Yjs state
    loadFromDB(noteId, doc)
    docs.set(noteId, doc)
  }
  return docs.get(noteId)!
}

// Socket 事件处理
socket.on('yjs:join', async ({ noteId }) => {
  const doc = getDoc(noteId)
  socket.join(`note:${noteId}`)
  // 发送当前文档状态给新加入的客户端
  const state = Y.encodeStateAsUpdate(doc)
  socket.emit('yjs:sync', Array.from(state))
})

socket.on('yjs:update', ({ noteId, update }) => {
  const doc = getDoc(noteId)
  Y.applyUpdate(doc, new Uint8Array(update))
  // 广播给房间内其他成员
  socket.to(`note:${noteId}`).emit('yjs:update', { noteId, update })
  // 防抖持久化到 DB（存 Yjs binary state + 提取纯文本备份）
  debouncePersist(noteId, doc)
})
```

**客户端实现要点**

```typescript
import * as Y from 'yjs'
import { yCollab } from 'y-codemirror.next'
import { SocketIOProvider } from 'y-socket.io'

// 每个协作笔记对应一个 Y.Doc
const ydoc = new Y.Doc()
const ytext = ydoc.getText('content')

// 连接 Socket.io Provider
const provider = new SocketIOProvider(socketUrl, `note-${noteId}`, ydoc, {
  // 可传入认证 token
  auth: { token: jwtToken }
})

// Awareness：本地用户信息（用于光标显示）
provider.awareness.setLocalState({
  user: { name: currentUser.name, color: userColor }
})

// CM6 扩展
const collabExtensions = [
  yCollab(ytext, provider.awareness)
]
```

**持久化策略**

数据库新增字段存储 Yjs state：

```sql
ALTER TABLE notes ADD COLUMN yjs_state MEDIUMBLOB;  -- Yjs binary state
-- content 字段保留，作为纯文本快照（用于全文搜索/备份）
```

每次 doc 更新后，防抖 5 秒：
1. 序列化 `Y.encodeStateAsUpdate(doc)` 存入 `yjs_state`
2. 提取纯文本 `ytext.toString()` 存入 `content`（保持向后兼容）

**优点**
- y-codemirror.next 官方支持 CM6，绑定代码量极少
- 自动处理光标/选区同步（Awareness protocol）
- 支持离线编辑，重连后自动合并
- CRDT 保证无冲突，无需服务端变换逻辑

**缺点**
- Yjs binary state 随编辑历史增长（需要定期快照 GC：`Y.encodeStateAsUpdate` + 重建 doc）
- Heynote 块分隔符是原始字符，协作时需约定块边界的并发修改规则
- 初次接入有学习成本（Yjs 概念：Doc、YText、Provider、Awareness）

---

### 方案 B：ShareDB + json0 OT

**技术组合**

```
ShareDB (OT 框架)  +  rich-text OT type  +  sharedb-client
```

**核心库**

| 库 | 作用 |
|----|------|
| `sharedb` | 服务端 OT 引擎 + 文档管理 |
| `sharedb-client` | 客户端 OT 同步 |
| `@teamwork/websocket-json-stream` | WebSocket 传输层 |
| `rich-text` | 富文本 OT 类型（Delta 格式） |

**工作流程**

```
Client → 本地 op → sharedb-client → WebSocket → ShareDB Server
                                                    ↓
                                             op 变换（transform）
                                                    ↓
                                        广播变换后的 op 给其他 client
                                        持久化到 MongoDB/PostgreSQL
```

**优点**
- 成熟稳定，Google Docs 同款思路
- 服务端是单一权威，历史回放容易
- json0 OT 对结构化数据（块数组）更友好

**缺点**
- ShareDB 默认后端是 MongoDB，接入 MySQL 需要自定义 `ShareDB.DB` adapter
- 需要 WebSocket 专用连接（与现有 Socket.io 并存，增加复杂度）
- 无内置 CodeMirror 6 binding，需手动桥接 Delta ↔ CM6 Transaction
- OT 变换逻辑维护成本高（自定义操作类型时尤其复杂）

---

### 方案 C：纯 Socket.io 广播 + 后端 Last-Write-Wins

**思路**：不引入 OT/CRDT，客户端编辑后广播完整文档内容，其他端直接替换。

**优点**：实现最简单，与现有架构完全一致

**缺点**：
- 严重冲突风险：两人同时编辑，后保存的覆盖前者
- 光标跳动严重（每次收到远端更新，光标被重置）
- 只适合"一次只有一人编辑"的宽松协作场景

**结论**：不推荐用于真正的协作编辑，可作为"查看他人实时更新"的只读同步临时方案。

---

### 方案 D：基于 Liveblocks / PartyKit 托管服务

**思路**：使用第三方协作基础设施服务，避免自建 CRDT/OT 服务端。

| 服务 | 特点 |
|------|------|
| Liveblocks | 提供 Yjs rooms + Awareness 托管，有 CM6 SDK |
| PartyKit | 基于 Cloudflare Workers 的协作 runtime |
| Hocuspocus | 开源 Yjs server（自部署），专为协作设计 |

**优点**：零服务端代码，快速接入

**缺点**：
- 数据存储在第三方，隐私/合规风险
- 增加外部依赖，离线部署场景不适用
- Liveblocks 按 MAU 收费

**结论**：适合快速 PoC，生产环境中数据主权要求高的场景不适合。

---

## 四、推荐方案与实施路线

### 推荐：方案 A（Yjs + y-socket.io）

综合考虑 CodeMirror 6 生态支持、现有 Socket.io 基础设施复用、离线编辑需求，推荐 Yjs 方案。

### 实施分阶段

#### Phase 1：单用户实时同步（同一账号多设备）

目标：同一用户在多个标签页/设备打开同一笔记，自动同步。

改动范围：
- 服务端：添加 `yjs:join`、`yjs:update`、`yjs:awareness` Socket 事件处理
- 数据库：`notes` 表添加 `yjs_state MEDIUMBLOB`
- 客户端：引入 `yjs`、`y-codemirror.next`，替换现有 CodeMirror 内容绑定

**注意**：Heynote 块格式中的分隔符（`∞∞∞js\n`）作为普通字符存在 YText 中，CRDT 天然支持，无需特殊处理。

#### Phase 2：多用户共享协作

目标：用户可以将笔记分享给其他用户共同编辑。

改动范围：
- 数据库：添加 `note_shares` 表（noteId、sharedWithUserId、permission: read/write）
- API：`POST /api/notes/:id/share`、`GET /api/notes/shared`
- Socket 认证：`yjs:join` 时校验用户是否有访问权限
- 客户端：共享入口 UI、协作者光标显示（Awareness → decoration）

#### Phase 3：协作体验优化

- **光标颜色**：根据用户 ID hash 分配固定颜色，Awareness state 携带颜色信息
- **用户头像列表**：显示当前在线编辑的用户
- **离线感知**：Provider 断线时提示，重连后自动合并离线编辑
- **历史版本**：利用 Yjs 的 `UndoManager` 或服务端快照实现版本回溯
- **Yjs GC**：定期对长期未更新的文档做快照压缩，防止 binary state 无限增长

---

## 五、关键依赖版本

```json
{
  "dependencies": {
    "yjs": "^13.6.20",
    "y-codemirror.next": "^0.3.5",
    "y-socket.io": "^2.0.4",
    "y-protocols": "^1.0.6",
    "lib0": "^0.2.99"
  }
}
```

服务端额外依赖：
```json
{
  "dependencies": {
    "yjs": "^13.6.20",
    "y-protocols": "^1.0.6",
    "lib0": "^0.2.99"
  }
}
```

---

## 六、参考资料

- [Yjs 官方文档](https://docs.yjs.dev)
- [y-codemirror.next GitHub](https://github.com/yjs/y-codemirror.next)
- [y-socket.io GitHub](https://github.com/ivan-topp/y-socket.io)
- [Hocuspocus（自部署 Yjs server）](https://tiptap.dev/docs/hocuspocus/introduction)
- [Liveblocks CM6 示例](https://liveblocks.io/docs/api-reference/liveblocks-react-codemirror)
- [ShareDB 文档](https://share.github.io/sharedb/)
