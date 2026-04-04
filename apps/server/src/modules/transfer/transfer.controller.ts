import type { Request, Response } from 'express';
import { z } from 'zod';
import { transferService } from './transfer.service.js';
import { created, success, badRequest, notFound } from '../../utils/response.js';

const initTransferSchema = z.object({
  sourceDeviceId: z.string().min(1),
  targetDeviceId: z.string().optional(),
  type: z.enum(['file', 'text', 'clipboard']),
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  totalSize: z.number().int().positive(),
  chunkCount: z.number().int().positive(),
});

const uploadChunkSchema = z.object({
  chunkIndex: z.number().int().min(0),
  etag: z.string().min(1),
});

export const transferController = {
  async init(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const parseResult = initTransferSchema.safeParse(req.body);

    if (!parseResult.success) {
      badRequest(res, 'Invalid transfer initialization data');
      return;
    }

    try {
      const result = await transferService.initTransfer({
        userId,
        sourceDeviceId: parseResult.data.sourceDeviceId,
        targetDeviceId: parseResult.data.targetDeviceId,
        type: parseResult.data.type,
        fileName: parseResult.data.fileName,
        contentType: parseResult.data.contentType,
        totalSize: parseResult.data.totalSize,
        chunkCount: parseResult.data.chunkCount,
      });

      created(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize transfer';
      badRequest(res, message);
    }
  },

  async uploadChunk(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const sessionId = req.params.id as string;
    const parseResult = uploadChunkSchema.safeParse(req.body);

    if (!parseResult.success) {
      badRequest(res, 'Invalid chunk upload data');
      return;
    }

    try {
      // Verify session belongs to user
      const session = await transferService.getTransferById(sessionId, userId);
      if (!session) {
        notFound(res, 'Transfer session not found');
        return;
      }

      await transferService.uploadChunk(
        sessionId,
        parseResult.data.chunkIndex,
        parseResult.data.etag
      );

      success(res, { received: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to record chunk';
      badRequest(res, message);
    }
  },

  async complete(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const sessionId = req.params.id as string;

    try {
      const result = await transferService.completeTransfer(sessionId, userId);
      success(res, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete transfer';
      if (message.includes('not found')) {
        notFound(res, message);
      } else {
        badRequest(res, message);
      }
    }
  },

  async list(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (isNaN(limit) || limit < 0 || isNaN(offset) || offset < 0) {
      badRequest(res, 'Invalid limit or offset parameter');
      return;
    }

    try {
      const transfers = await transferService.getTransferList(userId, limit, offset);
      success(res, { transfers });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list transfers';
      badRequest(res, message);
    }
  },

  async get(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const sessionId = req.params.id as string;

    try {
      const transfer = await transferService.getTransferById(sessionId, userId);
      if (!transfer) {
        notFound(res, 'Transfer not found');
        return;
      }
      success(res, { transfer });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get transfer';
      badRequest(res, message);
    }
  },

  async getDownloadUrl(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const sessionId = req.params.id as string;

    try {
      const url = await transferService.getDownloadUrl(sessionId, userId);
      success(res, { downloadUrl: url });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get download URL';
      if (message.includes('not found')) {
        notFound(res, message);
      } else {
        badRequest(res, message);
      }
    }
  },

  async deleteTransfer(req: Request, res: Response, next: Function): Promise<void> {
    try {
      const userId = req.user!.userId;
      const id = req.params.id as string;

      const deleted = await transferService.deleteTransfer(id, userId);
      if (!deleted) {
        notFound(res, 'Transfer not found');
        return;
      }

      success(res, { message: 'Transfer deleted successfully' });
    } catch (err) {
      next(err);
    }
  },
};
