import { Request, Response, NextFunction } from 'express';
import { HttpError } from 'routing-controllers';
import { logger } from '@zen-send/logger';

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error({ err: error, path: req.path, method: req.method }, 'Request error');

  if (error instanceof HttpError) {
    res.status(error.httpCode).json({
      success: false,
      error: error.message,
      code: 'HTTP_ERROR',
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
