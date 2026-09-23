/**
 * titular-de-la-cuenta — ¿a quién pertenece la cuenta donde recibe el
 * propietario? (22-09)
 *
 * El pedido, textual (Nico): «la cuenta de banco donde recibe el propietario no
 * necesariamente tiene que estar asociada a ese propietario, puede ser otra
 * persona que lleva ese dinero. Cuando se esté agregando la información
 * bancaria deberíamos tener la opción de que elija si es a la cuenta del
 * propietario o a otra cuenta de otra persona, y si es a otra persona, debe
 * pedir el tipo de documento y número de documento y ahí ya le da la opción de
 * agregar la cuenta.»
 *
 * La regla de «de quién es» es la del back (`titular-de-la-cuenta.ts`), sin
 * columna nueva: hay documento del titular y no es el del propietario → otra
 * persona; hay un nombre distinto sin documento → otra persona a la que le
 * falta el documento; si no, es del propietario. Acá se REPITE sólo para abrir
 * el formulario en la respuesta correcta; lo que se guarda lo decide el back.
 *
 * La validación del documento también es la del back, para que el formulario
 * no deje enviar lo que el servidor va a rechazar: cédula de 6 a 10 dígitos, CE
 * de 5 a 10, TI de 10 u 11, pasaporte alfanumérico de 5 a 20, y el NIT con el
 * dígito de verificación de la DIAN (`revisarNit`, el mismo del registro).
 */

import { revisarNit } from '@/lib/onboarding/nit';
import type { DocumentType } from '@/lib/types/inmobiliaria';

export type TitularElegido = 'PROPIETARIO' | 'TERCERO';

/** El titular de un giro como lo manda el back en la dispersión. */
export interface TitularDelGiro {
  esElPropietario: boolean;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  nombre: string | null;
  /** `false` = no es la copia del giro sino la ficha de hoy (dispersión vieja o base sin la tabla). */
  copiadoAlGenerar: boolean;
}

function comparable(texto: string | null | undefined): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** «79.475.653» y «79475653» son el mismo documento; al NIT se le quita el dígito. */
export function llaveDelDocumento(documento: string | null | undefined): string {
  const crudo = (documento ?? '').trim().toUpperCase();
  if (!crudo) return '';
  const sinDv = /-\s*\d\s*$/.test(crudo) ? crudo.slice(0, crudo.lastIndexOf('-')) : crudo;
  return sinDv.replace(/[^A-Z0-9]/g, '');
}

/** Con qué respuesta abre el formulario, según lo que ya tiene la ficha. */
export function titularInicial(datos: {
  nombreDelPropietario: string;
  documentoDelPropietario: string;
  nombreDelTitular?: string | null;
  documentoDelTitular?: string | null;
}): TitularElegido {
  const documento = (datos.documentoDelTitular ?? '').trim();
  if (documento) {
    return llaveDelDocumento(documento) === llaveDelDocumento(datos.documentoDelPropietario)
      ? 'PROPIETARIO'
      : 'TERCERO';
  }
  const nombre = (datos.nombreDelTitular ?? '').trim();
  return nombre && comparable(nombre) !== comparable(datos.nombreDelPropietario) ? 'TERCERO' : 'PROPIETARIO';
}

/** Por qué el documento no sirve. Cada motivo tiene su clave en `inmobiliaria.propietario.form`. */
export type MotivoDelDocumento =
  | 'vacio'
  | 'soloNumeros'
  | 'largo'
  | 'pasaporte'
  | 'nit'
  | 'digitoDeVerificacion'
  | 'esElPropietario';

export type RevisionDelDocumento =
  | { ok: true; numero: string }
  | { ok: false; motivo: MotivoDelDocumento; min?: number; max?: number; dv?: number };

const LARGOS: Record<'CC' | 'CE' | 'TI', { min: number; max: number }> = {
  CC: { min: 6, max: 10 },
  CE: { min: 5, max: 10 },
  TI: { min: 10, max: 11 },
};

/** El número del documento del titular según su tipo. Nunca lanza. */
export function revisarDocumentoDelTitular(
  tipo: DocumentType,
  crudo: string | null | undefined,
  documentoDelPropietario?: string,
): RevisionDelDocumento {
  const texto = (crudo ?? '').trim();
  if (!texto) return { ok: false, motivo: 'vacio' };

  let revision: RevisionDelDocumento;
  if (tipo === 'PASSPORT') {
    const numero = texto.replace(/[\s.-]/g, '').toUpperCase();
    revision = /^[A-Z0-9]{5,20}$/.test(numero) ? { ok: true, numero } : { ok: false, motivo: 'pasaporte' };
  } else if (tipo === 'NIT') {
    const nit = revisarNit(texto);
    if (nit.ok) revision = { ok: true, numero: nit.base };
    else if (nit.motivo === 'digito-de-verificacion') {
      const base = texto.replace(/[.\s]/g, '').split('-')[0];
      const r = revisarNit(base);
      revision = { ok: false, motivo: 'digitoDeVerificacion', ...(r.ok ? { dv: r.dv } : {}) };
    } else revision = { ok: false, motivo: 'nit' };
  } else {
    const limpio = texto.replace(/[.\s,]/g, '');
    const { min, max } = LARGOS[tipo];
    if (!/^\d+$/.test(limpio)) revision = { ok: false, motivo: 'soloNumeros' };
    else if (limpio.length < min || limpio.length > max) revision = { ok: false, motivo: 'largo', min, max };
    else revision = { ok: true, numero: limpio };
  }

  if (
    revision.ok &&
    documentoDelPropietario &&
    llaveDelDocumento(revision.numero) === llaveDelDocumento(documentoDelPropietario)
  ) {
    return { ok: false, motivo: 'esElPropietario' };
  }
  return revision;
}

const NOMBRE_DEL_TIPO: Record<string, string> = { PASSPORT: 'Pasaporte' };

/** «Carlos Restrepo · CC 80012345». Para el cajón, la ficha y el extracto. */
export function titularEnUnaLinea(t: {
  nombre: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
}): string {
  const documento = [t.tipoDocumento ? (NOMBRE_DEL_TIPO[t.tipoDocumento] ?? t.tipoDocumento) : null, t.numeroDocumento]
    .filter(Boolean)
    .join(' ');
  return [t.nombre, documento].filter(Boolean).join(' · ');
}
