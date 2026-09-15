/**
 * La copia del inmueble que queda en el teléfono para poder ABRIR la pantalla
 * sin señal.
 *
 * 🔴 Nico, 2026-09-12: «hay muchos apartamentos donde no hay señal; la persona
 * que hace el inventario debería poder agregar todo sin señal y, cuando tenga
 * señal, cargarlo».
 *
 * El borrador (`borrador-de-inventario.ts`) ya cubría «entré con señal y la
 * perdí adentro». Lo que faltaba era el otro caso, que es el de todos los
 * días: **llegar al apartamento y recién ahí abrir la ficha**. Un service
 * worker sirve el HTML, pero sin esto la pantalla se arma vacía — los datos
 * del inmueble los pide al back, y el back no está.
 *
 * Entonces la copia se guarda sola cada vez que la ficha abre CON señal, y a
 * propósito con el botón «Preparar para trabajar sin señal», que es el que se
 * toca en la oficina antes de salir.
 *
 * **Qué se guarda**: la consignación tal como la devolvió el back. Ya trae lo
 * que la pantalla necesita —título, dirección, inventario y el contrato
 * vigente con su inquilino— así que copiarla entera cuesta unos pocos KB y
 * evita inventar un segundo formato que se desincronice. Al lado van el
 * título y la dirección sueltos, que son lo que la lista «Disponibles sin
 * señal» muestra sin abrir nada.
 *
 * **Qué NO se guarda**: fotos del inmueble, propietario, agente, candidatos,
 * visitas ni comprobantes. Son otras llamadas, pesan, y ninguna hace falta
 * para llenar un inventario. Sin señal esas tarjetas salen vacías y eso es lo
 * honesto: no hay dato, no se inventa.
 */

import type { Consignacion } from '@/lib/types/inmobiliaria';
import { conDeposito, DEPOSITO_COPIAS, hayIndexedDb } from './base-local';
import { almacenDeBorradores } from './borrador-de-inventario';

/** El contrato vigente, lo mínimo para decir de quién es el inventario. */
export interface ContratoDeLaCopia {
  contratoId: string;
  inquilino: string;
}

export interface CopiaDeInmueble {
  /** La consignación. Es la llave: una copia por inmueble. */
  consignacionId: string;
  titulo: string;
  direccion: string;
  /** El contrato vigente si lo hay; `null` en un inmueble disponible. */
  contrato: ContratoDeLaCopia | null;
  /** La consignación entera, tal como la devolvió el back. */
  consignacion: Consignacion;
  /** Cuándo se bajó, para poder decir «guardado el 12 de septiembre». */
  guardadoEn: number;
  /**
   * Desde qué PANTALLAS se puede abrir este inmueble sin señal: la ficha del
   * inmueble, la del contrato, o las dos.
   *
   * 🔴 Nico, 2026-09-13: el inventario también se carga desde el contrato, así
   * que «preparar» desde ahí guarda ESA página. La copia de datos es una sola
   * —el inventario es del inmueble— pero el service worker guarda páginas, y
   * una que no se guardó no se abre. Por eso la lista «Disponibles sin señal»
   * lee esto para decir desde dónde, en vez de mandar a todos a la ficha del
   * inmueble y que la persona se entere en el apartamento.
   *
   * Se anota SÓLO cuando el worker confirmó que guardó la página. Dice de
   * menos —el worker también guarda al pasar por una pantalla— y nunca de más:
   * una promesa de más es la que deja a alguien sin poder trabajar.
   *
   * Opcional: las copias guardadas antes de esto no lo tienen.
   */
  rutas?: string[];
}

/** La ficha del inmueble. La ruta de siempre. */
export function rutaDeLaFichaDelInmueble(consignacionId: string): string {
  return `/panel/inmobiliaria/inmuebles/${consignacionId}`;
}

/** La ficha del contrato, desde donde también se carga el inventario. */
export function rutaDeLaFichaDelContrato(contratoId: string): string {
  return `/panel/inmobiliaria/contratos/${contratoId}`;
}

export function esRutaDeInmueble(ruta: string): boolean {
  return ruta.startsWith('/panel/inmobiliaria/inmuebles/');
}

export function esRutaDeContrato(ruta: string): boolean {
  return ruta.startsWith('/panel/inmobiliaria/contratos/');
}

export interface AlmacenDeCopias {
  leer(consignacionId: string): Promise<CopiaDeInmueble | null>;
  guardar(copia: CopiaDeInmueble): Promise<void>;
  borrar(consignacionId: string): Promise<void>;
  listar(): Promise<CopiaDeInmueble[]>;
}

