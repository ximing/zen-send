import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Service } from 'typedi';
import { logger } from '@zen-send/logger';

@Service()
export class S3Service {
  private client: S3Client | null = null;
  private bucket: string;
  private transferTtlDays: number;

  constructor() {
    this.bucket = process.env.S3_BUCKET || 'zen-send-transfers';
    this.transferTtlDays = Number(process.env.TRANSFER_TTL_DAYS) || 30;
  }

  async init(): Promise<void> {
    if (this.client) {
      logger.warn('S3 client already initialized');
      return;
    }

    this.client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: !!process.env.S3_ENDPOINT,
    });

    logger.info('S3 client initialized');
  }

  getClient(): S3Client {
    if (!this.client) {
      throw new Error('S3 client not initialized. Call init() first.');
    }
    return this.client;
  }

  getBucket(): string {
    return this.bucket;
  }

  getTransferTtlDays(): number {
    return this.transferTtlDays;
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.getClient(), command, { expiresIn });
  }

  async getPresignedDownloadUrl(
    key: string,
    originalFileName: string,
    expiresIn = 86400
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalFileName)}"`,
    });
    return getSignedUrl(this.getClient(), command, { expiresIn });
  }

  async initMultipartUpload(
    sessionId: string,
    contentType: string,
    chunkCount: number
  ): Promise<{ uploadId: string; presignedUrls: string[] }> {
    const key = `transfers/${sessionId}`;

    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    const createResult = await this.getClient().send(createCommand);
    const uploadId = createResult.UploadId!;

    const presignedUrls: string[] = [];
    for (let partNumber = 1; partNumber <= chunkCount; partNumber++) {
      const uploadPartCommand = new UploadPartCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      });
      const presignedUrl = await getSignedUrl(this.getClient(), uploadPartCommand, {
        expiresIn: 3600,
      });
      presignedUrls.push(presignedUrl);
    }

    return { uploadId, presignedUrls };
  }

  async completeMultipartUpload(
    sessionId: string,
    uploadId: string,
    parts: Array<{ partNumber: number; etag: string }>
  ): Promise<void> {
    const key = `transfers/${sessionId}`;

    const command = new CompleteMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    });

    await this.getClient().send(command);
  }

  async abortMultipartUpload(sessionId: string, uploadId: string): Promise<void> {
    const key = `transfers/${sessionId}`;

    const command = new AbortMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      UploadId: uploadId,
    });

    await this.getClient().send(command);
  }
}
