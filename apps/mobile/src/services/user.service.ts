import { Service } from '@rabjs/react';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import type {
  UpdateProfileRequest,
  AvatarPresignResponse,
  UserProfileResponse,
} from '@zen-send/dto';

export class UserService extends Service {
  get apiService() {
    return this.resolve(ApiService);
  }

  get authService() {
    return this.resolve(AuthService);
  }

  async getProfile(): Promise<UserProfileResponse> {
    const profile = await this.apiService.get<UserProfileResponse>('/api/users/me');
    this.syncLocalUser(profile);
    return profile;
  }

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
    const profile = await this.apiService.patch<UserProfileResponse>('/api/users/me', data);
    this.syncLocalUser(profile);
    return profile;
  }

  async uploadAvatar(fileUri: string, contentType: string, fileSize: number): Promise<UserProfileResponse> {
    if (fileSize > 10 * 1024 * 1024) {
      throw new Error('File size must be less than 10MB');
    }

    const presignResult = await this.apiService.post<AvatarPresignResponse>(
      '/api/users/me/avatar/presign',
      { contentType, fileSize }
    );

    await this.apiService.uploadPresignedUrl(presignResult.uploadUrl, fileUri, contentType);

    const profile = await this.apiService.post<UserProfileResponse>(
      '/api/users/me/avatar/confirm',
      { key: presignResult.key }
    );

    this.syncLocalUser(profile);
    return profile;
  }

  private syncLocalUser(profile: UserProfileResponse) {
    if (this.authService.user) {
      this.authService.user = {
        ...this.authService.user,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      };
    }
  }
}
