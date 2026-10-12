import type { ReactElement } from 'react';
import { Camera } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

/**
 * La portada de un inmueble que todavía no tiene fotos (Nico, 09-10-2026: «ese
 * empty state de sin foto qué cosa tan fea, haz algo más hermoso»).
 *
 * Un dibujo de línea según el tipo (edificio, casa, local, bodega, lote) sobre
 * un fondo de color suave que cambia de un inmueble a otro (sale de su id: el
 * mismo inmueble siempre tiene el mismo), y «Sin fotos» dicho sin drama: es la
 * verdad, no una imagen rota. Va dentro de un contenedor `relative` con alto
 * propio, como la foto.
 */

/** [fondo arriba, fondo abajo, trazo]: tonos apagados de la paleta de la marca. */
const TONOS = [
  ['#E4ECE6', '#CFDDD3', '#4F6F5C'], // salvia
  ['#F0E8DB', '#E2D4BF', '#7A6446'], // arena
  ['#E3EAF3', '#CEDAEA', '#4A6385'], // cielo
  ['#F1E5E1', '#E4CFC8', '#82574B'], // arcilla
  ['#E8E6F4', '#D6D2EC', '#5D5590'], // lavanda
] as const;

function tonoDe(semilla: string): (typeof TONOS)[number] {
  let h = 0;
  for (const c of semilla) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONOS[h % TONOS.length];
}

type Dibujo = 'edificio' | 'casa' | 'local' | 'bodega' | 'lote';

function dibujoDe(tipo: string | null | undefined): Dibujo {
  switch ((tipo ?? '').toLowerCase()) {
    case 'house':
      return 'casa';
    case 'commercial':
    case 'office':
      return 'local';
    case 'warehouse':
      return 'bodega';
    case 'land':
    case 'parking':
      return 'lote';
    default:
      return 'edificio';
  }
}

/** Ventanas en rejilla (columnas × filas) dentro de un rectángulo. */
function ventanas(x: number, y: number, columnas: number, filas: number, paso: number) {
  const r: ReactElement[] = [];
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      r.push(<rect key={`${f}-${c}`} x={x + c * paso} y={y + f * paso} width={paso * 0.55} height={paso * 0.62} rx={1} />);
    }
  }
  return r;
}

function Trazo({ dibujo }: { dibujo: Dibujo }) {
  switch (dibujo) {
    case 'casa':
      return (
        <>
          <path d="M52 120V74L100 38l48 36v46" />
          <path d="M40 82 100 34l60 48" />
          <path d="M126 50V36h10v22" />
          <rect x="89" y="92" width="22" height="28" rx="1.5" />
          <rect x="62" y="84" width="16" height="14" rx="1" />
          <rect x="122" y="84" width="16" height="14" rx="1" />
        </>
      );
    case 'local':
      return (
        <>
          <rect x="44" y="58" width="112" height="62" rx="1.5" />
          <path d="M40 58h120l-6-16H46z" />
          <path d="M58 58c0 6 9 6 9 0M76 58c0 6 9 6 9 0M94 58c0 6 9 6 9 0M112 58c0 6 9 6 9 0M130 58c0 6 9 6 9 0" />
          <rect x="54" y="74" width="54" height="34" rx="1" />
          <rect x="118" y="78" width="26" height="42" rx="1" />
        </>
      );
    case 'bodega':
      return (
        <>
          <path d="M40 120V70c0-22 120-22 120 0v50" />
          <rect x="70" y="80" width="60" height="40" rx="1" />
          <path d="M70 90h60M70 100h60M70 110h60" />
        </>
      );
    case 'lote':
      return (
        <>
          <path d="M20 120c30-26 60-30 90-12s50 8 70-6" />
          <path d="M30 120c40-14 80-14 140 0" />
          <path d="M120 96V62" />
          <rect x="104" y="48" width="32" height="18" rx="2" />
        </>
      );
    default:
      return (
        <>
          <rect x="46" y="28" width="52" height="92" rx="1.5" />
          <g>{ventanas(54, 36, 4, 7, 11)}</g>
          <rect x="104" y="58" width="50" height="62" rx="1.5" />
          <g>{ventanas(112, 66, 4, 4, 11)}</g>
          <rect x="66" y="106" width="12" height="14" rx="1" />
        </>
      );
  }
}

export function PortadaSinFotos({
  tipo,
  semilla,
  compacta = false,
  sinLeyenda = false,
  espacioAbajo = false,
  className,
}: {
  /** El tipo del inmueble (`apartment`, `HOUSE`…): decide el dibujo. */
  tipo?: string | null;
  /** Algo fijo del inmueble (su id): decide el color. */
  semilla?: string | null;
  /** Miniatura: sólo el dibujo; «Sin fotos» queda para el lector de pantalla. */
  compacta?: boolean;
  /** Sin la leyenda visible (quien la usa ya dice que no hay fotos). */
  sinLeyenda?: boolean;
  /** Deja libre la franja de abajo (la galería pinta ahí el precio). */
  espacioAbajo?: boolean;
  className?: string;
}) {
  const [arriba, abajo, trazo] = tonoDe(semilla ?? tipo ?? 'inmueble');
  const dibujo = dibujoDe(tipo);
  return (
    <div
      data-testid="inmueble-sin-fotos"
      className={cn('absolute inset-0 overflow-hidden bg-surface-muted', className)}
    >
      {/* El color va en su capa: en modo oscuro se apaga sin perder el dibujo. */}
      <span
        aria-hidden
        className="absolute inset-0 dark:opacity-20"
        style={{ background: `linear-gradient(160deg, ${arriba} 0%, ${abajo} 100%)` }}
      />
      <span
        aria-hidden
        className="absolute -right-[12%] -top-[22%] aspect-square w-[46%] rounded-full bg-white/45 blur-2xl dark:bg-white/5"
      />
      <svg
        aria-hidden
        viewBox="0 0 200 124"
        className={cn(
          'absolute inset-x-0 mx-auto w-auto max-w-[88%] text-[var(--trazo)] opacity-70 dark:text-fg-subtle dark:opacity-60',
          espacioAbajo ? 'bottom-[26%] h-[44%]' : 'bottom-0 h-[62%]',
        )}
        style={{ ['--trazo' as string]: trazo }}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Trazo dibujo={dibujo} />
        <path d="M8 120.5h184" strokeWidth={1.2} opacity={0.6} />
      </svg>
      {compacta || sinLeyenda ? (
        <span className="sr-only">Sin fotos</span>
      ) : (
        <span className={cn('absolute left-1/2 inline-flex', espacioAbajo ? 'top-[20%]' : 'top-[27%]', '-translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[12.5px] font-medium text-fg-muted shadow-sm backdrop-blur-sm dark:bg-surface/80')}>
          <Camera className="h-3.5 w-3.5" aria-hidden />
          Sin fotos
        </span>
      )}
    </div>
  );
}
