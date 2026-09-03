'use client'

/**
 * /ai/conciliacion/conexiones — registry of data-source connections.
 *
 * Lets the operator register WHERE reconciliation movements come from (a bank
 * account, a payment gateway, or an uploaded statement source) and see each
 * connection's health (estado + última-sync). Wired to the real build C route:
 *
 *   GET   /api/agency/{id}/conciliacion/connections        (list)
 *   POST  /api/agency/{id}/conciliacion/connections        (register)
 *   PATCH /api/agency/{id}/conciliacion/connections/{id}   (estado / nombre)
 *
 * SECURITY — NO RAW CREDENTIALS. The form NEVER asks for a password / token /
 * apiKey. The only secret-adjacent field is `configRef`: an OPAQUE REFERENCE to
 * where the credential is stored (e.g. a vault path), never the credential
 * itself. The backend mirrors this by construction.
 *
 * FAIL-SOFT (regla de oro): the build C backend may not be deployed → the GET
 * can 404/503. The list degrades to the existing EmptyState (or, post-list, an
 * "aún no hay conexiones" empty), never an error wall. A mutation that fails
 * toasts honestly and leaves the screen as-is.
 *
 * T-323: registering / changing the estado of a connection is an explicit human
 * action — it only fires on a real operator click (form submit / estado select
 * + a confirm), never automatically.
 */

import { useMemo, useState } from 'react'
import { AlertaAccionable } from '@/components/ui/alerta-accionable'
import { toast } from 'sonner'
import { PlugsConnected, Plus } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useI18n } from '@/lib/i18n'
import { useAutoRefresh } from '@/lib/hooks/use-auto-refresh'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedControl, StatusBadge, type SemanticTone } from '@leasefy/cadence'

import {
  useConciliacionConnections,
  CONNECTION_SOURCE_TYPES,
  CONNECTION_STATUSES,
  type ConciliacionConnection,
  type ConnectionSourceType,
  type ConnectionStatus,
} from '@/lib/hooks/conciliacion/use-conciliacion-connections'

// ── Copy (string literal ES — sin keys t() nuevas) ───────────────────────────

const SOURCE_TYPE_LABEL: Record<ConnectionSourceType, string> = {
  banco: 'Banco',
  pasarela: 'Pasarela de pago',
  extracto: 'Extracto',
}

const SOURCE_TYPE_OPTIONS: Array<{ value: ConnectionSourceType; label: string }> =
  CONNECTION_SOURCE_TYPES.map((v) => ({ value: v, label: SOURCE_TYPE_LABEL[v] }))

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  conectado: 'Conectado',
  error: 'Con error',
  desconectado: 'Desconectado',
}

const STATUS_TONE: Record<ConnectionStatus, SemanticTone> = {
  conectado: 'success',
  error: 'critical',
  desconectado: 'neutral',
}

function statusLabel(s: string): string {
  return STATUS_LABEL[s as ConnectionStatus] ?? s
}

function statusTone(s: string): SemanticTone {
  return STATUS_TONE[s as ConnectionStatus] ?? 'neutral'
}

// ── Formatting ───────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null): string {
  if (!iso) return 'Nunca'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// ── Register form ──────────────────────────────────────────────────────────

