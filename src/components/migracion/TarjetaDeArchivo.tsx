"use client";

import type { DropzoneInputProps } from "react-dropzone";
import { FileXls, Trash, UploadSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

/**
 * El archivo ya subido, como tarjeta — no como zona de arrastre.
 *
 * Antes los seis pasos de la migración dejaban la zona de arrastre puesta
 * después de leer el archivo. Dos problemas reales, los dos vividos por Nico
 * el 2026-09-10:
 *
 *  1. No había forma de QUITAR el archivo. Sólo de reemplazarlo, y sólo si
 *     adivinabas que la zona seguía viva.
 *  2. Al subir otro, el resumen del anterior se quedaba pegado en pantalla:
 *     `onDrop` limpiaba unas cosas y otras no. La tarjeta obliga a que cada
 *     paso tenga un `descartar` explícito que suelte TODO lo derivado — y ese
 *     mismo camino es el que corre al reemplazar.
 *
 * `inputProps` es el input escondido de `react-dropzone`: viaja hasta acá
 * porque `open()` hace `click()` sobre ese ref, y si el input se desmonta
 * junto con la zona de arrastre, «Subir otro» no abre nada.
 */
export interface TarjetaDeArchivoProps {
  /** Nombre del archivo, tal cual lo trae el sistema operativo. */
  nombre: string;
  /** Bytes. `undefined` cuando el paso no guarda el `File` (lectura por trozos). */
  peso?: number;
  /** Segunda línea después del peso: «1.284 filas», «leyendo…». */
  detalle?: string;
  /** El input escondido del dropzone: `getInputProps()`. */
  inputProps: DropzoneInputProps;
  /** `data-testid` del input. Va aparte: `DropzoneInputProps` no lo tipa. */
  inputTestid?: string;
  /** Abre el selector de archivo: el `open` de `useDropzone`. */
  onSubirOtro: () => void;
  /** Suelta el archivo y TODO lo que se derivó de él. */
  onDescartar: () => void;
  /** Mientras se lee o se sube: las dos acciones quedan apagadas. */
  ocupado?: boolean;
  testid?: string;
}

/** Bytes → «184 KB». Un archivo de 0 bytes es un archivo, no «sin peso». */
export function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TarjetaDeArchivo({
  nombre,
  peso,
  detalle,
  inputProps,
  inputTestid,
  onSubirOtro,
  onDescartar,
  ocupado = false,
  testid = "tarjeta-de-archivo",
}: TarjetaDeArchivoProps) {
  const subtitulo = [
    typeof peso === "number" ? pesoLegible(peso) : null,
    detalle || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/60 p-3 sm:flex-row sm:items-center"
      data-testid={testid}
    >
      {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
      <input {...inputProps} data-testid={inputTestid} />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success-soft">
        <FileXls className="h-5 w-5 text-success" weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-medium text-fg"
          title={nombre}
          data-testid={`${testid}-nombre`}
        >
          {nombre}
        </p>
        {subtitulo ? (
          <p className="truncate text-xs text-fg-muted">{subtitulo}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          hideArrow
          disabled={ocupado}
          onClick={onSubirOtro}
          data-testid={`${testid}-otro`}
        >
          <UploadSimple className="mr-1.5 h-4 w-4" />
          Subir otro
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          hideArrow
          disabled={ocupado}
          onClick={onDescartar}
          className="text-destructive hover:text-destructive"
          data-testid={`${testid}-descartar`}
        >
          <Trash className="mr-1.5 h-4 w-4" />
          Descartar
        </Button>
      </div>
    </div>
  );
}
