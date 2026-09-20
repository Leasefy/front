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
 * Y las cuatro del contrato del 18-09 (§8, la portada):
 *
 *   RUBROS_INCOMPLETOS ← `GET /mapeo/rubros` (completo false)
 *   FACTURAS_SIN_CAUSAR← `GET /gastos/facturas?estado=BORRADOR`
 *   LOTES_POR_APROBAR  ← `GET /egresos/lotes` (BORRADOR o ESPERANDO_APROBACION)
 *   EXOGENA_SIN_VISTO  ← `GET /exogena?anio=` (formatos con filas y sin APROBADA)
 *
 * Regla de Nico para toda alerta: qué pasó con el número · qué hacer · botón.
 * `describirAlerta` produce exactamente eso; la pantalla sólo lo pinta.
 *
 * ── Ninguna alerta sale de un `null` ────────────────────────────────────────
 *
 * Las cuatro nuevas viven en migraciones sin aplicar, así que sus consultas
 * pueden responder `disponible: false` o fallar. En los dos casos la entrada
 * llega `null` y NO se genera alerta: una portada que no pudo preguntar no
 * grita. Lo que sí hace la portada es decir qué revisión no cargó — para eso
 * está `REVISIONES` en `HubDeContabilidad.tsx`, porque «no hay alertas» sólo
 * significa «está todo bien» si se pudo revisar.
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

/** Lo que la portada sabe del mapeo de rubros del P&G (contrato 18-09, §1). */
export interface EstadoDeRubros {
  /** ¿Todos los rubros sugeridos tienen cuenta? */
  completo: boolean;
  /** Los nombres de los que faltan, para decirlos. */
  faltantes: string[];
}

/** Lo que la portada sabe de las facturas de proveedor (§3). */
export interface EstadoDeFacturas {
  /** Cuántas están en BORRADOR: registradas y sin asiento. */
  sinCausar: number;
  /** Cuánto suman, para que el número tenga peso. */
  totalCop: number;
}

/** Lo que la portada sabe de los lotes de egreso (§4). */
export interface EstadoDeLotes {
  porAprobar: number;
  totalCop: number;
}

/** Lo que la portada sabe de la exógena del año cerrado (§6). */
export interface EstadoDeExogena {
  anio: number;
  /** Formatos con filas y sin visto bueno del contador. */
  sinVistoBueno: number;
  /** De esos, cuántos además tienen algo que impide presentarlos. */
  conBloqueos: number;
}

export interface EntradaDeAlertas {
  faltantes: AsientosFaltantes | null;
  balance: { cuadra: boolean; diferenciaCop: number } | null;
  cierre: Cierre | null;
  mesAnterior: MesAnterior | null;
  /** Las cuatro del 18-09. `null`/ausente = no se pudo preguntar: no hay alerta. */
  rubros?: EstadoDeRubros | null;
  facturas?: EstadoDeFacturas | null;
  lotes?: EstadoDeLotes | null;
  exogena?: EstadoDeExogena | null;
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
  | { tipo: 'MES_SIN_CERRAR'; mes: string; hasta: string; asientos: number }
  | { tipo: 'RUBROS_INCOMPLETOS'; faltantes: string[] }
  | { tipo: 'FACTURAS_SIN_CAUSAR'; sinCausar: number; totalCop: number }
  | { tipo: 'LOTES_POR_APROBAR'; porAprobar: number; totalCop: number }
  | { tipo: 'EXOGENA_SIN_VISTO_BUENO'; anio: number; sinVistoBueno: number; conBloqueos: number };

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

  // ── Las cuatro del contrato del 18-09 ──────────────────────────────────
  //
  // Van después de las de siempre a propósito: un libro que no cuadra o
  // movimientos sin asentar son más graves que un mapeo a medio hacer, y la
  // portada se lee de arriba abajo.

  const r = entrada.rubros;
  if (r && !r.completo && r.faltantes.length > 0) {
    alertas.push({ tipo: 'RUBROS_INCOMPLETOS', faltantes: r.faltantes });
  }

  const facturas = entrada.facturas;
  if (facturas && facturas.sinCausar > 0) {
    alertas.push({
      tipo: 'FACTURAS_SIN_CAUSAR',
      sinCausar: facturas.sinCausar,
      totalCop: facturas.totalCop,
    });
  }

