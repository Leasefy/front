/**
 * Refiere y gana (Nico, 28-10-2026), del lado del front: el código que queda pendiente al abrir un enlace, el enlace
 * para compartir, el mensaje de WhatsApp y cómo se dice en qué va cada colega. La regla de verdad vive en el back
 * (`inmobiliaria/referidos/refiere-y-gana.ts`).
 */
import type { ColegaReferido } from '@/lib/api/refiere-y-gana.service';

/** El enlace cuenta 30 días (Nico). */
export const DIAS_DEL_ENLACE = 30;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

export const LLAVE_DEL_REFERIDO = 'leasefy:referido-pendiente';

/** «VALLE-K7M2 » → `valle-k7m2` (igual que el back). */
export function normalizarCodigo(crudo: string): string {
  return crudo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function guardarReferidoPendiente(codigo: string, ahora = Date.now()): void {
  const limpio = normalizarCodigo(codigo);
  if (!limpio) return;
  try {
    window.localStorage.setItem(LLAVE_DEL_REFERIDO, JSON.stringify({ codigo: limpio, en: ahora }));
  } catch {
    /* sin almacenamiento: el código se escribe al crear la cuenta */
  }
}

/** El código pendiente si es de los últimos 30 días; si no, nada. */
export function referidoPendiente(ahora = Date.now()): string | null {
  try {
    const crudo = window.localStorage.getItem(LLAVE_DEL_REFERIDO);
    if (!crudo) return null;
    const { codigo, en } = JSON.parse(crudo) as { codigo?: unknown; en?: unknown };
    if (typeof codigo !== 'string' || typeof en !== 'number') return null;
    return ahora - en < DIAS_DEL_ENLACE * UN_DIA_MS ? codigo : null;
  } catch {
    return null;
  }
}

export function olvidarReferidoPendiente(): void {
  try {
    window.localStorage.removeItem(LLAVE_DEL_REFERIDO);
  } catch {
    /* nada */
  }
}

/** `https://leasefy.co/r/valle-k7m2`. */
export function enlaceDelCodigo(origen: string, codigo: string): string {
  return `${origen.replace(/\/+$/, '')}/r/${encodeURIComponent(codigo)}`;
}

/** El mensaje ya escrito para WhatsApp: corto, con el regalo y el enlace. */
export function mensajeParaWhatsApp(enlace: string, dias = 30): string {
  const regalo = dias === 30 ? 'tu primer mes' : `${dias} días`;
  return `Hola, te recomiendo Leasefy para manejar tus arriendos: publicas gratis, montas contratos y el cobro se hace solo. Con mi enlace tienes ${regalo} de Leasefy completo gratis: ${enlace}`;
}

export function enlaceDeWhatsAppParaCompartir(enlace: string, dias = 30): string {
  return `https://wa.me/?text=${encodeURIComponent(mensajeParaWhatsApp(enlace, dias))}`;
}

export type TonoDelColega = 'info' | 'success' | 'neutral' | 'warning';

/** En qué va cada colega, en palabras. */
export function estadoDelColega(c: ColegaReferido): { etiqueta: string; detalle: string; tono: TonoDelColega } {
  if (c.estado === 'registrado') {
    return { etiqueta: 'En su mes gratis', detalle: 'Cuando pague su primer mes, ganas un mes gratis.', tono: 'info' };
  }
  if (c.premio === 'tope') {
    return { etiqueta: 'Pagó', detalle: 'Ya tenías tus meses gratis de ese año.', tono: 'neutral' };
  }
  if (c.aplicadoEn) {
    return { etiqueta: 'Mes usado', detalle: 'Ese mes no lo pagaste.', tono: 'success' };
  }
  return { etiqueta: 'Ganaste un mes', detalle: 'Lo usamos en tu próximo cobro.', tono: 'success' };
}

export const NOMBRE_DEL_TIPO: Record<ColegaReferido['tipo'], string> = {
  inmobiliaria: 'Inmobiliaria',
  agente: 'Agente inmobiliario',
  propietario: 'Propietario',
};
