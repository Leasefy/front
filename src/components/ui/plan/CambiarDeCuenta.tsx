'use client';

import { useState } from 'react';
import { Buildings, Check, House, Key } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { Spinner, enterTransition, usePrefersReducedMotion } from '@leasefy/cadence';
import {
  claveDeLaCuenta,
  opcionesDeCuenta,
  type CuentaElegida,
  type CuentasDeLaPersona,
  type TipoDeCuenta,
} from '@/lib/auth/cuenta-activa';
import { cn } from '@/lib/utils';

const ICONO: Record<TipoDeCuenta, typeof House> = {
  inmobiliaria: Buildings,
  inquilino: House,
  propietario: Key,
};

export interface CambiarDeCuentaProps {
  cuentas: CuentasDeLaPersona;
  /** La cuenta con la que se está en esta pantalla. */
  enPantalla: CuentaElegida | null;
  locale: string;
  /** Guarda la elegida y navega a su inicio (lo hace quien lo monta). */
  onElegir: (cuenta: CuentaElegida) => void;
}

/**
 * «Cambiar de cuenta», dentro del menú del avatar (Nico, 21-10-2026: «un
 * usuario puede ser inquilino de la inmobiliaria y también trabajar en ella…
 * que tenga switch para pasar de una a otra… y eso se puede dar para
 * múltiples más casos»). TODAS las cuentas de la persona en un solo lugar:
 * cada inmobiliaria con su cargo, su cuenta de inquilino y la de propietario.
 * Reemplaza el interruptor de dos lados del 20-10 (que sólo servía para
 * «inquilino + una inmobiliaria»).
 *
 * Sólo se monta con más de una cuenta.
 */
export function CambiarDeCuenta({ cuentas, enPantalla, locale, onElegir }: CambiarDeCuentaProps) {
  const reducido = usePrefersReducedMotion();
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const es = locale !== 'en';
  const opciones = opcionesDeCuenta(cuentas, locale);
  const activa = enPantalla ? claveDeLaCuenta(enPantalla) : null;
  if (opciones.length < 2) return null;

  return (
    <div data-testid="cambiar-de-cuenta" className="px-1.5 pb-1">
      <p
        id="cambiar-de-cuenta-titulo"
        className="px-1.5 pt-1 pb-1.5 text-label text-fg-subtle"
      >
        {es ? 'Cambiar de cuenta' : 'Switch account'}
      </p>
      <div role="radiogroup" aria-labelledby="cambiar-de-cuenta-titulo" className="flex flex-col gap-0.5">
        {opciones.map((o) => {
          const esLaActiva = o.clave === activa;
          const Icono = ICONO[o.tipo];
          const abriendoEsta = abriendo === o.clave;
          return (
            <button
              key={o.clave}
              type="button"
              role="radio"
              aria-checked={esLaActiva}
              data-testid={`cuenta-${o.clave}`}
              disabled={abriendo !== null}
              title={`${o.titulo} · ${o.detalle}`}
              onClick={() => {
                if (esLaActiva || abriendo) return;
                setAbriendo(o.clave);
                onElegir(o.cuenta);
              }}
              className={cn(
                'relative flex w-full min-w-0 items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors',
                'focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-default',
                esLaActiva ? 'cursor-default' : 'hover:bg-surface-muted/60',
              )}
            >
              {esLaActiva && (
                <motion.span
                  layoutId="cuenta-activa"
                  className="absolute inset-0 rounded-md bg-surface-muted"
                  transition={enterTransition(reducido)}
                  aria-hidden="true"
                />
              )}
              {/* El ícono suelto, sin caja (Cadence 2). */}
              <Icono
                className={cn('relative mt-0.5 h-5 w-5 shrink-0', esLaActiva ? 'text-fg' : 'text-fg-muted')}
                aria-hidden="true"
              />
              {/* Hasta dos renglones: el nombre de una inmobiliaria («Prueba RESTO
                  Inmobiliaria S.A.S.») se lee entero, sin agrandar el menú. */}
              <span className="relative min-w-0 flex-1">
                <span className="block line-clamp-2 break-words text-caption font-medium leading-snug text-fg">{o.titulo}</span>
                <span className="block line-clamp-2 break-words text-caption leading-snug text-fg-muted">{o.detalle}</span>
              </span>
              <span className="relative mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {abriendoEsta ? (
                  <Spinner size="sm" label={es ? `Abriendo ${o.titulo}…` : `Opening ${o.titulo}…`} />
                ) : esLaActiva ? (
                  <Check className="h-4 w-4 text-primary" weight="bold" aria-hidden="true" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-px bg-surface-muted mt-2" />
    </div>
  );
}
