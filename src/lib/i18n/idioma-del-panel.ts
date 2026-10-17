/**
 * El idioma del panel, para lo que no es un componente: las llamadas al back y
 * al micro (Nico, 16-10-2026: «si el usuario colocó la plataforma en inglés
 * debe de contestar en inglés»).
 *
 * Cada llamada lleva `Accept-Language` con el idioma de ESTE panel, y el back y
 * el micro escriben en ese idioma lo que la persona va a leer (el chat de Ori,
 * las señales de Vinci, las razones de «Qué ofrecer»). Va por esa cabecera y no
 * por una propia porque el navegador la deja pasar sin preflight
 * (CORS-safelisted): una cabecera nueva exigiría cambiar el CORS del micro
 * ANTES de desplegar esto, o cada llamada del panel moriría.
 *
 * Exactamente `en` o `es-CO`: el micro sólo toma inglés con `en` exacto, así
 * que la lista que el navegador manda por su cuenta («en-US,en;q=0.9») nunca
 * cambia nada (`agent/src/lib/idioma/idioma-del-panel.ts`).
 *
 * Lo lee de donde lo guarda `I18nProvider` (`leasefy-locale`), en cada llamada:
 * cambiar el idioma en Configuración vale desde la siguiente.
 */

import type { Locale } from './types';

/** Donde `I18nProvider` guarda el idioma elegido. */
export const CLAVE_DEL_IDIOMA_DEL_PANEL = 'leasefy-locale';

/** El idioma del panel ahora mismo; español en el servidor o sin almacenamiento. */
export function idiomaDelPanelAhora(): Locale {
  try {
    if (typeof window === 'undefined') return 'es';
    return window.localStorage.getItem(CLAVE_DEL_IDIOMA_DEL_PANEL) === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

/** El valor de `Accept-Language` para el back y el micro. */
export function cabeceraDelIdiomaDelPanel(): 'en' | 'es-CO' {
  return idiomaDelPanelAhora() === 'en' ? 'en' : 'es-CO';
}
