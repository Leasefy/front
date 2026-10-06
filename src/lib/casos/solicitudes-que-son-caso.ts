/**
 * Qué solicitudes de pago del inquilino son un CASO abierto en «Mis casos».
 * PURA.
 *
 * 🔴 QA-INQ-95 (04-10-2026): Iván veía «Pago de octubre 2026 — Rechazado,
 * reintentar» y «Pago de noviembre 2026 — Rechazado, reintentar» aunque ya
 * había reintentado: el de octubre se pagó en el intento siguiente (aprobado) y
 * el de noviembre tenía otro intento en validación. Un rechazo es un caso
 * abierto sólo si es el ÚLTIMO intento de ese arriendo y ese período; si
 * después hubo otro (aprobado, en validación o rechazado), ése es el que habla.
 * En validación y en disputa siguen siendo casos siempre.
 */

export interface SolicitudParaElCaso {
  id: string;
  leaseId: string;
  periodMonth: number;
  periodYear: number;
  status: string;
  createdAt: string;
}

const ABIERTAS = new Set(['PENDING_VALIDATION', 'DISPUTED', 'REJECTED']);

export function solicitudesQueSonCaso<T extends SolicitudParaElCaso>(solicitudes: readonly T[]): T[] {
  const llave = (s: SolicitudParaElCaso) => `${s.leaseId}|${s.periodYear}-${s.periodMonth}`;
  const ultimaPorPeriodo = new Map<string, string>();
  for (const s of solicitudes) {
    const k = llave(s);
    const antes = ultimaPorPeriodo.get(k);
    if (antes === undefined || Date.parse(s.createdAt) > Date.parse(antes)) ultimaPorPeriodo.set(k, s.createdAt);
  }
  return solicitudes.filter((s) => {
    if (!ABIERTAS.has(s.status)) return false;
    if (s.status !== 'REJECTED') return true;
    return Date.parse(s.createdAt) >= Date.parse(ultimaPorPeriodo.get(llave(s)) ?? s.createdAt);
  });
}
