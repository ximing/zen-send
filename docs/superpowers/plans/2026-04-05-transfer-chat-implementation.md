# Transfer Chat Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将传输记录页面从扁平列表重新设计为 Telegram 风格的对话式时间线

**Architecture:** 新建 `transfer-chat/` 组件目录，包含 message-bubble、date-separator、device-tag 等子组件，复用现有 HomeService 数据层，通过 DeviceService 获取设备信息。

**Tech Stack:** React 19, @rabjs/react (observer/Service 模式), Tailwind CSS v4, lucide-react

---

## File Structure

```
components/
├── transfer-chat/
│   ├── index.ts                      # Barrel export
│   ├── transfer-chat.tsx             # Main container component
│   ├── transfer-chat.service.ts      # Chat view state management
│   ├── message-bubble.tsx            # Individual message bubble
│   ├── date-separator.tsx            # Date grouping separator
│   ├── device-tag.tsx                # Device icon+name+color dot
│   └── hooks/
│       └── use-transfer-bubble.ts   # Bubble logic hook
```

**Modified Files:**
- `apps/web/src/pages/home/index.tsx` - Replace TransferList with TransferChat
- `apps/web/src/pages/home/home.service.ts` - Add date grouping logic
- `apps/web/src/components/search-bar/index.tsx` - Update to new chat view

---

## Chunk 1: Core Components (device-tag, date-separator)

### Task 1.1: Create device-tag component

**Files:**
- Create: `apps/web/src/components/transfer-chat/device-tag.tsx`
- Create: `apps/web/src/components/transfer-chat/index.ts`

- [ ] **Step 1: Create device-tag.tsx**

```tsx
import React from 'react';
import { Globe, Smartphone, Tablet, Monitor } from 'lucide-react';
import type { Device, DeviceType } from '@zen-send/shared';

const DEVICE_COLORS: Record<DeviceType, string> = {
  web: '#3B82F6',
  android: '#22C55E',
  ios: '#A855F7',
  desktop: '#F97316',
};

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  web: <Globe size={12} />,
  android: <Smartphone size={12} />,
  ios: <Tablet size={12} />,
  desktop: <Monitor size={12} />,
};

interface DeviceTagProps {
  device: Device | null;
  direction: 'sent' | 'received';
}

export const DeviceTag: React.FC<DeviceTagProps> = ({ device, direction }) => {
  const isSent = direction === 'sent';
  const deviceType = device?.type || 'web';
  const deviceName = device?.name || 'Unknown Device';
  const color = DEVICE_COLORS[deviceType];
  const icon = DEVICE_ICONS[deviceType];

  return (
    <div className={`flex items-center gap-1.5 text-[var(--text-muted)] ${isSent ? 'justify-end' : 'justify-start'}`}>
      {icon}
      <span className="text-[11px]">{deviceName}</span>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
};

export default DeviceTag;
```

- [ ] **Step 2: Update index.ts barrel export**

```ts
export { DeviceTag } from './device-tag';
export { DateSeparator } from './date-separator';
export { MessageBubble } from './message-bubble';
export { TransferChatContent } from './transfer-chat';
```

- [ ] **Step 3: Create date-separator.tsx**

```tsx
import React from 'react';

interface DateSeparatorProps {
  date: string;
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      <span className="text-xs text-[var(--text-muted)] font-medium tracking-wider">
        {date}
      </span>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
    </div>
  );
};

export default DateSeparator;
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/transfer-chat/
git commit -m "feat(web): add device-tag and date-separator components"
```

---

### Task 1.2: Create use-transfer-bubble hook

**Files:**
- Create: `apps/web/src/components/transfer-chat/hooks/use-transfer-bubble.ts`

- [ ] **Step 1: Create use-transfer-bubble.ts**

```ts
import { useService } from '@rabjs/react';
import { DeviceService } from '../../../services/device.service';
import type { TransferSession, Device } from '@zen-send/shared';

export type MessageDirection = 'sent' | 'received';

export function useTransferBubble(transfer: TransferSession) {
  const deviceService = useService(DeviceService);

  const currentDeviceId = deviceService.currentDeviceId;
  const isSent = transfer.sourceDeviceId === currentDeviceId;
  const direction: MessageDirection = isSent ? 'sent' : 'received';

  const deviceId = isSent ? transfer.targetDeviceId : transfer.sourceDeviceId;
  const device = deviceService.devices.find((d) => d.id === deviceId) || null;

  return {
    direction,
    device,
    isSent,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/transfer-chat/hooks/use-transfer-bubble.ts
git commit -m "feat(web): add use-transfer-bubble hook"
```

