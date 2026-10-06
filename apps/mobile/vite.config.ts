/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // EXPO_PUBLIC_* still works so an existing .env.local keeps running; new setups use VITE_*.
  envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    // `.web.ts(x)` first: shared modules keep their Expo/native version beside the web one,
    // the same convention Metro used (e.g. ocrEngine.web.ts, pwa.web.ts).
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.mjs', '.js', '.jsx', '.json'],
  },
  server: { port: 8081 },
  preview: { port: 8081 },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts?(x)'],
    // Tests the native SecureStore module (jest.mock of expo-secure-store); kept with the Expo code.
    exclude: ['src/lib/__tests__/sessionStorage.test.ts', 'node_modules/**'],
  },
});
