# Message Bubble Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign message bubble to show device icon externally with a tail pointing to it, and add inline image preview support.

**Architecture:** Changes are contained to two frontend components only:
1. `message-bubble.tsx` - Restructure layout: device icon external + CSS triangle tail + bubble
2. `preview-modal.tsx` - Add image preview mode (display image directly instead of file icon)

**Tech Stack:** React 19, Tailwind CSS v4, @rabjs/react, lucide-react

---

## Chunk 1: Message Bubble Layout Restructure

**Files:**
- Modify: `apps/web/src/components/transfer-chat/message-bubble.tsx`

### Step 1: Add device icon helper at top of file

Add after the existing `TYPE_ICONS` constant (around line 21):

```tsx
import { Globe, Smartphone, Tablet, Monitor } from 'lucide-react';
import type { DeviceType } from '@zen-send/shared';

// Device icon colors - sent uses primary green, received uses iOS purple
const DEVICE_ICON_COLORS: Record<'sent' | 'received', string> = {
  sent: '#22c55e',   // primary green
  received: '#a855f7', // iOS purple
};

const DEVICE_TYPE_ICONS: Record<DeviceType, React.ReactNode> = {
  web: <Globe size={18} />,
  android: <Smartphone size={18} />,
  ios: <Tablet size={18} />,
  desktop: <Monitor size={18} />,
};
```

### Step 2: Add image type detection helper

Add after `formatRelativeTime` function (around line 39):

```tsx
const isImageType = (contentType?: string) => {
  if (!contentType) return false;
  return contentType.startsWith('image/');
};
```

### Step 3: Create DeviceIcon component helper (inside MessageBubble file, before the main component)

Add after the helper functions (around line 39):

```tsx
interface DeviceIconProps {
  deviceType: DeviceType;
  direction: 'sent' | 'received';
}

const DeviceIcon: React.FC<DeviceIconProps> = ({ deviceType, direction }) => {
  const borderColor = DEVICE_ICON_COLORS[direction];
  const icon = DEVICE_TYPE_ICONS[deviceType] || <Globe size={18} />;

  return (
    <div
      className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md"
      style={{ border: `2px solid ${borderColor}` }}
    >
      <span className="text-[var(--text-secondary)]">{icon}</span>
    </div>
  );
};
```

### Step 4: Restructure the bubble layout

Replace the entire `return` block in `MessageBubble` (lines 110-209) with the new layout:

