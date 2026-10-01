'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * CargaDeMarca — el logo de Leasefy animado, en lugar de un spinner.
 *
 * Pedido de Nico (30-09): «en vez de esos spinners utilicemos ya nuestro logo
 * en carga… en light usa el azul para casi todo, solo algunas cosas con el
 * negro, y en dark usa el blanco… que se vea normal, ni muy pequeño ni muy
 * grande, y donde hay uno que tenga texto, persista el texto pero en MONO y en
 * mayúscula».
 *
 * Los recursos viven en `public/brand/carga/`: WebP ANIMADOS con alfa (240×130,
 * en bucle) y un PNG quieto por color para `prefers-reduced-motion`. Son WebP y
 * no los webm originales porque Safari/iPhone no pinta el alfa de VP9.
 *
 * Tema oscuro: el repo lo hace con la clase `.dark` en <html> (next-themes,
 * `attribute="class"`; `darkMode: ["class"]` en tailwind). Por eso el cambio
 * de color es `dark:hidden` / `hidden dark:block` y no un media query: así
 * también obedece a `ForceLightMode`, que le quita la clase a <html>.
 *
 * Movimiento reducido: es un media query de verdad, así que va dentro de un
 * <picture> con <source media>: el navegador baja SÓLO la versión que toca.
 */

export type TonoDeCarga = 'azul' | 'negro' | 'sobre-color' | 'sobre-blanco';
export type TamanoDeCarga = 'xs' | 'sm' | 'md' | 'lg';

/** Alto en px de cada tamaño; el ancho sale de la proporción del recurso. */
export const ALTO_DE_CARGA: Record<TamanoDeCarga, number> = {
  xs: 14, // dentro de botones e inline con texto
  sm: 18,
  md: 24, // por defecto
  lg: 36, // cargas de pantalla completa o de sección; nunca más grande
};

const PROPORCION = 240 / 130;

/** Ancho en px que corresponde a un tamaño (redondeado al píxel). */
export function anchoDeCarga(tamano: TamanoDeCarga): number {
  return Math.round(ALTO_DE_CARGA[tamano] * PROPORCION);
}

type Color = 'azul' | 'negro' | 'blanco';

const RUTA = '/brand/carga';
const animada = (color: Color) => `${RUTA}/carga-${color}.webp`;
const quieta = (color: Color) => `${RUTA}/carga-${color}-quieta.png`;

/**
 * Tono que hereda una carga «del color de lo que la rodea» (la `variant="current"`
 * del Spinner). Lo provee el Button según su variante: sobre un botón primario
 * la carga es blanca; sobre uno outline, azul.
 */
const TonoDeCargaContext = React.createContext<TonoDeCarga | null>(null);

export function ProveedorDeTonoDeCarga({
  tono,
  children,
}: {
  tono: TonoDeCarga;
  children: React.ReactNode;
}) {
  return <TonoDeCargaContext.Provider value={tono}>{children}</TonoDeCargaContext.Provider>;
}

/** El tono que fijó el contenedor más cercano (p. ej. un Button), o null. */
export function useTonoDeCargaHeredado(): TonoDeCarga | null {
  return React.useContext(TonoDeCargaContext);
}

export interface CargaDeMarcaProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  /**
   * Por defecto `azul`. `negro` para lo discreto. En oscuro ambos pasan a blanco.
   * `sobre-color` = blanco siempre (fondos llenos: botón primario, aurora de marca).
   * `sobre-blanco` = azul siempre (superficies que son blancas también en oscuro,
   * como el botón `white`).
   */
  tono?: TonoDeCarga;
  /** Por defecto `md` (24 px de alto). */
  tamano?: TamanoDeCarga;
  /** Texto visible que acompaña la carga; se pinta en mono y en mayúsculas. */
  texto?: React.ReactNode;
  /** Nombre accesible cuando no hay `texto` visible. Por defecto «Cargando». */
  etiqueta?: string;
  /** `en-linea`: logo y texto en fila. `apilada`: logo arriba, texto abajo (cargas de pantalla). */
  disposicion?: 'en-linea' | 'apilada';
  /** Clases extra para el texto (p. ej. el color sobre un fondo de marca). */
  textoClassName?: string;
}

function Logo({
  color,
  alto,
  ancho,
  className,
}: {
  color: Color;
  alto: number;
  ancho: number;
  className?: string;
}) {
  return (
    <picture className={cn('shrink-0', className)} data-carga-color={color}>
      <source srcSet={quieta(color)} media="(prefers-reduced-motion: reduce)" />
      {/* eslint-disable-next-line @next/next/no-img-element -- next/image re-codifica el WebP y lo deja QUIETO en el primer cuadro; la carga tiene que moverse. */}
      <img
        src={animada(color)}
        alt=""
        width={ancho}
        height={alto}
        decoding="async"
        draggable={false}
        className="block select-none"
        style={{ width: ancho, height: alto }}
      />
    </picture>
  );
}

export const CargaDeMarca = React.forwardRef<HTMLSpanElement, CargaDeMarcaProps>(
  (
    {
      tono = 'azul',
      tamano = 'md',
      texto,
      etiqueta = 'Cargando',
      disposicion = 'en-linea',
      className,
      textoClassName,
      ...props
    },
    ref
  ) => {
    const alto = ALTO_DE_CARGA[tamano];
    const ancho = anchoDeCarga(tamano);
    const hayTexto = texto !== undefined && texto !== null && texto !== '';

    return (
      <span
        ref={ref}
        role="status"
        aria-label={hayTexto ? undefined : etiqueta}
        data-tono={tono}
        data-tamano={tamano}
        className={cn(
          'inline-flex items-center justify-center',
          disposicion === 'apilada' ? 'flex-col gap-3' : 'gap-2',
          className
        )}
        {...props}
      >
        {tono === 'sobre-color' || tono === 'sobre-blanco' ? (
          <Logo color={tono === 'sobre-color' ? 'blanco' : 'azul'} alto={alto} ancho={ancho} />
        ) : (
          <>
            <Logo color={tono} alto={alto} ancho={ancho} className="block dark:hidden" />
            <Logo color="blanco" alto={alto} ancho={ancho} className="hidden dark:block" />
          </>
        )}
        {hayTexto ? (
          <span
            // `text-caption` va FUERA de cn: tailwind-merge la confunde con un
            // color y la borraría al lado de `text-fg-muted`.
            className={`${cn(
              'font-mono uppercase tracking-[0.14em]',
              tono === 'sobre-color' || tono === 'sobre-blanco' ? 'text-current' : 'text-fg-muted',
              textoClassName
            )} text-caption`}
          >
            {texto}
          </span>
        ) : null}
      </span>
    );
  }
);
CargaDeMarca.displayName = 'CargaDeMarca';
