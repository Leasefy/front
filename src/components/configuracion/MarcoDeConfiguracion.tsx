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

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Icon } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  titulo: string;
  subtitulo: string;
  navAria: string;
  menu: GrupoDeEntradas[];
  /** La entrada que corresponde a la URL; `null` = ninguna. */
  activaId: string | null;
  /** Mientras se resuelven permisos: esqueleto en vez de una nav a medias. */
  cargando?: boolean;
  children: React.ReactNode;
}

export function MarcoDeConfiguracion({
  titulo,
  subtitulo,
  navAria,
  menu,
  activaId,
  cargando = false,
  children,
}: MarcoDeConfiguracionProps) {
  const router = useRouter();
  const entradas = menu.flatMap((g) => g.entradas);
  const activa = entradas.find((e) => e.id === activaId) ?? null;

  const irA = (id: string) => {
    const destino = entradas.find((e) => e.id === id);
    if (destino) router.push(destino.href);
  };

  return (
    <div className="p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-h2 text-fg">{titulo}</h1>
        <p className="text-sm text-fg-muted max-w-2xl">{subtitulo}</p>
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <nav aria-label={navAria} className="lg:w-60 lg:shrink-0">
          {/* Celular: la misma lista, en un selector. */}
          <div className="lg:hidden">
            <Select value={activa?.id ?? ''} onValueChange={irA}>
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
          <div className="hidden lg:sticky lg:top-20 lg:block lg:space-y-5">
            {cargando
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="mx-2 h-8 animate-pulse rounded-md bg-surface-muted" />
                ))
              : menu.map((grupo) => (
                  <div key={grupo.id} className="space-y-0.5">
                    <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                      {grupo.label}
                    </p>
                    {grupo.entradas.map((e) => (
                      <EnlaceDeSeccion key={e.id} entrada={e} activa={activa?.id === e.id} />
                    ))}
                  </div>
                ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          {activa && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-fg">{activa.label}</h2>
              <p className="text-sm text-fg-muted">{activa.desc}</p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

function EnlaceDeSeccion({ entrada, activa }: { entrada: EntradaDeConfiguracion; activa: boolean }) {
  const Icono = entrada.icon;
  return (
    <Link
      href={entrada.href}
      aria-current={activa ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
        activa ? 'bg-surface-muted font-medium text-fg' : 'text-fg-muted hover:bg-surface-muted/60 hover:text-fg',
      )}
    >
      <Icono className="h-4 w-4 shrink-0" weight={activa ? 'fill' : 'regular'} />
      <span className="truncate">{entrada.label}</span>
    </Link>
  );
}
