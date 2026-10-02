/**
 * subirPorTandas — sube el archivo al back en tandas, reanudable (T-0130).
 *
 * El back guarda las filas en el MISMO `preparar` (no en el job) y las ubica en
 * el mapa por su cuenta, así que lo único que el navegador hace en esta etapa es
 * mandar el archivo. Cada tanda lleva la misma clave, el tamaño del archivo
 * entero y su posición (`desde`); reenviar una que ya llegó no hace nada. Por
 * eso un corte se arregla volviendo a llamar: se retoma en `siguienteDesde`.
 *
 * Es una función pura con las llamadas inyectadas, igual que
 * `activarLoteCompleto`: el bucle y sus condiciones de corte se prueban sin red.
 */

import {
  TANDA_DE_SUBIDA,
  type EstadoDeLoteInmuebles,
  type ImportarInmuebleDto,
  type OpcionesDeTanda,
} from '@/lib/api/inmuebles-importacion.service';

export interface ProgresoDeSubida {
  /** Filas del archivo que ya llegaron al servidor. */
  enviadas: number;
  total: number;
  /** El lote del servidor (se conoce desde la primera respuesta). */
  lote: string;
  estado: EstadoDeLoteInmuebles;
}

export interface ResultadoDeSubida {
  /** La última respuesta del servidor. */
  estado: EstadoDeLoteInmuebles | null;
  /** El archivo entero llegó (el servidor dejó de esperar filas). */
  completa: boolean;
  /** La persona tocó «Detener»: se paró DESPUÉS de la tanda en curso. */
  detenidaPorPersona: boolean;
}

/**
 * Un corte a mitad de la subida. Trae el lote (si ya se conocía) para que la
 * pantalla diga «llegaron X de Y» y ofrezca seguir — nada se perdió.
 */
export class SubidaInterrumpida extends Error {
  constructor(
    message: string,
    public readonly lote: string | null,
    public readonly enviadas: number,
    public readonly causa: unknown,
  ) {
    super(message);
    this.name = 'SubidaInterrumpida';
  }
}

/** Un corte de red o un 5xx se reintentan: reenviar una tanda es inocuo. */
const REINTENTOS = [1_000, 3_000];

function esTransitorio(e: unknown): boolean {
  const status = (e as { status?: unknown } | null)?.status;
  return typeof status === 'number' && (status === 0 || status >= 500);
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface OpcionesDeSubida {
  filas: ImportarInmuebleDto[];
  claveDeIdempotencia: string;
  enviar: (
    tanda: ImportarInmuebleDto[],
    clave: string,
    opciones: OpcionesDeTanda,
  ) => Promise<EstadoDeLoteInmuebles>;
  /** Desde qué fila (base 0) se reanuda. 0 = desde el principio. */
  desdeInicial?: number;
  tanda?: number;
  alAvanzar?: (p: ProgresoDeSubida) => void;
  debeParar?: () => boolean;
  /** Antes de cada llamada: renovar el token, esperar, lo que haga falta. */
  antesDeCada?: () => Promise<void>;
  /** Esperas entre reintentos; las pruebas la pasan en cero. */
  esperar?: (ms: number) => Promise<void>;
}

export async function subirPorTandas(o: OpcionesDeSubida): Promise<ResultadoDeSubida> {
  const total = o.filas.length;
  const tamano = Math.max(1, o.tanda ?? TANDA_DE_SUBIDA);
  const esperar = o.esperar ?? dormir;
  let desde = Math.max(0, o.desdeInicial ?? 0);
  let ultimo: EstadoDeLoteInmuebles | null = null;
  // Cuántas veces seguidas el servidor pidió volver a una fila ya enviada.
  let retrocesos = 0;

  while (desde < total) {
    if (o.debeParar?.() === true) {
      return { estado: ultimo, completa: false, detenidaPorPersona: true };
    }
    const trozo = o.filas.slice(desde, desde + tamano);

    let r: EstadoDeLoteInmuebles | null = null;
    for (let intento = 0; r === null; intento += 1) {
      try {
        await o.antesDeCada?.();
        r = await o.enviar(trozo, o.claveDeIdempotencia, { totalDelArchivo: total, desde });
      } catch (e) {
        if (esTransitorio(e) && intento < REINTENTOS.length) {
          await esperar(REINTENTOS[intento]);
          continue;
        }
        throw new SubidaInterrumpida(
          e instanceof Error && e.message ? e.message : 'Se cortó la subida del archivo.',
          ultimo?.lote ?? null,
          desde,
          e,
        );
      }
    }
    ultimo = r;

    const llegaron = Math.min(total, r.recibidas ?? desde + trozo.length);
    o.alAvanzar?.({ enviadas: llegaron, total, lote: r.lote, estado: r });

    // El servidor dejó de esperar filas: el archivo entero llegó.
    if (r.fase !== undefined && r.fase !== 'RECIBIENDO') {
      return { estado: r, completa: true, detenidaPorPersona: false };
    }
    if (r.siguienteDesde === null) {
      return { estado: r, completa: true, detenidaPorPersona: false };
    }

    // Un back anterior no manda `siguienteDesde`: se sigue de corrido.
    const siguiente = r.siguienteDesde ?? desde + trozo.length;
    if (siguiente > desde) {
      retrocesos = 0;
      desde = siguiente;
      continue;
    }
    // El servidor pide una fila ANTERIOR (quedó un hueco). Se vuelve, pero una
    // vez: si insiste, repetir no arregla nada y colgaría la pestaña.
    retrocesos += 1;
    if (retrocesos > 2) {
      throw new SubidaInterrumpida(
        'El servidor no terminó de recibir el archivo. Vuelve a intentarlo.',
        r.lote,
        llegaron,
        null,
      );
    }
    desde = siguiente;
  }

  return { estado: ultimo, completa: ultimo !== null, detenidaPorPersona: false };
}
