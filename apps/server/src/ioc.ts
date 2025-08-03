import { parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';
import { logger } from '@zen-send/logger';

const __dirname = parse(fileURLToPath(import.meta.url)).dir;
const isProduction = process.env.NODE_ENV === 'production';

function findFileNamesFromGlob(globString: string) {
  return glob.sync(globString);
}

export async function initIOC() {
  const patterns = [
    `${__dirname}/services/**/*.${isProduction ? 'js' : 'ts'}`,
    `${__dirname}/controllers/**/*.${isProduction ? 'js' : 'ts'}`,
  ];

  for (const globString of patterns) {
    const filePaths = findFileNamesFromGlob(globString);
    logger.info({ pattern: globString, count: filePaths.length }, 'IOC: Loading files');

    for (const fileName of filePaths) {
      try {
        const module = await import(fileName);
        logger.debug({ module: module.default?.name || module.name }, 'Loaded module');
      } catch (error: any) {
        logger.error({ err: error.message, file: fileName }, 'Failed to import');
      }
    }
  }
}