import Constants from 'expo-constants';

// API base URL - configurable via app.json extra or defaults to localhost
export const getApiBaseUrl = (): string => {
  // In Expo, you can configure via app.json (e.g., extra.apiUrl)
  // For development, defaults to localhost
  const configuredUrl = Constants.expoConfig?.extra?.apiUrl;
  if (configuredUrl) {
    return configuredUrl;
  }
  // Fallback for development
  return 'http://localhost:3110';
};

// Socket URL derived from API base
export const getSocketUrl = (): string => {
  const base = getApiBaseUrl();
  return base.replace(/^http(s)?/, 'ws$1');
};
