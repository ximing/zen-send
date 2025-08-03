import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { logger } from '@zen-send/logger';

async function bootstrap() {
  try {
    await createApp();
    logger.info('Server bootstrapped successfully');
  } catch (error) {
    logger.error('Failed to bootstrap server', error);
    process.exit(1);
  }
}

bootstrap();
