import { defineConfig } from 'vitest/config';
import path from 'path';
import fs from 'fs';

/*
 * Los íconos: la misma familia de Leasefy que ve la plataforma (ver aliasDeIconos en
 * next.config.mjs). `@phosphor-icons/react` → el puente de Cadence; el Phosphor de verdad
 * queda como `@phosphor-icons/react-original`. Si la Cadence instalada no trae el puente,
 * las pruebas siguen con Phosphor.
 */
const puenteDeIconos = path.resolve(__dirname, './node_modules/@leasefy/cadence/dist/phosphor.js');
const phosphorDeVerdad = path.resolve(__dirname, './node_modules/@phosphor-icons/react/dist/index.es.js');
const aliasDeIconos = fs.existsSync(puenteDeIconos) && fs.existsSync(phosphorDeVerdad)
  ? [
      { find: /^@phosphor-icons\/react$/, replacement: puenteDeIconos },
      { find: /^@phosphor-icons\/react-original$/, replacement: phosphorDeVerdad },
    ]
  : [];

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    /*
     * Le devuelve al entorno un `localStorage` usable. Node 25 expone uno
     * NATIVO roto (sin `--localstorage-file` devuelve un objeto pelado) y
     * vitest no lo pisa con el de happy-dom, porque `localStorage` no está en
     * su lista interna de claves que sobrescriben. Sin esto, ~195 tests de
     * auth/contexts/landing mueren con «localStorage.clear is not a function»
     * sin que nadie haya tocado una línea de producto. El archivo se
     * auto-desactiva el día que deje de hacer falta — ver su encabezado.
     */
    setupFiles: ['./vitest.setup.ts'],
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
        // El PUENTE de íconos de Cadence (y sólo él) pasa por Vite: importa
        // `@phosphor-icons/react-original`, que sólo existe como alias (ver arriba).
        // El resto de Cadence sigue afuera, como siempre: si entrara, los `vi.mock`
        // parciales de framer-motion o de Phosphor de cada prueba lo alcanzarían.
        inline: [/[\\/]cadence[\\/]node_modules[\\/]/, /[\\/]@leasefy[\\/]cadence[\\/]dist[\\/]phosphor\.js$/],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
    },
  },
  resolve: {
    alias: [
      ...aliasDeIconos,
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // Pin React to the front's copy even for CJS deps under
      // cadence/node_modules (e.g. react-remove-scroll) that `dedupe` misses.
      { find: 'react', replacement: path.resolve(__dirname, './node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, './node_modules/react-dom') },
      // 'server-only' is a build-time-only guard (Next aliases it via webpack:
      // no-op on the server, throw on the client). Vitest's node resolver can't
      // see that alias, so point it at Next's bundled empty (server) module so
      // server-only modules load in tests.
      {
        find: 'server-only',
        replacement: path.resolve(__dirname, './node_modules/next/dist/compiled/server-only/empty.js'),
      },
    ],
    // `@leasefy/cadence` is a file:../cadence dep — without dedupe, Radix
    // modules under cadence/node_modules load their own React copy and every
    // hook call inside them crashes ("Invalid hook call") in vitest.
    dedupe: ['react', 'react-dom'],
  },
});
