'use client';

import { CreditCard, DeviceMobile, Envelope, Tag } from '@phosphor-icons/react';

import { useI18n } from '@/lib/i18n';
import { SeccionSeguridad } from '@/components/configuracion/SeccionSeguridad';
import { SeccionPreferenciasDeCuenta } from '@/components/configuracion/SeccionPreferenciasDeCuenta';
import { SeccionDatosDeCuenta } from '@/components/configuracion/SeccionDatosDeCuenta';
import { SeccionEliminarCuenta } from '@/components/configuracion/SeccionEliminarCuenta';
import {
  SeccionNotificacionesDeCuenta,
  type FilaDeNotificacion,
} from '@/components/configuracion/SeccionNotificacionesDeCuenta';
import type { SeccionDelInquilino } from './secciones';

function NotificacionesDelInquilino() {
  const { locale } = useI18n();
  const es = locale !== 'en';
  const filas: FilaDeNotificacion[] = [
    {
      // En el back son cuatro banderas; para el inquilino es un solo tema.
      id: 'correos',
      claves: ['emailApplications', 'emailVisits', 'emailContracts', 'emailMessages'],
      icono: Envelope,
      titulo: es ? 'Correos de tu arriendo' : 'Rental emails',
      descripcion: es ? 'Postulaciones, visitas, contratos y mensajes' : 'Applications, visits, contracts and messages',
    },
    {
      id: 'push',
      claves: ['pushAll'],
      icono: DeviceMobile,
      titulo: es ? 'Notificaciones push' : 'Push notifications',
      descripcion: es ? 'Avisos en tu dispositivo' : 'Alerts on your device',
    },
    {
      id: 'pagos',
      claves: ['emailPayments'],
      icono: CreditCard,
      titulo: es ? 'Recordatorios de pago' : 'Payment reminders',
      descripcion: es ? 'Antes de que venza tu canon' : 'Before your rent is due',
    },
    {
      id: 'marketing',
      claves: ['emailMarketing'],
      icono: Tag,
      titulo: es ? 'Ofertas y novedades' : 'Offers and news',
      descripcion: es ? 'Lo nuevo de Leasefy' : "What's new at Leasefy",
    },
  ];
  return <SeccionNotificacionesDeCuenta filas={filas} />;
}

export function ContenidoDelInquilino({ id }: { id: SeccionDelInquilino }) {
  switch (id) {
    case 'notificaciones':
      return <NotificacionesDelInquilino />;
    case 'seguridad':
      return <SeccionSeguridad />;
    case 'preferencias':
      return <SeccionPreferenciasDeCuenta />;
    case 'datos':
      return <SeccionDatosDeCuenta onboarding={{ clave: 'plan_onboarding_tenant', ruta: '/onboarding/inquilino' }} />;
    case 'eliminar-cuenta':
      return <SeccionEliminarCuenta />;
  }
}
