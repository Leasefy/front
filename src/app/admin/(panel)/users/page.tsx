'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import Link from 'next/link'
import { Alert } from '@leasefy/cadence'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { PestanasDeLaFicha } from '@/components/pantalla/PestanasDeLaFicha'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { fmtDateTime, fmtNumero } from '@/lib/admin/format'
import { accionDelAdmin } from '@/lib/admin/textos-del-admin'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import { RestablecerSegundoFactor } from '@/components/admin/RestablecerSegundoFactor'

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

const UN_DIA = 24 * 60 * 60 * 1000

/** «agency_policy · 48bfa717…» → algo que se lee. */
const ENTIDADES: Record<string, string> = {
  agency_policy: 'Agentes de una inmobiliaria',
  agency: 'Inmobiliaria',
  agency_subscription: 'Plan de una inmobiliaria',
  subscription_plan_config: 'Plan del catálogo',
  plan: 'Plan del catálogo',
  debtor: 'Deudor',
  call: 'Llamada',
  approval: 'Aprobación',
  escalation: 'Escalación',
  notification_template: 'Aviso',
  registration_profile: 'Registro',
  piloto_de_la_inmobiliaria: 'Piloto automático',
  user: 'Cuenta',
}

const SEGMENTOS_DEL_EQUIPO: Segmento<AdminEntry>[] = [
  { valor: 'todos', nombre: 'Todos', cumple: () => true },
  { valor: 'activos', nombre: 'Activos en 30 días', cumple: (a) => Number(a.audit.action_count_30d) > 0 },
  { valor: 'nunca', nombre: 'Nunca han entrado', cumple: (a) => !a.supabase.exists_in_auth },
]

/**
 * /admin/users — el equipo de Leasefy que entra al admin y lo último que hizo
 * (BACK.md §8.21). 20-10-2026: en español, con la tabla de la plataforma y
 * lo que se hizo en palabras («Cambió un plan», no `plan.update`).
 */
