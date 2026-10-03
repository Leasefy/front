/**
 * Conciliación bancaria — `/inmobiliaria/conciliacion-bancaria`.
 *
 * Mismo patrón que `recibos-de-caja.service.ts`: `apiClient` y cuerpos armados
 * clave por clave (el back corre con `forbidNonWhitelisted`, una clave de más
 * es un 400). Conciliar EMITE un recibo de caja: por eso cada mutación
 * despierta a `cobros`, que es lo que de verdad cambió.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';
import type {
  DestinoDeConciliacion,
  DiferenciaConfigurada,
  DiferenciasConocidasDeLaInmobiliaria,
  FilaDeExtracto,
  FiltrosDeMovimientos,
  LoteActual,
  LoteDeConciliacion,
  MovimientoBancario,
  PaginaDeMovimientos,
  ResultadoDeCarga,
  ResultadoDeConciliar,
  ResultadoDeConciliarConRecibos,
  ResultadoDeSeguros,
  RespuestaRecibosQueSuman,
  ResumenDeConciliacion,
} from './conciliacion-bancaria.types';

const BASE = '/inmobiliaria/conciliacion-bancaria';

function conQuery(path: string, params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/**
 * Una diferencia configurada, con las claves EXACTAS del DTO: la retención va
 * con `porcentaje` y la comisión con `valorCop`, nunca las dos (el back
 * responde 400 `DIFERENCIA_MAL_ARMADA`). El nombre va sin espacios de sobra.
 */
export function diferenciaParaElBack(d: DiferenciaConfigurada): Record<string, unknown> {
  return d.tipo === 'RETENCION'
    ? { nombre: d.nombre.trim(), tipo: d.tipo, porcentaje: d.porcentaje, aQuien: d.aQuien }
    : { nombre: d.nombre.trim(), tipo: d.tipo, valorCop: d.valorCop, aQuien: d.aQuien };
}

/** Sólo las claves del DTO, sin `undefined`: `referencia` vacía no viaja. */
export function filaParaElBack(fila: FilaDeExtracto): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {
    fecha: fila.fecha,
    valorCop: fila.valorCop,
    descripcion: fila.descripcion,
  };
  if (fila.referencia) cuerpo.referencia = fila.referencia;
  return cuerpo;
}

