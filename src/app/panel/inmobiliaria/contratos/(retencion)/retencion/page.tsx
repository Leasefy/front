'use client'

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'
import Link from 'next/link'
import { Users, House, CurrencyDollar, HeartStraight, ArrowsClockwise, Warning, CaretRight, FolderOpen } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useRetencionDashboard } from '@/lib/hooks/retencion/use-retencion'
import { formatCop } from '@/lib/data/mock-retencion'
import type { CardTone, DashboardCard } from '@/lib/types/retencion'

const TONE_TEXT: Record<CardTone, string> = {
  default: 'text-neutral-600 dark:text-neutral-300',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  success: 'text-emerald-600 dark:text-emerald-400',
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
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} weight="duotone" className={TONE_TEXT[tone]} />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">{card.label}</p>
      </div>
      <p className="text-xl font-semibold text-neutral-900 dark:text-white mt-1">{card.value}</p>
      {card.hint ? <p className="text-xs text-neutral-400 mt-1">{card.hint}</p> : null}
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
            <div key={i} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
              <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse mb-3" />
              <div className="h-6 w-16 rounded bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="p-6 lg:p-8 space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Retención · Laura</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700">
          <FolderOpen size={28} weight="duotone" className="text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin datos de portafolio todavía.</p>
        </div>
      )}

      <section aria-label="Lo más urgente">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3">Lo más urgente</h2>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
          {(data?.urgent ?? []).map((u) => (
            <Link
              key={u.caseId}
              href={`/panel/inmobiliaria/contratos/riesgo/${encodeURIComponent(u.caseId)}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/30 text-sm font-semibold text-rose-700 dark:text-rose-300">
                {u.score}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{u.ownerName}</p>
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {u.rootCauseLabel} · {u.nextActionLabel}
                </p>
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs text-neutral-400">Comisión en riesgo</p>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{formatCop(u.expectedCommissionLoss)}</p>
              </div>
              <CaretRight size={16} className="text-neutral-400 shrink-0" />
            </Link>
          ))}
          {(data?.urgent ?? []).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
              No hay casos urgentes ahora mismo. 🎉
            </div>
          ) : null}
        </div>
      </section>

      {error && !isLoading ? (
        <div className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-600 dark:text-rose-400">
          No pude cargar el dashboard: {error}
        </div>
      ) : null}
    </main>
  )
}
