/**
 * La base del navegador donde vive todo lo del inventario sin señal.
 *
 * Hay DOS depósitos y un solo `indexedDB.open`, a propósito: dos módulos que
 * abren la misma base con versiones distintas se bloquean entre sí
 * (`onblocked`) y la pantalla queda esperando para siempre. Acá se declara la
 * versión una vez y cada depósito se crea en el `onupgradeneeded`.
 *
 *  · `borradores`    → el inventario a medio llenar (ver `borrador-de-inventario.ts`).
 *  · `copias`        → la copia del inmueble para poder ABRIR la pantalla sin
 *                      señal (ver `copia-de-inmueble.ts`).
 */

export const BASE = 'leasefy-inventario';
export const DEPOSITO_BORRADORES = 'borradores';
export const DEPOSITO_COPIAS = 'copias';

/**
 * v1 traía sólo `borradores`. v2 agrega `copias`: sin ella, entrar a la ficha
 * ya estando sin señal carga la pantalla vacía aunque el HTML sí llegue desde
 * el service worker.
 */
const VERSION = 2;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BASE, VERSION);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(DEPOSITO_BORRADORES)) {
        db.createObjectStore(DEPOSITO_BORRADORES, { keyPath: 'consignacionId' });
      }
      if (!db.objectStoreNames.contains(DEPOSITO_COPIAS)) {
        db.createObjectStore(DEPOSITO_COPIAS, { keyPath: 'consignacionId' });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error ?? new Error('IndexedDB no abrió'));
  });
}

function esperar<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error ?? new Error('IndexedDB falló'));
  });
}

/** Una operación sobre un depósito, con la base abierta y cerrada alrededor. */
export async function conDeposito<T>(
  deposito: string,
  modo: IDBTransactionMode,
  fn: (d: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await abrir();
  try {
    return await esperar(fn(db.transaction(deposito, modo).objectStore(deposito)));
  } finally {
    db.close();
  }
}

/** ¿Este navegador tiene IndexedDB? El servidor y el incógnito estricto, no. */
export function hayIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}
