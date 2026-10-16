'use client';

import { Bell, CreditCard, Envelope, FileText, Tag } from '@phosphor-icons/react';

import { useI18n } from '@/lib/i18n';
import { useLeases } from '@/lib/hooks/useLeases';
import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { SeccionSeguridad } from '@/components/configuracion/SeccionSeguridad';
import { SeccionPreferenciasDeCuenta } from '@/components/configuracion/SeccionPreferenciasDeCuenta';
import { SeccionDatosDeCuenta } from '@/components/configuracion/SeccionDatosDeCuenta';
import { SeccionEliminarCuenta } from '@/components/configuracion/SeccionEliminarCuenta';
import {
  SeccionNotificacionesDeCuenta,
  type FilaDeNotificacion,
} from '@/components/configuracion/SeccionNotificacionesDeCuenta';
import { TeamManagementSection } from '@/components/settings/TeamManagementSection';
import { PaymentAccountsSection } from '@/components/settings/PaymentAccountsSection';
import { SeccionPlan } from './SeccionPlan';
import type { SeccionDelPropietario } from './secciones';

function NotificacionesDelPropietario() {
  const { t, locale } = useI18n();
  const es = locale !== 'en';
  const filas: FilaDeNotificacion[] = [
    {
      id: 'postulaciones',
      claves: ['emailApplications'],
      icono: Envelope,
      titulo: t('landlordSettings.notifications.newApplication'),
      descripcion: t('landlordSettings.notifications.newApplicationDesc'),
    },
    {
      id: 'pagos',
      claves: ['emailPayments'],
      icono: CreditCard,
      titulo: t('landlordSettings.notifications.paymentReceived'),
      descripcion: t('landlordSettings.notifications.paymentReceivedDesc'),
    },
    {
      id: 'contratos',
      claves: ['emailContracts'],
      icono: FileText,
      titulo: t('landlordSettings.notifications.contractReminders'),
      descripcion: t('landlordSettings.notifications.contractRemindersDesc'),
    },
    {
      // Es la bandera de correos de mensajes; la bajada decía «push», que no es
      // lo que este interruptor mueve.
      id: 'mensajes',
      claves: ['emailMessages'],
      icono: Bell,
      titulo: t('landlordSettings.notifications.newMessages'),
      descripcion: es ? 'Cuando un candidato o tu inquilino te escribe' : 'When an applicant or your tenant writes to you',
    },
    {
      id: 'marketing',
      claves: ['emailMarketing'],
      icono: Tag,
      titulo: t('landlordSettings.notifications.promotionalEmails'),
      descripcion: t('landlordSettings.notifications.promotionalEmailsDesc'),
    },
  ];
  // QA 11-10: al propietario de INMOBILIARIA no le escriben candidatos ni le
  // llegan postulaciones; de esas perillas sólo le sirven los mensajes de su
  // inmobiliaria y las novedades. Lo de su plata y sus inmuebles llega siempre
  // (`preferencias-del-correo.ts` del back: es «obligatorio»).
  const administrados = useContratosAdministrados();
  const deInmobiliaria = administrados.doc !== null || Boolean(administrados.fichaSinContratos);
  if (deInmobiliaria) {
    const suyas: FilaDeNotificacion[] = [
      {
        id: 'mensajes',
        claves: ['emailMessages'],
        icono: Bell,
        titulo: es ? 'Mensajes de tu inmobiliaria' : 'Messages from your agency',
        descripcion: es ? 'Un correo cuando tu inmobiliaria te escribe por Mensajes' : 'An email when your agency writes to you',
      },
      {
        id: 'marketing',
        claves: ['emailMarketing'],
        icono: Tag,
        titulo: t('landlordSettings.notifications.promotionalEmails'),
        descripcion: t('landlordSettings.notifications.promotionalEmailsDesc'),
      },
    ];
    return (
      <SeccionNotificacionesDeCuenta
        filas={suyas}
        nota={
          es
            ? 'Los avisos de tu plata y tus inmuebles te llegan siempre: los giros, las reparaciones por aprobar, tu estado de cuenta y las respuestas a tus solicitudes.'
            : 'Notices about your money and properties always reach you: payouts, repairs to approve, your statement and replies to your requests.'
        }
      />
    );
  }
  return <SeccionNotificacionesDeCuenta filas={filas} />;
}

function EliminarCuentaDelPropietario() {
  const { t } = useI18n();
  const { getActive } = useLeases();
  const activos = getActive().length;
  return (
    <SeccionEliminarCuenta
      bloqueo={activos > 0 ? t('landlordSettings.dangerZone.activeLeasesWarning', { count: activos }) : null}
    />
  );
}

export function ContenidoDelPropietario({ id }: { id: SeccionDelPropietario }) {
  switch (id) {
    case 'plan':
      return <SeccionPlan />;
    case 'notificaciones':
      return <NotificacionesDelPropietario />;
    case 'seguridad':
      return <SeccionSeguridad />;
    case 'preferencias':
      return <SeccionPreferenciasDeCuenta />;
    case 'equipo':
      return <TeamManagementSection delay={0} />;
    case 'cuentas-de-recaudo':
      return <PaymentAccountsSection delay={0} />;
    case 'datos':
      return <SeccionDatosDeCuenta onboarding={{ clave: 'plan_onboarding_landlord', ruta: '/panel' }} />;
    case 'eliminar-cuenta':
      return <EliminarCuentaDelPropietario />;
  }
}
