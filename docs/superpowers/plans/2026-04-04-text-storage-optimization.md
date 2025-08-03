# 文本存储优化与上传流程实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 简化传输系统，统一内容类型（移除 clipboard），小文本直接存数据库，大文本和文件走 S3 上传。

**Architecture:**
- 后端：数据库增加 `storageType` 字段区分存储方式，文本 ≤10KB 存 `content` 字段，`>10KB` 和文件走 S3 multipart upload
- 前端：移除 clipboard 类型，添加多选文件、拖拽上传、上传进度和取消功能
- API：增加 `content` 字段用于内联文本，增加 DELETE 端点清理 S3

**Tech Stack:** TypeScript, Drizzle ORM, AWS SDK v3, React 19, @rabjs/react

---

## Chunk 1: 后端 DTO 和类型变更

### Task 1.1: 更新 packages/dto 类型定义

**Files:**
- Modify: `packages/dto/src/index.ts`

- [ ] **Step 1: 修改 TransferType 定义**

```typescript
// 移除 clipboard 类型
export type TransferType = 'file' | 'text';

// InitTransferRequest 增加 content 字段
export interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: TransferType;
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount?: number;
  content?: string;  // 新增：<=10KB 的文本内容
}

// 新增 InitTransferResponse
export interface InitTransferResponse {
  sessionId: string;
  presignedUrls?: string[];
  chunkSize?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/dto/src/index.ts
git commit -m "feat(dto): remove clipboard type, add content and InitTransferResponse"
```

---

### Task 1.2: 更新 packages/shared 类型定义

**Files:**
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 移除 TransferItemType 中的 clipboard**

```typescript
// 修改前
export type TransferItemType = 'file' | 'text' | 'clipboard';

// 修改后
export type TransferItemType = 'file' | 'text';

// TransferItem 增加 storageType
export interface TransferItem {
  // ... existing fields
  storageType?: 'db' | 's3';  // 新增
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): remove clipboard from TransferItemType, add storageType"
```

---

## Chunk 2: 后端数据库 Schema 变更

### Task 2.1: 更新数据库 Schema

**Files:**
- Modify: `apps/server/src/db/schema.ts`

- [ ] **Step 1: 在 transferItems 表添加 storageType 字段**

```typescript
export const transferItems = mysqlTable('transferItems', {
  id: varchar('id', { length: 24 }).primaryKey(),
  sessionId: varchar('sessionId', { length: 24 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }),
  mimeType: varchar('mimeType', { length: 100 }),
  size: bigint('size', { mode: 'number' }).notNull(),
  content: text('content'),
  thumbnailKey: varchar('thumbnailKey', { length: 500 }),
  storageType: varchar('storageType', { length: 10 }).$type<'db' | 's3'>().notNull(),  // 新增
  createdAt: int('createdAt').notNull(),
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/db/schema.ts
git commit -m "feat(server): add storageType field to transferItems table"
```

---

## Chunk 3: 后端验证器和 Service 变更

### Task 3.1: 更新 transfer.validator.ts

**Files:**
- Modify: `apps/server/src/validators/transfer.validator.ts`

- [ ] **Step 1: 移除 clipboard 验证，添加 content 字段**

```typescript
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  MinLength,
  IsInt,
  IsPositive,
  MaxLength,
} from 'class-validator';
import type { InitTransferRequest, UploadChunkRequest } from '@zen-send/dto';

export class InitTransferDto implements InitTransferRequest {
  @IsString()
  sourceDeviceId!: string;

  @IsOptional()
  @IsString()
  targetDeviceId?: string;

  @IsEnum(['file', 'text'])  // 移除 'clipboard'
  type!: 'file' | 'text';

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  contentType?: string;

  @IsNumber()
  @IsInt()
  @Min(0)
  totalSize!: number;

  @IsOptional()
  @IsNumber()
  @IsInt()
  @Min(1)
  chunkCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10 * 1024)  // 10KB limit
  content?: string;
}

export class UploadChunkDto implements UploadChunkRequest {
  @IsNumber()
  @IsInt()
  @Min(0)
  chunkIndex!: number;

  @IsString()
  @MinLength(1)
  etag!: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/validators/transfer.validator.ts
git commit -m "feat(server): remove clipboard validation, add content field with 10KB limit"
```

