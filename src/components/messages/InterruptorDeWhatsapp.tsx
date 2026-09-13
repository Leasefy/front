'use client';

/**
 * El interruptor del canal WhatsApp en la ficha del inquilino o del propietario.
 *
 * Habeas Data (Ley 1581) y las reglas de Meta piden autorización POR CANAL:
 * tener el teléfono cargado no autoriza a escribirle. Por eso nace APAGADO y
 * lo prende la inmobiliaria, que es quien tiene la relación y quien responde
 * por ese permiso si alguien lo reclama.
 *
 * Sin cuenta de portal no hay a quién prendérselo (el hilo del chat es con un
 * `User`), así que no se pinta nada en vez de pintar un interruptor muerto.
 */

import { useCallback, useEffect, useState } from 'react';
import { WhatsappLogo } from '@phosphor-icons/react';

import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { messagesApi } from '@/lib/api/messages.service';
import type { CanalDeWhatsapp } from '@/lib/api/messages.types';

const SIN_NUMERO: Record<string, string> = {
  sin_telefono: 'No tenemos su teléfono: aunque lo autorices, no le llega.',
  ambiguo:
    'Su ficha tiene más de un número en el mismo campo. Déjale uno solo para poder escribirle.',
  invalido: 'El teléfono que tenemos no es un celular que reciba WhatsApp.',
};

export function InterruptorDeWhatsapp({
  personaId,
  agencyId,
  className,
}: {
  /** El `User.id` del tercero. `null` = todavía no tiene cuenta de portal. */
  personaId?: string | null;
  agencyId?: string;
  className?: string;
}) {
  const [canal, setCanal] = useState<CanalDeWhatsapp | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!personaId) {
      setCanal(null);
      return;
    }
    let vivo = true;
    messagesApi
      .verCanalDeWhatsapp(personaId, agencyId)
      .then((r) => {
        if (vivo) setCanal(r);
      })
      .catch(() => {
        // Sin respuesta no se inventa un estado: el interruptor no aparece.
        if (vivo) setCanal(null);
      });
    return () => {
      vivo = false;
    };
  }, [personaId, agencyId]);

  const cambiar = useCallback(
    async (acepta: boolean) => {
      if (!personaId) return;
      setGuardando(true);
      // Optimista con vuelta atrás: el interruptor responde al toque, pero si
      // el back dice que no, vuelve a donde estaba y se dice por qué.
      const previo = canal;
      setCanal((c) => (c ? { ...c, aceptaWhatsapp: acepta } : c));
      try {
        const r = await messagesApi.cambiarCanalDeWhatsapp(personaId, acepta, agencyId);
        setCanal(r);
        toast.success(
          acepta
            ? 'Ahora le llegan los mensajes del chat por WhatsApp'
            : 'Ya no le llegan los mensajes del chat por WhatsApp',
        );
      } catch {
        setCanal(previo);
        toast.error('No se pudo guardar el permiso de WhatsApp');
      } finally {
        setGuardando(false);
      }
    },
    [personaId, agencyId, canal],
  );

  if (!personaId || !canal || canal.motivo === 'no_aplica') return null;

  const advertencia = canal.aceptaWhatsapp ? SIN_NUMERO[canal.motivo] : undefined;

  return (
    <div
      data-testid="interruptor-whatsapp"
      className={`flex items-start justify-between gap-4 rounded-lg border border-border bg-surface p-4 ${className ?? ''}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <WhatsappLogo className="h-4 w-4 text-success" weight="fill" aria-hidden />
          <span className="text-sm font-medium text-foreground">Mensajes por WhatsApp</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {canal.aceptaWhatsapp
            ? `Lo que le escribas en el chat también le llega a su WhatsApp${canal.telefono ? ` ${canal.telefono}` : ''}.`
            : 'Autoriza que lo que le escribas en el chat también le llegue por WhatsApp.'}
        </p>
        {advertencia && (
          <p className="mt-1 text-xs text-warning">{advertencia}</p>
        )}
      </div>
      <Switch
        checked={canal.aceptaWhatsapp}
        onCheckedChange={cambiar}
        disabled={guardando}
        aria-label="Mensajes por WhatsApp"
      />
    </div>
  );
}
