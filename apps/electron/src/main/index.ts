import { app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@zen-send/logger';
import { WindowManager } from './window';
import { TrayManager } from './tray';
import { MenuManager } from './menu';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5274';
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');

let isQuitting = false;

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(value: boolean): void {
  isQuitting = value;
}

export async function initializeApp(): Promise<void> {
  const windowManager = new WindowManager();
  const trayManager = new TrayManager(windowManager);
  const menuManager = new MenuManager(windowManager);

  // Initialize window first
  windowManager.create();

  // Delay tray and menu initialization to let window load first
  setTimeout(() => {
    trayManager.create();
    menuManager.create();
  }, 1000);

  // App event handlers
  app.on('window-all-closed', () => {
    // Keep running with tray icon on all platforms
    // The app stays in system tray
  });

  app.on('activate', () => {
    windowManager.show();
  });

  app.on('before-quit', () => {
    setIsQuitting(true);
  });

  app.on('will-quit', () => {
    // Cleanup
    trayManager.destroy();
    logger.close();
  });

  logger.info('Zen Send Electron app initialized', { version: app.getVersion() });
}

app.whenReady().then(initializeApp);
