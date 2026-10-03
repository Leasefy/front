'use client';

/**
 * Listas y tablas cuyas filas entran y salen, con la coreografía de
 * `Stagger`/`StaggerItem` de Cadence (y de `TableBodyAnimado`/
 * `TableRowAnimada` de `ui/table`) y sus tokens, pero con cada elemento
 * ANIMÁNDOSE SOLO.
 *
 * ── Por qué no las primitivas tal cual (visto en el navegador, 03-10-2026) ──
 * En `StaggerItem` el que anima es el padre: los elementos heredan `hidden` →
 * `shown` y el `Stagger` los orquesta al montarse. En `next dev` el modo
 * estricto de React monta, desmonta y vuelve a montar, y esa orquestación se
 * pierde: las filas se quedan en `opacity: 0; translateY(8px)` —la tabla de
 * Contratos y la de Propietarios se veían VACÍAS, con sus bordes—. Lo mismo
 * con una fila que llega después de montada la lista (se limpia un filtro, se
 * agrega un ítem). En producción no pasa, pero Nico prueba en `next dev`.
 *
 * Acá cada elemento lleva su propio `initial`/`animate` (eso sí sobrevive al
 * modo estricto) y el escalonado sale de una demora por turno: los que nacen
 * juntos se escalonan entre sí (`motionStagger.step`, 40 ms, que se achica con
 * muchos) y el último nunca espera más que el techo (`motionStagger.max`,
 * 320 ms). Uno que nace solo entra ya. Al salir: fundido y 98 % en `fast`.
 * Con movimiento reducido, sólo fundidos y sin demoras.
 *
 * Cuando Cadence lo corrija en su `Stagger`, esto se borra y se vuelve a usar
 * la primitiva.
 */

import {
  Children,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  enterTransition,
  exitTransition,
  motionDistance,
  motionStagger,
  motionTransition,
  usePrefersReducedMotion,
} from '@leasefy/cadence';
import { cn } from '@/lib/utils';

type EtiquetaDeLista = 'div' | 'ul' | 'ol' | 'tbody' | 'section';
type EtiquetaDeElemento = 'div' | 'li' | 'tr' | 'article' | 'section';

interface ContextoDeLaLista {
  /** Segundos entre uno y el siguiente de los que nacen juntos. */
  paso: number;
  /** El turno de quien nace ahora (0, 1, 2… dentro del mismo cuadro). */
  turno: () => number;
  /** ¿Se reacomodan con animación cuando otro entra o sale? */
  layout: boolean;
}

const Contexto = createContext<ContextoDeLaLista | null>(null);

export interface ListaQueAnimaProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** Etiqueta de la lista. Por defecto `div`. */
  as?: EtiquetaDeLista;
  /**
   * Los elementos se reacomodan con animación (`layout="position"`) cuando
   * otro entra o sale. Por defecto `true`; `false` en listas largas o
   * paginadas (una página entera cambia de una vez).
   */
  layout?: boolean;
  /**
   * Cómo convive lo que sale con lo demás: `popLayout` (por defecto) lo saca
   * del flujo para que los vecinos se corran ya; en `tbody`, `sync` (una fila
   * de tabla no puede quedar en `position: absolute`).
   */
  presenceMode?: 'popLayout' | 'sync';
}

/** Lista que entra escalonada y deja entrar y salir elementos. */
export const ListaQueAnima = forwardRef<HTMLElement, ListaQueAnimaProps>(function ListaQueAnima(
  { as = 'div', layout = true, presenceMode, className, children, ...props },
  ref,
) {
  const modo = presenceMode ?? (as === 'tbody' ? 'sync' : 'popLayout');
  const cuantos = Children.toArray(children).length;
  const paso =
    cuantos > 1 ? Math.min(motionStagger.step, motionStagger.max / (cuantos - 1)) : motionStagger.step;

  // Los que nacen en el mismo cuadro comparten la cuenta; el cuadro siguiente
  // la pone en cero.
  const cuenta = useRef({ n: 0, agendada: false });
  const turno = useCallback(() => {
    const c = cuenta.current;
    if (!c.agendada) {
      c.agendada = true;
      const reiniciar = () => {
        c.n = 0;
        c.agendada = false;
      };
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(reiniciar);
      else setTimeout(reiniciar, 16);
    }
    return c.n++;
  }, []);

  const valor = useMemo(() => ({ paso, turno, layout }), [paso, turno, layout]);
  const Etiqueta = as as ElementType;
  return (
    <Etiqueta ref={ref} className={cn(modo === 'popLayout' && 'relative', className)} {...props}>
      <Contexto.Provider value={valor}>
        <AnimatePresence mode={modo}>{children}</AnimatePresence>
      </Contexto.Provider>
    </Etiqueta>
  );
});

export interface ElementoQueAnimaProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
  /** Etiqueta del elemento. Por defecto `div`. */
  as?: EtiquetaDeElemento;
}

/** Un elemento de `ListaQueAnima`: entra con fundido y 8 px; sale con fundido y 98 %. */
export const ElementoQueAnima = forwardRef<HTMLElement, ElementoQueAnimaProps>(function ElementoQueAnima(
  { as = 'div', ...props },
  ref,
) {
  const lista = useContext(Contexto);
  const reducido = usePrefersReducedMotion();
  const [demora] = useState(() =>
    lista && !reducido ? Math.min(lista.turno() * lista.paso, motionStagger.max) : 0,
  );
  const Comp = (motion as unknown as Record<EtiquetaDeElemento, ElementType>)[as];
  return (
    <Comp
      ref={ref}
      initial={{ opacity: 0, ...(reducido ? {} : { y: motionDistance.sm }) }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, ...(reducido ? {} : { scale: 0.98 }), transition: exitTransition(reducido) }}
      transition={{ ...enterTransition(reducido, { delay: demora }), layout: motionTransition.layout }}
      layout={lista?.layout && !reducido ? 'position' : undefined}
      {...props}
    />
  );
});

/** El cuerpo de una tabla cuyas filas entran y salen (`ListaQueAnima` como `tbody`, sin `layout`). */
export const CuerpoQueAnima = forwardRef<HTMLElement, Omit<ListaQueAnimaProps, 'as' | 'layout' | 'presenceMode'>>(
  function CuerpoQueAnima(props, ref) {
    return <ListaQueAnima ref={ref} as="tbody" layout={false} presenceMode="sync" {...props} />;
  },
);

export interface FilaQueAnimaProps extends Omit<ElementoQueAnimaProps, 'as'> {
  /** Fila seleccionada (mismo dibujo que `TableRow selected`). */
  selected?: boolean;
}

/** La fila de un `CuerpoQueAnima`: las mismas clases que `TableRow`/`TableRowAnimada`. */
export const FilaQueAnima = forwardRef<HTMLElement, FilaQueAnimaProps>(function FilaQueAnima(
  { className, selected = false, ...props },
  ref,
) {
  return (
    <ElementoQueAnima
      ref={ref}
      as="tr"
      data-selected={selected || undefined}
      className={cn(
        'border-b border-border-faint last:border-b-0 transition-colors',
        selected ? 'bg-primary-soft' : 'hover:bg-surface-muted',
        className,
      )}
      {...props}
    />
  );
});
