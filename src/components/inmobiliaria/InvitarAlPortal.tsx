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
import { PaperPlaneTilt, UserCirclePlus } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/client';
import { propietariosApi } from '@/lib/api/inmobiliaria.service';

export interface InvitarAlPortalProps {
  propietarioId: string;
  /** Sin correo no hay a dónde mandar nada: se dice, no se ofrece. */
  correo?: string | null;
  /** Se llama con la cuenta recién creada, para que la ficha ofrezca el mensaje. */
  onInvitado: (cuentaDePortalId: string) => void;
}

export function InvitarAlPortal({
  propietarioId,
  correo,
  onInvitado,
}: InvitarAlPortalProps) {
  const [enviando, setEnviando] = useState(false);
  const tieneCorreo = !!correo?.trim();

  const invitar = async () => {
    setEnviando(true);
    try {
      const r = await propietariosApi.invitarAlPortal(propietarioId);

      if (r.cuentaDePortalId) onInvitado(r.cuentaDePortalId);

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
      toast.error(
        e instanceof ApiError && e.messages
          ? e.messages.join(' · ')
          : 'No pudimos invitarlo. Intenta de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3 dark:bg-ink"
      data-testid="propietario-sin-cuenta"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">No tiene cuenta en Leasefy</p>
        <p className="text-xs text-fg-muted dark:text-fg-subtle">
          {tieneCorreo
            ? 'Invítalo y podrás escribirle por aquí, sin salir del producto.'
            : 'Agrega su correo en la ficha para poder invitarlo.'}
        </p>
      </div>
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
