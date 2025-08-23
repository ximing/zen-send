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
  uploadId: string;
  chunkCount: number;
  chunkSize: number;
  presignedUrls?: string[];
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
  private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB (S3 minimum for multipart upload)

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
    const s3Key = `transfers/${sessionId}`;
    const contentType = input.contentType || 'application/octet-stream';
    const fileName = input.fileName || 'untitled';
    const TEXT_INLINE_MAX_SIZE = 10 * 1024; // 10KB
    const MULTIPART_MIN_SIZE = 5 * 1024 * 1024; // 5MB - S3 multipart minimum

    // 判断是否内联存储（文本且 <=10KB 且有 content）
    const isInlineText = input.type === 'text' &&
                         input.totalSize <= TEXT_INLINE_MAX_SIZE &&
                         input.content !== undefined;

    // 判断是否使用 multipart upload（文件 > 5MB）
    const useMultipart = !isInlineText && input.totalSize > MULTIPART_MIN_SIZE;

    let chunkCount = 0;
    let uploadId = '';
    const presignedUrls: string[] = [];

    if (!isInlineText) {
      if (useMultipart) {
        // S3 上传模式 - 使用真正的 multipart upload（文件 >= 5MB）
        chunkCount = input.chunkCount ?? 0;
        const multipartResult = await this.s3Service.initMultipartUpload(sessionId, contentType, chunkCount);
        uploadId = multipartResult.uploadId;
        presignedUrls.push(...multipartResult.presignedUrls);
      } else {
        // 小文件（< 5MB）- 使用简单的 PutObject，不需要 multipart
        chunkCount = 1;
        const url = await this.s3Service.getPresignedUploadUrl(s3Key, contentType);
        presignedUrls.push(url);
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
      uploadId,
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
      uploadId,
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

    // Complete multipart upload - this assembles all parts into a single file in S3
    if (session.uploadId && session.chunkCount > 0) {
      // Get all chunk uploads ordered by chunk index
      const chunks = await this.db
        .select()
        .from(chunkUploads)
        .where(eq(chunkUploads.sessionId, sessionId))
        .orderBy(chunkUploads.chunkIndex);

      const parts = chunks.map((chunk) => ({
        partNumber: chunk.chunkIndex + 1, // S3 part numbers are 1-indexed
        etag: chunk.etag!,
      }));

      await this.s3Service.completeMultipartUpload(sessionId, session.uploadId, parts);
    }

    await this.db
      .update(transferSessions)
      .set({ status: 'completed', completedAt: now })
      .where(eq(transferSessions.id, sessionId));

    // Create transfer_item for S3 uploads if not exists
    const existingItems = await this.db
      .select()
      .from(transferItems)
      .where(eq(transferItems.sessionId, sessionId));

    if (existingItems.length === 0) {
      const itemId = generateItemId();
      await this.db.insert(transferItems).values({
        id: itemId,
        sessionId,
        type: 'file',
        name: session.originalFileName,
        mimeType: session.contentType,
        size: session.totalSize,
        content: null,
        thumbnailKey: null,
        storageType: 's3',
        createdAt: now,
      });
    }

    // S3 object key is transfers/${sessionId} (the multipart upload assembles to this key)
    const downloadUrl = await this.s3Service.getPresignedDownloadUrl(
      session.s3Key,
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

  async getExternalLink(sessionId: string, userId: string): Promise<{ url: string; expiresAt: number }> {
    const session = await this.db.query.transferSessions.findFirst({
      where: eq(transferSessions.id, sessionId),
    });

    if (!session) {
      throw new Error('Transfer not found');
    }

    // Verify transfer belongs to current user
    if (session.userId !== userId) {
      throw new Error('Transfer does not belong to current user');
    }

    if (session.status !== 'completed') {
      throw new Error('Transfer is not completed');
    }

    // Check if this is S3 storage type (inline text has no S3 object)
    const items = await this.db.query.transferItems.findMany({
      where: eq(transferItems.sessionId, sessionId),
    });

    if (items.length === 0 || items[0].storageType !== 's3') {
      throw new Error('External link is only available for S3-stored files');
    }

    // 6 hours expiry (in seconds)
    const EXTERNAL_LINK_EXPIRY = 6 * 60 * 60;
    const expiresAt = Math.floor(Date.now() / 1000) + EXTERNAL_LINK_EXPIRY;

    // S3 object key is transfers/${sessionId} (multipart upload stores assembled file here)
    const url = await this.s3Service.getPresignedDownloadUrl(
      session.s3Key,
      session.originalFileName || 'download',
      EXTERNAL_LINK_EXPIRY
    );

    return { url, expiresAt };
  }
}
