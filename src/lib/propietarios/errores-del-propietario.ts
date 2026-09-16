/**
 * Qué decir cuando guardar o borrar un propietario falla.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * La lista de Propietarios tiraba el motivo del back y ponía «No se pudo
 * crear el propietario. Intenta de nuevo.» encima de tres cosas que no se
 * arreglan intentando de nuevo:
 *
 *   · 409 al borrar: «tiene 7 inmuebles consignados». Reintentar da lo mismo;
 *     lo que sirve es saber qué lo retiene.
 *   · 409 al guardar: el documento ya está cargado en otra ficha
 *     (`@@unique([agencyId, documentNumber])`). El dato está mal, no la red.
 *   · 400 del `ValidationPipe`: el back dice QUÉ campo no aceptó, pero en
 *     inglés y con el nombre del DTO («bankAccountNumber must be a string»).
 *
 * Esto separa lo que va AL LADO DEL CAMPO (el formulario ya sabe pintar un
 * error por campo: `PropietarioForm.serverError`) de lo que va arriba del
 * diálogo, y lo dice en castellano. Nunca adivina: un fallo de red o un 500
 * sí es «prueba de nuevo», porque ahí reintentar puede cambiar algo.
 */

import { ApiError } from '@/lib/api/client';
import type { PropietarioFormData } from '@/lib/types/inmobiliaria';

export type CampoDelPropietario = keyof PropietarioFormData;

export interface ErrorAlGuardarPropietario {
  /** El error que va pegado a su campo, con la forma que espera `PropietarioForm`. */
  campo: { field: CampoDelPropietario; message: string } | null;
  /** Lo que no tiene campo: va arriba del formulario, dentro del diálogo. */
  general: string | null;
}

export const DOCUMENTO_YA_CARGADO = 'Ese documento ya está cargado';
export const CORREO_YA_CARGADO = 'Ese correo ya está cargado';
export const SIN_PERMISO_PARA_GUARDAR =
  'No tienes permiso para guardar propietarios. Pídeselo al administrador de tu inmobiliaria.';
export const SIN_PERMISO_PARA_ELIMINAR =
  'No tienes permiso para eliminar propietarios. Pídeselo al administrador de tu inmobiliaria.';
export const NO_PUDIMOS_GUARDAR =
  'No pudimos guardar el propietario. Prueba de nuevo en un momento.';
export const NO_PUDIMOS_ELIMINAR =
  'No pudimos eliminar el propietario. Prueba de nuevo en un momento.';

/**
 * El nombre del campo en el DTO del back → el del formulario.
 * `mapPropietarioBankFields` renombra los datos bancarios al mandarlos, así que
 * el 400 vuelve con los nombres del DTO (`bankAccountNumber`, no `accountNumber`).
 */
const CAMPO_DEL_DTO: Record<string, CampoDelPropietario> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  documentType: 'documentType',
  documentNumber: 'documentNumber',
  address: 'address',
  city: 'city',
  department: 'department',
  bankCode: 'bankCode',
  bankName: 'bankCode',
  bankAccountType: 'accountType',
  bankAccountNumber: 'accountNumber',
  bankAccountHolder: 'accountHolder',
  bankAccountHolderDocumentType: 'accountHolderDocumentType',
  bankAccountHolderDocument: 'accountHolderDocument',
  notes: 'notes',
};

/** Cómo decir, en castellano, que el back no aceptó ese campo. */
const QUE_REVISAR: Partial<Record<CampoDelPropietario, string>> = {
  email: 'Ese correo no es válido',
  documentType: 'Elige un tipo de documento válido',
  documentNumber: 'Revisa el número de documento',
  name: 'Revisa el nombre',
  phone: 'Revisa el teléfono',
  bankCode: 'Elige un banco de la lista',
  accountType: 'Elige el tipo de cuenta',
  accountNumber: 'Revisa el número de cuenta',
  accountHolder: 'Revisa el titular de la cuenta',
  accountHolderDocumentType: 'Elige el tipo de documento del titular',
  accountHolderDocument: 'Revisa el documento del titular',
};

