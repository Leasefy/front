'use client';

/**
 * El marco de Configuración: encabezado + navegación interna agrupada a la
 * izquierda (un selector en celular) + el título de la sección activa.
 *
 * Nació en la configuración de la inmobiliaria y se sacó acá para que la del
 * inquilino y la del propietario sean LA MISMA pantalla, no una parecida (Nico,
 * 2026-09-15: «tomar el diseño de configuraciones de inmobiliaria llevarlo a
 * estas otras dos plataformas»). Cada panel arma su menú (qué secciones, con qué
 * permisos, en qué URL); este componente sólo lo dibuja.
 */

import { useEffect, useId, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Icon } from '@phosphor-icons/react';
import { CrossFade, MotionIndicator, PageTransition } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import {
  BarraDeGuardado,
  ProveedorDeCambiosPorGuardar,
  usePermisoParaSalir,
} from '@/components/configuracion/cambios-por-guardar';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla';

export interface EntradaDeConfiguracion {
  id: string;
  href: string;
  label: string;
  desc: string;
  icon: Icon;
}

export interface GrupoDeEntradas {
  id: string;
  label: string;
  entradas: EntradaDeConfiguracion[];
}

interface MarcoDeConfiguracionProps {
  /** El sobretítulo del encabezado común (p. ej. «Tu cuenta»). */
  seccion?: string;
  titulo: string;
  subtitulo: string;
  navAria: string;
  menu: GrupoDeEntradas[];
  /** La entrada que corresponde a la URL; `null` = ninguna. */
  activaId: string | null;
  /** Mientras se resuelven permisos: esqueleto en vez de una nav a medias. */
  cargando?: boolean;
  /**
   * Cómo se ven las secciones en el celular. `selector` (la inmobiliaria, con
   * muchas) o `riel`: las mismas filas en una fila horizontal, todas a la vista
   * (las cuentas de persona, con 5 a 8; glow up r26: «el control se ve de una»).
   */
  navEnCelular?: 'selector' | 'riel';
  children: React.ReactNode;
}

/**
 * Con el guardado de Configuración (20-10-2026): una sola barra de «cambios
 * sin guardar» al pie de la sección, ver `cambios-por-guardar.tsx`.
 */
export function MarcoDeConfiguracion(props: MarcoDeConfiguracionProps) {
  return (
    <ProveedorDeCambiosPorGuardar>
      <Marco {...props} />
    </ProveedorDeCambiosPorGuardar>
  );
}

