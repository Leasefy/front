/**
 * Cómo se lee el fallo de una acción sobre un contrato (crear, cancelar,
 * recordar, firmar, editar).
 *
 * 🔴 Por qué existe: `useContractActions.run()` se tragaba el error y las
 * pantallas leían `actions.lastError` del render viejo, así que ningún
 * 400/409 del back llegaba al usuario. Ahora las acciones RELANZAN el error y
 * quien llama lo reparte con estas funciones: el motivo en palabras, el 403
 * como falta de permiso, el 409 de inmueble ocupado al lado del campo.
 *
 * Viven fuera de `useContracts.ts` a propósito: son funciones puras, y las
 * pruebas de pantalla que mockean los hooks no tienen que reimplementarlas.
 * `useContracts.ts` las reexporta para quien ya las importaba de ahí.
 */
import { ApiError } from '@/lib/api/client';

/**
 * ¿Es un 403? Con status manda el status; sin él (errores viejos que no son
 * `ApiError`), el texto de permiso de siempre.
 */
export function isPermissionError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof ApiError) return err.status === 403;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('no tienes permiso') || msg.includes('forbidden') || msg.includes('403');
}

/**
 * El motivo del back en palabras, para el toast o el campo. Un 400 del
 * ValidationPipe trae `messages[]`: se listan todos, no sólo el primero.
 * Si el error no trae nada legible, va `porDefecto`.
 */
export function mensajeDelFallo(err: unknown, porDefecto: string): string {
  if (err instanceof ApiError) {
    if (err.messages?.length) return err.messages.join(' · ');
    return err.message || porDefecto;
  }
  if (err instanceof Error && err.message) return err.message;
  return porDefecto;
}

/** El status HTTP del fallo, si vino del back; `null` si no se sabe. */
export function estadoDelFallo(err: unknown): number | null {
  return err instanceof ApiError ? err.status : null;
}

export interface InmuebleOcupado {
  mensaje: string;
  /** El contrato que estorba, si el back lo manda en el cuerpo (`contratoId`). */
  contratoId?: string;
  contratoCode?: string | number;
}

/**
 * El 409 de crear un contrato: «Ese inmueble ya tiene un contrato en curso
 * (#1234)». Va al lado del selector de inmueble.
 *
 * El enlace al contrato que estorba sale SÓLO si el cuerpo trae `contratoId`:
 * el back lo manda en el 409 (`code: INMUEBLE_CON_CONTRATO_EN_CURSO`,
 * `contratoId`, `contratoCode`) y el filtro global reenvía esas claves. Un 409
 * sin id (un back viejo) deja el motivo en palabras y no inventa un enlace.
 */
export function inmuebleOcupado(err: unknown): InmuebleOcupado | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const d = err.detalle ?? {};
  const contratoId = typeof d.contratoId === 'string' ? d.contratoId : undefined;
  const contratoCode =
    typeof d.contratoCode === 'string' || typeof d.contratoCode === 'number' ? d.contratoCode : undefined;
  return { mensaje: err.message, contratoId, contratoCode };
}

/** El rechazo de crear desde una postulación que YA tiene contrato. */
export function contratoDuplicado(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('ya existe un contrato') || msg.includes('already exists');
}