---

## Chunk 2: Message Bubble Component

### Task 2.1: Create message-bubble component

**Files:**
- Create: `apps/web/src/components/transfer-chat/message-bubble.tsx`

- [ ] **Step 1: Create message-bubble.tsx**

```tsx
import React, { useState, useCallback } from 'react';
import { observer, useService } from '@rabjs/react';
import {
  FileText,
  Pencil,
  Image,
  Film,
  Music,
  Archive,
  File,
  CheckCircle,
  AlertCircle,
  X,
  Download,
  Eye,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import type { TransferSession, TransferItemType, Device } from '@zen-send/shared';
import { DeviceTag } from './device-tag';
import { useTransferBubble } from './hooks/use-transfer-bubble';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';
import { ApiService } from '../../services/api.service';

const TYPE_ICONS: Record<TransferItemType, React.ReactNode> = {
  file: <FileText size={24} className="text-[var(--text-secondary)]" />,
  text: <Pencil size={24} className="text-[var(--text-secondary)]" />,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'JUST_NOW';
  if (minutes < 60) return `${minutes}M_AGO`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}H_AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D_AGO`;
}

interface MessageBubbleProps {
  transfer: TransferSession;
  uploadingFile?: UploadingFile;
}

export const MessageBubble: React.FC<MessageBubbleProps> = observer(({ transfer, uploadingFile }) => {
  const homeService = useService(HomeService);
  const apiService = useService(ApiService);
  const { direction, device, isSent } = useTransferBubble(transfer);

  const firstItem = transfer.items?.[0];
  const itemType = firstItem?.type || 'file';
  const icon = TYPE_ICONS[itemType];

  const [isHovered, setIsHovered] = useState(false);

  const isUploading = uploadingFile && (uploadingFile.status === 'uploading' || uploadingFile.status === 'pending');
  const isCompleted = uploadingFile?.status === 'completed' || transfer.status === 'completed';
  const isFailed = uploadingFile?.status === 'failed' || transfer.status === 'failed';

  const handlePreview = useCallback(() => {
    homeService.setPreviewTransfer(transfer);
  }, [homeService, transfer]);

  const handleDownload = useCallback(async () => {
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

  const getProgress = () => {
    if (uploadingFile) return uploadingFile.progress;
    if (transfer.status === 'completed') return 100;
    return 0;
  };

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={new Date(transfer.createdAt).toLocaleString('zh-CN')}
    >
      <div
        className={`relative max-w-[70%] rounded-2xl px-4 py-3 transition-all
          ${isSent
            ? 'bg-[var(--primary)]/10 rounded-br-md'
            : 'bg-[var(--bg-elevated)] rounded-bl-md'
          }
          ${isHovered ? 'shadow-md' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Thumbnail/Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-[var(--bg-surface)] rounded-lg flex items-center justify-center overflow-hidden">
            {icon}
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[var(--text-primary)] font-medium truncate">
              {transfer.originalFileName || 'Unknown'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-0.5">
              {formatSize(transfer.totalSize)}
            </div>

            {/* Progress bar for uploading */}
            {isUploading && (
              <div className="mt-2">
                <div className="h-[3px] bg-[var(--border-subtle)] rounded-[2px] overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent)] transition-[width] duration-200 ease"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
                {uploadingFile.speed !== undefined && uploadingFile.speed > 0 && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">
                    {formatSize(uploadingFile.speed)}/s
                  </div>
                )}
              </div>
            )}

            {/* Status indicators */}
            {isCompleted && (
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle size={12} className="text-[var(--color-success)]" />
                <span className="text-[10px] text-[var(--color-success)]">Completed</span>
              </div>
            )}

            {isFailed && (
              <div className="flex items-center gap-1 mt-1">
                <AlertCircle size={12} className="text-[var(--color-error)]" />
                <span className="text-[10px] text-[var(--color-error)]">Failed</span>
              </div>
            )}
          </div>

          {/* Action buttons on hover */}
          {isHovered && !isUploading && (
            <div className={`flex gap-1 ${isSent ? 'order-1' : 'order-3'}`}>
              <button
                onClick={handlePreview}
                className="p-1.5 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                title="Preview"
              >
                <Eye size={14} className="text-[var(--text-secondary)]" />
              </button>
              <button
                onClick={handleDownload}
                className="p-1.5 hover:bg-[var(--bg-surface)] rounded-lg transition-colors"
                title="Download"
              >
                <Download size={14} className="text-[var(--text-secondary)]" />
              </button>
            </div>
          )}
        </div>

        {/* Device tag */}
        <div className={`mt-2 ${isSent ? 'text-right' : 'text-left'}`}>
          <DeviceTag device={device} direction={direction} />
        </div>

        {/* Time */}
        <div className={`text-[10px] text-[var(--text-muted)] mt-1 ${isSent ? 'text-right' : 'text-left'}`}>
          {formatRelativeTime(transfer.createdAt)}
        </div>
      </div>
    </div>
  );
});

export default MessageBubble;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/transfer-chat/message-bubble.tsx
git commit -m "feat(web): add message-bubble component"
```

---

## Chunk 3: Transfer Chat Service & Container

### Task 3.1: Create TransferChatService

**Files:**
- Create: `apps/web/src/components/transfer-chat/transfer-chat.service.ts`

- [ ] **Step 1: Create transfer-chat.service.ts**

```ts
import { Service } from '@rabjs/react';
import type { TransferSession } from '@zen-send/shared';

export type ChatTimeFilter = 'all' | 'today' | 'week' | 'month';

interface DateGroup {
  label: string;
  date: Date;
  transfers: TransferSession[];
}

export class TransferChatService extends Service {
  searchQuery = '';
  timeFilter: ChatTimeFilter = 'all';

  getDateGroups(transfers: TransferSession[]): DateGroup[] {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: Map<string, { label: string; date: Date; transfers: TransferSession[] }> = new Map();

    for (const transfer of transfers) {
      const transferDate = new Date(transfer.createdAt);
      let groupKey: string;
      let groupLabel: string;

      if (transferDate >= startOfToday) {
        groupKey = 'today';
        groupLabel = '今天';
      } else if (transferDate >= startOfWeek) {
        groupKey = 'week';
        groupLabel = '本周';
      } else if (transferDate >= startOfMonth) {
        groupKey = 'month';
        groupLabel = '本月';
      } else {
        groupKey = transferDate.toISOString().split('T')[0];
        groupLabel = transferDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, { label: groupLabel, date: transferDate, transfers: [] });
      }
      groups.get(groupKey)!.transfers.push(transfer);
    }

    // Convert to array and sort by date descending
    return Array.from(groups.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  filterTransfers(transfers: TransferSession[], searchQuery: string, timeFilter: ChatTimeFilter): TransferSession[] {
    let filtered = [...transfers];

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const startOfToday = new Date(now.setHours(0, 0, 0, 0));
      const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter((t) => {
        const transferDate = new Date(t.createdAt);
        if (timeFilter === 'today') return transferDate >= startOfToday;
        if (timeFilter === 'week') return transferDate >= startOfWeek;
        if (timeFilter === 'month') return transferDate >= startOfMonth;
        return true;
      });
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const name = (t.originalFileName || '').toLowerCase();
        const textContent = t.items?.find((item) => item.type === 'text')?.content?.toLowerCase() || '';
        return name.includes(query) || textContent.includes(query);
      });
    }

    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  setTimeFilter(filter: ChatTimeFilter) {
    this.timeFilter = filter;
  }
}

export default TransferChatService;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/transfer-chat/transfer-chat.service.ts
git commit -m "feat(web): add TransferChatService for chat view state"
```

---

### Task 3.2: Create TransferChat container component

**Files:**
- Create: `apps/web/src/components/transfer-chat/transfer-chat.tsx`

- [ ] **Step 1: Create transfer-chat.tsx**

```tsx
import React, { useEffect, useRef } from 'react';
import { observer, useService, bindServices } from '@rabjs/react';
import { MailOpen } from 'lucide-react';
import { HomeService, type UploadingFile } from '../../pages/home/home.service';
import { DeviceService } from '../../services/device.service';
import { SocketService } from '../../services/socket.service';
import { TransferChatService } from './transfer-chat.service';
import { MessageBubble } from './message-bubble';
import { DateSeparator } from './date-separator';
import SearchBarComponent from '../search-bar';

const TransferChatContent = observer(() => {
  const homeService = useService(HomeService);
  const deviceService = useService(DeviceService);
  const socketService = useService(SocketService);
  const chatService = useService(TransferChatService);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    deviceService.loadDevices();
  }, [deviceService]);

  // Get filtered and grouped transfers
  const filteredTransfers = chatService.filterTransfers(
    homeService.transfers,
    homeService.searchQuery,
    chatService.timeFilter
  );
  const dateGroups = chatService.getDateGroups(filteredTransfers);

  // Create a map of uploading files by session id
  const uploadingFilesMap = new Map<string, UploadingFile>();
  for (const file of homeService.uploadingFiles) {
    if (file.sessionId) {
      uploadingFilesMap.set(file.sessionId, file);
    }
  }

  return (
    <div className="space-y-3">
      <SearchBarComponent />

      {dateGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MailOpen size={48} className="text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-muted)]">
            NO_TRANSFERS_YET
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="space-y-2">
          {dateGroups.map((group) => (
            <div key={group.label}>
              <DateSeparator date={group.label} />
              {group.transfers.map((transfer) => (
                <MessageBubble
                  key={transfer.id}
                  transfer={transfer}
                  uploadingFile={uploadingFilesMap.get(transfer.id)}
                />
              ))}
            </div>
          ))}

          {homeService.hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => homeService.loadMoreTransfers()}
                disabled={homeService.isLoading}
                className="px-6 py-2 text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] disabled:opacity-50"
              >
                {homeService.isLoading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default bindServices(TransferChatContent, [HomeService, DeviceService, SocketService, TransferChatService]);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/transfer-chat/transfer-chat.tsx
git commit -m "feat(web): add TransferChat container component"
```

---

## Chunk 4: Integration

### Task 4.1: Update home page to use TransferChat

**Files:**
- Modify: `apps/web/src/pages/home/index.tsx`

- [ ] **Step 1: Update imports and replace TransferList with TransferChat**

```tsx
// Change from:
import TransferList from '../../components/transfer-list';

// Change to:
import TransferChat from '../../components/transfer-chat';

// Change from:
// <TransferList />

// Change to:
// <TransferChat />
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/home/index.tsx
git commit -m "feat(web): integrate TransferChat component in home page"
```

---

### Task 4.2: Update SearchBar for new chat view

**Files:**
- Modify: `apps/web/src/components/search-bar/index.tsx`

- [ ] **Step 1: Update to use TransferChatService filters**

The SearchBar currently uses HomeService for filters. We need to update it to use the new TransferChatService for time filter since the type filter is now removed.

```tsx
// Update import to include TransferChatService
import { TransferChatService } from '../../components/transfer-chat/transfer-chat.service';

// Update component to use TransferChatService for timeFilter
const SearchBarComponent = observer(() => {
  const homeService = useService(HomeService);
  const chatService = useService(TransferChatService);  // Add this

  // Update TIME_FILTERS to use chatService.timeFilter
  // Update handleTimeFilterChange to use chatService.setTimeFilter
  // ...

  return (
    <div className="space-y-3 mb-4">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          placeholder="Search transfers..."
          value={homeService.searchQuery}
          onChange={(e) => homeService.setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-surface)] rounded-xl
                     text-[var(--text-primary)] placeholder-[var(--text-muted)]
                     focus:outline-none transition-colors"
        />
      </div>

      {/* Time Filter - removed type filter since it's now by device */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <select
            value={chatService.timeFilter}
            onChange={(e) => chatService.setTimeFilter(e.target.value as TimeFilter)}
            className="w-full px-4 py-2 bg-[var(--bg-surface)] rounded-xl
                       text-[var(--text-primary)] appearance-none cursor-pointer
                       focus:outline-none transition-colors"
          >
            {TIME_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/search-bar/index.tsx
git commit -m "feat(web): update SearchBar for transfer chat view"
```

---

## Chunk 5: Cleanup

### Task 5.1: Remove old transfer-list component (optional, can keep for rollback)

**Files:**
- Remove: `apps/web/src/components/transfer-list/` (entire directory)

- [ ] **Step 1: Remove old transfer-list directory**

```bash
rm -rf apps/web/src/components/transfer-list/
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(web): remove old transfer-list component"
```

---

## Implementation Status

- [ ] Chunk 1: Core Components
- [ ] Chunk 2: Message Bubble
- [ ] Chunk 3: Transfer Chat Service & Container
- [ ] Chunk 4: Integration
- [ ] Chunk 5: Cleanup

---

## Spec Reference

Design spec: `docs/superpowers/specs/2026-04-05-transfer-chat-design.md`
