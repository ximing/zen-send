# Message Bubble Redesign Spec

## Overview

Redesign the transfer chat message bubble component to:
1. Display device type icon externally on the left side of the bubble
2. Add a bubble "tail" pointing to the icon
3. Show image previews directly in the bubble (with max-width constraint)
4. Keep file and text bubbles unchanged

## Layout Structure

### Sent Messages (right-aligned)
```
[Icon] ─▶ [Bubble]
```
- Icon: 40x40px circle with device type emoji, green border (#22c55e)
- Tail: 8x12px triangle, positioned between icon and bubble, pointing left to icon
- Bubble: Standard rounded rectangle, margin-left: 8px from tail

### Received Messages (left-aligned)
```
[Bubble] ◀─ [Icon]
```
- Icon: 40x40px circle with device type emoji, purple border (#a855f7)
- Tail: 8x12px triangle, positioned between bubble and icon, pointing right to icon
- Bubble: Standard rounded rectangle, margin-right: 8px from tail

## Icon Position
- Vertical alignment: top of icon aligns with top of bubble
- Horizontal gap between tail and bubble: 8px
- Device icon shows sender's device type

## Bubble Types

### Image Bubble
- **Display**: Show image directly in bubble (no thumbnail service)
- **Max-width**: 180px
- **Height**: Auto (maintain aspect ratio)
- **Border-radius**: 8px for image container
- **Click action**: Open preview modal with full-size image

### File Bubble
- **Unchanged**: Keep current layout with file icon, filename, size

### Text Bubble
- **Unchanged**: Keep current layout with text content, expand/collapse

## Component Changes

### Frontend (apps/web)

1. **message-bubble.tsx**
   - Restructure layout: icon + tail + bubble container
   - Add conditional rendering for image type (check `mimeType.startsWith('image/')`)
   - Image click handler to open preview modal

2. **preview-modal.tsx**
   - Add image preview mode: display full-size image directly
   - Keep file preview mode unchanged

3. **DeviceTag changes**
   - DeviceTag component may be simplified or removed from bubble (icon now external)

### Backend (apps/server)
- **No changes required**: Image is already served via existing S3 URL/download endpoint

## Visual Specs

### Colors
- Sent icon border: `#22c55e` (primary green)
- Received icon border: `#a855f7` (iOS purple)
- Bubble background (sent): `#e5e5e5` (light) / existing bg-elevated
- Bubble background (received): `#ffffff` with border (light) / existing bg-elevated

### Spacing
- Icon size: 40x40px
- Icon to tail: 0px (touching)
- Tail to bubble: 8px
- Bubble padding: 12px 16px (standard)

### Tail/CSS Triangle
```css
/* Sent message tail (points left) */
left: -8px;
border-top: 6px solid transparent;
border-bottom: 6px solid transparent;
border-right: 8px solid [bubble-color];

/* Received message tail (points right) */
right: -8px;
border-top: 6px solid transparent;
border-bottom: 6px solid transparent;
border-left: 8px solid [bubble-color];
```

## Testing Checklist
- [ ] Sent file bubble displays correctly with icon and tail
- [ ] Received file bubble displays correctly with icon and tail
- [ ] Image bubble shows image with max-width constraint
- [ ] Image click opens preview modal
- [ ] Text bubble unchanged
- [ ] Dark mode support
- [ ] Multi-file bubble unchanged

## File Changes
- `apps/web/src/components/transfer-chat/message-bubble.tsx`
- `apps/web/src/components/preview-modal/preview-modal.tsx`
