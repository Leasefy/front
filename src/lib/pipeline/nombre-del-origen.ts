/**
 * PL-19 (QA del 04-10-2026): «Orígenes» mostraba los códigos crudos
 * («FINCARAIZ METROCUADRADO MERCADO_LIBRE…»). Espejo de `NOMBRE_DEL_ORIGEN`
 * del back (`leads/origen-del-lead.ts`); un origen propio de la inmobiliaria
 * sale con mayúscula inicial y sin guiones bajos.
 */
export const NOMBRE_DEL_ORIGEN: Record<string, string> = {
  FINCARAIZ: 'Fincaraíz',
  METROCUADRADO: 'Metrocuadrado',
  MERCADO_LIBRE: 'Mercado Libre',
  SITIO_PROPIO: 'Sitio propio',
  WHATSAPP: 'WhatsApp',
  LLAMADA: 'Llamada',
  REFERIDO: 'Referido',
  PORTERIA: 'Portería',
  OTRO: 'Otro',
};

export function nombreDelOrigen(codigo: string): string {
  if (NOMBRE_DEL_ORIGEN[codigo]) return NOMBRE_DEL_ORIGEN[codigo];
  const t = codigo.replace(/_/g, ' ').toLowerCase().trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : codigo;
}
