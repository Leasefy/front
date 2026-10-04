/** Helpers puros sobre un asiento ya cargado. */

import type { AsientoContable, OrigenDelAsiento } from '@/lib/api/contabilidad.service';

export const NOMBRE_DE_ORIGEN: Record<OrigenDelAsiento, string> = {
  MANUAL: 'Manual',
  COBRO: 'Cobro',
  RECIBO_DE_CAJA: 'Recibo de caja',
  DISPERSION: 'Dispersión',
  MIGRACION: 'Migración',
};

export const ORIGENES: readonly OrigenDelAsiento[] = [
  'MANUAL',
  'COBRO',
  'RECIBO_DE_CAJA',
  'DISPERSION',
  'MIGRACION',
];

export function totalesDeAsiento(a: Pick<AsientoContable, 'movimientos'>): {
  debitos: number;
  creditos: number;
} {
  let debitos = 0;
  let creditos = 0;
  for (const m of a.movimientos ?? []) {
    debitos += m.debitoCop ?? 0;
    creditos += m.creditoCop ?? 0;
  }
  return { debitos, creditos };
}

/**
 * El color del origen en la tabla, sólo con tokens. Lo hecho a mano se
 * distingue (es lo que alguien decidió); lo automático y lo migrado van en
 * neutro: es el sistema haciendo lo suyo.
 */
export const CLASE_DE_ORIGEN: Record<OrigenDelAsiento, string> = {
  MANUAL: 'bg-primary/10 text-primary',
  COBRO: 'bg-surface-muted text-fg-muted',
  RECIBO_DE_CAJA: 'bg-surface-muted text-fg-muted',
  DISPERSION: 'bg-surface-muted text-fg-muted',
  MIGRACION: 'bg-surface-muted text-fg-muted',
};

/** «2 líneas» / «1 línea», para el sufijo de la descripción. */
export function textoDeLineas(cantidad: number): string {
  return cantidad === 1 ? '1 línea' : `${cantidad} líneas`;
}

// ── CB-13 / CB-14 (QA de Contabilidad, 03-10-2026): lo que el asiento ES ────

/**
 * Lo que una persona tiene que saber del asiento además de sus líneas:
 *   · `REVERSADO` — ya tiene su reversa: no se vuelve a reversar;
 *   · `REVERSA`   — es la reversa de otro: tampoco se reversa;
 *   · `CERRADO`   — su período está cerrado (no entra nada con esa fecha);
 *   · `null`      — un asiento vivo en un período abierto: no hay nada que decir.
 *
 * La columna «Estado» del libro decía «Abierto» en cada fila (= el PERÍODO
 * está abierto), que no dice nada del asiento; y un asiento reversado seguía
 * «Abierto» y con «Reversar» (sólo al enviar llegaba el 409).
 *
 * Con un back anterior a CB-14 (sin `reversaDe` ni `reversadoPor`): la reversa
 * se reconoce como hasta ahora (origen MANUAL con `origenId`, que es el id del
 * original); «reversado» no se puede saber y no se afirma.
 */
export type EstadoDelAsiento = 'REVERSADO' | 'REVERSA' | 'CERRADO';

export function esReversa(
  a: Pick<AsientoContable, 'reversaDe' | 'origen' | 'origenId'> & Partial<Pick<AsientoContable, 'origenLegible'>>,
): boolean {
  if (a.reversaDe !== undefined) return a.reversaDe !== null;
  if (a.origenLegible) return a.origenLegible.tipo === 'REVERSA';
  return a.origen === 'MANUAL' && Boolean(a.origenId);
}

export function estadoDelAsiento(
  a: Pick<AsientoContable, 'reversaDe' | 'reversadoPor' | 'origen' | 'origenId' | 'cerrado'>,
): EstadoDelAsiento | null {
  if (a.reversadoPor) return 'REVERSADO';
  if (esReversa(a)) return 'REVERSA';
  if (a.cerrado) return 'CERRADO';
  return null;
}

export const NOMBRE_DEL_ESTADO: Record<EstadoDelAsiento, string> = {
  REVERSADO: 'Reversado',
  REVERSA: 'Reversa',
  CERRADO: 'Período cerrado',
};

/**
 * ¿Se ofrece «Reversar»? Lo decide el back (`sePuedeReversar`) cuando lo manda;
 * si no, ni a un asiento ya reversado ni a una reversa.
 */
export function sePuedeReversar(
  a: Pick<AsientoContable, 'reversaDe' | 'reversadoPor' | 'origen' | 'origenId' | 'sePuedeReversar'>,
): boolean {
  if (typeof a.sePuedeReversar === 'boolean') return a.sePuedeReversar;
  return !a.reversadoPor && !esReversa(a);
}

