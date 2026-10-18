'use client'

/**
 * ThresholdVersionsTable — Phase 34 plan 34-08.
 *
 * Shows the history of threshold versions with a per-row "Restaurar" button
 * that opens a confirmation modal before POSTing the rollback. T-34-08-02
 * mitigation: rollback MUST require explicit user confirmation.
 *
 * If the backend does not expose GET /thresholds/history, the parent passes
 * `supported={false}` and an empty/single-row `versions` — we render the
 * active row only and surface the gap in the SUMMARY.
 *
 * The `is_rollback_of_version` field on a row marks it as a previous
 * rollback (badge "Rollback de v{N}").
 */

import { useState } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react'
import { MonoLabel, Presence } from '@leasefy/cadence'

import type { ThresholdRow } from '@/lib/hooks/cobranza/use-thresholds'
import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TablePagination } from '@/components/ui/pagination'
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination'
import { useUltimoPresente } from '@/lib/hooks/use-ultimo-presente'

/**
 * MORI-23 (QA-AGENTES 16-10): la tabla decía «16/10/2026, 11:02:31», «Por —»
 * siempre y «EDIT» en inglés. El día en palabras con la hora de Colombia,
 * quién la guardó (nombre o correo; nunca su id) y el tipo en español.
 */
export function cuandoSeGuardo(iso: string, locale: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(locale.startsWith('es') ? 'es-CO' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  })
}

export function quienLaGuardo(v: Pick<ThresholdRow, 'created_by_name' | 'created_by_email'>): string {
  return v.created_by_name?.trim() || v.created_by_email?.trim() || '—'
}

export interface ThresholdVersionsTableProps {
  versions: ThresholdRow[]
  supported: boolean
  /** Returns the new row (which now has version = currentMax + 1). */
  onRollback: (version: number) => Promise<{ version: number | null }>
}

