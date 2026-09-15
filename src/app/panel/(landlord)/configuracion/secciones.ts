import { Bell, Crown, Eye, Globe, Shield, TrashSimple, Users, Wallet } from '@phosphor-icons/react';

import type { ConfiguracionDeCuenta } from '@/components/configuracion/configuracion-de-cuenta';

/**
 * Configuración del propietario: el mismo marco y las mismas filas que la de la
 * inmobiliaria (Nico, 2026-09-15). Antes era una página con ocho tarjetas
 * apiladas; cada una es ahora una sección con su URL.
 *
 * «Tu plan» abre en la raíz: es a donde manda «Gestionar suscripción» del header.
 */
export type SeccionDelPropietario =
  | 'plan'
  | 'notificaciones'
  | 'seguridad'
  | 'preferencias'
  | 'equipo'
  | 'cuentas-de-recaudo'
  | 'datos'
  | 'eliminar-cuenta';

export const CONFIGURACION_DEL_PROPIETARIO: ConfiguracionDeCuenta<SeccionDelPropietario> = {
  raiz: '/panel/configuracion',
  titulo: { es: 'Configuración', en: 'Settings' },
  subtitulo: {
    es: 'Tu plan, tu equipo, tus avisos y tus datos, en un solo lugar',
    en: 'Your plan, your team, your alerts and your data, in one place',
  },
  grupos: [
    { id: 'cuenta', label: { es: 'Tu cuenta', en: 'Your account' } },
    { id: 'operacion', label: { es: 'Tu operación', en: 'Your operation' } },
    { id: 'privacidad', label: { es: 'Privacidad', en: 'Privacy' } },
  ],
  secciones: [
    {
      id: 'plan',
      grupo: 'cuenta',
      slug: 'plan',
      label: { es: 'Tu plan', en: 'Your plan' },
      desc: { es: 'Qué incluye y cómo mejorarlo', en: 'What it includes and how to upgrade' },
      icon: Crown,
    },
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
      id: 'equipo',
      grupo: 'operacion',
      slug: 'equipo',
      label: { es: 'Equipo', en: 'Team' },
      desc: { es: 'Quién te ayuda a administrar', en: 'Who helps you manage' },
      icon: Users,
    },
    {
      id: 'cuentas-de-recaudo',
      grupo: 'operacion',
      slug: 'cuentas-de-recaudo',
      label: { es: 'Cuentas de recaudo', en: 'Payout accounts' },
      desc: { es: 'Dónde recibes el canon de cada inmueble', en: 'Where you receive rent for each property' },
      icon: Wallet,
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
