import { eq } from 'drizzle-orm';
import { Service } from 'typedi';
import { DbService } from './db.service.js';
import { S3Service } from './s3.service.js';
import { users } from '../db/schema.js';
import { logger } from '@zen-send/logger';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const AVATAR_KEY_PREFIX = 'avatars/';

@Service()
export class UserService {
  constructor(
    private dbService: DbService,
    private s3Service: S3Service,
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getProfile(userId: string) {
    const result = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (result.length === 0) {
      throw new Error('User not found');
    }
    const user = result[0];
    let avatarUrl: string | undefined;
    if (user.avatarKey) {
      avatarUrl = await this.s3Service.getPresignedInlineUrl(user.avatarKey);
    }
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname ?? undefined,
      avatarUrl,
    };
  }

  async updateProfile(userId: string, data: { nickname?: string; removeAvatar?: boolean }) {
    const now = Math.floor(Date.now() / 1000);
    const updates: Record<string, any> = { updatedAt: now };

    if (data.nickname !== undefined) {
      updates.nickname = data.nickname || null;
    }

    if (data.removeAvatar) {
      const result = await this.db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, userId)).limit(1);
      const oldKey = result[0]?.avatarKey;
      updates.avatarKey = null;
      if (oldKey) {
        await this.s3Service.deleteObject(oldKey).catch((err: Error) =>
          logger.warn({ err, key: oldKey }, 'Failed to delete old avatar')
        );
      }
    }

    await this.db.update(users).set(updates).where(eq(users.id, userId));
    return this.getProfile(userId);
  }

  async presignAvatar(userId: string, contentType: string, fileSize?: number) {
    if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
      throw new Error(`Invalid content type: ${contentType}. Allowed: ${ALLOWED_AVATAR_TYPES.join(', ')}`);
    }
    if (fileSize && fileSize > MAX_AVATAR_SIZE) {
      throw new Error(`File size ${fileSize} exceeds maximum ${MAX_AVATAR_SIZE} bytes`);
    }

    const ext = contentType.split('/')[1];
    const timestamp = Date.now();
    const key = `${AVATAR_KEY_PREFIX}${userId}/${timestamp}.${ext}`;
    const uploadUrl = await this.s3Service.getPresignedUploadUrl(key, contentType);

    return { uploadUrl, key };
  }

  async confirmAvatar(userId: string, key: string) {
    const expectedPrefix = `${AVATAR_KEY_PREFIX}${userId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new Error('Invalid avatar key');
    }

    const result = await this.db.select({ avatarKey: users.avatarKey }).from(users).where(eq(users.id, userId)).limit(1);
    const oldKey = result[0]?.avatarKey;

    const now = Math.floor(Date.now() / 1000);
    await this.db.update(users).set({ avatarKey: key, updatedAt: now }).where(eq(users.id, userId));

    if (oldKey && oldKey !== key) {
      await this.s3Service.deleteObject(oldKey).catch((err: Error) =>
        logger.warn({ err, key: oldKey }, 'Failed to delete old avatar')
      );
    }

    return this.getProfile(userId);
  }
}
