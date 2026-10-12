import type { Property } from '@/lib/types/property';
import type { Busqueda, TipoDeLaApi } from './busqueda';

/**
 * Ejemplos de búsqueda, sacados del catálogo real.
 *
 * Enseñan que se puede escribir como se habla y, con un clic, ya hay
 * resultados. La primera versión era una lista fija —«2 alcobas en Laureles
 * hasta $3M»— y sonaba muy bien: devolvía CERO contra el inventario real. Un
 * ejemplo que termina en vacío enseña lo contrario de lo que quiere enseñar.
 *
 * Por eso se arman con lo que hay: las combinaciones tipo × ciudad × negocio
 * más repetidas del catálogo sin filtrar. Al clickear no dependen del
 * entendedor: ponen la ciudad, el tipo y el negocio como filtros
 * (`busquedaDeLaSugerencia`), así el ejemplo siempre aterriza.
 *
 * Sólo tipos y ciudades que los filtros saben mostrar.
 */
export type Sugerencia = { texto: string; city: string; type: string; venta?: boolean };

export const CIUDADES_DEL_FILTRO = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena'];

const TIPO_LABEL: Record<string, string> = { apartment: 'Apartamento', house: 'Casa', studio: 'Estudio' };
const TIPO_API: Record<string, TipoDeLaApi> = { apartment: 'APARTMENT', house: 'HOUSE', studio: 'STUDIO' };

export function sugerenciasDelCatalogo(propiedades: Property[], cuantas = 4): Sugerencia[] {
  const conteo = new Map<string, { n: number; s: Sugerencia }>();
  for (const p of propiedades) {
    const tipo = TIPO_LABEL[p.type];
    if (!tipo || !CIUDADES_DEL_FILTRO.includes(p.city)) continue;
    const venta = p.listingType === 'sale';
    const clave = `${p.type}|${p.city}|${venta}`;
    const previo = conteo.get(clave);
    if (previo) {
      previo.n += 1;
      continue;
    }
    conteo.set(clave, {
      n: 1,
      s: { texto: `${tipo}${venta ? ' en venta' : ''} en ${p.city}`, city: p.city, type: p.type, ...(venta ? { venta } : {}) },
    });
  }
  return [...conteo.values()]
    .sort((a, b) => b.n - a.n || a.s.texto.localeCompare(b.s.texto, 'es'))
    .slice(0, cuantas)
    .map((x) => x.s);
}

/** La búsqueda de un ejemplo: filtros explícitos, nunca depende del entendedor. */
export function busquedaDeLaSugerencia(s: Sugerencia): Busqueda {
  return {
    operacion: s.venta ? 'venta' : 'arriendo',
    ciudad: s.city,
    ...(TIPO_API[s.type] ? { tipo: TIPO_API[s.type] } : {}),
  };
}
