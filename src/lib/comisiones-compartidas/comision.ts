/**
 * Lo que la pantalla de Comisión compartida dice de cada una (puro y probado). Cada lado lee SU parte primero.
 */
import type { ComisionCompartida } from '@/lib/api/comisiones-compartidas.service';

export type Tono = 'info' | 'success' | 'warning' | 'critical' | 'neutral';
export type FiltroDeEstado = 'todas' | 'por-responder' | 'aceptadas' | 'cerradas';

/** Los repartos que más se usan (lo de quien captó primero). */
export const REPARTOS_RAPIDOS = [50, 60, 70] as const;
export const POR_PAGINA = 12;

/** El nombre del estado y su tono, dicho para quien mira. */
export function estadoDeLaComision(c: Pick<ComisionCompartida, 'estado' | 'lado'>): { texto: string; tono: Tono } {
  switch (c.estado) {
    case 'propuesta':
      return c.lado === 'trae' ? { texto: 'Por responder', tono: 'warning' } : { texto: 'Esperando respuesta', tono: 'info' };
    case 'aceptada':
      return { texto: 'Aceptada', tono: 'success' };
    case 'rechazada':
      return { texto: 'No aceptada', tono: 'neutral' };
    case 'retirada':
      return { texto: 'Retirada', tono: 'neutral' };
  }
}

export function cabeEnElFiltro(c: Pick<ComisionCompartida, 'estado'>, filtro: FiltroDeEstado): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'por-responder') return c.estado === 'propuesta';
  if (filtro === 'aceptadas') return c.estado === 'aceptada';
  return c.estado === 'rechazada' || c.estado === 'retirada';
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Las de un lado, que coinciden con lo buscado (inmueble, barrio, la otra inmobiliaria) y con el filtro. */
export function filtrarComisiones(
  lista: readonly ComisionCompartida[],
  o: { lado: ComisionCompartida['lado']; buscar: string; estado: FiltroDeEstado },
): ComisionCompartida[] {
  const q = sinTildes(o.buscar.trim());
  return lista.filter(
    (c) =>
      c.lado === o.lado &&
      cabeEnElFiltro(c, o.estado) &&
      (!q || sinTildes([c.inmueble.titulo, c.inmueble.barrio, c.inmueble.ciudad, c.otra.nombre].filter(Boolean).join(' ')).includes(q)),
  );
}

/** Cuántas te toca responder (para el número de la pestaña). */
export function porResponder(lista: readonly ComisionCompartida[]): number {
  return lista.filter((c) => c.lado === 'trae' && c.estado === 'propuesta').length;
}

/** «Tú 60 % · Nogal 40 %»: quien mira primero. */
export function repartoParaQuienMira(tuParte: number, otra: string): string {
  return `Tú ${tuParte} % · ${otra} ${100 - tuParte} %`;
}

/** El precio que se ve en la tarjeta. */
export function precioDelInmueble(i: Pick<ComisionCompartida['inmueble'], 'canon' | 'venta'>): string | null {
  const pesos = (n: number) => `$ ${Math.round(n).toLocaleString('es-CO')}`;
  if (i.canon) return `${pesos(i.canon)} al mes`;
  if (i.venta) return pesos(i.venta);
  return null;
}
