# Transfer Chat Bottom Toolbar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将传输页面从"顶部搜索栏 + 消息列表"改为微信风格的"消息列表 + 底部输入工具栏"布局

**Architecture:** 新建 `bottom-toolbar/` 和 `search-modal/` 组件，修改 `transfer-chat.tsx` 添加拖拽上传，修改 `message-bubble.tsx` 点击触发预览。复用现有 HomeService 的上传和预览逻辑。

**Tech Stack:** React 19, @rabjs/react (observer/Service 模式), Tailwind CSS v4, lucide-react

---

## File Structure

```
components/
├── transfer-chat/
│   ├── index.ts
│   ├── transfer-chat.tsx      # 修改: 添加拖拽上传
│   ├── transfer-chat.service.ts
│   ├── message-bubble.tsx     # 修改: 点击触发 PreviewModal
│   ├── date-separator.tsx
│   ├── device-tag.tsx
│   ├── hooks/
│   │   └── use-transfer-bubble.ts
│   ├── bottom-toolbar/        # 新增
│   │   ├── index.ts
│   │   └── bottom-toolbar.tsx
│   └── search-modal/          # 新增
│       ├── index.ts
│       └── search-modal.tsx

Modified:
- apps/web/src/pages/home/home.service.ts    # 添加 sendText() 方法
- apps/web/src/components/search-bar/index.tsx  # 移除 (不再使用)
```

---

## Chunk 1: Create BottomToolbar Component

### Task 1.1: Create bottom-toolbar component

**Files:**
- Create: `apps/web/src/components/transfer-chat/bottom-toolbar/index.ts`
- Create: `apps/web/src/components/transfer-chat/bottom-toolbar/bottom-toolbar.tsx`
- Modify: `apps/web/src/pages/home/home.service.ts` # 添加 sendText 方法

- [ ] **Step 1: Add sendText method to HomeService**

在 `home.service.ts` 的 `HomeService` 类中添加发送文本的方法：

```typescript
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
    // Refresh transfers list to show new message
    await this.loadTransfers();
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Failed to send text');
  }
}
```

- [ ] **Step 2: Create bottom-toolbar/index.ts barrel export**

```ts
export { BottomToolbar } from './bottom-toolbar';
export { default } from './bottom-toolbar';
```

- [ ] **Step 3: Create bottom-toolbar.tsx**

```tsx
import React, { useState, useCallback, useRef } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { Paperclip, Search, Send, ArrowUp } from 'lucide-react';
import { HomeService } from '../../../pages/home/home.service';
import { TransferChatService } from '../transfer-chat.service';

const BottomToolbar = observer(() => {
  const homeService = useService(HomeService);
  const chatService = useService(TransferChatService);
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const fileData = files.map((file) => ({
      name: file.name,
      size: file.size,
      data: undefined as ArrayBuffer | undefined,
    }));

    // Read file data
    fileData.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        fileData[index].data = reader.result as ArrayBuffer;
        homeService.addFiles(fileData);
        homeService.uploadFiles();
      };
      reader.readAsArrayBuffer(files[index]);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [homeService]);

  const handleSendText = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    try {
      await homeService.sendText(text);
      setInputText('');
    } catch (err) {
      console.error('Failed to send text:', err);
    }
  }, [homeService, inputText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  const openSearchModal = useCallback(() => {
    // Trigger search modal - will be implemented in Chunk 4
    document.dispatchEvent(new CustomEvent('open-search-modal'));
  }, []);

  const canSend = inputText.trim().length > 0;

  return (
    <div className="sticky bottom-0 bg-[var(--bg-elevated)] border-t border-[var(--border-subtle)] px-3 py-2">
      {/* Icons Row */}
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          title="选择文件"
        >
          <Paperclip size={20} className="text-[var(--text-secondary)]" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <button
          type="button"
          onClick={openSearchModal}
          className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          title="搜索"
        >
          <Search size={20} className="text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入文字..."
          rows={1}
          className="flex-1 px-3 py-2 bg-[var(--bg-surface)] rounded-xl
                     text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none resize-none"
          style={{ minHeight: '40px', maxHeight: '120px' }}
        />
        <button
          type="button"
          onClick={handleSendText}
          disabled={!canSend}
          className={`p-2.5 rounded-xl transition-colors
            ${canSend
              ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
          title="发送"
        >
          {canSend ? <ArrowUp size={20} /> : <Send size={20} />}
        </button>
      </div>
    </div>
  );
});

export default bindServices(BottomToolbar, [HomeService, TransferChatService]);
export { BottomToolbar };
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/transfer-chat/bottom-toolbar/
git add apps/web/src/pages/home/home.service.ts
git commit -m "feat(web): add BottomToolbar component with file select and text input"
```

---

### Task 1.2: Integrate BottomToolbar into TransferChat

**Files:**
- Modify: `apps/web/src/components/transfer-chat/transfer-chat.tsx`

- [ ] **Step 1: Update transfer-chat.tsx to add BottomToolbar and remove SearchBarComponent**

Replace `SearchBarComponent` import with `BottomToolbar`:

```tsx
// Change from:
import SearchBarComponent from '../search-bar';

