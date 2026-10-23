/**
 * La arquitectura del portal del inquilino — Nico eligió «3 secciones» (21-10-2026).
 *
 * Venía de una reunión: «entro y… ¿qué hago?». El menú tenía 14 filas en
 * vertical (Inicio, Para ti, Explorar, Mi tope, Mi calificación, Mi arriendo,
 * Mis postulaciones, Contratos, Pagos, Estado de cuenta, Acuerdos, Mis casos,
 * Documentos, Mensajes). Ahora son SECCIONES, y lo de cada una va en pestañas
 * horizontales arriba de la pantalla (la misma barra del panel):
 *
 *   · quien ARRIENDA: Inicio · Mi arriendo · Mi calificación · Mensajes
 *   · quien NO arrienda: Inicio · Buscar arriendo · Mensajes
 *
 * Nada se borra: cada pantalla sigue en su ruta y cae en su sección. «Explorar»
 * deja el menú: buscar se hace en el marketplace, en OTRA pestaña, para no
 * sacar a la persona de su portal.
 *
 * PURO (sin React): lo prueban `portal-del-inquilino.test.ts`.
 */
import type { Icon } from '@phosphor-icons/react';
import {
  ClipboardText,
  CreditCard,
  FileMagnifyingGlass,
  FileText,
  Gauge,
  Heart,
  House,
  Receipt,
  Scroll,
  SealCheck,
  Target,
} from '@phosphor-icons/react';

/** Una pestaña de una sección. `tambienEn`: otras rutas que son esta misma pestaña. */
export interface PestanaDelPortal {
  href: string;
  es: string;
  en: string;
  icon: Icon;
  tambienEn?: readonly string[];
}

export interface SeccionDelPortal {
  clave: 'mi-arriendo' | 'buscar';
  es: string;
  en: string;
  pestanas: readonly PestanaDelPortal[];
}

/** El marketplace: buscar se hace allá, en otra pestaña. */
export const RUTA_DEL_MARKETPLACE = '/propiedades';

export const MI_ARRIENDO: SeccionDelPortal = {
  clave: 'mi-arriendo',
  es: 'Mi arriendo',
  en: 'My rental',
  pestanas: [
    { href: '/inquilino/arriendo', es: 'Resumen', en: 'Overview', icon: House },
    { href: '/inquilino/pagos', es: 'Pagos', en: 'Payments', icon: CreditCard },
    { href: '/inquilino/estado-de-cuenta', es: 'Estado de cuenta', en: 'Account statement', icon: Receipt },
    { href: '/inquilino/acuerdos', es: 'Acuerdos', en: 'Agreements', icon: Scroll },
    // «Solicitudes» y «Mis casos» son lo mismo (SO-07): la pestaña dice lo que se hace.
    { href: '/inquilino/casos', es: 'Solicitudes', en: 'Requests', icon: ClipboardText, tambienEn: ['/inquilino/solicitudes'] },
    // «Mi arriendo» y «Contratos» eran redundantes (la reunión): el contrato vive acá, con sus documentos.
    {
      href: '/inquilino/contratos',
      es: 'Contrato y documentos',
      en: 'Contract and documents',
      icon: FileText,
      tambienEn: ['/inquilino/documentos'],
    },
  ],
};

export const BUSCAR_ARRIENDO: SeccionDelPortal = {
  clave: 'buscar',
  es: 'Buscar arriendo',
  en: 'Find a rental',
  pestanas: [
    {
      href: '/inquilino/para-ti',
      es: 'Para ti',
      en: 'For you',
      icon: Target,
      // Lo que se mira mientras se busca (la ficha, el buscador viejo) cuelga de «Para ti».
      tambienEn: ['/inquilino/propiedades', '/inquilino/explorar'],
    },
    // C3 (revisora r25): «Inmuebles guardados» tiene su pestaña (antes encendía «Para ti» con otro título).
    { href: '/inquilino/guardados', es: 'Guardados', en: 'Saved', icon: Heart },
    { href: '/inquilino/aplicaciones', es: 'Mis postulaciones', en: 'My applications', icon: FileMagnifyingGlass },
    { href: '/inquilino/aprobacion', es: 'Mi tope', en: 'My rent limit', icon: SealCheck, tambienEn: ['/inquilino/estudio'] },
    { href: '/inquilino/calificacion', es: 'Mi calificación', en: 'My rating', icon: Gauge },
  ],
};

/** ¿Esta ruta es esta pestaña (ella, algo debajo, o una de sus `tambienEn`)? */
export function esLaPestana(pestana: Pick<PestanaDelPortal, 'href' | 'tambienEn'>, pathname: string): boolean {
  return [pestana.href, ...(pestana.tambienEn ?? [])].some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * La sección de la ruta, o `null` si la pantalla no tiene pestañas (Inicio,
 * Mensajes, Perfil, Notificaciones). «Mi calificación» de quien arrienda es una
 * fila suelta del menú: sin pestañas.
 */
export function seccionDeLaRuta(pathname: string, arrienda: boolean): SeccionDelPortal | null {
  if (MI_ARRIENDO.pestanas.some((p) => esLaPestana(p, pathname))) return MI_ARRIENDO;
  const enBuscar = BUSCAR_ARRIENDO.pestanas.find((p) => esLaPestana(p, pathname));
  if (!enBuscar) return null;
  if (arrienda && enBuscar.href === '/inquilino/calificacion') return null;
  return BUSCAR_ARRIENDO;
}

/** Las rutas de una sección, para que su fila del menú se marque en cualquiera de ellas. */
export function rutasDeLaSeccion(seccion: SeccionDelPortal): string[] {
  return seccion.pestanas.flatMap((p) => [p.href, ...(p.tambienEn ?? [])]);
}

export type FilaDelPortal =
  | { clave: 'inicio' }
  | { clave: 'mi-arriendo' }
  | { clave: 'buscar' }
  | { clave: 'calificacion' }
  | { clave: 'mensajes' };

/**
 * Las filas del menú según si arrienda. `null` = todavía no se sabe: sólo lo
 * que es de todos (Inicio y Mensajes), para no mostrar un menú y cambiarlo.
 */
export function filasDelMenu(arrienda: boolean | null): FilaDelPortal['clave'][] {
  if (arrienda === null) return ['inicio', 'mensajes'];
  return arrienda ? ['inicio', 'mi-arriendo', 'calificacion', 'mensajes'] : ['inicio', 'buscar', 'mensajes'];
}
