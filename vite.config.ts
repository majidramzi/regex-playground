import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/regex-playground/',
  server: {
    host: '0.0.0.0',
    // The hosted preview uses a dynamic *.e2b.app origin; keep the allowlist narrow.
    allowedHosts: ['.e2b.app'],
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    clearMocks: true,
  },
});
