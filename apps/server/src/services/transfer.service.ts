// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { Service } from 'typedi';
import { DbService } from './db.service.js';
import { S3Service } from './s3.service.js';
import { transferSessions, transferItems, chunkUploads } from '../db/schema.js';
import { generateSessionId, generateItemId, generateChunkId } from '../utils/id.js';

export interface InitTransferInput {
  userId: string;
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: 'file' | 'text';
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount?: number;
  content?: string;
}

export interface InitTransferOutput {
  sessionId: string;
  s3Bucket: string;
  s3Key: string;
  chunkCount: number;
  chunkSize: number;
  presignedUrls?: { chunkIndex: number; url: string; s3Key: string }[];
}

export interface TransferSessionInfo {
  id: string;
  userId: string;
  sourceDeviceId: string;
  targetDeviceId: string | null;
  status: string;
  s3Bucket: string;
  s3Key: string;
  originalFileName: string;
  totalSize: number;
  chunkCount: number;
  receivedChunks: number;
  contentType: string;
  ttlExpiresAt: number;
  createdAt: number;
  completedAt: number | null;
}

export interface TransferItemInfo {
  id: string;
  sessionId: string;
  type: string;
  name: string | null;
  mimeType: string | null;
  size: number;
  content: string | null;
  thumbnailKey: string | null;
  storageType: 'db' | 's3';
  createdAt: number;
}

@Service()
export class TransferService {
  private readonly CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

  constructor(
    private dbService: DbService,
    private s3Service: S3Service
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async initTransfer(input: InitTransferInput): Promise<InitTransferOutput> {
    const sessionId = generateSessionId();
    const now = Math.floor(Date.now() / 1000);
    const ttlExpiresAt = now + this.s3Service.getTransferTtlDays() * 24 * 60 * 60;
    const s3Key = `transfers/${sessionId}/`;
    const contentType = input.contentType || 'application/octet-stream';
    const fileName = input.fileName || 'untitled';
    const TEXT_INLINE_MAX_SIZE = 10 * 1024; // 10KB

    // 判断是否内联存储（文本且 <=10KB 且有 content）
    const isInlineText = input.type === 'text' &&
                         input.totalSize <= TEXT_INLINE_MAX_SIZE &&
                         input.content !== undefined;

    let chunkCount = 0;
    const presignedUrls: { chunkIndex: number; url: string; s3Key: string }[] = [];

    if (!isInlineText) {
      // S3 上传模式
      chunkCount = input.chunkCount ?? 0;
      for (let i = 0; i < chunkCount; i++) {
        const chunkS3Key = `transfers/${sessionId}/chunk_${i}`;
        const url = await this.s3Service.getPresignedUploadUrl(chunkS3Key, contentType);
        presignedUrls.push({ chunkIndex: i, url, s3Key: chunkS3Key });
      }
    }

    await this.db.insert(transferSessions).values({
      id: sessionId,
      userId: input.userId,
      sourceDeviceId: input.sourceDeviceId,
      targetDeviceId: input.targetDeviceId || null,
      status: 'pending',
      s3Bucket: this.s3Service.getBucket(),
      s3Key,
      originalFileName: fileName,
      totalSize: input.totalSize,
      chunkCount,
      receivedChunks: 0,
      contentType,
      ttlExpiresAt,
      createdAt: now,
    });

    // 如果是内联文本，直接插入 transferItem，并标记为已完成
    if (isInlineText) {
      const itemId = generateItemId();
      await this.db.insert(transferItems).values({
        id: itemId,
        sessionId,
        type: 'text',
        name: fileName,
        mimeType: contentType,
        size: input.totalSize,
        content: input.content,
        storageType: 'db',
        createdAt: now,
      });

      // 内联文本无需上传，直接标记为已完成
      await this.db
        .update(transferSessions)
        .set({ status: 'completed', completedAt: now })
        .where(eq(transferSessions.id, sessionId));
    }

    return {
      sessionId,
      s3Bucket: this.s3Service.getBucket(),
      s3Key,
      chunkCount,
      chunkSize: this.CHUNK_SIZE,
      presignedUrls,
    };
  }

  async uploadChunk(sessionId: string, chunkIndex: number, etag: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const chunkId = generateChunkId();
    const s3Key = `transfers/${sessionId}/chunk_${chunkIndex}`;

    await this.db.insert(chunkUploads).values({
      id: chunkId,
      sessionId,
      chunkIndex,
      s3Key,
      etag,
      uploadedAt: now,
    });

    await this.db
      .update(transferSessions)
      .set({ receivedChunks: sql`${transferSessions.receivedChunks} + 1` })
      .where(eq(transferSessions.id, sessionId));
  }

  async completeTransfer(
    sessionId: string,
    userId: string
  ): Promise<{ status: string; downloadUrl?: string }> {
    const now = Math.floor(Date.now() / 1000);

    const sessions = await this.db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Transfer session not found');
    }

    const session = sessions[0];

    if (session.receivedChunks < session.chunkCount) {
      throw new Error(
        `Transfer incomplete: ${session.receivedChunks}/${session.chunkCount} chunks received`
      );
    }

    await this.db
      .update(transferSessions)
      .set({ status: 'completed', completedAt: now })
      .where(eq(transferSessions.id, sessionId));

    // For single-chunk files, the actual file is at chunk_0, not the directory
    const s3Key = session.chunkCount === 1
      ? `transfers/${sessionId}/chunk_0`
      : session.s3Key;
    const downloadUrl = await this.s3Service.getPresignedDownloadUrl(
      s3Key,
      session.originalFileName
    );

    return { status: 'completed', downloadUrl };
  }

