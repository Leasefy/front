'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  CurrencyDollar,
  Buildings,
  FileText,
  Wrench,
  UsersThree,
  ChartBar,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
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
  icon: Icon;
}

/**
 * Icono de dominio, no monograma de colores.
 *
 * Iban con una baldosa en degradado y la inicial del título (Nico,
 * 2026-08-27: «eso azul con una M y una C tampoco es que me gusten, se ve
 * feo»). Tenía dos problemas de fondo: la inicial no informa —«Cobros» y
 * «Candidatos» y «Contratos» daban todas «C»— y seis degradados saturados
 * apilados en una lista compiten con el texto, que es lo que hay que leer.
 * Los iconos son los MISMOS que `AgentBadge` ya usa por dominio, así que el
 * mismo tema se ve igual en toda la app.
 */
export const CHAT_TEMPLATES: ChatTemplate[] = [
  { id: 'cobros',        titleKey: 'beta.welcome.prompts.cobros',        descKey: 'beta.welcome.prompts.cobros_desc',        icon: CurrencyDollar },
  { id: 'propiedades',   titleKey: 'beta.welcome.prompts.propiedades',   descKey: 'beta.welcome.prompts.propiedades_desc',   icon: Buildings },
  { id: 'contratos',     titleKey: 'beta.welcome.prompts.contratos',     descKey: 'beta.welcome.prompts.contratos_desc',     icon: FileText },
  { id: 'mantenimiento', titleKey: 'beta.welcome.prompts.mantenimiento', descKey: 'beta.welcome.prompts.mantenimiento_desc', icon: Wrench },
  { id: 'candidatos',    titleKey: 'beta.welcome.prompts.candidatos',    descKey: 'beta.welcome.prompts.candidatos_desc',    icon: UsersThree },
  { id: 'reportes',      titleKey: 'beta.welcome.prompts.reportes',      descKey: 'beta.welcome.prompts.reportes_desc',      icon: ChartBar },
];

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

  /**
   * Alto y dirección medidos contra la ventana, no fijos.
   *
   * Con `top-full` y un `max-h` de 380px, en una ventana baja el menú se salía
   * por abajo y las últimas plantillas quedaban fuera de la pantalla, sin
   * forma de alcanzarlas (Nico, 2026-08-27: «acá se sale de la altura y eso se
   * ve feo»). Ahora se mide el hueco real: si abajo no cabe pero arriba sí, se
   * abre hacia arriba; en cualquier caso el alto se recorta a lo que hay y el
   * resto se desplaza adentro.
   */
  const [caja, setCaja] = useState<{ dir: 'down' | 'up'; maxH: number }>({
    dir: direction,
    maxH: 380,
  });

  useLayoutEffect(() => {
    if (!open || !ref.current) return;

    const medir = () => {
      const anclaje = ref.current?.parentElement;
      if (!anclaje) return;
      const r = anclaje.getBoundingClientRect();
      const MARGEN = 16;
      const abajo = window.innerHeight - r.bottom - MARGEN;
      const arriba = r.top - MARGEN;

      // Se conserva la dirección pedida salvo que del otro lado quepa
      // claramente más: cambiar de lado desorienta, así que sólo vale la pena
      // cuando la diferencia es real.
      const preferida = direction;
      const espacioPreferido = preferida === 'down' ? abajo : arriba;
      const espacioOpuesto = preferida === 'down' ? arriba : abajo;
      const cambia = espacioPreferido < 220 && espacioOpuesto > espacioPreferido;
      const dir = cambia ? (preferida === 'down' ? 'up' : 'down') : preferida;

      const disponible = dir === 'down' ? abajo : arriba;
      setCaja({ dir, maxH: Math.max(160, Math.min(380, disponible)) });
    };

    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [open, direction]);

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
        caja.dir === 'down' ? 'top-full mt-2' : 'bottom-full mb-2',
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

      <div
        className="overflow-y-auto overscroll-contain py-1.5"
        data-lenis-prevent
        style={{ maxHeight: Math.max(120, caja.maxH - 42) }}
      >
        {CHAT_TEMPLATES.map((tpl) => {
          const title = t(tpl.titleKey);
          const desc = t(tpl.descKey);
          const TplIcon = tpl.icon;
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
                'group flex w-full items-start gap-3 px-3 py-2.5 text-left',
                'transition-colors duration-150 hover:bg-bg',
                'outline-none focus-visible:bg-bg'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]',
                  'border border-border bg-bg text-fg-muted',
                  'transition-colors duration-150',
                  'group-hover:border-primary/30 group-hover:bg-primary/[0.07] group-hover:text-primary'
                )}
              >
                <TplIcon size={15} />
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
