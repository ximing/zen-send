# User Avatar & Nickname Feature Design

## Overview

Add user avatar and nickname support across web, mobile, and server. Users can view and edit their avatar and nickname in the settings page. Avatar upload uses S3 presigned URL direct upload, reusing the existing S3 infrastructure.

## Data Layer

### Database Schema Changes

Add two nullable columns to `users` table (`apps/server/src/db/schema.ts`):

- `avatarUrl: varchar('avatarUrl', { length: 500 })` — stores S3 object key (e.g. `avatars/{userId}/{timestamp}.{ext}`), not full URL
- `nickname: varchar('nickname', { length: 50 })` — nullable, client falls back to email prefix when not set

Both fields nullable, no impact on existing data. Migration generated via Drizzle.

### DTO Changes (`packages/dto/src/index.ts`)

New types:

- `UpdateProfileRequest` — `{ nickname?: string }`
- `AvatarPresignRequest` — `{ contentType: string }`
- `AvatarPresignResponse` — `{ uploadUrl: string, key: string }`
- `AvatarConfirmRequest` — `{ key: string }`
- `UserProfileResponse` — `{ id: string, email: string, nickname?: string, avatarUrl?: string }`

### Shared Types (`packages/shared/src/index.ts`)

Update `AuthTokens.user` to include `nickname?: string` and `avatarUrl?: string` so clients have this data immediately after login/refresh.

## API Layer

### New UserController (`apps/server/src/controllers/user.controller.ts`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/me` | GET | Return current user profile (`UserProfileResponse`) |
| `/api/users/me` | PATCH | Update nickname (body: `UpdateProfileRequest`) |
| `/api/users/me/avatar/presign` | POST | Get presigned upload URL (body: `AvatarPresignRequest`) |
| `/api/users/me/avatar/confirm` | POST | Confirm upload, update avatarUrl, delete old avatar (body: `AvatarConfirmRequest`) |

### Avatar Upload Flow

1. Client selects image → calls `POST /avatar/presign` with `contentType`
2. Server generates key (`avatars/{userId}/{timestamp}.{ext}`), calls S3Service for presigned URL
3. Client uploads image directly to S3 via presigned URL
4. Client calls `POST /avatar/confirm` with `key`
5. Server validates key format → updates `users.avatarUrl` → deletes old avatar from S3 if exists

### Validator (`apps/server/src/validators/user.validator.ts`)

- `UpdateProfileRequest`: nickname optional, max 50 chars
- `AvatarPresignRequest`: contentType required, only `image/jpeg`, `image/png`, `image/webp`
- `AvatarConfirmRequest`: key required

### UserService (`apps/server/src/services/user.service.ts`)

- `getProfile(userId)` — query user profile
- `updateProfile(userId, data)` — update nickname
- `presignAvatar(userId, contentType)` — generate presigned URL
- `confirmAvatar(userId, key)` — confirm upload, update avatarUrl, delete old avatar

### Auth Response Change

`AuthService.login/register` returns `AuthTokens.user` with `nickname` and `avatarUrl` fields added.

## Web Client

### Settings Page (`apps/web/src/pages/settings/index.tsx`)

Replace stub with full profile editing page:

- Avatar display: circular, shows image if avatarUrl set, otherwise first-letter placeholder
- "Change avatar" button → file input (`accept="image/jpeg,image/png,image/webp"`) → presign upload flow → confirm → update local state
- Nickname input: shows current nickname, editable, save button on right
- Save nickname → `PATCH /api/users/me` → update local state

### NavContent Update (`apps/web/src/components/nav-content/index.tsx`)

- Show avatar image when avatarUrl exists
- Show nickname when set, otherwise email prefix
- Click avatar area → navigate to settings page

### New Service

`apps/web/src/services/user.service.ts` — API calls for getProfile, updateProfile, presignAvatar, confirmAvatar

### Auth State

`AuthService` user type adds `nickname?: string` and `avatarUrl?: string`

## Mobile Client

### Drawer Avatar Update (`apps/mobile/src/components/drawer/drawer-content.tsx`)

- Show avatar image (circular) when avatarUrl exists, otherwise first-letter placeholder
- Show nickname when set, otherwise email prefix

### New Settings Page (`apps/mobile/src/pages/settings/index.tsx`)

- Avatar display + "Change avatar" button
- Tap "Change avatar" → `expo-image-picker` `launchImageLibraryAsync` → presign upload → confirm → update local state
- Nickname input + save button
- Navigation entry: add "Settings" menu item in Drawer

### Image Picker

Use `expo-image-picker`: `mediaTypes: Images`, `quality: 0.8`

### New Service

`apps/mobile/src/services/user.service.ts` — API calls for user profile operations

### Auth State

Same as web: `AuthService` user type adds `nickname?: string` and `avatarUrl?: string`
