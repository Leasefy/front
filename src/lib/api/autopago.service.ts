/**
 * Autopago del canon (la domiciliación), contra el back que YA existe.
 *
 * 🔴 ESTE ARCHIVO ERA UN CONTRATO SIN BACK — el segundo que apareció, y de los
 * cuatro huecos de la matriz de competencia el que más plata mueve. Declaraba
 * `/tenant-payments/autopago` con tipos, manejo de errores y pantalla, y decía
 * en su encabezado «CONTRACT ONLY (no backend today)». Se construyó el
 * 21-09-2026 (`back-erp/src/tenant-payments/autopago/`) y ahora habla con rutas
 * que existen: `/portal/autopago`.
 *
 * ── Lo que cambió del contrato viejo, y por qué ─────────────────────────────
 *
 *   · **Se llavea por CONTRATO, no por arriendo.** La deuda nace con el
 *     contrato y vive en sus cuotas (Nico, 15-09); un `Lease` puede no existir
 *     en un contrato migrado. El arriendo trae su `contractId`.
 *   · **El tope es obligatorio.** Un cobro automático sin techo es un cheque en
 *     blanco. La pantalla lo pide y el back lo exige.
 *   · **El día se limita a 1-28.** Ningún febrero tiene 30.
 *   · **La autorización tiene TEXTO, y lo manda el servidor.** El front no
 *     puede decidir qué se está autorizando: pide el texto, lo muestra, y lo
 *     devuelve tal cual con la autorización, que es lo que queda guardado.
 *
 * ── 🔴 El número de la tarjeta NO pasa por nuestro back ────────────────────
 *
 * Lo tokeniza el navegador contra Wompi con la LLAVE PÚBLICA. Lo que viaja a
 * nuestro servidor es el token. La contrapartida está escrita en el back
 * (`AutopagoService.comoSeTokeniza`): esto deja el alcance PCI en una
 * integración directa, y bajarlo más exige el widget en iframe de Wompi — una
 * decisión de negocio, no de código.
 */

import { apiClient } from './client';

export type MetodoDeAutopago = 'CARD' | 'NEQUI' | 'BANCOLOMBIA_TRANSFER';

export interface CobroDeAutopago {
  id: string;
  mes: string;
  montoCop: number;
  estado: string;
  motivo: string | null;
  intentadoAt: string;
}

export interface EstadoDelAutopago {
  /** ¿La función está disponible (migración aplicada y pasarela puesta)? */
  disponible: boolean;
  motivo: string | null;
  activo: boolean;
  autopago: {
    id: string;
    estado: 'ACTIVO' | 'PAUSADO' | 'CANCELADO';
    metodo: string;
    marca: string | null;
    /** «**** 4242». Para reconocer el medio, nada más. */
    medioEnmascarado: string | null;
    diaDelMes: number;
    topeCop: number;
    autorizadoAt: string;
    fallosSeguidos: number;
    ultimoCobroAt: string | null;
    proximoCobro: string | null;
  } | null;
  cobros: CobroDeAutopago[];
}

export interface ComoSeTokeniza {
  disponible: boolean;
  motivo: string | null;
  llavePublica: string | null;
  ambiente: 'sandbox' | 'production' | null;
  /** El texto exacto que la persona autoriza. Lo decide el servidor. */
  textoDeAutorizacion: string;
}

export interface ResultadoDelCobro {
  cobrado: boolean;
  cobroId: string | null;
  montoCop: number | null;
  estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'ERROR' | 'NO_SE_INTENTO';
  motivo: string | null;
  code: string | null;
}

/** Una tarjeta, tal como la escribe la persona. No sale de esta función. */
export interface TarjetaParaTokenizar {
  numero: string;
  cvc: string;
  mesDeVencimiento: string;
  anioDeVencimiento: string;
  nombreEnLaTarjeta: string;
}

/**
 * Tokeniza la tarjeta CONTRA WOMPI, desde el navegador.
 *
 * 🔴 Esta es la única función del front que ve un número de tarjeta, y lo manda
 * a Wompi y a nadie más. No lo guarda, no lo registra y no lo pasa por nuestro
 * back. Si alguna vez hay que auditar el alcance PCI, se audita ESTA función.
 */
export async function tokenizarTarjeta(
  llavePublica: string,
  ambiente: 'sandbox' | 'production',
  tarjeta: TarjetaParaTokenizar,
): Promise<string> {
  const host =
    ambiente === 'production' ? 'production.wompi.co' : 'sandbox.wompi.co';
  const res = await fetch(`https://${host}/v1/tokens/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${llavePublica}`,
    },
    body: JSON.stringify({
      number: tarjeta.numero.replace(/\s+/g, ''),
      cvc: tarjeta.cvc,
      exp_month: tarjeta.mesDeVencimiento,
      exp_year: tarjeta.anioDeVencimiento,
      card_holder: tarjeta.nombreEnLaTarjeta,
    }),
  });
  const json: unknown = await res.json().catch(() => null);
  const token = (json as { data?: { id?: string } } | null)?.data?.id;
  if (!res.ok || !token) {
    const mensaje =
      (json as { error?: { reason?: string } } | null)?.error?.reason ??
      'No pudimos validar la tarjeta. Revisa los datos.';
    throw new Error(mensaje);
  }
  return token;
}

export const autopagoApi = {
  /** Con qué tokenizar y qué se autoriza. */
  async comoSeTokeniza(): Promise<ComoSeTokeniza> {
    return apiClient.get<ComoSeTokeniza>('/portal/autopago/tokenizacion');
  },

  async estado(contractId: string): Promise<EstadoDelAutopago> {
    return apiClient.get<EstadoDelAutopago>(`/portal/autopago/${contractId}`);
  },

  async activar(payload: {
    contractId: string;
    token: string;
    metodo: MetodoDeAutopago;
    diaDelMes: number;
    topeCop: number;
    autorizacionTexto: string;
  }): Promise<EstadoDelAutopago> {
    return apiClient.post<EstadoDelAutopago>('/portal/autopago', payload);
  },

  async pausarOReactivar(
    contractId: string,
    activar: boolean,
  ): Promise<EstadoDelAutopago> {
    return apiClient.patch<EstadoDelAutopago>(`/portal/autopago/${contractId}`, {
      activar,
    });
  },

  async cancelar(
    contractId: string,
    motivo?: string,
  ): Promise<EstadoDelAutopago> {
    return apiClient.delete<EstadoDelAutopago>(
      `/portal/autopago/${contractId}${motivo ? `?motivo=${encodeURIComponent(motivo)}` : ''}`,
    );
  },

  /** Cobrar ahora con el medio guardado, a pedido de la persona. */
  async cobrarAhora(contractId: string): Promise<ResultadoDelCobro> {
    return apiClient.post<ResultadoDelCobro>(
      `/portal/autopago/${contractId}/cobrar-ahora`,
    );
  },
};
