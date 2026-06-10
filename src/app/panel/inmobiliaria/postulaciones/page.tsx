'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardText, ArrowClockwise } from '@phosphor-icons/react'
import { useAuth } from '@/lib/auth'
import { EmptyState } from '@/components/data-display/EmptyState'
import { cn } from '@/lib/utils'
import {
  fetchFunnelApplications,
  shortApplicationRef,
  VERDICT_CONFIG,
  type FunnelApplication,
} from '@/lib/api/funnel-applications.service'

function formatScoredAt(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PostulacionesPage() {
  const { agency } = useAuth()
  const agencyId = agency?.id
  const [items, setItems] = useState<FunnelApplication[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!agencyId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchFunnelApplications(agencyId, { limit: 50 })
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las postulaciones.')
    } finally {
      setIsLoading(false)
    }
  }, [agencyId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Postulaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Inquilinos que completaron su estudio. Contáctalos para avanzar con el arriendo.
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-24" role="status" aria-label="Cargando postulaciones">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            <ArrowClockwise className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardText}
          title="Aún no hay postulaciones"
          description="Cuando un inquilino complete su estudio, aparecerá aquí con su resultado."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Postulación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Puntaje</th>
                <th className="px-4 py-3">Evaluada</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const v = VERDICT_CONFIG[a.verdict]
                return (
                  <tr key={a.applicationId || a.scoredAt} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-foreground">{shortApplicationRef(a.applicationId)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-medium', v.className)}>
                        {v.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {a.score !== null ? a.score : '—'}
                      {a.level ? <span className="ml-1 text-muted-foreground">· {a.level}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatScoredAt(a.scoredAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
