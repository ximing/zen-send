// Detect if running in Electron
export const isElectron =
  typeof window !== 'undefined' &&
  !!(window as unknown as { zenBridge?: { isElectron?: boolean } }).zenBridge?.isElectron;

// Detect development/production mode
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// API base URL
export const getApiBaseUrl = () => {
  if (isElectron) {
    // In Electron mode, get configured server address from bridge
    return (
      (
        window as unknown as { zenBridge?: { getServerUrl?: () => string } }
      ).zenBridge?.getServerUrl?.() || ''
    );
  }
  // Browser mode uses current origin
  return window.location.origin;
};

// Socket.io URL
export const getSocketUrl = () => {
  const base = getApiBaseUrl();
  return base.replace(/^http/, 'ws');
};