function Marco({
  seccion,
  titulo,
  subtitulo,
  navAria,
  menu,
  activaId,
  cargando = false,
  navEnCelular = 'selector',
  children,
}: MarcoDeConfiguracionProps) {
  const enRiel = navEnCelular === 'riel';
  const navRef = useRef<HTMLElement>(null);
  // En el riel, la sección elegida queda a la vista aunque esté al final.
  useEffect(() => {
    if (!enRiel) return;
    const activa = navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]');
    activa?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [enRiel, activaId]);
  const router = useRouter();
  // La marca de la sección activa se desliza a la nueva (una por marco: el
  // `layoutId` no se cruza con otro marco montado a la vez).
  const indicador = `marco-de-configuracion-${useId()}`;
  const entradas = menu.flatMap((g) => g.entradas);
  const activa = entradas.find((e) => e.id === activaId) ?? null;

  const permisoParaSalir = usePermisoParaSalir();
  const irA = async (id: string) => {
    const destino = entradas.find((e) => e.id === id);
    if (!destino || destino.id === activa?.id) return;
    if (await permisoParaSalir()) router.push(destino.href);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Glow up 22-10: el encabezado común (título de 40 px, una línea), el margen de la casa. */}
      <EncabezadoDePantalla seccion={seccion} titulo={titulo} descripcion={subtitulo} />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <nav ref={navRef} aria-label={navAria} className={cn('lg:w-60 lg:shrink-0', enRiel && 'min-w-0')}>
          {/* Celular: la misma lista, en un selector (o, en el riel, la lista misma). */}
          <div className={cn('lg:hidden', enRiel && 'hidden')}>
            <Select value={activa?.id ?? ''} onValueChange={(id) => void irA(id)}>
              <SelectTrigger aria-label={navAria}>
                <SelectValue placeholder={titulo} />
              </SelectTrigger>
              <SelectContent>
                {menu.map((grupo) => (
                  <SelectGroup key={grupo.id}>
                    <SelectLabel>{grupo.label}</SelectLabel>
                    {grupo.entradas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Escritorio: nav vertical agrupada, pegada al scroll. */}
          {/* Esqueleto → menú con fundido cruzado (los permisos llegan después). */}
          <CrossFade
            swapKey={cargando ? 'cargando' : 'menu'}
            className={cn(
              'lg:sticky lg:top-20 lg:block lg:space-y-5',
              // Riel: una fila que se desliza con el dedo, a sangre en el celular.
              enRiel
                ? // Revisora r27: a 390 se cortaba en «Preferencia|» sin aviso; el borde derecho se desvanece (como el
                  // riel del portal) para que se lea que hay más al deslizar.
                  '-mx-6 flex gap-1 overflow-x-auto px-6 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,#000_82%,transparent)] lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0 lg:[mask-image:none]'
                : 'hidden',
            )}
          >
            {cargando
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="mx-2 h-8 w-24 shrink-0 animate-pulse rounded-md bg-surface-muted lg:w-auto" />
                ))
              : menu.map((grupo) => (
                  <div key={grupo.id} className={cn('space-y-0.5', enRiel && 'flex shrink-0 gap-1 space-y-0 lg:block lg:space-y-0.5')}>
                    <p
                      className={cn(
                        'px-3 pb-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle', // Ronda 30 (revisora r27): el rótulo de la casa en DM Mono (antes mayúsculas en Host Grotesk)
                        enRiel && 'hidden lg:block',
                      )}
                    >
                      {grupo.label}
                    </p>
                    {grupo.entradas.map((e) => (
                      <EnlaceDeSeccion
                        key={e.id}
                        entrada={e}
                        activa={activa?.id === e.id}
                        indicador={indicador}
                      />
                    ))}
                  </div>
                ))}
          </CrossFade>
        </nav>

        {/* Cambiar de sección no remonta el `template.tsx` del panel (el
            segmento de arriba sigue siendo `configuracion`): la sección nueva
            entra aquí, con la misma transición de página. Al llegar a
            Configuración desde otro módulo anima el template y ésta no (nunca
            dos a la vez); la primera pantalla de la sesión no se anima. */}
        <PageTransition
          // La llave sale de la RUTA, no del menú: el menú depende de los
          // permisos, y al llegar no debe remontar la sección ya pintada.
          key={activaId ?? 'sin-seccion'}
          distance="xs"
          duration="base"
          className="min-w-0 flex-1 space-y-4"
        >
          {activa && (
            <div className="space-y-1">
              <h2 className="text-base font-medium text-fg">{activa.label}</h2>
              <p className="text-sm text-fg-muted">{activa.desc}</p>
            </div>
          )}
          {children}
          <BarraDeGuardado />
        </PageTransition>
      </div>
    </div>
  );
}

function EnlaceDeSeccion({
  entrada,
  activa,
  indicador,
}: {
  entrada: EntradaDeConfiguracion;
  activa: boolean;
  indicador: string;
}) {
  const Icono = entrada.icon;
  return (
    <Link
      href={entrada.href}
      aria-current={activa ? 'page' : undefined}
      className={cn(
        'relative isolate flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
        activa ? 'font-medium text-fg' : 'text-fg-muted hover:bg-surface-muted/60 hover:text-fg',
      )}
    >
      {/* El fondo de la activa es la marca que se desliza (mismo color de antes). */}
      {activa && (
        <MotionIndicator
          layoutId={indicador}
          data-indicador-de-la-activa=""
          className="inset-0 -z-10 rounded-md bg-surface-muted"
        />
      )}
      <Icono className="h-4 w-4 shrink-0" weight={activa ? 'fill' : 'regular'} />
      <span className="truncate">{entrada.label}</span>
    </Link>
  );
}
