/**
 * El inmueble a medio cargar, guardado en el navegador.
 *
 * W4 de la auditoría del 13-09: el asistente de publicación son seis pantallas
 * —propietario, datos, comisión, agente, acta/fotos y confirmación— y hasta
 * acá vivía entero en `useState`. Cerrar la pestaña, un F5, que se caiga la
 * red o que el teléfono se quede sin batería en la mitad borraba todo, y quien
 * volvía a empezar terminaba —si el fallo había sido después de crear el
 * inmueble— con DOS inmuebles cargados.
 *
 * ## Dónde vive el borrador, y por qué acá y no en el servidor
 *
 * **En el navegador (IndexedDB), no en el back.** Tres razones, en orden de
 * peso:
 *
 * 1. **Guardarlo en el servidor obliga a crear algo en el servidor**, y crear
 *    de más es exactamente el daño que W4 describe (el `Property` duplicado).
 *    Mientras el asistente está abierto NO existe ningún inmueble: el `POST
 *    /properties` es el último paso. Un borrador local no puede duplicar nada
 *    porque no toca la base.
 * 2. **Las fotos.** Se eligen como `File` y no se suben hasta que el inmueble
 *    existe (`WizardFormData.photos`). Mandarlas al back para «guardar el
 *    borrador» sería subirlas a un inmueble que todavía no está — otra vez
 *    crear de más. IndexedDB guarda el `File` tal cual, sin base64 y sin el
 *    techo de ~5 MB de `localStorage` (una sola foto de teléfono lo revienta).
 * 3. **Sin señal también tiene que servir.** La misma razón por la que el
 *    inventario se guarda local (`lib/inventario/borrador-de-inventario.ts`):
 *    el asistente se llena parado en el apartamento, y ahí la red va y viene.
 *
 * Lo que se paga por esa decisión, dicho de frente: el borrador **no se retoma
 * desde otro equipo ni desde otro navegador**. Es el mismo trato que ya toma
 * la casa para el inventario y para el borrador del cotizador, y no hace falta
 * ninguna migración de base para sostenerlo.
 *
 * ## Por qué una base propia y no la de `lib/inventario/base-local.ts`
 *
 * Porque dos módulos que abren la MISMA base de IndexedDB con versiones
 * distintas se bloquean entre sí (`onblocked`) y la pantalla queda esperando
 * para siempre — está escrito ahí mismo. Agregar un depósito allá obliga a
 * subirle la versión a un flujo que no es este. Una base aparte no tiene ese
 * problema: el patrón es el mismo (almacén con interfaz, uno de IndexedDB y
 * uno en memoria para el servidor y las pruebas), la base no.
 *
 * ## Qué NO guarda, a propósito
 *
 * El `id` de un inmueble creado. Apenas `POST /properties` devuelve, el
 * borrador se BORRA (ver `ConsignacionWizard.crearConsignacion`): desde ese
 * instante el inmueble existe en la base y retomar el borrador lo cargaría de
 * nuevo. Por eso un borrador viejo nunca puede revivir algo ya publicado: si
 * llegó a existir, el borrador ya no está.
 */

import type { WizardFormData } from '@/components/inmobiliaria/ConsignacionWizardSteps';

/** El formulario sin las fotos: las fotos van en su propio campo. */
export type DatosDelBorrador = Omit<Partial<WizardFormData>, 'photos'>;

export interface BorradorDePublicacion {
  /** Quién lo dejó: `<agencia>:<usuario>`. Ver `llaveDelBorrador`. */
  llave: string;
  datos: DatosDelBorrador;
  /** Las fotos elegidas, todavía sin subir. */
  fotos: File[];
  /** En qué paso quedó (1..6), para volver ahí y no al principio. */
  paso: number;
  /**
   * El navegador no pudo clonar los `File` (Safari viejo, incógnito estricto).
   * Se guarda el resto igual y se avisa: es mejor recuperar cinco pantallas de
   * texto y volver a elegir las fotos que perder todo.
   */
  fotosNoGuardadas?: boolean;
  actualizadoEn: number;
  /** Formato del borrador. Uno de otra versión se descarta sin preguntar. */
  version: number;
}

