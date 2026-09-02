import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    // `scripts/` entra al include porque el codegen del back tiene lógica
    // propia (desambiguar `operationId` colisionados) y esa lógica decide qué
    // tipos ve el front. Sin test corriendo en el CI, se rompe en silencio.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    server: {
      deps: {
        // `@leasefy/cadence` is a file:../cadence dep. Its transitive deps
        // (Radix) live under cadence/node_modules and are externalized by
        // default, so Node loads them with cadence's OWN React copy and every
        // hook inside them crashes ("Invalid hook call"). Inlining routes
        // them through Vite, where `resolve.dedupe` pins a single React.
        inline: [/[\\/]cadence[\\/]node_modules[\\/]/],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Pin React to the front's copy even for CJS deps under
      // cadence/node_modules (e.g. react-remove-scroll) that `dedupe` misses.
      react: path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      // 'server-only' is a build-time-only guard (Next aliases it via webpack:
      // no-op on the server, throw on the client). Vitest's node resolver can't
      // see that alias, so point it at Next's bundled empty (server) module so
      // server-only modules load in tests.
      'server-only': path.resolve(
        __dirname,
        './node_modules/next/dist/compiled/server-only/empty.js'
      ),
    },
    // `@leasefy/cadence` is a file:../cadence dep — without dedupe, Radix
    // modules under cadence/node_modules load their own React copy and every
    // hook call inside them crashes ("Invalid hook call") in vitest.
    dedupe: ['react', 'react-dom'],
  },
});
