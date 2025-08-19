import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

// Environment configuration for Electron
const isProduction = process.env.NODE_ENV === 'production';

// Development server URL (web app runs on port 5274)
const VITE_DEV_SERVER_URL = isProduction ? 'https://zs.aimo.plus' : 'http://localhost:5274';

// Default server URL for first launch
const VITE_DEFAULT_SERVER_URL = process.env.VITE_DEFAULT_SERVER_URL || VITE_DEV_SERVER_URL;

const define = {
  'process.env.VITE_DEV_SERVER_URL': JSON.stringify(VITE_DEV_SERVER_URL),
  'process.env.VITE_IS_ELECTRON': JSON.stringify(true),
  'process.env.VITE_IS_PRODUCTION': JSON.stringify(isProduction),
  'process.env.VITE_DEFAULT_SERVER_URL': JSON.stringify(VITE_DEFAULT_SERVER_URL),
};

export default defineConfig({
  define,
  plugins: [
    electron({
      main: {
        entry: 'src/main/index.ts',
        onstart({ startup }) {
          process.env.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
          startup();
        },
        vite: {
          define,
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs',
              },
            },
          },
        },
      },
    }),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  appType: 'custom',
});
