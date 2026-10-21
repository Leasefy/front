'use client';

import Image from 'next/image';
import { CaretDown, CheckCircle, ImageSquare, SpinnerGap, WarningCircle } from '@phosphor-icons/react';

import { fraseDeLoQueFalta, loQueFalta, tituloDe, type InmuebleRapido } from '@/lib/publica/borrador';
import type { FotoGuardada } from '@/lib/publica/fotos-guardadas';
import { cn } from '@/lib/utils';

import { EtiquetaDeOrigen, useVista, type EstadoDeLaTarjeta, type LlegandoALaTarjeta } from './TarjetaDeInmueble';

/**
 * Un inmueble plegado a una línea, para cuando son muchos: la portada, el
 * título, el precio, las fotos y lo que le falta. Tocarla la abre.
 */
export function FilaDeInmueble({
  numero,
  inmueble: i,
  fotos,
  llegando,
  estado,
  repetidaCon,
  mostrarFaltantes,
  alAbrir,
}: {
  numero: number;
  inmueble: InmuebleRapido;
  fotos: FotoGuardada[];
  llegando?: LlegandoALaTarjeta;
  estado: EstadoDeLaTarjeta;
  repetidaCon?: number;
  mostrarFaltantes: boolean;
  alAbrir: () => void;
}) {
  const url = useVista(fotos[0]);
  const faltan = loQueFalta(i, fotos.length);
  const llegan = (llegando?.fotos ?? 0) > 0 || !!llegando?.trayendo;

  let linea: React.ReactNode;
  if (estado.que === 'publicando')
    linea = (
      <span className="inline-flex items-center gap-1.5 text-fg-muted">
        <SpinnerGap className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Publicando…
      </span>
    );
  else if (estado.que === 'publicado')
    linea = (
      <span className="inline-flex items-center gap-1.5 font-medium text-success">
        <CheckCircle size={14} weight="fill" aria-hidden="true" /> Publicado
      </span>
    );
  else if (estado.que === 'fallo')
    linea = (
      <span className="inline-flex items-start gap-1.5 text-danger">
        <WarningCircle size={14} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="line-clamp-2">{estado.motivo}</span>
      </span>
    );
  else if (llegan)
    linea = (
      <span className="inline-flex items-center gap-1.5 text-fg-subtle">
        <SpinnerGap className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        {llegando?.trayendo ? `Trayendo fotos: ${llegando.trayendo.listas} de ${llegando.trayendo.total}` : 'Preparando las fotos…'}
      </span>
    );
  else
    linea = (
      <span className={faltan.length === 0 ? 'text-success' : mostrarFaltantes ? 'text-danger' : 'text-fg-subtle'}>
        {fraseDeLoQueFalta(faltan)}
        {repetidaCon ? <span className="text-warning"> · Misma dirección que el {repetidaCon}</span> : null}
      </span>
    );

  return (
    <button
      type="button"
      onClick={alAbrir}
      className={cn(
        'group flex w-full items-center gap-3.5 rounded-lg border bg-surface p-2.5 pr-4 text-left transition-[border-color,box-shadow] duration-fast hover:border-border-strong hover:shadow-[0_2px_10px_-6px_rgba(20,19,15,0.25)] [contain-intrinsic-size:auto_84px] [content-visibility:auto]',
        estado.que === 'fallo' ? 'border-danger/50' : faltan.length > 0 && mostrarFaltantes && estado.que === 'borrador' ? 'border-danger/30' : 'border-border',
      )}
      data-testid={`fila-inmueble-${numero}`}
      aria-label={`Inmueble ${numero}: ${tituloDe(i)}. Abrir para editar.`}
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-muted">
        {url ? (
          <Image src={url} alt="" fill sizes="64px" className="object-cover" unoptimized />
        ) : (
          <span className="flex size-full items-center justify-center text-fg-placeholder">
            <ImageSquare size={22} aria-hidden="true" />
          </span>
        )}
        {fotos.length > 1 && (
          <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 font-mono text-[10px] text-white">{fotos.length}</span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-[11px] text-fg-subtle">{numero}</span>
          <span className="truncate text-[14.5px] font-medium text-fg">{tituloDe(i)}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px]">
          {i.precio ? (
            <span className="font-mono tabular-nums text-fg-muted">
              $ {i.precio.toLocaleString('es-CO')}
              {i.operacion === 'rent' ? ' / mes' : ''}
            </span>
          ) : null}
          {i.direccion && <span className="truncate text-fg-subtle">{i.direccion}</span>}
          <EtiquetaDeOrigen i={i} sinEnlace />
        </span>
        <span className="mt-1 block text-[12.5px]">{linea}</span>
      </span>
      <CaretDown size={16} className="shrink-0 text-fg-subtle transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
    </button>
  );
}
