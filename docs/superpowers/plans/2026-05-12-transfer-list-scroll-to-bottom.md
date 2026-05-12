# Transfer List Scroll-to-Bottom Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the transfer list behave like an IM message list — newest items at bottom, auto-scroll to bottom on load, load older items on scroll up, show "new transfer" banner and "scroll to bottom" button.

**Architecture:** Replace offset pagination with `createdAt + id` composite cursor pagination. Replace manual scroll/div rendering with `VirtuosoMessageList` (web) and `FlashList` + `inverted` (mobile). Change Socket `transfer:new` payload to full session object for incremental append instead of full refresh.

**Tech Stack:** `@virtuoso.dev/message-list` (web), `@shopify/flash-list` (mobile), Drizzle ORM cursor queries, Socket.io

---

## Chunk 1: Server — Cursor Pagination + Socket Payload Change

### Task 1: Update TransferListResponse type in shared packages

**Files:**
- Modify: `packages/shared/src/index.ts:101-103`

- [ ] **Step 1: Add `hasMore` to TransferListResponse in shared package**

In `packages/shared/src/index.ts`, update the `TransferListResponse` interface (line 101-103):

```typescript
export interface TransferListResponse {
  transfers: TransferSession[];
  hasMore: boolean;
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @zen-send/shared typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): add hasMore to TransferListResponse"
```

### Task 2: Implement cursor pagination in TransferService

**Files:**
- Modify: `apps/server/src/services/transfer.service.ts`

- [ ] **Step 1: Add `asc` and `or`, `lt` imports**

In `apps/server/src/services/transfer.service.ts`, update line 2 from:

```typescript
import { eq, and, desc, sql } from 'drizzle-orm';
```

to:

```typescript
import { eq, and, or, desc, asc, lt } from 'drizzle-orm';
```

- [ ] **Step 2: Replace getTransferList method with cursor-based version**

Replace the `getTransferList` method (lines 265-290) with:

```typescript
async getTransferList(
  userId: string,
  limit = 50,
  beforeCreatedAt?: number,
  beforeId?: string
): Promise<{ transfers: (TransferSessionInfo & { items: TransferItemInfo[] })[]; hasMore: boolean }> {
  const fetchLimit = limit + 1;

  let results;
  if (beforeCreatedAt !== undefined && beforeId !== undefined) {
    // Load older data using composite cursor
    // Equivalent to: WHERE (created_at, id) < (beforeCreatedAt, beforeId)
    results = await this.db
      .select()
      .from(transferSessions)
      .where(
        and(
          eq(transferSessions.userId, userId),
          or(
            lt(transferSessions.createdAt, beforeCreatedAt),
            and(
              eq(transferSessions.createdAt, beforeCreatedAt),
              lt(transferSessions.id, beforeId)
            )
          )
        )
      )
      .orderBy(asc(transferSessions.createdAt), asc(transferSessions.id))
      .limit(fetchLimit);
  } else {
    // Initial load: get latest page in DESC, then reverse to ASC
    results = await this.db
      .select()
      .from(transferSessions)
      .where(eq(transferSessions.userId, userId))
      .orderBy(desc(transferSessions.createdAt), desc(transferSessions.id))
      .limit(fetchLimit);
    results.reverse();
  }

  const hasMore = results.length > limit;
  if (hasMore) {
    results = results.slice(0, limit);
  }

  // Fetch items for each transfer
  const transfersWithItems = await Promise.all(
    results.map(async (session) => {
      const items = await this.db
        .select()
        .from(transferItems)
        .where(eq(transferItems.sessionId, session.id));
      return { ...session, items: items as TransferItemInfo[] };
    })
  );

  return { transfers: transfersWithItems, hasMore };
}
```

