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
 * 🔴 LA LISTA QUE SE MUESTRA ESTÁ VACÍA, Y ES A PROPÓSITO.
 *
 * Hasta acá esto pintaba cuatro testimonios inventados —«Mariana Restrepo,
 * Gerente general, Portofino Inmobiliaria, Medellín»— bajo un título que
 * afirmaba «Inmobiliarias que ya operan con Leasefy», en la pantalla de
 * acceso, a la vista de cualquiera. Ninguna de esas inmobiliarias existe y
 * ninguna de esas personas dijo eso. En Colombia eso es publicidad engañosa
 * (Ley 1480 de 2011, Estatuto del Consumidor, arts. 29-30): no es un detalle
 * de copy, es una afirmación falsa sobre clientes reales.
 *
 * El comentario que había —«copy de muestra, antes de producción van
 * testimonios reales»— no protege de nada: un comentario no impide que la
 * pantalla salga a producción, y de hecho ya estaba montada.
 *
 * Así que la pieza se queda —el diseño sirve y está probado— pero la lista que
 * consume la app es `TESTIMONIOS`, y está vacía: sin testimonios el componente
 * no pinta NADA. El día que haya frases reales con el permiso de quien las
 * dijo, se llenan acá y vuelve sola. Los de muestra siguen abajo, con nombre
 * de muestra, para poder mirar la pieza desde un test o un preview.
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

/**
 * Testimonios REALES. Vacío hasta que existan.
 *
 * Requisito para agregar uno: que la persona lo haya dicho y haya dado
 * permiso escrito para publicarlo con su nombre y su inmobiliaria.
 */
export const TESTIMONIOS: Testimonio[] = [];

/** Los inventados, sólo para ver la pieza. NUNCA se montan en la app. */
export const TESTIMONIOS_DE_MUESTRA: Testimonio[] = [
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

export function TestimoniosFlotantes({
  intervaloMs = INTERVALO_MS,
  testimonios = TESTIMONIOS,
}: {
  intervaloMs?: number;
  /** Se puede pasar la lista para mirar la pieza; por defecto, la real. */
  testimonios?: Testimonio[];
}) {
  const [indice, setIndice] = useState(0);
  const reducido = useReducedMotion();
  const total = testimonios.length;

  useEffect(() => {
    if (total === 0) return;
    const id = setInterval(() => setIndice((n) => (n + 1) % total), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs, total]);

  // Sin testimonios reales no hay nada que mostrar. El bloque entero —incluido
  // el título «Inmobiliarias que ya operan con Leasefy»— desaparece: el título
  // solo también es una afirmación.
  if (total === 0) return null;

  const t = testimonios[indice % total];

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

          {/* Un tramo por testimonio; el que va se llena con el tiempo en pantalla. */}
          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {testimonios.map((x, i) => (
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
