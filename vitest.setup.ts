/**
 * Setup de tests: devolverle al entorno un `localStorage` que funcione.
 *
 * ── El bug ──────────────────────────────────────────────────────────────────
 *
 * Node 25 trae `localStorage` y `sessionStorage` NATIVOS (Web Storage, todavía
 * experimental). Cuando no se arranca con un `--localstorage-file` válido —que
 * es siempre, acá— el getter nativo avisa por stderr y devuelve un objeto plano
 * vacío: sin `getItem`, sin `setItem`, sin `clear`.
 *
 * Eso solo no rompería nada, porque el entorno de tests es happy-dom y su
 * `Window` sí tiene un `Storage` de verdad. El problema es cómo vitest arma el
 * global (`getWindowKeys`, vitest 4): una propiedad del window sólo pisa a la
 * que ya existe en `globalThis` si está en su lista interna `KEYS`, y
 * `localStorage` NO está en esa lista. Antes de Node 25 el global no existía y
 * el de happy-dom entraba sin pelear; desde Node 25 existe, vitest lo respeta,
 * y el stub roto de Node se queda.
 *
 * Resultado: ~195 tests en rojo con `localStorage.clear is not a function`, sin
 * que nadie hubiera tocado una línea de producto.
 *
 * ── El arreglo ──────────────────────────────────────────────────────────────
 *
 * Se instala la MISMA clase que usa el `Window` de happy-dom —`Storage`, su
 * export público, verificado idéntico al de `window.localStorage`, incluido el
 * acceso por propiedad (`storage.clave`)—. No es un polyfill escrito a mano: es
 * la implementación real del entorno, puesta donde vitest no la puso.
 *
 * Corre una vez por archivo de test, así que cada archivo arranca con su propio
 * almacenamiento vacío — el mismo aislamiento que daría el navegador.
 *
 * ── Cuándo se puede borrar este archivo ─────────────────────────────────────
 *
 * El día que vitest agregue `localStorage` a su lista de claves que pisan, o
 * que Node deje de exponer un stub roto, el guard de abajo ve un storage sano y
 * no toca nada: el archivo se vuelve inerte solo, no hay que acordarse de
 * sacarlo. Para verificarlo: borrar este archivo y su línea en
 * `vitest.config.ts`, y correr `npx vitest run src/lib/auth/session-terminal.test.ts`.
 */

import { Storage } from 'happy-dom';

/**
 * ¿El global ya tiene un storage usable?
 *
 * Se mira el DESCRIPTOR, no el valor: leer la propiedad dispara el getter
 * nativo de Node y con él su warning por stderr en cada archivo de test.
 */
function yaSirve(nombre: 'localStorage' | 'sessionStorage'): boolean {
  const d = Object.getOwnPropertyDescriptor(globalThis, nombre);
  if (!d || !('value' in d)) return false;
  const valor = d.value as { getItem?: unknown; clear?: unknown } | null;
  return typeof valor?.getItem === 'function' && typeof valor?.clear === 'function';
}

for (const nombre of ['localStorage', 'sessionStorage'] as const) {
  if (yaSirve(nombre)) continue;
  Object.defineProperty(globalThis, nombre, {
    value: new Storage(),
    // `configurable: true` a propósito: el teardown del entorno de vitest
    // borra las claves que instaló, y algún test podría querer espiar el
    // storage con `vi.spyOn`. Una propiedad no configurable rompería las dos.
    configurable: true,
    writable: true,
    enumerable: true,
  });
}
