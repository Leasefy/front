'use client';

/**
 * Las pestañas de una FICHA (contrato, propietario, inquilino, inmueble) —
 * Nico, 21-10-2026: «hay cosas parametrizables y hay otras más informativas».
 * Eligió pestañas por tarea: lo que se consulta (Resumen, Historial…) aparte de
 * lo que se configura (Cobro y reglas, Configuración, Mandato y giro…).
 *
 * Reglas:
 *  · La pestaña vive en la URL (`?pestana=`): se comparte, se recarga y el
 *    «atrás» del navegador vuelve a la anterior.
 *  · TODAS las pestañas se montan y las inactivas se esconden (`hidden`): cada
 *    bloque carga igual que antes de partir la ficha (nada deja de pedirse ni de
 *    avisar) y cambiar de pestaña es inmediato.
 *  · La barra es la `Tabs` subrayada del sistema; en el celular se desliza.
 */
import { useCallback, useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface PestanaDeLaFicha<Id extends string = string> {
  id: Id;
  etiqueta: ReactNode;
  /** Un número al lado (cuántos hay); sólo si se leyó: nunca un «0» inventado. */
  cuenta?: number | null;
  contenido: ReactNode;
}

/** La pestaña que pide la URL, o la primera si no pide ninguna (o una que no existe). */
export function pestanaDeLaUrl<Id extends string>(
  valor: string | null | undefined,
  ids: readonly Id[],
): Id {
  return (ids as readonly string[]).includes(valor ?? '') ? (valor as Id) : ids[0];
}

export function PestanasDeLaFicha<Id extends string>({
  pestanas,
  etiqueta,
  className,
  'data-testid': testId = 'pestanas-de-la-ficha',
}: {
  pestanas: readonly PestanaDeLaFicha<Id>[];
  /** El nombre accesible de la barra («Secciones del contrato»). */
  etiqueta: string;
  className?: string;
  'data-testid'?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const ids = pestanas.map((p) => p.id);
  const activa = pestanaDeLaUrl(params?.get('pestana'), ids);

  const elegir = useCallback(
    (id: string) => {
      const siguiente = new URLSearchParams(params?.toString() ?? '');
      // La primera es la de siempre: sin parámetro, la URL queda limpia.
      if (id === ids[0]) siguiente.delete('pestana');
      else siguiente.set('pestana', id);
      const query = siguiente.toString();
      // La ruta se lee al hacer clic (sólo pasa en el navegador).
      const ruta = window.location.pathname;
      router.replace(query ? `${ruta}?${query}` : ruta, { scroll: false });
    },
    [params, router, ids],
  );

  // Un enlace con ancla (#fotos, #propietarios…) a un bloque de otra pestaña abre esa
  // pestaña: si no, el enlace llevaría a algo escondido.
  useEffect(() => {
    const ancla = window.location.hash.slice(1);
    if (!ancla) return;
    const destino = document.getElementById(decodeURIComponent(ancla));
    const panel = destino?.closest<HTMLElement>('[data-pestana-de-la-ficha]');
    const suya = panel?.dataset.pestanaDeLaFicha;
    if (suya && suya !== activa) elegir(suya);
    // Sólo al llegar: después manda la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tabs value={activa} onValueChange={elegir} className={cn('space-y-6', className)}>
      <TabsList className="justify-start" aria-label={etiqueta} data-testid={testId}>
        {pestanas.map((p) => (
          <TabsTrigger key={p.id} value={p.id} data-testid={`pestana-${p.id}`}>
            <span className="inline-flex items-center gap-2">
              {p.etiqueta}
              {typeof p.cuenta === 'number' ? (
                <span className="font-mono text-caption tabular-nums text-fg-muted">{p.cuenta}</span>
              ) : null}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {pestanas.map((p) => (
        // forceMount: montada siempre; la inactiva se esconde por su data-state.
        <TabsContent
          key={p.id}
          value={p.id}
          forceMount
          className="mt-0 space-y-6 data-[state=inactive]:hidden"
          data-testid={`panel-${p.id}`}
          data-pestana-de-la-ficha={p.id}
        >
          {p.contenido}
        </TabsContent>
      ))}
    </Tabs>
  );
}