/**
 * Un mensaje de `class-validator` empieza con el nombre de la propiedad y
 * sigue en inglés («email must be an email», «property foo should not
 * exist»). Un mensaje de negocio del back ya viene en castellano y se muestra
 * tal cual.
 */
const MENSAJE_DE_VALIDADOR = /^(?:property\s+)?([A-Za-z][\w.[\]]*)\s+(?:must|should|has|is|each)\b/;

function esMensajeDeValidador(m: string): boolean {
  return MENSAJE_DE_VALIDADOR.test(m.trim());
}

function campoDelMensaje(m: string): CampoDelPropietario | null {
  const coincide = MENSAJE_DE_VALIDADOR.exec(m.trim());
  if (!coincide) return null;
  const propiedad = coincide[1].split('.')[0];
  return CAMPO_DEL_DTO[propiedad] ?? null;
}

function mensajesDe(err: ApiError): string[] {
  if (err.messages?.length) return err.messages;
  return err.message ? [err.message] : [];
}

/** El 409 de duplicado: ¿es el documento o el correo lo que ya está? */
function duplicadoDe(err: ApiError): ErrorAlGuardarPropietario {
  const texto = `${err.message} ${JSON.stringify(err.detalle ?? {})}`.toLowerCase();
  if (/correo|email/.test(texto)) {
    return { campo: { field: 'email', message: CORREO_YA_CARGADO }, general: null };
  }
  if (err.code === 'P2002' || /documento|document/.test(texto)) {
    return { campo: { field: 'documentNumber', message: DOCUMENTO_YA_CARGADO }, general: null };
  }
  // Un 409 que no es un duplicado conocido: su propio motivo, arriba.
  return { campo: null, general: err.message || NO_PUDIMOS_GUARDAR };
}

export function errorAlGuardarPropietario(err: unknown): ErrorAlGuardarPropietario {
  if (!(err instanceof ApiError)) {
    return { campo: null, general: NO_PUDIMOS_GUARDAR };
  }
  if (err.status === 403) return { campo: null, general: SIN_PERMISO_PARA_GUARDAR };
  if (err.status === 409) return duplicadoDe(err);

  if (err.status === 400 || err.status === 422) {
    let campo: ErrorAlGuardarPropietario['campo'] = null;
    const sueltos: string[] = [];
    let hayValidadorSinCampo = false;

    for (const m of mensajesDe(err)) {
      const field = campoDelMensaje(m);
      if (field) {
        // `serverError` pinta UN campo: el primero va a su lugar; el resto
        // no se pierde, se nombra arriba.
        if (!campo) campo = { field, message: QUE_REVISAR[field] ?? 'Revisa este dato' };
        else if (campo.field !== field) sueltos.push(QUE_REVISAR[field] ?? 'Revisa los demás datos');
      } else if (esMensajeDeValidador(m)) {
        hayValidadorSinCampo = true;
      } else {
        sueltos.push(m);
      }
    }
    if (hayValidadorSinCampo) sueltos.push('Hay datos que no pudimos guardar: revisa el formulario.');
    const general = sueltos.length ? Array.from(new Set(sueltos)).join(' · ') : null;
    return { campo, general: campo || general ? general : NO_PUDIMOS_GUARDAR };
  }

  // Otro 4xx con explicación del back: se dice lo que dijo. 5xx: reintentar sí sirve.
  if (err.status >= 400 && err.status < 500 && err.message) {
    return { campo: null, general: err.message };
  }
  return { campo: null, general: NO_PUDIMOS_GUARDAR };
}

/**
 * El motivo por el que no se pudo borrar. El 409 del back («tiene N
 * inmuebles consignados») es justamente lo que hay que leer: se muestra
 * dentro del diálogo, tal cual.
 */
export function motivoAlEliminarPropietario(err: unknown): string {
  if (!(err instanceof ApiError)) return NO_PUDIMOS_ELIMINAR;
  if (err.status === 403) return SIN_PERMISO_PARA_ELIMINAR;
  if (err.status >= 400 && err.status < 500 && err.message) return err.message;
  return NO_PUDIMOS_ELIMINAR;
}
