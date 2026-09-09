/**
 * Lo que el cajón de renovación decide sin tocar la pantalla: en qué paso
 * está una renovación, qué IPC se puede sugerir sin inventar, por dónde le
 * llega la propuesta al inquilino y cómo se lee el historial.
 *
 * Vive aparte para probarse sin montar el cajón, y para que la pantalla no
 * tenga opiniones sobre la ley ni sobre los datos.
 */
import type { Renovacion, RenovacionStatus } from '@/lib/types/inmobiliaria';
import { IPC_HISTORICAL, calculateNewRent } from '@/lib/constants/inmobiliaria-data';

/**
 * Los tres pasos que ve la inmobiliaria. La negociación y la aprobación del
 * back viven dentro de «Aceptación»: para quien opera son la misma espera.
 */
export const PASOS_DE_RENOVACION = [
  { id: 'propuesta', label: 'Propuesta' },
  { id: 'aceptacion', label: 'Aceptación' },
  { id: 'firma', label: 'Firma' },
] as const;

/** Índice del paso para un estado; 3 = terminó bien, -1 = no se renueva. */
export function pasoDelEstado(status: RenovacionStatus): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'notified':
    case 'negotiating':
    case 'approved':
      return 1;
    case 'signed':
      return 2;
    case 'completed':
      return 3;
    case 'terminated':
      return -1;
  }
}

/**
 * El IPC de diciembre del año pasado, sólo si la tabla lo tiene. Si la tabla
 * se quedó vieja —cada enero hay que agregarle el diciembre nuevo— no se
 * sugiere nada: el dato lo escribe la inmobiliaria mirando al DANE. Antes se
 * mostraba «sugerido» un IPC de dos años atrás.
 */
export function ipcSugerido(hoy: Date = new Date()): { rate: number; anio: number } | null {
  const anio = hoy.getFullYear() - 1;
  const fila = IPC_HISTORICAL.find((r) => r.year === anio && r.month === 12);
  return fila ? { rate: fila.rate, anio } : null;
}

/** El canon al que llega el IPC: el tope legal de aumento en vivienda (Ley 820, art. 20). */
export function topeConIpc(canonActual: number, ipc: number): number {
  return calculateNewRent(canonActual, ipc);
}

export interface VariacionDelCanon {
  pesos: number;
  pct: number;
}

export function variacionDelCanon(actual: number, nuevo: number): VariacionDelCanon {
  const pesos = nuevo - actual;
  return { pesos, pct: actual > 0 ? (pesos / actual) * 100 : 0 };
}

/** «5,10 %» en español, «5.10 %» en inglés. */
export function formatearPct(pct: number, locale: string, decimales = 2): string {
  return (
    new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(pct) + ' %'
  );
}

/**
 * Por dónde le llega la propuesta al inquilino cuando se envía:
 * - `panel_y_correo`: tiene cuenta en Leasefy (hay Lease con usuario);
 * - `correo_del_contrato`: sin cuenta, pero el contrato trae correo — el
 *   caso normal de un contrato que entró por migración;
 * - `ninguno`: sin cuenta ni correo; al enviar sólo queda registrada acá.
 */
export type CanalDeEnvio = 'panel_y_correo' | 'correo_del_contrato' | 'ninguno';

export function canalDeEnvio(r: Pick<Renovacion, 'tenantUserId' | 'tenantEmail'>): CanalDeEnvio {
  if (r.tenantUserId) return 'panel_y_correo';
  if (r.tenantEmail) return 'correo_del_contrato';
  return 'ninguno';
}

/** Aceptó desde su panel, o la inmobiliaria registró que aceptó. */
export function renovacionAceptada(r: Pick<Renovacion, 'status' | 'tenantAcceptedAt'>): boolean {
  return Boolean(r.tenantAcceptedAt) || ['approved', 'signed', 'completed'].includes(r.status);
}

/** Las partes de un `YYYY-MM-DD` (o de un ISO con hora) sin pasar por la zona horaria. */
function partesDeFecha(iso: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/**
 * El vencimiento nuevo como lo calcula el back al completar: un año más,
 * leído en UTC (un DATE viaja como medianoche UTC). Devuelve `YYYY-MM-DD`.
 */
export function nuevoVencimiento(leaseEndDate: string): string {
  const partes = partesDeFecha(leaseEndDate);
  if (!partes) return leaseEndDate;
  const [y, m, d] = partes;
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().slice(0, 10);
}

/**
 * Un DATE del back («2026-10-01» o «2026-10-01T00:00:00.000Z») es un día,
 * no un instante: se arma con sus tres números en el calendario local. Con
 * `new Date(iso)` en Bogotá el 1 de octubre se leía como 30 de septiembre.
 */
function diaDe(iso: string): Date {
  const partes = partesDeFecha(iso);
  return partes ? new Date(partes[0], partes[1] - 1, partes[2]) : new Date(iso);
}

/** «1 de octubre de 2026». */
export function fechaLarga(iso: string, locale: string): string {
  return diaDe(iso).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** «1 oct 2026», para el riel. */
export function fechaCorta(iso: string, locale: string): string {
  return diaDe(iso).toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function mensajeSugerido(datos: {
  tenantName: string;
  propertyAddress: string;
  leaseEndDate: string;
  newRent: number;
  agencyName: string;
  locale: string;
  formatCurrency: (n: number) => string;
}): string {
  return `Estimado/a ${datos.tenantName},

Le informamos que su contrato de arrendamiento del inmueble ubicado en ${datos.propertyAddress} vence el ${fechaLarga(datos.leaseEndDate, datos.locale)}.

El nuevo canon propuesto para la renovación es de ${datos.formatCurrency(datos.newRent)}.

Por favor confirme si desea renovar el contrato.

Atentamente,
${datos.agencyName}`.trimEnd();
}

/** El enlace de WhatsApp con el mensaje listo; sin teléfono, sólo el mensaje. */
export function enlaceDeWhatsapp(telefono: string | null | undefined, mensaje: string): string {
  const digitos = (telefono ?? '').replace(/\D/g, '');
  const texto = encodeURIComponent(mensaje);
  return digitos ? `https://wa.me/57${digitos}?text=${texto}` : `https://wa.me/?text=${texto}`;
}

/**
 * Cómo se lee cada movimiento del historial. Las acciones las escribe el
 * back con dos vocabularios (los suyos en minúscula y el estado en mayúscula
 * cuando la nota acompaña un cambio de etapa); acá se vuelven una frase.
 */
export function etiquetaDeActividad(action: string): string {
  switch (action) {
    case 'notified':
    case 'NOTIFIED':
      return 'Propuesta enviada';
    case 'note':
      return 'Nota';
    case 'tenant_accepted':
      return 'El inquilino aceptó';
    case 'tenant_requested':
      return 'El inquilino pidió renovar';
    case 'NEGOTIATING':
      return 'En negociación';
    case 'RENOV_APPROVED':
      return 'Aceptación registrada';
    case 'RENOV_SIGNED':
      return 'Firma registrada';
    case 'RENOV_COMPLETED':
      return 'Renovación completada';
    case 'RENOV_TERMINATED':
      return 'No se renueva';
    case 'RENOV_PENDING':
      return 'Propuesta guardada';
    default:
      return action;
  }
}

/** El texto de un movimiento sin el prefijo que el back le pone a la notificación. */
export function textoDeActividad(action: string, description: string | null | undefined): string {
  if (!description) return '';
  if (action === 'notified') return description.replace(/^Notificación al inquilino:\s*/, '');
  return description;
}
