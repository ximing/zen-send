# 传输列表"滚动到底部"设计

## 背景

当前传输列表按 `createdAt DESC` 排序（最新在最上面），滚到底部加载更早数据。需要改为类似飞书 IM 消息列表的交互模式：最新内容在底部，进入页面自动滚到底，向上滚动加载更早数据。

## 需求

1. 进入页面加载最新一页数据后，自动滚动到底部
2. 新传输（上传/发送文本）追加到列表底部
3. 向上滚动到顶部时触发分页加载更早数据
4. 用户浏览历史时，新消息到达显示"新消息"提示条，不打断浏览
5. 离开底部时显示"回到底部"浮动按钮
6. Web 和 Mobile 均需实现

## 方案：虚拟列表 + 游标分页

选用虚拟滚动库原生 IM 支持：

- **Web**: `@virtuoso.dev/message-list` (`VirtuosoMessageList`)
- **Mobile**: `@shopify/flash-list` (`FlashList` + `inverted`)

## API 改动

### 游标分页

**当前**: `GET /api/transfers?limit=50&offset=0`，返回 `createdAt DESC`

**改为**: `GET /api/transfers?limit=50&beforeCreatedAt=<ts>&beforeId=<id>`，返回 `createdAt ASC`（最早在前）

> **Why 复合游标**: `id` 是 varchar(24) 非自增主键，无法直接做游标比较。`createdAt` 是 int 时间戳，同一秒可能有多条记录，单用会丢数据。因此采用 `createdAt + id` 复合游标，利用 MySQL 行构造器比较一步解决。

| 参数 | 说明 |
|------|------|
| `limit` | 每页条数，默认50 |
| `beforeCreatedAt` | 游标-时间戳，配合 beforeId 使用 |
| `beforeId` | 游标-ID，配合 beforeCreatedAt 使用。两者同时传或同时省略 |

**初始加载**（无游标）：

```sql
SELECT * FROM transfer_sessions
WHERE user_id = ?
ORDER BY created_at DESC, id DESC LIMIT 50
-- 应用层反转结果，得到 ASC 顺序（最早在前）
```

**加载更早数据**（有游标）：

```sql
SELECT * FROM transfer_sessions
WHERE user_id = ?
  AND (created_at, id) < (beforeCreatedAt, beforeId)
ORDER BY created_at ASC, id ASC
LIMIT 50
```

`(created_at, id) < (beforeCreatedAt, beforeId)` 等价于：
`created_at < beforeCreatedAt OR (created_at = beforeCreatedAt AND id < beforeId)`

同一秒内多条记录也不会丢失。客户端取数组第一条的 `createdAt` 和 `id` 作为下次请求的游标。

### 响应格式

```typescript
interface TransferListResponse {
  transfers: TransferSession[];
  hasMore: boolean; // 返回条数 === limit 时为 true
}
```

### Socket 事件改动

`transfer:new` 事件 payload 从摘要改为完整对象：

```typescript
// 之前
{ sourceDeviceName: string; items: { name: string }[] }

// 改为
{ session: TransferSession }
```

**Why**: 客户端需要增量追加而非全量刷新，需要完整的 session 数据。

## Web 前端设计

### 替换方案

当前手动 `<div onScroll>` → `VirtuosoMessageList`

### VirtuosoMessageList 配置

| 场景 | 实现方式 |
|------|---------|
| 初始滚到底 | `scrollModifier: { type: 'item-location', location: { index: 'LAST', align: 'end' } }` |
| 新消息追加 | `scrollModifier: { type: 'auto-scroll-to-bottom', autoScroll: ({ atBottom }) => atBottom ? 'smooth' : 'auto' }` |
| 加载更早数据 | `ref.current.data.prepend(olderItems)` — 自动保持滚动位置不跳动 |
| "新消息"提示 | 监听 `atBottom` 状态，离开底部时新消息显示提示条 |
| "回到底部"按钮 | 离开底部时显示，点击 `ref.current.scrollToIndex({ index: 'LAST' })` |

### HomeService 改动（Web）

