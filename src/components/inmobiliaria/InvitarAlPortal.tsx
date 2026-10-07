'use client';

/**
 * «No tiene cuenta en Leasefy» — dicho, y con la salida al lado.
 *
 * 🔴 Nico, 2026-09-12, mirando la ficha de una propietaria suya: «no le
 * colocaste la opción al propietario de poder mandarle un mensaje y que ese
 * mensaje sea por Leasefy».
 *
 * El botón de mensaje SÍ estaba — pero sólo se dibuja si la persona tiene
 * cuenta, y casi ningún propietario la tiene: en su cartera real son **1.733
 * propietarios, 832 con correo y 57 con cuenta**. La migración le crea cuenta
 * al INQUILINO, que firma y usa el portal; un `Propietario` es la ficha
 * comercial de la inmobiliaria y puede no ser usuario de nada.
 *
 * Mi error fue esconder el botón en silencio. Un espacio vacío se lee como
 * «falta la función», no como «esta persona no tiene cuenta» — y de las dos
 * lecturas la equivocada es la que se saca cualquiera. Así que se dice, y en
 * el mismo lugar se ofrece resolverlo.
 *
 * Después de invitar no hace falta recargar: el back devuelve el
 * `cuentaDePortalId` y la ficha ya puede ofrecer el mensaje.
 */

import { useState } from 'react';
import { ArrowClockwise, PaperPlaneTilt, UserCirclePlus } from '@phosphor-icons/react';
import { CrossFade } from '@leasefy/cadence';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';

export interface InvitarAlPortalProps {
  propietarioId: string;
  /** Sin correo no hay a dónde mandar nada: se dice, no se ofrece. */
  correo?: string | null;
  /** Se llama con la cuenta recién creada, para que la ficha ofrezca el mensaje. */
  onInvitado: (cuentaDePortalId: string) => void;
  /**
   * 🔴 P-24 (QA-PROP, 03-10): la invitación que NO salió (`enviada: false`).
   * Lo guarda la ficha —no este bloque— porque la cuenta queda creada igual y
   * la ficha dejaría de montar el bloque: con esto se queda en «Invitación sin
   * entregar» con «Reintentar» hasta que salga.
   */
  sinEntregar?: { motivo?: string } | null;
  /** `{ motivo }` cuando no salió; `null` cuando salió (o al reintentar con éxito). */
  onSinEntregar?: (sinEntregar: { motivo?: string } | null) => void;
}

/**
 * Por qué no salió, en palabras y con qué hacer. El back manda un CÓDIGO
 * (`DOMINIO_NO_ENTREGABLE`…); nunca se pinta tal cual, y uno que no esté acá
 * dice lo general.
 */
export function porQueNoSalioLaInvitacion(motivo: string | undefined, correo?: string | null): string {
  switch (motivo) {
    case 'DOMINIO_NO_ENTREGABLE':
      return `El correo ${correo?.trim() || 'que tiene'} es de un dominio que no recibe mensajes (de prueba o reservado). Corrígelo con «Editar» y vuelve a intentarlo.`;
    case 'RECIEN_ENVIADA':
      return 'Ya se la mandamos hace menos de 10 minutos. Espera un rato antes de reintentar.';
    case 'CORREO_NO_CONFIGURADO':
      return 'El envío de correos no está disponible en este momento. Reintenta más tarde; si sigue igual, escríbenos.';
    case 'ENVIO_FALLIDO':
      return 'El correo no salió esta vez. Reintenta en unos minutos.';
    default:
      return 'No pudimos mandarla. Reintenta en unos minutos.';
  }
}

