'use client';

/**
 * Notificaciones: qué se avisa por correo y qué por push. Cada perilla escribe
 * de una en el back (`useNotificationSettings.updateSetting`).
 */

import { toast } from 'sonner';
import { Bell, CreditCard, Envelope, FileText, Tag } from '@phosphor-icons/react';

import { Switch } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useNotificationSettings } from '@/lib/hooks/useSettings';
import { EsqueletoDeSeccion, FilaDeAjuste, TarjetaDeAjustes } from './piezas';

/** Clave de la UI → clave del back. */
type ClaveDelBack = 'emailApplications' | 'emailPayments' | 'emailContracts' | 'pushAll' | 'emailMarketing';

export function SeccionNotificaciones() {
  const { t, locale } = useI18n();
  const { settings, isLoading, updateSetting } = useNotificationSettings();

  const filas: Array<{ clave: ClaveDelBack; icono: typeof Bell; titulo: string; desc: string }> = [
    {
      clave: 'emailApplications',
      icono: Envelope,
      titulo: t('inmobiliaria.config.notifications.newLeads'),
      desc: t('inmobiliaria.config.notifications.newLeadsDesc'),
    },
    {
      clave: 'emailPayments',
      icono: CreditCard,
      titulo: t('inmobiliaria.config.notifications.paymentsReceived'),
      desc: t('inmobiliaria.config.notifications.paymentsReceivedDesc'),
    },
    {
      clave: 'emailContracts',
      icono: FileText,
      titulo: t('inmobiliaria.config.notifications.contractExpiry'),
      desc: t('inmobiliaria.config.notifications.contractExpiryDesc'),
    },
    {
      clave: 'pushAll',
      icono: Bell,
      titulo: t('inmobiliaria.config.notifications.newMessages'),
      desc: t('inmobiliaria.config.notifications.newMessagesDesc'),
    },
    {
      clave: 'emailMarketing',
      icono: Tag,
      titulo: t('inmobiliaria.config.notifications.promotionalEmails'),
      desc: t('inmobiliaria.config.notifications.promotionalEmailsDesc'),
    },
  ];

  if (isLoading) return <EsqueletoDeSeccion filas={5} />;

  return (
    <TarjetaDeAjustes>
      {filas.map((fila) => (
        <FilaDeAjuste key={fila.clave} icono={fila.icono} titulo={fila.titulo} descripcion={fila.desc}>
          <Switch
            checked={!!settings[fila.clave]}
            aria-label={fila.titulo}
            onCheckedChange={async () => {
              const siguiente = !settings[fila.clave];
              try {
                await updateSetting(fila.clave, siguiente);
                toast.success(
                  siguiente
                    ? t('inmobiliaria.config.notifications.enabled')
                    : t('inmobiliaria.config.notifications.disabled'),
                );
              } catch {
                toast.error(locale === 'es' ? 'Error al actualizar configuración' : 'Error updating settings');
              }
            }}
          />
        </FilaDeAjuste>
      ))}
    </TarjetaDeAjustes>
  );
}
