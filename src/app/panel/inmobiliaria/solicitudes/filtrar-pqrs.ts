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
  estado: PqrsEstado | 'todos';
}

export const FILTROS_DE_PQRS_VACIOS: FiltrosDePqrs = { texto: '', estado: 'todos' };

/**
 * Se filtra en el cliente a propósito: la consulta ya trajo todo y el resumen
 * de arriba sigue contando el total de la agencia, no lo que quedó filtrado.
 */
export function filtrarPqrs(solicitudes: Pqrs[], filtros: FiltrosDePqrs): Pqrs[] {
  const texto = filtros.texto.trim().toLowerCase();
  return solicitudes.filter((p) => {
    if (filtros.estado !== 'todos' && p.estado !== filtros.estado) return false;
    if (!texto) return true;
    // Lo que alguien tiene en la mano cuando busca: el radicado que le dieron,
    // el nombre de quien reclamó, de qué se trata, o el inmueble.
    return [p.radicado, p.solicitanteNombre, p.asunto, p.inmuebleLabel, p.asignadoANombre]
      .filter((x): x is string => Boolean(x))
      .some((campo) => campo.toLowerCase().includes(texto));
  });
}
