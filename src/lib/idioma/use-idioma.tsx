'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';

import { COOKIE_DEL_IDIOMA, conIdioma, IDIOMA_POR_DEFECTO, separarIdioma, type Idioma } from './idioma';

/**
 * El idioma de la página, para los componentes del cliente. Lo decide el
 * middleware por la URL (`/es`, `/en`) y lo pasa el layout raíz; fuera de la
 * parte pública, español.
 */
const ContextoDelIdioma = createContext<Idioma>(IDIOMA_POR_DEFECTO);

export function IdiomaDeLaPagina({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  return <ContextoDelIdioma.Provider value={idioma}>{children}</ContextoDelIdioma.Provider>;
}

export function useIdioma(): Idioma {
  return useContext(ContextoDelIdioma);
}

/**
 * El texto en el idioma de la página, escrito en pares junto al código:
 * `tx('Publicar gratis', 'List for free')`. El español queda tal cual estaba.
 */
export function useTx(): (es: string, en: string) => string {
  const idioma = useIdioma();
  return useCallback((es: string, en: string) => (idioma === 'en' ? en : es), [idioma]);
}

/** Un enlace interno con el idioma de la página: «/propiedades» → «/en/propiedades». */
export function useEnlace(): (href: string) => string {
  const idioma = useIdioma();
  return useCallback((href: string) => (href.startsWith('/') ? conIdioma(href, idioma) : href), [idioma]);
}

/**
 * Cambiar de idioma: queda recordado (cookie) y se recarga la misma página en
 * el otro. Recarga entera a propósito: el `<html lang>` y lo que pinta el
 * servidor salen del idioma de la URL.
 */
export function cambiarIdioma(nuevo: Idioma) {
  document.cookie = `${COOKIE_DEL_IDIOMA}=${nuevo}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  const { pathname, search, hash } = window.location;
  window.location.assign(conIdioma(`${separarIdioma(pathname).ruta}${search}${hash}`, nuevo));
}
