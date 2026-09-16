/**
 * Quién es la persona que acompaña a un evento de la agenda.
 *
 * El back manda un solo campo, `responsableNombre`, para todos los tipos. Sólo
 * en una TAREA es de verdad el responsable de la agencia: en una visita es
 * quien va a visitar, y en una firma, un vencimiento o una inspección es el
 * INQUILINO del contrato. Rotularlo «Responsable» en esos casos hacía leer la
 * fila al revés: «Vence el contrato · Responsable: Lina» (QA 2026-09-14).
 *
 * `null` = el rótulo genérico de responsable (tareas y seguimientos).
 */

import type { EventoTipo } from '@/lib/api/agenda.types';

export function rotuloDeLaPersona(tipo: EventoTipo): string | null {
  switch (tipo) {
    case 'visita':
      return 'Quién visita';
    case 'firma_pendiente':
    case 'vencimiento_contrato':
    case 'inspeccion':
      return 'Inquilino';
    default:
      return null;
  }
}
