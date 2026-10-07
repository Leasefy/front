/**
 * El NIT de un inquilino, con su dígito de verificación (I-14, QA-INQ 03-10).
 *
 * El back guarda el documento SIN el dígito de verificación a propósito: la
 * llave de duplicados es la base (`normalizarDocumento`). Pero mostrar
 * «900777888» de una empresa que se cargó como «900777888-1» es mostrar un
 * NIT a medias. El DV no se guarda porque se CALCULA (algoritmo DIAN,
 * `digitoDeVerificacion` de `lib/onboarding/nit.ts`).
 *
 * Y lo que la persona escribe se revisa: hasta hoy un DV equivocado se
 * descartaba en silencio.
 */

import { digitoDeVerificacion } from '@/lib/onboarding/nit';
import type { TipoDeDocumento } from '@/lib/api/inquilinos.service';

/**
 * ¿Es un NIT? Con el tipo, lo dice el tipo. Sin él (un back que no lo manda),
 * sólo la forma inequívoca de una persona jurídica: 9 dígitos que empiezan
 * por 8 o 9. Las cédulas colombianas tienen hasta 8 dígitos o 10, nunca 9, así
 * que esa forma no confunde una cédula con un NIT.
 */
function esNit(base: string, tipo: TipoDeDocumento | null | undefined): boolean {
  if (tipo) return tipo === 'NIT';
  return /^[89]\d{8}$/.test(base);
}

/** El documento tal como se muestra: un NIT con `-DV`; lo demás, igual. */
export function documentoParaMostrar(
  documento: string,
  tipo?: TipoDeDocumento | null,
): string {
  const base = documento.trim();
  if (!/^\d+$/.test(base) || base.length > 15 || !esNit(base, tipo)) return documento;
  return `${base}-${digitoDeVerificacion(base)}`;
}

/**
 * Si la persona escribió un NIT con un dígito de verificación que no
 * corresponde, la frase que va bajo el campo. `null` = está bien (o no
 * escribió DV, o no es un NIT).
 */
export function errorDelDigitoDeVerificacion(
  escrito: string,
  tipo: TipoDeDocumento,
): string | null {
  if (tipo !== 'NIT') return null;
  const limpio = escrito.replace(/[.\s]/g, '');
  const partes = /^(\d+)-(\d)$/.exec(limpio);
  if (!partes) return null;
  const [, base, dvEscrito] = partes;
  if (base.length > 15) return null;
  const dv = digitoDeVerificacion(base);
  if (Number(dvEscrito) === dv) return null;
  return `El dígito de verificación de este NIT es ${dv}, no ${dvEscrito}.`;
}
