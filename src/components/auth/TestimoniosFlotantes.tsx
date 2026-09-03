'use client';

/**
 * Testimonios que van apareciendo sobre el video del acceso, uno cada pocos
 * segundos, en una tarjeta de vidrio abajo a la izquierda (Nico, 2026-09-03:
 * «un pop up glass de una inmobiliaria diciendo lo feliz que están con
 * nuestro producto, y luego sale otro, y así hasta que salen cuatro»).
 *
 * Vidrio OSCURO y texto blanco: el video es claro (cortina, pared crema) y
 * un vidrio claro con tinta encima se perdía en la toma de la ventana. La
 * barra de abajo, en cuatro tramos, se va llenando con el tiempo del que
 * está en pantalla: dice cuál va, que son cuatro, y cuándo cambia.
 *
 * 🔴 Copy de muestra. Las inmobiliarias y las personas son inventadas, para
 * ver la pieza en pantalla. Antes de producción van testimonios reales, con
 * el permiso de quien los dice; la forma no cambia, sólo la lista.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export interface Testimonio {
  agencia: string;
  ciudad: string;
  frase: string;
  nombre: string;
  cargo: string;
}

export const TESTIMONIOS: Testimonio[] = [
  {
    agencia: 'Portofino Inmobiliaria',
    ciudad: 'Medellín',
    frase:
      'Pasamos de perseguir pagos por WhatsApp a tener el recaudo conciliado solo. El equipo volvió a vender.',
    nombre: 'Mariana Restrepo',
    cargo: 'Gerente general',
  },
  {
    agencia: 'Altavista Bienes Raíces',
    ciudad: 'Bogotá',
    frase:
      'Migramos 300 contratos en una tarde y al día siguiente ya estaban cobrando. No lo creíamos.',
    nombre: 'Julián Ospina',
    cargo: 'Director de operaciones',
  },
  {
    agencia: 'Casa Nuestra',
    ciudad: 'Cali',
    frase:
      'Los propietarios reciben su extracto sin que nadie lo arme a mano. Se acabaron las llamadas del día cinco.',
    nombre: 'Carolina Vélez',
    cargo: 'Socia fundadora',
  },
  {
    agencia: 'Nido Inmobiliario',
    ciudad: 'Barranquilla',
    frase:
      'El piloto nos avisa antes de que un contrato venza. Renovamos más, con menos gente encima.',
    nombre: 'Andrés Camargo',
    cargo: 'Gerente comercial',
  },
];

/** Cuánto se queda cada uno. Lo que tarda en leerse dos veces, no una. */
export const INTERVALO_MS = 6000;

/** «Mariana Restrepo» → «MR». */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function TestimoniosFlotantes({ intervaloMs = INTERVALO_MS }: { intervaloMs?: number }) {
  const [indice, setIndice] = useState(0);
  const reducido = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => setIndice((n) => (n + 1) % TESTIMONIOS.length), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  const t = TESTIMONIOS[indice];

  return (
    <div
      className="absolute bottom-8 left-8 w-[400px] max-w-[calc(100vw-4rem)]"
      aria-live="polite"
      data-testid="testimonios"
    >
      <p className="mb-3 pl-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/60">
        Inmobiliarias que ya operan con Leasefy
      </p>

      <AnimatePresence mode="wait">
        <motion.figure
          key={indice}
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={reducido ? { opacity: 0 } : { opacity: 0, y: -10, filter: 'blur(4px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-lg border border-white/15 bg-[#14130f]/45 p-6 text-white shadow-[0_24px_64px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
          data-testid="testimonio"
        >
          {/* Un brillo arriba, como el borde de un vidrio de verdad. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/0 via-white/40 to-white/0"
          />

          <p
            className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/60"
            data-testid="testimonio-agencia"
          >
            {t.agencia} · {t.ciudad}
          </p>

          <blockquote className="mt-3 font-heading text-[19px] font-medium leading-[1.3] tracking-[-0.01em] text-white">
            «{t.frase}»
          </blockquote>

          <figcaption className="mt-5 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 font-mono text-[11px] font-medium tracking-[0.06em] text-white"
            >
              {iniciales(t.nombre)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-white">{t.nombre}</span>
              <span className="block truncate text-[12px] text-white/60">
                {t.cargo}, {t.agencia}
              </span>
            </span>
          </figcaption>

          {/* Cuatro tramos; el que va se llena con el tiempo en pantalla. */}
          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {TESTIMONIOS.map((x, i) => (
              <span key={x.agencia} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20">
                {i < indice && <span className="block h-full w-full bg-white/70" />}
                {i === indice && (
                  <motion.span
                    key={indice}
                    className="block h-full bg-white"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={
                      reducido ? { duration: 0 } : { duration: intervaloMs / 1000, ease: 'linear' }
                    }
                  />
                )}
              </span>
            ))}
          </div>
        </motion.figure>
      </AnimatePresence>
    </div>
  );
}
