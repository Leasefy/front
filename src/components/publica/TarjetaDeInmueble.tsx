'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowSquareOut, CaretUp, CheckCircle, FileXls, FolderSimple, ImageSquare, LinkSimple, Plus, SpinnerGap, Trash, WarningCircle, X } from '@phosphor-icons/react';

import { AddressAutocomplete } from '@/components/publicar/AddressAutocomplete';
import { MAX_FOTOS, TIPOS, fraseDeLoQueFalta, loQueFalta, tituloDe, type InmuebleRapido } from '@/lib/publica/borrador';
import type { FotoGuardada } from '@/lib/publica/fotos-guardadas';
import { cn } from '@/lib/utils';

export type EstadoDeLaTarjeta =
  | { que: 'borrador' }
  | { que: 'publicando' }
  | { que: 'publicado'; id: string }
  | { que: 'fallo'; motivo: string; id?: string };

/** Lo que está llegando a la tarjeta: fotos que se preparan o se bajan de un enlace. */
export interface LlegandoALaTarjeta {
  fotos: number;
  /** Bajando las fotos de un enlace o de la celda del Excel. */
  trayendo?: { listas: number; total: number };
}

/**
 * Las miniaturas de las fotos de una tarjeta como URLs del navegador. Se
 * crean sólo para la tarjeta que se ve y se sueltan al irse: con cientos de
 * fotos, pintar los archivos enteros congelaba la página.
 */
export function useVistas(fotos: FotoGuardada[]): Map<string, string> {
  // En un efecto y no en un useMemo: en desarrollo React monta, desmonta y
  // vuelve a montar, y un useMemo se quedaba con URLs ya soltadas
  // (ERR_FILE_NOT_FOUND en cada miniatura).
  const [vistas, setVistas] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    const nuevas = new Map(fotos.map((f) => [f.id, URL.createObjectURL(f.miniatura ?? f.archivo)]));
    setVistas(nuevas);
    return () => nuevas.forEach((u) => URL.revokeObjectURL(u));
  }, [fotos]);
  return vistas;
}

/** La URL de UNA foto (la portada de una fila), con la misma regla. */
export function useVista(foto: FotoGuardada | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!foto) {
      setUrl(null);
      return;
    }
    const nueva = URL.createObjectURL(foto.miniatura ?? foto.archivo);
    setUrl(nueva);
    return () => URL.revokeObjectURL(nueva);
  }, [foto]);
  return url;
}

export function EtiquetaDeOrigen({ i, sinEnlace = false }: { i: InmuebleRapido; sinEnlace?: boolean }) {
  if (!i.origen) return null;
  const Icono = i.origen.tipo === 'enlace' ? LinkSimple : i.origen.tipo === 'excel' ? FileXls : FolderSimple;
  const texto = i.origen.tipo === 'enlace' ? `De ${i.origen.etiqueta}` : i.origen.tipo === 'excel' ? `${i.origen.etiqueta} del Excel` : `Carpeta «${i.origen.etiqueta}»`;
  const clase = 'inline-flex max-w-full items-center gap-1 truncate rounded-full bg-surface-muted px-2 py-0.5 text-[11.5px] text-fg-subtle';
  return i.origen.url && !sinEnlace ? (
    <a href={i.origen.url} target="_blank" rel="noreferrer noopener" className={cn(clase, 'hover:text-fg')}>
      <Icono size={12} aria-hidden="true" />
      <span className="truncate">{texto}</span>
      <ArrowSquareOut size={11} aria-hidden="true" />
    </a>
  ) : (
    <span className={clase}>
      <Icono size={12} aria-hidden="true" />
      <span className="truncate">{texto}</span>
    </span>
  );
}

