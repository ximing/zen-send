// NOTE: Do NOT import 'reflect-metadata' here - only in app.ts/index.ts
import { eq, and, desc, sql } from 'drizzle-orm';
import { Service } from 'typedi';
import { db } from '../config/database.js';
import { transferSessions, transferItems, chunkUploads } from '../db/schema.js';
import { generateSessionId, generateItemId, generateChunkId } from '../utils/id.js';
import { getPresignedUploadUrl, getPresignedDownloadUrl, S3_BUCKET, TRANSFER_TTL_DAYS } from '../config/s3.js';

const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

export interface InitTransferInput {
  userId: string;
  sourceDeviceId: string;
  targetDeviceId?: string;
  type: 'file' | 'text' | 'clipboard';
  fileName?: string;
  contentType?: string;
  totalSize: number;
  chunkCount: number;
}

export interface InitTransferOutput {
  sessionId: string;
  s3Bucket: string;
  s3Key: string;
  chunkCount: number;
  chunkSize: number;
  presignedUrls: { chunkIndex: number; url: string; s3Key: string }[];
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
  createdAt: number;
}

@Service()
export class TransferService {
  async initTransfer(input: InitTransferInput): Promise<InitTransferOutput> {
    const sessionId = generateSessionId();
    const now = Math.floor(Date.now() / 1000);
    const ttlExpiresAt = now + TRANSFER_TTL_DAYS * 24 * 60 * 60;
    const s3Key = `transfers/${sessionId}/`;
    const contentType = input.contentType || 'application/octet-stream';
    const fileName = input.fileName || 'untitled';

    const presignedUrls: { chunkIndex: number; url: string; s3Key: string }[] = [];
    for (let i = 0; i < input.chunkCount; i++) {
      const chunkS3Key = `transfers/${sessionId}/chunk_${i}`;
      const url = await getPresignedUploadUrl(chunkS3Key, contentType);
      presignedUrls.push({ chunkIndex: i, url, s3Key: chunkS3Key });
    }

    await db.insert(transferSessions).values({
      id: sessionId,
      userId: input.userId,
      sourceDeviceId: input.sourceDeviceId,
      targetDeviceId: input.targetDeviceId || null,
      status: 'pending',
      s3Bucket: S3_BUCKET,
      s3Key,
      originalFileName: fileName,
      totalSize: input.totalSize,
      chunkCount: input.chunkCount,
      receivedChunks: 0,
      contentType,
      ttlExpiresAt,
      createdAt: now,
    });

    return {
      sessionId,
      s3Bucket: S3_BUCKET,
      s3Key,
      chunkCount: input.chunkCount,
      chunkSize: CHUNK_SIZE,
      presignedUrls,
    };
  }

  async uploadChunk(sessionId: string, chunkIndex: number, etag: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const chunkId = generateChunkId();
    const s3Key = `transfers/${sessionId}/chunk_${chunkIndex}`;

    await db.insert(chunkUploads).values({
      id: chunkId,
      sessionId,
      chunkIndex,
      s3Key,
      etag,
      uploadedAt: now,
    });

    await db
      .update(transferSessions)
      .set({ receivedChunks: sql`${transferSessions.receivedChunks} + 1` })
      .where(eq(transferSessions.id, sessionId));
  }

  async completeTransfer(sessionId: string, userId: string): Promise<{ status: string; downloadUrl?: string }> {
    const now = Math.floor(Date.now() / 1000);

    const sessions = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Transfer session not found');
    }

    const session = sessions[0];

    if (session.receivedChunks < session.chunkCount) {
      throw new Error(`Transfer incomplete: ${session.receivedChunks}/${session.chunkCount} chunks received`);
    }

    await db
      .update(transferSessions)
      .set({ status: 'completed', completedAt: now })
      .where(eq(transferSessions.id, sessionId));

    const downloadUrl = await getPresignedDownloadUrl(session.s3Key, session.originalFileName);

    return { status: 'completed', downloadUrl };
  }

  async getTransferList(userId: string, limit = 50, offset = 0): Promise<TransferSessionInfo[]> {
    const results = await db
      .select()
      .from(transferSessions)
      .where(eq(transferSessions.userId, userId))
      .orderBy(desc(transferSessions.createdAt))
      .limit(limit)
      .offset(offset);

    return results as TransferSessionInfo[];
  }

  async getTransferById(sessionId: string, userId: string): Promise<TransferSessionInfo | null> {
    const results = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const session = results[0] as TransferSessionInfo;

    const items = await db
      .select()
      .from(transferItems)
      .where(eq(transferItems.sessionId, sessionId));

    return { ...session };
  }

  async getDownloadUrl(sessionId: string, userId: string): Promise<string> {
    const sessions = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (sessions.length === 0) {
      throw new Error('Transfer session not found');
    }

    const session = sessions[0];
    return getPresignedDownloadUrl(session.s3Key, session.originalFileName);
  }

  async addTransferItem(
    sessionId: string,
    type: 'file' | 'text' | 'clipboard',
    name: string | null,
    mimeType: string | null,
    size: number,
    content: string | null,
    thumbnailKey: string | null
  ): Promise<TransferItemInfo> {
    const itemId = generateItemId();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(transferItems).values({
      id: itemId,
      sessionId,
      type,
      name,
      mimeType,
      size,
      content,
      thumbnailKey,
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
      createdAt: now,
    };
  }

  async deleteTransfer(sessionId: string, userId: string): Promise<boolean> {
    const existing = await db
      .select()
      .from(transferSessions)
      .where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      return false;
    }

    await db.delete(transferSessions).where(and(eq(transferSessions.id, sessionId), eq(transferSessions.userId, userId)));
    return true;
  }
}