- `transfers[]` 改为 ASC 顺序（最早在前，最新在后）
- `loadTransfers()`: 获取最新一页（ASC 顺序），替换 transfers
- `loadOlderTransfers()`: 传入 `beforeCreatedAt=transfers[0].createdAt&beforeId=transfers[0].id`，结果 prepend 到数组头部
- `addTransfer(session)`: 追加到数组末尾（push）
- 删除 `loadMoreTransfers()`
- 新增 `hasMore` observable
- 新增 `isLoadingOlder` observable

### 新消息提示条组件

- 位置：列表底部悬浮
- 内容："N 条新传输" + 点击滚到底部
- 条件：用户不在底部时有新消息到达
- 到达底部后自动消失

### 回到底部按钮

- 位置：右下角浮动
- 图标：向下箭头
- 条件：用户离开底部时显示
- 点击：滚到底部并隐藏

## Mobile 前端设计

### 替换方案

当前 `FlatList` → `@shopify/flash-list` 的 `FlashList`

### FlashList 配置

| 场景 | 实现方式 |
|------|---------|
| 数据 ASC + inverted | 数据保持 ASC 顺序，`inverted` 翻转渲染（RN IM 标准做法） |
| 初始滚到底 | `startRenderingFromBottom: true` |
| 新消息追加 | push 到数组末尾，inverted 模式下自动显示在视觉底部 |
| 加载更早数据 | `onStartReached`（inverted 模式下"开始位置"是视觉顶部） |
| 滚动位置锚定 | `maintainVisibleContentPosition={{ autoscrollToBottomThreshold: 0.2 }}` |
| "回到底部"按钮 | 离开底部时显示，`ref.current?.scrollToOffset({ offset: 0 })` |

### HomeService 改动（Mobile）

- 与 Web 端相同逻辑
- `transfers[]` 改为 ASC 顺序
- `loadTransfers()`: 获取最新一页
- `loadOlder()`: `beforeCreatedAt=transfers[0].createdAt&beforeId=transfers[0].id`，prepend
- `addTransfer(session)`: push 到末尾
- 删除 `refresh()` 中的全量重载逻辑

### 新消息提示条

- 位置：列表底部悬浮
- 与 Web 端相同的交互逻辑

### 回到底部按钮

- 位置：右下角浮动
- 与 Web 端相同的交互逻辑

## 数据流与实时更新

### 增量追加替代全量刷新

**当前**: `transfer:new` → `homeService.loadTransfers()` 全量刷新，丢失滚动位置

**改为**: `transfer:new` → `homeService.addTransfer(session)` 增量追加

### 上传/发送文本流程

1. 客户端发起上传
2. 上传完成后服务端广播 `transfer:new`（含完整 session）
3. 所有设备收到后增量追加到列表底部
4. 本地发起设备：上传完成后直接 `addTransfer()`，不等 Socket 回声

### Socket 去重

本地 `addTransfer()` 和 Socket `transfer:new` 可能重复。通过 `session.id` 去重：addTransfer 时检查 id 是否已存在。

## 影响范围

### 服务端

- `apps/server/src/services/transfer.service.ts` — 游标分页查询
- `apps/server/src/controllers/transfer.controller.ts` — 新增 beforeCreatedAt + beforeId 参数
- `apps/server/src/socket/socket.ts` — transfer:new payload 改为完整 session
- `packages/dto/src/index.ts` — TransferListResponse 增加 hasMore
- `packages/shared/src/index.ts` — 同步类型

### Web 前端

- `apps/web/src/pages/home/home.service.ts` — ASC 数据 + 游标分页逻辑
- `apps/web/src/components/transfer-list/index.tsx` — 替换为 VirtuosoMessageList
- `apps/web/src/services/socket.service.ts` — 增量追加
- 新增 `apps/web/src/components/transfer-list/new-transfer-banner.tsx` — 新消息提示条
- 新增 `apps/web/src/components/transfer-list/scroll-to-bottom.tsx` — 回到底部按钮
- `apps/web/package.json` — 新增 `@virtuoso.dev/message-list` 依赖

### Mobile 前端

- `apps/mobile/src/services/home.service.ts` — ASC 数据 + 游标分页逻辑
- `apps/mobile/src/components/transfer-list/index.tsx` — 替换为 FlashList
- `apps/mobile/src/services/socket.service.ts` — 增量追加
- 新增新消息提示条组件
- 新增回到底部按钮组件
- `apps/mobile/package.json` — 新增 `@shopify/flash-list` 依赖
