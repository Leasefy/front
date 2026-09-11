/**
 * reconciliarLoteCompleto — recorre `POST migrar/reconciliar` hasta dar UNA
 * vuelta completa por las filas pendientes del lote de contratos.
 *
 * Es lo que hace que los contratos encuentren su inmueble cuando el archivo
 * de inmuebles se cargó DESPUÉS del de contratos (el orden real: contratos
 * primero porque es el archivo que la inmobiliaria tiene a mano). La
 * resolución que corrió al preparar vio un portafolio vacío y quedó
 * guardada; esto la vuelve a correr contra lo que hay hoy.
 *
 * Mismo bucle que `revisarLoteCompleto` en inmuebles, por la misma razón: una
 * fila que sigue pendiente por un motivo real queda pendiente después de
 * mirarla, así que «mientras queden pendientes» no termina nunca. El back
 * devuelve un cursor y `terminado`; acá se avanza con el cursor y se para
 * cuando el back lo dice.
 */

import type { ResultadoReconciliacion } from '@/lib/api/contracts.service';

export interface ProgresoDeReconciliacion {
  /** Filas miradas hasta ahora, sumando las llamadas. */
  revisadas: number;
  /** Cuántas encontraron su inmueble en esta vuelta. */
  inmueblesVinculados: number;
  /** Cuántas quedaron consignadas a un propietario en esta vuelta. */
  propietariosVinculados: number;
  /** Cuántas quedaron LISTAS en esta vuelta. */
  listas: number;
  llamadas: number;
}

export interface ResultadoReconciliacionCompleta extends ProgresoDeReconciliacion {
  fallidas: number;
  /** El último seguro contra un back que nunca diga `terminado`. */
  detenidoPorLimite: boolean;
  /** El cursor no avanzó (un back viejo sin cursor incluido): se corta y se dice. */
  detenidoSinAvance: boolean;
  /** La persona tocó «Detener»: se paró después de la llamada en curso. */
  detenidoPorPersona: boolean;
}

/** ~30 filas por llamada contra la base remota: un lote de 5.000 son ~170. */
const MAX_LLAMADAS = 1_000;

export async function reconciliarLoteCompleto(
  lote: string,
  reconciliar: (lote: string, desdeFila: number) => Promise<ResultadoReconciliacion>,
  onProgreso?: (progreso: ProgresoDeReconciliacion) => void,
  opciones: { debeParar?: () => boolean } = {},
): Promise<ResultadoReconciliacionCompleta> {
  let desdeFila = 0;
  const acumulado: ProgresoDeReconciliacion = {
    revisadas: 0,
    inmueblesVinculados: 0,
    propietariosVinculados: 0,
    listas: 0,
    llamadas: 0,
  };
  let fallidas = 0;
  const cerrar = (
    extra: Partial<Pick<ResultadoReconciliacionCompleta, 'detenidoPorLimite' | 'detenidoSinAvance' | 'detenidoPorPersona'>>,
  ): ResultadoReconciliacionCompleta => ({
    ...acumulado,
    fallidas,
    detenidoPorLimite: false,
    detenidoSinAvance: false,
    detenidoPorPersona: false,
    ...extra,
  });

  for (;;) {
    const r = await reconciliar(lote, desdeFila);
    acumulado.llamadas += 1;
    acumulado.revisadas += r.revisadas;
    acumulado.inmueblesVinculados += r.inmueblesVinculados;
    acumulado.propietariosVinculados += r.propietariosVinculados;
    acumulado.listas += r.listas;
    fallidas += r.fallidas?.length ?? 0;
    onProgreso?.({ ...acumulado });

    if (opciones.debeParar?.() === true) return cerrar({ detenidoPorPersona: true });
    if (r.terminado === true || r.revisadas === 0) return cerrar({});
    if (typeof r.ultimaFila !== 'number' || r.ultimaFila <= desdeFila) {
      return cerrar({ detenidoSinAvance: true });
    }
    desdeFila = r.ultimaFila;
    if (acumulado.llamadas >= MAX_LLAMADAS) return cerrar({ detenidoPorLimite: true });
  }
}