// Change to:
import BottomToolbar from './bottom-toolbar';
```

In the return statement, replace:
```tsx
// Change from:
<div className="space-y-3">
  <SearchBarComponent />

// Change to:
<div className="flex flex-col h-full">
  <div className="flex-1 overflow-y-auto space-y-3">
```

And add BottomToolbar at the bottom:
```tsx
    {/* Transfer list content */}
    {dateGroups.length === 0 ? (
      // ... existing empty state
    ) : (
      // ... existing transfer list
    )}
  </div>
  <BottomToolbar />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/transfer-chat/transfer-chat.tsx
git commit -m "feat(web): integrate BottomToolbar into TransferChat"
```

---

## Chunk 2: Add Drag & Drop Upload

### Task 2.1: Add drag & drop upload to TransferChatContent

**Files:**
- Modify: `apps/web/src/components/transfer-chat/transfer-chat.tsx`

- [ ] **Step 1: Add drag state and handlers**

Add state and handlers for drag & drop:

```tsx
const [isDragging, setIsDragging] = useState(false);

const handleDragOver = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(true);
}, []);

const handleDragLeave = useCallback((e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  // Only set to false if leaving the container entirely
  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
  setIsDragging(false);
}, []);

const handleDrop = useCallback(async (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragging(false);

  const files = Array.from(e.dataTransfer.files);
  if (files.length === 0) return;

  const fileData = files.map((file) => ({
    name: file.name,
    size: file.size,
    data: undefined as ArrayBuffer | undefined,
  }));

  // Read and upload
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = () => {
      fileData[i].data = reader.result as ArrayBuffer;
      homeService.addFiles([fileData[i]]);
      homeService.uploadFiles();
    };
    reader.readAsArrayBuffer(file);
  }
}, [homeService]);
```

- [ ] **Step 2: Add drag handlers to the message list container**

Wrap the content div with drag handlers:

```tsx
<div
  className="flex-1 overflow-y-auto space-y-3"
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  {/* Drag overlay */}
  {isDragging && (
    <div className="absolute inset-0 bg-[var(--bg-surface)]/80 flex items-center justify-center z-10">
      <div className="text-center">
        <div className="text-4xl mb-2">📤</div>
        <div className="text-[var(--text-primary)] font-medium">释放文件上传</div>
      </div>
    </div>
  )}

  {/* Existing content */}
  {dateGroups.length === 0 ? (
    // ...
  ) : (
    // ...
  )}
</div>
```

Note: Add `relative` class to parent container to position the overlay.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/transfer-chat/transfer-chat.tsx
git commit -m "feat(web): add drag & drop file upload to TransferChat"
```

---

## Chunk 3: Create SearchModal Component

### Task 3.1: Create search-modal component

**Files:**
- Create: `apps/web/src/components/transfer-chat/search-modal/index.ts`
- Create: `apps/web/src/components/transfer-chat/search-modal/search-modal.tsx`

- [ ] **Step 1: Create search-modal/index.ts**

```ts
export { SearchModal } from './search-modal';
export { default } from './search-modal';
```

- [ ] **Step 2: Create search-modal.tsx**

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { X, Search } from 'lucide-react';
import { HomeService } from '../../../pages/home/home.service';
import { TransferChatService } from '../transfer-chat.service';
import type { TransferSession } from '@zen-send/shared';