/**
 * Cuántos inmuebles caben. No es un límite de disco —cada copia son unos
 * pocos KB— sino de sentido: quien sale a hacer inventarios prepara los del
 * día, no los 2.800 de la cartera. Guardar todo llenaría la cuota del
 * navegador (que también aloja las FOTOS de los borradores, que sí pesan) y
 * el navegador desalojaría la base entera, borrador incluido.
 */
export const MAXIMO_DE_COPIAS = 25;

/** El almacén real del navegador. */
export function almacenIndexedDb(): AlmacenDeCopias {
  const con = <T>(
    modo: IDBTransactionMode,
    fn: (deposito: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> => conDeposito(DEPOSITO_COPIAS, modo, fn);

  return {
    async leer(consignacionId) {
      const fila = await con<CopiaDeInmueble | undefined>('readonly', (d) =>
        d.get(consignacionId) as IDBRequest<CopiaDeInmueble | undefined>,
      );
      return fila ?? null;
    },
    async guardar(copia) {
      await con('readwrite', (d) => d.put(copia));
    },
    async borrar(consignacionId) {
      await con('readwrite', (d) => d.delete(consignacionId));
    },
    async listar() {
      const filas = await con<CopiaDeInmueble[]>('readonly', (d) =>
        d.getAll() as IDBRequest<CopiaDeInmueble[]>,
      );
      return filas ?? [];
    },
  };
}

/** En memoria: las pruebas y el servidor, donde `indexedDB` no existe. */
export function almacenEnMemoria(inicial: CopiaDeInmueble[] = []): AlmacenDeCopias {
  const filas = new Map<string, CopiaDeInmueble>(
    inicial.map((c) => [c.consignacionId, c]),
  );
  return {
    leer: (id) => Promise.resolve(filas.get(id) ?? null),
    guardar: (c) => {
      filas.set(c.consignacionId, c);
      return Promise.resolve();
    },
    borrar: (id) => {
      filas.delete(id);
      return Promise.resolve();
    },
    listar: () => Promise.resolve([...filas.values()]),
  };
}

let almacen: AlmacenDeCopias | null = null;

/** El almacén que corresponde al entorno, igual que el del borrador. */
export function almacenDeCopias(): AlmacenDeCopias {
  if (almacen) return almacen;
  almacen = hayIndexedDb() ? almacenIndexedDb() : almacenEnMemoria();
  return almacen;
}

/** Sólo para las pruebas: cambia el almacén que devuelve `almacenDeCopias`. */
export function usarAlmacenDeCopias(otro: AlmacenDeCopias | null): void {
  almacen = otro;
}

/**
 * Aviso de que la lista «Disponibles sin señal» cambió.
 *
 * Va por un evento del `window` y no por un estado compartido porque quien
 * prepara un inmueble (el botón de una fila, o la ficha) y quien muestra la
 * lista son pantallas distintas que no se conocen. Mismo camino que ya usa
 * `active-context-updated` en auth.
 */
export const EVENTO_DE_CAMBIO = 'leasefy:copias-sin-senal';

function avisarCambio(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_DE_CAMBIO));
}

/** La consignación del back, reducida a lo que la lista necesita mostrar. */
export function copiaDeConsignacion(
  consignacion: Consignacion,
  ahora = Date.now(),
  rutas: string[] = [],
): CopiaDeInmueble {
  const inquilino = consignacion.inquilino;
  const contratoId = inquilino?.contractId ?? consignacion.currentLeaseId ?? null;
  return {
    consignacionId: consignacion.id,
    titulo: consignacion.propertyTitle,
    direccion: consignacion.propertyAddress,
    contrato: contratoId
      ? {
          contratoId,
          // `inquilino` es el dato bueno; `currentTenantName` es el texto
          // suelto que quedó al activar. Sin ninguno de los dos no se
          // inventa un nombre: se deja vacío y la tarjeta no lo muestra.
          inquilino: inquilino?.nombre ?? consignacion.currentTenantName ?? '',
        }
      : null,
    consignacion,
    guardadoEn: ahora,
    rutas,
  };
}

/**
 * A quién sacar cuando ya no caben más.
 *
 * Sale la MÁS VIEJA, salvo las protegidas: un inmueble con inventario sin
 * subir no puede perder su copia, porque la pantalla que lo va a subir se
 * arma con ella. Si todas las que quedan están protegidas no se saca a nadie
 * — pasarse del tope un rato es mejor que romper un trabajo a medias.
 */
