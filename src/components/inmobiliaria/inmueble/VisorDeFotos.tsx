'use client';

/**
 * VisorDeFotos — todas las fotos del inmueble a pantalla completa.
 *
 * ── Por qué existe (Nico, 2026-09-02) ─────────────────────────────────────
 * «En la imagen me debería dejar ver todas las imágenes que tenga el
 * inmueble.» La ficha mostraba la portada en el encabezado y una grilla de
 * miniaturas más abajo, y ninguna de las dos se podía abrir en grande.
 *
 * Es un `Dialog` de Radix sin la tarjeta: fondo oscuro, la foto al centro,
 * flechas, contador y una tira de miniaturas. Radix pone el foco adentro,
 * cierra con Escape y bloquea el scroll de atrás; acá sólo van las flechas
 * del teclado, el deslizar en pantalla táctil y la precarga de las vecinas.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export interface VisorDeFotosProps {
  fotos: string[];
  /** Índice abierto; `null` = cerrado. */
  indice: number | null;
  onCerrar: () => void;
  onCambiar: (indice: number) => void;
  /** Para el `alt` y el nombre accesible del diálogo. */
  titulo?: string;
}

/** Cuántos píxeles de arrastre horizontal cuentan como «pasar de foto». */
const UMBRAL_DE_DESLIZAMIENTO = 40;

export function VisorDeFotos({ fotos, indice, onCerrar, onCambiar, titulo }: VisorDeFotosProps) {
  const abierto = indice !== null && fotos.length > 0;
  const actual = abierto ? Math.min(Math.max(indice, 0), fotos.length - 1) : 0;
  const total = fotos.length;
  const tiraRef = useRef<HTMLUListElement>(null);
  const toqueX = useRef<number | null>(null);
  const [cargada, setCargada] = useState(false);

  const ir = useCallback(
    (destino: number) => {
      if (total === 0) return;
      // Circular: de la última pasa a la primera y al revés.
      onCambiar(((destino % total) + total) % total);
    },
    [onCambiar, total],
  );

  // La miniatura activa siempre a la vista.
  useEffect(() => {
    if (!abierto) return;
    const activa = tiraRef.current?.querySelector<HTMLElement>('[data-activa="true"]');
    activa?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [abierto, actual]);

  // Precargar la anterior y la siguiente para que la flecha no muestre un hueco.
  useEffect(() => {
    if (!abierto || total < 2) return;
    for (const i of [actual - 1, actual + 1]) {
      const img = new Image();
      img.src = fotos[((i % total) + total) % total];
    }
  }, [abierto, actual, fotos, total]);

  useEffect(() => {
    setCargada(false);
  }, [actual, abierto]);

  if (!abierto) return null;

  const nombre = titulo ? `Fotos de ${titulo}` : 'Fotos del inmueble';

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onCerrar()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-sm motion-safe:animate-fade-in" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[401] flex flex-col outline-none"
          aria-label={nombre}
          data-lenis-prevent
          data-testid="visor-de-fotos"
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual - 1); }
            if (e.key === 'Home') { e.preventDefault(); ir(0); }
            if (e.key === 'End') { e.preventDefault(); ir(total - 1); }
          }}
          onTouchStart={(e) => { toqueX.current = e.touches[0]?.clientX ?? null; }}
          onTouchEnd={(e) => {
            const inicio = toqueX.current;
            toqueX.current = null;
            const fin = e.changedTouches[0]?.clientX;
            if (inicio == null || fin == null) return;
            const delta = fin - inicio;
            if (Math.abs(delta) < UMBRAL_DE_DESLIZAMIENTO) return;
            ir(delta < 0 ? actual + 1 : actual - 1);
          }}
        >
          <DialogPrimitive.Title className="sr-only">{nombre}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Foto {actual + 1} de {total}. Usá las flechas para pasar de foto y Escape para cerrar.
          </DialogPrimitive.Description>

          {/* Barra superior: contador y cerrar */}
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-white/80 tabular-nums" data-testid="visor-contador">
              {actual + 1} / {total}
            </span>
            <DialogPrimitive.Close
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Cerrar las fotos"
            >
              <X className="h-5 w-5" weight="bold" />
            </DialogPrimitive.Close>
          </div>

          {/* La foto */}
          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16"
            onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
          >
            {total > 1 && (
              <button
                type="button"
                onClick={() => ir(actual - 1)}
                className="absolute left-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
                aria-label="Foto anterior"
                data-testid="visor-anterior"
              >
                <CaretLeft className="h-6 w-6" weight="bold" />
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- fotos en Storage/portales, sin dominio fijo para next/image */}
            <img
              key={fotos[actual]}
              src={fotos[actual]}
              alt={titulo ? `${titulo}, foto ${actual + 1} de ${total}` : `Foto ${actual + 1} de ${total}`}
              onLoad={() => setCargada(true)}
              className={cn(
                'max-h-full max-w-full select-none rounded-lg object-contain shadow-2xl transition-opacity duration-200',
                cargada ? 'opacity-100' : 'opacity-0',
              )}
              draggable={false}
              data-testid="visor-foto"
            />
            {total > 1 && (
              <button
                type="button"
                onClick={() => ir(actual + 1)}
                className="absolute right-2 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
                aria-label="Foto siguiente"
                data-testid="visor-siguiente"
              >
                <CaretRight className="h-6 w-6" weight="bold" />
              </button>
            )}
          </div>

          {/* Tira de miniaturas */}
          {total > 1 && (
            <ul
              ref={tiraRef}
              className="flex shrink-0 gap-2 overflow-x-auto px-4 py-3 sm:px-6 sm:[justify-content:safe_center]"
              aria-label="Todas las fotos"
              data-testid="visor-tira"
            >
              {fotos.map((url, i) => (
                <li key={`${url}-${i}`} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => ir(i)}
                    data-activa={i === actual ? 'true' : undefined}
                    aria-label={`Foto ${i + 1}`}
                    aria-current={i === actual ? 'true' : undefined}
                    className={cn(
                      'block h-14 w-20 overflow-hidden rounded-md border-2 transition-[border-color,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
                      i === actual ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-90',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
