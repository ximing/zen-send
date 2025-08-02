import { Request, Response, NextFunction } from 'express';
import { logger } from '@zen-send/logger';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  req._error = err.message;
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
}

export function notFoundHandler(req: Request, res: Response): void {
  req._error = 'Not found';
  res.status(404).json({
    success: false,
    error: 'Not found',
    code: 'NOT_FOUND',
  });
}

// Extend Express Request to include error message
declare global {
  namespace Express {
    interface Request {
      _error?: string;
    }
  }
}