  async getTransferList(userId: string, limit = 50, offset = 0): Promise<(TransferSessionInfo & { items: TransferItemInfo[] })[]> {
    const results = await this.db
      .select()
      .from(transferSessions)
      .where(eq(transferSessions.userId, userId))
      .orderBy(desc(transferSessions.createdAt))
      .limit(limit)
      .offset(offset);

    // Fetch items for each transfer
    const transfersWithItems = await Promise.all(
      results.map(async (session) => {
        const items = await this.db
          .select()
          .from(transferItems)
          .where(eq(transferItems.sessionId, session.id));
        return { ...session, items: items as TransferItemInfo[] };
      })
    );

    return transfersWithItems;
  }

  async getTransferById(
    sessionId: string,
    userId: string
  ): Promise<(TransferSessionInfo & { items: TransferItemInfo[] }) | null> {
    const results = await this.db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const session = results[0] as TransferSessionInfo;

    const items = await this.db
      .select()
      .from(transferItems)
      .where(eq(transferItems.sessionId, sessionId));

    return { ...session, items: items as TransferItemInfo[] };
  }

  async getDownloadUrl(sessionId: string, userId: string): Promise<string> {
    const sessions = await this.db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Transfer session not found');
    }

    const session = sessions[0];
    // For single-chunk files, the actual file is at chunk_0, not the directory
    const s3Key = session.chunkCount === 1
      ? `transfers/${sessionId}/chunk_0`
      : session.s3Key;
    return this.s3Service.getPresignedDownloadUrl(s3Key, session.originalFileName);
  }

  async addTransferItem(
    sessionId: string,
    type: 'file' | 'text',
    name: string | null,
    mimeType: string | null,
    size: number,
    content: string | null,
    thumbnailKey: string | null,
    storageType: 'db' | 's3' = 's3'
  ): Promise<TransferItemInfo> {
    const itemId = generateItemId();
    const now = Math.floor(Date.now() / 1000);

    await this.db.insert(transferItems).values({
      id: itemId,
      sessionId,
      type,
      name,
      mimeType,
      size,
      content,
      thumbnailKey,
      storageType,
      createdAt: now,
    });

    return {
      id: itemId,
      sessionId,
      type,
      name,
      mimeType,
      size,
      content,
      thumbnailKey,
      storageType,
      createdAt: now,
    };
  }

  async deleteTransfer(sessionId: string, userId: string): Promise<boolean> {
    const existing = await this.db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    const session = existing[0];

    // Delete S3 objects based on status
    if (session.status === 'pending' && session.chunkCount > 0) {
      // Get all chunk S3 keys and delete them
      const chunks = await this.db
        .select({ s3Key: chunkUploads.s3Key })
        .from(chunkUploads)
        .where(eq(chunkUploads.sessionId, sessionId));

      for (const chunk of chunks) {
        await this.s3Service.deleteObject(chunk.s3Key);
      }
    } else if (session.status === 'completed') {
      // Delete the main S3 key (directory prefix)
      await this.s3Service.deleteObject(session.s3Key);
    }

    // Delete transferItems S3 objects (thumbnails)
    const items = await this.db
      .select({ thumbnailKey: transferItems.thumbnailKey })
      .from(transferItems)
      .where(eq(transferItems.sessionId, sessionId));

    for (const item of items) {
      if (item.thumbnailKey) {
        await this.s3Service.deleteObject(item.thumbnailKey);
      }
    }

    // Delete records in correct order: chunkUploads -> transferItems -> transferSessions
    await this.db.delete(chunkUploads).where(eq(chunkUploads.sessionId, sessionId));
    await this.db.delete(transferItems).where(eq(transferItems.sessionId, sessionId));
    await this.db
      .delete(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)));

    return true;
  }
}
