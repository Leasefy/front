'use client';

/**
 * FeedbackCta — el botón de "ayúdanos a mejorar" del header del panel.
 *
 * Abre un formulario de Tally en un popup sobre la página. El widget de Tally
 * se carga **al hacer clic**, no al montar: es un script de terceros y no tiene
 * por qué pesar en la carga de todas las pantallas del panel para algo que la
 * mayoría de las visitas no va a usar.
 *
 * Tally también soporta atributos `data-tally-open`, pero eso depende de que su
 * script ya esté en la página cuando React monta el botón. Acá lo llamamos por
 * API (`Tally.openPopup`) después de asegurarnos de que cargó, que es la única
 * forma de que el primer clic funcione siempre.
 *
 * Si el script no carga —bloqueador de anuncios, red caída— el botón no se
 * queda mudo: abre el formulario en una pestaña.
 */

import { useCallback, useState } from 'react';
import { ChatCircleDots } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const FORM_ID = 'pbN2q8';
const SCRIPT_SRC = 'https://tally.so/widgets/embed.js';
const FALLBACK_URL = `https://tally.so/r/${FORM_ID}`;

interface TallyPopupOptions {
  layout?: 'default' | 'modal';
  width?: number;
  overlay?: boolean;
  emoji?: { text: string; animation: 'wave' };
  autoClose?: number;
  hiddenFields?: Record<string, unknown>;
}

declare global {
  interface Window {
    Tally?: { openPopup: (formId: string, options?: TallyPopupOptions) => void };
  }
}

/** Carga el widget una sola vez, aunque se toque el botón varias veces. */
function cargarTally(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('sin window'));
      return;
    }
    if (window.Tally) {
      resolve();
      return;
    }

    const yaEsta = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (yaEsta) {
      yaEsta.addEventListener('load', () => resolve(), { once: true });
      yaEsta.addEventListener('error', () => reject(new Error('falló la carga')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('falló la carga')), { once: true });
    document.head.appendChild(script);
  });
}

export interface FeedbackCtaProps {
  className?: string;
  locale?: string;
  /**
   * Campos ocultos que viajan con la respuesta. Sirve para saber desde qué
   * panel escribieron sin tener que preguntárselo en el formulario.
   */
  hiddenFields?: Record<string, unknown>;
}

export function FeedbackCta({ className, locale = 'es', hiddenFields }: FeedbackCtaProps) {
  const [abriendo, setAbriendo] = useState(false);
  const es = locale === 'es';

  const abrir = useCallback(async () => {
    setAbriendo(true);
    try {
      await cargarTally();
      if (!window.Tally) throw new Error('sin Tally');
      window.Tally.openPopup(FORM_ID, {
        layout: 'modal',
        width: 700,
        overlay: true,
        emoji: { text: '👋', animation: 'wave' },
        autoClose: 3000,
        ...(hiddenFields ? { hiddenFields } : {}),
      });
    } catch {
      // Mejor una pestaña que un botón que no hace nada.
      window.open(FALLBACK_URL, '_blank', 'noopener,noreferrer');
    } finally {
      setAbriendo(false);
    }
  }, [hiddenFields]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      hideArrow
      onClick={abrir}
      disabled={abriendo}
      className={cn('gap-2', className)}
    >
      <ChatCircleDots className="w-4 h-4" aria-hidden="true" />
      {es ? 'Ayúdanos a mejorar' : 'Help us improve'}
    </Button>
  );
}
