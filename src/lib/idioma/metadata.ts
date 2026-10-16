import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { CABECERA_DEL_IDIOMA, IDIOMA_POR_DEFECTO, conIdioma, esIdioma, type Idioma } from './idioma';

/**
 * La metadata de las páginas públicas en sus dos idiomas (16-10-2026). Sólo
 * del servidor: lee la cabecera que pone el middleware.
 */

/** El idioma de esta petición: el de la URL (`/es`, `/en`); fuera de lo público, español. */
export async function idiomaDeLaPeticion(): Promise<Idioma> {
  const valor = (await headers()).get(CABECERA_DEL_IDIOMA);
  return esIdioma(valor) ? valor : IDIOMA_POR_DEFECTO;
}

/**
 * canonical y hreflang de una página pública: cada idioma con su URL, y la
 * dirección sin prefijo como `x-default`, que manda a cada quien a su idioma.
 */
export function alternativasDelIdioma(ruta: string, idioma: Idioma): NonNullable<Metadata['alternates']> {
  return {
    canonical: conIdioma(ruta, idioma),
    languages: { 'es-CO': conIdioma(ruta, 'es'), en: conIdioma(ruta, 'en'), 'x-default': ruta },
  };
}
