# 文本存储优化与上传流程设计

## 概述

简化传输系统，统一内容类型（移除 clipboard），优化小文本存储。

## 1. 内容类型分类

| 内容类型 | 处理方式 |
|---------|---------|
| **用户在界面直接输入的文本**（≤10KB） | 直接存数据库 |
| **用户在界面直接输入的文本**（>10KB） | 走 S3 分片上传 |
| **文本文件**（.txt, .md 等） | 走 S3 分片上传 |
| **剪贴板内容** | 根据实际内容判断：文本→数据库，文件→S3 |
| **其他二进制文件**（图片、视频等） | 走 S3 分片上传 |

**阈值：** 文本内容 ≤10KB 存数据库，>10KB 走 S3。

## 2. 数据库 Schema 变更

**文件：** `apps/server/src/db/schema.ts`

在 `transferItems` 表添加 `storageType` 字段：

```typescript
export const transferItems = sqliteTable('transferItems', {
  // ... existing fields
  storageType: text('storageType').$type<'db' | 's3'>().default('s3'),
});
```

现有字段 `content` (text 类型) 用于存储 <=10KB 的文本。

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

请求体增加 `content` 字段（可选）。

### 4.2 删除传输

**端点：** `DELETE /api/transfers/:id`

逻辑：
1. 查询 session 状态
2. 如果有 S3 内容，调用 `DeleteObject` 或 `AbortMultipartUpload`
3. 从数据库删除 session 和关联的 chunks/items 记录

## 5. 业务流程

### 5.1 上传流程

```
用户选择内容
    ↓
检查类型和大小
    ↓
文本且 ≤10KB
    ├── POST /api/transfers/init + content
    └── 等待响应 → 完成

文件 或 文本 >10KB
    ├── POST /api/transfers/init
    ├── 获取 presigned URLs
    ├── 遍历 chunks 并行上传到 S3
    ├── POST /api/transfers/:id/complete
    └── 完成
```

### 5.2 取消上传

- 客户端维护 AbortController 或类似机制
- 点击取消时：
  1. 停止正在进行的 S3 请求
  2. 调用 `DELETE /api/transfers/:id` 清理 session
  3. 调用 S3 `AbortMultipartUpload` 清理未完成的分片

## 6. 前端功能

### 6.1 多选文件

- `<input type="file" multiple>` 支持多选文件
- 每个文件独立走上传流程
- UI 展示多个文件的进度列表
- 支持部分失败（一个失败不影响其他）

### 6.2 拖拽上传

- 拖拽区域：整个页面或特定拖拽区域
- 拖入时显示视觉反馈（边框高亮等）
- 支持拖入文件夹（如果是文件夹，递归读取所有文件）
- 拖入后自动选中并开始上传流程

### 6.3 进度展示

| 阶段 | 展示 |
|-----|-----|
| 初始化 | "正在准备上传..." |
| S3 分片上传 | 进度条：已上传 chunk 数 / 总 chunk 数 |
| 完成 | "上传完成" |
| 失败 | 错误提示 + 重试按钮 |

## 7. 变更文件清单

| 文件 | 变更内容 |
|-----|---------|
| `apps/server/src/db/schema.ts` | `transferItems` 表加 `storageType` 字段 |
| `packages/dto/src/index.ts` | 移除 `clipboard` 类型 |
| `apps/server/src/validators/transfer.validator.ts` | 移除 `clipboard` 验证 |
| `apps/server/src/services/transfer.service.ts` | 增加文本直存逻辑 |
| `apps/server/src/controllers/transfer.controller.ts` | API 适配 |
| `apps/server/src/services/s3.service.ts` | 增加 `AbortMultipartUpload` 方法 |
| `apps/web/src/services/api.service.ts` | 类型更新，增加取消和删除逻辑 |
| `apps/web/src/components/send-toolbar/index.tsx` | 多选文件、拖拽区域 UI |
| `apps/web/src/components/send-toolbar/send-toolbar.service.ts` | 多文件状态管理、取消逻辑 |
| `apps/web/src/pages/home/index.tsx` | 页面级拖拽支持 |

## 8. S3 分片上传逻辑（保持不变）

- 分片大小：1MB
- 使用 AWS SDK v3 multipart upload
- 客户端直传 S3（预签名 URL）
- 支持并行上传 chunks