> **Why Drizzle query builder instead of raw SQL:** Raw `sql` template with `${beforeId}` string interpolation is vulnerable to SQL injection. Using `lt()`, `eq()`, `and()`, `or()` ensures parameterized queries and type safety.

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @zen-send/server typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/services/transfer.service.ts
git commit -m "feat(server): implement createdAt+id composite cursor pagination"
```

### Task 3: Update TransferController to accept cursor params

**Files:**
- Modify: `apps/server/src/controllers/transfer.controller.ts:131-151`

- [ ] **Step 1: Replace the list endpoint**

Replace the `list` method (lines 131-151) in `apps/server/src/controllers/transfer.controller.ts`:

```typescript
@Get()
async list(
  @CurrentUser() user: TokenPayload,
  @QueryParams() query: { limit?: string; beforeCreatedAt?: string; beforeId?: string }
) {
  const limit = query.limit ? parseInt(query.limit, 10) : 50;
  const beforeCreatedAt = query.beforeCreatedAt
    ? parseInt(query.beforeCreatedAt, 10)
    : undefined;
  const beforeId = query.beforeId || undefined;

  if (isNaN(limit) || limit < 0) {
    throw new HttpError(400, 'Invalid limit parameter');
  }
  if (
    beforeCreatedAt !== undefined &&
    (isNaN(beforeCreatedAt) || beforeCreatedAt < 0)
  ) {
    throw new HttpError(400, 'Invalid beforeCreatedAt parameter');
  }
  // beforeCreatedAt and beforeId must both be provided or both omitted
  if ((beforeCreatedAt !== undefined) !== (beforeId !== undefined)) {
    throw new HttpError(400, 'beforeCreatedAt and beforeId must both be provided or both omitted');
  }

  const result = await this.transferService.getTransferList(
    user.userId,
    limit,
    beforeCreatedAt,
    beforeId
  );
  return ResponseUtil.success(result);
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter @zen-send/server typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/controllers/transfer.controller.ts
git commit -m "feat(server): accept cursor params in transfer list endpoint"
```

### Task 4: Update Socket transfer:new payload to full session

**Files:**
- Modify: `apps/server/src/controllers/transfer.controller.ts:49-65` (init inline text)
- Modify: `apps/server/src/controllers/transfer.controller.ts:107-119` (complete upload)
- Modify: `apps/server/src/socket/socket.ts:92-102` (transfer:notify handler)

- [ ] **Step 1: Update transfer:new payload in init handler (inline text)**

Replace lines 49-65 in `apps/server/src/controllers/transfer.controller.ts`:

```typescript
// Emit transfer:new to all user's devices (for inline text, transfer is complete immediately)
const io = getSocketIO();
if (io) {
  const transfer = await this.transferService.getTransferById(
    result.sessionId,
    user.userId
  );
  if (transfer) {
    io.to(`user:${user.userId}`).emit('transfer:new', { session: transfer });
  }
}
```

- [ ] **Step 2: Update transfer:new payload in complete handler**

Replace lines 107-119 in `apps/server/src/controllers/transfer.controller.ts`:

```typescript
// Emit transfer:new to all user's devices
const io = getSocketIO();
if (io) {
  const transfer = await this.transferService.getTransferById(id, user.userId);
  if (transfer) {
    io.to(`user:${user.userId}`).emit('transfer:new', { session: transfer });
  }
}
```

- [ ] **Step 3: Update transfer:notify handler in socket.ts to emit full session**

In `apps/server/src/socket/socket.ts`, replace the `transfer:notify` handler (lines 92-102). Add `TransferService` import at the top:

```typescript
import { TransferService } from '../services/transfer.service.js';
```

Replace lines 92-102:

```typescript
socket.on('transfer:notify', async (data: { targetDeviceId: string; sessionId: string }) => {
  const { targetDeviceId, sessionId } = data;
  const userId = socket.user?.userId;

  try {
    const transferService = Container.get(TransferService);
    const transfer = userId
      ? await transferService.getTransferById(sessionId, userId)
      : null;

    const targetSocketInfo = deviceSockets.get(targetDeviceId);
    if (targetSocketInfo?.socketId) {
      if (transfer) {
        io.to(targetSocketInfo.socketId).emit('transfer:new', { session: transfer });
      } else {
        io.to(targetSocketInfo.socketId).emit('transfer:new', { sessionId });
      }
      logger.info({ targetDeviceId, sessionId }, 'Transfer notification sent');
    } else {
      logger.warn({ targetDeviceId, sessionId }, 'Target device not found or offline');
    }
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to fetch transfer for notification');
  }
});
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter @zen-send/server typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/controllers/transfer.controller.ts apps/server/src/socket/socket.ts
git commit -m "feat(server): emit full TransferSession in transfer:new socket event"
```

### Task 5: Verify server changes end-to-end

- [ ] **Step 1: Start the server**

Run: `pnpm dev:server`

- [ ] **Step 2: Test initial load (no cursor)**

```bash
curl -s -H "Authorization: Bearer <token>" http://localhost:3110/api/transfers | jq '.data | {hasMore, count: (.transfers | length)}'
```

Expected: `{"hasMore": true/false, "count": N}` where N <= 50

- [ ] **Step 3: Test cursor pagination**

Get the first item's `createdAt` and `id` from the initial load, then:

```bash
curl -s -H "Authorization: Bearer <token>" "http://localhost:3110/api/transfers?beforeCreatedAt=<ts>&beforeId=<id>" | jq '.data | {hasMore, count: (.transfers | length)}'
```

Expected: Older transfers, `hasMore` flag

- [ ] **Step 4: Stop the server**

---

## Chunk 2: Web — VirtuosoMessageList + Service Refactor

### Task 6: Install @virtuoso.dev/message-list

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install the package**

Run: `cd apps/web && pnpm add @virtuoso.dev/message-list`

- [ ] **Step 2: Verify installation**

Run: `cd apps/web && pnpm ls @virtuoso.dev/message-list`
Expected: Version listed

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "chore(web): add @virtuoso.dev/message-list dependency"
```

### Task 7: Refactor HomeService for ASC order + cursor pagination

**Files:**
- Modify: `apps/web/src/pages/home/home.service.ts`

- [ ] **Step 1: Rewrite HomeService to support ASC order and cursor pagination**

Replace `apps/web/src/pages/home/home.service.ts` with the following. Key changes:
- `transfers[]` stores data in ASC order (earliest first)
- `loadTransfers()` fetches latest page using new cursor API
- `loadOlderTransfers()` prepends older data using cursor
- `addTransfer()` appends to end with dedup
- `filteredTransfers` returns ASC order (no reversal)
- Remove `loadMoreTransfers()`
- Add `isLoadingOlder` observable
- Make `hasMore` public (was `private _hasMore` with getter)
- `sendText()` no longer calls `loadTransfers()` — Socket `transfer:new` will handle the update

```typescript
import { Service } from '@rabjs/react';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { SocketService } from '../../services/socket.service';
import type { TransferSession } from '@zen-send/shared';

export type TransferFilter = 'all' | 'file' | 'text';
export type TimeFilter = 'all' | 'today' | 'week' | 'month';

export interface UploadingFile {
  id: string;
  name: string;
  size: number;
  type?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  sessionId?: string;
  error?: string;
  speed?: number;
  eta?: number;
  startTime?: number;
  uploadedBytes?: number;
}

export class HomeService extends Service {
  transfers: TransferSession[] = [];
  selectedFiles: { name: string; size: number; type?: string; data?: ArrayBuffer }[] = [];
  filter: TransferFilter = 'all';
  timeFilter: TimeFilter = 'all';
  searchQuery = '';
  isLoading = false;
  isLoadingOlder = false;
  error: string | null = null;
  uploadingFiles: UploadingFile[] = [];
  previewTransfer: TransferSession | null = null;
  deleteConfirmId: string | null = null;
  hasMore = true;
  private _fileData = new Map<
    string,
    { name: string; size: number; type?: string; data?: ArrayBuffer }
  >();

  get authService() {
    return this.resolve(AuthService);
  }

  get apiService() {
    return this.resolve(ApiService);
  }

  get socketService() {
    return this.resolve(SocketService);
  }

  get filteredTransfers() {
    let filtered = this.transfers;

    if (this.filter !== 'all') {
      filtered = filtered.filter((t) => t.items?.some((item) => item.type === this.filter));
    }

    if (this.timeFilter !== 'all') {
      const now = Date.now();
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000;
      const startOfMonth = startOfToday - 30 * 24 * 60 * 60 * 1000;

      filtered = filtered.filter((t) => {
        if (this.timeFilter === 'today') return t.createdAt >= startOfToday;
        if (this.timeFilter === 'week') return t.createdAt >= startOfWeek;
        if (this.timeFilter === 'month') return t.createdAt >= startOfMonth;
        return true;
      });
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const name = (t.originalFileName || '').toLowerCase();
        const textContent =
          t.items?.find((item) => item.type === 'text')?.content?.toLowerCase() || '';
        return name.includes(query) || textContent.includes(query);
      });
    }

    return filtered;
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  setTypeFilter(filter: TransferFilter) {
    this.filter = filter;
  }

  setTimeFilter(filter: TimeFilter) {
    this.timeFilter = filter;
  }

  setPreviewTransfer(transfer: TransferSession | null) {
    this.previewTransfer = transfer;
  }

  setDeleteConfirm(id: string | null) {
    this.deleteConfirmId = id;
  }

  markTransferComplete(sessionId: string) {
    const transfer = this.transfers.find((t) => t.id === sessionId);
    if (transfer) {
      transfer.status = 'completed';
      this.transfers = [...this.transfers];
    }
  }

  addTransfer(session: TransferSession) {
    if (this.transfers.some((t) => t.id === session.id)) return;
    this.transfers = [...this.transfers, session];
  }

  async loadTransfers(limit = 50) {
    this.isLoading = true;
    this.error = null;
    try {
      const result = await this.apiService.get<{
        transfers: TransferSession[];
        hasMore: boolean;
      }>(`/api/transfers?limit=${limit}`);
      this.transfers = result.transfers || [];
      this.hasMore = result.hasMore;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load transfers';
    } finally {
      this.isLoading = false;
    }
  }

  async loadOlderTransfers(limit = 50) {
    if (this.isLoadingOlder || !this.hasMore || this.transfers.length === 0) return;
    this.isLoadingOlder = true;
    try {
      const first = this.transfers[0];
      const result = await this.apiService.get<{
        transfers: TransferSession[];
        hasMore: boolean;
      }>(`/api/transfers?limit=${limit}&beforeCreatedAt=${first.createdAt}&beforeId=${first.id}`);
      const older = result.transfers || [];
      const existingIds = new Set(this.transfers.map((t) => t.id));
      const newTransfers = older.filter((t) => !existingIds.has(t.id));
      this.transfers = [...newTransfers, ...this.transfers];
      this.hasMore = result.hasMore;
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load older transfers';
    } finally {
      this.isLoadingOlder = false;
    }
  }

  addFiles(files: { name: string; size: number; type?: string; data?: ArrayBuffer }[]) {
    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeFile(index: number) {
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
  }

  clearFiles() {
    this.selectedFiles = [];
  }

  async uploadFiles() {
    const files = this.selectedFiles;
    if (files.length === 0) return;

    for (const file of files) {
      const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const uploadingFile: UploadingFile = {
        id: uploadId,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending',
      };
      this.uploadingFiles = [...this.uploadingFiles, uploadingFile];
      this._fileData.set(uploadId, {
        name: file.name,
        size: file.size,
        type: file.type,
        data: file.data,
      });

      // Add temporary session to list (appears at bottom in ASC order)
      const tempSession: TransferSession = {
        id: uploadId,
        userId: this.authService.user?.id || '',
        sourceDeviceId: 'web-device',
        targetDeviceId: null,
        status: 'pending',
        s3Bucket: '',
        s3Key: '',
        originalFileName: file.name,
        totalSize: file.size,
        chunkCount: 0,
        receivedChunks: 0,
        contentType: file.type || 'application/octet-stream',
        ttlExpiresAt: 0,
        createdAt: Math.floor(Date.now() / 1000),
        items: [
          {
            id: `temp-item-${uploadId}`,
            sessionId: uploadId,
            type: 'file',
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            content: undefined,
            thumbnailKey: undefined,
            storageType: 's3',
            createdAt: Math.floor(Date.now() / 1000),
          },
        ],
      };
      this.transfers = [...this.transfers, tempSession];

      this.executeUpload(uploadId, file);
    }

    this.selectedFiles = [];
  }

  private async executeUpload(
    uploadId: string,
    file: { name: string; size: number; type?: string; data?: ArrayBuffer }
  ) {
    const TEXT_INLINE_MAX_SIZE = 10 * 1024;
    const CHUNK_SIZE = 5 * 1024 * 1024;
    const startTime = Date.now();
    const speedSamples: number[] = [];
    let lastUpdateTime = startTime;
    let lastUploadedBytes = 0;

    this.updateUploadStatus(uploadId, { startTime, uploadedBytes: 0 });

    const updateSpeedAndEta = (uploadedBytes: number) => {
      const now = Date.now();
      const elapsed = (now - lastUpdateTime) / 1000;
      const bytesDelta = uploadedBytes - lastUploadedBytes;

      if (elapsed >= 0.5 && bytesDelta > 0) {
        const currentSpeed = bytesDelta / elapsed;
        speedSamples.push(currentSpeed);
        if (speedSamples.length > 5) speedSamples.shift();

        const avgSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
        const remainingBytes = file.size - uploadedBytes;
        const eta = avgSpeed > 0 ? remainingBytes / avgSpeed : 0;

        this.updateUploadStatus(uploadId, { speed: avgSpeed, eta, uploadedBytes });
        lastUpdateTime = now;
        lastUploadedBytes = uploadedBytes;
      }
    };

    try {
      this.updateUploadStatus(uploadId, { status: 'uploading' });

      const sourceDeviceId = 'web-device';

      const isTextFile =
        file.type?.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.json');

      if (isTextFile && file.data && file.size <= TEXT_INLINE_MAX_SIZE) {
        const content = new TextDecoder().decode(file.data);
        const { sessionId } = await this.apiService.post<{ sessionId: string }>(
          '/api/transfers/init',
          {
            sourceDeviceId,
            type: 'text',
            fileName: file.name,
            contentType: file.type || 'text/plain',
            totalSize: file.size,
            content,
          }
        );

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
          sessionId,
          speed: 0,
          eta: 0,
          uploadedBytes: file.size,
        });
        // Socket transfer:new will deliver the full session; addTransfer dedup handles it
      } else {
        const chunkCount = Math.ceil(file.size / CHUNK_SIZE);
        const { sessionId, presignedUrls } = await this.apiService.post<{
          sessionId: string;
          presignedUrls: string[];
        }>('/api/transfers/init', {
          sourceDeviceId,
          type: 'file',
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          totalSize: file.size,
          chunkCount,
        });

        this.updateUploadStatus(uploadId, { sessionId });

        const totalChunks = presignedUrls.length;
        let completedChunks = 0;

        await Promise.all(
          presignedUrls.map(async (url: string, index: number) => {
            const start = index * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.data?.slice(start, end);

            if (!chunk) return;

            const etag = await this.uploadChunkToS3(url, chunk);

            await this.apiService.post(`/api/transfers/${sessionId}/chunks`, {
              chunkIndex: index,
              etag,
            });

            completedChunks++;
            const progress = Math.round((completedChunks / totalChunks) * 100);
            const uploadedBytes = Math.min(completedChunks * CHUNK_SIZE, file.size);
            this.updateUploadStatus(uploadId, { progress, uploadedBytes });
            updateSpeedAndEta(uploadedBytes);
          })
        );

        await this.apiService.post(`/api/transfers/${sessionId}/complete`);

        this.updateUploadStatus(uploadId, {
          status: 'completed',
          progress: 100,
          speed: 0,
          eta: 0,
          uploadedBytes: file.size,
        });
        // Socket transfer:new will deliver the full session; addTransfer dedup handles it
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
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    if (!response.ok) throw new Error(`Chunk upload failed: ${response.status}`);
    return response.headers.get('ETag') || '';
  }

  private updateUploadStatus(uploadId: string, updates: Partial<UploadingFile>) {
    this.uploadingFiles = this.uploadingFiles.map((f) =>
      f.id === uploadId ? { ...f, ...updates } : f
    );

    if (updates.sessionId) {
      this.transfers = this.transfers.map((t) =>
        t.id === uploadId ? { ...t, id: updates.sessionId! } : t
      );
    }

    if (updates.status === 'completed' && updates.sessionId) {
      this.transfers = this.transfers.map((t) =>
        t.id === updates.sessionId ? { ...t, status: 'completed' } : t
      );
      setTimeout(() => this.removeUpload(uploadId), 2000);
    }
  }

  async cancelUpload(uploadId: string) {
    const file = this.uploadingFiles.find((f) => f.id === uploadId);
    if (file?.sessionId) {
      await this.apiService.deleteTransfer(file.sessionId);
    }
    this.updateUploadStatus(uploadId, { status: 'cancelled' });
    setTimeout(() => this.removeUpload(uploadId), 3000);
  }

  removeUpload(uploadId: string) {
    this.uploadingFiles = this.uploadingFiles.filter((f) => f.id !== uploadId);
    this._fileData.delete(uploadId);
  }

  async retryUpload(uploadId: string) {
    const fileData = this._fileData.get(uploadId);
    if (!fileData) return;

    const newUploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const uploadingFile: UploadingFile = {
      id: newUploadId,
      name: fileData.name,
      size: fileData.size,
      progress: 0,
      status: 'pending',
    };

    this.updateUploadStatus(uploadId, { status: 'cancelled' });
    this.uploadingFiles = this.uploadingFiles.filter((f) => f.id !== uploadId);
    this.uploadingFiles = [...this.uploadingFiles, uploadingFile];
    this._fileData.set(newUploadId, fileData);
    this._fileData.delete(uploadId);
    this.executeUpload(newUploadId, fileData);
  }

  async sendText(content: string) {
    const sourceDeviceId = 'web-device';
    try {
      await this.apiService.post('/api/transfers/init', {
        sourceDeviceId,
        type: 'text',
        fileName: 'text.txt',
        contentType: 'text/plain',
        totalSize: new TextEncoder().encode(content).length,
        content,
      });
      // No loadTransfers() — Socket transfer:new will deliver the session incrementally
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Failed to send text');
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/home/home.service.ts
git commit -m "refactor(web): HomeService ASC order + cursor pagination + incremental addTransfer"
```

### Task 8: Replace TransferList with VirtuosoMessageList

**Files:**
- Modify: `apps/web/src/components/transfer-list/index.tsx`

> **Key implementation notes:**
> - Use `data` prop (NOT `initialData`) so the list re-renders when transfers change
> - Use `scrollModifier: 'auto-scroll-to-bottom'` when new transfers arrive — only scrolls if already at bottom
> - Use `scrollModifier: 'prepend'` when older transfers are prepended — preserves scroll position
> - Use `scrollToItem` (NOT `scrollToIndex`) for the VirtuosoMessageList ref
> - The `atBottomStateChange` callback is available on VirtuosoMessageList via the `atBottomStateChange` prop

- [ ] **Step 1: Rewrite TransferList component**

Replace the entire content of `apps/web/src/components/transfer-list/index.tsx`:

```typescript
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer, useService } from '@rabjs/react';
import {
  VirtuosoMessageList,
  VirtuosoMessageListLicense,
  VirtuosoMessageListMethods,
  type DataWithScrollModifier,
} from '@virtuoso.dev/message-list';
import { ChevronDown, MailOpen } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { DeviceService } from '../../services/device.service';
import { SocketService } from '../../services/socket.service';
import { ToastService } from '../toast/toast.service';
import TransferItem from '../transfer-item';
import { PreviewModal } from '../preview-modal';
import type { TransferSession } from '@zen-send/shared';

function TransferListInner() {
  const homeService = useService(HomeService);
  const deviceService = useService(DeviceService);
  const socketService = useService(SocketService);
  const toastService = useService(ToastService);
  const virtuosoRef = useRef<VirtuosoMessageListMethods<TransferSession, null>>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newTransferCount, setNewTransferCount] = useState(0);

  useEffect(() => {
    deviceService.loadDevices();
  }, [deviceService]);

  useEffect(() => {
    const handleTransferNew = (data: unknown) => {
      const payload = data as { session: TransferSession };
      const session = payload.session;
      if (!session) return;

      // addTransfer already deduplicates by id
      homeService.addTransfer(session);

      if (!atBottom) {
        setNewTransferCount((c) => c + 1);
      }
    };

    const handleTransferComplete = (data: unknown) => {
      const { sessionId } = data as { sessionId: string };
      homeService.markTransferComplete(sessionId);
    };

    socketService.onTransferNew(handleTransferNew);
    socketService.onTransferComplete(handleTransferComplete);

    return () => {
      socketService.offTransferNew(handleTransferNew);
      socketService.offTransferComplete(handleTransferComplete);
    };
  }, [socketService, homeService, atBottom]);

  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToItem({ index: 'LAST', align: 'end' });
    setNewTransferCount(0);
  }, []);

  const handlePreview = useCallback(
    (transfer: TransferSession) => {
      homeService.setPreviewTransfer(transfer);
    },
    [homeService]
  );

  const handleDownload = useCallback(
    async (transfer: TransferSession) => {
      try {
        const apiService = homeService.apiService;
        const blob = await apiService.getTransferFile(transfer.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = transfer.originalFileName || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Download failed:', err);
      }
    },
    [homeService]
  );

  const handleDelete = useCallback(
    async (transfer: TransferSession) => {
      const ok = await toastService.confirm('确定要删除这条记录吗？');
      if (!ok) return;
      try {
        await homeService.apiService.deleteTransfer(transfer.id);
        homeService.loadTransfers();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    },
    [homeService, toastService]
  );

  if (homeService.isLoading && homeService.transfers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const transfers = homeService.filteredTransfers;

  if (transfers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-20">
        <MailOpen size={48} className="text-[var(--text-secondary)] mb-3" />
        <p className="text-sm text-[var(--text-secondary)]">No transfers yet</p>
        <PreviewModal />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden relative">
      <VirtuosoMessageListLicense licenseKey="">
        <VirtuosoMessageList<TransferSession, null>
          ref={virtuosoRef}
          data={{
            data: transfers,
            scrollModifier: {
              type: 'auto-scroll-to-bottom',
              autoScroll: ({ atBottom, scrollInProgress }) => {
                if (atBottom || scrollInProgress) {
                  return { index: 'LAST', align: 'end', behavior: 'smooth' };
                }
                return false;
              },
            },
          }}
          style={{ height: '100%' }}
          computeItemKey={({ data }) => data.id}
          ItemContent={({ data }) => (
            <TransferItem
              transfer={data}
              onPreview={handlePreview}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />
          )}
          atBottomStateChange={(bottom) => {
            setAtBottom(bottom);
            if (bottom) setNewTransferCount(0);
          }}
          Header={() =>
            homeService.isLoadingOlder ? (
              <div className="py-4 text-center">
                <div className="w-5 h-5 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : null
          }
        />
      </VirtuosoMessageListLicense>

      {/* New transfer banner */}
      {newTransferCount > 0 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2
            px-4 py-2 rounded-full bg-[var(--accent)] text-white text-sm font-medium
            shadow-lg cursor-pointer hover:bg-[var(--accent)]/90 transition-colors z-10"
          onClick={scrollToBottom}
        >
          <span>{newTransferCount} 条新传输</span>
          <ChevronDown size={16} />
        </div>
      )}

      {/* Scroll to bottom button */}
      {!atBottom && newTransferCount === 0 && (
        <button
          className="absolute bottom-4 right-4 w-10 h-10 rounded-full
            bg-[var(--bg-surface)] border border-[var(--border-subtle)]
            shadow-md flex items-center justify-center
            hover:bg-[var(--bg-elevated)] transition-colors z-10"
          onClick={scrollToBottom}
        >
          <ChevronDown size={20} className="text-[var(--text-secondary)]" />
        </button>
      )}

      <PreviewModal />
    </div>
  );
}

export default observer(TransferListInner);
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS (may need adjustments based on VirtuosoMessageList exact API)

- [ ] **Step 3: Test in browser**

Run: `pnpm dev:web`
- Verify page loads and scrolls to bottom
- Verify new transfers appear at bottom and auto-scroll when at bottom
- Verify scroll-up shows "scroll to bottom" button
- Verify Socket `transfer:new` adds transfer without full refresh

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/transfer-list/index.tsx
git commit -m "feat(web): replace transfer list with VirtuosoMessageList"
```

### Task 9: Verify Search page still works

**Files:**
- Modify: `apps/web/src/pages/search/index.tsx` (only if needed)

- [ ] **Step 1: Check search page**

The search page renders `homeService.filteredTransfers` which is now in ASC order. No code change should be needed — search results will show oldest-first which is acceptable.

Run: `pnpm dev:web`, navigate to search, type a query, verify results display.

---

## Chunk 3: Mobile — FlashList + Service Refactor

### Task 10: Install @shopify/flash-list

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Install the package**

Run: `cd apps/mobile && pnpm add @shopify/flash-list`

- [ ] **Step 2: Verify installation**

Run: `cd apps/mobile && pnpm ls @shopify/flash-list`
Expected: Version listed

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/pnpm-lock.yaml
git commit -m "chore(mobile): add @shopify/flash-list dependency"
```

### Task 11: Refactor Mobile HomeService for ASC order + cursor pagination

**Files:**
- Modify: `apps/mobile/src/services/home.service.ts`

- [ ] **Step 1: Rewrite key methods in HomeService**

Update these methods in `apps/mobile/src/services/home.service.ts`:

Replace `loadTransfers()` (lines 80-93):

```typescript
async loadTransfers() {
  this.loading = true;
  try {
    const response = await this.apiService.get<{
      transfers: TransferSession[];
      hasMore: boolean;
    }>(`/api/transfers?limit=${this.LIMIT}`);
    this.transfers = response.transfers;
    this.hasMore = response.hasMore;
  } catch (err) {
    console.error('Failed to load transfers:', err);
  } finally {
    this.loading = false;
  }
}
```

Replace `refresh()` (lines 96-113):

```typescript
async refresh() {
  if (this.isRefreshing) return;
  this.isRefreshing = true;
  try {
    const response = await this.apiService.get<{
      transfers: TransferSession[];
      hasMore: boolean;
    }>(`/api/transfers?limit=${this.LIMIT}`);
    this.transfers = response.transfers;
    this.hasMore = response.hasMore;
  } catch (err) {
    console.error('Failed to refresh transfers:', err);
  } finally {
    this.isRefreshing = false;
  }
}
```

Replace `loadMore()` (lines 115-130) — rename to `loadOlder()`:

```typescript
async loadOlder() {
  if (this.loadingMore || !this.hasMore || this.transfers.length === 0) return;
  this.loadingMore = true;
  try {
    const first = this.transfers[0];
    const response = await this.apiService.get<{
      transfers: TransferSession[];
      hasMore: boolean;
    }>(`/api/transfers?limit=${this.LIMIT}&beforeCreatedAt=${first.createdAt}&beforeId=${first.id}`);
    const older = response.transfers || [];
    const existingIds = new Set(this.transfers.map((t) => t.id));
    const newTransfers = older.filter((t) => !existingIds.has(t.id));
    this.transfers = [...newTransfers, ...this.transfers];
    this.hasMore = response.hasMore;
  } catch (err) {
    console.error('Failed to load older transfers:', err);
  } finally {
    this.loadingMore = false;
  }
}
```

Update `addTransfer()` (line 140-142) — append to end with dedup:

```typescript
addTransfer(transfer: TransferSession) {
  if (this.transfers.some((t) => t.id === transfer.id)) return;
  this.transfers = [...this.transfers, transfer];
}
```

Remove `offset` property (line 39) — no longer needed.

Update `sendText()` (lines 164-175) — no longer calls `refresh()`:

```typescript
async sendText(text: string): Promise<void> {
  const apiService = this.resolve(ApiService);
  await apiService.post('/api/transfers/init', {
    type: 'text',
    content: text,
    totalSize: new TextEncoder().encode(text).length,
    contentType: 'text/plain',
    sourceDeviceId: this.socketService.deviceId ?? 'mobile-device',
  });
  // Socket transfer:new will deliver the session incrementally
}
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/mobile && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/home.service.ts
git commit -m "refactor(mobile): HomeService ASC order + cursor pagination + incremental addTransfer"
```

### Task 12: Replace TransferList with FlashList + inverted + banners

**Files:**
- Modify: `apps/mobile/src/components/transfer-list/index.tsx`

> **Key implementation notes:**
> - Data is ASC order, `inverted` flips rendering so newest appears at bottom
> - `ListFooterComponent` renders at the visual top in inverted mode (for loading spinner)
> - `onStartReached` triggers at the visual top in inverted mode (load older)
> - `maintainVisibleContentPosition` keeps scroll stable when new items arrive
> - Include "new transfer" banner and "scroll to bottom" button (same as web)

- [ ] **Step 1: Rewrite TransferList component**

Replace the entire content of `apps/mobile/src/components/transfer-list/index.tsx`:

```typescript
import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useService, observer } from '@rabjs/react';
import { ThemeService } from '../../services/theme.service';
import { HomeService } from '../../services/home.service';
import TransferItem from '../transfer-item';
import type { TransferSession } from '@zen-send/shared';