export function TarjetaDeInmueble({
  numero,
  inmueble: i,
  fotos,
  llegando,
  estado,
  repetidaCon,
  mostrarFaltantes,
  alCambiar,
  alAgregarFotos,
  alQuitarFoto,
  alQuitar,
  alPlegar,
}: {
  numero: number;
  inmueble: InmuebleRapido;
  fotos: FotoGuardada[];
  llegando?: LlegandoALaTarjeta;
  estado: EstadoDeLaTarjeta;
  /** El número de otra tarjeta con la misma dirección. */
  repetidaCon?: number;
  mostrarFaltantes: boolean;
  alCambiar: (p: Partial<InmuebleRapido>) => void;
  alAgregarFotos: (f: File[]) => void;
  alQuitarFoto: (id: string) => void;
  alQuitar?: () => void;
  /** En la lista de muchos: volver a la fila. */
  alPlegar?: () => void;
}) {
  const faltan = loQueFalta(i, fotos.length);
  const entrada = useRef<HTMLInputElement>(null);
  const vistas = useVistas(fotos);
  const bloqueada = estado.que === 'publicando' || estado.que === 'publicado' || !!i.idCreado;
  const fotosBloqueadas = estado.que === 'publicando' || estado.que === 'publicado';
  const [arrastrando, setArrastrando] = useState(false);
  const cuantasLlegan = llegando?.fotos ?? 0;
  const sumar = (lista: FileList | null) => {
    if (!lista) return;
    alAgregarFotos(Array.from(lista));
  };
  const falta = (c: Parameters<typeof faltan.includes>[0]) => mostrarFaltantes && faltan.includes(c);

  return (
    <section
      className={cn(
        'relative rounded-lg border bg-surface p-5 shadow-[0_1px_2px_rgba(20,19,15,0.05)] sm:p-6',
        estado.que === 'fallo' ? 'border-danger/50' : 'border-border',
      )}
      data-testid={`tarjeta-inmueble-${numero}`}
      aria-label={`Inmueble ${numero}`}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">Inmueble {numero}</p>
          <p className="mt-1 truncate text-[16px] font-medium text-fg">{tituloDe(i)}</p>
          {(i.origen || i.codigo) && (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <EtiquetaDeOrigen i={i} />
              {i.codigo && <span className="rounded-full bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-fg-subtle">Código {i.codigo}</span>}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {alQuitar && !bloqueada && (
            <button
              type="button"
              onClick={alQuitar}
              aria-label={`Quitar el inmueble ${numero}`}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border text-fg-subtle hover:text-danger"
            >
              <Trash size={16} aria-hidden="true" />
            </button>
          )}
          {alPlegar && (
            <button
              type="button"
              onClick={alPlegar}
              aria-label={`Plegar el inmueble ${numero}`}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border text-fg-subtle hover:text-fg"
            >
              <CaretUp size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </header>

      <fieldset disabled={bloqueada} className="min-w-0 space-y-5">
        {/* Fotos: arrastrar varias, la primera es la portada. */}
        <div>
          <div
            onDragOver={(e) => {
              if (fotosBloqueadas) return;
              e.preventDefault();
              e.stopPropagation();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              if (fotosBloqueadas) return;
              e.preventDefault();
              e.stopPropagation();
              setArrastrando(false);
              sumar(e.dataTransfer.files);
            }}
            className={cn(
              'rounded-lg border-2 border-dashed p-3 transition-colors duration-fast',
              arrastrando ? 'border-primary bg-primary-soft' : falta('fotos') ? 'border-danger/60' : 'border-border',
            )}
          >
            {fotos.length === 0 && cuantasLlegan === 0 ? (
              <button
                type="button"
                onClick={() => entrada.current?.click()}
                className="flex w-full flex-col items-center gap-2 py-8 text-center"
                data-testid={`fotos-inmueble-${numero}`}
              >
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <ImageSquare size={24} weight="duotone" aria-hidden="true" />
                </span>
                <span className="text-[15px] font-medium text-fg">Arrastra tus fotos o toca para elegirlas</span>
                <span className="text-[13px] text-fg-subtle">Varias a la vez. La primera es la portada.</span>
              </button>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {fotos.map((f, k) => (
                  <div key={f.id} className="group relative aspect-square overflow-hidden rounded-md bg-surface-muted">
                    {vistas.get(f.id) && (
                      <Image src={vistas.get(f.id) as string} alt={`Foto ${k + 1}`} fill sizes="140px" className="object-cover" unoptimized />
                    )}
                    {k === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-white">
                        Portada
                      </span>
                    )}
                    {f.subida && (
                      <span className="absolute bottom-1.5 right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-black/55 text-white" title="Ya subió">
                        <CheckCircle size={14} weight="fill" aria-hidden="true" />
                      </span>
                    )}
                    {!fotosBloqueadas && !f.subida && (
                      <button
                        type="button"
                        onClick={() => alQuitarFoto(f.id)}
                        aria-label={`Quitar la foto ${k + 1}`}
                        className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <X size={12} weight="bold" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                {Array.from({ length: Math.min(cuantasLlegan, MAX_FOTOS - fotos.length) }, (_, k) => (
                  <div key={`llega-${k}`} className="aspect-square animate-pulse rounded-md bg-surface-muted" aria-hidden="true" />
                ))}
                {fotos.length + cuantasLlegan < MAX_FOTOS && !fotosBloqueadas && (
                  <button
                    type="button"
                    onClick={() => entrada.current?.click()}
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-[12px] text-fg-subtle hover:border-primary hover:text-primary disabled:pointer-events-none"
                  >
                    <Plus size={18} aria-hidden="true" />
                    Más
                  </button>
                )}
              </div>
            )}
            {llegando?.trayendo && (
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-fg-subtle" role="status">
                <SpinnerGap className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Trayendo las fotos: {llegando.trayendo.listas} de {llegando.trayendo.total}
              </p>
            )}
            <input
              ref={entrada}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                sumar(e.target.files);
                e.target.value = '';
              }}
              data-testid={`entrada-fotos-${numero}`}
            />
          </div>
        </div>

        {/* Arriendo o venta + tipo */}
        <div className="flex flex-wrap items-center gap-2">
          {(['rent', 'sale'] as const).map((op) => (
            <Pastilla key={op} activa={i.operacion === op} onClick={() => alCambiar({ operacion: op })}>
              {op === 'rent' ? 'Arriendo' : 'Venta'}
            </Pastilla>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          {TIPOS.map((t) => (
            <Pastilla key={t.valor} activa={i.tipo === t.valor} aviso={falta('tipo')} onClick={() => alCambiar({ tipo: t.valor })}>
              {t.nombre}
            </Pastilla>
          ))}
        </div>

        {/* Dirección: con sugerencias; si no hay, se escribe y se pone la ciudad. */}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
          <Campo etiqueta="Dirección" aviso={falta('direccion')}>
            <AddressAutocomplete
              value={i.direccion}
              onChangeText={(t) => alCambiar({ direccion: t, latitud: undefined, longitud: undefined, ubicado: undefined })}
              onSelect={(s) =>
                alCambiar({
                  direccion: s.address,
                  ciudad: s.city || i.ciudad,
                  barrio: s.neighborhood || i.barrio,
                  latitud: s.latitude,
                  longitud: s.longitude,
                  ubicado: 'direccion',
                })
              }
              placeholder="Calle 10 # 43-21"
            />
          </Campo>
          <Campo etiqueta="Ciudad" aviso={falta('ciudad')}>
            <input className={CAMPO} value={i.ciudad} onChange={(e) => alCambiar({ ciudad: e.target.value })} placeholder="Medellín" maxLength={50} data-testid={`ciudad-${numero}`} />
          </Campo>
        </div>
        {(i.ubicado === 'ninguna' || i.ubicado === 'municipio') && !bloqueada && (
          <p className="-mt-2 text-[12.5px] text-fg-subtle" data-testid={`sin-punto-${numero}`}>
            {i.ubicado === 'ninguna'
              ? 'No la encontramos en el mapa: elige una de las sugerencias para que salga ahí.'
              : `En el mapa sale en el centro de ${i.ciudad || 'la ciudad'}: elige una sugerencia para el punto exacto.`}
          </p>
        )}
        {repetidaCon && (
          <p className="-mt-2 flex items-center gap-1.5 text-[12.5px] text-warning" data-testid={`repetida-${numero}`}>
            <WarningCircle size={14} weight="fill" aria-hidden="true" />
            Misma dirección que el inmueble {repetidaCon}. Si es otro apartamento del edificio, agrégale el número.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <Campo etiqueta={i.operacion === 'sale' ? 'Precio de venta' : 'Canon mensual'} aviso={falta('precio')} className="col-span-2 sm:col-span-1">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[15px] text-fg-subtle">$</span>
              <input
                className={cn(CAMPO, 'pl-8 font-mono tabular-nums')}
                inputMode="numeric"
                value={i.precio ? i.precio.toLocaleString('es-CO') : ''}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ''));
                  alCambiar({ precio: Number.isFinite(n) && n > 0 ? Math.min(n, 2_000_000_000) : null });
                }}
                placeholder={i.operacion === 'sale' ? '450.000.000' : '2.500.000'}
                data-testid={`precio-${numero}`}
              />
            </div>
          </Campo>
          <Numero etiqueta="Habitaciones" valor={i.habitaciones} alCambiar={(v) => alCambiar({ habitaciones: v })} max={20} />
          <Numero etiqueta="Baños" valor={i.banos} alCambiar={(v) => alCambiar({ banos: v })} max={20} />
          <Numero etiqueta="Área m²" valor={i.area} alCambiar={(v) => alCambiar({ area: v })} max={100000} />
        </div>

        <Campo etiqueta="Descripción (opcional)">
          <textarea
            className={cn(CAMPO, 'h-auto min-h-[84px] py-3')}
            value={i.descripcion}
            onChange={(e) => alCambiar({ descripcion: e.target.value })}
            maxLength={5000}
            placeholder="Lo que lo hace especial: la luz, la vista, lo cerca que queda de todo…"
          />
          {i.descripcion.trim().length > 0 && i.descripcion.trim().length < 20 && (
            <p className="mt-1 text-[12.5px] text-fg-subtle">Escribe al menos 20 letras para que salga en el aviso.</p>
          )}
        </Campo>
      </fieldset>

      <LineaDeEstado estado={estado} faltan={faltan} mostrarFaltantes={mostrarFaltantes} className="mt-5" />
    </section>
  );
}

const CAMPO =
  'h-12 w-full rounded-md border border-transparent bg-surface-muted/70 px-4 text-base text-fg placeholder:text-fg-placeholder transition-[background-color,border-color,box-shadow] duration-fast focus:border-primary focus:bg-surface focus:shadow-[0_0_0_4px_rgba(26,64,255,0.10)] focus:outline-none md:text-[14px]';

function Campo({ etiqueta, aviso, className, children }: { etiqueta: string; aviso?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className={cn('mb-1.5 block text-[13px] font-medium', aviso ? 'text-danger' : 'text-fg-muted')}>{etiqueta}</span>
      {children}
    </label>
  );
}

function Numero({ etiqueta, valor, alCambiar, max }: { etiqueta: string; valor: number | null; alCambiar: (v: number | null) => void; max: number }) {
  return (
    <Campo etiqueta={etiqueta}>
      <input
        className={cn(CAMPO, 'font-mono tabular-nums')}
        inputMode="numeric"
        value={valor ?? ''}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          alCambiar(e.target.value.trim() === '' || !Number.isFinite(n) ? null : Math.min(n, max));
        }}
        placeholder="—"
      />
    </Campo>
  );
}

export function Pastilla({
  activa,
  aviso,
  onClick,
  children,
  testId,
}: {
  activa: boolean;
  aviso?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      data-testid={testId}
      className={cn(
        'h-9 rounded-full border px-3.5 text-[13.5px] font-medium transition-[background-color,border-color,color] duration-fast active:scale-[0.97]',
        activa ? 'border-primary bg-primary text-primary-fg' : aviso ? 'border-danger/50 bg-surface text-fg-muted' : 'border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

export function LineaDeEstado({
  estado,
  faltan,
  mostrarFaltantes,
  className,
}: {
  estado: EstadoDeLaTarjeta;
  faltan: ReturnType<typeof loQueFalta>;
  mostrarFaltantes: boolean;
  className?: string;
}) {
  if (estado.que === 'publicando')
    return (
      <p className={cn('flex items-center gap-2 text-[14px] text-fg-muted', className)} role="status">
        <SpinnerGap className="h-4 w-4 animate-spin" aria-hidden="true" /> Publicando y subiendo las fotos…
      </p>
    );
  if (estado.que === 'publicado')
    return (
      <p className={cn('flex items-center gap-2 text-[14px] font-medium text-success', className)} role="status">
        <CheckCircle size={18} weight="fill" aria-hidden="true" /> Publicado en el marketplace
      </p>
    );
  if (estado.que === 'fallo')
    return (
      <p className={cn('flex items-start gap-2 text-[14px] text-danger', className)} role="alert">
        <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" /> {estado.motivo}
      </p>
    );
  return (
    <p className={cn('text-[13px]', faltan.length === 0 ? 'text-success' : mostrarFaltantes ? 'text-danger' : 'text-fg-subtle', className)}>
      {fraseDeLoQueFalta(faltan)}
    </p>
  );
}
