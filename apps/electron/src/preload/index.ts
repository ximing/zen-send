import { ipcRenderer, contextBridge, IpcRendererEvent, app } from 'electron';

// File drop callback type
type FileDropCallback = (filePaths: string[]) => void;

// Store wrapped callbacks to allow proper removal
const fileDropCallbackMap = new Map<
  FileDropCallback,
  (event: IpcRendererEvent, filePaths: string[]) => void
>();

// Log platform info for debugging
console.log('Zen Send preload script loaded, platform:', process.platform);
// Also send to main process via IPC for better visibility
ipcRenderer.invoke('log-preload', { platform: process.platform });

// --------- Expose zenBridge API to Renderer process ---------
contextBridge.exposeInMainWorld('zenBridge', {
  // Platform info
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
});

// --------- Type definitions for Renderer process ---------
declare global {
  interface Window {
    zenBridge: {
      platform: string;
      getVersion: () => string;
      onFileDrop: (callback: (filePaths: string[]) => void) => void;
      removeFileDropListener: (callback: (filePaths: string[]) => void) => void;
    };
  }
}

export type ZenBridge = Window['zenBridge'];
