'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Phone, ChatTeardropDots, EnvelopeSimple, CaretDown } from '@phosphor-icons/react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { type CarteraStage, stageColorClasses, stageDisplayName } from '@/lib/cartera'
import type { CarteraOverviewResponse } from '@/lib/hooks/cobranza/use-cartera-overview'

interface CobranzaNextActionsPanelProps {
  actions: CarteraOverviewResponse['nextActions']
  isLoading?: boolean
}

function ChannelIcon({ channel }: { channel: 'voice' | 'whatsapp' | 'email' }) {
  if (channel === 'voice') return <Phone size={14} className="text-fg-muted" />
  if (channel === 'whatsapp') return <ChatTeardropDots size={14} className="text-success" />
  return <EnvelopeSimple size={14} className="text-primary" />
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
    : { text: 'text-fg-muted', bg: 'bg-surface-muted', border: 'border-border' }
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

  // El vacío decía «Ajustar cadencia de contacto» y llevaba a Configuración.
  // Esa sección ya no existe: cuándo y por qué canal habla el agente lo define
  // Leasefy, no la inmobiliaria (ver la nota al pie de configuracion/page.tsx).
  // Un botón primario que lleva a una pantalla donde eso no se puede tocar
  // enseña a desconfiar de los botones. Sin acciones, se dice y ya.
  const emptyState = (
    <div className="py-8 flex flex-col items-center gap-1 text-center">
      <p className="text-sm text-fg-subtle">
        {t('inmobiliaria.ai.cobranza.overview.nextActions.empty')}
      </p>
      <p className="text-xs text-fg-muted max-w-xs">
        El agente programa los contactos solo; acá aparecen a medida que los
        agenda.
      </p>
    </div>
  )

  const listContent = isLoading ? (
    <div className="space-y-2 p-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-md bg-surface-muted animate-pulse" />
      ))}
    </div>
  ) : top10.length === 0 ? (
    emptyState
  ) : (
    <ul className="divide-y divide-border-faint">
      {top10.map((action) => (
        <li key={action.id}>
          <button
            type="button"
            onClick={() => router.push(`/panel/inmobiliaria/ai/cobranza/deudores/${action.id}`)}
            className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-muted transition-colors"
          >
            <ChannelIcon channel={action.channel} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg truncate">
                {action.debtorNameRedacted}
              </p>
              <p className="text-xs text-fg-subtle">
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
      <div className="hidden md:block rounded-lg border border-border bg-card">
        <div className="px-5 py-4 border-b border-border-faint">
          <h2 className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.cobranza.overview.nextActions.title')}
          </h2>
        </div>
        {listContent}
      </div>

      {/* Accordion — sm */}
      <details className="md:hidden rounded-lg border border-border bg-card group">
        <summary className="px-5 py-4 cursor-pointer flex items-center justify-between list-none">
          <span className="text-base font-semibold text-fg">
            {t('inmobiliaria.ai.cobranza.overview.nextActions.title')}
          </span>
          <CaretDown
            size={16}
            className="text-fg-subtle group-open:rotate-180 transition-transform"
          />
        </summary>
        <div className="px-0 pb-4">{listContent}</div>
      </details>
    </>
  )
}
