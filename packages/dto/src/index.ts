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
