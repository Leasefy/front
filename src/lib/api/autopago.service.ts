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
 * Por qué la pasarela no aceptó la tarjeta, en español (Nico, 02-10-2026).
 *
 * Wompi responde `{ error: { type, reason?, messages?: { campo: [frases] } } }`,
 * con textos que pueden venir en inglés («Insufficient funds», «Card expired»)
 * y que el toast pintaba tal cual. Acá se reconocen los motivos conocidos y
 * se dicen con nuestras frases; lo desconocido, con una frase clara. El texto
 * de la pasarela NUNCA llega a la persona.
 */
export const MOTIVOS_DE_LA_TARJETA = {
  fondos: 'La tarjeta no tiene fondos suficientes. Prueba con otra tarjeta o comunícate con tu banco.',
  vencida: 'La tarjeta está vencida. Revisa la fecha de vencimiento o usa otra tarjeta.',
  cvc: 'El código de seguridad (CVC) no es correcto. Es el número de 3 o 4 dígitos al respaldo de la tarjeta.',
  numero: 'El número de la tarjeta no es válido. Revísalo e intenta de nuevo.',
  fecha: 'La fecha de vencimiento no es válida. Revisa el mes y el año.',
  nombre: 'Revisa el nombre: escríbelo como aparece en la tarjeta.',
  rechazada: 'Tu banco rechazó la tarjeta. Prueba con otra o comunícate con tu banco.',
  cupo: 'La tarjeta superó su cupo o su límite de compras. Prueba con otra o comunícate con tu banco.',
  /** La llave pública mal puesta o vencida: es nuestro, no de la persona. */
  nuestro:
    'No pudimos validar la tarjeta: algo falló de nuestro lado. No es nada que hayas hecho; prueba de nuevo en un momento.',
  /** Muchos intentos seguidos (429). */
  intentos: 'Hiciste muchos intentos seguidos. Espera un momento e intenta de nuevo.',
  /** La pasarela respondió 5xx. */
  pasarela: 'La pasarela de pagos no respondió bien. Prueba de nuevo en un momento.',
  desconocido:
    'No pudimos validar la tarjeta. Revisa el número, la fecha de vencimiento, el CVC y el nombre, o prueba con otra tarjeta.',
} as const;

/** Motivo conocido → frase. El orden importa: lo más específico primero. */
const MOTIVOS_RECONOCIBLES: ReadonlyArray<[RegExp, string]> = [
  [/insufficient|fondos insuficientes|saldo insuficiente|sin fondos|not enough (funds|balance)/i, MOTIVOS_DE_LA_TARJETA.fondos],
  [/expired|vencid|expirad|caducad/i, MOTIVOS_DE_LA_TARJETA.vencida],
  [/\bcvc\b|\bcvv\b|security code|c[oó]digo de seguridad/i, MOTIVOS_DE_LA_TARJETA.cvc],
  [/(exceeds?|over|above)( the)?( credit| card)? limit|limit exceeded|\bcupo\b|l[ií]mite de (compras?|cr[eé]dito)/i, MOTIVOS_DE_LA_TARJETA.cupo],
  [/declined|rejected|denied|do not honou?r|not authori[sz]ed|rechazad|negad|no autorizad|stolen|lost card|robad|perdid|restricted|restringid|fraud/i, MOTIVOS_DE_LA_TARJETA.rechazada],
  [/card number|n[uú]mero de (la )?tarjeta|invalid card|tarjeta inv[aá]lida|luhn/i, MOTIVOS_DE_LA_TARJETA.numero],
  [/exp(iration)?[_ ]?(month|year|date)|fecha de (vencimiento|expiraci[oó]n)/i, MOTIVOS_DE_LA_TARJETA.fecha],
  [/card[_ ]?holder|titular/i, MOTIVOS_DE_LA_TARJETA.nombre],
  [/public key|llave p[uú]blica|access[_ ]token|invalid[_ ]?(access|key)|authentication/i, MOTIVOS_DE_LA_TARJETA.nuestro],
];

/** El campo de Wompi → la frase de ese campo (cuando el motivo no se reconoce). */
const FRASE_DEL_CAMPO: Record<string, string> = {
  number: MOTIVOS_DE_LA_TARJETA.numero,
  cvc: MOTIVOS_DE_LA_TARJETA.cvc,
  exp_month: MOTIVOS_DE_LA_TARJETA.fecha,
  exp_year: MOTIVOS_DE_LA_TARJETA.fecha,
  card_holder: MOTIVOS_DE_LA_TARJETA.nombre,
};

function reconocer(texto: string): string | undefined {
  return MOTIVOS_RECONOCIBLES.find(([patron]) => patron.test(texto))?.[1];
}

/**
 * La frase para la persona a partir del status y del cuerpo de Wompi. Pura:
 * no lanza y nunca devuelve el texto de la pasarela.
 */
export function motivoDelRechazoDeLaTarjeta(status: number, cuerpo: unknown): string {
  const error = (cuerpo as { error?: unknown } | null)?.error;
  const e = error && typeof error === 'object' ? (error as Record<string, unknown>) : {};
  const tipo = typeof e.type === 'string' ? e.type : '';
  const razon = typeof e.reason === 'string' ? e.reason : typeof error === 'string' ? error : '';

  // Por campo (`INPUT_VALIDATION_ERROR`): el motivo de cada campo, o la frase del campo.
  const porCampo = e.messages && typeof e.messages === 'object' ? (e.messages as Record<string, unknown>) : {};
  const frases: string[] = [];
  for (const [campo, mensajes] of Object.entries(porCampo)) {
    const texto = Array.isArray(mensajes) ? mensajes.filter((m) => typeof m === 'string').join(' ') : String(mensajes ?? '');
    const frase = reconocer(texto) ?? FRASE_DEL_CAMPO[campo];
    if (frase && !frases.includes(frase)) frases.push(frase);
  }
  if (frases.length > 0) return frases.join(' ');

  if (status === 429) return MOTIVOS_DE_LA_TARJETA.intentos;
  const reconocido = reconocer(`${razon} ${tipo}`);
  if (reconocido) return reconocido;
  if (status === 401 || status === 403) return MOTIVOS_DE_LA_TARJETA.nuestro;
  if (status >= 500) return MOTIVOS_DE_LA_TARJETA.pasarela;
  return MOTIVOS_DE_LA_TARJETA.desconocido;
}

/**
 * Tokeniza la tarjeta CONTRA WOMPI, desde el navegador.
 *
 * 🔴 Esta es la única función del front que ve un número de tarjeta, y lo manda
 * a Wompi y a nadie más. No lo guarda, no lo registra y no lo pasa por nuestro
 * back. Si alguna vez hay que auditar el alcance PCI, se audita ESTA función.
 *
 * Si la pasarela no la acepta, lanza un `Error` con la frase de
 * `motivoDelRechazoDeLaTarjeta` (en español, nunca la de Wompi). Si el pedido
 * ni salió, el `TypeError` del `fetch` sube tal cual: el traductor lo lee como
 * «sin conexión».
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
    throw new Error(motivoDelRechazoDeLaTarjeta(res.status, json));
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
