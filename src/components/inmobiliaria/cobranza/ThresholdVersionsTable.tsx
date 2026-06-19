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

import type { ThresholdRow } from '@/lib/hooks/cobranza/use-thresholds'
import { useI18n } from '@/lib/i18n'

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
        <h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
          {t('inmobiliaria.ai.cobranza.reporte.thresholds.versionsHeading')}
        </h2>
        {!supported && (
          <span className="text-[10px] font-mono uppercase text-[#B7791F] dark:text-[#D2992F]">
            {locale.startsWith('es') ? 'Sólo versión activa' : 'Active only'}
          </span>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">—</p>
      ) : (
        <div className="overflow-x-auto overscroll-contain">
        <table className="w-full text-sm">
          <thead className="bg-muted/10 border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {locale.startsWith('es') ? 'Versión' : 'Version'}
              </th>
              <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {locale.startsWith('es') ? 'Creada' : 'Created'}
              </th>
              <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {locale.startsWith('es') ? 'Por' : 'By'}
              </th>
              <th className="text-left px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                {locale.startsWith('es') ? 'Tipo' : 'Type'}
              </th>
              <th className="text-right px-3 py-2 text-xs font-mono uppercase tracking-wide text-muted-foreground" />
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => {
              const isCurrent = v.version === currentMax
              return (
                <tr
                  key={`v-${v.version ?? 'null'}-${v.created_at ?? ''}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2 font-mono tabular-nums text-foreground">
                    {v.version != null ? `v${v.version}` : '—'}
                    {isCurrent && (
                      <span className="ml-2 text-[10px] font-mono uppercase text-[#2C7A53] dark:text-[#3EAE70]">
                        {locale.startsWith('es') ? 'vigente' : 'active'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-xs text-muted-foreground">
                    {v.created_at ? new Date(v.created_at).toLocaleString(locale) : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {v.created_by_email ?? v.created_by_user_id ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    {v.is_rollback_of_version != null ? (
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#F8F0E0] dark:bg-[#B7791F]/15 text-[#B7791F] dark:text-[#D2992F]">
                        {locale.startsWith('es')
                          ? `Rollback de v${v.is_rollback_of_version}`
                          : `Rollback of v${v.is_rollback_of_version}`}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        edit
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!isCurrent && v.version != null && supported && (
                      <button
                        type="button"
                        onClick={() => setRollbackConfirmVersion(v.version)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-sm border border-border hover:bg-muted transition font-medium"
                        aria-label={`rollback v${v.version}`}
                      >
                        <ArrowCounterClockwise className="w-3 h-3" aria-hidden="true" />
                        {locale.startsWith('es') ? 'Restaurar' : 'Restore'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="px-4 py-2 border-t border-border bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-xs font-mono text-[#2C7A53] dark:text-[#3EAE70]">
          {toast}
        </div>
      )}

      {/* Rollback confirmation modal */}
      {rollbackConfirmVersion !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40"
          role="dialog"
          aria-modal="true"
          aria-label="rollbackConfirm"
        >
          <div className="rounded-xl border border-border bg-card max-w-md w-full p-5 space-y-4">
            <h3 className="text-base font-heading text-foreground">
              {locale.startsWith('es') ? '¿Restaurar versión?' : 'Restore version?'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {locale.startsWith('es')
                ? `¿Restaurar a la versión ${rollbackConfirmVersion}? Esto creará una nueva versión ${currentMax + 1} con los valores de v${rollbackConfirmVersion}.`
                : `Restore version ${rollbackConfirmVersion}? This will create a new version ${currentMax + 1} with the values from v${rollbackConfirmVersion}.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRollbackConfirmVersion(null)}
                disabled={isRollingBack}
                className="text-xs px-3 py-1.5 rounded-sm border border-border hover:bg-muted disabled:opacity-50 transition font-medium"
              >
                {locale.startsWith('es') ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => void confirmRollback()}
                disabled={isRollingBack}
                className="text-xs px-3 py-1.5 rounded-sm border border-border bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition font-medium"
              >
                {isRollingBack
                  ? locale.startsWith('es') ? 'Restaurando...' : 'Restoring...'
                  : locale.startsWith('es') ? 'Confirmar' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
