/**
 * ubicarPorTandas — busca en el mapa las direcciones de un lote ya subido y le
 * va guardando al servidor lo que encuentra, de a tandas (T-0130).
 *
 * La búsqueda sigue siendo del NAVEGADOR (misma regla, mismo proveedor y misma
 * pausa entre filas que siempre), pero ya no vive y muere con la pestaña: las
 * direcciones que faltan salen del servidor (`por-ubicar`) y cada tanda de 50 se
 * guarda apenas termina. Un corte —red, sesión, cerrar la página— pierde a lo
 * sumo la tanda en vuelo, y retomar es volver a llamar con el cursor: el
 * navegador ni siquiera necesita el archivo.
 *
 * Función pura con las llamadas inyectadas, como `activarLoteCompleto`.
 */

import type {
  FilaPorUbicar,
  PaginaPorUbicar,
  UbicacionDeFilaGuardada,
  UbicacionDeLote,
} from '@/lib/api/inmuebles-importacion.service';

export interface ProgresoDeUbicacion {
  /** Direcciones ya ubicadas y guardadas en el servidor. */
  ubicadas: number;
  total: number;
}

export interface ResultadoDeUbicacion {
  /** Se recorrieron todas las que faltaban. */
  terminada: boolean;
  /** La persona tocó «Detener»: se guardó lo hecho y se paró. */
  detenidaPorPersona: boolean;
  ubicadas: number;
  total: number;
  /** Cuántas quedaron sin pin porque no se pudieron ubicar ni por municipio. */
  sinUbicar: number;
  /** Cuántas quedaron en el centro de su municipio, no en la dirección. */
  enElMunicipio: number;
}

/** Un corte a mitad: lo ya guardado está a salvo y se retoma desde el cursor. */
export class UbicacionInterrumpida extends Error {
  constructor(
    message: string,
    public readonly progreso: ProgresoDeUbicacion,
    public readonly causa: unknown,
  ) {
    super(message);
    this.name = 'UbicacionInterrumpida';
  }
}

export interface OpcionesDeUbicacion {
  lote: string;
  /** Cursor desde el que se sigue (`ubicacion.siguienteDesde`); 0 si no hay. */
  desdeInicial?: number;
  /** Cuántas ya estaban ubicadas al empezar, para el «X de Y». */
  ubicadasAlEmpezar?: number;
  totalAlEmpezar?: number;
  traer: (lote: string, desde: number) => Promise<PaginaPorUbicar>;
  ubicar: (
    fila: FilaPorUbicar,
  ) => Promise<{ lat?: number; lng?: number; precision: 'direccion' | 'municipio' | 'ninguna' }>;
  guardar: (lote: string, filas: UbicacionDeFilaGuardada[]) => Promise<UbicacionDeLote>;
  alAvanzar?: (p: ProgresoDeUbicacion) => void;
  debeParar?: () => boolean;
  antesDeCada?: () => Promise<void>;
  /** Pausa entre direcciones (el techo del proveedor); las pruebas la ponen en 0. */
  pausaMs?: number;
  esperar?: (ms: number) => Promise<void>;
}

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function ubicarPorTandas(o: OpcionesDeUbicacion): Promise<ResultadoDeUbicacion> {
  const esperar = o.esperar ?? dormir;
  let desde = Math.max(0, o.desdeInicial ?? 0);
  let ubicadas = o.ubicadasAlEmpezar ?? 0;
  let total = o.totalAlEmpezar ?? 0;
  let sinUbicar = 0;
  let enElMunicipio = 0;
  let vueltasSinFilas = 0;

  for (;;) {
    await o.antesDeCada?.();
    let pagina: PaginaPorUbicar;
    try {
      pagina = await o.traer(o.lote, desde);
    } catch (e) {
      throw new UbicacionInterrumpida(mensajeDe(e), { ubicadas, total }, e);
    }
    total = pagina.total;
    ubicadas = Math.max(ubicadas, pagina.ubicadas);
    o.alAvanzar?.({ ubicadas, total });

    const hechas: UbicacionDeFilaGuardada[] = [];
    let parada = false;
    let fallo: unknown = null;

    for (let i = 0; i < pagina.filas.length; i += 1) {
      if (o.debeParar?.() === true) {
        parada = true;
        break;
      }
      const fila = pagina.filas[i];
      try {
        const u = await o.ubicar(fila);
        if (u.precision === 'municipio') enElMunicipio += 1;
        else if (u.precision === 'ninguna') sinUbicar += 1;
        hechas.push({
          indice: fila.indice,
          lat: u.lat ?? null,
          lng: u.lng ?? null,
          precision: u.precision,
        });
      } catch (e) {
        // Una búsqueda que explota NO se guarda como «sin ubicar»: se corta y se
        // guarda lo que ya había, para que retomar la vuelva a intentar.
        fallo = e;
        break;
      }
      if (i < pagina.filas.length - 1 && (o.pausaMs ?? 0) > 0) await esperar(o.pausaMs ?? 0);
    }

    // Se guarda SIEMPRE lo hecho, también al parar o al fallar: es trabajo
    // pagado en tiempo de proveedor y no se tira.
    if (hechas.length > 0) {
      try {
        await o.antesDeCada?.();
        const r = await o.guardar(o.lote, hechas);
        ubicadas = Math.max(ubicadas, r.ubicadas);
        total = r.total;
        o.alAvanzar?.({ ubicadas, total });
      } catch (e) {
        throw new UbicacionInterrumpida(mensajeDe(e), { ubicadas, total }, e);
      }
    }

    if (fallo !== null) throw new UbicacionInterrumpida(mensajeDe(fallo), { ubicadas, total }, fallo);
    if (parada) {
      return { terminada: false, detenidaPorPersona: true, ubicadas, total, sinUbicar, enElMunicipio };
    }
    if (pagina.siguienteDesde === null) {
      return { terminada: true, detenidaPorPersona: false, ubicadas, total, sinUbicar, enElMunicipio };
    }

    // Sin filas y con cursor nuevo no hay trabajo que hacer: dos vueltas así
    // seguidas son un back que no avanza, y repetir colgaría la pestaña.
    if (pagina.filas.length === 0) {
      vueltasSinFilas += 1;
      if (vueltasSinFilas > 2) {
        throw new UbicacionInterrumpida(
          'El servidor no devolvió más direcciones por ubicar. Vuelve a intentarlo.',
          { ubicadas, total },
          null,
        );
      }
    } else {
      vueltasSinFilas = 0;
    }
    desde = pagina.siguienteDesde;
  }
}

function mensajeDe(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'Se cortó la búsqueda de direcciones.';
}
