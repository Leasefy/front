import type { Agency } from '@/lib/auth/types';

/**
 * 🔴 El modo comercial de la inmobiliaria que se registró desde el marketplace
 * (Juan, 19-10-2026: «este solo quería publicar, pero entró a TODO y ya no sabe
 * qué hacer» → «que solo vea lo comercial y a punta de pop ups le empezamos a
 * meter todo»). Lo decide el back (`modoComercial`, la regla en
 * `back/src/inmobiliaria/agency/modo-comercial.ts`: sin NIT y sin traspaso al
 * micro). Al «Activar» (el asistente: NIT, razón social y segundo factor) sale
 * solo y se abre todo el panel.
 *
 * Abierto: lo que necesita quien sólo quiere publicar y atender interesados.
 * Cerrado: todo lo demás, y además lo que depende de los agentes de IA, que no
 * conocen a esta inmobiliaria hasta que se activa.
 */

export const INICIO_DEL_MODO_COMERCIAL = '/panel/inmobiliaria/inmuebles';

/** Lo que el asistente pide para activar (NIT, razón social; después el segundo factor). */
export const RUTA_PARA_ACTIVAR = '/onboarding/inmobiliaria';

const ABIERTAS: readonly string[] = [
  '/panel/inmobiliaria/inmuebles',
  '/panel/inmobiliaria/pipeline',
  '/panel/inmobiliaria/postulaciones',
  '/panel/inmobiliaria/agenda',
  '/panel/inmobiliaria/mensajes',
  '/panel/inmobiliaria/configuracion/tu-pagina',
];

/** Dentro de lo abierto, lo que hacen los agentes de IA. */
const CERRADAS_ADENTRO: readonly string[] = [
  '/panel/inmobiliaria/inmuebles/avaluos',
  '/panel/inmobiliaria/postulaciones/matching',
  '/panel/inmobiliaria/postulaciones/asegurabilidad',
  '/panel/inmobiliaria/postulaciones/estudio',
];

function esOdebajo(ruta: string, base: string): boolean {
  return ruta === base || ruta.startsWith(`${base}/`);
}

/** ¿Esta ruta del panel se usa sin activar la cuenta? */
export function abiertaEnModoComercial(ruta: string): boolean {
  const limpia = ruta.split(/[?#]/)[0]!.replace(/\/+$/, '') || '/';
  if (CERRADAS_ADENTRO.some((c) => esOdebajo(limpia, c))) return false;
  return ABIERTAS.some((a) => esOdebajo(limpia, a));
}

export function enModoComercial(agency: Pick<Agency, 'modoComercial'> | null | undefined): boolean {
  return agency?.modoComercial === true;
}
