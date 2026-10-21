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
import { Bank, ClipboardText, Lifebuoy, Receipt, SealCheck, Wrench, ChartBar } from '@phosphor-icons/react';

import { esLaPestana, type PestanaDelPortal } from './portal-del-inquilino';

export interface SeccionDelPropietario {
  clave: 'mi-plata' | 'solicitudes';
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
