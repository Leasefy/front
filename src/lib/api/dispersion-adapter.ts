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
  DispersionItem,
  DispersionStatus,
  ParteDelReparto,
  PropietarioBankAccount,
} from '@/lib/types/inmobiliaria';
import { baseDeLaDispersion } from '@/lib/propietarios/base-del-canon';
import type { DeduccionesDeLaLiquidacion } from '@/lib/types/deducciones';
import type { TitularDelGiro } from '@/lib/propietarios/titular-de-la-cuenta';
import type { OrigenDelGiroEnPantalla } from './lotes-de-dispersion.types';

/** Lo que manda el back, tal cual. */
export interface DispersionDelBack {
  id: string;
  propietarioId: string;
  propietarioName: string;
  propietarioBankName: string | null;
  propietarioBankAccount: string | null;
  /**
   * Tipo y titular de la cuenta. HOY el back no los manda en la dispersión
   * (sólo los pone en el PDF del extracto); si algún día los manda, se usan.
   */
  propietarioBankAccountType?: string | null;
  propietarioBankAccountHolder?: string | null;
  /**
   * 🔴 A nombre de quién sale ESTE giro (22-09): del propietario u otra persona,
   * con su documento. Lo manda `GET /inmobiliaria/dispersiones` (y `/:id`);
   * `copiadoAlGenerar: false` = es la ficha de hoy, no la copia del giro.
   * `null` = no se pudo leer; ausente = back anterior.
   */
  titularDeLaCuenta?: TitularDelGiro | null;
  /** 🔴 22-09: el reparto entre varias cuentas, en pesos. `null` = una sola. */
  repartoDeLaCuenta?: ParteDelReparto[] | null;
  /**
   * 23-09: desde qué cuenta de la inmobiliaria salió el giro (el suelto o el
   * del lote que lo pagó), tapada. `null` = no quedó; ausente = back anterior.
   */
  origenDelGiro?: OrigenDelGiroEnPantalla | null;
  month: string;
  /**
   * Con qué base salió el canon. La manda `GET /inmobiliaria/dispersiones` (y
   * `/:id`) desde el 2026-09-16; aprobar y girar no la traen.
   */
  baseDelCanon?: 'CAUSADO' | 'RECAUDADO' | null;
  /** La columna cruda, cuando la base la tiene y la fila la escribió. */
  baseDeCalculo?: string | null;
  /**
   * 🔴 D1/D2 (17-09), calculados por el back sobre las cuotas de la dispersión:
   * lo girado sin recaudo (cuenta por cobrar al inquilino) y los intereses de
   * mora recaudados que son del propietario. Ausentes = back sin el mandato.
   */
  cuentaPorCobrarAlInquilinoCop?: number;
  interesesCop?: number;
  totalCollected: number;
  totalCommission: number;
  /** 🔴 22-09 · Ausentes = back anterior: se leen como 0. */
  totalIvaComision?: number;
  totalRetencionesComision?: number;
  avisoDelIvaDeLaComision?: string | null;
  totalConceptosAFavor?: number;
  totalConceptosACargo?: number;
  totalDeTerceros?: number;
  netToPropietario: number;
  /** Las deducciones de la liquidación. La manda `GET` desde el 2026-09-16. */
  conDeducciones?: DeduccionesDeLaLiquidacion | null;
  status: string;
  approvedBy?: string | null;
  /** 🔴 23-09: el nombre de quien aprobó. Ausente = back anterior. */
  aprobadoPorNombre?: string | null;
  /** Quién registró la devolución abierta de este giro (23-09). */
  devolucionRegistradaPor?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  transferReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: Array<
    {
      cobroId: string | null;
      cuotaId?: string | null;
      propertyTitle: string;
      rentCollected: number;
      commissionPercent: number;
      commissionAmount: number;
      ivaComisionAmount?: number;
      retencionesComisionAmount?: number;
      netAmount: number;
      conceptosAFavor?: number;
      conceptosACargo?: number;
      deTerceros?: number;
    } & Pick<
      DispersionItem,
      'modalidad' | 'fuenteDeLaModalidad' | 'mesDeLaCuota' | 'sinRecaudoCop' | 'interesDelRecibo'
    >
  >;
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
 * El camino de vuelta: el estado de la VISTA, con el nombre que guarda el back.
 *
 * ⚠️ La pestaña «Pendientes» de Dispersiones mandaba `status=pending` tal cual
 * y el back —que sólo conoce `DISP_PENDING | PROCESSING | DISP_COMPLETED |
 * FAILED`— respondía 500 (referencia 500-1844). El back ya acepta los dos
 * nombres, pero se manda el del enum: es el único que entiende también un back
 * desplegado antes del arreglo.
 *
 * Un valor que no es de la vista se manda tal cual: si es basura, el back
 * contesta 400 con la lista de los válidos, que es más honesto que adivinar.
 */
const ESTADOS_DEL_BACK: Record<DispersionStatus, string> = {
  pending: 'DISP_PENDING',
  processing: 'PROCESSING',
  completed: 'DISP_COMPLETED',
  failed: 'FAILED',
};

export function estadoParaElBack(status: string): string {
  return ESTADOS_DEL_BACK[status as DispersionStatus] ?? status;
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
  > &
    Partial<
      Pick<DispersionDelBack, 'propietarioBankAccountType' | 'propietarioBankAccountHolder' | 'titularDeLaCuenta'>
    >,
): PropietarioBankAccount | null {
  if (!d.propietarioBankAccount) return null;
  return {
    bank: (d.propietarioBankName ?? '') as PropietarioBankAccount['bank'],
    // Sin el tipo del back se deja en blanco en vez de suponer uno: sería
    // inventar el destino de un giro.
    accountType: tipoDeCuenta(d.propietarioBankAccountType) as PropietarioBankAccount['accountType'],
    accountNumber: d.propietarioBankAccount,
    /*
     * 🔴 QA 22-09: el cajón decía «Titular: Luisa Fernanda Echeverri» —la
     * propietaria— de una cuenta cuyo titular es otra persona («la cuenta es de
     * la esposa»). El titular no se deduce del propietario: si el back no lo
     * manda, queda vacío y el cajón dice «—».
     */
    accountHolder: d.titularDeLaCuenta?.nombre?.trim() || d.propietarioBankAccountHolder?.trim() || '',
    // El documento del titular del giro, cuando el back lo manda.
    ...(d.titularDeLaCuenta?.numeroDocumento ? { accountHolderDocument: d.titularDeLaCuenta.numeroDocumento } : {}),
  };
}

/** «Ahorros»/«savings» → savings; «Corriente»/«checking» → checking; lo demás, vacío. */
function tipoDeCuenta(crudo: string | null | undefined): '' | 'savings' | 'checking' {
  const t = (crudo ?? '').trim().toLowerCase();
  if (t === 'savings' || t.startsWith('ahorro')) return 'savings';
  if (t === 'checking' || t.startsWith('corriente')) return 'checking';
  return '';
}

export function adaptarDispersion(d: DispersionDelBack): Dispersion {
  return {
    id: d.id,
    propietarioId: d.propietarioId,
    propietarioName: d.propietarioName,
    propietarioBankAccount: cuentaDelPropietario(d),
    // Tal cual: ausente = back anterior; la pantalla dice «—».
    ...(d.titularDeLaCuenta !== undefined ? { titularDeLaCuenta: d.titularDeLaCuenta } : {}),
    ...(d.repartoDeLaCuenta ? { repartoDeLaCuenta: d.repartoDeLaCuenta } : {}),
    ...(d.origenDelGiro ? { origenDelGiro: d.origenDelGiro } : {}),
    month: d.month,
    items: (d.items ?? []).map((i) => ({
      cobroId: i.cobroId,
      cuotaId: i.cuotaId ?? null,
      propertyTitle: i.propertyTitle,
      rentCollected: i.rentCollected,
      commissionPercent: i.commissionPercent,
      commissionAmount: i.commissionAmount,
      ivaComisionAmount: i.ivaComisionAmount ?? 0,
      retencionesComisionAmount: i.retencionesComisionAmount ?? 0,
      netAmount: i.netAmount,
      conceptosAFavor: i.conceptosAFavor ?? 0,
      conceptosACargo: i.conceptosACargo ?? 0,
      deTerceros: i.deTerceros ?? 0,
      // D1/D2 tal cual: ausentes en las dispersiones viejas, y ausente no es
      // cero —es «esta dispersión no sabe de modalidad»—, así que no se rellena.
      ...(i.modalidad !== undefined ? { modalidad: i.modalidad } : {}),
      ...(i.fuenteDeLaModalidad !== undefined
        ? { fuenteDeLaModalidad: i.fuenteDeLaModalidad }
        : {}),
      ...(i.mesDeLaCuota !== undefined ? { mesDeLaCuota: i.mesDeLaCuota } : {}),
      ...(i.sinRecaudoCop !== undefined ? { sinRecaudoCop: i.sinRecaudoCop } : {}),
      ...(i.interesDelRecibo !== undefined
        ? { interesDelRecibo: i.interesDelRecibo }
        : {}),
    })),
    // 🔴 Sin esto la pantalla decía «Recaudado» sobre el canon causado.
    baseDelCanon: baseDeLaDispersion(d),
    totalCollected: d.totalCollected,
    totalCommission: d.totalCommission,
    totalIvaComision: d.totalIvaComision ?? 0,
    totalRetencionesComision: d.totalRetencionesComision ?? 0,
    avisoDelIvaDeLaComision: d.avisoDelIvaDeLaComision ?? null,
    totalConceptosAFavor: d.totalConceptosAFavor ?? 0,
    totalConceptosACargo: d.totalConceptosACargo ?? 0,
    totalDeTerceros: d.totalDeTerceros ?? 0,
    netToPropietario: d.netToPropietario,
    // Tal cual: la cuenta es del back. Ausente = back viejo = sin deducciones.
    ...(d.conDeducciones ? { conDeducciones: d.conDeducciones } : {}),
    ...(d.cuentaPorCobrarAlInquilinoCop !== undefined
      ? { cuentaPorCobrarAlInquilinoCop: d.cuentaPorCobrarAlInquilinoCop }
      : {}),
    ...(d.interesesCop !== undefined ? { interesesCop: d.interesesCop } : {}),
    status: estadoDeDispersion(d.status),
    approvedBy: d.approvedBy ?? undefined,
    ...(d.aprobadoPorNombre ? { approvedByName: d.aprobadoPorNombre } : {}),
    ...(d.devolucionRegistradaPor ? { devolucionRegistradaPor: d.devolucionRegistradaPor } : {}),
    approvedAt: d.approvedAt ?? undefined,
    processedAt: d.processedAt ?? undefined,
    transferReference: d.transferReference ?? undefined,
    failureReason: d.failureReason ?? undefined,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}
