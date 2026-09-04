'use client';

/**
 * El selector de emojis del compositor.
 *
 * Antes había una carita: un `IconButton` **sin `onClick`**. Nico: «no sirven
 * los emojis». Tenía razón literalmente — no era que el panel estuviera feo,
 * es que el botón no hacía nada.
 *
 * Lo que hace ahora, y por qué cada cosa:
 *
 *  · **Inserta en la posición del cursor**, no al final. Si alguien escribió
 *    «Listo, gracias» y volvió con el cursor después de «Listo», el emoji va
 *    ahí. Pegarlo siempre al final obliga a cortar y pegar, que es más trabajo
 *    que escribir el emoji a mano.
 *  · **El foco vuelve al campo** y el cursor queda DESPUÉS del emoji, así se
 *    puede seguir escribiendo sin tocar el mouse.
 *  · **Se cierra con Escape y con un clic afuera** (ver `usePanelFlotante`).
 *
 * El panel queda abierto después de elegir: mandar «👍🎉» es normal y cerrarlo
 * en cada toque obliga a reabrirlo para el segundo.
 */

import { Smiley } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { GRUPOS_DE_EMOJIS } from '@/components/messages/emojis';
import { usePanelFlotante } from '@/components/messages/usePanelFlotante';

interface Props {
  locale: string;
  /** Recibe el emoji elegido; el compositor decide dónde lo mete. */
  onElegir: (emoji: string) => void;
  className?: string;
}

/**
 * 🔴 El contenedor es `relative` SIEMPRE y no acepta que se lo pisen: el panel
 * se ancla a él con `absolute`. Quien quiera colocar el selector en otro lado
 * lo envuelve; pasarle `absolute` por `className` no funcionaría —Tailwind
 * emite `.relative` DESPUÉS de `.absolute`, así que la clase «nueva» perdería
 * sin dar ningún error—. Por eso `className` es sólo para márgenes y demás.
 */
export function SelectorDeEmojis({ locale, onElegir, className }: Props) {
  const panel = usePanelFlotante<HTMLDivElement>();
  const es = locale === 'es';

  return (
    <div ref={panel.ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={panel.alternar}
        aria-label={es ? 'Emojis' : 'Emojis'}
        title={es ? 'Emojis' : 'Emojis'}
        aria-expanded={panel.abierto}
        aria-haspopup="dialog"
        data-testid="abrir-emojis"
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          panel.abierto
            ? 'bg-primary-soft text-primary'
            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
        )}
      >
        <Smiley className="h-5 w-5" aria-hidden="true" />
      </button>

      {panel.abierto && (
        <div
          role="dialog"
          aria-label={es ? 'Elegí un emoji' : 'Pick an emoji'}
          data-testid="panel-emojis"
          /* `bottom-full` porque el compositor vive abajo de todo: un panel que
             se abre hacia abajo queda fuera de la pantalla. */
          className="absolute bottom-full right-0 z-50 mb-2 max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-surface p-3 shadow-lg"
        >
          {GRUPOS_DE_EMOJIS.map((grupo) => (
            <div key={grupo.id} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-xs font-medium text-fg-muted">
                {es ? grupo.etiquetaEs : grupo.etiquetaEn}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {grupo.emojis.map((emoji, i) => (
                  <button
                    key={`${grupo.id}-${i}`}
                    type="button"
                    /* 🔴 `onMouseDown` con `preventDefault` para que el campo NO
                       pierda el foco: sin esto el navegador lo saca al apretar,
                       la selección se colapsa y `selectionStart` vuelve 0 —
                       el emoji terminaba SIEMPRE al principio del texto. */
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onElegir(emoji)}
                    aria-label={emoji}
                    data-testid="emoji"
                    data-emoji={emoji}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
