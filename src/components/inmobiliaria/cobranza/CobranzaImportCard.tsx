'use client'

/**
 * CobranzaImportCard — control mínimo para "Importar cartera".
 *
 * Cablea el input file + botón a `useCarteraImport` (POST /cartera/import).
 * Se usa en los empty-states de la home de cobranza y del listado de deudores,
 * reemplazando el bloque pasivo "Próximamente".
 *
 * Flujo (T-323 — un click HUMANO explícito del operador):
 *   1. El operador elige el archivo COMO LO TENGA (xlsx, xls, csv, ods): se lee
 *      acá mismo (`lib/importar/leer-planilla.ts`) — 20-10-2026, Nico: «ellos
 *      pueden subir como quieran y deberíamos tomarlo».
 *   2. Ve cómo se leyó (`PreviaDeLaCartera`): columnas cambiables, de dónde
 *      sale el vencimiento (del archivo o del contrato en Leasefy) y las filas
 *      que no se pueden importar, con el porqué.
 *   3. Pulsa «Importar N deudores» → POST JSON `{ rows }` → resumen.
 *
 * 🔴 Antes el archivo se mandaba crudo y el micro lo leía como CSV: un .xlsx
 * daba «Missing required field(s): documentNumber, fullName, phonePrimary» en
 * todas las filas aunque tuviera los tres datos.
 *
 * FAIL-SOFT: si el backend no está desplegado (404 / red caída), el hook degrada
 * a status 'unavailable' y este card dice que la cartera entra sola cada noche
 * sin romper la pantalla. El empty-state que lo envuelve sigue intacto.
 *
 * DS: tokens (sin hex), <Button> del DS, controles rounded-md, una sola acción
 * principal. Copy en español literal (plataforma ES-first).
 */

import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FileArrowUp, WarningCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  useCarteraImport,
  type CarteraImportSummary,
} from '@/lib/hooks/cobranza/use-cartera-import'
import { CrossFade } from '@leasefy/cadence'
import { useTr } from '@/lib/i18n/use-tr'
import { useI18n } from '@/lib/i18n'
import { carteraApi } from '@/lib/api/cartera.service'
import type { CarteraDeInquilinos } from '@/lib/api/cartera.types'
import { leerPlanilla, type PlanillaLeida } from '@/lib/importar/leer-planilla'
import type { Mapeo } from '@/lib/importar/reconocer-columnas'
import {
  armarFilasDeCartera,
  CAMPOS_DE_CARTERA,
  cruzarConLosContratos,
  filaParaElMicro,
  ponerVencimientoEscrito,
  resumenDeLaCartera,
  type CampoDeCartera,
  type FilaDeCartera,
} from '@/lib/cobranza/cartera-del-archivo'
import { PreviaDeLaCartera, type EstadoDelCruce } from './PreviaDeLaCartera'

export interface CobranzaImportCardProps {
  /** Se invoca tras un import exitoso (p.ej. para refrescar la lista/overview). */
  onImported?: (summary: CarteraImportSummary) => void
  className?: string
}

// Lo que se lee en el navegador (SheetJS): Excel nuevo y viejo, CSV/TXT con
// `,` `;` o tab, y OpenDocument.
const ACCEPT =
  '.xlsx,.xls,.csv,.txt,.tsv,.ods,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet'

