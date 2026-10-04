'use client';

/**
 * Notificaciones: qué te llega POR CORREO. Cada perilla escribe de una en el
 * back (`useNotificationSettings.updateSetting`).
 *
 * CF-11 (QA 04-10): antes las perillas se guardaban y ningún envío las leía, y
 * «Nuevos mensajes» decía «push» pero apagaba TODO el push (que el panel no
 * tiene). Ahora el back respeta cada perilla al mandar el correo
 * (`back/src/notifications/lib/preferencias-del-correo.ts`), la campana siempre
 * avisa, y lo que no se puede apagar se dice.
 */

import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import {
  CalendarBlank,
  ChatCircle,
  CreditCard,
  Envelope,
  FileText,
  LockSimple,
  Tag,
} from '@phosphor-icons/react';

import { Switch } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useNotificationSettings } from '@/lib/hooks/useSettings';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { EsqueletoDeSeccion, FilaDeAjuste, TarjetaDeAjustes } from './piezas';

/** Las perillas por tema; las mismas claves que lee el back al mandar. */
type ClaveDelBack =
  | 'emailApplications'
  | 'emailPayments'
  | 'emailContracts'
  | 'emailVisits'
  | 'emailMessages'
  | 'emailMarketing';

export function SeccionNotificaciones() {
  const { locale } = useI18n();
  const es = locale === 'es';
  const { settings, isLoading, errorCrudo, refresh, updateSetting } = useNotificationSettings();

  const filas: Array<{ clave: ClaveDelBack; icono: typeof Envelope; titulo: string; desc: string }> = [
    {
      clave: 'emailApplications',
      icono: Envelope,
      titulo: es ? 'Postulaciones' : 'Applications',
      desc: es
        ? 'Cuando alguien se postula a un inmueble o completa lo que le pediste'
        : 'When someone applies to a property or sends what you asked for',
    },
    {
      clave: 'emailPayments',
      icono: CreditCard,
      titulo: es ? 'Pagos y cobros' : 'Payments',
      desc: es
        ? 'Pagos recibidos, comprobantes, cobros generados y cobros vencidos'
        : 'Payments received, receipts, generated and overdue charges',
    },
    {
      clave: 'emailContracts',
      icono: FileText,
      titulo: es ? 'Contratos' : 'Contracts',
      desc: es
        ? 'Firmas, contratos activados o terminados y los que están por vencer'
        : 'Signatures, activated or ended contracts and those about to expire',
    },
    {
      clave: 'emailVisits',
      icono: CalendarBlank,
      titulo: es ? 'Visitas' : 'Visits',
      desc: es ? 'Solicitudes, cambios y recordatorios de visitas' : 'Visit requests, changes and reminders',
    },
    {
      clave: 'emailMessages',
      icono: ChatCircle,
      titulo: es ? 'Mensajes' : 'Messages',
      desc: es ? 'Cuando un inquilino, propietario o candidato te escribe' : 'When someone writes to you',
    },
    {
      clave: 'emailMarketing',
      icono: Tag,
      titulo: es ? 'Novedades de Leasefy' : 'Leasefy news',
      desc: es ? 'Novedades, consejos y ofertas de Leasefy' : 'News, tips and offers from Leasefy',
    },
  ];

  // Si no se pudo leer lo guardado, no hay perillas que mostrar: las de
  // fábrica dirían «activado» sobre algo que nadie sabe si está activado.
  return (
    <EstadoDeDatos
      cargando={isLoading}
      error={errorCrudo}
      queEs="tus preferencias de notificaciones"
      onReintentar={refresh}
      esqueleto={<EsqueletoDeSeccion filas={6} />}
    >
      <div className="space-y-4">
        <p className="text-sm text-fg-muted" data-testid="notificaciones-que-es">
          {es
            ? 'Todo te llega a la campana de Leasefy. Aquí eliges qué te llega además por correo.'
            : 'Everything reaches your Leasefy bell. Choose what also reaches your email.'}
        </p>
        <TarjetaDeAjustes>
          {filas.map((fila) => (
            <FilaDeAjuste key={fila.clave} icono={fila.icono} titulo={fila.titulo} descripcion={fila.desc}>
              <Switch
                checked={!!settings[fila.clave]}
                aria-label={`${fila.titulo} por correo`}
                onCheckedChange={async () => {
                  const siguiente = !settings[fila.clave];
                  try {
                    await updateSetting(fila.clave, siguiente);
                    toast.success(
                      siguiente
                        ? es
                          ? `${fila.titulo}: te llegará por correo`
                          : 'Email enabled'
                        : es
                          ? `${fila.titulo}: ya no te llegará por correo (sigue en la campana)`
                          : 'Email disabled',
                    );
                  } catch (e) {
                    // Por el traductor: un 4xx dice qué pasó, un 5xx «de nuestro
                    // lado» con la referencia, «conexión» sólo sin respuesta.
                    toast.error(
                      mensajeParaLaPersona(e, {
                        porDefecto: es
                          ? 'No se pudo cambiar la notificación. Prueba de nuevo en un momento.'
                          : 'Error updating settings',
                        accion: 'cambiar la notificación',
                      }),
                    );
                  }
                }}
              />
            </FilaDeAjuste>
          ))}
        </TarjetaDeAjustes>
        <TarjetaDeAjustes>
          <FilaDeAjuste
            icono={LockSimple}
            titulo={es ? 'Lo que siempre te llega' : 'Always sent'}
            descripcion={
              es
                ? 'Los códigos para entrar o firmar, las invitaciones y copias de lo que firmas, los recibos de lo que pagas, el resultado de lo que cargas (importaciones y migraciones) y los avisos de tu plan no se pueden apagar.'
                : 'Sign-in and signing codes, signing invitations and signed copies, payment receipts, the result of your imports and plan notices cannot be turned off.'
            }
          >
            <span data-testid="notificaciones-obligatorias" className="text-xs text-fg-subtle">
              {es ? 'Siempre' : 'Always'}
            </span>
          </FilaDeAjuste>
        </TarjetaDeAjustes>
      </div>
    </EstadoDeDatos>
  );
}