export function InvitarAlPortal({
  propietarioId,
  correo,
  onInvitado,
  sinEntregar = null,
  onSinEntregar,
}: InvitarAlPortalProps) {
  const [enviando, setEnviando] = useState(false);
  const tieneCorreo = !!correo?.trim();

  const invitar = async () => {
    setEnviando(true);
    try {
      const r = await propietariosApi.invitarAlPortal(propietarioId);

      if (r.cuentaDePortalId) onInvitado(r.cuentaDePortalId);

      // P-24: el bloque se queda diciendo que no salió, o se va porque salió.
      onSinEntregar?.(r.enviada ? null : { motivo: r.motivo });

      if (r.enviada) {
        toast.success('Invitación enviada', {
          description: `Le llegó a ${correo} un enlace para elegir su contraseña. Ya puedes escribirle por Leasefy.`,
        });
      } else {
        /*
         * La cuenta quedó creada —y por eso el mensaje ya funciona— pero el
         * correo no salió. Decirlo es la diferencia entre «ya está» y una
         * persona esperando un enlace que nunca llegó.
         */
        toast.warning('La cuenta quedó creada, el correo no salió', {
          description:
            r.motivo === 'DOMINIO_NO_ENTREGABLE'
              ? 'Ese correo no existe como dominio. Corrígelo en su ficha.'
              : r.motivo === 'RECIEN_ENVIADA'
                ? 'Ya se le mandó hace un rato. Espera unos minutos antes de reenviar.'
                : 'Queda pendiente de reenvío. Ya puedes escribirle por Leasefy igual.',
        });
      }
    } catch (e) {
      /*
       * Con la regla de oro (02-10-2026): un 4xx dice lo que dijo el back (el
       * correo que no sirve, la cuenta que ya existe); un 5xx, que fue de
       * nuestro lado con la referencia; «conexión» sólo si no hubo respuesta.
       * Antes cualquier fallo sin `messages[]` decía «Intenta de nuevo».
       */
      toast.error(
        mensajeParaLaPersona(e, {
          porDefecto: 'No pudimos invitarlo. Prueba de nuevo en un momento.',
          accion: 'invitarlo al portal',
        }),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className={
        sinEntregar
          ? // El motivo es largo (dice qué hacer): el botón va debajo, no al lado.
            'flex flex-col items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3'
          : 'flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3 dark:bg-ink'
      }
      data-testid={sinEntregar ? 'invitacion-sin-entregar' : 'propietario-sin-cuenta'}
    >
      {/* Invitar ⇄ sin entregar: el texto se cruza (fundido, tokens de Cadence). */}
      <CrossFade swapKey={sinEntregar ? 'sin-entregar' : 'invitar'} className="min-w-0 flex-1 self-stretch">
        {sinEntregar ? (
          <div className="min-w-0" role="status">
            <p className="text-sm font-medium text-warning">Invitación sin entregar</p>
            <p className="mt-0.5 break-words text-caption text-fg" data-testid="motivo-de-la-invitacion">
              {porQueNoSalioLaInvitacion(sinEntregar.motivo, correo)}
            </p>
            <p className="mt-0.5 text-caption text-fg-muted">
              Su cuenta ya existe: mientras tanto puedes escribirle por Leasefy.
            </p>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">No tiene cuenta en Leasefy</p>
            <p className="text-xs text-fg-muted dark:text-fg-subtle">
              {tieneCorreo
                ? 'Invítalo y podrás escribirle por aquí, sin salir del producto.'
                : 'Agrega su correo en la ficha para poder invitarlo.'}
            </p>
          </div>
        )}
      </CrossFade>
      <Button
        type="button"
        variant="outline"
        size="sm"
        hideArrow
        disabled={!tieneCorreo || enviando}
        onClick={() => void invitar()}
        data-testid="invitar-propietario"
      >
        {enviando ? (
          <>
            <PaperPlaneTilt className="mr-1.5 h-4 w-4 animate-pulse" />
            Invitando…
          </>
        ) : sinEntregar ? (
          <>
            <ArrowClockwise className="mr-1.5 h-4 w-4" />
            Reintentar
          </>
        ) : (
          <>
            <UserCirclePlus className="mr-1.5 h-4 w-4" />
            Invitar
          </>
        )}
      </Button>
    </div>
  );
}
