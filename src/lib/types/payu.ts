/**
 * Payu — lo que el back le muestra a la inmobiliaria (sólo lectura).
 *
 * Las tres formas están FIJADAS por el integrador (26-09-2026,
 * `sesion-2026-09-22/cierre-de-agentes/payu-api-front.md`); acá sólo se
 * copian. Montos en pesos enteros; fechas `YYYY-MM-DD` para días e ISO completo
 * para instantes.
 *
 * Qué hace Payu (decisiones de Nico, `payu-spec.md`): un cron diario del back
 * le manda al inquilino el link de pago de su cuota en tres hitos —3 días
 * antes del vencimiento, el día y 3 días después—, máximo tres mensajes por
 * cuota, y siempre el MISMO link. Después del último hito ya no escribe: la
 * sigue cobranza. No hay envío a pedido: Nico eligió el cron.
 */

// ── GET /inmobiliaria/cobros/links ──────────────────────────────────────────

/**
 * El estado del link de UNA cuota.
 *
 *   · `ninguno` — Payu todavía no le escribió por esta cuota.
 *   · `enviado` — hay link vivo y salió al menos un hito (`PENDING`).
 *   · `pagado`  — se pagó por el link (`PAID`).
 *   · `vencido` — el link venció sin pago (`EXPIRED`).
 *   · `fallido` — la pasarela no aprobó el pago, o llegó un valor distinto al
 *     de la cuota (`FAILED` del `AgentCobroLink` en el back).
 */
export type EstadoDelLinkDePago = 'ninguno' | 'enviado' | 'pagado' | 'vencido' | 'fallido';

export const ESTADOS_DEL_LINK_DE_PAGO: readonly EstadoDelLinkDePago[] = [
  'ninguno',
  'enviado',
  'pagado',
  'vencido',
  'fallido',
];

/** Los tres avisos de una cuota, en el orden en que salen. */
export type HitoDePayu = 'antes' | 'dia' | 'despues';

export const HITOS_DE_PAYU: readonly HitoDePayu[] = ['antes', 'dia', 'despues'];

export interface LinkDePagoDeCuota {
  cuotaId: string;
  contratoId: string;
  /** «#43». */
  contratoNumero: string;
  inmueble: string;
  inquilino: string;
  /** `YYYY-MM-DD`. */
  fechaDeVencimiento: string;
  montoCop: number;
  estado: EstadoDelLinkDePago;
  hitosEnviados: HitoDePayu[];
  /** ISO. `null` si nunca salió un aviso. */
  ultimoEnvioEn: string | null;
  /** ISO. Sólo con `estado: 'pagado'`. */
  pagadoEn: string | null;
  /** El checkout de la pasarela. `null` si no hay link. */
  paymentUrl: string | null;
  /**
   * OPCIONAL (QA 26-09; un back viejo no lo manda): Payu no escribe por esta
   * cuota porque el contrato ya está en mora — su cuota MÁS VIEJA con saldo
   * pasó vencimiento + 3. Puede venir en `true` en una cuota que por sí sola
   * todavía no venció. Sin el campo, se mira sólo la fecha de la cuota.
   */
  enMora?: boolean;
  /**
   * OPCIONAL (QA en el navegador, 08-10; un back viejo no lo manda): la cuota
   * ya no debe nada (CANCELADA o saldo en cero). Sin link, la fila dice que
   * está paga en vez de «Cobri todavía no le ha escrito».
   */
  pagada?: boolean;
}

export interface PaginaDeLinksDePago {
  items: LinkDePagoDeCuota[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltrosDeLinksDePago {
  /** `YYYY-MM`. */
  mes: string;
  /** Sin estado = todos. */
  estado?: EstadoDelLinkDePago;
  page?: number;
  limit?: number;
}

// ── GET /inmobiliaria/cobros/links/resumen ──────────────────────────────────

export interface ResumenDeLinksDePago {
  /** `YYYY-MM`. */
  mes: string;
  /** El cron de Payu está prendido para esta inmobiliaria. */
  payuActivo: boolean;
  /** Cuotas del mes. */
  cuotas: number;
  /** Cuotas a las que Payu les mandó link (un link por cuota). */
  linksEnviados: number;
  pagadosPorLink: number;
  montoCobradoPorLinkCop: number;
  pendientesCop: number;
}

// ── GET /inmobiliaria/autopago ──────────────────────────────────────────────

export type EstadoDelIntentoDeAutopago = 'APROBADO' | 'RECHAZADO' | 'PENDIENTE' | 'ERROR';

export interface IntentoDeAutopago {
  estado: EstadoDelIntentoDeAutopago;
  montoCop: number;
  /** ISO. */
  fecha: string;
  motivo: string | null;
}

export interface AutopagoDeContrato {
  contratoId: string;
  contratoNumero: string;
  inquilino: string;
  inmueble: string;
  activo: boolean;
  topeCop: number;
  /** `null` = nunca se intentó cobrar. */
  ultimoIntento: IntentoDeAutopago | null;
}

export interface AutopagosDeLaInmobiliaria {
  /** La llave `AUTOPAGO_COBRO_AUTOMATICO_ENABLED` del servidor. */
  cobroAutomaticoActivo: boolean;
  items: AutopagoDeContrato[];
}
