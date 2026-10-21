'use client';

/**
 * «En esta sección»: el índice de una página larga (glow up 21-10).
 *
 * Configuración · Perfil medía más de 6.000 px —empresa, contacto, datos legales, valores por
 * defecto, cobros y mora, dispersiones, impuestos, tasa de recaudo, terminación, ciclo del
 * contrato, extracto, renovación— y la única forma de llegar a «Renovación» era bajar a ciegas.
 * Este índice se queda pegado arriba, lleva a cada bloque y marca en cuál vas.
 *
 * Cómo se usa: cada bloque lleva `id` y `data-indice="Su nombre"`; el índice los busca dentro de
 * `raiz` (también los que aparecen después, al terminar de cargar).
 */

import { useEffect, useState, type RefObject } from 'react';
import { cn } from '@/lib/utils';

interface Entrada {
  id: string;
  titulo: string;
}

export function IndiceDeLaPagina({
  raiz,
  etiqueta = 'En esta sección',
  className,
}: {
  raiz: RefObject<HTMLElement | null>;
  etiqueta?: string;
  className?: string;
}) {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [actual, setActual] = useState<string | null>(null);

  // Los bloques: los que hay y los que llegan después (la sección carga sus datos).
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const leer = () => {
      const nuevas = Array.from(el.querySelectorAll<HTMLElement>('[data-indice][id]')).map((n) => ({
        id: n.id,
        titulo: n.dataset.indice ?? n.id,
      }));
      setEntradas((antes) =>
        antes.length === nuevas.length && antes.every((a, i) => a.id === nuevas[i].id && a.titulo === nuevas[i].titulo)
          ? antes
          : nuevas,
      );
    };
    leer();
    if (typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(leer);
    mo.observe(el, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [raiz]);

  // En cuál vas: el último bloque cuyo comienzo ya pasó el primer tercio de la ventana.
  useEffect(() => {
    if (entradas.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const visibles = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (cambios) => {
        for (const c of cambios) visibles.set(c.target.id, c.isIntersecting);
        const primera = entradas.find((e) => visibles.get(e.id));
        if (primera) setActual(primera.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    for (const e of entradas) {
      const n = document.getElementById(e.id);
      if (n) io.observe(n);
    }
    return () => io.disconnect();
  }, [entradas]);

  if (entradas.length < 3) return null;

  return (
    <nav
      aria-label={etiqueta}
      data-testid="indice-de-la-pagina"
      className={cn(
        'sticky top-0 z-20 -mx-1 flex items-center gap-1 overflow-x-auto bg-bg/90 px-1 py-2 backdrop-blur-sm',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <span className="mr-2 shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">
        {etiqueta}
      </span>
      {entradas.map((e) => (
        <a
          key={e.id}
          href={`#${e.id}`}
          aria-current={actual === e.id ? 'location' : undefined}
          onClick={(ev) => {
            ev.preventDefault();
            document.getElementById(e.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActual(e.id);
          }}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            actual === e.id
              ? 'bg-surface text-fg shadow-susurro'
              : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
          )}
        >
          {e.titulo}
        </a>
      ))}
    </nav>
  );
}
