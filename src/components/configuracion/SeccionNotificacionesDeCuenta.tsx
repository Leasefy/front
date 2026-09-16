'use client';

/**
 * Notificaciones de la cuenta: qué avisos le llegan a la persona. Las mismas
 * filas que la configuración de la inmobiliaria; lo que cambia por panel es qué
 * se pregunta, así que cada uno pasa sus filas.
 *
 * Una fila puede mover VARIAS banderas del back a la vez (el inquilino ve
 * «Correos de tu arriendo», que en el back son cuatro). Se muestra prendida si
 * alguna lo está, y al tocarla se escriben todas juntas.
 */

import type { Icon } from '@phosphor-icons/react';

import { toast } from '@/components/ui/toast';
import { Switch } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useNotificationSettings } from '@/lib/hooks/useSettings';
import type { NotificationSettings } from '@/lib/api/settings.service';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoDeSeccion, FilaDeAjuste, TarjetaDeAjustes } from './piezas';

type Bandera = {
  [K in keyof NotificationSettings]: NotificationSettings[K] extends boolean ? K : never;
}[keyof NotificationSettings];

export interface FilaDeNotificacion {
  id: string;
  claves: readonly Bandera[];
  icono: Icon;
  titulo: string;
  descripcion: string;
}

export function SeccionNotificacionesDeCuenta({ filas }: { filas: readonly FilaDeNotificacion[] }) {
  const { t } = useI18n();
  const { settings, isLoading, errorCrudo, refresh, updateSettings } = useNotificationSettings();

  // Si no se pudo leer lo guardado, no hay perillas que mostrar: las de fábrica
  // dirían «activado» sobre algo que nadie sabe si está activado.
  return (
    <EstadoDeDatos
      cargando={isLoading}
      error={errorCrudo}
      queEs="tus preferencias de notificaciones"
      onReintentar={refresh}
      esqueleto={<EsqueletoDeSeccion filas={filas.length} />}
    >
      <TarjetaDeAjustes>
        {filas.map((fila) => {
          const prendida = fila.claves.some((clave) => Boolean(settings[clave]));
          return (
            <FilaDeAjuste key={fila.id} icono={fila.icono} titulo={fila.titulo} descripcion={fila.descripcion}>
              <Switch
                checked={prendida}
                aria-label={fila.titulo}
                onCheckedChange={async () => {
                  const siguiente = !prendida;
                  const parche = Object.fromEntries(fila.claves.map((c) => [c, siguiente])) as Partial<NotificationSettings>;
                  try {
                    await updateSettings(parche);
                    toast.success(
                      siguiente
                        ? t('inmobiliaria.config.notifications.enabled')
                        : t('inmobiliaria.config.notifications.disabled'),
                    );
                  } catch {
                    toast.error('No pudimos guardar tu preferencia. Intenta de nuevo.');
                  }
                }}
              />
            </FilaDeAjuste>
          );
        })}
      </TarjetaDeAjustes>
    </EstadoDeDatos>
  );
}
