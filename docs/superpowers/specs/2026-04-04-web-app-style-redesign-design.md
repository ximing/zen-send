# Web App Style Redesign Design

## Overview

Transform the Zen Send web interface from a traditional header-based layout to a modern sidebar navigation layout, enhancing the app-like feel while adding missing features: device management, file preview/download/delete/search, and improved upload interactions.

## 1. Layout & Sidebar Navigation

### Sidebar Structure
- **Width**: 64px fixed left sidebar
- **Position**: Always visible, fixed to left edge
- **Visual**: Dark/light themed, matching current app aesthetic

### Sidebar Sections

**Top Section (Logo)**
- Zen Send logo, always visible at top

**Navigation Section (Middle)**
- Icon-only with hover tooltip labels
- Items:
  - Transfers (current home, icon: folder/archive)
  - Devices (new page, icon: smartphone/device)

**Bottom Section (User Actions)**
- Settings (icon: gear)
- Theme toggle (icon: sun/moon)
- User info: avatar circle with first letter of email
- Logout (icon: door/logout)

### Navigation Behavior
- Hover on icon shows tooltip with label
- Active item has background highlight
- Click navigates to respective page

### Page Transition
- Main content area takes remaining width
- Smooth transition when switching pages
- No full page reload (SPA behavior)

## 2. Device Management Page

**Route**: `/devices`

### QR Code Pairing
- Display user's pairing QR code
- QR format: `https://zensend.dev/pair?token={TOKEN}`
- Token contains user session information for direct pairing
- Instructions below QR:
  1. Open Zen Send on target device
  2. Scan the QR code
  3. Start transferring

### Device List
- Show all registered devices for current user
- Each device shows:
  - Device icon (based on user-agent or selection)
  - Device name
  - Status indicator (online/offline)
  - Last active time
  - "Current device" badge if applicable
- Remove device action with confirmation

## 3. File Upload Enhancement

### Drag & Drop
- **Drag Enter**: Full-screen overlay with semi-transparent blue background, dashed border, centered "Release to upload" text
- **Drag Leave**: Smooth fade out
- **Drop Zone**: Entire upload area, visually prominent

### Upload Progress UI
Each uploading file displays:
- File name
- Progress bar with percentage
- Upload speed (MB/s)
- Estimated time remaining
- Cancel button per file

### Upload States
- **Uploading**: Animated progress bar with pulse effect
- **Completed**: Green checkmark, file size
- **Failed**: Warning icon with retry button
- **Cancelled**: Grayed out, removed from list

### Upload Area Layout
```
┌────────────────────────────────────────┐
│                                        │
│   📎 Click to select files or          │
│      drag files here to upload         │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ document.pdf    Uploading  65%   │  │
│  │               2.3 MB/s  12s left │  │
│  │                       [Cancel]   │  │
│  ├──────────────────────────────────┤  │
│  │ image.png      Completed ✓ 2.1MB │  │
│  ├──────────────────────────────────┤  │
│  │ failed.zip     Failed ⚠ Retry    │  │
│  └──────────────────────────────────┘  │
│                                        │
└────────────────────────────────────────┘
```

## 4. File Management Features

### Search & Filter Bar
- **Search Input**: Search by filename (fuzzy/partial match)
- **Type Filter**: Dropdown with options - All, Images, Documents, Videos, Audio, Other
- **Time Filter**: Dropdown with options - All time, Today, This week, This month

### Transfer List Item Actions
Each item shows on hover/always:
- **Preview** (eye icon): Opens preview modal
- **Download** (download icon): Downloads file to device
- **Delete** (trash icon): Deletes with confirmation dialog

### Preview Modal
- **Images**: Centered display, zoom (scroll wheel/pinch), pan (drag), close on ESC or click outside
- **Text Files**: Inline viewer for .txt, .md, .json, .js, .css, .html, etc.
- **Other Types**: Show file info, offer download

### Delete Confirmation
```
┌─────────────────────────────────────┐
│  Delete File                        │
│                                     │
│  Are you sure you want to delete    │
│  "filename.pdf"?                    │
│  This action cannot be undone.      │
│                                     │
│  [Cancel]              [Delete]     │
└─────────────────────────────────────┘
```

## 5. Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | TransfersPage | Main transfer list with upload |
| `/devices` | DevicesPage | Device management & QR pairing |
| `/settings` | SettingsPage | (Future) App settings |

## 6. Technical Approach

### Navigation
- Use React Router for page navigation
- Create Sidebar component with nav items
- Active route highlighting

### State Management
- Use existing @rabjs/react service patterns
- Create DeviceService for device management
- Extend HomeService for enhanced upload state

### File Preview
- Use browser's native capabilities where possible
- Blob URLs for local preview
- Careful cleanup of object URLs to prevent memory leaks

### QR Code Generation
- Use `qrcode` library to generate QR codes
- Token generated server-side with session info

### API Endpoints (Server)
- `GET /devices` - List user devices
- `DELETE /devices/:id` - Remove device
- `POST /devices/pair-token` - Generate pairing token

## 7. File Changes Summary

### New Files
- `apps/web/src/components/sidebar/index.tsx` - Sidebar component
- `apps/web/src/components/sidebar/sidebar.service.ts` - Sidebar state
- `apps/web/src/pages/devices/index.tsx` - Devices page
- `apps/web/src/pages/devices/devices.service.ts` - Device management
- `apps/web/src/components/preview-modal/index.tsx` - File preview modal
- `apps/web/src/components/search-bar/index.tsx` - Search and filter bar

### Modified Files
- `apps/web/src/app.tsx` - Add routes for /devices, /settings
- `apps/web/src/pages/home/index.tsx` - Integrate sidebar, enhanced upload
- `apps/web/src/pages/home/home.service.ts` - Add search, filter, preview, delete, download
- `apps/web/src/components/send-toolbar/index.tsx` - Enhanced upload UI
- `apps/web/src/components/header/index.tsx` - Remove old header (replaced by sidebar)
- `apps/web/src/components/transfer-list/index.tsx` - Add action buttons, integrate search

### Server Changes
- Add device management endpoints if not already present