interface TransferListProps {
  onItemPress: (transfer: TransferSession) => void;
  onDownload: (transfer: TransferSession) => void;
}

function TransferListInner({ onItemPress, onDownload }: TransferListProps) {
  const themeService = useService(ThemeService);
  const homeService = useService(HomeService);
  const colors = themeService.colors;
  const listRef = useRef<FlashList<TransferSession>>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [newTransferCount, setNewTransferCount] = useState(0);

  const renderItem = ({ item }: { item: TransferSession }) => (
    <TransferItem
      transfer={item}
      onPress={() => onItemPress(item)}
      onDownload={() => onDownload(item)}
    />
  );

  // In inverted mode, ListFooterComponent renders at visual top (for older data loading)
  const renderFooter = () => {
    if (!homeService.loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons
        name="mail-open-outline"
        size={48}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transfers yet</Text>
    </View>
  );

  const scrollToBottom = useCallback(() => {
    // In inverted mode, offset 0 = bottom
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setNewTransferCount(0);
  }, []);

  if (homeService.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        ref={listRef}
        data={homeService.filteredTransfers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={72}
        contentContainerStyle={styles.list}
        inverted
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onStartReached={() => homeService.loadOlder()}
        onStartReachedThreshold={0.1}
        maintainVisibleContentPosition={{
          autoscrollToBottomThreshold: 0.2,
          startRenderingFromBottom: true,
        }}
        onScroll={(e) => {
          // In inverted mode, contentOffset.y close to 0 means at bottom
          const offsetY = e.nativeEvent.contentOffset.y;
          setAtBottom(offsetY < 50);
          if (offsetY < 50) setNewTransferCount(0);
        }}
      />

      {/* New transfer banner */}
      {newTransferCount > 0 && (
        <TouchableOpacity
          style={[styles.banner, { backgroundColor: colors.accent }]}
          onPress={scrollToBottom}
          activeOpacity={0.9}
        >
          <Text style={styles.bannerText}>{newTransferCount} 条新传输</Text>
          <Ionicons name="chevron-down" size={16} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Scroll to bottom button */}
      {!atBottom && newTransferCount === 0 && (
        <TouchableOpacity
          style={[styles.scrollToBottom, { backgroundColor: colors.bgSurface, borderColor: colors.borderSubtle }]}
          onPress={scrollToBottom}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  banner: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -70 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  bannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollToBottom: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default observer(TransferListInner);
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/mobile && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/transfer-list/index.tsx
git commit -m "feat(mobile): FlashList + inverted + new transfer banner + scroll-to-bottom"
```

### Task 13: Update Mobile SocketService for incremental append

**Files:**
- Modify: `apps/mobile/src/services/socket.service.ts:72-81`

- [ ] **Step 1: Update transfer:new handler to use addTransfer instead of refresh**

In `apps/mobile/src/services/socket.service.ts`, replace lines 72-81:

```typescript
this.socket.on('transfer:new', (data: unknown) => {
  const payload = data as { session?: TransferSession };
  const session = payload.session;
  if (!session) return;

  const title = session.sourceDeviceId || 'New Transfer';
  const body = session.items?.[0]?.name || 'You have a new incoming transfer';
  this.notificationService.showTransferNotification(title, body);

  // Incremental append instead of full refresh
  this.homeService.addTransfer(session);
});
```

Add the import at the top of the file:

```typescript
import type { TransferSession } from '@zen-send/shared';
```

- [ ] **Step 2: Run typecheck**

Run: `cd apps/mobile && pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/socket.service.ts
git commit -m "refactor(mobile): incremental addTransfer on transfer:new instead of full refresh"
```

---

## Chunk 4: Final Verification

### Task 14: End-to-end verification

- [ ] **Step 1: Start both server and web**

Run: `pnpm dev`

- [ ] **Step 2: Test initial load scrolls to bottom**

1. Open web app
2. After transfers load, verify you are at the bottom of the list
3. Latest transfer should be visible at the bottom

- [ ] **Step 3: Test scroll-up loads older data**

1. Scroll up in the transfer list
2. Verify loading spinner appears at the top
3. Verify older transfers are prepended without scroll jump

- [ ] **Step 4: Test new transfer appears at bottom**

1. Send a text transfer from the bottom toolbar
2. Verify it appears at the bottom of the list
3. Verify list auto-scrolls to show it (when at bottom)

- [ ] **Step 5: Test "new transfer" banner**

1. Scroll up away from bottom
2. From another tab/device, send a transfer
3. Verify "N 条新传输" banner appears
4. Click the banner — should scroll to bottom and hide

- [ ] **Step 6: Test "scroll to bottom" button**

1. Scroll up away from bottom
2. Verify the down-arrow button appears in bottom-right
3. Click it — should scroll to bottom and hide

- [ ] **Step 7: Test mobile app**

Run: `pnpm dev:mobile`
1. Open the mobile app
2. Verify transfers load with newest at bottom
3. Verify scrolling up loads older data
4. Send a text transfer — verify it appears at bottom
5. Scroll away from bottom — verify "scroll to bottom" button appears

- [ ] **Step 8: Fix any issues found**

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: transfer list scroll-to-bottom with cursor pagination (web + mobile)"
```
