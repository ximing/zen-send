# 文本存储优化与上传流程设计

## 概述

简化传输系统，统一内容类型（移除 clipboard），优化小文本存储。

## 1. 内容类型分类

| 内容类型 | 处理方式 |
|---------|---------|
| **用户在界面直接输入的文本**（≤10KB，即 `totalSize <= 10 * 1024` 字节） | 直接存数据库 |
| **用户在界面直接输入的文本**（>10KB，即 `totalSize > 10 * 1024` 字节） | 走 S3 分片上传 |
| **文本文件**（.txt, .md 等） | 走 S3 分片上传 |
| **剪贴板内容** | 读取后按实际内容类型处理：文本内容 → 文本逻辑，文件内容 → 文件逻辑 |
| **其他二进制文件**（图片、视频等） | 走 S3 分片上传 |

**说明：** "剪贴板"不再作为独立的传输类型。客户端读取剪贴板后，根据内容 MIME 类型判断是文本还是文件，然后走对应的处理流程。

## 2. 数据库 Schema 变更

**文件：** `apps/server/src/db/schema.ts`

在 `transferItems` 表添加 `storageType` 字段：

```typescript
export const transferItems = sqliteTable('transferItems', {
  // ... existing fields
  storageType: text('storageType').$type<'db' | 's3'>().notNull(),
});
```

**注意：** `storageType` 无默认值，服务端在插入时必须明确设置。文本 ≤10KB 设置为 `'db'`，其他设置为 `'s3'`。

## 3. DTO 类型变更

**文件：** `packages/dto/src/index.ts`

移除 `clipboard` 类型：

```typescript
type TransferType = 'file' | 'text';

interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId: string;
  type: TransferType;
  fileName?: string;
  contentType: string;
  totalSize: number;
  chunkCount?: number;
  content?: string;  // <=10KB 的文本内容
}
```

## 4. API 变更

### 4.1 初始化传输

**端点：** `POST /api/transfers/init`

**请求体：**
```typescript
interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId: string;
  type: TransferType;
  fileName?: string;
  contentType: string;
  totalSize: number;
  chunkCount?: number;
  content?: string;  // <=10KB 的文本内容
}
```

**响应：**
```typescript
interface InitTransferResponse {
  sessionId: string;
  presignedUrls?: string[];  // S3 分片上传 URL 列表（文件或 >10KB 文本时返回）
  chunkSize?: number;        // 分片大小（仅 S3 时返回）
}
```

### 4.2 删除传输

**端点：** `DELETE /api/transfers/:id`

**行为：**
- 如果上传进行中（`status = 'pending'`）：服务器标记为 `status = 'cancelled'`，后台清理 S3 分片上传
- 如果上传已完成（`status = 'completed'`）：同步删除 S3 对象
- 最后从数据库删除 session 和关联的 chunks/items 记录

**注意：** 删除操作不等待 S3 清理完成，服务器立即返回。

## 5. 业务流程

### 5.1 上传流程

```
用户选择内容
    ↓
检查类型和大小
    ↓
文本且 totalSize <= 10KB
    ├── POST /api/transfers/init + content
    └── 等待 200 响应 → 完成

文件 或 totalSize > 10KB
    ├── POST /api/transfers/init
    ├── 获取 presigned URLs
    ├── 遍历 chunks 并行上传到 S3
    ├── POST /api/transfers/:id/complete
    └── 完成
```

**内联文本上传：** 服务端收到 `init` 请求后，直接将 `content` 存入 `transferItems.content`，设置 `storageType = 'db'`，无需等待 S3 操作。

### 5.2 取消上传

- 客户端维护 AbortController 或类似机制
- 点击取消时：
  1. 停止正在进行的 S3 请求
  2. 调用 `DELETE /api/transfers/:id` 通知服务器取消
  3. 服务器标记 session 为 `cancelled`，后台调用 S3 `AbortMultipartUpload` 清理未完成的分片

## 6. 前端功能

### 6.1 多选文件

- `<input type="file" multiple>` 支持多选文件
- 每个文件独立走上传流程
- UI 展示多个文件的进度列表
- 支持部分失败（一个失败不影响其他）

### 6.2 拖拽上传

- 拖拽区域：整个页面或特定拖拽区域
- 拖入时显示视觉反馈（边框高亮等）
- 支持拖入文件夹：
  - 递归读取所有文件（深度限制 10 层）
  - 跳过隐藏文件（以 `.` 开头的文件）
  - 跳过空文件夹
- 拖入后自动选中并开始上传流程

### 6.3 进度展示

| 阶段 | 展示 |
|-----|-----|
| 初始化 | "正在准备上传..." |
| S3 分片上传 | 进度条：已上传 chunk 数 / 总 chunk 数 |
| 完成 | "上传完成" |
| 失败 | 错误提示 + 重试按钮 |

## 7. 下载流程（数据库文本）

**端点：** `GET /api/transfers/:id`

**响应：**
```typescript
interface TransferSessionResponse {
  id: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  items: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    storageType: 'db' | 's3';
    content?: string;        // storageType = 'db' 时返回
    downloadUrl?: string;    // storageType = 's3' 时返回，预签名 URL，24 小时有效
  }[];
}
```

客户端根据 `storageType` 判断：
- `'db'`：直接使用 `content` 字段
- `'s3'`：使用 `downloadUrl` 下载

## 8. 错误处理

### 8.1 预签名 URL 过期
- 预签名 URL 有效期 1 小时
- 如果上传时收到 403/401，客户端重新请求新的 presigned URLs

### 8.2 S3 上传失败
- 单个 chunk 失败不影响其他 chunks
- 重试失败的 chunk（最多 3 次）
- 全部失败后通知服务器，标记 session 为 failed

### 8.3 网络中断恢复
- 使用 S3 multipart upload，已上传的 chunks 不会丢失
- 客户端重新连接后，从最后一个成功的 chunk 继续

## 9. 变更文件清单

| 文件 | 变更内容 |
|-----|---------|
| `apps/server/src/db/schema.ts` | `transferItems` 表加 `storageType` 字段 |
| `packages/dto/src/index.ts` | 移除 `clipboard` 类型 |
| `apps/server/src/validators/transfer.validator.ts` | 移除 `clipboard` 验证 |
| `apps/server/src/services/transfer.service.ts` | 增加文本直存逻辑、删除传输时清理 S3 |
| `apps/server/src/controllers/transfer.controller.ts` | API 适配、增加 DELETE 端点 |
| `apps/server/src/services/s3.service.ts` | 增加 `AbortMultipartUpload` 和 `DeleteObject` 方法 |
| `apps/web/src/services/api.service.ts` | 类型更新，增加取消和删除逻辑 |
| `apps/web/src/components/send-toolbar/index.tsx` | 多选文件、拖拽区域 UI |
| `apps/web/src/components/send-toolbar/send-toolbar.service.ts` | 多文件状态管理、取消逻辑 |
| `apps/web/src/pages/home/index.tsx` | 页面级拖拽支持 |

## 10. S3 分片上传逻辑（保持不变）

- 分片大小：1MB
- 使用 AWS SDK v3 multipart upload
- 客户端直传 S3（预签名 URL）
- 支持并行上传 chunks

## 11. 配置参数

| 参数 | 默认值 | 说明 |
|-----|-------|-----|
| `TEXT_INLINE_MAX_SIZE` | 10KB | 文本直接存数据库的大小阈值 |