/** El nombre del tipo de `origenLegible` (CB-13). */
export const NOMBRE_DEL_TIPO_DE_ORIGEN: Record<string, string> = {
  MANUAL: 'Manual',
  REVERSA: 'Reversa',
  APERTURA: 'Apertura',
  COBRO: 'Cobro',
  RECIBO_DE_CAJA: 'Recibo de caja',
  DISPERSION: 'Dispersión',
  MIGRACION: 'Migración',
  EGRESO: 'Egreso',
  FACTURA_DE_PROVEEDOR: 'Factura de proveedor',
  CONCILIACION: 'Conciliación',
  TRASLADO_AL_BANCO: 'Traslado al banco',
  TRASLADO_DE_COMISION: 'Traslado de comisión',
  GIRO_DEVUELTO: 'Giro devuelto',
  NOMINA: 'Nómina',
};

/**
 * El nombre del origen para la pastilla: el tipo de `origenLegible` si el back
 * lo manda (una reversa automática deja de decir «Manual», CB-02), si no el
 * origen de siempre.
 */
export function nombreDelOrigen(a: Pick<AsientoContable, 'origen' | 'origenLegible'>): string {
  const tipo = a.origenLegible?.tipo;
  if (tipo && NOMBRE_DEL_TIPO_DE_ORIGEN[tipo]) return NOMBRE_DEL_TIPO_DE_ORIGEN[tipo];
  return NOMBRE_DE_ORIGEN[a.origen] ?? a.origen;
}

const NOMBRE_DEL_TIPO_DE_TERCERO: Record<string, string> = {
  PROPIETARIO: 'Propietario',
  ARRENDATARIO: 'Inquilino',
  INQUILINO: 'Inquilino',
  PROVEEDOR: 'Proveedor',
  BANCO: 'Banco',
  EMPLEADO: 'Empleado',
  COPROPIEDAD: 'Copropiedad',
  ASEGURADORA: 'Aseguradora',
  INMOBILIARIA: 'Inmobiliaria',
};

/**
 * «Propietario · Paula Andrea Quintero». Sin nombre, `null`: la línea no dice
 * nada del tercero. NUNCA el `terceroId` (un uuid no le dice nada a nadie) ni
 * un tipo suelto con el nombre vacío («ARRENDATARIO ·»).
 */
export function textoDelTercero(
  m: { terceroTipo: string | null; terceroNombre?: string | null; terceroDocumento?: string | null },
): string | null {
  const nombre = m.terceroNombre?.trim();
  if (!nombre) return null;
  const tipo = m.terceroTipo
    ? (NOMBRE_DEL_TIPO_DE_TERCERO[m.terceroTipo] ??
      m.terceroTipo.charAt(0) + m.terceroTipo.slice(1).toLowerCase().replace(/_/g, ' '))
    : null;
  const documento = m.terceroDocumento?.trim();
  const quien = documento ? `${nombre} (${documento})` : nombre;
  return tipo ? `${tipo} · ${quien}` : quien;
}

/**
 * De dónde salió el asiento, dicho para una persona, SIN ids:
 * «Generado por: Recibo de caja N.º 23» (con `origenLegible` del back) o
 * «Generado por un recibo de caja» (sin él). Una reversa y lo manual sin
 * origen no llevan esta línea (la reversa tiene la suya, con su enlace).
 */
export function textoDelOrigen(
  a: Pick<AsientoContable, 'origen' | 'origenId' | 'origenLegible' | 'reversaDe'>,
): string | null {
  if (esReversa(a)) return null;
  if (a.origenLegible) {
    // Lo manual y la reversa no llevan esta línea (la reversa tiene la suya).
    if (a.origenLegible.tipo === 'MANUAL' || a.origenLegible.tipo === 'REVERSA') return null;
    const rotulo = a.origenLegible.rotulo?.trim();
    if (rotulo) return `Generado por: ${rotulo}`;
  }
  if (!a.origenId) return null;
  switch (a.origen) {
    case 'RECIBO_DE_CAJA':
      return 'Generado por un recibo de caja';
    case 'COBRO':
      return 'Generado por la causación de un cobro';
    case 'DISPERSION':
      return 'Generado por un lote de dispersión';
    case 'MIGRACION':
      return 'Entró con la migración';
    default:
      return null;
  }
}

/**
 * El color de la pastilla del origen: lo hecho a mano (manual, apertura) se
 * distingue; lo automático va en neutro. Con `origenLegible` manda su tipo (una
 * reversa automática o un egreso traen `origen: MANUAL` en el enum viejo).
 */
export function claseDelOrigen(a: Pick<AsientoContable, 'origen' | 'origenLegible'>): string {
  const tipo = a.origenLegible?.tipo;
  if (tipo) {
    return tipo === 'MANUAL' || tipo === 'APERTURA'
      ? CLASE_DE_ORIGEN.MANUAL
      : 'bg-surface-muted text-fg-muted';
  }
  return CLASE_DE_ORIGEN[a.origen] ?? 'bg-surface-muted text-fg-muted';
}
