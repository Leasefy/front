'use client';

import { createContext, useContext } from 'react';

/**
 * ¿Quien mira es un propietario al que una INMOBILIARIA le administra los
 * inmuebles? Entonces no usa el producto del propietario independiente (planes,
 * candidatos, visitas, publicar): ve sólo lo suyo —estado de cuenta, giros,
 * informes, certificados y reparaciones—. Lo pone el layout del panel del
 * propietario y lo lee el encabezado para no ofrecerle un plan que no compra.
 */
const Contexto = createContext<boolean>(false);

export const PropietarioDeInmobiliariaProvider = Contexto.Provider;

export function useEsPropietarioDeInmobiliaria(): boolean {
  return useContext(Contexto);
}

/** Pantallas del panel del propietario que sí son de un propietario de inmobiliaria. */
const RUTAS_DEL_PROPIETARIO_DE_INMOBILIARIA = [
  '/panel/estado-de-cuenta',
  '/panel/aprobaciones',
  // 🔴 #14 (MANOS-1, 04-10-2026): escoger entre los candidatos de su inmueble.
  '/panel/escoger-inquilino',
  '/panel/informes',
  '/panel/certificados',
  '/panel/mensajes',
  // SO-27 (PQRS-FIX, 04-10-2026): sus PQRS y reportes de daños a la inmobiliaria.
  '/panel/solicitudes',
  '/panel/notificaciones',
  '/panel/perfil',
  '/panel/configuracion',
];

export function esRutaDelPropietarioDeInmobiliaria(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  if (pathname === '/panel') return true;
  return RUTAS_DEL_PROPIETARIO_DE_INMOBILIARIA.some((r) => pathname === r || pathname.startsWith(r + '/'));
}
