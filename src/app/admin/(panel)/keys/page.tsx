'use client'

import { adminApi } from '@/lib/admin/api'
import { useApiQuery } from '@/lib/admin/use-api-query'
import { PageHeader } from '@/components/admin/screen/PageHeader'
import { CifraHeroe } from '@/components/pantalla/CifraHeroe'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { DataTable, type Column, type Segmento } from '@/components/admin/screen/DataTable'
import { Pill } from '@/components/admin/Pill'
import type { PillTone } from '@/lib/admin/types'
import { fmtFecha, fmtNumero } from '@/lib/admin/format'

// ── Types co-located with the screen (BACK.md §8.22 + §7.4 · FRONT.md §6.30) ─

/**
 * Status computed by the backend from KEY_ROTATION_DAYS=90 / WARN=14.
 * §7.4: warn when daysLeft ≤ 14, overdue when daysLeft < 0, never when
 * last_rotated_at is null (SAGRILAFT / Ley 2157).
 */
type KeyStatus = 'ok' | 'warn' | 'overdue' | 'never'

/** GET /api/v1/admin/keys row (ADMIN-API-CONTRACT.md — Keys). Never key values. */
/**
 * Cada llave en español (ronda 26, revisora: «Admin allowlist», «The ONLY connection
 * allowed…» salían en inglés). El nombre y las notas del back van al Excel.
 */
const LLAVE: Record<string, { nombre: string; para: string }> = {
  ADMIN_AGENT_DATABASE_URL: { nombre: 'Conexión del admin a la base de los agentes', para: 'La única conexión que el admin usa para leer lo de los agentes.' },
  ADMIN_EMAILS: { nombre: 'Correos que entran al admin', para: 'La lista del equipo de Leasefy que puede abrir este admin.' },
  VAPI_API_KEY: { nombre: 'Llave de Vapi', para: 'Las llamadas de voz de los agentes.' },
  SUPABASE_SERVICE_KEY: { nombre: 'Llave de servicio de Supabase', para: 'Las cuentas y los archivos.' },
  ANTHROPIC_API_KEY: { nombre: 'Llave de Anthropic', para: 'La inteligencia artificial de los agentes.' },
  WOMPI_PUBLIC_KEY: { nombre: 'Llave pública de Wompi', para: 'Los pagos en línea.' },
  KAPSO_API_KEY: { nombre: 'Llave de Kapso', para: 'Los mensajes de WhatsApp.' },
  RESEND_API_KEY: { nombre: 'Llave de Resend', para: 'Los correos que manda Leasefy.' },
  UPSTASH_REDIS_REST_URL: { nombre: 'Dirección de Redis (Upstash)', para: 'Sólo para revisar que la memoria rápida responde. Opcional.' },
  UPSTASH_REDIS_REST_TOKEN: { nombre: 'Llave de Redis (Upstash)', para: 'Sólo para revisar que la memoria rápida responde. Opcional.' },
  REDIS_URL: { nombre: 'Conexión a Redis', para: 'Las colas de tareas en segundo plano.' },
}

function nombreDeLaLlave(r: { env_var: string }): string {
  return LLAVE[r.env_var]?.nombre ?? 'Otra llave'
}

function paraQueSirve(r: { env_var: string }): string {
  return LLAVE[r.env_var]?.para ?? '—'
}

interface KeyRow {
  env_var: string
  label: string
  notes: string | null
  /** ISO date or null if never rotated. */
  last_rotated_at: string | null
  /** Whether process.env[env_var] is set in the backend runtime. */
  env_present: boolean
  status: KeyStatus
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KEY_ROTATION_WARN_DAYS = 14 // KEY_ROTATION_DAYS=90, warn at ≤14 left

/** Lo más urgente primero al ordenar por estado. */
const ORDEN_DEL_ESTADO: Record<KeyStatus, number> = { overdue: 0, never: 1, warn: 2, ok: 3 }

const SEGMENTOS: Segmento<KeyRow>[] = [
  { valor: 'todas', nombre: 'Todas', cumple: () => true },
  { valor: 'atender', nombre: 'Para atender', cumple: (k) => k.status !== 'ok' || !k.env_present },
  { valor: 'al-dia', nombre: 'Al día', cumple: (k) => k.status === 'ok' && k.env_present },
  { valor: 'faltan', nombre: 'Faltan en el servidor', cumple: (k) => !k.env_present },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusTone(s: KeyStatus): PillTone {
  return s === 'ok' ? 'ok' : s === 'warn' ? 'warn' : s === 'overdue' ? 'bad' : 'muted'
}

/** Días de calendario desde una fecha; `null` si nunca se rotó. */
function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) && ms >= 0 ? Math.floor(ms / 86_400_000) : null
}

