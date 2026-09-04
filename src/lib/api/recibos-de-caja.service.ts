/**
 * Recibos de caja — `/inmobiliaria/recibos-de-caja`.
 *
 * Sigue el patrón de `inmobiliaria.service.ts`: `apiClient` + un cuerpo armado
 * clave por clave.
 *
 * 🔴 Por qué los cuerpos se arman a mano y no con un spread del objeto que
 * llega: el back valida con `forbidNonWhitelisted: true`, así que una clave de
 * más no se ignora — devuelve 400. Un spread deja pasar cualquier cosa que el
 * componente traiga de más (un `id` de React, un campo del formulario que
 * cambió de nombre) y eso sale como un 400 en producción con la suite en verde.
 * `recibos-de-caja.service.test.ts` fija el juego exacto de claves de cada DTO.
 *
 * 🔴 `invalidar('cobros')`: la ruta de estos endpoints es `recibos-de-caja`, así
 * que el aviso automático del cliente (`invalidar(recursoDe(path))`) despierta a
 * un recurso que nadie escucha. Lo que de verdad cambió es el cobro — y con él
 * la cartera y las dispersiones, por `TAMBIEN_TOCA`. Sin esta línea, emitís un
 * recibo y la tabla de cobros sigue mostrando el saldo viejo.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';
import { normalizeCobro } from './inmobiliaria.service';
import type {
  CobroConDesglose,
  ConciliacionDePagoAnterior,
  FiltrosDeRecibos,
  NuevoReciboDeCaja,
  ReciboDeCaja,
  RespuestaDeRecibo,
} from './recibos-de-caja.types';

const BASE = '/inmobiliaria/recibos-de-caja';

/**
 * El back devuelve, según el endpoint, o el arreglo pelado o `{ data: [...] }`.
 * Mismo criterio que `cobrosApi.getAll`.
 */
function comoLista(res: ReciboDeCaja[] | { data: ReciboDeCaja[] } | null): ReciboDeCaja[] {
  if (Array.isArray(res)) return res;
  return res?.data ?? [];
}

/** El cobro recompuesto llega con los enums en mayúscula, como toda fila del back. */
function normalizarRespuesta(res: RespuestaDeRecibo): RespuestaDeRecibo {
  return {
    recibo: res.recibo,
    cobro: normalizeCobro(res.cobro) as CobroConDesglose,
  };
}

export const recibosDeCajaApi = {
  /**
   * Emitir un recibo de caja contra un cobro.
   *
   * Devuelve el recibo y el cobro ya recompuesto: con eso se refresca la fila
   * sin volver a pedir el detalle.
   *
   * Puede fallar con:
   *   - 400 y el máximo abonable en el mensaje, si el monto se pasa del saldo.
   *   - 409 si el cobro tiene `paidAmount` por encima de la suma de sus
   *     recibos — plata vieja que nunca pasó por un recibo. Ahí toca
   *     `conciliar` primero.
   */
  async crear(nuevo: NuevoReciboDeCaja): Promise<RespuestaDeRecibo> {
    const cuerpo: Record<string, unknown> = {
      cobroId: nuevo.cobroId,
      valorCop: nuevo.valorCop,
      medio: nuevo.medio,
    };
    if (nuevo.fecha) cuerpo.fecha = nuevo.fecha;
    if (nuevo.referencia) cuerpo.referencia = nuevo.referencia;
    if (nuevo.notas) cuerpo.notas = nuevo.notas;

    const res = await apiClient.post<RespuestaDeRecibo>(BASE, cuerpo);
    invalidar('cobros');
    return normalizarRespuesta(res);
  },

  /** Los recibos de la inmobiliaria, filtrables. Por defecto, sólo los vivos. */
  async listar(filtros?: FiltrosDeRecibos): Promise<ReciboDeCaja[]> {
    const query = new URLSearchParams();
    if (filtros?.desde) query.set('desde', filtros.desde);
    if (filtros?.hasta) query.set('hasta', filtros.hasta);
    if (filtros?.medio) query.set('medio', filtros.medio);
    if (filtros?.referencia) query.set('referencia', filtros.referencia);
    if (filtros?.incluirAnulados !== undefined) {
      query.set('incluirAnulados', String(filtros.incluirAnulados));
    }
    const qs = query.toString();
    const res = await apiClient.get<ReciboDeCaja[] | { data: ReciboDeCaja[] }>(
      `${BASE}${qs ? `?${qs}` : ''}`,
    );
    return comoLista(res);
  },

  /** Los recibos de UN cobro — el historial de abonos que ve la pantalla. */
  async porCobro(cobroId: string): Promise<ReciboDeCaja[]> {
    const res = await apiClient.get<ReciboDeCaja[] | { data: ReciboDeCaja[] }>(
      `${BASE}/por-cobro/${cobroId}`,
    );
    return comoLista(res);
  },

  /**
   * Anular un recibo. El motivo es obligatorio.
   *
   * El recibo no se borra: vuelve con `anuladoAt` y esa plata regresa al saldo
   * del cobro. Por eso también vuelve el cobro recompuesto.
   */
  async anular(id: string, motivo: string): Promise<RespuestaDeRecibo> {
    const res = await apiClient.put<RespuestaDeRecibo>(`${BASE}/${id}/anular`, { motivo });
    invalidar('cobros');
    return normalizarRespuesta(res);
  },

  /**
   * Cuadrar la plata vieja de un cobro: emite un recibo por la diferencia entre
   * lo que el cobro dice recibido y lo que sus recibos cubren.
   *
   * Le pasa a TODO cobro anterior al recibo de caja y a los pagados por PSE.
   * Hasta que se concilie, el back rechaza cualquier abono nuevo con 409.
   */
  async conciliar(
    cobroId: string,
    datos: ConciliacionDePagoAnterior,
  ): Promise<RespuestaDeRecibo> {
    const cuerpo: Record<string, unknown> = { origen: datos.origen };
    if (datos.medio) cuerpo.medio = datos.medio;
    if (datos.referencia) cuerpo.referencia = datos.referencia;
    if (datos.notas) cuerpo.notas = datos.notas;

    const res = await apiClient.post<RespuestaDeRecibo>(`${BASE}/conciliar/${cobroId}`, cuerpo);
    invalidar('cobros');
    return normalizarRespuesta(res);
  },
};

export type {
  CobroConDesglose,
  ConceptoDelCobro,
  ConciliacionDePagoAnterior,
  FiltrosDeRecibos,
  NuevoReciboDeCaja,
  ReciboDeCaja,
  RespuestaDeRecibo,
  TipoDeConcepto,
} from './recibos-de-caja.types';