/**
 * La forma del borrador cambia cuando cambian los pasos del asistente. Un
 * borrador viejo con campos que ya no existen se descarta en vez de intentar
 * adivinar: subir este número es la manera de hacerlo.
 */
export const VERSION_DEL_FORMATO = 1;

/**
 * Cuánto vive un borrador. Un mes es de sobra para «lo sigo mañana» y corta
 * los fantasmas: un borrador de hace medio año casi seguro habla de un
 * inmueble que ya se cargó por otro lado, y ofrecerlo confunde.
 */
export const DIAS_DE_VIDA = 30;

const UN_DIA_MS = 24 * 60 * 60 * 1000;

export const BASE = 'leasefy-publicacion';
export const DEPOSITO = 'borradores';
const VERSION_DE_LA_BASE = 1;

/**
 * La llave. Va por AGENCIA y por USUARIO: en un computador compartido (el del
 * mostrador) dos personas distintas no pueden verse el borrador, y quien
 * trabaja para dos agencias no mezcla sus inmuebles.
 */
export function llaveDelBorrador(agencyId?: string | null, userId?: string | null): string {
  return `${agencyId ?? 'sin-agencia'}:${userId ?? 'sin-usuario'}`;
}

export interface AlmacenDeBorradores {
  leer(llave: string): Promise<BorradorDePublicacion | null>;
  guardar(borrador: BorradorDePublicacion): Promise<void>;
  borrar(llave: string): Promise<void>;
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BASE, VERSION_DE_LA_BASE);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(DEPOSITO)) {
        db.createObjectStore(DEPOSITO, { keyPath: 'llave' });
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

async function conDeposito<T>(
  modo: IDBTransactionMode,
  fn: (d: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await abrir();
  try {
    return await esperar(fn(db.transaction(DEPOSITO, modo).objectStore(DEPOSITO)));
  } finally {
    db.close();
  }
}

/** ¿Este navegador tiene IndexedDB? El servidor y el incógnito estricto, no. */
export function hayIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function almacenIndexedDb(): AlmacenDeBorradores {
  return {
    async leer(llave) {
      const fila = await conDeposito<BorradorDePublicacion | undefined>('readonly', (d) =>
        d.get(llave) as IDBRequest<BorradorDePublicacion | undefined>,
      );
      return fila ?? null;
    },
    async guardar(borrador) {
      try {
        await conDeposito('readwrite', (d) => d.put(borrador));
      } catch (error) {
        // Lo más probable que falle acá es clonar los `File`. Se reintenta sin
        // ellos: cinco pantallas de texto recuperadas valen más que nada.
        if (borrador.fotos.length === 0) throw error;
        await conDeposito('readwrite', (d) =>
          d.put({ ...borrador, fotos: [], fotosNoGuardadas: true }),
        );
      }
    },
    async borrar(llave) {
      await conDeposito('readwrite', (d) => d.delete(llave));
    },
  };
}

/** En memoria: el servidor (donde no hay IndexedDB) y las pruebas. */
export function almacenEnMemoria(
  inicial: BorradorDePublicacion[] = [],
): AlmacenDeBorradores {
  const filas = new Map<string, BorradorDePublicacion>(inicial.map((b) => [b.llave, b]));
  return {
    leer: (llave) => Promise.resolve(filas.get(llave) ?? null),
    guardar: (b) => {
      filas.set(b.llave, b);
      return Promise.resolve();
    },
    borrar: (llave) => {
      filas.delete(llave);
      return Promise.resolve();
    },
  };
}

let almacen: AlmacenDeBorradores | null = null;

/**
 * El almacén que corresponde al entorno. Un navegador que niega IndexedDB no
 * puede tumbar el asistente: cae al de memoria, que pierde el borrador al
 * recargar pero deja trabajar exactamente como antes de este cambio.
 */
export function almacenDePublicacion(): AlmacenDeBorradores {
  if (almacen) return almacen;
  almacen = hayIndexedDb() ? almacenIndexedDb() : almacenEnMemoria();
  return almacen;
}

/** Sólo para las pruebas: cambia el almacén que se devuelve. */
export function usarAlmacen(otro: AlmacenDeBorradores | null): void {
  almacen = otro;
}

/**
 * ¿Vale la pena guardarlo? El asistente arranca con valores por defecto
 * (tipo, comisión, término, fechas de hoy) y esos no son trabajo de nadie.
 * Guardar eso llenaría la pantalla de «tienes un borrador» a quien apenas
 * entró y se fue, que es la forma más rápida de que dejen de leer el aviso.
 */
export function hayAlgoQueGuardar(datos: DatosDelBorrador, fotos: File[]): boolean {
  if (fotos.length > 0) return true;
  if ((datos.inventoryItems ?? []).length > 0) return true;
  if ((datos.inventoryNotes ?? '').trim() !== '') return true;
  return Boolean(
    datos.propietarioId ||
      datos.newPropietarioData ||
      (datos.propertyTitle ?? '').trim() ||
      (datos.propertyAddress ?? '').trim() ||
      (datos.propertyDescription ?? '').trim() ||
      datos.monthlyRent ||
      datos.salePrice ||
      datos.agenteId,
  );
}

/** Un borrador de otro formato o de hace más de un mes no se ofrece. */
export function estaVencido(borrador: BorradorDePublicacion, ahora = Date.now()): boolean {
  if (borrador.version !== VERSION_DEL_FORMATO) return true;
  return ahora - borrador.actualizadoEn > DIAS_DE_VIDA * UN_DIA_MS;
}

/**
 * La misma foto elegida dos veces es una sola. Sin esto, guardar el borrador
 * en dos tandas —o retomarlo y volver a elegir la misma carpeta— dejaría la
 * misma imagen repetida en el inmueble publicado. Un `File` se reconoce por
 * nombre + tamaño + fecha; no hay id.
 */
export function sinRepetidas(fotos: File[]): File[] {
  const vistas = new Set<string>();
  const unicas: File[] = [];
  for (const foto of fotos) {
    const seña = `${foto.name}|${foto.size}|${foto.lastModified}`;
    if (vistas.has(seña)) continue;
    vistas.add(seña);
    unicas.push(foto);
  }
  return unicas;
}

/**
 * Un borrador que apunta a un propietario que ya no existe.
 *
 * Alguien puede borrar el propietario mientras el borrador duerme. Retomarlo
 * tal cual mandaría un `propietarioId` muerto al back y el asistente moriría
 * en el último paso con un 400 que no explica nada. Se limpia el dueño (y los
 * copropietarios, que son de la misma lista) y se vuelve al paso 1 a elegirlo.
 *
 * `propietarios` vacío NO se interpreta como «no existe»: mientras la lista
 * carga está vacía, y borrar el dueño ahí sería el peor error posible.
 */
export function conPropietariosVivos(
  datos: DatosDelBorrador,
  propietarios: { id: string }[],
): { datos: DatosDelBorrador; sePerdioElPropietario: boolean } {
  if (propietarios.length === 0) return { datos, sePerdioElPropietario: false };
  // Un propietario a medio crear (id `new-…`) todavía no está en la lista y no
  // tiene por qué estar: no se lo toca.
  const esTemporal = (id: string) => id.startsWith('new-');
  const vive = (id: string) => esTemporal(id) || propietarios.some((p) => p.id === id);

  const principal = datos.propietarioId;
  if (!principal || vive(principal)) {
    const copro = datos.copropietarios;
    if (!copro || copro.every((c) => vive(c.propietarioId))) {
      return { datos, sePerdioElPropietario: false };
    }
  }

  const {
    propietarioId: _p,
    copropietarios: _c,
    newPropietarioData: _n,
    duenoPendienteId: _d,
    ...resto
  } = datos;
  return { datos: resto, sePerdioElPropietario: true };
}