export function CobranzaImportCard({
  onImported,
  className,
}: CobranzaImportCardProps) {
  const tr = useTr();
  const { formatCurrency } = useI18n()
  const { status, summary, message, importRows, reset } = useCarteraImport()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  const [errorDeLectura, setErrorDeLectura] = useState<string | null>(null)
  const [leida, setLeida] = useState<PlanillaLeida<CampoDeCartera> | null>(null)
  const [mapeo, setMapeo] = useState<Mapeo<CampoDeCartera>>({})
  const [cartera, setCartera] = useState<CarteraDeInquilinos | 'buscando' | 'fallo' | null>(null)
  const [fecha, setFecha] = useState('')
  // Las filas que se mandaron, para nombrar la fila del ARCHIVO en los errores.
  const [enviadas, setEnviadas] = useState<FilaDeCartera[]>([])

  const isUploading = status === 'uploading'

  const leer = async (f: File) => {
    setLeyendo(true)
    setErrorDeLectura(null)
    setLeida(null)
    setFecha('')
    try {
      const r = await leerPlanilla(f, CAMPOS_DE_CARTERA)
      setLeida(r)
      setMapeo(r.mapeo)
    } catch (e) {
      setErrorDeLectura(
        e instanceof Error && e.message
          ? e.message
          : 'No pudimos leer el archivo. Ábrelo en Excel, guárdalo de nuevo y vuelve a subirlo.',
      )
    } finally {
      setLeyendo(false)
    }
  }

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    // Si había un resultado previo, lo limpiamos al elegir otro archivo.
    if (status !== 'idle') reset()
    if (f) void leer(f)
  }

  // Sin vencimiento en el archivo, se busca en los contratos de Leasefy (una vez).
  const faltaElVencimiento = Boolean(leida) && !mapeo.vencimiento
  useEffect(() => {
    if (!faltaElVencimiento || cartera !== null) return
    setCartera('buscando')
    carteraApi
      .inquilinos()
      .then((c) => setCartera(c))
      .catch(() => setCartera('fallo'))
  }, [faltaElVencimiento, cartera])

  const { filas, cruce } = useMemo((): { filas: FilaDeCartera[]; cruce: EstadoDelCruce } => {
    if (!leida) return { filas: [], cruce: { tipo: 'no-hace-falta' } }
    const base = armarFilasDeCartera(leida.filas, mapeo)
    if (mapeo.vencimiento) return { filas: base, cruce: { tipo: 'no-hace-falta' } }
    if (cartera === null || cartera === 'buscando') return { filas: base, cruce: { tipo: 'buscando' } }
    if (cartera === 'fallo') return { filas: ponerVencimientoEscrito(base, fecha), cruce: { tipo: 'fallo' } }
    const r = cruzarConLosContratos(base, cartera)
    return {
      filas: ponerVencimientoEscrito(r.filas, fecha),
      cruce: { tipo: 'listo', encontradas: r.encontradas, sinEncontrar: r.sinEncontrar },
    }
  }, [leida, mapeo, cartera, fecha])

  const resumen = resumenDeLaCartera(filas)
  const listaParaImportar =
    Boolean(leida) && !leyendo && cruce.tipo !== 'buscando' && resumen.seImportan > 0

  const handleImport = async () => {
    if (!listaParaImportar || isUploading) return
    const buenas = filas.filter((f) => f.problemas.length === 0)
    setEnviadas(buenas)
    const result = await importRows(buenas.map(filaParaElMicro))
    if (result) onImported?.(result)
  }

  const handleClear = () => {
    setFile(null)
    setLeida(null)
    setMapeo({})
    setErrorDeLectura(null)
    setFecha('')
    setEnviadas([])
    reset()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      className={
        'rounded-lg border border-border bg-card p-5 max-w-3xl mx-auto ' +
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
          <h2 className="text-base font-medium text-foreground">
            {tr("Importar cartera")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {tr("Sube tu cartera como la tengas, en Excel o CSV: documento, nombre, teléfono y lo que deben. Te mostramos cómo la leímos antes de importar. Se crean o actualizan sin duplicar y no se contacta a nadie al importar.")}
          </p>
          <p className="text-sm text-muted-foreground">
            {tr("Si el archivo no trae la fecha de vencimiento, la tomamos de tus contratos en Leasefy.")}
          </p>
        </div>
      </div>

      {/* Control de subida: input file + acción principal */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Un selector propio: el «Choose File / No file chosen» del navegador
            sale en inglés y con su propio dibujo (Nico, 2026-09-08). */}
        <label
          className={cn(
            'flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-surface px-4 py-2.5 text-sm transition-colors hover:border-fg-muted/40',
            (isUploading || leyendo) && 'pointer-events-none opacity-60',
          )}
          data-testid="importar-cartera-archivo"
        >
          <FileArrowUp className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {file ? (
              <span className="font-medium text-fg">{file.name}</span>
            ) : (
              <span className="text-fg-muted">{tr("Elige el archivo de tu cartera (Excel o CSV)")}</span>
            )}
          </span>
          <span className="shrink-0 text-caption font-medium text-primary">{file ? 'Cambiar' : 'Buscar archivo'}</span>
          {/* allowlist: hidden type=file behind a custom dropzone (playbook file-input allowlist) */}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={handlePick}
            disabled={isUploading}
            aria-label={tr("Elegir el archivo de la cartera")}
            className="sr-only"
          />
        </label>
        <Button
          hideArrow
          onClick={handleImport}
          disabled={!listaParaImportar || isUploading || status === 'done'}
          isLoading={isUploading || leyendo}
          className="shrink-0"
          data-testid="importar-cartera-boton"
        >
          {leida && resumen.seImportan > 0 && status !== 'done'
            ? resumen.seImportan === 1
              ? tr("Importar 1 deudor")
              : tr("Importar {n} deudores", { n: resumen.seImportan })
            : tr("Importar cartera")}
        </Button>
      </div>

      {/* El resultado de la carga cambia con el estado: «listo para subir» →
          error / no disponible / resumen, cada uno entra con su fundido. */}
      <CrossFade swapKey={`${status}-${leyendo ? 'leyendo' : leida ? 'leida' : errorDeLectura ? 'error' : file ? 'archivo' : 'nada'}`}>
      {leyendo && (
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          {tr("Leyendo el archivo…")}
        </p>
      )}
      {errorDeLectura && (
        <div role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {errorDeLectura}
        </div>
      )}
      {leida && !leyendo && status !== 'done' && (
        <>
          <PreviaDeLaCartera
            leida={leida}
            mapeo={mapeo}
            onMapeo={setMapeo}
            filas={filas}
            cruce={cruce}
            fecha={fecha}
            onFecha={setFecha}
          />
          <p className="mt-4 text-sm text-fg" data-testid="previa-resumen">
            {resumen.seImportan === 0
              ? tr("Ninguna fila se puede importar todavía: revisa las columnas de arriba.")
              : tr("Se importan {n} deudores por {plata} · {c} entran a cobranza.", {
                  n: resumen.seImportan,
                  plata: formatCurrency(resumen.deudaTotal),
                  c: resumen.entranACobranza,
                })}
          </p>
        </>
      )}

      {/* Sin el import desplegado (fail-soft). Revisora r27 (bloqueante): antes
          «Próximamente — requiere despliegue del backend». Ahora dice lo cierto y
          qué pasa sin el archivo: la cartera entra sola cada noche. */}
      {status === 'unavailable' && (
        <p
          data-testid="cartera-import-no-disponible"
          className="mt-3 text-sm text-fg-muted"
        >
          {tr("Todavía no puedes subir la cartera desde aquí: entra sola cada noche desde las cuotas vencidas.")}
        </p>
      )}

      {/* Error real (un 4xx, un 5xx, la red) — `message` ya es la frase entera
          del traductor, con el porqué; no rompe la pantalla. */}
      {status === 'error' && (
        <div
          role="alert"
          data-testid="cartera-import-error"
          className="mt-3 rounded-md border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger"
        >
          {message ?? 'No pudimos importar la cartera.'}
        </div>
      )}

      {/* Resumen del import { creados / actualizados / omitidos / errores } */}
      {status === 'done' && summary && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <ImportStat label={tr("Creados")} value={summary.creados} tone="ok" />
            <ImportStat
              label={tr("Actualizados")}
              value={summary.actualizados}
              tone="info"
            />
            <ImportStat
              label={tr("Omitidos")}
              value={summary.omitidos}
              tone={summary.omitidos > 0 ? 'warn' : 'muted'}
            />
          </div>

          <p className="text-caption text-muted-foreground">
            {summary.totalRecibidos} {tr("fila")}
            {summary.totalRecibidos === 1 ? '' : 's'} {tr("recibida")}
            {summary.totalRecibidos === 1 ? '' : 's'}
            {summary.truncado
              ? ' · se procesó solo el límite máximo permitido por archivo'
              : ''}
            {typeof summary.altasAlEmbudo === 'number'
              ? ` · ${summary.altasAlEmbudo} ${
                  summary.altasAlEmbudo === 1 ? 'entró' : 'entraron'
                } a cobranza`
              : ''}
            .
          </p>

          {/* Cómo se leyeron las fechas. Un archivo interpretado al revés corre
              TODOS los vencimientos un mes y eso no se nota en los totales: se
              nota cuando alguien recibe una llamada que no correspondía. */}
          {summary.vencimiento?.columna && !summary.vencimiento.probado && (
            <div className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2">
              <WarningCircle
                className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-warning">
                  {tr("Revisa el formato de las fechas")}
                </p>
                <p className="text-caption text-muted-foreground mt-0.5">
                  {tr("Leímos «")}{summary.vencimiento.columna}{tr("» como")}{' '}
                  {summary.vencimiento.orden === 'dmy'
                    ? 'día/mes/año'
                    : 'mes/día/año'}
                  {tr(", pero ninguna fila lo confirma (todos los días son 12 o menos). Si tu archivo usa el otro orden, los vencimientos quedaron corridos. Para evitarlo, escribe las fechas como AAAA-MM-DD.")}
                </p>
              </div>
            </div>
          )}

          {typeof summary.sinVencimiento === 'number' &&
            summary.sinVencimiento > 0 && (
              <div className="rounded-md bg-warning-soft border border-border p-3 flex items-start gap-2">
                <WarningCircle
                  className="w-5 h-5 text-warning flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-warning">
                    {summary.sinVencimiento} {tr("fila")}
                    {summary.sinVencimiento === 1 ? '' : 's'} {tr("con saldo pero sin fecha de vencimiento")}
                  </p>
                  <p className="text-caption text-muted-foreground mt-0.5">
                    {summary.sinVencimiento === 1 ? 'Entró' : 'Entraron'} {tr("como deudor, pero sin vencimiento no hay días de mora que calcular, así que no")}{' '}
                    {summary.sinVencimiento === 1 ? 'pasa' : 'pasan'} {tr("a cobranza. Vuelve a subir el archivo y escribe desde qué fecha deben.")}
                  </p>
                </div>
              </div>
            )}

          {summary.errores.length > 0 && (
            <details className="rounded-md border border-border bg-surface-muted px-3 py-2.5">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                {summary.errores.length} {tr("fila")}
                {summary.errores.length === 1 ? '' : 's'} {tr("con error")}
              </summary>
              <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {summary.errores.slice(0, 50).map((e) => (
                  <li
                    key={e.rowIndex}
                    className="text-caption text-muted-foreground"
                  >
                    {/* La fila del ARCHIVO, no el índice dentro de lo enviado. */}
                    {tr("Fila")} {enviadas[e.rowIndex]?.fila ?? e.rowIndex + 1}: {e.error}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {summary.creados === 0 &&
            summary.actualizados === 0 &&
            summary.errores.length > 0 &&
            summary.errores[0]?.error?.toLowerCase().includes('migr') && (
              <p className="text-caption text-muted-foreground">
                {tr("La importación aún no está disponible: requiere desplegar la migración del backend.")}
              </p>
            )}

          <Button
            variant="link"
            size="sm"
            hideArrow
            onClick={handleClear}
            className="px-0 h-auto"
          >
            {tr("Importar otro archivo")}
          </Button>
        </div>
      )}
      </CrossFade>
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
      <p className={'text-lg font-medium ' + toneClasses}>{value}</p>
      <p className="text-caption text-muted-foreground">{label}</p>
    </div>
  )
}