  const lotes = entrada.lotes;
  if (lotes && lotes.porAprobar > 0) {
    alertas.push({
      tipo: 'LOTES_POR_APROBAR',
      porAprobar: lotes.porAprobar,
      totalCop: lotes.totalCop,
    });
  }

  const exogena = entrada.exogena;
  if (exogena && exogena.sinVistoBueno > 0) {
    alertas.push({
      tipo: 'EXOGENA_SIN_VISTO_BUENO',
      anio: exogena.anio,
      sinVistoBueno: exogena.sinVistoBueno,
      conBloqueos: exogena.conBloqueos,
    });
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
          'Es un defecto del libro, no de un informe. Mira el balance de prueba para ver en qué cuenta se abre y avísale a quien lo administra.',
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
            detalle: `Faltan cuentas en ${plural(alerta.eventosSinCuenta.length, 'evento', 'eventos')} del mapeo. Complétalo y después reprocesa desde el mapeo.`,
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
        detalle: `Ciérralo hasta el ${diaLegible(alerta.hasta)} para que nada con fecha de ese mes se pueda asentar ni reversar adentro.`,
        accion: { tipo: 'cerrar-mes', label: 'Cerrar el mes', hasta: alerta.hasta },
      };
    }
    case 'RUBROS_INCOMPLETOS':
      return {
        clave: 'rubros-incompletos',
        severidad: 'info',
        titulo: `${plural(alerta.faltantes.length, 'rubro del P&G', 'rubros del P&G')} sin cuenta del PUC`,
        // La consecuencia visible, no la abstracta: el guion que ya se ve.
        detalle: `Sin cuenta, el real de ${alerta.faltantes.slice(0, 3).join(', ')}${alerta.faltantes.length > 3 ? ' y otros' : ''} sale en «—» en el presupuesto y en el P&G. El preset propone una cuenta para casi todos.`,
        accion: { tipo: 'ir', label: 'Mapear los rubros', href: `${BASE}/mapeo?parte=rubros` },
      };
    case 'FACTURAS_SIN_CAUSAR':
      return {
        clave: 'facturas-sin-causar',
        severidad: 'warning',
        titulo: `${plural(alerta.sinCausar, 'factura de proveedor', 'facturas de proveedor')} sin causar por ${formatoDeMonto(alerta.totalCop)}`,
        detalle:
          'Una factura registrada y sin causar no está en el libro: no aparece en el P&G ni en la exógena, y el proveedor ya está esperando el pago.',
        accion: { tipo: 'ir', label: 'Ver las facturas', href: `${BASE}/gastos?estado=BORRADOR` },
      };
    case 'LOTES_POR_APROBAR':
      return {
        clave: 'lotes-por-aprobar',
        severidad: 'warning',
        titulo: `${plural(alerta.porAprobar, 'lote de egresos espera', 'lotes de egresos esperan')} aprobación por ${formatoDeMonto(alerta.totalCop)}`,
        // Quién puede aprobar es parte del «qué hacer»: el que armó el lote no.
        detalle:
          'Hasta que otra persona lo apruebe no sale el archivo para el banco y los proveedores no cobran. Lo tiene que aprobar alguien distinto de quien lo armó.',
        accion: { tipo: 'ir', label: 'Ver los lotes', href: `${BASE}/egresos` },
      };
    case 'EXOGENA_SIN_VISTO_BUENO':
      return {
        clave: 'exogena-sin-visto-bueno',
        severidad: alerta.conBloqueos > 0 ? 'warning' : 'info',
        titulo: `${plural(alerta.sinVistoBueno, 'formato de exógena', 'formatos de exógena')} de ${alerta.anio} sin el visto bueno del contador`,
        detalle:
          alerta.conBloqueos > 0
            ? `${plural(alerta.conBloqueos, 'tiene', 'tienen')} algo que impide presentarlos: movimientos sin tercero o cuentas sin concepto. Eso se arregla antes del visto bueno.`
            : 'Los formatos ya cuadran contra el libro. Falta que el contador los revise y deje constancia de quién y cuándo.',
        accion: { tipo: 'ir', label: 'Ver la exógena', href: `${BASE}/exogena?anio=${alerta.anio}` },
      };
  }
}
