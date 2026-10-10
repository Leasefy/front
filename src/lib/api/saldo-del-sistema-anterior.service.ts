/**
 * «Saldo del sistema anterior recaudado» contra el back (Nico, 10-10-2026).
 *
 * Una sola puerta: ninguna pantalla arma esta ruta a mano.
 */

import { apiClient } from '@/lib/api/client'

/** Una fila: un contrato con saldo del sistema anterior. */
export interface FilaDelSaldoAnterior {
  contractId: string
  /** El consecutivo del sistema anterior, o el de Leasefy. */
  contrato: string | null
  inquilino: string | null
  inmueble: string | null
  propietario: string | null
  /** `YYYY-MM`: el mes de antes del corte donde quedó el saldo. */
  mes: string
  saldoCop: number
  recaudadoCop: number
  pendienteCop: number
}

export interface SaldoDelSistemaAnterior {
  aviso: string
  totales: {
    contratos: number
    conRecaudo: number
    saldoCop: number
    recaudadoCop: number
    pendienteCop: number
  }
  /** Primero lo ya recaudado, de mayor a menor. */
  filas: FilaDelSaldoAnterior[]
}

export const saldoDelSistemaAnteriorApi = {
  async lista(): Promise<SaldoDelSistemaAnterior> {
    return apiClient.get<SaldoDelSistemaAnterior>('/inmobiliaria/cartera/saldo-del-sistema-anterior')
  },
}
