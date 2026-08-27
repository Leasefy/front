'use client';

import { cn } from '@/lib/utils';

interface ChatOrbProps {
  /** Diámetro en px del cuerpo del orbe. Los anillos viven fuera de esa caja. */
  size?: number;
  className?: string;
  /** Texto para lectores de pantalla; `null` lo marca decorativo. */
  label?: string | null;
}

/**
 * ChatOrb — el estado «pensando» del chat.
 *
 * ── Por qué (Nico, 2026-08-27) ─────────────────────────────────────────────
 *
 * Antes eran tres puntitos rebotando al lado del logo: correcto y olvidable.
 * El pedido fue textual — «quiero algo top que la gente diga wow al verlo
 * cargando» — con un video de referencia (AI Orb, Humandone): una esfera
 * vidriosa sobre fondo CLARO, núcleo azul profundo, medio cian, borde nacarado
 * y ondas concéntricas saliendo. Cae redondo sobre nuestra paleta: el cobalto
 * #1A40FF y el cian #2BB5E8 ya son los del monograma de los agentes.
 *
 * ── Por qué CSS y no canvas ────────────────────────────────────────────────
 *
 * Un canvas con shader se vería igual de bien y costaría un `requestAnimation‐
 * Frame` corriendo mientras el usuario espera — justo cuando el hilo principal
 * está ocupado recibiendo el stream de la respuesta. Estas capas las anima el
 * compositor (`transform` y `opacity` solamente), así que giran fuera del hilo
 * principal y no le compiten al texto que está llegando.
 *
 * Respeta `prefers-reduced-motion`: quieto, pero sigue siendo un orbe — no se
 * degrada a un cuadrado gris.
 */
export function ChatOrb({ size = 30, className, label = null }: ChatOrbProps) {
  // Los anillos salen hasta 2,2× el cuerpo. La caja los contiene para que no
  // empujen el layout del mensaje que viene abajo.
  const box = Math.round(size * 2.2);

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: box, height: box }}
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
    >
      {/* Ondas concéntricas — dos, desfasadas, saliendo del cuerpo */}
      <span className="orb-ring" style={{ width: size, height: size }} />
      <span className="orb-ring orb-ring--late" style={{ width: size, height: size }} />

      {/* Halo difuso: el resplandor que tiñe el fondo alrededor */}
      <span className="orb-halo" style={{ width: size * 1.5, height: size * 1.5 }} />

      {/* Cuerpo de vidrio */}
      <span className="orb-body" style={{ width: size, height: size }}>
        {/* Núcleo girando — el remolino cobalto/cian */}
        <span className="orb-core" />
        {/* Segunda capa, más lenta y al revés: da la sensación de líquido */}
        <span className="orb-core orb-core--slow" />
        {/* Brillo especular arriba a la izquierda */}
        <span className="orb-specular" />
      </span>

      <style jsx>{`
        .orb-ring,
        .orb-halo,
        .orb-body {
          position: absolute;
          border-radius: 9999px;
        }

        /* ── Ondas ──────────────────────────────────────────────────────── */
        .orb-ring {
          border: 1px solid rgba(26, 64, 255, 0.28);
          animation: orb-ripple 2600ms cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
          will-change: transform, opacity;
        }
        .orb-ring--late {
          animation-delay: 1300ms;
        }
        @keyframes orb-ripple {
          0% {
            transform: scale(1);
            opacity: 0.55;
          }
          70% {
            opacity: 0.08;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }

        /* ── Halo ───────────────────────────────────────────────────────── */
        .orb-halo {
          background: radial-gradient(
            circle,
            rgba(43, 181, 232, 0.30) 0%,
            rgba(26, 64, 255, 0.14) 40%,
            transparent 66%
          );
          filter: blur(6px);
          animation: orb-breathe 3200ms ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes orb-breathe {
          0%,
          100% {
            transform: scale(0.94);
            opacity: 0.75;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }

        /* ── Cuerpo de vidrio ───────────────────────────────────────────── */
        .orb-body {
          overflow: hidden;
          /* Borde nacarado: el anillo blanco del video sale de un gradiente que
             aclara justo en el filo, no de un border sólido. */
          /* El filo tiene que ser FINO: en la referencia es un anillo nacarado
             de un par de píxeles, no una corona. Con el blanco arrancando en
             52% se comía el núcleo y el orbe quedaba pálido. */
          background:
            radial-gradient(
              circle at 50% 50%,
              transparent 74%,
              rgba(255, 255, 255, 0.98) 88%,
              rgba(255, 255, 255, 0.62) 100%
            ),
            radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.9) 0%, transparent 42%);
          box-shadow:
            0 0 0 0.5px rgba(26, 64, 255, 0.18),
            0 4px 14px -2px rgba(26, 64, 255, 0.35),
            inset 0 -2px 6px rgba(26, 64, 255, 0.25);
          animation: orb-breathe 3200ms ease-in-out infinite;
          will-change: transform;
        }

        /* ── Núcleo ─────────────────────────────────────────────────────── */
        .orb-core {
          position: absolute;
          inset: 6%;
          border-radius: 9999px;
          /* Cian arriba-izquierda, cobalto al medio, casi negro abajo — el
             degradado de profundidad de la referencia. */
          background: conic-gradient(
            from 210deg,
            #2bb5e8 0deg,
            #1a40ff 70deg,
            #0a1352 150deg,
            #0b1f8f 215deg,
            #1a40ff 290deg,
            #2bb5e8 360deg
          );
          filter: blur(2px);
          animation: orb-spin 4200ms linear infinite;
          will-change: transform;
        }
        /* Estrías: la textura acanalada que hace que se lea como materia y no
           como un degradado. Van en una capa aparte y giran al revés, más
           lento, para que el interior parezca líquido girando sobre sí mismo. */
        .orb-core--slow {
          inset: 12%;
          opacity: 0.55;
          filter: blur(0.6px);
          background: repeating-conic-gradient(
            from 0deg,
            rgba(255, 255, 255, 0.5) 0deg 2deg,
            transparent 2deg 7deg
          );
          mix-blend-mode: overlay;
          animation: orb-spin-back 6400ms linear infinite;
        }
        @keyframes orb-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes orb-spin-back {
          to {
            transform: rotate(-360deg);
          }
        }

        /* ── Especular ──────────────────────────────────────────────────── */
        .orb-specular {
          position: absolute;
          top: 12%;
          left: 18%;
          width: 34%;
          height: 26%;
          border-radius: 9999px;
          background: radial-gradient(
            ellipse at 50% 50%,
            rgba(255, 255, 255, 0.95) 0%,
            transparent 70%
          );
          filter: blur(1px);
        }

        /* Quieto para quien pidió menos movimiento — pero sigue siendo un orbe. */
        @media (prefers-reduced-motion: reduce) {
          .orb-ring,
          .orb-halo,
          .orb-body,
          .orb-core {
            animation: none;
          }
          .orb-ring {
            opacity: 0.25;
          }
        }
      `}</style>
    </span>
  );
}
