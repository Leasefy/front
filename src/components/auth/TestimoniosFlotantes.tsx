'use client';

/**
 * Testimonios que van apareciendo sobre el video del acceso, uno cada pocos
 * segundos, en una tarjeta de vidrio abajo a la izquierda (Nico, 2026-09-03:
 * «un pop up glass de una inmobiliaria diciendo lo feliz que están con
 * nuestro producto, y luego sale otro, y así hasta que salen cuatro»).
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
      className="absolute bottom-8 left-8 w-[380px] max-w-[calc(100vw-4rem)]"
      aria-live="polite"
      data-testid="testimonios"
    >
      <AnimatePresence mode="wait">
        <motion.figure
          key={indice}
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducido ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-lg border border-white/50 bg-white/30 p-5 shadow-[0_16px_48px_-16px_rgba(20,19,15,0.35)] backdrop-blur-xl"
          data-testid="testimonio"
        >
          <figcaption className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#14130f]/70">
            {t.agencia} · {t.ciudad}
          </figcaption>
          <blockquote className="mt-2 text-[15px] font-medium leading-snug text-[#14130f]">
            «{t.frase}»
          </blockquote>
          <p className="mt-3 text-[12.5px] text-[#14130f]/70">
            {t.nombre}, {t.cargo}
          </p>
        </motion.figure>
      </AnimatePresence>

      {/* Cuatro puntos: cuál va, y que son cuatro. */}
      <div className="mt-3 flex items-center gap-1.5 pl-1" aria-hidden="true">
        {TESTIMONIOS.map((x, i) => (
          <span
            key={x.agencia}
            className={
              i === indice
                ? 'h-1.5 w-4 rounded-full bg-[#14130f]/80 transition-all duration-300'
                : 'h-1.5 w-1.5 rounded-full bg-[#14130f]/30 transition-all duration-300'
            }
          />
        ))}
      </div>
    </div>
  );
}
