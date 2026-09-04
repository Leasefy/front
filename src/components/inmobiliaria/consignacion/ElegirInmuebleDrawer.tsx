'use client';

/**
 * ElegirInmuebleDrawer — los inmuebles que YA están en el portafolio y
 * todavía no tienen mandato, con buscador, para elegir uno.
 *
 * ── Por qué existe (Nico, 2026-09-02) ─────────────────────────────────────
 * «Cuando le doy en nueva consignación… preguntarle si quiere asociar a un
 * inmueble nuevo o uno existente; si es existente le muestras en un drawer
 * los que tenemos con un buscador para que pueda decir cuál es.»
 *
 * Antes «Nueva consignación» sólo sabía crear un inmueble desde cero. Quien
 * migró su portafolio por Excel o por enlace ya tiene el inmueble cargado:
 * volver a escribirlo entero es cargarlo dos veces.
 *
 * Sólo lista los que NO tienen mandato (`GET /inmuebles/sin-consignacion`):
 * los que ya tienen uno no se pueden consignar de nuevo, así que ofrecerlos
 * sería ofrecer un error.
 */

import { useMemo, useState } from 'react';
import { MagnifyingGlass, HouseLine, CaretRight } from '@phosphor-icons/react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { InmuebleSinConsignacion } from '@/lib/types/inmobiliaria';

const NS = 'inmobiliaria.consignaciones.elegirInmueble';

/**
 * Busca por lo que la persona tiene a mano: título, dirección, barrio,
 * ciudad y el código del inmueble. Sin acentos y sin importar mayúsculas —
 * escribir «bogota» tiene que encontrar «Bogotá».
 */
export function filtrarInmuebles(
  inmuebles: readonly InmuebleSinConsignacion[],
  consulta: string,
): InmuebleSinConsignacion[] {
  const q = normalizar(consulta);
  if (!q) return [...inmuebles];
  return inmuebles.filter((i) =>
    normalizar(
      [i.propertyTitle, i.propertyAddress, i.propertyZone, i.propertyCity, i.code != null ? `#${i.code}` : '']
        .filter(Boolean)
        .join(' '),
    ).includes(q),
  );
}

function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

export interface ElegirInmuebleDrawerProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  inmuebles: readonly InmuebleSinConsignacion[];
  cargando?: boolean;
  error?: string | null;
  onElegir: (inmueble: InmuebleSinConsignacion) => void;
  /** Lo abre el atajo «no está en la lista» → cae al flujo de inmueble nuevo. */
  onCrearNuevo?: () => void;
}

export function ElegirInmuebleDrawer({
  abierto,
  onOpenChange,
  inmuebles,
  cargando = false,
  error = null,
  onElegir,
  onCrearNuevo,
}: ElegirInmuebleDrawerProps) {
  const { t } = useI18n();
  const [consulta, setConsulta] = useState('');

  const filtrados = useMemo(() => filtrarInmuebles(inmuebles, consulta), [inmuebles, consulta]);

  return (
    <Sheet
      open={abierto}
      onOpenChange={(o) => {
        if (!o) setConsulta('');
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 !p-0 sm:max-w-xl"
        aria-describedby={undefined}
        data-testid="elegir-inmueble-drawer"
      >
        <div className="flex-none border-b border-border px-6 py-5">
          <SheetTitle className="text-lg font-semibold text-fg">{t(`${NS}.titulo`)}</SheetTitle>
          <p className="mt-1 text-sm text-fg-muted">
            {t(`${NS}.subtitulo`, { count: inmuebles.length })}
          </p>
          <div className="relative mt-4">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <Input
              type="search"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder={t(`${NS}.buscar`)}
              aria-label={t(`${NS}.buscar`)}
              className="pl-9"
              data-testid="buscar-inmueble"
              autoFocus
            />
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3"
          data-lenis-prevent
        >
          {cargando ? (
            <div className="flex items-center gap-2 px-3 py-8 text-sm text-fg-muted">
              <Spinner size="sm" /> {t(`${NS}.cargando`)}
            </div>
          ) : error ? (
            <p className="px-3 py-8 text-sm text-danger" role="alert">
              {error}
            </p>
          ) : inmuebles.length === 0 ? (
            <Vacio
              titulo={t(`${NS}.vacio.titulo`)}
              detalle={t(`${NS}.vacio.detalle`)}
              testId="elegir-inmueble-vacio"
            />
          ) : filtrados.length === 0 ? (
            <Vacio
              titulo={t(`${NS}.sinResultados.titulo`, { q: consulta.trim() })}
              detalle={t(`${NS}.sinResultados.detalle`)}
              testId="elegir-inmueble-sin-resultados"
            />
          ) : (
            <ul className="space-y-1" data-testid="elegir-inmueble-lista">
              {filtrados.map((inmueble) => (
                <li key={inmueble.propertyId}>
                  <button
                    type="button"
                    onClick={() => onElegir(inmueble)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    )}
                    data-testid="elegir-inmueble-fila"
                    data-property-id={inmueble.propertyId}
                  >
                    {inmueble.propertyThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto del portal de origen, sin dominio fijo para next/image
                      <img
                        src={inmueble.propertyThumbnail}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-md object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-muted text-fg-subtle">
                        <HouseLine className="h-5 w-5" />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-fg">
                          {inmueble.propertyTitle}
                        </span>
                        {inmueble.code != null && (
                          <span className="shrink-0 font-mono text-[11px] tabular-nums text-fg-subtle">
                            #{inmueble.code}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-fg-muted">
                        {[inmueble.propertyAddress, inmueble.propertyZone, inmueble.propertyCity]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs tabular-nums text-fg-subtle">
                        {/* T-0038 §3.2 — en venta `monthlyRent` es null y el precio vive
                            en `salePrice`. Nunca inventar un canon de $0. */}
                        {inmueble.monthlyRent != null
                          ? `${formatCurrency(inmueble.monthlyRent)}${t(`${NS}.porMes`)}`
                          : inmueble.salePrice
                            ? t(`${NS}.enVenta`, { precio: formatCurrency(inmueble.salePrice) })
                            : t(`${NS}.sinPrecio`)}
                      </span>
                    </span>
                    <CaretRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {onCrearNuevo && (
          <div className="flex-none border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onCrearNuevo}
              className="text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              data-testid="elegir-inmueble-crear-nuevo"
            >
              {t(`${NS}.noEsta`)}
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Vacio({ titulo, detalle, testId }: { titulo: string; detalle: string; testId: string }) {
  return (
    <div className="px-6 py-12 text-center" data-testid={testId}>
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
        <HouseLine className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-fg">{titulo}</p>
      <p className="mt-1 text-sm text-fg-muted">{detalle}</p>
    </div>
  );
}
