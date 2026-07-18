import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 'server-only' is a build-time-only guard (Next aliases it via webpack:
      // no-op on the server, throw on the client). Vitest's node resolver can't
      // see that alias, so point it at Next's bundled empty (server) module so
      // server-only modules load in tests.
      'server-only': path.resolve(
        __dirname,
        './node_modules/next/dist/compiled/server-only/empty.js'
      ),
    },
  },
});
