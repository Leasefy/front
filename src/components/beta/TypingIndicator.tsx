'use client';

import { cn } from '@/lib/utils';
import { ChatOrb } from './ChatOrb';

/**
 * TypingIndicator — el orbe mientras Laura piensa.
 *
 * Reemplaza los tres puntitos rebotando junto al logo (Nico, 2026-08-27:
 * «quiero algo top que la gente diga wow al verlo cargando»). El orbe hace de
 * avatar Y de indicador a la vez, así que no se dibuja además la marca chica:
 * dos cosas identificando al mismo hablante compiten entre sí.
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* 40px, más grande que el avatar de 24: ESTE es el que se mira mientras
          se espera, y es el momento en que tiene que lucir. El -ml compensa el
          margen que la caja reserva para las ondas, para que el cuerpo del orbe
          caiga donde caía la marca y no corra el texto de abajo. */}
      <ChatOrb size={40} className="-ml-[24px]" label="Generando respuesta" />
    </div>
  );
}
