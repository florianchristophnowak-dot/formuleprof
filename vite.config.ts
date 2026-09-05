import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// FormuleProf ist eine reine Offline-App: keine externen Requests, relative Basis,
// damit die App auch aus einem Unterordner heraus ausgeliefert werden kann.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
