'use client'

/**
 * PilotoAutonomia — la autonomía por agente, ESCRIBIBLE.
 *
 * Mismo vocabulario visual que AutonomiaPanel (🌑 sombra / 🤝 copiloto /
 * 🚀 autónomo), pero como segmented control: al elegir un modo hace PUT
 * (optimista + rollback ante error, en use-piloto-autonomia) y toastea.
 *
 * El PUT es de admin (contrato §4) — para quien no es admin los modos se
 * pintan como chips de solo lectura, nunca como botones que fallarían con
 * 403 (regla: ningún control dibujado sin comportamiento). Solo se dibujan
 * los modos que el backend declara en `modosDisponibles`.
 *
 * Fail-soft: un agente sin autonomía publicada (404) no aparece; si ninguno
 * reporta, estado vacío.
 */

import { toast } from 'sonner'
import { SlidersHorizontal } from '@phosphor-icons/react'

import type { AutonomiaModo } from '@/lib/api/piloto'
import { usePilotoAutonomia } from '@/lib/hooks/piloto/use-piloto-autonomia'
import { usePermissionsContext } from '@/lib/context/PermissionsContext'
import { useI18n } from '@/lib/i18n'
import { workspaceVocab } from '@/components/inmobiliaria/ai/ColaHumana'

const NS = 'inmobiliaria.piloto.autonomia'

const MODO_EMOJI: Record<AutonomiaModo, string> = {
  sombra: '🌑',
  copiloto: '🤝',
  autonomo: '🚀',
}

const MODOS: AutonomiaModo[] = ['sombra', 'copiloto', 'autonomo']

export function PilotoAutonomia() {
  const { t } = useI18n()
  const { isAdmin } = usePermissionsContext()
  const { rows, isLoading, error, busyAgente, setModo } = usePilotoAutonomia()

  async function cambiar(agente: (typeof rows)[number]['agente'], modo: AutonomiaModo) {
    const res = await setModo(agente, modo)
    if (res.ok) {
      toast.success(
        t(`${NS}.toastOk`, {
          agente: workspaceVocab(t, 'agente', agente),
          modo: t(`${NS}.modo.${modo}`),
        }),
      )
    } else {
      toast.error(t(`${NS}.toastFail`, { error: res.error ?? 'error' }))
    }
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 lg:p-5 space-y-3"
      data-testid="piloto-autonomia"
    >
      <div className="space-y-0.5">
        <h2 className="text-sm font-semibold text-foreground">{t(`${NS}.titulo`)}</h2>
        <p className="text-xs text-muted-foreground">
          {isAdmin ? t(`${NS}.hint`) : t(`${NS}.soloAdmin`)}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2" data-testid="piloto-autonomia-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div
          className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger"
          data-testid="piloto-autonomia-error"
        >
          {t(`${NS}.error`, { error })}
        </div>
      ) : rows.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 px-4 py-10 text-center"
          data-testid="piloto-autonomia-empty"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-muted">
            <SlidersHorizontal
              weight="duotone"
              className="h-5 w-5 text-fg-subtle"
              aria-hidden="true"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[15px] font-semibold text-fg">{t(`${NS}.vacia`)}</p>
            <p className="text-sm text-fg-subtle">{t(`${NS}.vaciaHint`)}</p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border" data-testid="piloto-autonomia-lista">
          {rows.map((row) => {
            const busy = busyAgente === row.agente
            const modosVisibles = MODOS.filter((m) => row.modosDisponibles.includes(m))
            return (
              <li
                key={row.agente}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 flex-wrap"
                data-testid={`piloto-autonomia-${row.agente}`}
              >
                <span className="text-sm text-foreground min-w-0 truncate">
                  {workspaceVocab(t, 'agente', row.agente)}
                </span>

                {isAdmin ? (
                  <div
                    role="group"
                    aria-label={t(`${NS}.grupoAria`, {
                      agente: workspaceVocab(t, 'agente', row.agente),
                    })}
                    className="inline-flex items-center rounded-full bg-muted p-0.5 ring-1 ring-border shrink-0"
                  >
                    {modosVisibles.map((modo) => {
                      const activo = row.modo === modo
                      return (
                        <button
                          key={modo}
                          type="button"
                          aria-pressed={activo}
                          disabled={busy}
                          title={t(`${NS}.modo.${modo}`)}
                          onClick={() => {
                            if (!activo) void cambiar(row.agente, modo)
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition active:scale-[0.98] disabled:opacity-60 ${
                            activo
                              ? 'bg-surface shadow-sm text-foreground font-medium ring-1 ring-border'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span aria-hidden="true">{MODO_EMOJI[modo]}</span>
                          {t(`${NS}.modo.${modo}`)}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  // Solo lectura para no-admins: chips, nunca botones muertos.
                  <div className="inline-flex items-center gap-1.5 shrink-0">
                    {modosVisibles.map((modo) => {
                      const activo = row.modo === modo
                      return (
                        <span
                          key={modo}
                          aria-current={activo ? 'true' : undefined}
                          className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ring-1 ${
                            activo
                              ? 'bg-primary-soft text-primary ring-primary/30 font-medium'
                              : 'bg-muted text-muted-foreground ring-border'
                          }`}
                        >
                          <span aria-hidden="true">{MODO_EMOJI[modo]}</span>
                          {t(`${NS}.modo.${modo}`)}
                        </span>
                      )
                    })}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