---

### Task 3.2: 更新 S3Service 添加 DeleteObject

**Files:**
- Modify: `apps/server/src/services/s3.service.ts`

- [ ] **Step 1: 添加 DeleteObjectCommand 导入和方法**

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,  // 新增
} from '@aws-sdk/client-s3';

// 在类中添加方法
async deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: this.bucket,
    Key: key,
  });
  await this.getClient().send(command);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/services/s3.service.ts
git commit -m "feat(server): add deleteObject method to S3Service"
```

---

### Task 3.3: 更新 TransferService

**Files:**
- Modify: `apps/server/src/services/transfer.service.ts`

- [ ] **Step 1: 修改 InitTransferInput 和相关类型**

```typescript
// 修改 InitTransferInput
export interface InitTransferInput {
  userId: string;
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: 'file' | 'text';  // 移除 'clipboard'
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount?: number;
  content?: string;  // 新增：内联文本
}

// 修改 InitTransferOutput
export interface InitTransferOutput {
  sessionId: string;
  s3Bucket: string;
  s3Key: string;
  chunkCount: number;
  chunkSize: number;
  presignedUrls?: { chunkIndex: number; url: string; s3Key: string }[];
}
```

- [ ] **Step 2: 修改 initTransfer 方法支持内联文本**

```typescript
async initTransfer(input: InitTransferInput): Promise<InitTransferOutput> {
  const sessionId = generateSessionId();
  const now = Math.floor(Date.now() / 1000);
  const ttlExpiresAt = now + this.s3Service.getTransferTtlDays() * 24 * 60 * 60;
  const s3Key = `transfers/${sessionId}/`;
  const contentType = input.contentType || 'application/octet-stream';
  const fileName = input.fileName || 'untitled';
  const TEXT_INLINE_MAX_SIZE = 10 * 1024;  // 10KB

  // 判断是否内联存储（文本且 <=10KB 且有 content）
  const isInlineText = input.type === 'text' &&
                        input.totalSize <= TEXT_INLINE_MAX_SIZE &&
                        input.content !== undefined;

  let presignedUrls: { chunkIndex: number; url: string; s3Key: string }[] | undefined;
  let chunkCount = 0;

  if (!isInlineText) {
    // S3 上传模式
    for (let i = 0; i < input.chunkCount; i++) {
      const chunkS3Key = `transfers/${sessionId}/chunk_${i}`;
      const url = await this.s3Service.getPresignedUploadUrl(chunkS3Key, contentType);
      presignedUrls!.push({ chunkIndex: i, url, s3Key: chunkS3Key });
    }
    chunkCount = input.chunkCount;
  }

  await this.db.insert(transferSessions).values({
    id: sessionId,
    userId: input.userId,
    sourceDeviceId: input.sourceDeviceId,
    targetDeviceId: input.targetDeviceId || null,
    status: 'pending',
    s3Bucket: this.s3Service.getBucket(),
    s3Key,
    originalFileName: fileName,
    totalSize: input.totalSize,
    chunkCount: chunkCount,
    receivedChunks: 0,
    contentType,
    ttlExpiresAt,
    createdAt: now,
  });

  // 如果是内联文本，直接插入 transferItem
  if (isInlineText) {
    const itemId = generateItemId();
    await this.db.insert(transferItems).values({
      id: itemId,
      sessionId,
      type: 'text',
      name: fileName,
      mimeType: contentType,
      size: input.totalSize,
      content: input.content,
      storageType: 'db',  // 明确设置
      createdAt: now,
    });
  }

  return {
    sessionId,
    s3Bucket: this.s3Service.getBucket(),
    s3Key,
    chunkCount,
    chunkSize: this.CHUNK_SIZE,
    presignedUrls,
  };
}
```

- [ ] **Step 3: 修改 addTransferItem 方法添加 storageType**

```typescript
async addTransferItem(
  sessionId: string,
  type: 'file' | 'text',
  name: string | null,
  mimeType: string | null,
  size: number,
  content: string | null,
  thumbnailKey: string | null,
  storageType: 'db' | 's3' = 's3'  // 新增参数
): Promise<TransferItemInfo> {
  const itemId = generateItemId();
  const now = Math.floor(Date.now() / 1000);

  await this.db.insert(transferItems).values({
    id: itemId,
    sessionId,
    type,
    name,
    mimeType,
    size,
    content,
    thumbnailKey,
    storageType,  // 使用参数
    createdAt: now,
  });

  return {
    id: itemId,
    sessionId,
    type,
    name,
    mimeType,
    size,
    content,
    thumbnailKey,
    storageType,
    createdAt: now,
  };
}
```

- [ ] **Step 4: 修改 deleteTransfer 方法支持 S3 清理**

```typescript
async deleteTransfer(sessionId: string, userId: string): Promise<boolean> {
  const existing = await this.db
    .select()
    .from(transferSessions)
    .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    return false;
  }

  const session = existing[0];

  // 如果上传进行中，标记为 cancelled 并后台清理 S3
  if (session.status === 'pending' && session.chunkCount > 0) {
    await this.db
      .update(transferSessions)
      .set({ status: 'cancelled' })
      .where(eq(transferSessions.id, sessionId));

    // 后台清理 S3 multipart upload（如果有 uploadId）
    // 注意：实际项目中可能需要存储 uploadId，这里简化处理
    // 对于 completed 的，直接删除 S3 对象
    if (session.s3Key) {
      try {
        await this.s3Service.deleteObject(session.s3Key);
      } catch (e) {
        logger.error(`Failed to delete S3 object for session ${sessionId}: ${e}`);
      }
    }
  }

  // 删除数据库记录
  await this.db
    .delete(chunkUploads)
    .where(eq(chunkUploads.sessionId, sessionId));

  await this.db
    .delete(transferItems)
    .where(eq(transferItems.sessionId, sessionId));

  await this.db
    .delete(transferSessions)
    .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)));

  return true;
}
```

- [ ] **Step 5: 修改 getTransferById 返回 items 和 storageType**

```typescript
async getTransferById(sessionId: string, userId: string): Promise<TransferSessionInfo | null> {
  const results = await this.db
    .select()
    .from(transferSessions)
    .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
    .limit(1);

  if (results.length === 0) {
    return null;
  }

  const session = results[0];

  // 获取 items
  const items = await this.db
    .select()
    .from(transferItems)
    .where(eq(transferItems.sessionId, sessionId));

  return { ...session, items };
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/services/transfer.service.ts
git commit -m "feat(server): support inline text storage and S3 cleanup on delete"
```

---

## Chunk 4: 后端 Controller 变更

### Task 4.1: 更新 TransferController

**Files:**
- Modify: `apps/server/src/controllers/transfer.controller.ts`

- [ ] **Step 1: 修改 init 方法处理内联文本**

```typescript
@Post('/init')
async init(@CurrentUser() user: TokenPayload, @Body() dto: InitTransferDto) {
  try {
    const TEXT_INLINE_MAX_SIZE = 10 * 1024;
    const isInlineText = dto.type === 'text' &&
                          dto.totalSize <= TEXT_INLINE_MAX_SIZE &&
                          dto.content !== undefined;

    const result = await this.transferService.initTransfer({
      userId: user.userId,
      sourceDeviceId: dto.sourceDeviceId,
      targetDeviceId: dto.targetDeviceId,
      type: dto.type,
      fileName: dto.fileName,
      contentType: dto.contentType,
      totalSize: dto.totalSize,
      chunkCount: dto.chunkCount || 0,
      content: dto.content,  // 传递 content
    });

    // 根据是否内联文本返回不同响应
    if (isInlineText) {
      return ResponseUtil.created({
        sessionId: result.sessionId,
        storageType: 'db',
      });
    }

    return ResponseUtil.created({
      sessionId: result.sessionId,
      s3Bucket: result.s3Bucket,
      s3Key: result.s3Key,
      chunkCount: result.chunkCount,
      chunkSize: result.chunkSize,
      presignedUrls: result.presignedUrls?.map(u => u.url),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialize transfer';
    throw new HttpError(400, message);
  }
}
```

- [ ] **Step 2: 修改 get 方法返回完整信息**

```typescript
@Get('/:id')
async get(@CurrentUser() user: TokenPayload, @Param('id') id: string) {
  const transfer = await this.transferService.getTransferById(id, user.userId);
  if (!transfer) {
    throw new HttpError(404, 'Transfer not found');
  }

  // 获取 items 并构建响应
  const items = (transfer as any).items || [];
  const formattedItems = items.map((item: any) => ({
    id: item.id,
    name: item.name,
    mimeType: item.mimeType,
    size: item.size,
    storageType: item.storageType,
    content: item.storageType === 'db' ? item.content : undefined,
    downloadUrl: item.storageType === 's3'
      ? this.transferService.getDownloadUrl(id, user.userId)
      : undefined,
  }));

  return ResponseUtil.success({
    id: transfer.id,
    status: transfer.status,
    items: formattedItems,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/controllers/transfer.controller.ts
git commit -m "feat(server): handle inline text in init, return items with storageType in get"
```

---

## Chunk 5: 前端 API Service 变更

### Task 5.1: 更新 ApiService

**Files:**
- Modify: `apps/web/src/services/api.service.ts`

- [ ] **Step 1: 添加取消和删除方法**

```typescript
async cancelUpload(sessionId: string): Promise<void> {
  // 取消上传通过删除 session 实现
  await this.delete(`/api/transfers/${sessionId}`);
}

async deleteTransfer(sessionId: string): Promise<void> {
  await this.delete(`/api/transfers/${sessionId}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/services/api.service.ts
git commit -m "feat(web): add cancelUpload and deleteTransfer to ApiService"
```

---

## Chunk 6: 前端 HomeService 变更

### Task 6.1: 更新 HomeService

**Files:**
- Modify: `apps/web/src/pages/home/home.service.ts`

- [ ] **Step 1: 移除 clipboard 过滤，添加上传状态管理**

```typescript
import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text';  // 移除 clipboard

export interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;  // 0-100
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  sessionId?: string;
  error?: string;
}

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  selectedFiles: { name: string; size: number; data?: ArrayBuffer }[] = [];
  filter: TransferFilter = 'all';
  isLoading = false;
  error: string | null = null;
  uploadingFiles: UploadingFile[] = [];  // 新增

  // ... existing code ...

  get filteredTransfers() {
    if (this.filter === 'all') return this.transfers;
    return this.transfers.filter((t) =>
      t.items?.some((item) => item.type === this.filter)
    );
  }

  setFilter(filter: TransferFilter) {
    this.filter = filter;
  }

  addFiles(files: { name: string; size: number; data?: ArrayBuffer }[]) {
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  clearFiles() {
    this.selectedFiles = [];
  }

  // 新增：开始上传文件
  async uploadFiles(targetDeviceId: string) {
    const files = this.selectedFiles;
    if (files.length === 0) return;

    // 为每个文件创建上传任务
    for (const file of files) {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const uploadingFile: UploadingFile = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending',
      };
      this.uploadingFiles = [...this.uploadingFiles, uploadingFile];

      // 开始实际上传
      this.executeUpload(uploadId, file, targetDeviceId);
    }

    // 清空已选择的文件
    this.selectedFiles = [];
  }

  private async executeUpload(
    uploadId: string,
    file: { name: string; size: number; data?: ArrayBuffer },
    targetDeviceId: string
  ) {
    const TEXT_INLINE_MAX_SIZE = 10 * 1024;
    const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

    try {
      // 更新状态为上传中
      this.updateUploadStatus(uploadId, { status: 'uploading' });

      const sourceDeviceId = 'web-device'; // TODO: 从设备服务获取

      // 判断是内联文本还是 S3 上传
      if (file.data && file.size <= TEXT_INLINE_MAX_SIZE) {
        // 内联文本上传
        const content = new TextDecoder().decode(file.data);
        const response = await this.apiService.post<any>('/api/transfers/init', {
          sourceDeviceId,
          targetDeviceId,
          type: 'text',
          fileName: file.name,
          contentType: 'text/plain',
          totalSize: file.size,
          content,
        });

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
          sessionId: response.data.sessionId,
        });
      } else {
        // S3 分片上传
        const chunkCount = Math.ceil(file.size / CHUNK_SIZE);
        const initResponse = await this.apiService.post<any>('/api/transfers/init', {
          sourceDeviceId,
          targetDeviceId,
          type: 'file',
          fileName: file.name,
          contentType: 'application/octet-stream',
          totalSize: file.size,
          chunkCount,
        });

        const { sessionId, presignedUrls } = initResponse.data;

        this.updateUploadStatus(uploadId, { sessionId });

        // 上传每个 chunk
        const totalChunks = presignedUrls.length;
        let completedChunks = 0;

        await Promise.all(
          presignedUrls.map(async (url: string, index: number) => {
            const start = index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.data?.slice(start, end);

            if (!chunk) return;

            const etag = await this.uploadChunkToS3(url, chunk);

            // 通知服务器 chunk 已上传
            await this.apiService.post(`/api/transfers/${sessionId}/chunks`, {
              chunkIndex: index,
              etag,
            });

            completedChunks++;
            const progress = Math.round((completedChunks / totalChunks) * 100);
            this.updateUploadStatus(uploadId, { progress });
          })
        );

        // 完成传输
        await this.apiService.post(`/api/transfers/${sessionId}/complete`);

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
        });
      }
    } catch (error) {
      this.updateUploadStatus(uploadId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }

  private async uploadChunkToS3(url: string, chunk: ArrayBuffer): Promise<string> {
    const response = await fetch(url, {
      method: 'PUT',
      body: chunk,
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.status}`);
    }

    return response.headers.get('ETag') || '';
  }

  private updateUploadStatus(uploadId: string, updates: Partial<UploadingFile>) {
    this.uploadingFiles = this.uploadingFiles.map((f) =>
      f.id === uploadId ? { ...f, ...updates } : f
    );
  }

  // 取消上传
  async cancelUpload(uploadId: string) {
    const file = this.uploadingFiles.find((f) => f.id === uploadId);
    if (file?.sessionId) {
      await this.apiService.deleteTransfer(file.sessionId);
    }
    this.updateUploadStatus(uploadId, { status: 'cancelled' });
  }

  // 移除已完成/失败的上传记录
  removeUpload(uploadId: string) {
    this.uploadingFiles = this.uploadingFiles.filter((f) => f.id !== uploadId);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/home.service.ts
git commit -m "feat(web): add upload progress tracking and cancel support to HomeService"
```

---

## Chunk 7: 前端 SendToolbar 变更

### Task 7.1: 更新 SendToolbar UI

**Files:**
- Modify: `apps/web/src/components/send-toolbar/index.tsx`

- [ ] **Step 1: 移除 Clipboard 按钮，保留 File 和 Text**

```tsx
// 按钮区域改为：
<div className="grid grid-cols-2 gap-3 mb-5">
  {/* Select File */}
  <button
    onClick={handleSelectFile}
    className="flex flex-col items-center gap-2 p-4
               bg-[var(--bg-elevated)] hover:bg-[var(--border-default)]
               border border-[var(--border-default)] rounded-lg transition-colors"
  >
    <Paperclip size={20} className="text-[var(--text-secondary)]" />
    <span className="label text-[var(--text-secondary)]">SELECT_FILE</span>
  </button>

  {/* Enter Text */}
  <button
    onClick={() => service.openModal('text')}
    className="flex flex-col items-center gap-2 p-4
               bg-[var(--bg-elevated)] hover:bg-[var(--border-default)]
               border border-[var(--border-default)] rounded-lg transition-colors"
  >
    <Pencil size={20} className="text-[var(--text-secondary)]" />
    <span className="label text-[var(--text-secondary)]">ENTER_TEXT</span>
  </button>
</div>
```

- [ ] **Step 2: 移除 Clipboard Modal，保留 Text Modal**

删除整个 `{service.modalType === 'clipboard' && (...)}` 代码块。

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/send-toolbar/index.tsx
git commit -m "feat(web): remove clipboard button from SendToolbar"
```

---

### Task 7.2: 更新 SendToolbarService

**Files:**
- Modify: `apps/web/src/components/send-toolbar/send-toolbar.service.ts`

- [ ] **Step 1: 移除 clipboard 相关逻辑**

```typescript
import { Service } from '@rabjs/react';
import { HomeService } from '../../pages/home/home.service';
import type { ZenBridgeFile } from '../../lib/zen-bridge';

export type SendToolbarModalType = 'text' | null;  // 移除 clipboard

export class SendToolbarService extends Service {
  modalType: SendToolbarModalType = null;
  textInput = '';
  // 移除 clipboardContent

  get homeService() {
    return this.resolve(HomeService);
  }

  openModal(type: SendToolbarModalType) {
    this.modalType = type;
    // 移除 clipboard 加载逻辑
  }

  closeModal() {
    this.modalType = null;
    this.textInput = '';
  }

  setTextInput(text: string) {
    this.textInput = text;
  }

  addFiles(files: ZenBridgeFile[]) {
    const formattedFiles = files.map((f) => ({
      name: f.name,
      size: f.size,
    }));
    this.homeService.addFiles(formattedFiles);
  }

  submitText() {
    if (!this.textInput.trim()) return;

    this.homeService.addFiles([
      {
        name: 'text.txt',
        size: new Blob([this.textInput]).size,
        data: new TextEncoder().encode(this.textInput).buffer as ArrayBuffer,
      },
    ]);
    this.closeModal();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/send-toolbar/send-toolbar.service.ts
git commit -m "feat(web): remove clipboard from SendToolbarService"
```

---

## Chunk 8: 前端拖拽上传和进度 UI

### Task 8.1: 更新 Home 页面添加拖拽和进度

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`

- [ ] **Step 1: 添加拖拽和上传进度 UI**

```tsx
import React, { useEffect, useCallback, useState } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { useNavigate } from 'react-router-dom';
import { HomeService, UploadingFile } from './home.service';
import { AuthService } from '../../services/auth.service';
import { SendToolbarService } from '../../components/send-toolbar/send-toolbar.service';
import { TransferListService } from '../../components/transfer-list/transfer-list.service';
import SendToolbar from '../../components/send-toolbar';
import TransferList from '../../components/transfer-list';
import Header from '../../components/header';
import Toast from '../../components/toast';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';

const HomeContent = observer(() => {
  const service = useService(HomeService);
  const authService = useService(AuthService);
  const sendToolbarService = useService(SendToolbarService);
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  if (!authService.isAuthenticated) {
    navigate('/login');
    return null;
  }

  useEffect(() => {
    service.loadTransfers();
  }, [service]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files: { name: string; size: number; data?: ArrayBuffer }[] = [];
    const items = e.dataTransfer.items;

    const MAX_DEPTH = 10;

    const processEntry = async (entry: FileSystemEntry, depth: number): Promise<void> => {
      if (depth > MAX_DEPTH) return;

      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        const file = await new Promise<File>((resolve, reject) => {
          fileEntry.file(resolve, reject);
        });

        // 跳过隐藏文件
        if (file.name.startsWith('.')) return;

        const buffer = await file.arrayBuffer();
        files.push({
          name: file.name,
          size: file.size,
          data: buffer,
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();

        const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });

        for (const childEntry of entries) {
          await processEntry(childEntry, depth + 1);
        }
      }
    };

    for (const item of Array.from(items)) {
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        await processEntry(entry, 0);
      } else {
        // 浏览器原生 File 对象
        const file = item.getAsFile();
        if (file && !file.name.startsWith('.')) {
          const buffer = await file.arrayBuffer();
          files.push({
            name: file.name,
            size: file.size,
            data: buffer,
          });
        }
      }
    }

    if (files.length > 0) {
      service.addFiles(files);
    }
  }, [service]);

  // 上传进度渲染
  const renderUploadProgress = (upload: UploadingFile) => {
    const icon = upload.status === 'completed' ? CheckCircle :
                 upload.status === 'failed' ? AlertCircle : Upload;
    const iconColor = upload.status === 'completed' ? 'text-[var(--color-success)]' :
                      upload.status === 'failed' ? 'text-[var(--color-error)]' :
                      'text-[var(--text-secondary)]';

    return (
      <div
        key={upload.id}
        className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg"
      >
        {React.createElement(icon, { size: 16, className: iconColor })}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--text-primary)] truncate">{upload.name}</div>
          {upload.status === 'uploading' && (
            <div className="mt-1 h-1 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${upload.progress}%` }}
              />
            </div>
          )}
          {upload.status === 'failed' && (
            <div className="text-xs text-[var(--color-error)] mt-1">{upload.error}</div>
          )}
        </div>
        {(upload.status === 'uploading' || upload.status === 'pending') && (
          <button
            onClick={() => service.cancelUpload(upload.id)}
            className="text-[var(--text-muted)] hover:text-[var(--color-error)]"
          >
            <X size={16} />
          </button>
        )}
        {(upload.status === 'completed' || upload.status === 'cancelled' || upload.status === 'failed') && (
          <button
            onClick={() => service.removeUpload(upload.id)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen bg-[var(--bg-primary)] ${isDragging ? 'ring-2 ring-[var(--primary)] ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-10">
        <SendToolbar />

        {/* Upload Progress */}
        {service.uploadingFiles.length > 0 && (
          <div className="mb-8">
            <div className="label mb-3">UPLOADING</div>
            <div className="space-y-2">
              {service.uploadingFiles.map(renderUploadProgress)}
            </div>
          </div>
        )}

        <TransferList />

        {/* Online devices */}
        <div className="mt-10 p-5 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl">
          <h3 className="label mb-2">ONLINE_DEVICES</h3>
          <p className="text-sm text-[var(--text-muted)]">No devices online</p>
        </div>
      </main>

      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 pointer-events-none">
          <div className="text-center">
            <Upload size={48} className="text-[var(--primary)] mx-auto mb-4" />
            <p className="text-lg text-[var(--text-primary)]">Drop files here</p>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
});

export default bindServices(HomeContent, [HomeService, SendToolbarService, TransferListService]);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/index.tsx
git commit -m "feat(web): add drag-drop support and upload progress UI"
```

---

## Chunk 9: TransferList filter 变更

### Task 9.1: 更新 TransferList

**Files:**
- Modify: `apps/web/src/components/transfer-list/index.tsx`

- [ ] **Step 1: 移除 clipboard 过滤选项**

检查是否有 filter 相关的 UI，如果有 clipboard 选项则移除。

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/transfer-list/index.tsx
git commit -m "feat(web): remove clipboard filter from TransferList"
```

---

## Chunk 10: 类型检查和最终验证

### Task 10.1: 运行类型检查

- [ ] **Step 1: Server 类型检查**

```bash
cd apps/server && pnpm typecheck
```

- [ ] **Step 2: Web 类型检查**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 3: 如果有错误，修复后重新检查**

- [ ] **Step 4: 全量构建**

```bash
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement text storage optimization and upload flow

- Remove clipboard as separate transfer type
- Add storageType field to distinguish db vs s3 storage
- Text <=10KB stored directly in database content field
- Add multi-file selection and drag-drop support
- Add upload progress and cancel functionality
- Add S3 cleanup on transfer deletion

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## 实现顺序

1. **Chunk 1**: 后端 DTO 和类型变更
2. **Chunk 2**: 数据库 Schema 变更
3. **Chunk 3**: 后端验证器和 Service 变更
4. **Chunk 4**: 后端 Controller 变更
5. **Chunk 5**: 前端 API Service 变更
6. **Chunk 6**: 前端 HomeService 变更
7. **Chunk 7**: 前端 SendToolbar 变更
8. **Chunk 8**: 前端拖拽上传和进度 UI
9. **Chunk 9**: TransferList filter 变更
10. **Chunk 10**: 类型检查和最终验证
