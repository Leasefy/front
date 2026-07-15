'use client'

/**
 * CobranzaImportCard — control mínimo para "Importar cartera".
 *
 * Cablea el input file + botón a `useCarteraImport` (POST /cartera/import).
 * Se usa en los empty-states de la home de cobranza y del listado de deudores,
 * reemplazando el bloque pasivo "Próximamente".
 *
 * Flujo (T-323 — un click HUMANO explícito del operador):
 *   1. El operador elige un archivo CSV (input file).
 *   2. Pulsa "Importar cartera" → POST multipart → resumen.
 *   3. Se muestra { creados / actualizados / omitidos / errores }.
 *
 * FAIL-SOFT: si el backend no está desplegado (404 / red caída), el hook degrada
 * a status 'unavailable' y este card muestra "Próximamente — requiere despliegue"
 * sin romper la pantalla. El empty-state que lo envuelve sigue intacto.
 *
 * DS: tokens (sin hex), <Button> del DS, controles rounded-md, una sola acción
 * principal. Copy en español literal (plataforma ES-first).
 */

import * as React from 'react'
import { useRef, useState } from 'react'
import { FileArrowUp } from '@phosphor-icons/react'
import { Button } from '@/components/ui'
import {
  useCarteraImport,
  type CarteraImportSummary,
} from '@/lib/hooks/cobranza/use-cartera-import'

export interface CobranzaImportCardProps {
  /** Se invoca tras un import exitoso (p.ej. para refrescar la lista/overview). */
  onImported?: (summary: CarteraImportSummary) => void
  className?: string
}

// Extensiones que el operador puede elegir. XLSX se acepta en el picker pero el
// backend solo decodifica CSV → si el archivo no es CSV mostramos la nota.
const ACCEPT = '.csv,.xlsx,text/csv,application/vnd.ms-excel'

export function CobranzaImportCard({
  onImported,
  className,
}: CobranzaImportCardProps) {
  const { status, summary, message, importFile, reset } = useCarteraImport()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const isUploading = status === 'uploading'

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    // Si había un resultado previo, lo limpiamos al elegir otro archivo.
    if (status !== 'idle') reset()
  }

  const handleImport = async () => {
    if (!file || isUploading) return
    const result = await importFile(file)
    if (result) onImported?.(result)
  }

  const handleClear = () => {
    setFile(null)
    reset()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      className={
        'rounded-xl border border-border bg-card p-5 max-w-3xl mx-auto ' +
        (className ?? '')
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
          <FileArrowUp
            className="w-5 h-5 text-primary"
            weight="duotone"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0 space-y-0.5">
          <h2 className="text-base font-semibold text-foreground">
            Importar cartera
          </h2>
          <p className="text-sm text-muted-foreground">
            Sube un archivo CSV con tus deudores (cédula, nombre, teléfono y, si
            tienes, el saldo). Se crean o actualizan sin duplicar. No se contacta
            a nadie al importar.
          </p>
        </div>
      </div>

      {/* Control de subida: input file + acción principal */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handlePick}
          disabled={isUploading}
          aria-label="Elegir archivo CSV de cartera"
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-fg hover:file:bg-surface disabled:opacity-60"
        />
        <Button
          hideArrow
          onClick={handleImport}
          disabled={!file || isUploading}
          isLoading={isUploading}
          className="shrink-0"
        >
          Importar cartera
        </Button>
      </div>

      {file && status === 'idle' && (
        <p className="mt-2 text-xs text-muted-foreground truncate">
          Listo para subir: {file.name}
        </p>
      )}

      {/* Estado "Próximamente" cuando el backend no está desplegado (fail-soft) */}
      {status === 'unavailable' && (
        <div className="mt-3 rounded-md border border-border bg-surface-muted px-3 py-2.5 text-sm text-muted-foreground">
          {message ?? 'Próximamente — requiere despliegue del backend.'}
        </div>
      )}

      {/* Error real (400/401/403/503) — mensaje honesto, no rompe la pantalla */}
      {status === 'error' && (
        <div className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          No se pudo importar: {message ?? 'error desconocido'}
        </div>
      )}

      {/* Resumen del import { creados / actualizados / omitidos / errores } */}
      {status === 'done' && summary && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <ImportStat label="Creados" value={summary.creados} tone="ok" />
            <ImportStat
              label="Actualizados"
              value={summary.actualizados}
              tone="info"
            />
            <ImportStat
              label="Omitidos"
              value={summary.omitidos}
              tone={summary.omitidos > 0 ? 'warn' : 'muted'}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {summary.totalRecibidos} fila
            {summary.totalRecibidos === 1 ? '' : 's'} recibida
            {summary.totalRecibidos === 1 ? '' : 's'}
            {summary.truncado
              ? ' · se procesó solo el límite máximo permitido por archivo'
              : ''}
            .
          </p>

          {summary.errores.length > 0 && (
            <details className="rounded-md border border-border bg-surface-muted px-3 py-2.5">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {summary.errores.length} fila
                {summary.errores.length === 1 ? '' : 's'} con error
              </summary>
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {summary.errores.slice(0, 50).map((e) => (
                  <li
                    key={e.rowIndex}
                    className="text-xs text-muted-foreground"
                  >
                    Fila {e.rowIndex + 1}: {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {summary.creados === 0 &&
            summary.actualizados === 0 &&
            summary.errores.length > 0 &&
            summary.errores[0]?.error?.toLowerCase().includes('migr') && (
              <p className="text-xs text-muted-foreground">
                La importación aún no está disponible: requiere desplegar la
                migración del backend.
              </p>
            )}

          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={handleClear}
            className="px-0 h-auto"
          >
            Importar otro archivo
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Mini-stat reutilizable para el resumen (tints semánticos vía token) ────────

function ImportStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ok' | 'info' | 'warn' | 'muted'
}) {
  const toneClasses =
    tone === 'ok'
      ? 'text-success'
      : tone === 'info'
        ? 'text-primary'
        : tone === 'warn'
          ? 'text-warning'
          : 'text-muted-foreground'
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
      <p className={'text-lg font-semibold ' + toneClasses}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