export const conciliacionBancariaApi = {
  /**
   * 🔴 `cuentaBancaria` (18-09-2026) es lo que le permite al back impedir que el
   * mismo pago entre por el extracto Y por el archivo de recaudo del convenio.
   * Va sólo si se sabe: sin ella el extracto entra como siempre y la respuesta
   * avisa que no se pudo proteger.
   */
  async cargarExtracto(
    nombreArchivo: string,
    filas: FilaDeExtracto[],
    cuentaBancaria?: string,
  ): Promise<ResultadoDeCarga> {
    const cuerpo: Record<string, unknown> = {
      nombreArchivo,
      filas: filas.map(filaParaElBack),
    };
    if (cuentaBancaria) cuerpo.cuentaBancaria = cuentaBancaria;
    const res = await apiClient.post<ResultadoDeCarga>(`${BASE}/extracto`, cuerpo);
    invalidar('cobros');
    return res;
  },

  async listar(filtros: FiltrosDeMovimientos = {}): Promise<PaginaDeMovimientos> {
    return apiClient.get<PaginaDeMovimientos>(
      conQuery(`${BASE}/movimientos`, {
        estado: filtros.estado,
        desde: filtros.desde,
        hasta: filtros.hasta,
        limite: filtros.limite,
        desplazamiento: filtros.desplazamiento,
      }),
    );
  },

  async resumen(): Promise<ResumenDeConciliacion> {
    return apiClient.get<ResumenDeConciliacion>(`${BASE}/resumen`);
  },

  /**
   * Concilia una línea del banco contra un cobro (el atajo) o contra un CLIENTE
   * (el camino completo: deuda más vieja primero, mes en curso al vuelo y
   * sobrante a favor).
   *
   * 🔴 El cuerpo lleva EXACTAMENTE una de las dos claves: el back valida con
   * `forbidNonWhitelisted` y mandar las dos es un 400 con la petición entera
   * rechazada. Por eso se arma desde el destino y no con un spread.
   */
  async conciliar(
    movimientoId: string,
    destino: DestinoDeConciliacion,
  ): Promise<ResultadoDeConciliar> {
    const cuerpo =
      'cobroId' in destino ? { cobroId: destino.cobroId } : { tenantId: destino.tenantId };
    const res = await apiClient.post<ResultadoDeConciliar>(
      `${BASE}/movimientos/${movimientoId}/conciliar`,
      cuerpo,
    );
    invalidar('cobros');
    return res;
  },

  // ── Muchos a uno: un movimiento = la suma de VARIOS recibos (02-10-2026) ──

  /** Las combinaciones de recibos ya emitidos que suman este movimiento (máx. 3). */
  async recibosQueSuman(movimientoId: string): Promise<RespuestaRecibosQueSuman> {
    return apiClient.get<RespuestaRecibosQueSuman>(
      `${BASE}/movimientos/${movimientoId}/recibos-que-suman`,
    );
  },

  /**
   * VINCULA el movimiento con esos recibos y lo deja conciliado. No emite
   * recibos (ya existen). El back re-verifica todo: que la suma calce (o la
   * explique una regla conocida) y que ningún recibo ya esté respaldado.
   * El cuerpo lleva sólo `reciboIds` (`forbidNonWhitelisted`).
   */
  async conciliarConRecibos(
    movimientoId: string,
    reciboIds: string[],
  ): Promise<ResultadoDeConciliarConRecibos> {
    const res = await apiClient.post<ResultadoDeConciliarConRecibos>(
      `${BASE}/movimientos/${movimientoId}/conciliar-con-recibos`,
      { reciboIds: [...reciboIds] },
    );
    invalidar('cobros');
    return res;
  },

  /** Las retenciones y comisiones que reconoce la inmobiliaria, y el 4×1000 de ley. */
  async diferenciasConocidas(): Promise<DiferenciasConocidasDeLaInmobiliaria> {
    return apiClient.get<DiferenciasConocidasDeLaInmobiliaria>(`${BASE}/diferencias-conocidas`);
  },

  /** Reemplaza TODAS las diferencias configuradas (0..`maximo`). */
  async guardarDiferenciasConocidas(
    diferencias: DiferenciaConfigurada[],
  ): Promise<DiferenciasConocidasDeLaInmobiliaria> {
    return apiClient.put<DiferenciasConocidasDeLaInmobiliaria>(`${BASE}/diferencias-conocidas`, {
      diferencias: diferencias.map(diferenciaParaElBack),
    });
  },

  async ignorar(movimientoId: string, motivo: string): Promise<MovimientoBancario> {
    return apiClient.post<MovimientoBancario>(`${BASE}/movimientos/${movimientoId}/ignorar`, {
      motivo,
    });
  },

  async reabrir(movimientoId: string): Promise<MovimientoBancario> {
    return apiClient.post<MovimientoBancario>(`${BASE}/movimientos/${movimientoId}/reabrir`, {});
  },

  async conciliarSeguros(): Promise<ResultadoDeSeguros> {
    const res = await apiClient.post<ResultadoDeSeguros>(`${BASE}/conciliar-seguros`, {});
    invalidar('cobros');
    return res;
  },

  // ── El lote de lo que calza EXACTO (17-09-2026) ───────────────────────────

  /** El lote propuesto (esperando aprobación) y los últimos aprobados o reversados. */
  async loteActual(): Promise<LoteActual> {
    return apiClient.get<LoteActual>(`${BASE}/lotes/actual`);
  },

  /** Arma (o rearma) el lote de lo que calza exacto. No emite recibos. `null` si nada calza. */
  async armarLote(): Promise<LoteDeConciliacion | null> {
    return apiClient.post<LoteDeConciliacion | null>(`${BASE}/lotes`, {});
  },

  /** Un funcionario aprueba el lote de una vez: ahí se emiten los recibos. */
  async aprobarLote(loteId: string): Promise<LoteDeConciliacion> {
    const res = await apiClient.post<LoteDeConciliacion>(`${BASE}/lotes/${loteId}/aprobar`, {});
    invalidar('cobros');
    return res;
  },

  /** Sólo un administrador, con motivo: anula los recibos que emitió el lote. */
  async reversarLote(loteId: string, motivo: string): Promise<LoteDeConciliacion> {
    const res = await apiClient.post<LoteDeConciliacion>(`${BASE}/lotes/${loteId}/reversar`, {
      motivo,
    });
    invalidar('cobros');
    return res;
  },
};
