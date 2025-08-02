import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/index.js';
import { deviceRouter } from './modules/device/index.js';
import { transferRouter } from './modules/transfer/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { logger } from '@zen-send/logger';

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logData: Record<string, unknown> = {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
      };
      if (req._error) {
        logData.error = req._error;
      }
      if (res.statusCode >= 400) {
        logger.error(logData, 'Request failed');
      } else {
        logger.info(logData, 'Request completed');
      }
    });
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Auth routes
  app.use('/api/auth', authRouter);

  // Device routes
  app.use('/api/devices', deviceRouter);

  // Transfer routes
  app.use('/api/transfers', transferRouter);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
