'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpRight,
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

const CURVA = [0.22, 1, 0.36, 1] as const;

/**
 * Menú accionable de plantillas.
 *
 * Sale DESDE su botón (Nico, 02-10-2026: «más lindo y pegado a su botón; hoy
 * sale corrido, debajo de la bandeja y lejos de Plantillas»): se ancla al
 * contenedor `relative` que envuelve al botón —en la llegada y en la barra de
 * la conversación— y abre hacia abajo o hacia arriba según el hueco que haya.
 * Entra con un fundido corto que crece desde el borde del botón.
 *
 * Se cierra con Escape, con un clic afuera y al elegir. Un clic en el propio
 * botón NO cuenta como «afuera»: antes el `mousedown` lo cerraba y el `click`
 * del mismo botón lo volvía a abrir.
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
   * Alto y dirección medidos contra la ventana, no fijos (Nico, 2026-08-27:
   * «acá se sale de la altura y eso se ve feo»). Si abajo no cabe pero arriba
   * sí, se abre hacia arriba; en cualquier caso el alto se recorta a lo que
   * hay y el resto se desplaza adentro.
   */
  const [caja, setCaja] = useState<{ dir: 'down' | 'up'; maxH: number }>({
    dir: direction,
    maxH: 420,
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
      // claramente más: cambiar de lado desorienta.
      const preferida = direction;
      const espacioPreferido = preferida === 'down' ? abajo : arriba;
      const espacioOpuesto = preferida === 'down' ? arriba : abajo;
      const cambia = espacioPreferido < 260 && espacioOpuesto > espacioPreferido;
      const dir = cambia ? (preferida === 'down' ? 'up' : 'down') : preferida;

      const disponible = dir === 'down' ? abajo : arriba;
      setCaja({ dir, maxH: Math.max(180, Math.min(420, disponible)) });
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
      // El anclaje (el botón y el menú) no es «afuera».
      const anclaje = ref.current?.parentElement;
      if (anclaje && anclaje.contains(e.target as Node)) return;
      onClose();
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

  const abajo = caja.dir === 'down';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="menu"
          aria-label={t('beta.templates.title')}
          data-testid="menu-de-plantillas"
          initial={{ opacity: 0, y: abajo ? -6 : 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: abajo ? -4 : 4, scale: 0.98, transition: { duration: 0.14 } }}
          transition={{ duration: 0.24, ease: CURVA }}
          style={{ transformOrigin: abajo ? 'top left' : 'bottom left' }}
          className={cn(
            // Ancho: el botón arranca ~2,25rem adentro de la pantalla (margen
            // de la página + marco + caja): con 100vw-2rem el menú se salía por
            // la derecha en el celular (390, 02-10).
            'absolute left-0 z-50 w-[min(400px,calc(100vw-4.5rem))]',
            abajo ? 'top-full mt-2' : 'bottom-full mb-2',
            'overflow-hidden rounded-[20px] border border-border bg-surface p-1.5',
            'shadow-[0_18px_48px_-12px_rgba(20,19,15,0.22)] dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.85)]',
            className
          )}
        >
          <div className="flex items-center justify-between px-3 pb-1.5 pt-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-fg-subtle">
              {t('beta.templates.title')}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{CHAT_TEMPLATES.length}</span>
          </div>

          <div
            className="overflow-y-auto overscroll-contain"
            data-lenis-prevent
            style={{ maxHeight: Math.max(140, caja.maxH - 44) }}
          >
            {CHAT_TEMPLATES.map((tpl, i) => {
              const title = t(tpl.titleKey);
              const desc = t(tpl.descKey);
              const TplIcon = tpl.icon;
              return (
                <motion.button
                  key={tpl.id}
                  type="button"
                  role="menuitem"
                  initial={{ opacity: 0, y: abajo ? -4 : 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: CURVA, delay: 0.03 + i * 0.025 }}
                  onClick={() => {
                    onSelect(desc);
                    onClose();
                  }}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2 text-left',
                    'transition-colors duration-150 hover:bg-surface-hover focus-visible:bg-surface-hover'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-9 shrink-0 items-center justify-center rounded-full',
                      'bg-surface-muted text-fg-muted transition-colors duration-150',
                      'group-hover:bg-primary-soft group-hover:text-primary'
                    )}
                  >
                    <TplIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-[13.5px] font-medium text-fg">{title}</span>
                    <span className="block truncate font-body text-[12.5px] leading-snug text-fg-muted">{desc}</span>
                  </span>
                  <ArrowUpRight
                    size={14}
                    aria-hidden
                    className="shrink-0 text-fg-subtle opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:text-primary"
                  />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
