/**
 * La ayuda bajo «Número de documento» depende del TIPO de documento de la
 * fila (Nico, 2026-09-07).
 *
 * Antes decía para todos «Sin puntos ni espacios. En un NIT, el dígito de
 * verificación después del guion se ignora», y a quien corregía una cédula
 * le hablaba de NITs. La regla que valida el back es por tipo
 * (`reglaDelDocumento` en `normalizar-tercero.ts`); estos textos son su
 * espejo: si allá cambia un largo, cambia acá.
 */

/** Los valores del enum `PropietarioDocumentType` del back. */
export type TipoDeDocumento = 'CC' | 'CE' | 'TI' | 'NIT' | 'PASSPORT';

const SINONIMOS: Record<string, TipoDeDocumento> = {
  cc: 'CC',
  cedula: 'CC',
  ce: 'CE',
  extranjeria: 'CE',
  ti: 'TI',
  nit: 'NIT',
  passport: 'PASSPORT',
  pasaporte: 'PASSPORT',
  ps: 'PASSPORT',
  pa: 'PASSPORT',
};

/**
 * El tipo a partir de lo que hay en la fila: el enum que guardó el back
 * (`datos.tipoDocumento`) o lo que el operador acaba de elegir en el select.
 * Sin tildes ni puntos: «Cédula» y «C.C.» son CC. Lo que no se reconoce es
 * `null`, no CC: no se adivina.
 */
export function tipoDeDocumentoDe(crudo: unknown): TipoDeDocumento | null {
  if (typeof crudo !== 'string') return null;
  const llave = crudo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return SINONIMOS[llave] ?? null;
}

/*
 * 🔴 Ningún texto dice con qué dígito empieza un documento. Decía «las de
 * 10 empiezan por 1» y Nico lo tumbó (2026-09-07: «sí hay cédulas en
 * Colombia que inician con 3»). Sólo el largo, que sí es firme.
 */
const AYUDA: Record<TipoDeDocumento, string> = {
  NIT: '3 a 10 dígitos; el dígito de verificación después del guion se ignora.',
  CC: '3 a 10 dígitos, sin puntos ni espacios.',
  TI: '10 u 11 dígitos, sin puntos ni espacios.',
  CE: '3 a 10 dígitos, sin puntos ni espacios.',
  PASSPORT: '5 a 15 letras o dígitos, sin espacios.',
};

/** Sin tipo no se adivina la regla: se pide el tipo primero. */
export const AYUDA_SIN_TIPO =
  'Sin puntos ni espacios. El largo depende del tipo de documento: elegilo primero.';

export function ayudaDelNumeroDeDocumento(tipo: TipoDeDocumento | null): string {
  return tipo ? AYUDA[tipo] : AYUDA_SIN_TIPO;
}
