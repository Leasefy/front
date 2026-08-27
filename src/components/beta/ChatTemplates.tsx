'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Catálogo
// ============================================================================

/**
 * Las acciones que vivían como las seis tarjetas del estado-0.
 *
 * Se mudaron acá por decisión de producto (Nico, 2026-08-27): las tarjetas
 * ocupaban el lugar donde ahora va el historial de conversaciones, y el botón
 * «Plantillas» —que existía dibujado desde el mockup de Cadence y nunca hizo
 * nada— pasa a ser su casa. Vivir en un menú además las hace alcanzables
 * DENTRO de una conversación, que era lo imposible: una vez que escribías,
 * las tarjetas desaparecían y no había forma de volver a ellas.
 */
export interface ChatTemplate {
  id: string;
  titleKey: string;
  descKey: string;
  gradient: string;
}

export const CHAT_TEMPLATES: ChatTemplate[] = [
  { id: 'cobros',        titleKey: 'beta.welcome.prompts.cobros',        descKey: 'beta.welcome.prompts.cobros_desc',        gradient: 'linear-gradient(140deg,#1F8A5B,#7DE08A)' },
  { id: 'propiedades',   titleKey: 'beta.welcome.prompts.propiedades',   descKey: 'beta.welcome.prompts.propiedades_desc',   gradient: 'linear-gradient(140deg,#1A40FF,#2BB5E8)' },
  { id: 'contratos',     titleKey: 'beta.welcome.prompts.contratos',     descKey: 'beta.welcome.prompts.contratos_desc',     gradient: 'linear-gradient(140deg,#8E7BF0,#F5A878)' },
  { id: 'mantenimiento', titleKey: 'beta.welcome.prompts.mantenimiento', descKey: 'beta.welcome.prompts.mantenimiento_desc', gradient: 'linear-gradient(140deg,#2BB5E8,#1A40FF)' },
  { id: 'candidatos',    titleKey: 'beta.welcome.prompts.candidatos',    descKey: 'beta.welcome.prompts.candidatos_desc',    gradient: 'linear-gradient(140deg,#1A40FF,#2BB5E8)' },
  { id: 'reportes',      titleKey: 'beta.welcome.prompts.reportes',      descKey: 'beta.welcome.prompts.reportes_desc',      gradient: 'linear-gradient(140deg,#1F8A5B,#7DE08A)' },
];

/** Primera letra del título, para el monograma. */
function monogram(title: string): string {
  return title.trim().charAt(0).toUpperCase() || '·';
}

// ============================================================================
// Menú
// ============================================================================

interface ChatTemplatesMenuProps {
  open: boolean;
  onClose: () => void;
  /** Se llama con el TEXTO del prompt (la descripción), que es lo que se envía. */
  onSelect: (prompt: string) => void;
  /** `up` abre hacia arriba — para la barra de la conversación activa. */
  direction?: 'down' | 'up';
  className?: string;
}

/**
 * Menú accionable de plantillas.
 *
 * Se cierra con Escape, con un clic afuera, y al elegir. No usa portal: se
 * ancla al contenedor `relative` de quien lo monta, que en los dos usos es
 * justo el borde donde está el botón.
 */
export function ChatTemplatesMenu({
  open,
  onClose,
  onSelect,
  direction = 'down',
  className,
}: ChatTemplatesMenuProps) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };

    document.addEventListener('keydown', onKey);
    // `mousedown` y no `click`: con `click` el mismo evento que abre el menú
    // lo cerraría en el mismo tick.
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={t('beta.templates.title')}
      className={cn(
        'absolute left-0 z-50 w-[min(420px,calc(100vw-2rem))]',
        direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2',
        'overflow-hidden rounded-[18px] border border-border bg-surface',
        'shadow-[0_12px_40px_rgba(20,19,15,0.10)]',
        className
      )}
    >
      <div className="border-b border-surface-muted px-4 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
          {t('beta.templates.title')}
        </span>
      </div>

      <div className="max-h-[min(60vh,380px)] overflow-y-auto py-1.5">
        {CHAT_TEMPLATES.map((tpl) => {
          const title = t(tpl.titleKey);
          const desc = t(tpl.descKey);
          return (
            <button
              key={tpl.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(desc);
                onClose();
              }}
              className={cn(
                'flex w-full items-start gap-3 px-3 py-2.5 text-left',
                'transition-colors duration-150 hover:bg-bg',
                'outline-none focus-visible:bg-bg'
              )}
            >
              <span
                aria-hidden
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] font-heading text-[13px] font-medium text-white"
                style={{ background: tpl.gradient }}
              >
                {monogram(title)}
              </span>
              <span className="min-w-0">
                <span className="block font-body text-[13.5px] font-medium text-fg">{title}</span>
                <span className="block font-body text-[12.5px] leading-snug text-fg-muted">{desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
