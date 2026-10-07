/**
 * Lo que la lista de Propietarios muestra de cada fila, sin pantalla (QA de
 * Propietarios, 03-10-2026).
 *
 * · P-21: al asesor comercial el back le oculta la plata a propósito
 *   (`plataOculta: true`, montos en `null`). `normalizePropietario` vuelve esos
 *   `null` un 0, así que la lista pintaba «$0», «Al día» y «Sin pendientes»:
 *   tres afirmaciones sobre datos que nadie le mostró. Antes de pintar un
 *   monto se pregunta acá.
 * · P-08: el tipo de documento en palabras («Pasaporte», no «PASSPORT»).
 */

import type { DocumentType, Propietario } from '@/lib/types/inmobiliaria';

/** ¿Quien mira NO ve la plata de este propietario? */
export function plataOculta(propietario: Pick<Propietario, 'plataOculta'>): boolean {
  return propietario.plataOculta === true;
}

/**
 * ¿La lista viene sin la plata? El back la oculta por ROL, así que es toda o
 * nada: con una fila oculta, los totales de arriba tampoco se pueden sumar.
 */
export function laListaOcultaLaPlata(propietarios: readonly Pick<Propietario, 'plataOculta'>[]): boolean {
  return propietarios.some(plataOculta);
}

/**
 * La etiqueta corta del tipo de documento, la misma del selector cerrado del
 * titular («Cédula (CC)», «Pasaporte», «NIT»). `null` = el back no lo mandó.
 */
const ETIQUETA_CORTA_DEL_TIPO: Record<DocumentType, string> = {
  CC: 'inmobiliaria.propietario.form.docCorto.CC',
  CE: 'inmobiliaria.propietario.form.docCorto.CE',
  TI: 'inmobiliaria.propietario.form.docCorto.TI',
  NIT: 'inmobiliaria.propietario.form.docCorto.NIT',
  PASSPORT: 'inmobiliaria.propietario.form.docCorto.PASSPORT',
  PPT: 'inmobiliaria.propietario.form.docCorto.PPT',
};

export function claveDelTipoDeDocumento(tipo: string | null | undefined): string | null {
  if (!tipo) return null;
  return ETIQUETA_CORTA_DEL_TIPO[tipo as DocumentType] ?? null;
}

/**
 * El tipo dicho en palabras con el `t` de la pantalla. Un tipo que el back
 * agregue mañana sale crudo (mejor una etiqueta rara que una fila sin dato).
 */
export function tipoDeDocumentoEnPalabras(
  t: (clave: string) => string,
  tipo: string | null | undefined,
): string | null {
  if (!tipo) return null;
  const clave = claveDelTipoDeDocumento(tipo);
  return clave ? t(clave) : tipo;
}
