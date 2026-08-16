/**
 * dispersion-adapter — traduce la dispersión del back a lo que la pantalla usa.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El tipo `Dispersion` del front y lo que el back manda **no se parecían**, y
 * nadie lo notó porque la lista llegaba vacía: `dispersionesApi.getAll` leía
 * `res.data` sobre un array pelado, devolvía `undefined`, y la pantalla decía
 * «No hay dispersiones registradas» con dispersiones en la base.
 *
 * Al arreglar eso, la tabla intentó pintar por primera vez y reventó con
 * `Cannot read properties of null (reading 'accountNumber')`. Dos desajustes:
 *
 * **La cuenta bancaria.** El back manda dos strings sueltos y nulables
 * (`propietarioBankName`, `propietarioBankAccount`); la pantalla esperaba un
 * objeto `{ bank, accountType, accountNumber, accountHolder }`. Un propietario
 * sin cuenta registrada —que es un caso normal, y el PDF ya lo dice— tumbaba
 * la sección entera.
 *
 * **El estado.** El back manda `DISP_PENDING | PROCESSING | DISP_COMPLETED |
 * FAILED`; la pantalla filtra y cuenta por `pending | processing | completed |
 * failed`. Sin traducir, todos los contadores daban cero y ningún filtro
 * casaba nunca.
 *
 * Se traduce acá, en un solo lugar, en vez de tocar los cuatro componentes:
 * el modelo de la pantalla es una decisión del front, y éste es el borde.
 */

import type {
  Dispersion,
  DispersionStatus,
  PropietarioBankAccount,
} from '@/lib/types/inmobiliaria';

/** Lo que manda el back, tal cual. */
export interface DispersionDelBack {
  id: string;
  propietarioId: string;
  propietarioName: string;
  propietarioBankName: string | null;
  propietarioBankAccount: string | null;
  month: string;
  totalCollected: number;
  totalCommission: number;
  totalConceptosAFavor?: number;
  totalConceptosACargo?: number;
  totalDeTerceros?: number;
  netToPropietario: number;
  status: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  transferReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: Array<{
    cobroId: string;
    propertyTitle: string;
    rentCollected: number;
    commissionPercent: number;
    commissionAmount: number;
    netAmount: number;
    conceptosAFavor?: number;
    conceptosACargo?: number;
    deTerceros?: number;
  }>;
}

const ESTADOS: Record<string, DispersionStatus> = {
  DISP_PENDING: 'pending',
  PROCESSING: 'processing',
  DISP_COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Un estado desconocido se trata como pendiente, no se descarta.
 *
 * Descartar la fila escondería una dispersión real; inventarle «completada»
 * diría que ya se giró la plata. Pendiente es el único que no afirma de más.
 */
export function estadoDeDispersion(status: string): DispersionStatus {
  return ESTADOS[status] ?? 'pending';
}

/**
 * La cuenta bancaria, o `null` si no hay ninguna registrada.
 *
 * Nulable a propósito: un objeto con strings vacíos se pinta como una cuenta
 * en blanco, que se lee como «se perdió el dato». No tener cuenta es un estado
 * normal —hay que pedírsela al propietario antes de girarle— y la pantalla lo
 * tiene que poder decir.
 */
export function cuentaDelPropietario(
  d: Pick<
    DispersionDelBack,
    'propietarioBankName' | 'propietarioBankAccount' | 'propietarioName'
  >,
): PropietarioBankAccount | null {
  if (!d.propietarioBankAccount) return null;
  return {
    bank: (d.propietarioBankName ?? '') as PropietarioBankAccount['bank'],
    // El back no guarda el tipo de cuenta en la dispersión: se deja en blanco
    // en vez de suponer «ahorros», que sería inventar el destino de un giro.
    accountType: '' as PropietarioBankAccount['accountType'],
    accountNumber: d.propietarioBankAccount,
    accountHolder: d.propietarioName,
  };
}

export function adaptarDispersion(d: DispersionDelBack): Dispersion {
  return {
    id: d.id,
    propietarioId: d.propietarioId,
    propietarioName: d.propietarioName,
    propietarioBankAccount: cuentaDelPropietario(d),
    month: d.month,
    items: (d.items ?? []).map((i) => ({
      cobroId: i.cobroId,
      propertyTitle: i.propertyTitle,
      rentCollected: i.rentCollected,
      commissionPercent: i.commissionPercent,
      commissionAmount: i.commissionAmount,
      netAmount: i.netAmount,
      conceptosAFavor: i.conceptosAFavor ?? 0,
      conceptosACargo: i.conceptosACargo ?? 0,
      deTerceros: i.deTerceros ?? 0,
    })),
    totalCollected: d.totalCollected,
    totalCommission: d.totalCommission,
    totalConceptosAFavor: d.totalConceptosAFavor ?? 0,
    totalConceptosACargo: d.totalConceptosACargo ?? 0,
    totalDeTerceros: d.totalDeTerceros ?? 0,
    netToPropietario: d.netToPropietario,
    status: estadoDeDispersion(d.status),
    approvedBy: d.approvedBy ?? undefined,
    approvedAt: d.approvedAt ?? undefined,
    processedAt: d.processedAt ?? undefined,
    transferReference: d.transferReference ?? undefined,
    failureReason: d.failureReason ?? undefined,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