export function ThresholdVersionsTable({
  versions,
  supported,
  onRollback,
}: ThresholdVersionsTableProps) {
  const { t, locale } = useI18n()
  const [rollbackConfirmVersion, setRollbackConfirmVersion] = useState<number | null>(null)
  const versionDelDialogo = useUltimoPresente(rollbackConfirmVersion)
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false)
  const [toast, setToast] = useState<string | null>(null)
  /** Un fallo no se pinta en verde: el aviso dice si salió o no. */
  const [toastEsError, setToastEsError] = useState<boolean>(false)

  // currentMax = highest version in the list; new rollback row will be max+1.
  // Se calcula sobre TODAS las versiones, no sobre la página: si mirara sólo la
  // página, la fila «vigente» y el número de la versión nueva del diálogo de
  // rollback cambiarían al pasar de página.
  const currentMax = versions.reduce<number>(
    (acc, v) => (v.version != null && v.version > acc ? v.version : acc),
    0,
  )

  // El historial es append-only: cada edición y cada rollback suman una fila.
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(versions)

  const confirmRollback = async () => {
    if (rollbackConfirmVersion == null) return
    setIsRollingBack(true)
    try {
      const row = await onRollback(rollbackConfirmVersion)
      setToastEsError(false)
      setToast(
        locale.startsWith('es')
          ? `Restaurado a versión ${versionDelDialogo} (ahora vigente como versión ${row.version})`
          : `Rolled back to version ${versionDelDialogo} (now active as version ${row.version})`,
      )
      setRollbackConfirmVersion(null)
    } catch (err) {
      // Antes: «403: {cuerpo crudo}» o «rollback_failed», y en verde.
      setToastEsError(true)
      setToast(
        leerFallo(err).status === 403
          ? 'No tienes permiso para restaurar versiones. Pídeselo a un administrador.'
          : mensajeParaLaPersona(err, {
              porDefecto: 'No pudimos restaurar esa versión.',
              accion: 'restaurar esa versión',
            }),
      )
    } finally {
      setIsRollingBack(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between">
        <MonoLabel className="text-xs text-muted-foreground">
          {t('inmobiliaria.ai.cobranza.reporte.thresholds.versionsHeading')}
        </MonoLabel>
        {!supported && (
          <MonoLabel className="text-[10px] text-warning">
            {locale.startsWith('es') ? 'Sólo versión activa' : 'Active only'}
          </MonoLabel>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {locale.startsWith('es')
            ? 'Todavía no has guardado umbrales: el reporte usa los de siempre.'
            : 'No thresholds saved yet: the report uses the defaults.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto overscroll-contain">
          <Table>
            <TableHeader className="bg-muted/10 border-b border-border">
              <TableRow>
                <TableHead className="text-left px-3 py-2">
                  {locale.startsWith('es') ? 'Versión' : 'Version'}
                </TableHead>
                <TableHead className="text-left px-3 py-2">
                  {locale.startsWith('es') ? 'Creada' : 'Created'}
                </TableHead>
                <TableHead className="text-left px-3 py-2">
                  {locale.startsWith('es') ? 'Por' : 'By'}
                </TableHead>
                <TableHead className="text-left px-3 py-2">
                  {locale.startsWith('es') ? 'Tipo' : 'Type'}
                </TableHead>
                <TableHead className="text-right px-3 py-2" />
              </TableRow>
            </TableHeader>
            {/* Restaurar crea una versión nueva: entra arriba con su animación; paginar hace entrar las filas escalonadas. */}
            <TableBodyAnimado>
              {pageItems.map((v) => {
                const isCurrent = v.version === currentMax
                return (
                  <TableRowAnimada
                    key={`v-${v.version ?? 'null'}-${v.created_at ?? ''}`}
                    className="border-b border-border last:border-0"
                  >
                    <TableCell className="px-3 py-2 font-mono tabular-nums text-foreground">
                      {v.version != null ? `v${v.version}` : '—'}
                      {isCurrent && (
                        <MonoLabel className="ml-2 text-[10px] text-success">
                          {locale.startsWith('es') ? 'vigente' : 'active'}
                        </MonoLabel>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-caption text-muted-foreground">
                      {v.created_at ? cuandoSeGuardo(v.created_at, locale) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-caption text-foreground">
                      {quienLaGuardo(v)}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {v.is_rollback_of_version != null ? (
                        <Badge variant="warning">
                          {locale.startsWith('es')
                            ? `Volvió a la v${v.is_rollback_of_version}`
                            : `Restored v${v.is_rollback_of_version}`}
                        </Badge>
                      ) : (
                        <span className="text-caption text-muted-foreground">
                          {locale.startsWith('es') ? 'Cambio' : 'Edit'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right">
                      {!isCurrent && v.version != null && supported && (
                        <Button
                          variant="outline"
                          size="sm"
                          hideArrow
                          onClick={() => setRollbackConfirmVersion(v.version)}
                          aria-label={
                            locale.startsWith('es') ? `Restaurar la versión ${v.version}` : `Restore version ${v.version}`
                          }
                        >
                          <ArrowCounterClockwise className="w-3 h-3" aria-hidden="true" />
                          {locale.startsWith('es') ? 'Restaurar' : 'Restore'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRowAnimada>
                )
              })}
            </TableBodyAnimado>
          </Table>
          </div>

          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </>
      )}

      {/* Toast */}
      <Presence show={Boolean(toast)}
          role={toastEsError ? 'alert' : 'status'}
          className={
            toastEsError
              ? 'px-4 py-2 border-t border-border bg-danger-soft text-danger'
              : 'px-4 py-2 border-t border-border bg-success-soft text-success'
          }
        >
          {toast}
      </Presence>

      {/* Rollback confirmation. El texto sigue nombrando la versión mientras
          el diálogo se cierra (`versionDelDialogo`). */}
      <AlertDialog
        open={rollbackConfirmVersion !== null}
        onOpenChange={(o) => {
          if (!o && !isRollingBack) setRollbackConfirmVersion(null)
        }}
      >
        <AlertDialogContent variant="confirm" icon={<ArrowCounterClockwise weight="bold" />}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locale.startsWith('es') ? '¿Restaurar versión?' : 'Restore version?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locale.startsWith('es')
                ? `¿Restaurar a la versión ${versionDelDialogo}? Esto creará una nueva versión ${currentMax + 1} con los valores de v${versionDelDialogo}.`
                : `Restore version ${versionDelDialogo}? This will create a new version ${currentMax + 1} with the values from v${versionDelDialogo}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRollingBack}>
              {locale.startsWith('es') ? 'Cancelar' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              loading={isRollingBack}
              onClick={(e) => {
                e.preventDefault()
                void confirmRollback()
              }}
            >
              {isRollingBack
                ? locale.startsWith('es') ? 'Restaurando...' : 'Restoring...'
                : locale.startsWith('es') ? 'Confirmar' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
