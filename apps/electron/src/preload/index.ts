import { ipcRenderer, contextBridge, IpcRendererEvent, app } from 'electron';
import Store from 'electron-store';

// File drop callback type
type FileDropCallback = (filePaths: string[]) => void;

// Store wrapped callbacks to allow proper removal
const fileDropCallbackMap = new Map<
  FileDropCallback,
  (event: IpcRendererEvent, filePaths: string[]) => void
>();

// Server URL store (shared with main process via IPC)
const serverUrlStore = new Store<{ serverUrl: string }>({
  name: 'server-url',
  defaults: { serverUrl: '' },
});

// Log platform info for debugging
console.log('Zen Send preload script loaded, platform:', process.platform);
// Also send to main process via IPC for better visibility
ipcRenderer.invoke('log-preload', { platform: process.platform });

// --------- Expose zenBridge API to Renderer process ---------
contextBridge.exposeInMainWorld('zenBridge', {
  // Platform info
  isElectron: true,
  platform: process.platform,

  // App version
  getVersion: () => app.getVersion(),

  // File drag and drop
  onFileDrop: (callback: FileDropCallback) => {
    const wrappedCallback = (_event: IpcRendererEvent, filePaths: string[]) => {
      callback(filePaths);
    };
    fileDropCallbackMap.set(callback, wrappedCallback);
    ipcRenderer.on('files-dropped', wrappedCallback);
  },

  removeFileDropListener: (callback: FileDropCallback) => {
    const wrappedCallback = fileDropCallbackMap.get(callback);
    if (wrappedCallback) {
      ipcRenderer.removeListener('files-dropped', wrappedCallback);
      fileDropCallbackMap.delete(callback);
    }
  },

  // Dialog: open file
  openFileDialog: (options?: {
    title?: string;
    filters?: { name: string; extensions: string[] }[];
    multiSelections?: boolean;
  }) => {
    return ipcRenderer.invoke('dialog:openFile', options);
  },

  // Dialog: save file
  saveFileDialog: (options?: {
    title?: string;
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => {
    return ipcRenderer.invoke('dialog:saveFile', options);
  },

  // File system: read file
  readFile: (filePath: string) => {
    return ipcRenderer.invoke('fs:readFile', filePath);
  },

  // File system: write file
  writeFile: (filePath: string, data: ArrayBuffer) => {
    return ipcRenderer.invoke('fs:writeFile', filePath, data);
  },

  // Server URL management
  getServerUrl: () => {
    return serverUrlStore.store.serverUrl || '';
  },

  setServerUrl: (url: string) => {
    serverUrlStore.set('serverUrl', url);
    ipcRenderer.invoke('server-url:changed', url);
  },
});

// --------- Type definitions for Renderer process ---------
declare global {
  interface Window {
    zenBridge: {
      isElectron: boolean;
      platform: string;
      getVersion: () => string;
      onFileDrop: (callback: (filePaths: string[]) => void) => void;
      removeFileDropListener: (callback: (filePaths: string[]) => void) => void;
      openFileDialog: (options?: {
        title?: string;
        filters?: { name: string; extensions: string[] }[];
        multiSelections?: boolean;
      }) => Promise<string[] | null>;
      saveFileDialog: (options?: {
        title?: string;
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<string | null>;
      readFile: (path: string) => Promise<ArrayBuffer>;
      writeFile: (path: string, data: ArrayBuffer) => Promise<void>;
      getServerUrl: () => string;
      setServerUrl: (url: string) => void;
    };
  }
}

export type ZenBridge = Window['zenBridge'];