export function aQuienesSacar(
  copias: CopiaDeInmueble[],
  protegidos: string[],
  maximo = MAXIMO_DE_COPIAS,
): string[] {
  const sobran = copias.length - maximo;
  if (sobran <= 0) return [];
  const candidatas = copias
    .filter((c) => !protegidos.includes(c.consignacionId))
    .sort((a, b) => a.guardadoEn - b.guardadoEn);
  return candidatas.slice(0, sobran).map((c) => c.consignacionId);
}

/**
 * Guarda (o refresca) la copia de un inmueble y respeta el tope.
 *
 * Se llama sola cada vez que la ficha abre con señal —así la copia nunca
 * queda vieja— y también desde el botón «Preparar para trabajar sin señal».
 */
export async function guardarCopia(
  consignacion: Consignacion,
  ahora = Date.now(),
): Promise<CopiaDeInmueble> {
  const deposito = almacenDeCopias();
  // Las páginas ya preparadas se arrastran: el refresco de datos no puede
  // borrar lo que el worker sí tiene guardado. Se guardan aparte —el worker
  // no nos avisa cuando desaloja— pero olvidarlas acá sería mentir al revés.
  const previa = await deposito.leer(consignacion.id).catch(() => null);
  const copia = copiaDeConsignacion(consignacion, ahora, previa?.rutas ?? []);
  await deposito.guardar(copia);

  const borradores = await almacenDeBorradores()
    .listar()
    .catch(() => []);
  const protegidos = [
    copia.consignacionId,
    ...borradores.map((b) => b.consignacionId),
  ];
  for (const id of aQuienesSacar(await deposito.listar(), protegidos)) {
    await deposito.borrar(id);
  }
  avisarCambio();
  return copia;
}

/** La copia de un inmueble, o `null` si nunca se preparó. */
export function leerCopia(consignacionId: string): Promise<CopiaDeInmueble | null> {
  return almacenDeCopias().leer(consignacionId);
}

/** Lo que hay disponible sin señal, de lo más reciente a lo más viejo. */
export async function listarCopias(): Promise<CopiaDeInmueble[]> {
  const copias = await almacenDeCopias().listar();
  return copias.sort((a, b) => b.guardadoEn - a.guardadoEn);
}

/** Sacar un inmueble de «Disponibles sin señal». */
export async function borrarCopia(consignacionId: string): Promise<void> {
  await almacenDeCopias().borrar(consignacionId);
  avisarCambio();
}

/**
 * Anota que ESTA página quedó guardada para abrirse sin señal.
 *
 * La llama «Preparar para trabajar sin señal» cuando el worker contestó que
 * sí, y sólo entonces: la lista «Disponibles sin señal» promete lo que se
 * anota acá. Sin copia todavía no anota nada — la página sola no alcanza, sin
 * los datos la pantalla se arma vacía.
 */
export async function anotarRuta(
  consignacionId: string,
  ruta: string,
): Promise<CopiaDeInmueble | null> {
  const deposito = almacenDeCopias();
  const copia = await deposito.leer(consignacionId);
  if (!copia) return null;
  const rutas = copia.rutas ?? [];
  if (rutas.includes(ruta)) return copia;
  const conRuta = { ...copia, rutas: [...rutas, ruta] };
  await deposito.guardar(conRuta);
  avisarCambio();
  return conRuta;
}

/**
 * La copia del inmueble de un contrato, para armar su ficha sin señal.
 *
 * 🔴 Nico, 2026-09-13: el inventario también se carga desde el contrato. Sin
 * red, la ficha del contrato no tiene contrato que mostrar —eso vive en el
 * back— pero sí puede mostrar el inventario, que es lo que la persona fue a
 * hacer al apartamento.
 *
 * Se busca por el contrato VIGENTE de la consignación y también por la ruta
 * preparada: un contrato en borrador todavía no es el vigente de nadie, y aun
 * así alguien pudo preparar su ficha a propósito.
 */
export async function leerCopiaPorContrato(
  contratoId: string,
): Promise<CopiaDeInmueble | null> {
  const ruta = rutaDeLaFichaDelContrato(contratoId);
  const copias = await almacenDeCopias().listar();
  return (
    copias.find(
      (c) => c.contrato?.contratoId === contratoId || (c.rutas ?? []).includes(ruta),
    ) ?? null
  );
}
