/**
 * ¿Vivienda o comercial? Por el tipo de inmueble, con la MISMA lista del back
 * (`inmobiliaria/contratos-plantilla/contratos-plantilla.service.ts`:
 * `TIPOS_DE_VIVIENDA` y `TIPOS_COMERCIALES`). `null` = el tipo no lo dice (o no
 * se sabe todavía): la pantalla no decide por la persona.
 *
 * QA-CONT (Nico, 03-10-2026: «Depósito: dejarlo sólo para comercial»): en
 * vivienda no hay depósito en dinero (Ley 820, art. 16; CEO 17-09), así que
 * el campo sólo se pide cuando el contrato es comercial.
 */
export type UsoDelContrato = 'VIVIENDA' | 'COMERCIAL';

const VIVIENDA = new Set(['apartment', 'house', 'studio', 'room']);
const COMERCIAL = new Set(['commercial', 'office', 'warehouse', 'parking', 'land']);

export function usoPorElTipo(tipo: string | null | undefined): UsoDelContrato | null {
  const t = (tipo ?? '').toLowerCase();
  if (VIVIENDA.has(t)) return 'VIVIENDA';
  if (COMERCIAL.has(t)) return 'COMERCIAL';
  return null;
}
