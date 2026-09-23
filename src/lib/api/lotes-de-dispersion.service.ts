/**
 * Lotes de pagos a propietarios — `/inmobiliaria/lotes-de-dispersion`.
 *
 * ⚠️ La ruta base NO cuelga de `/inmobiliaria/dispersiones`: el controller de
 * dispersiones tiene un `GET :id` con `ParseUUIDPipe`, y `GET .../lotes`
 * entraría ahí como `id="lotes"` → 400. El back lo separó a propósito; acá se
 * respeta y el test lo fija.
 *
 * Los cuerpos se arman clave por clave (mismo motivo que en
 * `recibos-de-caja.service.ts`): el back valida con `forbidNonWhitelisted`, una
 * clave de más es un 400.
 *
 * `invalidar('dispersiones')`: un lote toma dispersiones pendientes y las
 * compromete; la lista de dispersiones tiene que enterarse aunque la ruta que
 * se tocó se llame distinto.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';
import { anunciarProceso } from './procesos.service';
import type {
  ArchivoGenerado,
  BancosParaGirar,
  CandidatosDeDispersion,
  FiltrosDeLotes,
  FormatoArchivoDePagos,
  LoteArmado,
  LoteDeDispersion,
  LoteResumen,
  OrdenDeCandidatos,
  QueMeterEnElLote,
  SolicitudDeAprobacion,
  VistaDelLote,
} from './lotes-de-dispersion.types';

export const BASE_DE_LOTES = '/inmobiliaria/lotes-de-dispersion';

/** El recurso que escuchan las pantallas de lotes (`useRefrescoAutomatico`). */
export const RECURSO_DE_LOTES = 'lotes-de-dispersion';

