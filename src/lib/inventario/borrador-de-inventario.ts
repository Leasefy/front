/**
 * El inventario a medio llenar, guardado en el teléfono.
 *
 * 🔴 Nico, 2026-09-12: «la parte de agregar inventario debería de funcionar
 * offline porque hay muchos apartamentos donde no hay señal. Entonces la
 * persona que está haciendo todo ese tema del inventario debería poder
 * agregar todo sin señal y que ya después, cuando tenga señal, la cargue y se
 * actualice en el contrato y también en el inmueble».
 *
 * Hasta acá cada ítem se mandaba al back apenas se guardaba: en un
 * apartamento sin cobertura eso es un spinner que no vuelve y una hora de
 * trabajo perdida. Ahora cada cambio cae PRIMERO acá —en el navegador—, y el
 * back es el segundo paso.
 *
 * **Por qué IndexedDB y no `localStorage`**: las fotos. `localStorage` sólo
 * guarda texto y tiene ~5 MB; una sola foto de un teléfono pesa más que eso
 * convertida a base64. IndexedDB guarda el `Blob` tal cual y no tiene ese
 * techo.
 *
 * El borrador se llavea por CONSIGNACIÓN (el inmueble): quien recorre un
 * edificio entra a varios apartamentos seguidos y los inventarios no se
 * pueden mezclar. `contratoId` va al lado sólo para decir desde dónde se
 * abrió; no cambia dónde se guarda.
 */

import type { InventoryItem } from '@/lib/types/inmobiliaria';

export interface BorradorDeInventario {
  /** El inmueble (la consignación). Es la llave: un borrador por inmueble. */
  consignacionId: string;
  /** Desde qué contrato se abrió, si se abrió desde uno. Sólo informativo. */
  contratoId?: string;
  /** La lista completa, tal como se va a mandar. */
  items: InventoryItem[];
  /**
   * Las fotos que todavía no tienen URL, por id de ítem. Una foto sale de acá
   * SÓLO cuando el back devolvió su URL: mientras esté acá, falta subirla.
   */
  fotos: Record<string, Blob>;
  /** Cuándo se tocó por última vez, para poder decir «de las 3:12 p. m.». */
  actualizadoEn: number;
}

/**
 * Dónde se guarda el borrador. Hay dos implementaciones: IndexedDB en el
 * navegador y una en memoria para las pruebas y para el servidor (donde no
 * hay IndexedDB y un `import` que lo asuma rompe el render).
 */
export interface AlmacenDeBorradores {
  leer(consignacionId: string): Promise<BorradorDeInventario | null>;
  guardar(borrador: BorradorDeInventario): Promise<void>;
  borrar(consignacionId: string): Promise<void>;
  listar(): Promise<BorradorDeInventario[]>;
}

export const BASE = 'leasefy-inventario';
export const DEPOSITO = 'borradores';
const VERSION = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BASE, VERSION);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(DEPOSITO)) {
        db.createObjectStore(DEPOSITO, { keyPath: 'consignacionId' });
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

/** El almacén real del navegador. */
export function almacenIndexedDb(): AlmacenDeBorradores {
  const con = async <T>(
    modo: IDBTransactionMode,
    fn: (deposito: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => {
    const db = await abrir();
    try {
      return await esperar(fn(db.transaction(DEPOSITO, modo).objectStore(DEPOSITO)));
    } finally {
      db.close();
    }
  };

  return {
    async leer(consignacionId) {
      const fila = await con<BorradorDeInventario | undefined>('readonly', (d) =>
        d.get(consignacionId) as IDBRequest<BorradorDeInventario | undefined>,
      );
      return fila ?? null;
    },
    async guardar(borrador) {
      await con('readwrite', (d) => d.put(borrador));
    },
    async borrar(consignacionId) {
      await con('readwrite', (d) => d.delete(consignacionId));
    },
    async listar() {
      const filas = await con<BorradorDeInventario[]>('readonly', (d) =>
        d.getAll() as IDBRequest<BorradorDeInventario[]>,
      );
      return filas ?? [];
    },
  };
}

/**
 * Un almacén en memoria. Lo usan las pruebas y el servidor: sin esto, montar
 * la pantalla en el server —donde `indexedDB` no existe— reventaría.
 */
export function almacenEnMemoria(
  inicial: BorradorDeInventario[] = [],
): AlmacenDeBorradores {
  const filas = new Map<string, BorradorDeInventario>(
    inicial.map((b) => [b.consignacionId, b]),
  );
  return {
    leer: (id) => Promise.resolve(filas.get(id) ?? null),
    guardar: (b) => {
      filas.set(b.consignacionId, b);
      return Promise.resolve();
    },
    borrar: (id) => {
      filas.delete(id);
      return Promise.resolve();
    },
    listar: () => Promise.resolve([...filas.values()]),
  };
}

let almacen: AlmacenDeBorradores | null = null;

/**
 * El almacén que corresponde al entorno. Un navegador viejo o una ventana de
 * incógnito que niega IndexedDB no puede tumbar la pantalla: cae al de
 * memoria, que pierde el borrador al recargar pero deja trabajar.
 */
export function almacenDeBorradores(): AlmacenDeBorradores {
  if (almacen) return almacen;
  const hayIdb = typeof indexedDB !== 'undefined';
  almacen = hayIdb ? almacenIndexedDb() : almacenEnMemoria();
  return almacen;
}

/** Sólo para las pruebas: cambia el almacén que devuelve `almacenDeBorradores`. */
export function usarAlmacen(otro: AlmacenDeBorradores | null): void {
  almacen = otro;
}

/**
 * ¿Hay algo pendiente de subir? Un borrador cuyos ítems son EXACTAMENTE los
 * que ya están en el back y sin fotos nuevas no es un pendiente: es basura de
 * una subida anterior, y ofrecerlo asusta sin motivo.
 */
export function tienePendientes(
  borrador: BorradorDeInventario,
  enElBack: InventoryItem[] | undefined,
): boolean {
  if (Object.keys(borrador.fotos).length > 0) return true;
  return JSON.stringify(borrador.items) !== JSON.stringify(enElBack ?? []);
}
