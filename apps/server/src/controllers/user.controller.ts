// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import {
  JsonController,
  Get,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpError,
  CurrentUser,
  Authorized,
} from 'routing-controllers';
import { Service } from 'typedi';
import { UserService } from '../services/user.service.js';
import {
  UpdateProfileDto,
  AvatarPresignDto,
  AvatarConfirmDto,
} from '../validators/user.validator.js';
import { ResponseUtil } from '../utils/response.js';
import type { TokenPayload } from '../utils/jwt.js';

@JsonController('/api/users')
@Service()
@Authorized()
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/me')
  async getProfile(@CurrentUser() user: TokenPayload) {
    try {
      const profile = await this.userService.getProfile(user.userId);
      return ResponseUtil.success(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get profile';
      if (message.includes('not found')) {
        throw new HttpError(404, message);
      }
      throw new HttpError(400, message);
    }
  }

  @Patch('/me')
  @HttpCode(200)
  async updateProfile(@CurrentUser() user: TokenPayload, @Body() dto: UpdateProfileDto) {
    try {
      const profile = await this.userService.updateProfile(user.userId, {
        nickname: dto.nickname,
        removeAvatar: dto.removeAvatar,
      });
      return ResponseUtil.success(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update profile';
      throw new HttpError(400, message);
    }
  }

  @Post('/me/avatar/presign')
  @HttpCode(200)
  async presignAvatar(@CurrentUser() user: TokenPayload, @Body() dto: AvatarPresignDto) {
    try {
      const result = await this.userService.presignAvatar(
        user.userId,
        dto.contentType,
        dto.fileSize
      );
      return ResponseUtil.success(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to presign avatar';
      throw new HttpError(400, message);
    }
  }

  @Post('/me/avatar/confirm')
  @HttpCode(200)
  async confirmAvatar(@CurrentUser() user: TokenPayload, @Body() dto: AvatarConfirmDto) {
    try {
      const profile = await this.userService.confirmAvatar(user.userId, dto.key);
      return ResponseUtil.success(profile);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm avatar';
      throw new HttpError(400, message);
    }
  }
}
