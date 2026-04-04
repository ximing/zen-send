import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/index.js';
import { deviceRouter } from './modules/device/index.js';
import { transferRouter } from './modules/transfer/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

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