export default function UsersPage() {
  const { data, isLoading, error, refetch } = useApiQuery<UsersResponse>(
    (signal) => adminApi('/users', { signal }),
    [],
  )

  const now = Date.now()
  const admins = data?.admins ?? []

  // Lo último de cada persona, en una sola lista (las 25 más recientes de cada una).
  const feed: FeedRow[] = admins
    .flatMap((a) => (a.recent_actions ?? []).map((act) => ({ ...act, actor: a.email })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const activos30 = admins.filter((a) => Number(a.audit.action_count_30d) > 0).length
  const nuncaEntraron = admins.filter((a) => !a.supabase.exists_in_auth).length
  const acciones30 = admins.reduce((n, a) => n + (Number(a.audit.action_count_30d) || 0), 0)

  const rosterColumns: Column<AdminEntry>[] = [
    {
      header: 'Persona',
      orden: (r) => r.email,
      texto: (r) => r.email,
      cell: (r) => {
        const activaHoy = r.audit.last_action_at != null && now - new Date(r.audit.last_action_at).getTime() < UN_DIA
        return (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-fg">{r.email}</span>
            {activaHoy ? <Pill tone="ok" dot>Activa hoy</Pill> : null}
          </div>
        )
      },
    },
    {
      header: 'Cuenta',
      orden: (r) => (r.supabase.exists_in_auth ? 1 : 0),
      texto: (r) => (r.supabase.exists_in_auth ? 'Ya entró' : 'Nunca ha entrado'),
      cell: (r) =>
        r.supabase.exists_in_auth ? <Pill tone="ok">Ya entró</Pill> : <Pill tone="warn">Nunca ha entrado</Pill>,
    },
    {
      header: 'Última sesión',
      orden: (r) => r.supabase.last_sign_in_at,
      ordenPrimero: 'desc',
      texto: (r) => (r.supabase.last_sign_in_at ? fmtDateTime(r.supabase.last_sign_in_at) : ''),
      cell: (r) => <span className="whitespace-nowrap text-caption text-fg-muted">{fmtDateTime(r.supabase.last_sign_in_at)}</span>,
    },
    {
      header: 'Acciones en 30 días',
      align: 'right',
      orden: (r) => Number(r.audit.action_count_30d) || 0,
      ordenPrimero: 'desc',
      texto: (r) => Number(r.audit.action_count_30d) || 0,
      cell: (r) => <span className="tabular-nums text-fg">{fmtNumero(Number(r.audit.action_count_30d) || 0)}</span>,
    },
    {
      header: 'Última acción',
      orden: (r) => r.audit.last_action_at,
      ordenPrimero: 'desc',
      texto: (r) => (r.audit.last_action_at ? fmtDateTime(r.audit.last_action_at) : ''),
      cell: (r) =>
        r.audit.last_action_at ? (
          <span className="whitespace-nowrap text-caption text-fg-muted">{fmtDateTime(r.audit.last_action_at)}</span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
  ]

  const recentColumns: Column<FeedRow>[] = [
    {
      header: 'Qué hizo',
      className: 'min-w-[220px]',
      orden: (r) => accionDelAdmin(r.action),
      texto: (r) => accionDelAdmin(r.action),
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-body-sm text-fg">{accionDelAdmin(r.action)}</div>
          <code className="font-mono text-caption text-fg-subtle">{r.action}</code>
        </div>
      ),
    },
    {
      header: 'Quién',
      orden: (r) => r.actor,
      texto: (r) => r.actor,
      cell: (r) => <span className="text-caption text-fg">{r.actor}</span>,
    },
    {
      header: 'Sobre qué',
      texto: (r) => (r.entity_type ? ENTIDADES[r.entity_type] ?? r.entity_type : ''),
      cell: (r) =>
        r.entity_type ? (
          <div className="min-w-0 text-caption">
            <div className="text-fg-muted">{ENTIDADES[r.entity_type] ?? r.entity_type}</div>
            {r.entity_id ? <code className="font-mono text-fg-subtle">{r.entity_id.slice(0, 8)}</code> : null}
          </div>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Cuándo',
      align: 'right',
      orden: (r) => r.created_at,
      ordenPrimero: 'desc',
      texto: (r) => fmtDateTime(r.created_at),
      cell: (r) => <span className="whitespace-nowrap text-caption text-fg-muted">{fmtDateTime(r.created_at)}</span>,
    },
  ]

  const personas = [...new Set(feed.map((f) => f.actor))]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Equipo Leasefy"
        description="Quiénes entran al admin y lo último que hizo cada persona."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo sumar a alguien" titulo="El equipo del admin" variante="secundario">
            <p className="text-body-sm text-fg-muted">
              Para sumar o quitar a alguien se cambia la lista de admins del servidor y se reinicia. Sin esa lista nadie
              puede entrar al admin.
            </p>
          </ParaEntenderMas>
        }
      />

      {data?.supabase_error ? (
        <Alert variant="warning">No se pudo leer el inicio de sesión de cada persona: las columnas de sesión pueden venir incompletas.</Alert>
      ) : null}

      {/* Glow up 22-10: LA RESPUESTA (cuántas personas entraron en 30 días) en una cifra; las tablas y el segundo
          factor en pestañas. Antes, 4 tarjetas del mismo peso y tres bloques uno debajo del otro. */}
      {data && admins.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Activas en 30 días"
            cifra={`${activos30} de ${admins.length}`}
            contexto={`${acciones30.toLocaleString('es-CO')} ${acciones30 === 1 ? 'acción' : 'acciones'} en 30 días`}
            tramos={[
              { clave: 'activas', etiqueta: 'Hicieron algo en 30 días', monto: activos30, tono: 'exito', cifra: String(activos30), siempre: true },
              { clave: 'nunca', etiqueta: 'Nunca han entrado', monto: nuncaEntraron, tono: 'aviso', cifra: String(nuncaEntraron) },
              {
                clave: 'resto',
                etiqueta: 'Sin hacer nada en 30 días',
                monto: Math.max(0, admins.length - activos30 - nuncaEntraron),
                tono: 'neutro',
                cifra: String(Math.max(0, admins.length - activos30 - nuncaEntraron)),
              },
            ]}
            total={admins.length}
            data-testid="equipo-activas"
          />
        </div>
      ) : null}

      <PestanasDeLaFicha
        etiqueta="Secciones del equipo"
        pestanas={[
          {
            id: 'equipo',
            etiqueta: 'Personas',
            cuenta: data ? admins.length : null,
            contenido: (
      <DataTable
        id="equipo"
        columns={rosterColumns}
        rows={data ? admins : undefined}
        getKey={(r) => r.email}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="No hay nadie en la lista de admins"
        emptyHint="Sin esa lista nadie puede entrar al admin."
        aria-label="Equipo de Leasefy"
        queSon={['persona', 'personas']}
        buscar="Correo"
        segmentos={SEGMENTOS_DEL_EQUIPO}
        ordenInicial={{ columna: 4, sentido: 'desc' }}
        exportar="equipo-leasefy"
      />
            ),
          },
          {
            id: 'acciones',
            etiqueta: 'Lo último que hizo',
            contenido: (
              <div className="space-y-3">
                <p className="text-body-sm text-fg-muted">
                  Lo que aprobó, escaló, buscó o cambió cada persona.{' '}
                  <Link href="/admin/audit-explorer" className="text-fg underline underline-offset-2">
                    Buscar en toda la auditoría
                  </Link>
                </p>
        <DataTable
          id="acciones"
          columns={recentColumns}
          rows={data ? feed : undefined}
          getKey={(r) => r.id}
          isLoading={isLoading}
          error={error}
          onReintentar={refetch}
          emptyTitle="Nadie ha hecho nada todavía"
          emptyHint="Aparece cuando alguien aprueba, escala, busca un deudor o cambia algo."
          aria-label="Lo último que hizo el equipo"
          queSon={['acción', 'acciones']}
          buscar="Qué hizo o quién"
          textoExtra={(r) => `${r.action} ${r.entity_id ?? ''}`}
          segmentos={[
            { valor: 'todos', nombre: 'Todos', cumple: () => true },
            ...personas.map((p) => ({ valor: p, nombre: p.split('@')[0], cumple: (r: FeedRow) => r.actor === p })),
          ]}
          filasPorPagina={10}
          ordenInicial={{ columna: 3, sentido: 'desc' }}
          exportar="acciones-del-equipo"
          masEnElExcel={[
            { header: 'Código', texto: (r) => r.action },
            { header: 'Id', texto: (r) => r.entity_id },
          ]}
        />
              </div>
            ),
          },
          { id: 'segundo-factor', etiqueta: 'Segundo factor', contenido: <RestablecerSegundoFactor /> },
        ]}
      />
    </div>
  )
}
