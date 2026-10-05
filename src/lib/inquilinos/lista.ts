/**
 * La lista de inquilinos, sin pantalla: el orden y los totales del portafolio.
 *
 * Viven aparte de `InquilinosTable` porque desde el QA de Inquilinos (03-10)
 * los usa la PÁGINA: el orden se aplica a la lista entera antes de paginar
 * (I-01) y los tres números de arriba son del portafolio, no de la búsqueda
 * (I-07). `InquilinosTable` los vuelve a exportar como siempre.
 */

import { arriendosVigentes, type Inquilino } from '@/lib/api/inquilinos.service';

export type CampoDeOrden = 'nombre' | 'arriendos' | 'canon';
export type SentidoDelOrden = 'asc' | 'desc';

/** El orden de la lista. Vive en la PÁGINA: se ordena todo y después se pagina. */
export interface OrdenDeInquilinos {
  campo: CampoDeOrden;
  sentido: SentidoDelOrden;
}

/** El canon que la persona paga HOY: sólo lo vigente, nunca lo histórico. */
export function canonVigente(persona: Inquilino): number {
  return arriendosVigentes(persona).reduce((suma, a) => suma + a.canonCop, 0);
}

/**
 * El canon que la FILA muestra (QA-INQ-95, T-02). Con varios arriendos, la suma
 * de los vigentes; con uno, el suyo (vigente o no: «En firma $4.500.000»,
 * «Empieza el 1 de nov $3.300.000»); sin arriendo, `null` («—»). Ordenar por
 * otra cuenta que la que se ve dejaba una fila de $4.500.000 al final de «mayor
 * a menor», detrás de las de $1.000.000.
 */
export function canonDeLaFila(persona: Inquilino): number | null {
  if (persona.arriendos.length === 0) return null;
  if (persona.arriendos.length > 1) return canonVigente(persona);
  return (arriendosVigentes(persona)[0] ?? persona.arriendos[0]).canonCop;
}

/** Ordena sin mutar. El nombre con `localeCompare` es-CO: «Ñ» va donde debe. */
export function ordenarInquilinos(
  inquilinos: readonly Inquilino[],
  campo: CampoDeOrden,
  sentido: SentidoDelOrden,
): Inquilino[] {
  const signo = sentido === 'asc' ? 1 : -1;
  return [...inquilinos].sort((a, b) => {
    switch (campo) {
      case 'arriendos':
        return (a.arriendos.length - b.arriendos.length) * signo;
      case 'canon': {
        // Lo que no tiene canon («—», sin arriendo) va al final en los dos sentidos.
        const ca = canonDeLaFila(a);
        const cb = canonDeLaFila(b);
        if (ca === null || cb === null) {
          if (ca === cb) return a.nombre.localeCompare(b.nombre, 'es-CO');
          return ca === null ? 1 : -1;
        }
        return (ca - cb) * signo || a.nombre.localeCompare(b.nombre, 'es-CO');
      }
      default:
        return a.nombre.localeCompare(b.nombre, 'es-CO') * signo;
    }
  });
}

/** El siguiente orden al tocar una cabecera: la misma invierte; otra arranca en su sentido natural. */
export function siguienteOrden(actual: OrdenDeInquilinos, campo: CampoDeOrden): OrdenDeInquilinos {
  if (campo === actual.campo) {
    return { campo, sentido: actual.sentido === 'asc' ? 'desc' : 'asc' };
  }
  // Nombre se lee A→Z; los números interesan de mayor a menor.
  return { campo, sentido: campo === 'nombre' ? 'asc' : 'desc' };
}

/**
 * Los tres números de arriba de la pantalla (I-07).
 *
 * 🔴 Son del PORTAFOLIO, no de lo que se está mirando: antes salían de la
 * lista filtrada, y con una búsqueda caían a «0 · $ 0» —se leían como totales
 * y eran de la búsqueda—. Se calculan sobre la lista de «activos» sin búsqueda
 * (lo vigente: «Los tres números miden lo VIGENTE, no lo histórico»).
 */
export interface TotalesDelPortafolio {
  personas: number;
  vigentes: number;
  canon: number;
}

export function totalesDelPortafolio(inquilinos: readonly Inquilino[]): TotalesDelPortafolio {
  const vigentes = inquilinos.flatMap((i) => arriendosVigentes(i));
  return {
    personas: inquilinos.length,
    vigentes: vigentes.length,
    canon: vigentes.reduce((suma, a) => suma + a.canonCop, 0),
  };
}

/** ¿La lista que se ve ES el portafolio (activos, sin búsqueda)? */
export function esElPortafolio(filtros: { buscar: string; estado: string }): boolean {
  return filtros.estado === 'activos' && filtros.buscar.trim() === '';
}
