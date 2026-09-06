'use client'

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'
import Link from 'next/link'
import { Users, House, CurrencyDollar, HeartStraight, ArrowsClockwise, Warning, CaretRight, FolderOpen } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/empty-state'
import { useRetencionDashboard } from '@/lib/hooks/retencion/use-retencion'
import { formatCop } from '@/lib/data/mock-retencion'
import type { CardTone, DashboardCard } from '@/lib/types/retencion'

const TONE_TEXT: Record<CardTone, string> = {
  default: 'text-fg-muted',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
}

const CARD_ICON: Record<string, Icon> = {
  propietarios_riesgo: Users,
  inmuebles_riesgo: House,
  ingreso_riesgo: CurrencyDollar,
  salud_portafolio: HeartStraight,
  recuperados_mes: ArrowsClockwise,
  renovaciones_criticas: Warning,
}

function KpiCard({ card }: { card: DashboardCard }) {
  const Icon = CARD_ICON[card.key] ?? Users
  const tone = card.tone ?? 'default'
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} weight="duotone" className={TONE_TEXT[tone]} />
        <p className="text-xs text-fg-muted leading-tight">{card.label}</p>
      </div>
      <p className="text-xl font-semibold text-fg mt-1">{card.value}</p>
      {card.hint ? <p className="text-xs text-fg-subtle mt-1">{card.hint}</p> : null}
    </div>
  )
}

export default function RetencionDashboardPage() {
  const { data, isLoading, error, usingMock } = useRetencionDashboard()

  if (isLoading && !data) {
    return (
      <main className="p-6 lg:p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="h-4 w-24 rounded bg-surface-muted animate-pulse mb-3" />
              <div className="h-6 w-16 rounded bg-surface-muted animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-fg">Retención · Laura</h1>
        <p className="text-sm text-fg-muted">
          Detecto propietarios e inmuebles en riesgo de salir del portafolio, explico la causa raíz y propongo qué hacer.
        </p>
        {usingMock ? (
          <AvisoDatosDeEjemplo
            className="mt-3"
            queEsInventado="Los indicadores, los propietarios en riesgo y la comisión en pesos"
            queFalta="El agente de Retención no está desplegado: el microservicio sólo monta el webhook de WhatsApp, no las rutas /api/agency/:id/retencion/*. Sin ellas, el cliente cae al mock de src/lib/data/mock-retencion.ts."
          />
        ) : null}
      </header>

      {data && data.cards.length > 0 ? (
        <section aria-label="Indicadores de retención">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {data.cards.map((c) => (
              <KpiCard key={c.key} card={c} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="Sin datos de portafolio todavía."
          description="Cuando haya propietarios e inmuebles en el portafolio vas a ver acá los indicadores de retención."
        />
      )}

      <section aria-label="Lo más urgente">
        <h2 className="text-base font-semibold text-fg mb-3">Lo más urgente</h2>
        <div className="rounded-lg border border-border divide-y divide-border-faint overflow-hidden">
          {(data?.urgent ?? []).map((u) => (
            <Link
              key={u.caseId}
              href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(u.caseId)}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-surface-hover transition-colors"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-sm font-semibold text-danger">
                {u.score}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{u.ownerName}</p>
                <p className="truncate text-xs text-fg-muted">
                  {u.rootCauseLabel} · {u.nextActionLabel}
                </p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs text-fg-subtle">Comisión en riesgo</p>
                <p className="text-sm font-semibold text-fg">{formatCop(u.expectedCommissionLoss)}</p>
              </div>
              <CaretRight size={16} className="text-fg-subtle shrink-0" />
            </Link>
          ))}
          {(data?.urgent ?? []).length === 0 ? (
            <EmptyState
              icon={HeartStraight}
              title="No hay casos urgentes ahora mismo. 🎉"
              description="Ningún propietario del portafolio quedó priorizado por comisión en riesgo."
            />
          ) : null}
        </div>
      </section>

      {error && !isLoading ? (
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          No pude cargar el dashboard: {error}
        </div>
      ) : null}
    </main>
  )
}
