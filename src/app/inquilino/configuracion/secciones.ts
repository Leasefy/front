import { Bell, Eye, Globe, Shield, TrashSimple } from '@phosphor-icons/react';

import type { ConfiguracionDeCuenta } from '@/components/configuracion/configuracion-de-cuenta';

/**
 * Configuración del inquilino: el mismo marco y las mismas filas que la de la
 * inmobiliaria (Nico, 2026-09-15). Antes era una página con seis tarjetas en
 * dos columnas; cada una es ahora una sección con su URL.
 *
 * Notificaciones abre en la raíz: es lo que más se viene a cambiar, y es a
 * donde manda «Configurar» desde /inquilino/notificaciones.
 */
export type SeccionDelInquilino = 'notificaciones' | 'seguridad' | 'preferencias' | 'datos' | 'eliminar-cuenta';

export const CONFIGURACION_DEL_INQUILINO: ConfiguracionDeCuenta<SeccionDelInquilino> = {
  raiz: '/inquilino/configuracion',
  titulo: { es: 'Configuración', en: 'Settings' },
  subtitulo: { es: 'Tus avisos, tu acceso y tus datos, en un solo lugar', en: 'Your alerts, your access and your data, in one place' },
  grupos: [
    { id: 'cuenta', label: { es: 'Tu cuenta', en: 'Your account' } },
    { id: 'privacidad', label: { es: 'Privacidad', en: 'Privacy' } },
  ],
  secciones: [
    {
      id: 'notificaciones',
      grupo: 'cuenta',
      slug: 'notificaciones',
      label: { es: 'Notificaciones', en: 'Notifications' },
      desc: { es: 'Qué te avisamos y por dónde', en: 'What we tell you and how' },
      icon: Bell,
    },
    {
      id: 'seguridad',
      grupo: 'cuenta',
      slug: 'seguridad',
      label: { es: 'Seguridad', en: 'Security' },
      desc: { es: 'Doble factor, contraseña y sesiones', en: 'Two-factor, password and sessions' },
      icon: Shield,
    },
    {
      id: 'preferencias',
      grupo: 'cuenta',
      slug: 'preferencias',
      label: { es: 'Preferencias', en: 'Preferences' },
      desc: { es: 'Tema e idioma', en: 'Theme and language' },
      icon: Globe,
    },
    {
      id: 'datos',
      grupo: 'privacidad',
      slug: 'datos',
      label: { es: 'Tus datos', en: 'Your data' },
      desc: { es: 'Descárgalos, reinicia los pasos iniciales y lee nuestras políticas', en: 'Download them, reset onboarding and read our policies' },
      icon: Eye,
    },
    {
      id: 'eliminar-cuenta',
      grupo: 'privacidad',
      slug: 'eliminar-cuenta',
      label: { es: 'Eliminar cuenta', en: 'Delete account' },
      desc: { es: 'Borra tu cuenta de Leasefy', en: 'Delete your Leasefy account' },
      icon: TrashSimple,
    },
  ],
};
