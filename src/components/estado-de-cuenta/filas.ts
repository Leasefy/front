/**
 * La lógica del estado de cuenta que NO es pintar: fechas, columnas que
 * sobran, los puntos de quiebre intercalados entre las filas, los filtros y
 * los totales de lo que se está viendo.
 *
 * Todo puro y exportado: así se fija con pruebas sin montar React, y el
 * documento de pantalla y el del PDF comparten exactamente los mismos números.
 */

import type {
  ContratoDelEstadoDeCuenta,
  EstadoDeCuenta,
  EstadoDeFila,
  FilaDelEstadoDeCuenta,
  PuntoDeQuiebre,
  RolEnElContrato,
  TotalesDelEstadoDeCuenta,
} from '@/lib/types/estado-de-cuenta';

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * `2024-05-22` → `22 may 2024`.
 *
 * Se leen los diez primeros caracteres sin construir un `Date`: un `@db.Date`
 * llega como `…T00:00:00.000Z` y en Bogotá (UTC−5) se pinta el día anterior.
 * Un estado de cuenta que corre todas las fechas un día es exactamente el
 * defecto que no se puede tener en un documento que se entrega.
 */
export function fechaLegible(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  if (!anio || !mes || !dia) return iso;
  const nombre = MESES[Number(mes) - 1];
  if (!nombre) return iso;
  return `${Number(dia)} ${nombre} ${anio}`;
}

/** `2024-05-22` → `22 may 2024 → 21 jun 2024`, o `null` si no hay período. */
export function periodoLegible(fila: FilaDelEstadoDeCuenta): string | null {
  if (!fila.periodoDesde || !fila.periodoHasta) return null;
  return `${fechaLegible(fila.periodoDesde)} → ${fechaLegible(fila.periodoHasta)}`;
}

/**
 * El concepto sin la cola del período.
 *
 * Nui escribe «Canon De Arrendamiento con IVA. De 22-May-2024 hasta
 * 21-Jun-2024» en CADA renglón: de los 60 caracteres, 40 se repiten. Cuando el
 * back manda el período suelto, la cola se recorta y el rango se pinta debajo,
 * en mono. Cuando no lo manda, el concepto se deja entero: nunca se borra
 * información que no se pueda volver a mostrar en otro lado.
 */
export function conceptoLimpio(fila: FilaDelEstadoDeCuenta): string {
  if (!fila.periodoDesde || !fila.periodoHasta) return fila.concepto;
  const sinCola = fila.concepto.replace(/\.?\s*De\s+\S+\s+hasta\s+\S+\s*$/i, '');
  const limpio = sinCola.trim().replace(/\.$/, '');
  return limpio.length > 0 ? limpio : fila.concepto;
}

// ══ Columnas ════════════════════════════════════════════════════════════════

export type ColumnaDeImpuesto =
  | 'iva'
  | 'retencion'
  | 'reteIva'
  | 'reteIca'
  | 'comision'
  | 'ivaComision'
  | 'retencionComision'
  | 'reteIvaComision'
  | 'reteIcaComision';

export const ETIQUETA_DE_COLUMNA: Record<ColumnaDeImpuesto, string> = {
  iva: 'IVA',
  retencion: 'Retención',
  reteIva: 'ReteIVA',
  reteIca: 'ReteICA',
  comision: 'Comisión',
  ivaComision: 'IVA comisión',
  retencionComision: 'Ret. comisión',
  reteIvaComision: 'ReteIVA comisión',
  reteIcaComision: 'ReteICA comisión',
};

const TODAS: ColumnaDeImpuesto[] = [
  'iva',
  'retencion',
  'reteIva',
  'reteIca',
  'comision',
  'ivaComision',
  'retencionComision',
  'reteIvaComision',
  'reteIcaComision',
];

/**
 * Qué columnas de impuestos pinta este contrato: sólo las que tienen un valor
 * distinto de cero en alguna fila.
 *
 * Nui le da columna propia a IVA, Retención, ReteIVA y ReteICA aunque las
 * cuatro sean `$0.00` en las 40 filas: cuatro columnas de ceros empujan el
 * concepto a dos renglones y el documento a una hoja más. Acá aparecen si
 * existen, y el pie dice cuáles se omitieron — omitir en silencio sí sería
 * esconder un dato.
 *
 * Se decide por CONTRATO y no por fila: una tabla que cambia de columnas a
 * mitad no se puede leer ni sumar con el dedo.
 */
export function columnasDeImpuestos(
  filas: readonly FilaDelEstadoDeCuenta[],
): ColumnaDeImpuesto[] {
  return TODAS.filter((c) => filas.some((f) => (f[c] ?? 0) !== 0));
}