const TIME_FILTERS = [
  { label: '全部', value: 'all' },
  { label: '今天', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' },
] as const;

const SearchModal = observer(() => {
  const homeService = useService(HomeService);
  const chatService = useService(TransferChatService);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Listen for open event from BottomToolbar
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setQuery('');
      setTimeFilter('all');
    };
    document.addEventListener('open-search-modal', handleOpen);
    return () => document.removeEventListener('open-search-modal', handleOpen);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      handleClose();
    }
  }, [handleClose]);

  // Get filtered results
  const results = chatService.filterTransfers(
    homeService.transfers,
    query,
    timeFilter
  );

  const handleResultClick = useCallback((transfer: TransferSession) => {
    // TODO: Scroll to message in list
    homeService.setPreviewTransfer(transfer);
    handleClose();
  }, [homeService, handleClose]);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 w-full max-w-lg mx-auto h-fit max-h-[70vh] bg-[var(--bg-elevated)] rounded-2xl shadow-xl p-0 backdrop:bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="p-4">
        {/* Search Input */}
        <div className="flex items-center gap-2 mb-4">
          <Search size={18} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文件名或内容..."
            className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            onClick={handleClose}
            className="p-1 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X size={18} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Time Filter */}
        <div className="flex gap-2 mb-4">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTimeFilter(filter.value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors
                ${timeFilter === filter.value
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]/80'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {results.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              {query ? '未找到匹配结果' : '输入关键词搜索'}
            </div>
          ) : (
            results.map((transfer) => (
              <button
                key={transfer.id}
                onClick={() => handleResultClick(transfer)}
                className="w-full text-left p-3 bg-[var(--bg-surface)] rounded-xl hover:bg-[var(--bg-surface)]/80 transition-colors"
              >
                <div className="text-sm text-[var(--text-primary)] truncate">
                  {transfer.originalFileName || '文本消息'}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {new Date(transfer.createdAt).toLocaleString('zh-CN')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
});

export default bindServices(SearchModal, [HomeService, TransferChatService]);
export { SearchModal };
```

- [ ] **Step 3: Add SearchModal to TransferChat**

In `transfer-chat.tsx`, add:

```tsx
import { SearchModal } from './search-modal';

// Add in the return JSX:
<div className="flex flex-col h-full">
  {/* Message list */}
  <div className="flex-1 overflow-y-auto space-y-3" ...>
    ...
  </div>
  <BottomToolbar />
  <SearchModal />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/transfer-chat/search-modal/
git add apps/web/src/components/transfer-chat/transfer-chat.tsx
git commit -m "feat(web): add SearchModal component"
```

---

## Chunk 4: Update PreviewModal with Preview/Download Actions

### Task 4.1: Update message-bubble to trigger PreviewModal

**Files:**
- Modify: `apps/web/src/components/transfer-chat/message-bubble.tsx`

- [ ] **Step 1: Verify PreviewModal is triggered**

The current code already calls `homeService.setPreviewTransfer(transfer)` in `handlePreview`. Check if there's an existing PreviewModal that observes `homeService.previewTransfer`. If not, create one.

- [ ] **Step 2: If PreviewModal doesn't exist, create it**

Look for existing preview modal in `apps/web/src/components/`:

```bash
find apps/web/src/components -name "*preview*" -o -name "*modal*"
```

If no PreviewModal exists, create one:

**Files:**
- Create: `apps/web/src/components/preview-modal/index.ts`
- Create: `apps/web/src/components/preview-modal/preview-modal.tsx`

```tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { X, Download, Eye, FileText, Pencil } from 'lucide-react';
import { HomeService } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

const PreviewModal = observer(() => {
  const homeService = useService(HomeService);
  const apiService = useService(ApiService);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const transfer = homeService.previewTransfer;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (transfer) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [transfer]);

  const handleClose = useCallback(() => {
    homeService.setPreviewTransfer(null);
  }, [homeService]);

  const handleDownload = useCallback(async () => {
    if (!transfer) return;
    try {
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
  }, [apiService, transfer]);

  if (!transfer) return null;

  const firstItem = transfer.items?.[0];
  const isText = firstItem?.type === 'text';

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 w-full max-w-lg mx-auto bg-[var(--bg-elevated)] rounded-2xl shadow-xl backdrop:bg-black/50"
      onClick={(e) => e.target === dialogRef.current && handleClose()}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">
            {transfer.originalFileName || '文本消息'}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          {isText ? (
            <div className="bg-[var(--bg-surface)] rounded-xl p-4 max-h-[300px] overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                {firstItem.content}
              </pre>
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] rounded-xl p-8 text-center">
              <FileText size={48} className="mx-auto text-[var(--text-muted)] mb-2" />
              <div className="text-sm text-[var(--text-secondary)]">
                {transfer.originalFileName}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                {formatSize(transfer.totalSize)}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl hover:bg-[var(--bg-surface)]/80 transition-colors flex items-center justify-center gap-2"
          >
            <Eye size={18} />
            预览
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors flex items-center justify-center gap-2"
          >
            <Download size={18} />
            下载
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default bindServices(PreviewModal, [HomeService, ApiService]);
export { PreviewModal };
```

- [ ] **Step 3: Add PreviewModal to TransferChat**

In `transfer-chat.tsx`:

```tsx
import { PreviewModal } from '../preview-modal';

// Add to return JSX:
<BottomToolbar />
<SearchModal />
<PreviewModal />
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/preview-modal/
git add apps/web/src/components/transfer-chat/transfer-chat.tsx
git commit -m "feat(web): add PreviewModal with preview and download actions"
```

---

## Chunk 5: Cleanup - Remove Old SearchBarComponent

### Task 5.1: Remove search-bar component

**Files:**
- Remove: `apps/web/src/components/search-bar/` (entire directory)

- [ ] **Step 1: Remove search-bar directory**

```bash
rm -rf apps/web/src/components/search-bar/
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): remove old SearchBarComponent"
```

---

## Implementation Status

- [ ] Chunk 1: BottomToolbar Component
- [ ] Chunk 2: Drag & Drop Upload
- [ ] Chunk 3: SearchModal Component
- [ ] Chunk 4: PreviewModal with Actions
- [ ] Chunk 5: Cleanup

---

## Spec Reference

Design spec: `docs/superpowers/specs/2026-04-05-transfer-chat-bottom-toolbar-design.md`
