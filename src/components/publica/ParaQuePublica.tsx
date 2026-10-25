'use client';

import { Key, Tag } from '@phosphor-icons/react';
import { Pressable } from '@leasefy/cadence';

import type { Operacion } from '@/lib/publica/borrador';
import { cn } from '@/lib/utils';

/**
 * «¿Lo publicas para arriendo o para venta?» — lo primero que pregunta el
 * publicador (Nico, 21-10-2026: «el marketplace también hay que darle la
 * opción de que sea también para venta, no solo enfocado en arriendo, sino
 * que cuando le dé publicar le pregunte si es para arriendo o venta»).
 *
 * Antes cada tarjeta nacía en «Arriendo» y la venta era una pastilla que
 * había que notar. La respuesta queda en todas las tarjetas que se agreguen;
 * cada inmueble se puede cambiar después en su tarjeta (el que tiene de los
 * dos). Mismo estilo que «¿Quién va a publicar?»: tocar una ya avanza.
 */
const OPCIONES: Record<Operacion, { titulo: string; detalle: string; Icono: typeof Key }> = {
  rent: {
    titulo: 'Para arriendo',
    detalle: 'Busco inquilino. Sale con el canon mensual.',
    Icono: Key,
  },
  sale: {
    titulo: 'Para venta',
    detalle: 'Busco comprador. Sale con el precio de venta.',
    Icono: Tag,
  },
};

export function ParaQuePublica({ alElegir }: { alElegir: (operacion: Operacion) => void }) {
  return (
    <div className="mx-auto w-full max-w-[560px]" data-testid="para-que-publica">
      {/* Glow up 23-10 (Cadence 2): el sobretítulo sin el cuadrito azul y el título liviano. */}
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-fg-subtle">Publica gratis</p>
      <h1 className="mt-4 text-[30px] font-[420] leading-[1.08] tracking-[-0.03em] text-fg sm:text-[36px]">
        ¿Lo publicas para arriendo o para venta?
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-fg-subtle">
        Así lo encuentra quien busca arrendar o quien busca comprar. Si tienes de los dos, lo cambias en cada inmueble.
      </p>

      <div className="mt-7 space-y-3" role="group" aria-label="Para qué lo publicas">
        {(Object.keys(OPCIONES) as Operacion[]).map((op) => {
          const { titulo, detalle, Icono } = OPCIONES[op];
          return (
            // Sube al pasar y se hunde al tocar con el resorte de Cadence (framer), sin sombra ni brillo; el
            // ícono suelto, sin cuadro de color, y sin flecha: tocar la tarjeta ya avanza.
            <Pressable
              key={op}
              as="button"
              onClick={() => alElegir(op)}
              className={cn(
                'group flex w-full items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left',
                'transition-colors duration-fast ease-standard hover:border-primary/60',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              )}
              data-testid={`publicar-para-${op === 'sale' ? 'venta' : 'arriendo'}`}
            >
              <Icono
                size={28}
                weight="duotone"
                className="shrink-0 text-fg-muted transition-colors duration-fast group-hover:text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-medium text-fg">{titulo}</span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-fg-subtle">{detalle}</span>
              </span>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}
