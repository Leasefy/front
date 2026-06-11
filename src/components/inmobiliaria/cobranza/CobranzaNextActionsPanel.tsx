'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, ChatTeardropDots, EnvelopeSimple, CaretDown } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { type CarteraStage, stageColorClasses, stageDisplayName } from '@/lib/cartera'
import type { CarteraOverviewResponse } from '@/lib/hooks/cobranza/use-cartera-overview'

interface CobranzaNextActionsPanelProps {
  actions: CarteraOverviewResponse['nextActions']
  isLoading?: boolean
}

function ChannelIcon({ channel }: { channel: 'voice' | 'whatsapp' | 'email' }) {
  if (channel === 'voice') return <Phone size={14} className="text-violet-500" />
  if (channel === 'whatsapp') return <ChatTeardropDots size={14} className="text-green-500" />
  return <EnvelopeSimple size={14} className="text-indigo-500" />
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function StageBadge({ stage }: { stage: string }) {
  const { locale } = useI18n()
  const validStages: CarteraStage[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'SX']
  const s = stage as CarteraStage
  const isValid = validStages.includes(s)
  const colors = isValid
    ? stageColorClasses(s)
    : { text: 'text-neutral-600 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700' }
  // Human name leads; the S-code stays available via title= (hover/AT).
  const label = isValid ? stageDisplayName(s, locale) : stage
  return (
    <span
      title={stage}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
    >
      {label}
    </span>
  )
}

export function CobranzaNextActionsPanel({ actions, isLoading = false }: CobranzaNextActionsPanelProps) {
  const { t } = useI18n()
  const router = useRouter()

  const top10 = actions.slice(0, 10)

  const emptyState = (
    <div className="py-8 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {t('inmobiliaria.ai.cobranza.overview.nextActions.empty')}
      </p>
      <Link
        href="/panel/inmobiliaria/ai/cobranza/configuracion"
        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1A40FF] text-white hover:opacity-90 active:scale-[0.98] transition"
      >
        {t('inmobiliaria.ai.cobranza.overview.nextActions.configCta')}
      </Link>
    </div>
  )

  const listContent = isLoading ? (
    <div className="space-y-2 p-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      ))}
    </div>
  ) : top10.length === 0 ? (
    emptyState
  ) : (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {top10.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            onClick={() => router.push(`/panel/inmobiliaria/ai/cobranza/deudores/${action.id}`)}
            className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
          >
            <ChannelIcon channel={action.channel} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                {action.debtorNameRedacted}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {formatTime(action.plannedFor)}
              </p>
            </div>
            <StageBadge stage={action.stage} />
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      {/* Flat list — md+ */}
      <div className="hidden md:block rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.cobranza.overview.nextActions.title')}
          </h2>
        </div>
        {listContent}
      </div>

      {/* Accordion — sm */}
      <details className="md:hidden rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] group">
        <summary className="px-5 py-4 cursor-pointer flex items-center justify-between list-none">
          <span className="text-base font-semibold text-neutral-900 dark:text-white">
            {t('inmobiliaria.ai.cobranza.overview.nextActions.title')}
          </span>
          <CaretDown
            size={16}
            className="text-neutral-400 group-open:rotate-180 transition-transform"
          />
        </summary>
        <div className="px-0 pb-4">{listContent}</div>
      </details>
    </>
  )
}
