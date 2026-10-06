/**
 * El buscador y el filtro de la tabla de PQRS.
 *
 * 🔴 22-09 · Vivían dentro de `page.tsx` con `export`, y un archivo de página
 * sólo puede exportar el juego cerrado que Next admite (`default`, `metadata`,
 * `revalidate`…). Cualquier otro export lo rechaza con «Property 'X' is
 * incompatible with index signature».
 *
 * Lo llamativo es DÓNDE no se veía. `next build` no lo dice, porque
 * `next.config` trae `typescript: { ignoreBuildErrors: true }`. El CI tampoco,
 * porque corre `tsc --noEmit` sobre un checkout limpio y esa restricción vive
 * en `.next/types`, que sólo existe después de compilar. Se ve en un solo
 * sitio: compilar en local y correr `tsc` encima. Cuatro páginas estaban así.
 *
 * Estaban exportados para poder probarlos desde `page.test.tsx`. Sacarlos a su
 * propio archivo es lo que correspondía de entrada: no son de la página, y así
 * se prueban sin montar la pantalla entera.
 */
import type { Pqrs, PqrsEstado } from '@/lib/api/pqrs-agencia.types';

export interface FiltrosDePqrs {
  texto: string;
  /** SO-25: además de cada estado, «vencidas» y «vencen pronto» (≤ 2 días hábiles). */
  estado: PqrsEstado | 'todos' | 'vencidas' | 'porVencer';
}

const ABIERTA = (p: Pqrs) => p.estado !== 'RESUELTA' && p.estado !== 'CERRADA';
/** Dos días hábiles desde hoy (sin festivos: es sólo el filtro; la cifra la da el back). */
function enDosDiasHabiles(ahora: Date): number {
  const d = new Date(ahora);
  let n = 0;
  while (n < 2) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) n += 1;
  }
  return d.getTime();
}

export const FILTROS_DE_PQRS_VACIOS: FiltrosDePqrs = { texto: '', estado: 'todos' };

/**
 * Se filtra en el cliente a propósito: la consulta ya trajo todo y el resumen
 * de arriba sigue contando el total de la agencia, no lo que quedó filtrado.
 */
export function filtrarPqrs(solicitudes: Pqrs[], filtros: FiltrosDePqrs, ahora: Date = new Date()): Pqrs[] {
  const texto = filtros.texto.trim().toLowerCase();
  const limite = enDosDiasHabiles(ahora);
  return solicitudes.filter((p) => {
    const vence = new Date(p.slaVenceAt).getTime();
    if (filtros.estado === 'vencidas') {
      if (!ABIERTA(p) || vence > ahora.getTime()) return false;
    } else if (filtros.estado === 'porVencer') {
      if (!ABIERTA(p) || vence <= ahora.getTime() || vence > limite) return false;
    } else if (filtros.estado !== 'todos' && p.estado !== filtros.estado) return false;
    if (!texto) return true;
    // Lo que alguien tiene en la mano cuando busca: el radicado que le dieron,
    // el nombre de quien reclamó, de qué se trata, o el inmueble.
    return [p.radicado, p.solicitanteNombre, p.asunto, p.inmuebleLabel, p.asignadoANombre]
      .filter((x): x is string => Boolean(x))
      .some((campo) => campo.toLowerCase().includes(texto));
  });
}
