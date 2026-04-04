import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();
import { useContainer } from 'routing-controllers';
import { Container } from 'typedi';
import { createApp } from './app.js';
import { logger } from '@zen-send/logger';
useContainer(Container);

async function bootstrap() {
  try {
    await createApp();
    logger.info('Server bootstrapped successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to bootstrap server');
    process.exit(1);
  }
}

bootstrap();
