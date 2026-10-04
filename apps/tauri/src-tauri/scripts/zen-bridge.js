(() => {
  const state = {
    serverUrl: __ZEN_SERVER_URL__,
    version: __ZEN_VERSION__,
    platform: __ZEN_PLATFORM__,
  };

  const fileDropListeners = new Set();

  function invoke(cmd, args) {
    const tauri = window.__TAURI__;
    if (!tauri || !tauri.core || typeof tauri.core.invoke !== 'function') {
      return Promise.reject(new Error('desktop bridge unavailable'));
    }
    return tauri.core.invoke(cmd, args || {});
  }

  window.__zenEmitFileDrop = (paths) => {
    for (const callback of fileDropListeners) {
      try {
        callback(paths);
      } catch (error) {
        console.error(error);
      }
    }
  };

  // 远端页面仍通过 zenBridge.isElectron 识别桌面壳。名字保持不变，已上线的网页不用改。
  window.zenBridge = {
    isElectron: true,
    isDesktop: true,
    platform: state.platform,
    getVersion: () => state.version,
    getServerUrl: () => state.serverUrl || '',
    setServerUrl: (url) => {
      state.serverUrl = url || '';
      void invoke('set_server_url', { url: state.serverUrl });
    },
    getGlobalShortcut: () => invoke('get_global_shortcut'),
    setGlobalShortcut: (accelerator) => invoke('set_global_shortcut', { accelerator }),
    clearGlobalShortcut: () => invoke('clear_global_shortcut'),
    openFileDialog: (options) => invoke('open_file_dialog', { options: options || null }),
    saveFileDialog: (options) => invoke('save_file_dialog', { options: options || null }),
    readFile: async (path) => {
      const bytes = await invoke('read_file', { path });
      return new Uint8Array(bytes).buffer;
    },
    writeFile: (path, data) =>
      invoke('write_file', { path, data: Array.from(new Uint8Array(data)) }),
    onFileDrop: (callback) => {
      fileDropListeners.add(callback);
    },
    removeFileDropListener: (callback) => {
      fileDropListeners.delete(callback);
    },
  };
})();
