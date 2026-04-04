import { Request, Response, NextFunction } from 'express';
import { logger } from '@zen-send/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
  });
}
