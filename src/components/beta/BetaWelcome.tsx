'use client';

import { useState } from 'react';
import { toast } from '@/components/ui';
import { ChatCircleDots, ArrowRight, Trash, Check, X } from '@phosphor-icons/react';
import { PromptComposer, Eyebrow } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useBetaChatContext } from '@/lib/context/BetaChatContext';
import { ChatTemplatesMenu } from './ChatTemplates';

// ============================================================================
// Types
// ============================================================================

interface BetaWelcomeProps {
  onPromptClick?: (prompt: string) => void;
  /** @deprecated the hero now uses the cadence <PromptComposer>; kept for API compat. */
  inputSlot?: React.ReactNode;
  className?: string;
}

/** «hace 3 h», «ayer», «12 ago» — sin traer una librería de fechas. */
function haceCuanto(fecha: Date, ahora: Date): string {
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

// ============================================================================
// Component
// ============================================================================

/**
 * BetaWelcome — estado-0 del chat.
 *
 * Cambio de producto (Nico, 2026-08-27): donde estaban las seis tarjetas de
 * sugerencias va ahora el HISTORIAL de conversaciones, para poder retomar un
 * contexto en vez de empezar siempre de cero. Las seis acciones no se
 * perdieron: se mudaron al menú del botón «Plantillas» (`ChatTemplates.tsx`),
 * que hasta hoy era un botón dibujado sin nada detrás.
 */
export function BetaWelcome({ onPromptClick, className }: BetaWelcomeProps) {
  const { t } = useI18n();
  const { filteredSummaries, switchConversation, deleteConversation } = useBetaChatContext();
  const [borrando, setBorrando] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const ahora = new Date();

  // Sólo las que tienen algo adentro: la conversación vacía recién creada es
  // justamente esta pantalla, listarla sería ofrecerle volver a donde está.
  const historial = filteredSummaries.filter((c) => c.messageCount > 0).slice(0, 6);

  return (
    <div className={cn('flex min-h-full flex-col items-center justify-center px-4 py-12 sm:px-6', className)}>
      <div className="flex w-full max-w-[760px] flex-col items-center">
        {/* Hero greeting */}
        <h1 className="mb-9 text-center font-heading font-medium tracking-[-0.025em] leading-[1.04] text-fg text-[clamp(2.25rem,5vw,3.25rem)]">
          {t('beta.welcome.heroTitle')}
        </h1>

        {/* Prompt composer (state 0) — el menú se ancla a este contenedor */}
        <div className="relative w-full">
          <PromptComposer
            // `[&>div:first-child]:hidden` oculta la fila de «Adjuntar
            // contexto» + chips. Ese botón viene del mockup de Cadence
            // (adjuntar un inmueble / inquilino / contrato como alcance de la
            // pregunta) y NUNCA se construyó: el backend del chat sólo recibe
            // mensaje e historial. En cadence se dibuja sin condición, así que
            // quitarlo de verdad es cortar versión del DS — hasta entonces, no
            // se muestra un control que no hace nada (Nico, 2026-08-27: «doy
            // clic y no funciona»). Como nunca se pasan `contexts`, la fila no
            // tenía nada más.
            // Al irse la fila de arriba, el área de texto quedó apretada (Nico:
            // «quedó muy pequeño»): cadence dibuja el textarea con rows=1 y
            // min-h 27px porque contaba con esa fila para dar aire. Se le da
            // altura para ~3 líneas y un poco de respiro arriba.
            className="w-full [&>div:first-child]:hidden [&>div:nth-child(2)]:pt-5 [&_textarea]:min-h-[84px]"
            onSend={(text) => onPromptClick?.(text)}
            onTemplates={() => setTemplatesOpen((v) => !v)}
            placeholder={t('beta.chat.placeholder')}
          />
          <ChatTemplatesMenu
            open={templatesOpen}
            onClose={() => setTemplatesOpen(false)}
            onSelect={(prompt) => onPromptClick?.(prompt)}
          />
        </div>

        {/* Historial de conversaciones */}
        <div className="mt-8 w-full">
          <Eyebrow className="mb-3.5 px-1">{t('beta.welcome.historyLabel')}</Eyebrow>

          {historial.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-border px-5 py-8 text-center">
              <p className="font-body text-[13.5px] text-fg-muted">
                {t('beta.welcome.historyEmpty')}
              </p>
              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className="mt-2.5 font-body text-[13px] font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('beta.welcome.historyEmptyCta')}
              </button>
            </div>
          ) : (
            /* Una sola columna, de lado a lado (Nico, 2026-08-27: «que vaya
               de lado a lado para que no quede tan pequeña»). En dos columnas
               cada tarjeta quedaba angosta y el preview —que es lo que te dice
               si es LA conversación que buscabas— se cortaba a media frase. */
            <div className="flex flex-col gap-2.5">
              {historial.map((conv) => {
                const confirmando = borrando === conv.id;
                return (
                  /* La tarjeta es un <div> con DOS botones hermanos — abrir y
                     borrar — porque un botón dentro de otro es HTML inválido
                     y el clic en la papelera abriría la conversación. */
                  <div
                    key={conv.id}
                    className={cn(
                      'group relative flex items-start gap-3 rounded-[18px] border border-border bg-surface px-4 py-3.5',
                      'transition-colors duration-150 hover:border-border-strong',
                      confirmando && 'border-border-strong'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => switchConversation(conv.id)}
                      disabled={confirmando}
                      className={cn(
                        'flex min-w-0 flex-1 items-start gap-3 text-left',
                        'outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[12px]'
                      )}
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-fg-muted"
                      >
                        <ChatCircleDots size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-body text-[13.5px] font-medium text-fg">
                            {conv.title}
                          </span>
                          <span className="shrink-0 font-body text-[11.5px] text-fg-subtle">
                            {haceCuanto(conv.updatedAt, ahora)}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-1 block font-body text-[12.5px] leading-snug text-fg-muted">
                          {conv.preview}
                        </span>
                      </span>
                    </button>

                    {/* Borrar (Nico, 2026-08-27: «tenemos que dar la posibilidad
                        de borrar las conversaciones»). Papelera que aparece al
                        pasar el mouse o con el teclado; confirma EN LÍNEA
                        porque borrar un hilo no se deshace, y un diálogo modal
                        por una tarjeta es demasiado ceremonia. */}
                    {confirmando ? (
                      <span className="flex shrink-0 items-center gap-1 self-center">
                        <span className="hidden font-body text-[12px] text-fg-muted sm:inline">
                          {t('beta.conversations.confirmDelete')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            deleteConversation(conv.id);
                            setBorrando(null);
                            toast.success(t('beta.conversations.deleted'));
                          }}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-[4px]',
                            'font-body text-[12px] font-medium text-white',
                            'transition-opacity hover:opacity-90 outline-none focus-visible:ring-2 focus-visible:ring-ring'
                          )}
                        >
                          <Check size={12} weight="bold" />
                          {t('beta.conversations.deleteConfirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBorrando(null)}
                          aria-label={t('beta.conversation.endCancel')}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-fg-subtle hover:bg-surface-muted hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 self-center">
                        <button
                          type="button"
                          onClick={() => setBorrando(conv.id)}
                          aria-label={t('beta.conversations.deleteConversation')}
                          title={t('beta.conversations.deleteConversation')}
                          className={cn(
                            'inline-flex h-7 w-7 items-center justify-center rounded-full text-fg-subtle',
                            'opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100',
                            'hover:bg-surface-muted hover:text-danger outline-none focus-visible:ring-2 focus-visible:ring-ring'
                          )}
                        >
                          <Trash size={14} />
                        </button>
                        <ArrowRight
                          size={15}
                          aria-hidden
                          className="text-fg-subtle transition-transform duration-150 group-hover:translate-x-0.5"
                        />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
