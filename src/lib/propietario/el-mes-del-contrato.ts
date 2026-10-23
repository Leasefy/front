/**
 * Cómo va cada contrato del propietario de inmobiliaria, dicho en una línea —
 * el tablero del Inicio (Nico eligió «Tablero + 3 secciones», 21-10-2026).
 *
 * De la reunión: «que pueda ver si el inquilino está al día o no, si la
 * inmobiliaria ya le pagó… tu inquilino no ha pagado nada pero la inmobiliaria
 * ya te pagó, para que vaya mirando si valió la pena tenerla».
 *
 * Todo sale de lo que el portal ya trae, sin inventar:
 *   · el mes del inquilino → `FichaDelInmueble.mesActual` (`GET /portal/propietario/contratos/:id`);
 *   · el avance → `contrato.inicio` y `contrato.fin` de la misma ficha;
 *   · el giro del mes → `GET /portal/propietario/giros` (por mes).
 *
 * PURO: lo prueba `el-mes-del-contrato.test.ts`.
 */
import type { EstadoDelMes, FichaDelInmueble, GiroDelPropietario } from '@/lib/api/portal-del-propietario.service';
import { fechaLarga } from '@/lib/fechas/fecha-de-la-casa';
import { formatCurrency } from '@/lib/format';
import { nombreDelMes } from '@/lib/recaudo/meses';

export type Tono = 'exito' | 'aviso' | 'peligro' | 'neutro';

/** El mes del inquilino, como lo dice la ficha del inmueble. */
export function fraseDelMesDelInquilino(m: NonNullable<FichaDelInmueble['mesActual']>): { texto: string; tono: Tono } {
  const mes = nombreDelMes(m.mes);
  const porEstado: Record<EstadoDelMes, { texto: string; tono: Tono }> = {
    PAGADO: { texto: `Pagó ${mes}${m.pagadoEl ? ` el ${fechaLarga(m.pagadoEl)}` : ''}`, tono: 'exito' },
    ABONADO: { texto: `Abonó ${formatCurrency(m.pagadoCop)} de ${mes}; le faltan ${formatCurrency(m.pendienteCop)}`, tono: 'aviso' },
    PENDIENTE: { texto: `${mes.charAt(0).toUpperCase()}${mes.slice(1)} vence${m.vence ? ` el ${fechaLarga(m.vence)}` : ''}`, tono: 'neutro' },
    VENCIDO: { texto: `No ha pagado ${mes}${m.vence ? ` (venció el ${fechaLarga(m.vence)})` : ''}`, tono: 'peligro' },
    SIN_CUOTA: { texto: `No hay cobro de ${mes} en este contrato`, tono: 'neutro' },
  };
  return porEstado[m.estado];
}

/** Las clases del sello, para quien pinta la frase como pastilla. */
export const CLASES_DEL_TONO: Record<Tono, string> = {
  exito: 'bg-success-soft text-success',
  aviso: 'bg-warning-soft text-warning',
  peligro: 'bg-danger-soft text-danger',
  neutro: 'bg-surface-muted text-fg-muted',
};

/** `AAAA-MM-DD` → meses enteros desde el año 0, para contar meses de contrato. */
function mesesDe(iso: string): number {
  const [a, m] = iso.slice(0, 10).split('-').map(Number);
  return a * 12 + (m - 1);
}

/**
 * «Mes 8 de 12»: en qué mes del contrato va hoy. `null` sin las dos fechas, o
 * si hoy está fuera del contrato (por empezar o ya terminado: eso lo dice su sello).
 */
/**
 * Cuántos meses dura el contrato. El fin puede venir incluido («del 1 de nov
 * al 31 de oct») o el mismo día del año siguiente («del 21 de oct al 21 de
 * oct», como lo arma «Generar contrato»): los dos son 12, no 13. `null` sin
 * las dos fechas o con el fin antes del inicio.
 */
export function mesesDelContrato(inicio: string | null | undefined, fin: string | null | undefined): number | null {
  if (!inicio || !fin) return null;
  const de = mesesDe(fin) - mesesDe(inicio) + (fin.slice(8, 10) > inicio.slice(8, 10) ? 1 : 0);
  return de > 0 ? de : null;
}

export function avanceDelContrato(
  inicio: string | null | undefined,
  fin: string | null | undefined,
  hoy: string,
): { mes: number; de: number } | null {
  if (!inicio || !fin) return null;
  const de = mesesDelContrato(inicio, fin) ?? 0;
  const mes = mesesDe(hoy) - mesesDe(inicio) + (hoy.slice(8, 10) >= inicio.slice(8, 10) ? 1 : 0);
  if (de <= 0 || mes < 1 || mes > de) return null;
  return { mes, de };
}

/** El giro del mes, si la inmobiliaria ya lo hizo. */
export function fraseDelGiroDelMes(giros: readonly GiroDelPropietario[] | null, mes: string): { texto: string; tono: Tono } | null {
  if (!giros) return null;
  const nombre = nombreDelMes(mes);
  const g = giros.find((x) => x.mes === mes);
  if (!g) return { texto: `Todavía no te gira ${nombre}`, tono: 'neutro' };
  switch (g.estado) {
    case 'GIRADO':
    case 'REGIRADO':
      return { texto: `Ya te giró ${nombre}`, tono: 'exito' };
    case 'EN_CAMINO':
      return { texto: `Tu giro de ${nombre} va en camino`, tono: 'neutro' };
    case 'DEVUELTO':
      return { texto: `El banco devolvió tu giro de ${nombre}`, tono: 'peligro' };
    default:
      return null;
  }
}

/**
 * El caso que la reunión quería que se viera: el inquilino no ha pagado el mes
 * y la inmobiliaria igual ya le giró.
 */
export function teGiraronAunqueNoPago(
  m: FichaDelInmueble['mesActual'],
  giros: readonly GiroDelPropietario[] | null,
): boolean {
  if (!m || !giros || m.estado !== 'VENCIDO') return false;
  const g = giros.find((x) => x.mes === m.mes);
  return g?.estado === 'GIRADO' || g?.estado === 'REGIRADO';
}

/** Lo que te han girado en el año de `hoy` (girados y vueltos a girar; un devuelto no cuenta). */
export function giradoEnElAnio(giros: readonly GiroDelPropietario[], hoy: string): number {
  const anio = hoy.slice(0, 4);
  return giros
    .filter((g) => g.mes.startsWith(anio) && (g.estado === 'GIRADO' || g.estado === 'REGIRADO'))
    .reduce((n, g) => n + g.valorCop, 0);
}
