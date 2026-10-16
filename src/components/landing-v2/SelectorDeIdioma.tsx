'use client';

import { IDIOMAS } from '@/lib/idioma/idioma';
import { cambiarIdioma, useIdioma, useTx } from '@/lib/idioma/use-idioma';

/**
 * ES / EN en el header de la parte pública (Nico, 16-10-2026: «un ES/EN para
 * cambiarla de idioma fácilmente»). Recarga la misma página en el otro idioma y
 * lo deja recordado.
 */
export function SelectorDeIdioma({ className }: { className?: string }) {
  const idioma = useIdioma();
  const tx = useTx();
  return (
    <div className={`idioma${className ? ` ${className}` : ''}`} role="group" aria-label={tx('Idioma', 'Language')}>
      {IDIOMAS.map((i) => (
        <button
          key={i}
          type="button"
          lang={i}
          aria-pressed={i === idioma}
          aria-label={i === 'es' ? 'Español' : 'English'}
          onClick={() => i !== idioma && cambiarIdioma(i)}
        >
          {i.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
