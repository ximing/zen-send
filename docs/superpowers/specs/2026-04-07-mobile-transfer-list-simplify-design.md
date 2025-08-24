# Mobile Transfer List Simplification Design

**Date:** 2026-04-07
**Status:** Approved
**Author:** Claude

## Overview

Simplify the mobile transfer/history list to reduce visual clutter while maintaining all necessary functionality.

## Current State

The current `TransferItem` component displays all available actions as text/buttons directly on each list row:
- **Text transfers:** Copy, Delete
- **File/Image transfers:** Preview, Download, Copy Link, Delete

This results in a cluttered UI with multiple action buttons visible at all times.

## Design Changes

### 1. List Item (Simplified)

**Before:**
- Multiple action buttons visible (Preview, Download, Copy Link, Delete)

**After:**
| Element | Description |
|---------|-------------|
| Thumbnail | 48x48px, rounded corners, placeholder for images/files |
| Title | File name or text preview (max 30 chars) |
| Metadata | Size + relative time |
| Actions | Only two icon buttons: Download (↓) and Share Link (🔗) |

### 2. Left Swipe to Delete

- User swipes left on any list item
- Red delete area reveals behind the item (80px width)
- Delete area contains a trash icon (white)
- Tap delete area → immediate deletion (no confirmation dialog)
- Swipe back or tap elsewhere → item returns to normal position

**Implementation:** Use `react-native-gesture-handler` Swipeable component

### 3. Tap to Preview

- Tap anywhere on list item (except action icons) → opens PreviewModal
- PreviewModal is a bottom sheet

### 4. Preview Modal (Enhanced)

**Actions (Icon buttons at bottom):**

| Icon | Action | Description |
|------|--------|-------------|
| ↓ | Download | Download file to device |
| 🔗 | Copy Link | Copy S3 presigned URL to clipboard |
| ↗ | Share | Open system share menu (iOS Share Sheet / Android Share Intent) |
| 🗑 | Delete | Delete transfer session |

## Component Changes

### Modified Files

1. **`apps/mobile/src/components/transfer-item/index.tsx`**
   - Remove inline action buttons (Preview, Copy, Delete)
   - Add only: Download icon, Share Link icon
   - Wrap with `Swipeable` for left-swipe delete
   - Entire item (except icons) is tappable → opens PreviewModal

2. **`apps/mobile/src/components/preview-modal/index.tsx`**
   - Add Share button (opens system share menu)
   - Add Delete button
   - Keep existing Download and Copy Link buttons

3. **`apps/mobile/src/components/transfer-list/index.tsx`**
   - No structural changes needed (uses TransferItem)

### New Dependencies

None required. `react-native-gesture-handler` v2.31.0 is already installed.

## Data Flow

```
User swipes left → Swipeable reveals delete area → User taps delete
→ homeService.deleteTransfer(id) → API call → Remove from local state

User taps item → Opens PreviewModal with transfer data
→ User taps Share → SystemShare.share() → Native share menu
```

## API Impact

No API changes required. Using existing endpoints:
- `DELETE /api/transfers/:id` - already exists for delete
- `GET /api/transfers/:id/download` - for download URL

## Implementation Order

1. Add `Swipeable` wrapper to `TransferItem`
2. Add delete action behind swipe
3. Simplify `TransferItem` UI (remove extra buttons, keep only download/link)
4. Enhance `PreviewModal` with Share and Delete buttons
5. Test swipe gesture and preview flow
