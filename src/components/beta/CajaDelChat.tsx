'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { ChatContentCard } from '@leasefy/cadence';
import { cn } from '@/lib/utils';

/**
 * CajaDelChat — la caja de cada bloque de una respuesta del chat.
 *
 * Nico (23-09, 23:48), con la captura de la tabla «Cuotas sin pagar» y el
 * «Ver las 9 filas» suelto debajo: «esto se ve como separado, deberíamos darles
 * una caja a los componentes de Cadence para el chat, para que se vean bien, y
 * eso de "ver 9 filas" debería estar dentro del componente, ¿no?».
 *
 * Es la cáscara del chat de Cadence (§34: blanca, filete `border-faint`, 14 px,
 * 16 px de relleno), la MISMA de `ChatEntityCard` y `SensitiveActionConfirm`:
 * se usa `ChatContentCard` sin avatar, no un estilo propio. Adentro:
 *
 *   cabecera  — qué es el bloque y cuántos («Cuotas sin pagar · 9 filas»)
 *   contenido — la tabla, la cifra, el aviso, las acciones
 *   pie       — lo que se hace con el bloque («Ver las 12 filas que faltan»)
 *
 * Nada del bloque queda fuera de su caja (el molde: cada bloque dice qué es).
 */
export function CajaDelChat({
  titulo,
  conteo,
  pie,
  children,
  className,
  ...resto
}: {
  titulo?: ReactNode;
  conteo?: ReactNode;
  pie?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'title'>) {
  return (
    <ChatContentCard showAvatar={false} className={cn('min-w-0', className)} {...resto}>
      {(titulo || conteo) && (
        <header className="mb-3 flex items-baseline justify-between gap-3">
          {titulo && <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">{titulo}</span>}
          {conteo && <span className="shrink-0 font-mono text-[13px] tabular-nums text-fg-muted">{conteo}</span>}
        </header>
      )}
      {children}
      {pie && (
        <footer data-pie-de-caja className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-faint pt-3">
          {pie}
        </footer>
      )}
    </ChatContentCard>
  );
}
