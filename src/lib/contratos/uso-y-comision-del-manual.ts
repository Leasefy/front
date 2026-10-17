import type { UsoDelInmueble } from '@/lib/contratos/escenarios-tributarios';

/**
 * Espejo de `back/src/contracts/manual/uso-y-comision-del-manual.ts` (QA de
 * agentes 17-10, decisiones de Nico):
 * - CONTR-6: si el inmueble no tiene comisión, «Crear contrato» la pide
 *   (sin ella el contrato se activaba sin tabla de cuotas).
 * - CONTR-7: el uso sale del tipo del inmueble cuando no deja dudas.
 */
const VIVIENDA = ['APARTMENT', 'HOUSE', 'STUDIO', 'ROOM'];
const COMERCIAL = ['COMMERCIAL', 'OFFICE', 'WAREHOUSE'];

export function usoPorElTipoDelInmueble(tipo: string | null | undefined): UsoDelInmueble | null {
  if (tipo && VIVIENDA.includes(tipo)) return 'VIVIENDA';
  if (tipo && COMERCIAL.includes(tipo)) return 'COMERCIAL';
  return null;
}

export const NOMBRE_DEL_USO: Record<UsoDelInmueble, string> = {
  VIVIENDA: 'Vivienda',
  COMERCIAL: 'Local comercial',
};

/** La comisión escrita: un porcentaje de 0 a 100 con hasta dos decimales (coma o punto). */
export function leerComision(texto: string): { valor: number | null; error: string | null } {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return { valor: null, error: 'Escribe la comisión de la inmobiliaria (% del canon).' };
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(limpio)) {
    return { valor: null, error: 'La comisión va como un porcentaje del canon, con hasta dos decimales (por ejemplo 10 u 8,5).' };
  }
  const valor = Number(limpio);
  if (valor > 100) return { valor: null, error: 'La comisión no puede pasar del 100 % del canon.' };
  return { valor, error: null };
}
