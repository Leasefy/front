/**
 * En qué va cada paso de «Giros a propietarios» en un mes (ronda 19 de la
 * revisora, 22-10-2026: «ningún paso dice si está hecho»).
 *
 * Se lee de los lotes del mes, que es lo único que el back ya cuenta por mes:
 *   · un lote del mes (que no esté anulado) quiere decir que ya se liquidó y se
 *     revisó: el lote se arma con los giros de ese mes;
 *   · el archivo del banco está hecho cuando todos los lotes del mes ya
 *     salieron (archivo generado, en Wompi o pagado); en curso si alguno está
 *     todavía en borrador o esperando aprobación;
 *   · marcar pagado está hecho cuando todos los lotes del mes están pagados.
 * Sin lotes del mes no se marca nada: no sabemos y no lo inventamos.
 * Sólo lee: ninguna regla de negocio cambia.
 */
import type { EstadoDelLote, LoteResumen } from '@/lib/api/lotes-de-dispersion.types';

export type PasoDelGiro = 'liquidar' | 'revisar' | 'banco' | 'pagado';
export type EstadoDelPaso = 'hecho' | 'en_curso';
export type EstadoDeLosPasos = Partial<Record<PasoDelGiro, EstadoDelPaso>>;

const YA_SALIO: readonly EstadoDelLote[] = ['ARCHIVO_GENERADO', 'EN_WOMPI', 'PAGADO'];

export function estadoDeLosPasos(lotes: readonly Pick<LoteResumen, 'month' | 'estado'>[], mes: string): EstadoDeLosPasos {
  const delMes = lotes.filter((l) => l.month === mes && l.estado !== 'ANULADO');
  if (delMes.length === 0) return {};
  const todosSalieron = delMes.every((l) => YA_SALIO.includes(l.estado));
  const todosPagados = delMes.every((l) => l.estado === 'PAGADO');
  return {
    liquidar: 'hecho',
    revisar: 'hecho',
    banco: todosSalieron ? 'hecho' : 'en_curso',
    ...(todosPagados ? { pagado: 'hecho' as const } : todosSalieron ? { pagado: 'en_curso' as const } : {}),
  };
}
