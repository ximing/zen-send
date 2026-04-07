# Mobile Transfer List Simplification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the mobile transfer list by adding swipe-to-delete and reducing visible actions on list items, while enhancing the preview modal with share and delete options.

**Architecture:** Modify `TransferItem` to use `Swipeable` from `react-native-gesture-handler` for left-swipe delete, simplify the action buttons to only download and external link. Enhance `PreviewModal` with share (system share sheet) and delete buttons.

**Tech Stack:** React Native, `react-native-gesture-handler` (existing), `expo-sharing` (existing)

---

## Chunk 1: Simplify TransferItem UI

### Files
- Modify: `apps/mobile/src/components/transfer-item/index.tsx:1-237`

### Steps

- [ ] **Step 1: Read current implementation**

Review `TransferItem` to understand current action button structure (lines 142-170 show the actions section).

- [ ] **Step 2: Simplify actions to only download and external link icons**

Replace the current action buttons with only two icons:

```typescript
// Lines 142-170 - Replace actions section with simplified version
<View style={styles.actions}>
  {!isText && (
    <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
      <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  )}
  {firstItem?.storageType === 's3' && (
    <TouchableOpacity style={styles.actionBtn} onPress={handleCopyLink}>
      <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  )}
</View>
```

For text items, show only a copy button (since there's no download for text):

```typescript
<View style={styles.actions}>
  {isText && (
    <TouchableOpacity style={styles.actionBtn} onPress={handleCopy}>
      <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  )}
  {!isText && (
    <TouchableOpacity style={styles.actionBtn} onPress={handleDownload}>
      <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  )}
  {firstItem?.storageType === 's3' && (
    <TouchableOpacity style={styles.actionBtn} onPress={handleCopyLink}>
      <Ionicons name="link-outline" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  )}
</View>
```

- [ ] **Step 3: Remove delete button from list item**

The delete action will now only be accessible via left swipe. Remove the `handleDelete` function and its associated Alert.confirm dialog (lines 92-112).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/transfer-item/index.tsx
git commit -m "refactor(mobile): simplify TransferItem actions - remove inline delete, keep only download/link"
```

---

## Chunk 2: Add Swipeable Left-Swipe Delete to TransferItem

### Files
- Modify: `apps/mobile/src/components/transfer-item/index.tsx`

### Steps

- [ ] **Step 1: Import Swipeable from react-native-gesture-handler**

Add to existing imports (around line 1-11):

```typescript
import { Swipeable } from 'react-native-gesture-handler';
```

- [ ] **Step 2: Add delete action render function**

Add this method to create the red delete background area:

```typescript
// Add before TransferItemInner function (around line 26)
const renderRightActions = () => (
  <View style={[styles.deleteContainer, { backgroundColor: '#FF3B30' }]}>
    <Ionicons name="trash-outline" size={20} color="white" />
  </View>
);
```

Add the style:

```typescript
// Add to StyleSheet (around line 194)
deleteContainer: {
  width: 80,
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 16,
  borderRadius: 12,
},
```

- [ ] **Step 3: Wrap the item with Swipeable**

Wrap the `TouchableOpacity` return (lines 114-172) with `Swipeable`:

```typescript
return (
  <Swipeable
    renderRightActions={renderRightActions}
    onSwipeableOpen={handleSwipeDelete}
    rightThreshold={40}
  >
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.bgSurface }]}
      onPress={onPress}
    >
      {/* ... existing content ... */}
    </TouchableOpacity>
  </Swipeable>
);
```

- [ ] **Step 4: Add handleSwipeDelete function**

Add this function (replace the old handleDelete):

```typescript
const handleSwipeDelete = async () => {
  try {
    await homeService.deleteTransfer(transfer.id);
    showToast('Deleted');
  } catch (err) {
    showToast('Failed to delete');
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/transfer-item/index.tsx
git commit -m "feat(mobile): add swipeable left-swipe delete to TransferItem"
```

---

## Chunk 3: Enhance PreviewModal with Share and Delete Buttons

### Files
- Modify: `apps/mobile/src/components/preview-modal/index.tsx`

### Steps

- [ ] **Step 1: Add imports for Sharing and IntentLauncher**

Add to imports (line 1-7):

```typescript
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
```

- [ ] **Step 2: Update PreviewModalProps interface**

Add `onDelete` callback (around line 15-19):

```typescript
interface PreviewModalProps {
  transfer: TransferSession | null;
  onClose: () => void;
  onDownload: (transfer: TransferSession) => void;
  onDelete?: (transfer: TransferSession) => void;
}
```

- [ ] **Step 3: Update component to accept onDelete prop**

Update function signature (line 27):

```typescript
function PreviewModalInner({ transfer, onClose, onDownload, onDelete }: PreviewModalProps) {
```

- [ ] **Step 4: Add share and delete handler functions**

Add after the useEffect hook (around line 80):

```typescript
const handleShare = async () => {
  if (!transfer) return;

  try {
    // Get the download URL
    const downloadUrl = await apiService.getTransferDownloadUrl(transfer.id);
    if (downloadUrl) {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadUrl);
      } else {
        // Fallback: copy URL to clipboard
        await IntentLauncher.shareAsync(downloadUrl);
      }
    }
  } catch (err) {
    console.error('[PreviewModal] Share failed:', err);
  }
};

const handleDelete = () => {
  if (onDelete) {
    onDelete(transfer);
    onClose();
  }
};
```

- [ ] **Step 5: Update actions section to show all 4 actions**

Replace the actions section (lines 139-154) with icon buttons:

```typescript
<View style={styles.actions}>
  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: colors.accent }]}
    onPress={() => onDownload(transfer)}
  >
    <Ionicons name="download-outline" size={22} color={colors.bgPrimary} />
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: '#5856D6' }]}
    onPress={async () => {
      const url = await apiService.getTransferExternalLink(transfer.id);
      await Clipboard.setStringAsync(url);
      showToast('Link copied');
    }}
  >
    <Ionicons name="link-outline" size={22} color="white" />
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: '#007AFF' }]}
    onPress={handleShare}
  >
    <Ionicons name="share-outline" size={22} color="white" />
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]}
    onPress={handleDelete}
  >
    <Ionicons name="trash-outline" size={22} color="white" />
  </TouchableOpacity>
