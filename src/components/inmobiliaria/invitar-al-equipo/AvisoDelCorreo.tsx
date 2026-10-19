'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { AvisoDelCorreo as Aviso } from '@/lib/equipo/aviso-del-correo';
import { useMovimiento } from './movimiento';

/**
 * El aviso de que el correo ya es la cuenta de otra persona, debajo del correo.
 * Con `CORREO_DE_OTRA_PERSONA` ofrece «Es la misma persona, invitar igual»;
 * con `ACTIVO_EN_OTRA_INMOBILIARIA` sólo dice qué hacer.
 */
export function AvisoDelCorreo({
  aviso,
  enviando = false,
  onInvitarIgual,
}: {
  aviso: Aviso | null;
  enviando?: boolean;
  onInvitarIgual?: () => void;
}) {
  const mov = useMovimiento();
  return (
    <AnimatePresence initial={false} mode="wait">
      {aviso && (
        <motion.div
          key={aviso.message}
          initial={mov.llega.initial}
          animate={mov.llega.animate}
          exit={{ opacity: 0, transition: mov.llega.exit.transition }}
          role="alert"
          data-testid="aviso-del-correo"
          className="flex items-start gap-2.5 rounded-md border border-border bg-warning-soft p-3"
        >
          <Warning className="mt-0.5 size-5 shrink-0 text-warning" weight="fill" aria-hidden="true" />
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-fg">{aviso.message}</p>
            {aviso.sePuedeInvitarIgual && onInvitarIgual && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={enviando}
                onClick={onInvitarIgual}
              >
                Es la misma persona, invitar igual
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
