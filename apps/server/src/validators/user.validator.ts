import { IsString, IsOptional, IsBoolean, IsIn, MaxLength, IsNumber, Max } from 'class-validator';
import type {
  UpdateProfileRequest,
  AvatarPresignRequest,
  AvatarConfirmRequest,
} from '@zen-send/dto';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 10 * 1024 * 1024; // 10MB

export class UpdateProfileDto implements UpdateProfileRequest {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;

  @IsOptional()
  @IsBoolean()
  removeAvatar?: boolean;
}

export class AvatarPresignDto implements AvatarPresignRequest {
  @IsString()
  @IsIn(ALLOWED_AVATAR_TYPES)
  contentType!: string;

  @IsOptional()
  @IsNumber()
  @Max(MAX_AVATAR_SIZE)
  fileSize?: number;
}

export class AvatarConfirmDto implements AvatarConfirmRequest {
  @IsString()
  key!: string;
}
