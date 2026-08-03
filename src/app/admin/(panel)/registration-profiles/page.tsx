'use client'

import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { ApiError } from '@/lib/admin/api'
import {
  listRegistrationProfiles,
  setRegistrationProfileEnabled,
  type RegistrationProfileAdminRow,
} from '@/lib/admin/registration-profiles'
import {
  REGISTRATION_PROFILES,
  type RegistrationProfileKey,
} from '@/lib/constants/registration-profiles'

// ── Merge helpers ─────────────────────────────────────────────────────────────

interface ProfileRow {
  key: RegistrationProfileKey
  label: string
  description: string
  enabled: boolean
  updated_at: string | null
  updated_by: string | null
}

/**
 * Front metadata (identity + copy) LEFT-joined with the backend state (enabled +
 * audit). Metadata drives the order and existence of rows; the backend only
 * contributes on/off. A profile the backend hasn't seen yet defaults to enabled.
 */
function mergeRows(backend: RegistrationProfileAdminRow[] | undefined): ProfileRow[] {
  const byKey = new Map((backend ?? []).map((r) => [r.key, r]))
  return REGISTRATION_PROFILES.map((meta) => {
    const row = byKey.get(meta.key)
    return {
      key: meta.key,
      label: meta.label,
      description: meta.description,
      enabled: row?.enabled ?? true,
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
    }
  })
}

function fmtWhen(iso: string | null): string {
  if (!iso) return 'nunca'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? 'nunca' : d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  disabled,
  busy,
  onToggle,
}: {
  enabled: boolean
  disabled: boolean
  busy: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled || busy}
      onClick={onToggle}
      className={
        'relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors rounded-none ' +
        'disabled:opacity-40 disabled:cursor-not-allowed ' +
        (enabled ? 'bg-ok/20 border-ok/50' : 'bg-bg-hover border-bg-border-strong')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transition-transform ' +
          (enabled ? 'translate-x-6 bg-ok' : 'translate-x-1 bg-fg-subtle')
        }
      />
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * /registration-profiles — global on/off of the signup profiles (Inquilino /
 * Propietario / Inmobiliaria). Toggling here hides the profile from every
 * signup surface. The backend refuses to disable the last enabled profile;
 * the front guards it too so the UI never sends a doomed request.
 */
export default function RegistrationProfilesPage() {
  const { data, isLoading, error, refetch } = useApiQuery<RegistrationProfileAdminRow[]>(
    (signal) => listRegistrationProfiles(signal),
    [],
  )

  // Optimistic overrides layered on top of the fetched state.
  const [overrides, setOverrides] = useState<Partial<Record<RegistrationProfileKey, boolean>>>({})
  const [busyKey, setBusyKey] = useState<RegistrationProfileKey | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const rows = useMemo(() => {
    return mergeRows(data).map((r) => ({
      ...r,
      enabled: overrides[r.key] ?? r.enabled,
    }))
  }, [data, overrides])

  const enabledCount = rows.filter((r) => r.enabled).length

  async function handleToggle(row: ProfileRow, next: boolean) {
    setActionError(null)

    // Client-side mirror of the backend guard: never disable the last one.
    if (!next && enabledCount <= 1) {
      setActionError('No podés desactivar el último perfil activo. Al menos uno debe quedar habilitado.')
      return
    }

    setBusyKey(row.key)
    setOverrides((o) => ({ ...o, [row.key]: next }))
    try {
      await setRegistrationProfileEnabled(row.key, next)
      refetch()
    } catch (err) {
      // Roll back the optimistic flip and surface the backend message.
      setOverrides((o) => {
        const copy = { ...o }
        delete copy[row.key]
        return copy
      })
      setActionError(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio.')
    } finally {
      setBusyKey(null)
    }
  }

  const notReady = error instanceof ApiError && error.status === 404

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <PageHeader
        label="29 · registration"
        title="Perfiles de registro"
        description="Activa o desactiva los perfiles que un usuario puede elegir al registrarse. Global a toda la plataforma. Un perfil desactivado desaparece del signup; las cuentas existentes no se tocan."
      />

      {/* Endpoint-pending notice (backend not shipped yet) */}
      {notReady && (
        <div className="card p-5 border-l-4 border-l-warn mb-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-warn">
            backend pendiente
          </span>
          <p className="text-sm text-fg mt-2">
            El endpoint <code className="font-mono">GET /registration-profiles</code> todavía no
            existe. Mientras tanto se muestran los perfiles con su estado por defecto (todos
            activos) y los toggles quedan deshabilitados. Ver el contrato en{' '}
            <code className="font-mono">docs/registration-profiles.md</code>.
          </p>
        </div>
      )}

      {/* Load error that is NOT a 404 */}
      {error && !notReady && <div className="mb-6"><ErrorBlock error={error} /></div>}

      {/* Action error (toggle failed / guard) */}
      {actionError && (
        <div className="card p-4 border-l-4 border-l-bad mb-6">
          <p className="text-sm text-bad">{actionError}</p>
        </div>
      )}

      {isLoading ? (
        <LoadingBlock label="cargando perfiles" />
      ) : (
        <div className="space-y-px">
          {rows.map((row) => (
            <div
              key={row.key}
              className="card p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-fg">{row.label}</span>
                  <span className="font-mono text-[10px] text-fg-subtle">{row.key}</span>
                  <Pill tone={row.enabled ? 'ok' : 'muted'}>
                    {row.enabled ? 'activo' : 'inactivo'}
                  </Pill>
                </div>
                <p className="text-[13px] text-fg-muted mt-1">{row.description}</p>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle mt-2">
                  últ. cambio: {fmtWhen(row.updated_at)}
                  {row.updated_by ? ` · ${row.updated_by}` : ''}
                </div>
              </div>

              <Toggle
                enabled={row.enabled}
                disabled={notReady}
                busy={busyKey === row.key}
                onToggle={() => handleToggle(row, !row.enabled)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 border-l-4 border-l-brand text-xs text-fg-muted mt-6">
        <strong>Seguro por diseño.</strong> El signup falla ABIERTO: si el backend de config no
        responde, todos los perfiles quedan visibles para no romper el registro. Desactivar es una
        acción explícita que persiste en el backend con audit_log.
      </div>
    </div>
  )
}