/** Las que NO se pintan porque son cero en todas las filas. */
export function columnasOmitidas(
  filas: readonly FilaDelEstadoDeCuenta[],
  esPropietario: boolean,
): ColumnaDeImpuesto[] {
  const visibles = new Set(columnasDeImpuestos(filas));
  const candidatas = esPropietario
    ? TODAS
    : (['iva', 'retencion', 'reteIva', 'reteIca'] as ColumnaDeImpuesto[]);
  return candidatas.filter((c) => !visibles.has(c));
}

// ══ Puntos de quiebre ═══════════════════════════════════════════════════════

export type RenglonDelContrato =
  | { tipo: 'fila'; fila: FilaDelEstadoDeCuenta; clave: string }
  | { tipo: 'corte'; corte: PuntoDeQuiebre; clave: string };

/**
 * Mete cada punto de quiebre en su lugar cronológico, entre las filas.
 *
 * El corte va JUSTO ANTES de la primera fila que vence en su fecha o después:
 * esa fila ya es de la parte nueva. Un corte posterior a todas las filas se
 * pinta al final (el cambio ya ocurrió, aunque todavía no haya cuota suya);
 * uno anterior a todas, al principio.
 *
 * No se ordenan las filas acá: llegan del back en el orden del documento y
 * reordenarlas en el front sería discutirle al back cuál es ese orden.
 */
export function intercalarCortes(
  filas: readonly FilaDelEstadoDeCuenta[],
  cortes: readonly PuntoDeQuiebre[],
): RenglonDelContrato[] {
  if (cortes.length === 0) {
    return filas.map((fila, i) => ({ tipo: 'fila', fila, clave: `f${i}` }));
  }
  const pendientes = [...cortes].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const salida: RenglonDelContrato[] = [];

  filas.forEach((fila, i) => {
    while (
      pendientes.length > 0 &&
      pendientes[0]!.fecha.slice(0, 10) <= fila.fechaVencimiento.slice(0, 10)
    ) {
      const corte = pendientes.shift()!;
      salida.push({ tipo: 'corte', corte, clave: `c${corte.fecha}-${corte.motivo}` });
    }
    salida.push({ tipo: 'fila', fila, clave: `f${i}` });
  });

  pendientes.forEach((corte) => {
    salida.push({ tipo: 'corte', corte, clave: `c${corte.fecha}-${corte.motivo}` });
  });

  return salida;
}

// ══ Filtros ═════════════════════════════════════════════════════════════════

export interface FiltrosDelEstadoDeCuenta {
  /** Deja sólo lo que todavía se debe (`PENDIENTE`). */
  soloPendientes: boolean;
  /** `YYYY-MM-DD` o cadena vacía. Se compara contra `fechaVencimiento`. */
  desde: string;
  hasta: string;
  /** El número del contrato, o `''` para todos. */
  contrato: string;
}

export const SIN_FILTROS: FiltrosDelEstadoDeCuenta = {
  soloPendientes: false,
  desde: '',
  hasta: '',
  contrato: '',
};

export function hayFiltros(f: FiltrosDelEstadoDeCuenta): boolean {
  return f.soloPendientes || f.desde !== '' || f.hasta !== '' || f.contrato !== '';
}

/**
 * Lo que todavía se debe. `ANULADA` y `ANTERIOR` no: la primera es una cuota
 * que se deshizo, la segunda la gestionó el sistema viejo.
 */
const SE_DEBE: EstadoDeFila[] = ['PENDIENTE'];

function pasaLaFila(
  fila: FilaDelEstadoDeCuenta,
  f: FiltrosDelEstadoDeCuenta,
): boolean {
  if (f.soloPendientes && !SE_DEBE.includes(fila.estado)) return false;
  const vence = fila.fechaVencimiento.slice(0, 10);
  if (f.desde && vence < f.desde) return false;
  if (f.hasta && vence > f.hasta) return false;
  return true;
}

/**
 * Aplica los filtros y devuelve el documento como se va a ver —y como se va a
 * exportar—. Un contrato que se queda sin filas desaparece: una sección vacía
 * bajo un filtro se lee «este contrato no tiene nada», que es mentira.
 *
 * 🔴 Los totales se RECALCULAN sobre lo que queda. Mostrar el total del back
 * encima de una tabla filtrada es el error clásico: el número no cuadra con
 * las filas que uno está mirando y el documento pierde credibilidad entero.
 * Sin filtros, se usan los del back tal cual.
 */
