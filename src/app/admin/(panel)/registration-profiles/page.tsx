'use client'

import { useMemo, useState } from 'react'
import { Switch } from '@/components/ui/switch'

import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { LoadingBlock, ErrorBlock } from '@/components/admin/screen/states'
import { Pill } from '@/components/admin/Pill'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtFecha } from '@/lib/admin/format'
import { ApiError } from '@/lib/admin/api'
import { mensajeDelAdmin } from '@/lib/admin/errores-del-admin'
import {
  listRegistrationProfiles,
  setRegistrationProfileEnabled,
  type RegistrationProfileAdminRow,
} from '@/lib/admin/registration-profiles'
import {
  REGISTRATION_PROFILES,
  type RegistrationProfileKey,
} from '@/lib/constants/registration-profiles'
import { Alert, Card } from '@leasefy/cadence'

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


// ── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  disabled,
  busy,
  onToggle,
  ariaLabel,
}: {
  enabled: boolean
  disabled: boolean
  busy: boolean
  onToggle: () => void
  ariaLabel: string
}) {
  return (
    <Switch
      checked={enabled}
      disabled={disabled || busy}
      onCheckedChange={() => onToggle()}
      aria-label={ariaLabel}
    />
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
      setActionError('No puedes desactivar el último perfil activo. Al menos uno debe quedar habilitado.')
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
      setActionError(mensajeDelAdmin(err, { accion: 'guardar el cambio', porDefecto: 'No se pudo guardar el cambio.' }))
    } finally {
      setBusyKey(null)
    }
  }

  const notReady = error instanceof ApiError && error.status === 404

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Perfiles de registro"
        description="Qué puede elegir una persona al crear su cuenta en Leasefy: inquilino, propietario o inmobiliaria."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="Los perfiles de registro" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Vale para toda la plataforma. Un perfil apagado deja de aparecer en el registro; las cuentas que ya existen no cambian.</p>
              <p>Siempre queda al menos uno encendido. Si el servidor no responde, el registro muestra los tres para no dejar a nadie por fuera.</p>
              <p>Cada cambio queda guardado y registrado con tu correo.</p>
            </div>
          </ParaEntenderMas>
        }
        junto={
          !isLoading ? (
            <Pill tone="neutral">
              {enabledCount} de {rows.length} abiertos
            </Pill>
          ) : null
        }
      />

      {/* Endpoint-pending notice (backend not shipped yet) */}
      {notReady && (
        <Alert variant="warning" title="Todavía no se puede cambiar desde aquí">
          El servidor todavía no tiene esta función. Se muestran los tres perfiles encendidos, como están por defecto, y
          los interruptores quedan apagados.
        </Alert>
      )}

      {/* Load error that is NOT a 404 */}
      {error && !notReady ? <ErrorBlock error={error} onReintentar={refetch} /> : null}

      {/* Action error (toggle failed / guard) */}
      {actionError && (
        <Alert variant="danger">{actionError}</Alert>
      )}

      {isLoading ? (
        <LoadingBlock label="Cargando los perfiles" />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card className="p-5 flex items-center gap-4" key={row.key}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-body font-medium text-fg">{row.label}</span>
                  <Pill tone={row.enabled ? 'ok' : 'muted'}>
                    {row.enabled ? 'Encendido' : 'Apagado'}
                  </Pill>
                </div>
                <p className="text-body-sm text-fg-muted mt-1">{row.description}</p>
                <p className="mt-2 text-caption text-fg-subtle">
                  {row.updated_at ? `Último cambio: ${fmtFecha(row.updated_at)}` : 'Nadie lo ha cambiado'}
                  {row.updated_by ? ` · ${row.updated_by}` : ''}
                </p>
              </div>

              <Toggle
                enabled={row.enabled}
                disabled={notReady}
                busy={busyKey === row.key}
                onToggle={() => handleToggle(row, !row.enabled)}
                ariaLabel={`Permitir el registro como ${row.label.toLowerCase()}`}
              />
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}
