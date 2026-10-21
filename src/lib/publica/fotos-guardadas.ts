/**
 * Las fotos del publicador rápido guardadas en el navegador (IndexedDB), una
 * fila por foto. Así una pestaña que se cierra a mitad de publicar 200
 * inmuebles no se lleva las fotos: al volver están, y las que ya subieron
 * están marcadas para no subirlas dos veces.
 *
 * Base PROPIA (`leasefy-publica`), no la del asistente
 * (`lib/inmuebles/borrador-de-publicacion.ts`): dos módulos que abren la misma
 * base con versiones distintas se bloquean entre sí. Sin IndexedDB (incógnito
 * estricto, el servidor) cae a memoria: se pierde al recargar, pero publicar
 * funciona igual.
 */

export interface FotoGuardada {
  id: string;
  usuario: string;
  /** `clave` de la tarjeta. */
  inmueble: string;
  orden: number;
  archivo: File;
  miniatura: Blob | null;
  /** Ya está en el inmueble creado: no se vuelve a subir. */
  subida: boolean;
}

export interface AlmacenDeFotos {
  leerTodas(usuario: string): Promise<FotoGuardada[]>;
  guardar(fotos: FotoGuardada[]): Promise<void>;
  borrar(ids: string[]): Promise<void>;
  borrarTodas(usuario: string): Promise<void>;
}

const BASE = 'leasefy-publica';
const DEPOSITO = 'fotos';
const POR_USUARIO = 'por-usuario';
const VERSION = 1;

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BASE, VERSION);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(DEPOSITO)) {
        const d = db.createObjectStore(DEPOSITO, { keyPath: 'id' });
        d.createIndex(POR_USUARIO, 'usuario', { unique: false });
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error ?? new Error('IndexedDB no abrió'));
    pedido.onblocked = () => reject(new Error('IndexedDB bloqueada'));
  });
}

function terminar(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB falló'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB abortó'));
  });
}

export function almacenIndexedDb(): AlmacenDeFotos {
  return {
    async leerTodas(usuario) {
      const db = await abrir();
      try {
        return await new Promise<FotoGuardada[]>((resolve, reject) => {
          const p = db.transaction(DEPOSITO, 'readonly').objectStore(DEPOSITO).index(POR_USUARIO).getAll(usuario);
          p.onsuccess = () => resolve((p.result as FotoGuardada[]) ?? []);
          p.onerror = () => reject(p.error);
        });
      } finally {
        db.close();
      }
    },
    async guardar(fotos) {
      if (fotos.length === 0) return;
      const db = await abrir();
      try {
        const tx = db.transaction(DEPOSITO, 'readwrite');
        const d = tx.objectStore(DEPOSITO);
        for (const f of fotos) d.put(f);
        await terminar(tx);
      } finally {
        db.close();
      }
    },
    async borrar(ids) {
      if (ids.length === 0) return;
      const db = await abrir();
      try {
        const tx = db.transaction(DEPOSITO, 'readwrite');
        const d = tx.objectStore(DEPOSITO);
        for (const id of ids) d.delete(id);
        await terminar(tx);
      } finally {
        db.close();
      }
    },
    async borrarTodas(usuario) {
      const todas = await this.leerTodas(usuario);
      await this.borrar(todas.map((f) => f.id));
    },
  };
}

export function almacenEnMemoria(inicial: FotoGuardada[] = []): AlmacenDeFotos {
  const filas = new Map(inicial.map((f) => [f.id, f]));
  return {
    leerTodas: (usuario) => Promise.resolve([...filas.values()].filter((f) => f.usuario === usuario)),
    guardar: (fotos) => {
      for (const f of fotos) filas.set(f.id, f);
      return Promise.resolve();
    },
    borrar: (ids) => {
      for (const id of ids) filas.delete(id);
      return Promise.resolve();
    },
    borrarTodas: (usuario) => {
      for (const [id, f] of filas) if (f.usuario === usuario) filas.delete(id);
      return Promise.resolve();
    },
  };
}

let almacen: AlmacenDeFotos | null = null;

/**
 * El almacén del entorno. Un navegador que niega IndexedDB no tumba el
 * publicador: si la primera lectura falla, se sigue en memoria.
 */
export function almacenDeFotos(): AlmacenDeFotos {
  if (almacen) return almacen;
  if (typeof indexedDB === 'undefined') {
    almacen = almacenEnMemoria();
    return almacen;
  }
  const idb = almacenIndexedDb();
  const memoria = almacenEnMemoria();
  let roto = false;
  const conRespaldo =
    <A extends unknown[], R>(fn: (a: AlmacenDeFotos) => (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      if (!roto) {
        try {
          return await fn(idb)(...args);
        } catch {
          roto = true;
        }
      }
      return fn(memoria)(...args);
    };
  almacen = {
    leerTodas: conRespaldo((a) => a.leerTodas.bind(a)),
    guardar: conRespaldo((a) => a.guardar.bind(a)),
    borrar: conRespaldo((a) => a.borrar.bind(a)),
    borrarTodas: conRespaldo((a) => a.borrarTodas.bind(a)),
  };
  return almacen;
}

/** Agrupa por tarjeta, en el orden en que se eligieron. */
export function porInmueble(fotos: FotoGuardada[]): Record<string, FotoGuardada[]> {
  const grupos: Record<string, FotoGuardada[]> = {};
  for (const f of fotos) (grupos[f.inmueble] ??= []).push(f);
  for (const lista of Object.values(grupos)) lista.sort((a, b) => a.orden - b.orden);
  return grupos;
}
