/**
 * Las alertas de la portada de Contabilidad, derivadas de lo que el back
 * sabe. Ninguna sale de un umbral inventado acá: cada una tiene un endpoint
 * detrás y se cae sola si ese endpoint no responde.
 *
 *   SIN_ASIENTO       ← `GET /asientos/faltantes` (total > 0)
 *   MAPEO_INCOMPLETO  ← `GET /asientos/faltantes` (mapeoCompleto false, total 0)
 *   NO_CUADRA         ← `GET /reportes/balance-de-prueba` (cuadra false)
 *   MES_SIN_CERRAR    ← `GET /asientos` del mes anterior + `GET /asientos/cierre`
 *
 * Regla de Nico para toda alerta: qué pasó con el número · qué hacer · botón.
 * `describirAlerta` produce exactamente eso; la pantalla sólo lo pinta.
 */

import type { AsientosFaltantes, Cierre, EventoContable } from '@/lib/api/contabilidad.service';
import { mesEnTitulo } from '@/lib/utils/mes';
import { diaLegible } from './fechas';

export interface MesAnterior {
  /** `AAAA-MM`. */
  mes: string;
  /** El último día del mes, `AAAA-MM-DD`. */
  hasta: string;
  /** Cuántos asientos tienen fecha en ese mes. */
  asientos: number;
}

export interface EntradaDeAlertas {
  faltantes: AsientosFaltantes | null;
  balance: { cuadra: boolean; diferenciaCop: number } | null;
  cierre: Cierre | null;
  mesAnterior: MesAnterior | null;
}

export type AlertaContable =
  | {
      tipo: 'SIN_ASIENTO';
      total: number;
      cobros: number;
      recibos: number;
      lotes: number;
      mapeoCompleto: boolean;
      eventosSinCuenta: EventoContable[];
    }
  | { tipo: 'MAPEO_INCOMPLETO'; eventosSinCuenta: EventoContable[] }
  | { tipo: 'NO_CUADRA'; diferenciaCop: number }
  | { tipo: 'MES_SIN_CERRAR'; mes: string; hasta: string; asientos: number };

/**
 * Qué alertas corresponden a lo que se sabe. Lo que no llegó (`null`) no
 * genera alerta: una portada que no pudo preguntar no grita.
 */
export function alertasDeContabilidad(entrada: EntradaDeAlertas): AlertaContable[] {
  const alertas: AlertaContable[] = [];

  if (entrada.balance && !entrada.balance.cuadra) {
    alertas.push({ tipo: 'NO_CUADRA', diferenciaCop: entrada.balance.diferenciaCop });
  }

  const f = entrada.faltantes;
  if (f) {
    if (f.total > 0) {
      alertas.push({
        tipo: 'SIN_ASIENTO',
        total: f.total,
        cobros: f.cobros,
        recibos: f.recibos,
        lotes: f.lotes,
        mapeoCompleto: f.mapeoCompleto,
        eventosSinCuenta: f.eventosSinCuenta,
      });
    } else if (!f.mapeoCompleto && f.eventosSinCuenta.length > 0) {
      alertas.push({ tipo: 'MAPEO_INCOMPLETO', eventosSinCuenta: f.eventosSinCuenta });
    }
  }

  const m = entrada.mesAnterior;
  if (m && m.asientos > 0 && entrada.cierre) {
    const frontera = entrada.cierre.cerradaHasta;
    if (frontera === null || frontera < m.hasta) {
      alertas.push({ tipo: 'MES_SIN_CERRAR', mes: m.mes, hasta: m.hasta, asientos: m.asientos });
    }
  }

  return alertas;
}

export type AccionDeAlertaContable =
  | { tipo: 'ir'; label: string; href: string }
  | { tipo: 'reprocesar'; label: string }
  | { tipo: 'cerrar-mes'; label: string; hasta: string };

export interface AlertaDescrita {
  clave: string;
  severidad: 'info' | 'warning' | 'danger';
  /** Qué pasó, con el número. */
  titulo: string;
  /** Qué hacer. */
  detalle: string;
  accion: AccionDeAlertaContable;
}

const BASE = '/panel/inmobiliaria/contabilidad';

function plural(n: number, singular: string, pluralTexto: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? singular : pluralTexto}`;
}

function desglose(a: Extract<AlertaContable, { tipo: 'SIN_ASIENTO' }>): string {
  return [
    a.cobros > 0 ? plural(a.cobros, 'cobro', 'cobros') : null,
    a.recibos > 0 ? plural(a.recibos, 'recibo de caja', 'recibos de caja') : null,
    a.lotes > 0 ? plural(a.lotes, 'lote de giros', 'lotes de giros') : null,
  ]
    .filter(Boolean)
    .join(', ');
}

export function describirAlerta(
  alerta: AlertaContable,
  formatoDeMonto: (n: number) => string,
): AlertaDescrita {
  switch (alerta.tipo) {
    case 'NO_CUADRA':
      return {
        clave: 'no-cuadra',
        severidad: 'danger',
        titulo: `El libro no cuadra: hay ${formatoDeMonto(Math.abs(alerta.diferenciaCop))} de diferencia entre débitos y créditos`,
        detalle:
          'Es un defecto del libro, no de un informe. Mirá el balance de prueba para ver en qué cuenta se abre y avisale a quien lo administra.',
        accion: { tipo: 'ir', label: 'Ver el balance', href: `${BASE}/reportes?informe=balance` },
      };
    case 'SIN_ASIENTO': {
      const que = desglose(alerta);
      return alerta.mapeoCompleto
        ? {
            clave: 'sin-asiento',
            severidad: 'warning',
            titulo: `${plural(alerta.total, 'movimiento', 'movimientos')} sin asiento${que ? `: ${que}` : ''}`,
            detalle:
              'El mapeo ya está completo: al reprocesar se asientan con la fecha de su documento.',
            accion: { tipo: 'reprocesar', label: 'Reprocesar' },
          }
        : {
            clave: 'sin-asiento',
            severidad: 'warning',
            titulo: `${plural(alerta.total, 'movimiento', 'movimientos')} sin asiento${que ? `: ${que}` : ''}`,
            detalle: `Faltan cuentas en ${plural(alerta.eventosSinCuenta.length, 'evento', 'eventos')} del mapeo. Completalo y después reprocesá desde el mapeo.`,
            accion: { tipo: 'ir', label: 'Completar el mapeo', href: `${BASE}/mapeo` },
          };
    }
    case 'MAPEO_INCOMPLETO':
      return {
        clave: 'mapeo-incompleto',
        severidad: 'warning',
        titulo: `${plural(alerta.eventosSinCuenta.length, 'evento del mapeo', 'eventos del mapeo')} sin cuenta`,
        detalle:
          'Hasta que tengan cuenta, los cobros, recibos o giros de esos eventos no generan asiento.',
        accion: { tipo: 'ir', label: 'Completar el mapeo', href: `${BASE}/mapeo` },
      };
    case 'MES_SIN_CERRAR': {
      return {
        clave: 'mes-sin-cerrar',
        severidad: 'info',
        // `mesEnTitulo`, no `capitalize` de CSS: eso pondría «Agosto De 2026».
        titulo: `${mesEnTitulo(alerta.mes)} tiene ${plural(alerta.asientos, 'asiento', 'asientos')} y sigue abierto`,
        detalle: `Cerralo hasta el ${diaLegible(alerta.hasta)} para que nada con fecha de ese mes se pueda asentar ni reversar adentro.`,
        accion: { tipo: 'cerrar-mes', label: 'Cerrar el mes', hasta: alerta.hasta },
      };
    }
  }
}
