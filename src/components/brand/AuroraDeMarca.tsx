'use client';

import { cn } from '@/lib/utils';

/**
 * La aurora de la marca: el degradado con grano de las portadas de los
 * correos, hecho con CSS y vivo.
 *
 * Nico (30-09-2026), sobre la pantalla de «Tu inmobiliaria quedó creada»:
 * «un fondo así bien top con ruido de los gradientes que tenemos que se
 * mueve». Los gradientes que tenemos son las portadas de los correos
 * (`back/src/notifications/emails/assets/hero-*.jpg`): noche y petróleo de un
 * lado, el cobalto en el medio, azur y cielo, y un cálido crema en el borde,
 * todo con grano. Los colores de `PALETA` salen de muestrear esas tres
 * imágenes (más el cobalto de la marca, `#1A40FF`); son la obra de marca, no
 * colores de interfaz, y por eso no son tokens.
 *
 * Sin imágenes: cinco manchas `radial-gradient` sobre un fondo noche, que se
 * mueven con `transform` (lo anima el compositor, no el hilo principal), un
 * velo oscuro donde va el texto (el blanco sobre el azur no llega a 4.5:1 sin
 * él) y el grano: un `feTurbulence` en una baldosa `data:` (la CSP permite
 * `data:` en imágenes y estilos en línea), que salta de lugar unas veces por
 * segundo como el grano de una película.
 *
 * `animada={false}` (o `prefers-reduced-motion`, que el CSS respeta igual)
 * deja la misma composición quieta.
 */

/** Muestreados de `hero-onboarding-activacion`, `hero-confirma-tu-correo` y `hero-invitacion-equipo`. */
const PALETA = {
  noche: '#041e4d',
  marino: '#06305a',
  petroleo: '#0b3d58',
  cobalto: '#1a40ff',
  azur: '#1b87f6',
  cielo: '#8cc8f2',
  menta: '#62b3b9',
  crema: '#f4d9a6',
} as const;

interface Mancha {
  color: string;
  /** Diámetro, en `vmax`: crece con la pantalla sin deformarse. */
  tam: number;
  /** Centro, en % del ancho y del alto. */
  x: number;
  y: number;
  /** Qué tan opaca llega al centro. */
  fuerza: number;
  deriva: 'a' | 'b' | 'c';
  segundos: number;
  /** Negativo: arranca a mitad de camino, así se mueve desde el primer cuadro. */
  desfase: number;
}

// El cobalto abajo al centro (es el que sostiene el texto), los claros en
// las esquinas de arriba —lejos del logo y del título— y el cálido asomado
// por el borde de arriba a la derecha, como en las portadas.
const MANCHAS: readonly Mancha[] = [
  { color: PALETA.cobalto, tam: 95, x: 52, y: 78, fuerza: 0.95, deriva: 'a', segundos: 9, desfase: -2 },
  { color: PALETA.azur, tam: 62, x: 12, y: 92, fuerza: 0.85, deriva: 'b', segundos: 8, desfase: -5 },
  { color: PALETA.cielo, tam: 48, x: 94, y: 14, fuerza: 0.8, deriva: 'c', segundos: 7, desfase: -1 },
  { color: PALETA.crema, tam: 42, x: 104, y: -6, fuerza: 0.9, deriva: 'b', segundos: 10, desfase: -6 },
  { color: PALETA.menta, tam: 40, x: -6, y: 18, fuerza: 0.55, deriva: 'a', segundos: 11, desfase: -3 },
];

/** Grano: ruido fractal en gris, con su alfa, en una baldosa que empalma sin costura. */
const GRANO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

const CSS = `
@keyframes lf-aurora-a { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(7vmax,-5vmax,0) scale(1.14); } }
@keyframes lf-aurora-b { from { transform: translate3d(0,0,0) scale(1.08); } to { transform: translate3d(-6vmax,4vmax,0) scale(0.94); } }
@keyframes lf-aurora-c { from { transform: translate3d(0,0,0) rotate(0deg) scale(1); } to { transform: translate3d(-5vmax,6vmax,0) rotate(40deg) scale(1.1); } }
@keyframes lf-aurora-grano {
  0% { transform: translate(0,0); } 17% { transform: translate(-6%,-9%); } 33% { transform: translate(-14%,4%); }
  50% { transform: translate(6%,-18%); } 67% { transform: translate(-4%,16%); } 83% { transform: translate(12%,2%); }
  100% { transform: translate(0,10%); }
}
@media (prefers-reduced-motion: reduce) { .lf-aurora, .lf-aurora * { animation: none !important; } }
`;

export interface AuroraDeMarcaProps {
  /** `false` = la misma composición, quieta. */
  animada?: boolean;
  /** Oscurece el centro, donde va el texto en blanco. */
  velo?: boolean;
  className?: string;
}

export function AuroraDeMarca({ animada = true, velo = true, className }: AuroraDeMarcaProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="aurora-de-marca"
      data-animada={animada ? 'si' : 'no'}
      className={cn('lf-aurora pointer-events-none overflow-hidden', className)}
      style={{
        background: `linear-gradient(155deg, ${PALETA.noche} 0%, ${PALETA.marino} 45%, ${PALETA.petroleo} 100%)`,
      }}
    >
      <style>{CSS}</style>

      {MANCHAS.map((m, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${m.tam}vmax`,
            height: `${m.tam}vmax`,
            left: `calc(${m.x}% - ${m.tam / 2}vmax)`,
            top: `calc(${m.y}% - ${m.tam / 2}vmax)`,
            background: `radial-gradient(closest-side, ${m.color}, transparent)`,
            opacity: m.fuerza,
            willChange: animada ? 'transform' : undefined,
            animation: animada
              ? `lf-aurora-${m.deriva} ${m.segundos}s ease-in-out ${m.desfase}s infinite alternate`
              : undefined,
          }}
        />
      ))}

      {velo ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 55% at 50% 52%, rgba(4,24,62,0.62) 0%, rgba(4,24,62,0.34) 55%, rgba(4,24,62,0) 100%)',
          }}
        />
      ) : null}

      {/* El grano mide el doble de la pantalla para poder saltar sin mostrar el borde. */}
      <div
        className="absolute -inset-1/2"
        style={{
          backgroundImage: GRANO,
          backgroundSize: '220px 220px',
          opacity: 0.32,
          mixBlendMode: 'overlay',
          willChange: animada ? 'transform' : undefined,
          animation: animada ? 'lf-aurora-grano 1.1s steps(1) infinite' : undefined,
        }}
      />
    </div>
  );
}
