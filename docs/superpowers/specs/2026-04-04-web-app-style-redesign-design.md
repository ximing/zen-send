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
- Settings (icon: gear) — placeholder for future settings page
- Theme toggle (icon: sun/moon) — **preserved from Header**
- User info: avatar circle with first letter of email — **preserved from Header**
- Logout (icon: door/logout) — **preserved from Header**

### Navigation Behavior
- Hover on icon shows tooltip with label
- Active item has background highlight
- Click navigates to respective page

### Page Transition
- Main content area takes remaining width
- Smooth transition when switching pages
- No full page reload (SPA behavior)

### Header Migration
- The existing Header component will be removed
- All header functionality (theme toggle, user info, logout) must be preserved in the sidebar bottom section
- Logout functionality currently in `HeaderService` must be moved to `SidebarService`

## 2. Device Management Page

**Route**: `/devices`

### QR Code Pairing
- Display user's pairing QR code
- QR format: `https://zensend.dev/pair?token={TOKEN}`
- Token is a short-lived (5 minute expiry) JWT containing:
  - User ID
  - Device registration info
  - HMAC signature for validation
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
- Current device identified by `deviceId` stored in localStorage, registered on first app load
- Remove device action with confirmation

### Current Device Identification
- On first app load, generate or retrieve `deviceId` from localStorage
- Send deviceId with all API requests
- Server returns `isCurrentDevice: true` for the device matching the request's deviceId

## 3. File Upload Enhancement

### Drag & Drop
- **Drag Enter**: Full-screen overlay with semi-transparent blue background, dashed border, centered "Release to upload" text
- **Drag Leave**: Smooth fade out
- **Drop Zone**: Entire upload area, visually prominent

### Upload Progress UI
Each uploading file displays:
- File name
- Progress bar with percentage
- Upload speed (MB/s) — calculated as `bytesUploaded / elapsedTime` with rolling average
- Estimated time remaining — calculated as `remainingBytes / currentSpeed`
- Cancel button per file

### Upload States
- **Uploading**: Animated progress bar with pulse effect
- **Completed**: Green checkmark, file size
- **Failed**: Warning icon with retry button (manual retry only, restarts from beginning)
- **Cancelled**: Grayed out, removed from list after 3 seconds

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

### Dependencies
- Add `qrcode` library to `apps/web/package.json` for QR code generation

## 4. File Management Features

### Search & Filter Bar
- **Search Input**: Search by filename (fuzzy/partial match, client-side filtering)
- **Type Filter**: Dropdown with options aligned to backend types:
  - All (default)
  - Files (backend returns 'file' type)
  - Text (backend returns 'text' type)
- **Time Filter**: Dropdown with options - All time, Today, This week, This month (client-side filtering)

### Transfer List Item Actions
Each item shows on hover/always:
- **Preview** (eye icon): Opens preview modal
- **Download** (download icon): Downloads file to device
- **Delete** (trash icon): Deletes with confirmation dialog

### Preview Modal
- **Images**: Centered display, zoom (scroll wheel/pinch), pan (drag), close on ESC or click outside
  - **Max preview size**: 50MB for images (larger files show info + download only)
- **Text Files**: Inline viewer for .txt, .md, .json, .js, .css, .html, etc.
  - **Max preview size**: 10MB for text files (larger files show info + download only)
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

### Pagination
- Initial load: 50 items via `GET /api/transfers?limit=50&offset=0`
- "Load More" button at bottom of list
- On click: fetch `offset = currentItems.length`, append to list, re-sort
- Loading indicator while fetching next page
- No infinite scroll (button-based for predictability)

## 5. Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | TransfersPage | Main transfer list with upload |
| `/devices` | DevicesPage | Device management & QR pairing |
| `/settings` | SettingsPage | (Future) App settings — route only, no implementation |

## 6. Technical Approach

### Navigation
- Use React Router for page navigation
- Create Sidebar component with nav items
- Active route highlighting

### State Management
- Use existing @rabjs/react service patterns
- Create `DeviceService` in `apps/web/src/services/device.service.ts`
- Move HeaderService logout/theme functionality to `SidebarService`
- Extend `HomeService` for enhanced upload state:
  - Add `searchQuery` state for filename search
  - Add `speed` and `eta` fields to upload tracking
  - Track `startTime` and `bytesUploaded` for speed calculation
  - Implement rolling average for speed (sample every 500ms)

### File Preview
- Use browser's native capabilities where possible
- Blob URLs for local preview
- Careful cleanup of object URLs to prevent memory leaks
- Enforce file size limits before loading into memory

### QR Code Generation
- Use `qrcode` library to generate QR codes client-side
- Token generated server-side via `POST /api/devices/pair-token`

### API Endpoints (Server)

**Existing endpoints to use:**
- `GET /api/devices` - List user devices
- `POST /api/devices` - Register device
- `DELETE /api/devices/:id` - Remove device
- `PATCH /api/devices/:id/heartbeat` - Update device heartbeat

**New endpoints to implement:**
- `POST /api/devices/pair-token` - Generate short-lived pairing token for QR code
  - Request: `{ deviceName: string }`
  - Response: `{ token: string, expiresAt: string }`
  - Token: JWT with 5-minute expiry, signed with JWT_REFRESH_SECRET
  - Add `CreatePairTokenDto` validator in `apps/server/src/validators/`

**Pagination (existing - verified):**
- `GET /api/transfers?limit=50&offset=0` - Paginated transfer list
- Server uses `limit` and `offset` (NOT `page`)
- Server returns items sorted by `createdAt DESC`
- On "Load More", append new items and re-sort to handle merged dataset

## 7. File Changes Summary

### New Files
- `apps/web/src/components/sidebar/index.tsx` - Sidebar component
- `apps/web/src/components/sidebar/sidebar-service.ts` - Sidebar state (theme, user, logout)
- `apps/web/src/pages/devices/index.tsx` - Devices page
- `apps/web/src/services/device.service.ts` - Device management state
- `apps/web/src/components/preview-modal/index.tsx` - File preview modal
- `apps/web/src/components/search-bar/index.tsx` - Search and filter bar

### Modified Files
- `apps/web/src/app.tsx` - Add routes for `/devices`, `/settings`
- `apps/web/src/pages/home/index.tsx` - Integrate sidebar, enhanced upload UI
- `apps/web/src/pages/home/home.service.ts` - Add search, filter, preview, delete, download, pagination, upload speed/ETA
- `apps/web/src/components/send-toolbar/index.tsx` - Enhanced upload progress UI
- `apps/web/src/components/header/index.tsx` - **Remove entirely** (functionality moved to sidebar)
- `apps/web/src/components/header/header.service.tsx` - **Remove entirely** (functionality moved to sidebar-service)
- `apps/web/src/components/transfer-list/index.tsx` - Add action buttons, integrate search bar, pagination

### Server Changes
- `apps/server/src/controllers/device.controller.ts` - Add `POST /pair-token` endpoint
- `apps/server/src/validators/create-pair-token.validator.ts` - Add validator for pair token request
- Add `qrcode` dependency to `apps/web/package.json`

## 8. Implementation Order

1. **Sidebar component** — Replace header, preserve theme/user/logout
2. **Navigation routing** — Add `/devices` route
3. **Device management page** — QR code + device list (requires server endpoint)
4. **Upload enhancements** — Progress UI with speed/ETA
5. **File management** — Search, filter, preview, download, delete
6. **Pagination** — Load more for transfer list