function statusLabel(s: KeyStatus): string {
  if (s === 'ok') return 'Al día'
  if (s === 'warn') return `Rotar en ${KEY_ROTATION_WARN_DAYS} días o menos`
  if (s === 'overdue') return 'Vencida'
  return 'Nunca rotada'
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * /admin/keys — cuándo se rotó cada llave de un servicio externo (BACK.md §8.22).
 * Nunca muestra el valor de una llave. 19-10-2026: en español y con los estados
 * de carga y error de las demás pantallas.
 */
export default function KeysPage() {
  const { data: keys, isLoading, error, refetch } = useApiQuery<KeyRow[]>(
    (signal) => adminApi('/keys', { signal }),
    [],
  )

  const counts = {
    ok: (keys ?? []).filter((k) => k.status === 'ok').length,
    warn: (keys ?? []).filter((k) => k.status === 'warn').length,
    overdue: (keys ?? []).filter((k) => k.status === 'overdue').length,
    never: (keys ?? []).filter((k) => k.status === 'never').length,
  }

  const columns: Column<KeyRow>[] = [
    {
      header: 'Llave',
      orden: (r) => nombreDeLaLlave(r),
      texto: (r) => nombreDeLaLlave(r),
      cell: (r) => (
        <div>
          <div className="font-medium text-fg">{nombreDeLaLlave(r)}</div>
        </div>
      ),
    },
    {
      header: 'En el servidor',
      orden: (r) => (r.env_present ? 1 : 0),
      texto: (r) => (r.env_present ? 'Puesta' : 'Falta'),
      cell: (r) =>
        r.env_present ? <Pill tone="ok">Puesta</Pill> : <Pill tone="warn">Falta</Pill>,
    },
    {
      header: 'Última rotación',
      orden: (r) => r.last_rotated_at,
      ordenPrimero: 'desc',
      texto: (r) => (r.last_rotated_at ? fmtFecha(r.last_rotated_at) : ''),
      cell: (r) =>
        r.last_rotated_at ? (
          <div>
            <div className="whitespace-nowrap font-mono text-body-sm tabular-nums text-fg">{fmtFecha(r.last_rotated_at)}</div>
            <div className="text-caption text-fg-subtle">
              {(() => {
                const d = daysSince(r.last_rotated_at)
                return d == null ? '' : d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${fmtNumero(d)} días`
              })()}
            </div>
          </div>
        ) : (
          // El estado ya dice «Nunca rotada»: aquí no se repite en rojo.
          <span className="text-caption text-fg-subtle">—</span>
        ),
    },
    {
      header: 'Estado',
      orden: (r) => ORDEN_DEL_ESTADO[r.status],
      texto: (r) => statusLabel(r.status),
      cell: (r) => <Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill>,
    },
    {
      header: 'Para qué sirve',
      texto: (r) => paraQueSirve(r),
      cell: (r) => <span className="text-caption text-fg-muted">{paraQueSirve(r)}</span>,
    },
  ]

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Llaves"
        description="Las llaves de los servicios externos (Vapi, Wompi, Anthropic…) y cuándo se rotaron. Nunca se muestra su valor."
        ayuda={
          <ParaEntenderMas etiqueta="Cómo funciona" titulo="La rotación de las llaves" variante="secundario">
            <div className="space-y-3 text-body-sm text-fg-muted">
              <p>Por la Ley 2157 y SAGRILAFT se rotan cada 90 días; la pantalla avisa cuando faltan {KEY_ROTATION_WARN_DAYS} días o menos.</p>
              <p>El registro vive en el código del servidor: cada rotación se anota ahí y queda en el historial de cambios.</p>
            </div>
          </ParaEntenderMas>
        }
      />

      {/* Glow up 22-10: LA RESPUESTA (cuántas están al día) en una cifra con la barra por estado; antes, 4 tarjetas
          del mismo peso pintadas. */}
      {keys && keys.length > 0 ? (
        <div className="rounded-lg border border-border bg-surface p-5 sm:p-6">
          <CifraHeroe
            rotulo="Llaves al día"
            cifra={`${counts.ok} de ${keys.length}`}
            contexto={counts.overdue > 0 ? `${counts.overdue} ${counts.overdue === 1 ? 'vencida' : 'vencidas'}: hay que rotarlas` : counts.never > 0 ? `${counts.never} nunca se han rotado` : 'todas rotadas a tiempo'}
            tramos={[
              { clave: 'ok', etiqueta: 'Al día', monto: counts.ok, tono: 'exito', cifra: String(counts.ok), siempre: true },
              { clave: 'warn', etiqueta: 'Por rotar pronto', monto: counts.warn, tono: 'aviso', cifra: String(counts.warn) },
              { clave: 'overdue', etiqueta: 'Vencidas', monto: counts.overdue, tono: 'critico', cifra: String(counts.overdue) },
              { clave: 'never', etiqueta: 'Nunca rotadas', monto: counts.never, tono: 'neutro', cifra: String(counts.never) },
            ]}
            total={keys.length}
            data-testid="llaves-al-dia"
          />
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={keys}
        getKey={(r) => r.env_var}
        isLoading={isLoading}
        error={error}
        onReintentar={refetch}
        emptyTitle="No hay llaves registradas"
        emptyHint="El registro de rotaciones del servidor está vacío."
        aria-label="Llaves"
        queSon={['llave', 'llaves']}
        buscar="Nombre de la llave"
        textoExtra={(r) => r.env_var}
        segmentos={SEGMENTOS}
        ordenInicial={{ columna: 3, sentido: 'asc' }}
        exportar="llaves"
        masEnElExcel={[
          { header: 'Variable', texto: (r) => r.env_var },
          { header: 'Nombre en el servidor', texto: (r) => r.label },
          { header: 'Notas del servidor', texto: (r) => r.notes ?? '' },
        ]}
      />

    </div>
  )
}
