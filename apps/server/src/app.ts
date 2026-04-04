import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/index.js';

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

  return app;
}
