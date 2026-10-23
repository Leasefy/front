'use client';

/**
 * Una fila de la bandeja de la inmobiliaria (campana y página). QA 04-10:
 * - NO-02: el contenido del aviso, no «Notificacion enviada via in_app».
 * - NO-03: el ícono del tipo, no la primera letra del título.
 * - NO-05: un grupo dice cuántos («107 cobros generados hoy»).
 * - NO-06: clic lleva a donde se actúa (lo decide el back: `actionUrl`).
 * - «Eliminar» en TODAS (antes sólo en las leídas), y «Marcar como leída» en
 *   las que no lo están; las dos con nombre accesible.
 */
import { Check, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { GrupoDeAvisos } from '@/lib/api/avisos-agrupados.service';
import { avisoPideAtencion, etiquetaDeCategoria, iconoDelAviso } from '@/lib/notificaciones/aviso';
import { formatNotificationTime } from '@/lib/types/notification';

export interface FilaDelAvisoProps {
  aviso: GrupoDeAvisos;
  compacta?: boolean;
  onAbrir: (a: GrupoDeAvisos) => void;
  onMarcarLeido: (a: GrupoDeAvisos) => void;
  onQuitar: (a: GrupoDeAvisos) => void;
}

export function FilaDelAviso({ aviso, compacta = false, onAbrir, onMarcarLeido, onQuitar }: FilaDelAvisoProps) {
  const Icono = iconoDelAviso(aviso.type, aviso.category, aviso.metadata);
  const grupo = aviso.cantidad > 1;
  const urgente = avisoPideAtencion(aviso.type);
  return (
    <div
      data-testid="fila-del-aviso"
      data-leido={aviso.read ? 'si' : 'no'}
      className={cn(
        'group relative flex items-start gap-3 border-b border-border-faint transition-colors last:border-b-0 hover:bg-surface-hover',
        compacta ? 'px-5 py-3.5' : 'px-5 py-4',
      )}
    >
      {/* Sin leer = un punto de voltaje a la izquierda y el título más fuerte (Cadence 2); antes la
          fila entera iba en gris y, con todo sin leer, la bandeja era un solo bloque gris. */}
      {!aviso.read && (
        <span aria-hidden="true" data-testid="punto-sin-leer" className="absolute left-2 top-[26px] size-1.5 rounded-full bg-primary" />
      )}
      <button
        type="button"
        onClick={() => onAbrir(aviso)}
        className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
      >
        <span
          aria-hidden="true"
          className={cn(
            // Revisora r24 (Notificaciones #2): a 390 sin la caja del ícono (el punto de «sin leer» basta), para que el texto respire.
            'relative mt-0.5 hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] sm:flex',
            urgente ? 'bg-danger-soft text-danger' : 'bg-surface-muted text-fg-muted',
          )}
        >
          <Icono className="h-[18px] w-[18px]" weight="regular" />
          {grupo && (
            <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-ink px-1 text-center font-mono text-[10px] leading-[18px] text-ink-fg tabular-nums">
              {aviso.cantidad > 99 ? '99+' : aviso.cantidad}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[13px] leading-snug text-fg', !aviso.read && 'font-medium')}>
            {aviso.title}
          </span>
          {aviso.message && (
            <span className={cn('mt-0.5 block text-caption leading-snug text-fg-muted', 'line-clamp-2')}>
              {aviso.message}
            </span>
          )}
          <span className="mt-1 flex items-center gap-2 text-[11px] text-plan-muted">
            <span>{formatNotificationTime(aviso.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>{etiquetaDeCategoria(aviso.category)}</span>
          </span>
        </span>
      </button>
      <div className="flex flex-shrink-0 items-center gap-1">
        {!aviso.read && (
          <button
            type="button"
            onClick={() => onMarcarLeido(aviso)}
            aria-label={grupo ? `Marcar los ${aviso.cantidad} como leídos` : 'Marcar como leída'}
            title={grupo ? `Marcar los ${aviso.cantidad} como leídos` : 'Marcar como leída'}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-success-soft hover:text-success"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onQuitar(aviso)}
          aria-label={grupo ? `Quitar los ${aviso.cantidad} avisos` : 'Quitar el aviso'}
          title={grupo ? `Quitar los ${aviso.cantidad} avisos` : 'Quitar el aviso'}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-fg-subtle transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