function RegistrarConexion({
  onCreate,
  disabled,
}: {
  onCreate: (input: {
    sourceType: ConnectionSourceType
    provider: string
    displayName: string
    configRef?: string
  }) => Promise<{ ok: boolean; error?: string }>
  disabled: boolean
}) {
  const [sourceType, setSourceType] = useState<ConnectionSourceType>('banco')
  const [provider, setProvider] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [configRef, setConfigRef] = useState('')
  const [busy, setBusy] = useState(false)

  const canSubmit =
    !disabled && !busy && provider.trim() !== '' && displayName.trim() !== ''

  async function handleSubmit() {
    if (!canSubmit) return
    setBusy(true)
    const res = await onCreate({
      sourceType,
      provider: provider.trim(),
      displayName: displayName.trim(),
      ...(configRef.trim() !== '' ? { configRef: configRef.trim() } : {}),
    })
    setBusy(false)

    if (!res.ok) {
      toast.error(
        res.error === 'not_configured'
          ? 'No se pudo registrar: el servicio no está configurado.'
          : `No se pudo registrar la conexión (${res.error ?? 'error'}).`,
      )
      return
    }
    toast.success('Conexión registrada.')
    // Limpiar el formulario para el siguiente registro.
    setProvider('')
    setDisplayName('')
    setConfigRef('')
    setSourceType('banco')
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-5 space-y-5"
      aria-labelledby="seccion-registrar"
      data-testid="conexiones-registrar"
    >
      <div className="space-y-1">
        <h2 id="seccion-registrar" className="text-base font-semibold text-fg">
          Registrar una conexión
        </h2>
        <p className="text-sm text-fg-muted max-w-2xl">
          Conectá una fuente de movimientos para que la conciliación los atribuya a un origen con
          nombre. No pedimos credenciales: solo una referencia segura a dónde están guardadas.
        </p>
      </div>

      {/* Tipo de fuente — selector excluyente (SegmentedControl, no botones azules) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-fg">Tipo de fuente</Label>
        <SegmentedControl<ConnectionSourceType>
          options={SOURCE_TYPE_OPTIONS}
          value={sourceType}
          onChange={setSourceType}
          aria-label="Tipo de fuente de la conexión"
          disabled={disabled || busy}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="conexion-provider" className="text-sm font-medium text-fg">
            Proveedor
          </Label>
          <Input
            id="conexion-provider"
            placeholder="bancolombia, wompi, bold…"
            maxLength={120}
            value={provider}
            disabled={disabled || busy}
            onChange={(e) => setProvider(e.target.value)}
          />
          <p className="text-xs text-fg-muted">Identificador del banco o pasarela.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="conexion-nombre" className="text-sm font-medium text-fg">
            Nombre visible
          </Label>
          <Input
            id="conexion-nombre"
            placeholder="Cuenta de recaudo Bancolombia"
            maxLength={200}
            value={displayName}
            disabled={disabled || busy}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <p className="text-xs text-fg-muted">Cómo se mostrará en la conciliación.</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="conexion-configref" className="text-sm font-medium text-fg">
          Referencia de credencial <span className="text-fg-muted font-normal">(opcional)</span>
        </Label>
        <Input
          id="conexion-configref"
          placeholder="vault/leasefy/bancolombia-recaudo"
          maxLength={500}
          value={configRef}
          disabled={disabled || busy}
          onChange={(e) => setConfigRef(e.target.value)}
        />
        <p className="text-xs text-fg-muted">
          Referencia segura (p. ej. ruta de bóveda o llave del gestor de secretos). Nunca escribas
          aquí la contraseña, el token ni la API key reales.
        </p>
      </div>

      {/* CTA principal — única acción default de la sección */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <Button
          hideArrow
          disabled={!canSubmit}
          isLoading={busy}
          onClick={() => void handleSubmit()}
          data-testid="conexiones-registrar-submit"
        >
          <Plus className="size-4" aria-hidden="true" />
          Registrar conexión
        </Button>
      </div>
    </section>
  )
}

// ── Connection row ─────────────────────────────────────────────────────────

function ConexionRow({
  item,
  onPatchStatus,
  disabled,
}: {
  item: ConciliacionConnection
  onPatchStatus: (id: string, status: ConnectionStatus) => Promise<void>
  disabled: boolean
}) {
  const [busy, setBusy] = useState(false)

  async function handleStatusChange(next: string) {
    if (next === item.status) return
    setBusy(true)
    await onPatchStatus(item.id, next as ConnectionStatus)
    setBusy(false)
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`conexion-row-${item.id}`}
    >
      {/* Identidad */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-fg truncate">{item.displayName}</p>
          <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-fg-muted">
            {SOURCE_TYPE_LABEL[item.sourceType as ConnectionSourceType] ?? item.sourceType}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-fg-muted">
          <span>{item.provider}</span>
          <span>
            Última sincronización: <span className="tabular-nums">{fmtDateTime(item.lastSyncAt)}</span>
          </span>
        </div>
      </div>

      {/* Estado + cambio de estado (acción humana explícita) */}
      <div className="flex items-center gap-3 shrink-0">
        <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
        <Select
          value={item.status}
          onValueChange={(v) => void handleStatusChange(v)}
          disabled={disabled || busy}
        >
          <SelectTrigger
            className="h-9 w-40"
            aria-label={`Cambiar estado de ${item.displayName}`}
            data-testid={`conexion-estado-${item.id}`}
          >
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {CONNECTION_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

function ConciliacionConexiones() {
  const { t } = useI18n()

  const {
    items,
    isLoading,
    error,
    notAvailable,
    refetch,
    createConnection,
    patchConnection,
  } = useConciliacionConnections()

  useAutoRefresh(refetch)

  // Backend no disponible (404/503) o error de red → no se pueden persistir cambios.
  const backendUnavailable = notAvailable || error !== null

  const handlePatchStatus = async (id: string, status: ConnectionStatus) => {
    const res = await patchConnection(id, { status })
    if (!res.ok) {
      toast.error(
        res.error === 'not_configured'
          ? 'No se pudo actualizar: el servicio no está configurado.'
          : `No se pudo actualizar el estado (${res.error ?? 'error'}).`,
      )
      return
    }
    toast.success('Estado actualizado.')
  }

  const isEmpty = !isLoading && items.length === 0
  const connectedCount = useMemo(
    () => items.filter((i) => i.status === 'conectado').length,
    [items],
  )

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Conexiones</h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            Registrá y administrá las fuentes de movimientos (bancos, pasarelas y extractos) que
            alimentan la conciliación. Nunca guardamos credenciales, solo una referencia segura.
          </p>
        </div>

        {/* KPI: conectadas */}
        <div className="shrink-0 rounded-lg border border-border bg-card px-4 py-3 text-center">
          <p className="text-2xl font-semibold text-fg tabular-nums">
            {isLoading && items.length === 0 ? '—' : connectedCount}
          </p>
          <p className="text-xs text-fg-muted">conectadas</p>
        </div>
      </header>

      {/* Aviso fail-soft: backend no disponible */}
      {!isLoading && backendUnavailable && (
        <AlertaAccionable
          severidad="warning"
          titulo="Las conexiones bancarias no están disponibles en tu cuenta todavía"
          data-testid="conexiones-backend-warning"
        >
          Podés ver el formulario, pero no se puede registrar ni actualizar una conexión hasta que el
          servicio esté activo. Mientras tanto, cargá el extracto del banco a mano desde Cobros.
        </AlertaAccionable>
      )}

      {/* Registrar conexión */}
      <RegistrarConexion onCreate={createConnection} disabled={backendUnavailable} />

      {/* Lista de conexiones */}
      <section className="space-y-3" aria-labelledby="seccion-lista" data-testid="conexiones-lista">
        <div className="flex items-center justify-between gap-3">
          <h2 id="seccion-lista" className="text-base font-semibold text-fg">
            Conexiones registradas
          </h2>
        </div>

        {isLoading && items.length === 0 ? (
          <div className="space-y-2" data-testid="conexiones-loading">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 rounded-lg border border-border bg-surface-muted animate-pulse"
              />
            ))}
          </div>
        ) : isEmpty ? (
          // Fail-soft / vacío: misma superficie EmptyState (sin acción href — el
          // formulario de arriba es el dueño de la acción de registrar).
          <EmptyState
            icon={PlugsConnected}
            title="Aún no hay conexiones"
            description="Registrá tu primera fuente de movimientos en el formulario de arriba para empezar a conciliar."
          />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <ConexionRow
                key={item.id}
                item={item}
                onPatchStatus={handlePatchStatus}
                disabled={backendUnavailable}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default function ConciliacionConexionesPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <ConciliacionConexiones />
    </PageGuard>
  )
}
