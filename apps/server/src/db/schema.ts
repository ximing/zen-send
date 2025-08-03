import { mysqlTable, varchar, int, bigint, text, tinyint } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 24 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('passwordHash', { length: 255 }).notNull(),
  createdAt: int('createdAt').notNull(),
  updatedAt: int('updatedAt').notNull(),
});

export const devices = mysqlTable('devices', {
  id: varchar('id', { length: 24 }).primaryKey(),
  userId: varchar('userId', { length: 24 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  lastSeenAt: int('lastSeenAt').notNull(),
  isOnline: tinyint('isOnline').notNull().default(0),
  createdAt: int('createdAt').notNull(),
});

export const transferSessions = mysqlTable('transferSessions', {
  id: varchar('id', { length: 24 }).primaryKey(),
  userId: varchar('userId', { length: 24 }).notNull(),
  sourceDeviceId: varchar('sourceDeviceId', { length: 24 }).notNull(),
  targetDeviceId: varchar('targetDeviceId', { length: 24 }),
  status: varchar('status', { length: 20 }).notNull(),
  s3Bucket: varchar('s3Bucket', { length: 100 }).notNull(),
  s3Key: varchar('s3Key', { length: 500 }).notNull(),
  originalFileName: varchar('originalFileName', { length: 255 }).notNull(),
  totalSize: bigint('totalSize', { mode: 'number' }).notNull(),
  chunkCount: int('chunkCount').notNull(),
  receivedChunks: int('receivedChunks').notNull().default(0),
  contentType: varchar('contentType', { length: 100 }).notNull(),
  ttlExpiresAt: int('ttlExpiresAt').notNull(),
  createdAt: int('createdAt').notNull(),
  completedAt: int('completedAt'),
});

export const transferItems = mysqlTable('transferItems', {
  id: varchar('id', { length: 24 }).primaryKey(),
  sessionId: varchar('sessionId', { length: 24 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }),
  mimeType: varchar('mimeType', { length: 100 }),
  size: bigint('size', { mode: 'number' }).notNull(),
  content: text('content'),
  thumbnailKey: varchar('thumbnailKey', { length: 500 }),
  createdAt: int('createdAt').notNull(),
});

export const chunkUploads = mysqlTable('chunkUploads', {
  id: varchar('id', { length: 24 }).primaryKey(),
  sessionId: varchar('sessionId', { length: 24 }).notNull(),
  chunkIndex: int('chunkIndex').notNull(),
  s3Key: varchar('s3Key', { length: 500 }).notNull(),
  etag: varchar('etag', { length: 100 }),
  uploadedAt: int('uploadedAt').notNull(),
});
