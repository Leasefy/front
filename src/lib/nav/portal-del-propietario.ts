/**
 * La arquitectura del portal del PROPIETARIO DE INMOBILIARIA — Nico eligió
 * «Tablero + 3 secciones» (21-10-2026), a partir de una reunión: «lo vería más
 * resumido… todo lo que es solicitudes, ahí también reparaciones».
 *
 * Antes: 10 filas (Inicio, Estado de cuenta, Mis giros, Aprobar reparaciones,
 * Escoger inquilino, Revisar el canon, Solicitudes, Mis informes, Certificados
 * y facturas, Mensajes). Ahora:
 *
 *   Inicio · Mi plata · Solicitudes · Mensajes
 *
 * y lo de cada sección va en pestañas arriba de la pantalla. Nada se borra:
 * escoger inquilino y revisar el canon cuelgan de «Por decidir».
 *
 * El propietario INDEPENDIENTE tiene otro menú (`LANDLORD_NAV_ITEMS`): esto no
 * lo toca.
 *
 * PURO: lo prueba `portal-del-propietario.test.ts`.
 */
import {
  Bank,
  Bell,
  Buildings,
  CalendarBlank,
  ChartBar,
  ClipboardText,
  FileText,
  House,
  Lifebuoy,
  Receipt,
  SealCheck,
  Users,
  UsersThree,
  Wallet,
  Wrench,
} from '@phosphor-icons/react';

import { esLaPestana, type PestanaDelPortal } from './portal-del-inquilino';

export interface SeccionDelPropietario {
  clave: 'mi-plata' | 'solicitudes' | 'mis-inmuebles' | 'contratos-y-plata';
  es: string;
  en: string;
  pestanas: readonly PestanaDelPortal[];
}

export const RUTA_POR_DECIDIR = '/panel/por-decidir';

export const MI_PLATA: SeccionDelPropietario = {
  clave: 'mi-plata',
  es: 'Mi plata',
  en: 'My money',
  pestanas: [
    { href: '/panel/estado-de-cuenta', es: 'Estado de cuenta', en: 'Account statement', icon: Receipt },
    { href: '/panel/giros', es: 'Giros', en: 'Payouts', icon: Bank },
    { href: '/panel/informes', es: 'Informes', en: 'Reports', icon: ChartBar },
    { href: '/panel/certificados', es: 'Certificados', en: 'Certificates', icon: SealCheck },
  ],
};

export const SOLICITUDES_DEL_PROPIETARIO: SeccionDelPropietario = {
  clave: 'solicitudes',
  es: 'Solicitudes',
  en: 'Requests',
  pestanas: [
    {
      href: RUTA_POR_DECIDIR,
      es: 'Por decidir',
      en: 'To decide',
      icon: ClipboardText,
      // Lo que la inmobiliaria le pregunta y se decide en su pantalla.
      tambienEn: ['/panel/escoger-inquilino', '/panel/revisar-canon'],
    },
    { href: '/panel/aprobaciones', es: 'Reparaciones', en: 'Repairs', icon: Wrench },
    { href: '/panel/solicitudes', es: 'Mis solicitudes', en: 'My requests', icon: Lifebuoy },
  ],
};

/** La sección de la ruta, o `null` (Inicio, Mensajes, la ficha de un inmueble, Perfil…). */
export function seccionDelPropietario(pathname: string): SeccionDelPropietario | null {
  for (const s of [MI_PLATA, SOLICITUDES_DEL_PROPIETARIO]) {
    if (s.pestanas.some((p) => esLaPestana(p, pathname))) return s;
  }
  return null;
}

export function rutasDelPropietario(seccion: SeccionDelPropietario): string[] {
  return seccion.pestanas.flatMap((p) => [p.href, ...(p.tambienEn ?? [])]);
}

/*
 * ── El propietario INDEPENDIENTE (sin inmobiliaria) — Nico eligió «sí, el
 * mismo criterio» (21-10-2026). Antes: 14 filas + una sección «Mi arriendo»
 * con cuatro «Pronto». Ahora: Inicio · Mis inmuebles · Contratos y plata ·
 * Solicitudes · Mensajes, con sus pestañas. Nada se borra.
 */
export const MIS_INMUEBLES: SeccionDelPropietario = {
  clave: 'mis-inmuebles',
  es: 'Mis inmuebles',
  en: 'My properties',
  pestanas: [
    { href: '/panel/propiedades', es: 'Propiedades', en: 'Properties', icon: Buildings, tambienEn: ['/panel/revisar-canon'] },
    { href: '/panel/candidatos', es: 'Candidatos', en: 'Candidates', icon: Users },
    { href: '/panel/visitas', es: 'Visitas', en: 'Visits', icon: CalendarBlank },
    { href: '/panel/seleccion', es: 'Elegir inquilino', en: 'Choose a tenant', icon: UsersThree, tambienEn: ['/panel/escoger-inquilino'] },
  ],
};

export const CONTRATOS_Y_PLATA: SeccionDelPropietario = {
  clave: 'contratos-y-plata',
  es: 'Contratos y plata',
  en: 'Contracts and money',
  pestanas: [
    { href: '/panel/contratos', es: 'Contratos', en: 'Contracts', icon: FileText },
    { href: '/panel/leases', es: 'Arriendos', en: 'Leases', icon: House },
    { href: '/panel/estado-de-cuenta', es: 'Estado de cuenta', en: 'Account statement', icon: Receipt },
    { href: '/panel/portafolio', es: 'Mi plata', en: 'My money', icon: Wallet },
    { href: '/panel/informes', es: 'Informes', en: 'Reports', icon: ChartBar, tambienEn: ['/panel/certificados'] },
  ],
};

export const SOLICITUDES_DEL_INDEPENDIENTE: SeccionDelPropietario = {
  clave: 'solicitudes',
  es: 'Solicitudes',
  en: 'Requests',
  pestanas: [
    { href: '/panel/solicitudes', es: 'Solicitudes', en: 'Requests', icon: Lifebuoy, tambienEn: ['/panel/aprobaciones'] },
    { href: '/panel/novedades', es: 'Novedades', en: 'Updates', icon: Bell },
  ],
};

export function seccionDelIndependiente(pathname: string): SeccionDelPropietario | null {
  for (const s of [MIS_INMUEBLES, CONTRATOS_Y_PLATA, SOLICITUDES_DEL_INDEPENDIENTE]) {
    if (s.pestanas.some((p) => esLaPestana(p, pathname))) return s;
  }
  return null;
}
