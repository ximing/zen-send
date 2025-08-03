// Shared types and DTOs for zen-send

// Device types
export type DeviceType = 'web' | 'android' | 'ios' | 'desktop';

export interface Device {
  id: string;
  userId: string;
  name: string;
  type: DeviceType;
  lastSeenAt: number;
  isOnline: number;
  createdAt: number;
}

// Transfer item types
export type TransferItemType = 'file' | 'text';
export type TransferStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'expired';

export interface TransferItem {
  id: string;
  sessionId: string;
  type: TransferItemType;
  name: string | null;
  mimeType: string | null;
  size: number;
  content?: string;
  thumbnailKey?: string;
  storageType: 'db' | 's3';
  createdAt: number;
}

export interface TransferSession {
  id: string;
  userId: string;
  sourceDeviceId: string;
  targetDeviceId: string | null;
  status: TransferStatus;
  s3Bucket: string;
  s3Key: string;
  originalFileName: string;
  totalSize: number;
  chunkCount: number;
  receivedChunks: number;
  contentType: string;
  ttlExpiresAt: number;
  createdAt: number;
  completedAt?: number;
  items?: TransferItem[];
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
  };
}

// Device types
export interface DeviceResponse {
  device: Device;
}

export interface DeviceListResponse {
  devices: Device[];
}

// Transfer types
export interface InitTransferResponse {
  session: {
    id: string;
    status: string;
    s3Bucket: string;
    s3Key: string;
    chunkCount: number;
    totalSize: number;
    originalFileName: string;
  };
  items: Array<{ id: string; type: string; name: string | null; size: number }>;
  presignedUrls?: string[];
}

export interface CompleteTransferResponse {
  status: string;
  downloadUrl?: string;
}

export interface TransferListResponse {
  transfers: TransferSession[];
}

export interface TransferDetailResponse {
  transfer: TransferSession;
}

export interface DownloadUrlResponse {
  url: string;
}

// Re-export DTOs from @zen-send/dto for backwards compatibility
export type { RegisterRequest, LoginRequest, RefreshTokenRequest } from '@zen-send/dto';
export type { RegisterDeviceRequest } from '@zen-send/dto';
export type { InitTransferRequest, UploadChunkRequest } from '@zen-send/dto';

// Socket events
export interface SocketEvents {
  'device:register': { deviceId: string };
  'device:heartbeat': void;
  'device:list': { devices: Device[] };
  'transfer:new': { session: TransferSession };
  'transfer:progress': { sessionId: string; progress: number };
  'transfer:complete': { sessionId: string };
}