export function aplicarFiltros(
  doc: EstadoDeCuenta,
  f: FiltrosDelEstadoDeCuenta,
): EstadoDeCuenta {
  if (!hayFiltros(f)) return doc;

  const contratos = doc.contratos
    .filter((c) => (f.contrato ? c.numero === f.contrato : true))
    .map((c) => {
      const arriendos = c.secciones.arriendos.filter((x) => pasaLaFila(x, f));
      const otrosConceptos = c.secciones.otrosConceptos.filter((x) => pasaLaFila(x, f));
      return {
        ...c,
        secciones: { arriendos, otrosConceptos },
        totales: totalesDeFilas([...arriendos, ...otrosConceptos]),
      };
    })
    .filter((c) => c.secciones.arriendos.length + c.secciones.otrosConceptos.length > 0);

  return {
    ...doc,
    contratos,
    totales: sumarTotales(contratos.map((c) => c.totales)),
  };
}

/**
 * Los totales de un puñado de filas.
 *
 * `ANULADA` y `ANTERIOR` no suman a ningún lado: la primera es una cuota que se
 * deshizo, la segunda es de antes de la fecha de corte de la agencia y su saldo
 * no está en nuestra cartera. Contarlas infla la deuda con plata que nadie va a
 * cobrar.
 */
export function totalesDeFilas(
  filas: readonly FilaDelEstadoDeCuenta[],
): TotalesDelEstadoDeCuenta {
  let cancelado = 0;
  let pendiente = 0;
  for (const f of filas) {
    if (f.estado === 'CANCELADA') cancelado += f.valorNeto;
    else if (f.estado === 'PENDIENTE') pendiente += f.valorNeto;
  }
  return { cancelado, pendiente, restaPorPagar: pendiente };
}

export function sumarTotales(
  totales: readonly TotalesDelEstadoDeCuenta[],
): TotalesDelEstadoDeCuenta {
  return totales.reduce<TotalesDelEstadoDeCuenta>(
    (acc, t) => ({
      cancelado: acc.cancelado + t.cancelado,
      pendiente: acc.pendiente + t.pendiente,
      restaPorPagar: acc.restaPorPagar + t.restaPorPagar,
    }),
    { cancelado: 0, pendiente: 0, restaPorPagar: 0 },
  );
}

/** Cuántas filas tiene un contrato en total. Manda la paginación. */
export function cuantasFilas(c: ContratoDelEstadoDeCuenta): number {
  return c.secciones.arriendos.length + c.secciones.otrosConceptos.length;
}

// ══ Estados ═════════════════════════════════════════════════════════════════

export interface PintaDelEstado {
  texto: string;
  /** Clases de Cadence. `neutral` no es un token: es la ausencia de color. */
  clase: string;
}

/**
 * Cómo se ve cada estado. Las palabras son las de Nui —la inmobiliaria las
 * conoce de su documento de siempre— menos «Sistema anterior», que es nuestra
 * y dice lo que el «Contrato Terminado» de Nui no decía: que ese período lo
 * gestionó el sistema viejo y su saldo no está en nuestra cartera.
 *
 * 🔴 Una cuota saldada se lee «Cancelada» del lado del INQUILINO (él canceló su
 * deuda) y «Pagada» del lado del PROPIETARIO (a él se le pagó). Es el mismo
 * estado en la base; la palabra la pone el lado, como en los dos PDF de Nui.
 */
const PINTA: Record<EstadoDeFila, PintaDelEstado> = {
  CANCELADA: { texto: 'Cancelada', clase: 'bg-success-soft text-success' },
  PENDIENTE: { texto: 'Pendiente', clase: 'bg-surface-muted text-fg' },
  ANULADA: { texto: 'Anulada', clase: 'bg-surface-muted text-fg-subtle line-through' },
  ANTERIOR: { texto: 'Sistema anterior', clase: 'bg-surface-muted text-fg-subtle' },
};

export function pintaDelEstado(
  estado: EstadoDeFila,
  rol: RolEnElContrato,
): PintaDelEstado {
  const base = PINTA[estado];
  if (estado === 'CANCELADA' && rol === 'PROPIETARIO') {
    return { ...base, texto: 'Pagada' };
  }
  return base;
}

/** Con qué sombrero entra el cliente al documento. */
export function comoSeLlamaElRol(rol: RolEnElContrato): string {
  return rol === 'PROPIETARIO' ? 'Propietario' : 'Inquilino';
}

/**
 * `true` si la fila ya se venció y todavía se debe.
 *
 * No cambia el estado —ese lo manda el back— pero sí se dice en la columna
 * «Vence», con la palabra y no sólo con el color: dos filas «Pendiente» de
 * distinto color y con el mismo texto no se distinguen sin ver bien.
 */
export function estaVencida(
  fila: FilaDelEstadoDeCuenta,
  hoy: string,
): boolean {
  if (fila.estado !== 'PENDIENTE') return false;
  return fila.fechaVencimiento.slice(0, 10) < hoy;
}

/** `YYYY-MM-DD` local. `toISOString()` va en UTC y de noche en Bogotá ya es mañana. */
export function hoyLocal(d: Date = new Date()): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
