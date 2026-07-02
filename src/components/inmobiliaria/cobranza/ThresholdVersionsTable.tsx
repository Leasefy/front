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
import { MonoLabel } from '@leasefy/cadence'

import type { ThresholdRow } from '@/lib/hooks/cobranza/use-thresholds'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false)
  const [toast, setToast] = useState<string | null>(null)

  // currentMax = highest version in the list; new rollback row will be max+1
  const currentMax = versions.reduce<number>(
    (acc, v) => (v.version != null && v.version > acc ? v.version : acc),
    0,
  )

  const confirmRollback = async () => {
    if (rollbackConfirmVersion == null) return
    setIsRollingBack(true)
    try {
      const row = await onRollback(rollbackConfirmVersion)
      setToast(
        locale.startsWith('es')
          ? `Restaurado a versión ${rollbackConfirmVersion} (ahora vigente como versión ${row.version})`
          : `Rolled back to version ${rollbackConfirmVersion} (now active as version ${row.version})`,
      )
      setRollbackConfirmVersion(null)
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'rollback_failed')
    } finally {
      setIsRollingBack(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
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
        <p className="text-sm text-muted-foreground text-center py-6">—</p>
      ) : (
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
          <TableBody>
            {versions.map((v) => {
              const isCurrent = v.version === currentMax
              return (
                <TableRow
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
                  <TableCell className="px-3 py-2 font-mono tabular-nums text-xs text-muted-foreground">
                    {v.created_at ? new Date(v.created_at).toLocaleString(locale) : '—'}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-foreground">
                    {v.created_by_email ?? v.created_by_user_id ?? '—'}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    {v.is_rollback_of_version != null ? (
                      <Badge variant="warning">
                        {locale.startsWith('es')
                          ? `Rollback de v${v.is_rollback_of_version}`
                          : `Rollback of v${v.is_rollback_of_version}`}
                      </Badge>
                    ) : (
                      <MonoLabel className="text-[10px] text-muted-foreground">
                        edit
                      </MonoLabel>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    {!isCurrent && v.version != null && supported && (
                      <Button
                        variant="outline"
                        size="sm"
                        hideArrow
                        onClick={() => setRollbackConfirmVersion(v.version)}
                        aria-label={`rollback v${v.version}`}
                      >
                        <ArrowCounterClockwise className="w-3 h-3" aria-hidden="true" />
                        {locale.startsWith('es') ? 'Restaurar' : 'Restore'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="px-4 py-2 border-t border-border bg-success-soft text-success">
          {toast}
        </div>
      )}

      {/* Rollback confirmation */}
      <AlertDialog
        open={rollbackConfirmVersion !== null}
        onOpenChange={(o) => {
          if (!o && !isRollingBack) setRollbackConfirmVersion(null)
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locale.startsWith('es') ? '¿Restaurar versión?' : 'Restore version?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locale.startsWith('es')
                ? `¿Restaurar a la versión ${rollbackConfirmVersion}? Esto creará una nueva versión ${currentMax + 1} con los valores de v${rollbackConfirmVersion}.`
                : `Restore version ${rollbackConfirmVersion}? This will create a new version ${currentMax + 1} with the values from v${rollbackConfirmVersion}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRollingBack}>
              {locale.startsWith('es') ? 'Cancelar' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isRollingBack}
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
