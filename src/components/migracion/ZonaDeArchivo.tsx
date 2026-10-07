"use client";

/**
 * La zona de arrastre de la migración — UNA cara para los cuatro pasos.
 *
 * Antes cada paso (terceros, libro diario, comprobantes, plan de cuentas)
 * dibujaba la suya con clases casi iguales pero nunca idénticas: distinto
 * padding, distinto radio, el ícono suelto. Cuatro puertas que hacen lo mismo
 * tienen que verse como la misma puerta.
 *
 * Es SOLO presentación: recibe las props de `useDropzone` tal cual y no sabe
 * nada de archivos. El ícono va en círculo gris, como todos los vacíos de la
 * casa (DESIGN.md §11).
 */

import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";
import { FileArrowUp } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export interface ZonaDeArchivoProps {
  /** `getRootProps()` del dropzone del paso. */
  rootProps: DropzoneRootProps;
  /** `getInputProps()` del dropzone del paso. */
  inputProps: DropzoneInputProps;
  /** `isDragActive`: el archivo está encima, a punto de soltarse. */
  activo: boolean;
  /** Primera línea. Dice la acción: «Arrastra el archivo o haz clic para elegirlo». */
  titulo: string;
  /** Segunda línea: qué formato y qué NO va a pasar («Nada se crea todavía»). */
  detalle?: string;
  testid?: string;
  inputTestid?: string;
}

export function ZonaDeArchivo({
  rootProps,
  inputProps,
  activo,
  titulo,
  detalle,
  testid,
  inputTestid,
}: ZonaDeArchivoProps) {
  return (
    <div
      {...rootProps}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-3 rounded-md border border-dashed px-6 py-9 text-center transition-colors",
        activo
          ? "border-primary bg-primary-soft"
          : "border-border-strong bg-surface-muted/50 hover:bg-surface-muted",
      )}
      data-testid={testid}
    >
      {/* allowlist: react-dropzone hidden file input (mecanismo canónico) */}
      <input {...inputProps} data-testid={inputTestid} />
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
          activo ? "bg-surface text-primary" : "bg-surface text-fg-muted shadow-sm",
        )}
      >
        <FileArrowUp className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-fg">{titulo}</p>
        {detalle ? <p className="text-caption text-fg-subtle">{detalle}</p> : null}
      </div>
    </div>
  );
}
