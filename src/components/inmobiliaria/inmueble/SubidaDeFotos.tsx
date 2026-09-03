'use client';

/**
 * SubidaDeFotos — la zona para traer fotos al inmueble.
 *
 * ── Por qué existe (Nico, 2026-09-02) ─────────────────────────────────────
 * «Mirá eso tan feo, que se deje de una manera más fácil subirlas y más
 * bonita.» El botoncito «Agregar» de 80 px, con un paso extra de «Subir N
 * fotos», no invitaba a nada. Esto es una zona grande donde se sueltan las
 * fotos (o se hace clic, o se pegan del portapapeles) y se suben AL TIRO:
 * elegir ya es subir.
 *
 * Dos formas: `grande` cuando el inmueble no tiene fotos (es lo único que
 * hay que hacer) y `ficha` cuando ya hay galería (una tarjeta más, al final
 * de la grilla). La validación es la misma del back (`validatePropertyPhoto`).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagesSquare, Plus, UploadSimple } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  PROPERTY_PHOTO_ALLOWED_TYPES,
  validatePropertyPhoto,
} from '@/lib/api/property-photos';

export interface SubidaDeFotosProps {
  /** Cuántas fotos más caben. */
  cupo: number;
  /** Cuántas guarda un inmueble en total (para el texto de ayuda). */
  maximo: number;
  /** Archivos válidos, ya recortados al cupo. Nunca se llama con una lista vacía. */
  onArchivos: (archivos: File[]) => void;
  disabled?: boolean;
  variante: 'grande' | 'ficha';
  /** Si está pegado a la ventana, Ctrl/Cmd+V con una imagen en el portapapeles también sube. */
  aceptarPegado?: boolean;
}

/**
 * Separa lo que se puede subir de lo que no, avisa de lo que no, y recorta
 * al cupo. Devuelve `[]` si no queda nada.
 */
export function filtrarFotos(lista: Iterable<File>, cupo: number): File[] {
  const validas: File[] = [];
  const rechazadas: string[] = [];
  for (const archivo of lista) {
    const motivo = validatePropertyPhoto(archivo);
    if (motivo) rechazadas.push(`${archivo.name}: ${motivo}`);
    else validas.push(archivo);
  }
  if (rechazadas.length > 0) {
    toast.error(
      rechazadas.length === 1
        ? 'Una foto no se puede subir'
        : `${rechazadas.length} fotos no se pueden subir`,
      { description: rechazadas.slice(0, 3).join(' · ') },
    );
  }
  if (validas.length > cupo) {
    toast.warning(
      `Sólo caben ${cupo} ${cupo === 1 ? 'foto más' : 'fotos más'}`,
      {
        description: `Se suben las primeras ${cupo}; las otras ${validas.length - cupo} no.`,
      },
    );
  }
  return validas.slice(0, cupo);
}

function traeArchivos(e: React.DragEvent) {
  return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}

export function SubidaDeFotos({
  cupo,
  maximo,
  onArchivos,
  disabled = false,
  variante,
  aceptarPegado = false,
}: SubidaDeFotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const bloqueada = disabled || cupo <= 0;

  const recibir = useCallback(
    (lista: Iterable<File>) => {
      if (bloqueada) return;
      const validas = filtrarFotos(lista, cupo);
      if (validas.length > 0) onArchivos(validas);
    },
    [bloqueada, cupo, onArchivos],
  );

  // Pegar una captura o una imagen copiada. Sólo reacciona si el portapapeles
  // trae ARCHIVOS: pegar texto en un input de la página no pasa por acá.
  useEffect(() => {
    if (!aceptarPegado || bloqueada) return;
    const alPegar = (e: ClipboardEvent) => {
      const archivos = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        PROPERTY_PHOTO_ALLOWED_TYPES.includes(f.type),
      );
      if (archivos.length === 0) return;
      e.preventDefault();
      recibir(archivos);
    };
    document.addEventListener('paste', alPegar);
    return () => document.removeEventListener('paste', alPegar);
  }, [aceptarPegado, bloqueada, recibir]);

  const alSoltar = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastrando(false);
    recibir(e.dataTransfer.files);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={PROPERTY_PHOTO_ALLOWED_TYPES.join(',')}
      multiple
      className="sr-only"
      disabled={bloqueada}
      tabIndex={-1}
      onChange={(e) => {
        recibir(e.target.files ?? []);
        // Para poder volver a elegir el mismo archivo.
        e.target.value = '';
      }}
      data-testid="subida-fotos-input"
    />
  );

  const propsDeArrastre = {
    onDragEnter: (e: React.DragEvent) => {
      if (!traeArchivos(e) || bloqueada) return;
      e.preventDefault();
      setArrastrando(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!traeArchivos(e) || bloqueada) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setArrastrando(false);
    },
    onDrop: alSoltar,
  };

  // El input va AL LADO del botón, no adentro: adentro, «Choose Files: No file
  // chosen» se colaba en el nombre accesible del botón.
  if (variante === 'ficha') {
    return (
      <>
        {input}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={bloqueada}
          {...propsDeArrastre}
          className={cn(
            'flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-fg-muted transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            arrastrando
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border bg-surface-muted/50 hover:border-border-strong hover:bg-surface-muted hover:text-fg',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          aria-label={`Agregar fotos (caben ${cupo} más)`}
          data-testid="subida-fotos-ficha"
          data-arrastrando={arrastrando || undefined}
        >
          <Plus className="h-6 w-6" weight="bold" />
          <span className="text-sm font-medium">Agregar fotos</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-subtle">
            {cupo} {cupo === 1 ? 'lugar' : 'lugares'}
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      {input}
      <div
        role="button"
        tabIndex={bloqueada ? -1 : 0}
        aria-disabled={bloqueada || undefined}
        onClick={() => !bloqueada && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (bloqueada) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        {...propsDeArrastre}
        className={cn(
          'group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          arrastrando
            ? 'border-primary bg-primary-soft'
            : 'border-border bg-surface-muted/40 hover:border-border-strong hover:bg-surface-muted/70',
          bloqueada && 'cursor-not-allowed opacity-60',
        )}
        data-testid="subida-fotos-grande"
        data-arrastrando={arrastrando || undefined}
        aria-label={`Subir fotos: arrastralas acá o elegilas desde tu computador (hasta ${maximo})`}
      >
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full transition-colors',
            arrastrando
              ? 'bg-primary text-primary-fg'
              : 'bg-surface text-fg-muted shadow-sm group-hover:text-primary',
          )}
          aria-hidden
        >
          {arrastrando ? (
            <UploadSimple className="h-7 w-7" weight="bold" />
          ) : (
            <ImagesSquare className="h-7 w-7" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold text-fg">
            {arrastrando ? 'Soltá las fotos acá' : 'Arrastrá las fotos acá'}
          </p>
          <p className="text-sm text-fg-muted">
            o{' '}
            <span className="font-medium text-primary underline-offset-2 group-hover:underline">
              elegilas desde tu computador
            </span>
            {aceptarPegado && <>, o pegalas con Ctrl+V</>}
          </p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-subtle">
          Hasta {maximo} fotos · JPG, PNG o WebP · 5 MB cada una
        </p>
      </div>
    </>
  );
}
