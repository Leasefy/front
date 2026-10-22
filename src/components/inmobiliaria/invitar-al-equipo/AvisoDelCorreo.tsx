'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { AvisoDelCorreo as Aviso } from '@/lib/equipo/aviso-del-correo';
import { useMovimiento } from './movimiento';

/**
 * El aviso de que el correo ya es la cuenta de otra persona, debajo del correo.
 * Con `CORREO_DE_OTRA_PERSONA` ofrece «Es la misma persona, invitar igual» y,
 * si la cuenta es de un inquilino que nunca entró (21-10-2026, Portofino), antes
 * que eso «Es de <nombre>: dárselo e invitar». Con
 * `ACTIVO_EN_OTRA_INMOBILIARIA` sólo dice qué hacer.
 */
export function AvisoDelCorreo({
  aviso,
  enviando = false,
  nombreEscrito,
  onInvitarIgual,
  onDarElCorreo,
}: {
  aviso: Aviso | null;
  enviando?: boolean;
  /** El nombre que se escribió para la persona invitada. */
  nombreEscrito?: string;
  onInvitarIgual?: () => void;
  onDarElCorreo?: () => void;
}) {
  const quien = nombreEscrito?.trim() || 'esta persona';
  const sePuedeDar =
    aviso?.code === 'CORREO_DE_OTRA_PERSONA' && aviso.sePuedeDarAlInvitado && !!onDarElCorreo;
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
            {(sePuedeDar || (aviso.sePuedeInvitarIgual && onInvitarIgual)) && (
              <div className="flex flex-wrap gap-2">
                {sePuedeDar && (
                  <Button
                    type="button"
                    size="sm"
                    hideArrow
                    isLoading={enviando}
                    disabled={enviando}
                    onClick={onDarElCorreo}
                    data-testid="dar-el-correo"
                  >
                    Es de {quien}: dárselo e invitar
                  </Button>
                )}
                {aviso.sePuedeInvitarIgual && onInvitarIgual && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    hideArrow
                    isLoading={enviando && !sePuedeDar}
                    disabled={enviando}
                    onClick={onInvitarIgual}
                  >
                    Es la misma persona, invitar igual
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
