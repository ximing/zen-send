// Auth DTOs
export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Device DTOs
export interface RegisterDeviceRequest {
  name: string;
  type: 'web' | 'android' | 'ios' | 'desktop';
}

// Transfer DTOs
export type TransferType = 'file' | 'text';

export interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: TransferType;
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount?: number;
  content?: string;
}

export interface InitTransferResponse {
  sessionId: string;
  presignedUrls?: string[];
  chunkSize?: number;
}

export interface UploadChunkRequest {
  chunkIndex: number;
  etag: string;
}

// User Profile DTOs
export interface UpdateProfileRequest {
  nickname?: string;
  removeAvatar?: boolean;
}

export interface AvatarPresignRequest {
  contentType: string;
  fileSize?: number;
}

export interface AvatarPresignResponse {
  uploadUrl: string;
  key: string;
}

export interface AvatarConfirmRequest {
  key: string;
}

export interface UserProfileResponse {
  id: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
}

// Note DTOs
export interface CreateNoteRequest {
  title?: string;
  content?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}

export interface ReorderNotesRequest {
  orders: Array<{ id: string; sortOrder: number }>;
}

export interface NoteListItem {
  id: string;
  title: string;
  sortOrder: number;
  updatedAt: number;
}

export interface NoteDetail {
  id: string;
  userId: string;
  title: string;
  content: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}
