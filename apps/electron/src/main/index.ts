import { app, ipcMain, dialog, globalShortcut } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import Store from 'electron-store';
import { logger } from '@zen-send/logger';
import { WindowManager } from './window';
import { TrayManager } from './tray';
import { MenuManager } from './menu';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5274';
export const PRELOAD_PATH = path.join(__dirname, '../preload/index.cjs');

let isQuitting = false;

// Server URL store
const serverUrlStore = new Store<{ serverUrl: string }>({
  name: 'server-url',
  defaults: { serverUrl: process.env.VITE_DEFAULT_SERVER_URL || '' },
});

// Global shortcut store
const shortcutStore = new Store<{ accelerator: string }>({
  name: 'global-shortcut',
  defaults: { accelerator: '' },
});

export function getIsQuitting(): boolean {
  return isQuitting;
}

export function setIsQuitting(value: boolean): void {
  isQuitting = value;
}

function registerGlobalShortcut(windowManager: WindowManager, accelerator: string): boolean {
  globalShortcut.unregisterAll();
  if (!accelerator) return true;
  return globalShortcut.register(accelerator, () => {
    windowManager.show();
  });
}

export async function initializeApp(): Promise<void> {
  const windowManager = new WindowManager();
  const trayManager = new TrayManager(windowManager);
  const menuManager = new MenuManager(windowManager);

  // Register IPC handlers
  registerIpcHandlers(windowManager);

  // Initialize window first
  windowManager.create();

  // Delay tray and menu initialization to let window load first
  setTimeout(() => {
    trayManager.create();
    menuManager.create();
  }, 1000);

  // Restore global shortcut from store
  const savedShortcut = shortcutStore.store.accelerator;
  if (savedShortcut) {
    registerGlobalShortcut(windowManager, savedShortcut);
  }

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
    globalShortcut.unregisterAll();
    trayManager.destroy();
  });

  logger.info({ version: app.getVersion() }, 'Zen Send Electron app initialized');
}

function registerIpcHandlers(windowManager: WindowManager): void {
  // Log preload info
  ipcMain.handle('log-preload', (_event, data) => {
    logger.info('[Preload] Log received:', data);
  });

  // Dialog: open file
  ipcMain.handle('dialog:openFile', async (_event, options) => {
    const result = await dialog.showOpenDialog({
      title: options?.title || 'Open File',
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
      properties: options?.multiSelections ? ['openFile', 'multiSelections'] : ['openFile'],
    });
    return result.canceled ? null : result.filePaths;
  });

  // Dialog: save file
  ipcMain.handle('dialog:saveFile', async (_event, options) => {
    const result = await dialog.showSaveDialog({
      title: options?.title || 'Save File',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePath;
  });

  // File system: read file
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    const buffer = await fs.promises.readFile(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  });

  // File system: write file
  ipcMain.handle('fs:writeFile', async (_event, filePath: string, data: ArrayBuffer) => {
    const buffer = Buffer.from(data);
    await fs.promises.writeFile(filePath, buffer);
  });

  // Server URL: get
  ipcMain.handle('server-url:get', () => {
    return serverUrlStore.store.serverUrl || '';
  });

  // Server URL: changed notification
  ipcMain.on('server-url:changed', (_event, url: string) => {
    serverUrlStore.set('serverUrl', url);
    logger.info('[Server URL] Updated: %s', url);
  });

  // Global shortcut: get
  ipcMain.handle('shortcut:get', () => {
    return shortcutStore.store.accelerator || '';
  });

  // Global shortcut: set
  ipcMain.handle('shortcut:set', (_event, accelerator: string) => {
    const success = registerGlobalShortcut(windowManager, accelerator);
    if (success) {
      shortcutStore.set('accelerator', accelerator);
      logger.info('[Shortcut] Registered: %s', accelerator);
    } else {
      logger.warn('[Shortcut] Failed to register: %s', accelerator);
    }
    return { success, error: success ? undefined : '快捷键注册失败，可能已被其他应用占用' };
  });

  // Global shortcut: clear
  ipcMain.handle('shortcut:clear', () => {
    globalShortcut.unregisterAll();
    shortcutStore.set('accelerator', '');
    logger.info('[Shortcut] Cleared');
  });
}

app.whenReady().then(initializeApp);