```tsx
return (
  <div
    className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-2`}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    title={new Date(transfer.createdAt).toLocaleString('zh-CN')}
  >
    <div className={`flex items-start ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Device Icon - external, on the side */}
      <DeviceIcon
        deviceType={device?.type || 'web'}
        direction={direction}
      />

      {/* Bubble with tail */}
      <div className={`relative ${isSent ? 'mr-2' : 'ml-2'}`}>
        {/* CSS Triangle Tail */}
        <div
          className={`absolute top-3 w-0 h-0
            ${isSent
              ? '-left-2 border-r-8 border-r-[var(--bg-elevated)] border-t-4 border-t-transparent border-b-4 border-b-transparent'
              : '-right-2 border-l-8 border-l-[var(--bg-elevated)] border-t-4 border-t-transparent border-b-4 border-b-transparent'
            }
          `}
        />

        {/* Bubble Content */}
        <div
          className={`relative max-w-[90%] min-w-[260px] rounded-2xl px-5 py-3 transition-all duration-150
            ${isPending ? 'bg-[var(--bg-surface)] opacity-50' : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)]/80'}
            ${isHovered ? 'shadow-lg' : ''}
          `}
        >
          {/* Image Bubble - inline preview */}
          {isImageType(transfer.contentType) ? (
            <div
              className="cursor-pointer"
              onClick={handlePreview}
            >
              <img
                src={/* Will be set after API integration */ '#'}
                alt={transfer.originalFileName}
                className="max-w-[180px] rounded-lg object-cover"
                style={{ maxHeight: '200px' }}
              />
            </div>
          ) : (
            /* Standard bubble content */
            <div className="flex items-center gap-4">
              {/* Icon for files, not for text */}
              {itemType !== 'text' && (
                <div className="flex-shrink-0">
                  {icon}
                </div>
              )}

              {/* File Info - compact vertical stack */}
              <div className="flex-1 min-w-0">
                {itemType === 'text' && firstItem?.content ? (
                  <div>
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isExpired ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'} ${isLongText && !isExpanded ? 'line-clamp-3' : ''}`}>
                      {firstItem.content}
                    </div>
                    {isLongText && (
                      <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] mt-1"
                      >
                        {isExpanded ? '收起' : '展开'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={`text-sm font-medium truncate leading-relaxed ${isExpired ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                    {displayFileName}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                  <span>{formatSize(transfer.totalSize)}</span>
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-[var(--color-success)]">
                      <CheckCircle size={10} /> Done
                    </span>
                  )}
                  {isFailed && (
                    <span className="flex items-center gap-1 text-[var(--color-error)]">
                      <AlertCircle size={10} /> Failed
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              {(isHovered || isCompleted) && !isUploading && !isPending && !isExpired && (
                <div className="flex gap-2 flex-shrink-0">
                  {itemType === 'text' ? (
                    <button
                      onClick={handleCopyText}
                      className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} className="text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handlePreview}
                        className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye size={16} className="text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                      </button>
                      <button
                        onClick={handleDownload}
                        className="p-2 hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download size={16} className="text-[var(--text-secondary)] hover:text-[var(--accent)]" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom row: Device tag + Time */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border-subtle)]/30">
            <span className="text-[11px] text-[var(--text-muted)]">
              {device?.name || (isSent ? 'To Device' : 'From Device')}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {formatRelativeTime(transfer.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

Note: The image src placeholder `#` will be replaced in Chunk 2 when integrating with the API.

---

## Chunk 2: Image Preview Integration

**Files:**
- Modify: `apps/web/src/components/transfer-chat/message-bubble.tsx`
- Modify: `apps/web/src/components/preview-modal/preview-modal.tsx`

### Step 1: Add state for image blob URL in MessageBubble

Add to the `MessageBubble` component after the existing state declarations (around line 67):

```tsx
const [imageUrl, setImageUrl] = useState<string | null>(null);
```

### Step 2: Add useEffect to load image when item is image type

Add after the state declarations:

```tsx
useEffect(() => {
  if (isImageType(transfer.contentType)) {
    apiService.getTransferFile(transfer.id).then(blob => {
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    }).catch(err => {
      console.error('Failed to load image:', err);
    });
  }
  return () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  };
}, [transfer.id, transfer.contentType]);
```

### Step 3: Update the img tag in the bubble to use imageUrl

Replace the img placeholder in Chunk 1:

```tsx
<img
  src={imageUrl || '/placeholder.png'}
  alt={transfer.originalFileName}
  className="max-w-[180px] rounded-lg object-cover"
  style={{ maxHeight: '200px' }}
/>
```

### Step 4: Modify PreviewModal to display image directly

Replace the content section in `preview-modal.tsx` (lines 88-106) to add image mode:

```tsx
{/* Content */}
<div className="mb-6">
  {isText ? (
    <div className="bg-[var(--bg-surface)] rounded-xl p-4 max-h-[300px] overflow-y-auto">
      <pre className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
        {firstItem.content}
      </pre>
    </div>
  ) : isImageType(transfer.contentType) ? (
    <div className="bg-[var(--bg-surface)] rounded-xl p-4 flex items-center justify-center">
      <img
        src={imageUrl}
        alt={transfer.originalFileName}
        className="max-w-full max-h-[400px] rounded-lg object-contain"
      />
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
```

### Step 5: Add imageUrl state to PreviewModal

Add to the PreviewModal component (around line 22):

```tsx
const [imageUrl, setImageUrl] = useState<string | null>(null);
```

### Step 6: Add useEffect to load image in PreviewModal

Add after the existing useEffect:

```tsx
useEffect(() => {
  if (transfer && isImageType(transfer.contentType)) {
    apiService.getTransferFile(transfer.id).then(blob => {
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
    }).catch(err => {
      console.error('Failed to load image:', err);
    });
  }
  return () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  };
}, [transfer?.id, transfer?.contentType]);
```

### Step 7: Add imageUrl to dependency array

Update the first useEffect dependency array (around line 34) to include `imageUrl`.

---

## Chunk 3: Testing & Verification

**Files:**
- Test manually in browser at http://localhost:5274

### Verification Checklist

- [ ] Sent file bubble shows device icon on left with green border, tail pointing to icon
- [ ] Received file bubble shows device icon on right with purple border, tail pointing to icon
- [ ] Image bubble displays image inline with max-width 180px
- [ ] Click on image in bubble opens preview modal
- [ ] Preview modal shows full-size image
- [ ] Text bubble unchanged
- [ ] Device name shows in bottom row of bubble
- [ ] Dark mode renders correctly
- [ ] Hover states work on bubbles

---

## File Summary

| File | Action |
|------|--------|
| `apps/web/src/components/transfer-chat/message-bubble.tsx` | Modify - Restructure layout with external icon + tail |
| `apps/web/src/components/preview-modal/preview-modal.tsx` | Modify - Add image preview mode |

**No backend changes required.**
