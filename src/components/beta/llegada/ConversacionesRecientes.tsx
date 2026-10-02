'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CaretDown, ChatsCircle, Check, Trash, X } from '@phosphor-icons/react';
import { toast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ConversationSummary } from '@/lib/types/beta-chat';
import { LeasefyMark } from '../LeasefyMark';

/**
 * «Conversaciones recientes (3)» en la bandeja de la llegada, y su panel.
 *
 * Nico (02-10-2026): la lista de abajo se iba; sin conversaciones no se
 * muestra NADA, y con conversaciones queda este acceso en la bandeja que abre
 * la lista DENTRO del chat, sin navegar: un panel anclado al acceso, con abrir
 * y borrar como antes (borrar confirma en línea porque no se deshace).
 */

/** «hace 3 h», «ayer», «12 ago» — sin traer una librería de fechas. */
export function haceCuanto(fecha: Date, ahora: Date): string {
  const min = Math.floor((ahora.getTime() - fecha.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

interface ConversacionesRecientesProps {
  historial: ConversationSummary[];
  onAbrir: (id: string) => void;
  onBorrar: (id: string) => void;
  /** Avisa si el panel está abierto (la bandeja sube de capa para que no lo tape la caja). */
  onAbierto?: (abierto: boolean) => void;
}

const CURVA = [0.22, 1, 0.36, 1] as const;

export function ConversacionesRecientes({ historial, onAbrir, onBorrar, onAbierto }: ConversacionesRecientesProps) {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [dir, setDir] = useState<'down' | 'up'>('down');
  const anclaRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLButtonElement>(null);
  const idPanel = useId();
  const ahora = new Date();

  const cambiar = (v: boolean) => {
    setAbierto(v);
    if (!v) setBorrando(null);
    onAbierto?.(v);
  };

  // Abajo si cabe; si no, arriba.
  useLayoutEffect(() => {
    if (!abierto || !anclaRef.current) return;
    const r = anclaRef.current.getBoundingClientRect();
    const abajo = window.innerHeight - r.bottom;
    setDir(abajo < 300 && r.top > abajo ? 'up' : 'down');
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cambiar(false);
        disparadorRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (anclaRef.current && !anclaRef.current.contains(e.target as Node)) cambiar(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  if (historial.length === 0) return null;
  const abajo = dir === 'down';

  return (
    <div ref={anclaRef} className="relative">
      <button
        ref={disparadorRef}
        type="button"
        onClick={() => cambiar(!abierto)}
        aria-expanded={abierto}
        aria-controls={idPanel}
        data-testid="conversaciones-recientes"
        className={cn(
          'group -ml-1 inline-flex items-center gap-2 rounded-full py-0.5 pl-1 pr-2 text-[13px] font-medium text-fg',
          'transition-colors duration-150 hover:bg-surface-hover'
        )}
      >
        <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-surface text-fg-muted">
          <ChatsCircle size={13} />
        </span>
        {t('beta.welcome.historyTrigger', { n: historial.length })}
        <CaretDown
          size={12}
          aria-hidden
          className={cn('text-fg-subtle transition-transform duration-200', abierto && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            id={idPanel}
            role="dialog"
            aria-label={t('beta.welcome.historyLabel')}
            data-testid="panel-de-conversaciones"
            initial={{ opacity: 0, y: abajo ? -6 : 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: abajo ? -4 : 4, scale: 0.98, transition: { duration: 0.14 } }}
            transition={{ duration: 0.24, ease: CURVA }}
            style={{ transformOrigin: abajo ? 'top left' : 'bottom left' }}
            className={cn(
              'absolute left-0 z-50 w-[min(460px,calc(100vw-2.5rem))]',
              abajo ? 'top-full mt-2' : 'bottom-full mb-2',
              'overflow-hidden rounded-[20px] border border-border bg-surface p-1.5',
              'shadow-[0_18px_48px_-12px_rgba(20,19,15,0.22)] dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.85)]'
            )}
          >
            <div className="flex items-baseline justify-between gap-3 px-3 pb-1.5 pt-2">
              <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
                {t('beta.welcome.historyLabel')}
              </span>
              <span className="text-[11.5px] text-fg-subtle">{t('beta.welcome.historyLocal')}</span>
            </div>

            <ul className="max-h-[320px] overflow-y-auto overscroll-contain" data-lenis-prevent>
              {historial.map((conv, i) => {
                const confirmando = borrando === conv.id;
                return (
                  <motion.li
                    key={conv.id}
                    initial={{ opacity: 0, y: abajo ? -4 : 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: CURVA, delay: 0.03 + i * 0.025 }}
                    /* La fila es un <li> con DOS botones hermanos — abrir y
                       borrar — porque un botón dentro de otro es HTML inválido. */
                    className="group relative flex items-center gap-2 rounded-[14px] pr-1.5 transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        cambiar(false);
                        onAbrir(conv.id);
                      }}
                      disabled={confirmando}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] px-2.5 py-2 text-left"
                    >
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-fg"
                      >
                        <LeasefyMark className="h-auto w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="truncate font-body text-[13.5px] font-semibold text-fg">{conv.title}</span>
                          <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
                            {haceCuanto(conv.updatedAt, ahora)}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-1 block font-body text-[12.5px] leading-snug text-fg-muted">
                          {conv.preview}
                        </span>
                      </span>
                    </button>

                    {confirmando ? (
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onBorrar(conv.id);
                            setBorrando(null);
                            toast.success(t('beta.conversations.deleted'));
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-[4px] font-body text-[12px] font-medium text-white transition-opacity hover:opacity-90"
                        >
                          <Check size={12} weight="bold" aria-hidden />
                          {t('beta.conversations.deleteConfirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBorrando(null)}
                          aria-label={t('beta.conversation.endCancel')}
                          className="inline-flex size-6 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg"
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setBorrando(conv.id)}
                          aria-label={t('beta.conversations.deleteConversation')}
                          title={t('beta.conversations.deleteConversation')}
                          className={cn(
                            'inline-flex size-7 items-center justify-center rounded-full text-fg-subtle',
                            'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100',
                            'hover:bg-surface-muted hover:text-danger'
                          )}
                        >
                          <Trash size={14} aria-hidden />
                        </button>
                        <ArrowRight
                          size={14}
                          aria-hidden
                          className="text-fg-subtle transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
                        />
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
