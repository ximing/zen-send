import { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

export const S3_BUCKET = process.env.S3_BUCKET || 'zen-send-transfers';
export const TRANSFER_TTL_DAYS = Number(process.env.TRANSFER_TTL_DAYS) || 30;

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getPresignedDownloadUrl(key: string, originalFileName: string, expiresIn = 86400): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(originalFileName)}"`,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function initMultipartUpload(
  sessionId: string,
  contentType: string,
  chunkCount: number
): Promise<{ uploadId: string; presignedUrls: string[] }> {
  const key = `transfers/${sessionId}`;

  // Create multipart upload
  const createCommand = new CreateMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const createResult = await s3Client.send(createCommand);
  const uploadId = createResult.UploadId!;

  // Generate presigned URLs for each part (chunk)
  const presignedUrls: string[] = [];
  for (let partNumber = 1; partNumber <= chunkCount; partNumber++) {
    const uploadPartCommand = new UploadPartCommand({
      Bucket: S3_BUCKET,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const presignedUrl = await getSignedUrl(s3Client, uploadPartCommand, { expiresIn: 3600 });
    presignedUrls.push(presignedUrl);
  }

  return { uploadId, presignedUrls };
}

export async function completeMultipartUpload(
  sessionId: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>
): Promise<void> {
  const key = `transfers/${sessionId}`;

  const command = new CompleteMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((p) => ({
        PartNumber: p.partNumber,
        ETag: p.etag,
      })),
    },
  });

  await s3Client.send(command);
}

export async function abortMultipartUpload(sessionId: string, uploadId: string): Promise<void> {
  const key = `transfers/${sessionId}`;

  const command = new AbortMultipartUploadCommand({
    Bucket: S3_BUCKET,
    Key: key,
    UploadId: uploadId,
  });

  await s3Client.send(command);
}
