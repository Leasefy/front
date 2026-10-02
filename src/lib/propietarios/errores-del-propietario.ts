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
 * diálogo, y lo dice en castellano. Nunca adivina: lo que no es del dato
 * (la red, un 5xx) lo dice el traductor con la regla de oro: «conexión» sólo
 * sin respuesta, y un 5xx «de nuestro lado» con su referencia.
 */

import { ApiError } from '@/lib/api/client';
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import type { PropietarioFormData } from '@/lib/types/inmobiliaria';

export type CampoDelPropietario = keyof PropietarioFormData;

export interface ErrorAlGuardarPropietario {
  /**
   * El PRIMER error que va pegado a su campo, con la forma que espera
   * `PropietarioForm.serverError`. Es el que recibe el foco.
   */
  campo: { field: CampoDelPropietario; message: string } | null;
  /**
   * TODOS los errores por campo (02-10-2026): un 400 del back puede traer
   * varios (`campos[]`) y cada uno va bajo SU campo. Incluye el de `campo`.
   */
  porCampo: Partial<Record<CampoDelPropietario, string>>;
  /** Lo que no tiene campo: va arriba del formulario, dentro del diálogo. */
  general: string | null;
}

/** Lo que se estaba haciendo, para el texto de un 5xx («No pudimos guardar el propietario: …»). */
const ACCION_GUARDAR = 'guardar el propietario';
const ACCION_ELIMINAR = 'eliminar el propietario';

function soloGeneral(general: string): ErrorAlGuardarPropietario {
  return { campo: null, porCampo: {}, general };
}

function conUnCampo(
  campo: { field: CampoDelPropietario; message: string },
  general: string | null = null,
): ErrorAlGuardarPropietario {
  return { campo, porCampo: { [campo.field]: campo.message }, general };
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
    return conUnCampo({ field: 'email', message: CORREO_YA_CARGADO });
  }
  // `YA_EXISTE` es el code del contrato de errores (02-10-2026); `P2002`, el de
  // un back anterior. Los `campos` del 409 dicen cuál columna chocó.
  const choco = camposDelError(err).map((c) => c.campo);
  if (choco.includes('email')) {
    return conUnCampo({ field: 'email', message: CORREO_YA_CARGADO });
  }
  if (
    err.code === 'YA_EXISTE' ||
    err.code === 'P2002' ||
    choco.includes('documentNumber') ||
    /documento|document/.test(texto)
  ) {
    return conUnCampo({ field: 'documentNumber', message: DOCUMENTO_YA_CARGADO });
  }
  // Un 409 que no es un duplicado conocido: su propio motivo, arriba (por el
  // traductor: un volcado o un texto en inglés no llega a la pantalla).
  return soloGeneral(mensajeParaLaPersona(err, { porDefecto: NO_PUDIMOS_GUARDAR }));
}

/** Los campos que el formulario muestra (los destinos de `CAMPO_DEL_DTO`). */
const CAMPOS_DEL_FORMULARIO = Array.from(new Set(Object.values(CAMPO_DEL_DTO)));

/**
 * 02-10-2026: el back manda `campos` con el nombre del DTO y una frase en
 * español. Cada uno va a SU campo del formulario; lo que el formulario no
 * muestra (las etiquetas, «a quién pertenece la cuenta»), arriba.
 */
function desdeLosCampos(err: unknown): ErrorAlGuardarPropietario {
  const reparto = repartirErroresDelServidor<CampoDelPropietario>(err, {
    mapa: CAMPO_DEL_DTO,
    campos: CAMPOS_DEL_FORMULARIO,
    porDefecto: NO_PUDIMOS_GUARDAR,
  });
  const primero = reparto.orden[0];
  const campo = primero ? { field: primero, message: reparto.porCampo[primero] ?? '' } : null;
  const general = reparto.sueltos.length ? reparto.sueltos.join(' · ') : null;
  return { campo, porCampo: reparto.porCampo, general: campo || general ? general : NO_PUDIMOS_GUARDAR };
}

export function errorAlGuardarPropietario(err: unknown): ErrorAlGuardarPropietario {
  if (!(err instanceof ApiError)) {
    // La red (status 0) habla de la conexión; cualquier otra cosa, el texto
    // de siempre. Lo decide el traductor: «conexión» sólo sin respuesta.
    return soloGeneral(mensajeParaLaPersona(err, { porDefecto: NO_PUDIMOS_GUARDAR, accion: ACCION_GUARDAR }));
  }
  if (err.status === 403) return soloGeneral(SIN_PERMISO_PARA_GUARDAR);
  if (err.status === 409) return duplicadoDe(err);

  if (err.status === 400 || err.status === 422) {
    if (camposDelError(err).length > 0) return desdeLosCampos(err);

    // Un back anterior al contrato: el texto en inglés de `class-validator`.
    let campo: ErrorAlGuardarPropietario['campo'] = null;
    const porCampo: ErrorAlGuardarPropietario['porCampo'] = {};
    const sueltos: string[] = [];
    let hayValidadorSinCampo = false;

    for (const m of mensajesDe(err)) {
      const field = campoDelMensaje(m);
      if (field) {
        const message = QUE_REVISAR[field] ?? 'Revisa este dato';
        // Cada uno bajo SU campo (`porCampo`); el primero recibe el foco.
        if (!campo) campo = { field, message };
        if (porCampo[field] === undefined) porCampo[field] = message;
      } else if (esMensajeDeValidador(m)) {
        hayValidadorSinCampo = true;
      } else {
        sueltos.push(m);
      }
    }
    if (hayValidadorSinCampo) sueltos.push('Hay datos que no pudimos guardar: revisa el formulario.');
    const general = sueltos.length ? Array.from(new Set(sueltos)).join(' · ') : null;
    return { campo, porCampo, general: campo || general ? general : NO_PUDIMOS_GUARDAR };
  }

  // Otro 4xx: lo que dijo el back, si se lee. Un 5xx: «de nuestro lado», con
  // la referencia. Sin respuesta: la conexión. Todo eso es del traductor.
  return soloGeneral(mensajeParaLaPersona(err, { porDefecto: NO_PUDIMOS_GUARDAR, accion: ACCION_GUARDAR }));
}

/**
 * El motivo por el que no se pudo borrar. El 409 del back («tiene N
 * inmuebles consignados») es justamente lo que hay que leer: se muestra
 * dentro del diálogo, tal cual. Un 5xx dice que fue de nuestro lado (con la
 * referencia) y la red, que es la conexión.
 */
export function motivoAlEliminarPropietario(err: unknown): string {
  if (err instanceof ApiError && err.status === 403) return SIN_PERMISO_PARA_ELIMINAR;
  return mensajeParaLaPersona(err, { porDefecto: NO_PUDIMOS_ELIMINAR, accion: ACCION_ELIMINAR });
}