/** El back devuelve, según el endpoint, o el arreglo pelado o `{ data: [...] }`. */
function comoLista<T>(res: T[] | { data: T[] } | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

export const lotesDeDispersionApi = {
  /**
   * Arma el lote del mes con las dispersiones pendientes.
   *
   * Falla con 400 si no hay pendientes o si ya están todas en un lote vivo.
   * Las que no tienen la cuenta completa ENTRAN igual, con su motivo: por eso
   * la respuesta trae `excluidos`.
   */
  async armar(que: QueMeterEnElLote): Promise<LoteArmado> {
    // Clave por clave: el back valida con `forbidNonWhitelisted` y un
    // `topeCop: undefined` en el cuerpo también es una clave de más.
    const cuerpo: Record<string, unknown> = { month: que.month };
    if (que.dispersionIds?.length) cuerpo.dispersionIds = que.dispersionIds;
    if (que.orden) cuerpo.orden = que.orden;
    if (que.topeCop !== undefined) cuerpo.topeCop = que.topeCop;
    if (que.origen) {
      cuerpo.origen = {
        banco: que.origen.banco,
        tipoDeCuenta: que.origen.tipoDeCuenta,
        numeroDeCuenta: que.origen.numeroDeCuenta,
      };
    }
    const res = await apiClient.post<LoteArmado>(BASE_DE_LOTES, cuerpo);
    invalidar('dispersiones');
    return res;
  },

  /**
   * A quién le puedo pagar hoy: ordenado, sumando y con hasta dónde alcanza.
   *
   * Sin `month` trae las pendientes de TODOS los meses — a un propietario al
   * que se le debe agosto y septiembre se le paga junto.
   *
   * `entraEnElCupo` es informativo: se puede girar por encima de la plata
   * disponible y el exceso queda como descubierto del lote.
   */
  async candidatos(filtros?: {
    month?: string;
    orden?: OrdenDeCandidatos;
    topeCop?: number;
  }): Promise<CandidatosDeDispersion> {
    const query = new URLSearchParams();
    if (filtros?.month) query.set('month', filtros.month);
    if (filtros?.orden) query.set('orden', filtros.orden);
    if (filtros?.topeCop !== undefined) query.set('topeCop', String(filtros.topeCop));
    const qs = query.toString();
    return apiClient.get<CandidatosDeDispersion>(
      `${BASE_DE_LOTES}/candidatos${qs ? `?${qs}` : ''}`,
    );
  },

  /**
   * «¿Desde qué banco vas a dispersar?»: los bancos (con su formato o el motivo
   * de por qué todavía no), las cuentas ya registradas y la última elección.
   */
  async bancos(): Promise<BancosParaGirar> {
    return apiClient.get<BancosParaGirar>(`${BASE_DE_LOTES}/bancos`);
  },

  async listar(filtros?: FiltrosDeLotes): Promise<LoteResumen[]> {
    const query = new URLSearchParams();
    if (filtros?.month) query.set('month', filtros.month);
    if (filtros?.estado) query.set('estado', filtros.estado);
    const qs = query.toString();
    const res = await apiClient.get<LoteResumen[] | { data: LoteResumen[] }>(
      `${BASE_DE_LOTES}${qs ? `?${qs}` : ''}`,
    );
    return comoLista(res);
  },

  async ver(id: string): Promise<VistaDelLote> {
    return apiClient.get<VistaDelLote>(`${BASE_DE_LOTES}/${id}`);
  },

  /**
   * Manda el lote a aprobación. Si el monto lo exige, el back emite el código
   * y lo manda POR CORREO a quienes pueden aprobar; acá vuelven los correos
   * tapados y hasta cuándo vale.
   */
  async solicitarAprobacion(id: string): Promise<SolicitudDeAprobacion> {
    return apiClient.post<SolicitudDeAprobacion>(`${BASE_DE_LOTES}/${id}/solicitar-aprobacion`);
  },

  /**
   * Aprueba el lote. Tiene que ser OTRA persona que la que lo armó.
   *
   * `codigo` sólo cuando el lote lo exige; se manda si viene, y nada más —
   * un `codigo: undefined` en el cuerpo también sería una clave de más.
   */
  async aprobar(id: string, codigo?: string): Promise<LoteDeDispersion> {
    const cuerpo: Record<string, unknown> = {};
    const limpio = codigo?.trim();
    if (limpio) cuerpo.codigo = limpio;
    const res = await apiClient.post<LoteDeDispersion>(`${BASE_DE_LOTES}/${id}/aprobar`, cuerpo);
    invalidar('dispersiones');
    return res;
  },

  /**
   * Genera el archivo plano (desde APROBADO) o vuelve a entregar el MISMO
   * (desde ARCHIVO_GENERADO, `reenvio: true`, cotejando el hash).
   *
   * El formato es el del banco elegido al armar el lote; `formato` queda por
   * compatibilidad y el back responde 400 si no coincide.
   */
  async generarArchivo(id: string, formato?: FormatoArchivoDePagos): Promise<ArchivoGenerado> {
    const cuerpo: Record<string, unknown> = {};
    if (formato) cuerpo.formato = formato;
    // El archivo queda en el centro de procesos (22-09).
    anunciarProceso();
    const res = await apiClient.post<ArchivoGenerado>(`${BASE_DE_LOTES}/${id}/archivo`, cuerpo);
    invalidar('dispersiones');
    return res;
  },

  /**
   * Baja el archivo ya generado, tal cual se sube al banco.
   *
   * Sólo desde ARCHIVO_GENERADO: el back responde 400 en cualquier otro
   * estado, porque un GET no puede avanzar un lote de pagos.
   */
  async descargarArchivo(id: string): Promise<Blob> {
    return apiClient.getBlob(`${BASE_DE_LOTES}/${id}/archivo`);
  },

  /**
   * Marca el lote pagado por el banco.
   *
   * 🔴 `facturarAhora: true` EMITE las facturas del lado propietario (la
   * comisión de la inmobiliaria y sus impuestos) de las cuotas que el lote
   * giró. El resultado viene en `lote.facturacion`: cuántas se emitieron,
   * cuántas ya estaban y qué falló. Un fallo ahí NO deshace el pago — la plata
   * ya salió del banco y el lote queda PAGADO igual.
   *
   * Con `false` la comisión queda como prefactura pendiente y se emite desde
   * Facturación. Se manda sólo si se decidió: `undefined` sería clave de más
   * (el back monta el `ValidationPipe` con `forbidNonWhitelisted`).
   */
  async marcarPagado(
    id: string,
    referenciaBanco: string,
    facturarAhora?: boolean,
  ): Promise<LoteDeDispersion> {
    const cuerpo: Record<string, unknown> = { referenciaBanco: referenciaBanco.trim() };
    if (facturarAhora !== undefined) cuerpo.facturarAhora = facturarAhora;
    const res = await apiClient.post<LoteDeDispersion>(`${BASE_DE_LOTES}/${id}/pagado`, cuerpo);
    invalidar('dispersiones');
    return res;
  },

  /** Anula el lote. El motivo es obligatorio (5 a 300 caracteres, lo exige el back). */
  async anular(id: string, motivo: string): Promise<LoteDeDispersion> {
    const res = await apiClient.post<LoteDeDispersion>(`${BASE_DE_LOTES}/${id}/anular`, {
      motivo: motivo.trim(),
    });
    invalidar('dispersiones');
    return res;
  },
};

export type {
  ArchivoGenerado,
  BancoDeOrigen,
  BancosParaGirar,
  CandidatoDeDispersion,
  CuentaRegistrada,
  FuenteDelFormato,
  OrigenDelLote,
  OrigenPedido,
  TipoDeCuentaDeOrigen,
  CandidatosDeDispersion,
  EstadoDelLote,
  ExtractosDeLosCompensados,
  FacturacionDelLote,
  FilaCompensada,
  FilaExcluida,
  FiltrosDeLotes,
  FormatoArchivoDePagos,
  ItemDelLote,
  LoteArmado,
  LoteDeDispersion,
  LoteResumen,
  OrdenDeCandidatos,
  PlataDisponible,
  QueMeterEnElLote,
  SolicitudDeAprobacion,
  VistaDelLote,
} from './lotes-de-dispersion.types';
