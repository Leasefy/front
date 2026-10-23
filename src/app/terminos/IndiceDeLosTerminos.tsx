'use client';

/**
 * «Contenido» de los términos (glow up 22-10-2026): son más de veinte secciones
 * y la única forma de llegar a «Pagos» o a «Datos personales» era bajar a
 * ciegas.
 *
 * 🔴 El texto legal NO se toca: vive en `TerminosContenido` y lo vigila
 * `src/lib/legal/versiones.test.ts`. Este índice sólo LEE los títulos (`h2`)
 * que ya están en la página, le pone a cada sección un `id` para poder saltar
 * a ella y pinta la lista. Si el texto cambia, el índice cambia solo.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { Collapse } from '@leasefy/cadence';

interface Entrada {
  id: string;
  titulo: string;
}

export function IndiceDeLosTerminos({
  children,
  etiqueta = 'Contenido de los términos',
}: {
  children: ReactNode;
  /** Nombre accesible del índice (Privacidad usa esta misma pieza: revisora r25). */
  etiqueta?: string;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [abierto, setAbierto] = useState(false);
  /** Revisora r25 (390 px, 15.600 px de alto): el índice se queda pegado arriba y dice en qué sección vas. */
  const [actual, setActual] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const nuevas: Entrada[] = [];
    el.querySelectorAll<HTMLElement>('section').forEach((seccion, i) => {
      const titulo = seccion.querySelector('h2')?.textContent?.trim();
      if (!titulo) return;
      if (!seccion.id) seccion.id = `seccion-${i + 1}`;
      // Que el título no quede debajo de la barra de arriba ni del índice pegado al saltar.
      seccion.style.scrollMarginTop = '10rem';
      nuevas.push({ id: seccion.id, titulo });
    });
    setEntradas(nuevas);
  }, []);

  // En cuál vas: la última sección cuyo comienzo ya pasó el primer tercio de la ventana.
  useEffect(() => {
    const el = raiz.current;
    if (!el || entradas.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      () => {
        const tercio = window.innerHeight / 3;
        let vas: string | null = null;
        for (const e of entradas) {
          const n = document.getElementById(e.id);
          if (n && n.getBoundingClientRect().top <= tercio) vas = e.titulo;
        }
        setActual(vas);
      },
      { rootMargin: '-33% 0px -60% 0px' },
    );
    entradas.forEach((e) => {
      const n = document.getElementById(e.id);
      if (n) io.observe(n);
    });
    return () => io.disconnect();
  }, [entradas]);

  return (
    <>
      {entradas.length >= 3 ? (
        <nav
          aria-label={etiqueta}
          className="sticky top-24 z-20 mb-10 rounded-lg border border-border bg-surface shadow-sm"
          data-testid="indice-de-los-terminos"
        >
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="contenido-de-los-terminos"
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <span className="min-w-0 truncate text-body text-fg">
              Contenido{' '}
              <span className="text-fg-muted" data-testid="indice-vas-en">
                · {actual ?? `${entradas.length} secciones`}
              </span>
            </span>
            <CaretDown
              className={`h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
          <Collapse id="contenido-de-los-terminos" open={abierto}>
            <ol className="max-h-[60vh] gap-x-8 overflow-y-auto border-t border-border-faint px-5 py-4 sm:columns-2">
              {entradas.map((e) => (
                <li key={e.id} className="break-inside-avoid py-1">
                  <a
                    href={`#${e.id}`}
                    // Pegado arriba, abierto taparía lo que se va a leer: se cierra al saltar.
                    onClick={() => setAbierto(false)}
                    className="text-body-sm text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                  >
                    {e.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </Collapse>
        </nav>
      ) : null}
      <div ref={raiz}>{children}</div>
    </>
  );
}
