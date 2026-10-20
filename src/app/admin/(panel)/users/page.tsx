'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { fmtDateTime } from '@/lib/admin/format'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { RestablecerSegundoFactor } from '@/components/admin/RestablecerSegundoFactor'
import { Card, MonoLabel } from '@leasefy/cadence'

// ── Types co-located with the screen (BACK.md §8.21 · FRONT.md §6.29) ────────

interface AdminAction {
  id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  created_at: string
}

/** One admin from ADMIN_EMAILS with audit + Supabase metadata. */
interface AdminEntry {
  email: string
  audit: {
    action_count_30d: number | string
    last_action_at: string | null
  }
  /** Last 25 audit actions for this admin. */
  recent_actions: AdminAction[]
  supabase: {
    exists_in_auth: boolean
    last_sign_in_at: string | null
    created_at: string | null
  }
}

/** GET /api/v1/admin/users (ADMIN-API-CONTRACT.md — Users). */
interface UsersResponse {
  admins: AdminEntry[]
  supabase_error: string | null
}

/** Feed row: an admin's action tagged with its actor email. */
interface FeedRow extends AdminAction {
  actor: string
}

// ── Page ──────────────────────────────────────────────────────────────────────

/** /users — admin roster + audit activity (BACK.md §8.21 · FRONT.md §6.29). */
export default function UsersPage() {
  const { data, isLoading, error } = useApiQuery<UsersResponse>(
    (signal) => adminApi('/users', { signal }),
    [],
  )

  const now = Date.now()
  const admins = data?.admins ?? []

  // Merge every admin's recent_actions into one cross-admin feed (latest 25).
  const feed: FeedRow[] = admins
    .flatMap((a) => (a.recent_actions ?? []).map((act) => ({ ...act, actor: a.email })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 25)

  const rosterColumns: Column<AdminEntry>[] = [
    {
      header: 'Email',
      cell: (r) => {
        const recentlyActive =
          r.audit.last_action_at != null &&
          now - new Date(r.audit.last_action_at).getTime() < 24 * 60 * 60 * 1000
        return (
          <span className="font-medium text-fg">
            {r.email}
            {recentlyActive && (
              <Pill tone="ok" className="ml-2 text-[9px]">activo 24h</Pill>
            )}
          </span>
        )
      },
    },
    {
      header: 'Auth',
      cell: (r) =>
        r.supabase.exists_in_auth ? (
          <Pill tone="ok">existe</Pill>
        ) : (
          <Pill tone="warn">nunca login</Pill>
        ),
    },
    {
      header: 'Última sesión',
      cell: (r) => (
        <span className="font-mono text-caption text-fg-muted">
          {fmtDateTime(r.supabase.last_sign_in_at)}
        </span>
      ),
    },
    {
      header: 'Acciones 30d',
      align: 'right',
      cell: (r) => (
        <span className="tabular-nums font-mono text-caption">
          {Number(r.audit.action_count_30d) || 0}
        </span>
      ),
    },
    {
      header: 'Última acción',
      cell: (r) =>
        r.audit.last_action_at ? (
          <span className="font-mono text-caption text-fg-muted">
            {fmtDateTime(r.audit.last_action_at)}
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
  ]

  const recentColumns: Column<FeedRow>[] = [
    {
      header: 'Cuándo',
      cell: (r) => (
        <span className="font-mono text-caption text-fg-muted">{fmtDateTime(r.created_at)}</span>
      ),
    },
    {
      header: 'Admin',
      cell: (r) => <span className="text-caption">{r.actor}</span>,
    },
    {
      header: 'Acción',
      cell: (r) => <code className="font-mono text-caption">{r.action}</code>,
    },
    {
      header: 'Entidad',
      cell: (r) => (
        <span className="text-caption text-fg-muted">
          {r.entity_type
            ? `${r.entity_type}${r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ''}`
            : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Equipo Leasefy"
        description="Admins en ADMIN_EMAILS + actividad de auditoría. Para agregar o remover admins, editar ADMIN_EMAILS en el env y reiniciar — no hay UI de mutación."
      />

      {data?.supabase_error && (
        <Card className="p-4  mb-6 text-caption text-fg-muted">
          Supabase auth no disponible: <span className="font-mono">{data.supabase_error}</span> —
          las columnas de sesión pueden estar incompletas.
        </Card>
      )}

      <MonoLabel className="block mb-3">
        admins
      </MonoLabel>
      <div className="">
        <DataTable
          columns={rosterColumns}
          rows={admins}
          getKey={(r) => r.email}
          isLoading={isLoading}
          error={error}
          emptyTitle="Sin admins configurados"
          emptyHint="Verificar ADMIN_EMAILS en el env."
        />
      </div>

      {/* Soporte: restablecer el segundo factor de UNA cuenta de la plataforma
          (29-09-2026). Vive acá porque es la pantalla de usuarios del
          backoffice; no hay ficha de usuario de la plataforma. */}
      <div className="">
        <RestablecerSegundoFactor />
      </div>

      <MonoLabel className="block mb-3">
        últimas 25 acciones admin
      </MonoLabel>
      <DataTable
        columns={recentColumns}
        rows={feed}
        getKey={(r) => r.id}
        isLoading={isLoading}
        error={error}
        emptyTitle="Sin acciones registradas"
        emptyHint="Las acciones aparecen cuando un admin aprueba / escala / busca deudores."
      />
    </div>
  )
}