</View>
```

- [ ] **Step 6: Add actionBtn styles**

Update the StyleSheet (around line 230):

```typescript
actionBtn: {
  flex: 1,
  height: 56,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
},
```

Also update the `actions` container style:

```typescript
actions: {
  flexDirection: 'row',
  gap: 12,
  padding: 16,
  borderTopWidth: 1,
},
```

- [ ] **Step 7: Add Clipboard import if not present**

Check if `Clipboard` is imported (it may need to be added):

```typescript
import * as Clipboard from 'expo-clipboard';
```

- [ ] **Step 8: Add showToast import**

Check if `showToast` is imported from the toast component.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/components/preview-modal/index.tsx
git commit -m "feat(mobile): enhance PreviewModal with share and delete actions"
```

---

## Chunk 4: Integration - Wire up onDelete to PreviewModal usage

### Files
- Modify: `apps/mobile/app/(main)/index.tsx` (or wherever PreviewModal is used)

### Steps

- [ ] **Step 1: Find where PreviewModal is used**

Search for `PreviewModal` usage to find the parent component.

- [ ] **Step 2: Add onDelete handler**

Add delete handler that calls `homeService.deleteTransfer()` and shows toast.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(main\)/index.tsx
git commit -m "feat(mobile): wire up onDelete handler to PreviewModal"
```

---

## Verification

After implementation:

1. **Swipe to delete**: Swipe left on any list item → red delete area appears → tap to delete (no confirmation)
2. **List simplification**: List items only show download (↓) and external link (🔗) icons
3. **Preview modal**: Tap item → preview opens with 4 icon buttons: Download, Copy Link, Share, Delete
4. **Share works**: Tap share → system share sheet opens
