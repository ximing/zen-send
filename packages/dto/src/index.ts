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
export interface InitTransferRequest {
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: 'file' | 'text' | 'clipboard';
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount: number;
}

export interface UploadChunkRequest {
  chunkIndex: number;
  etag: string;
}
