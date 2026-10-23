'use client'

/**
 * /postulaciones/asegurabilidad/cola — F5 of the Agent Workspace initiative.
 *
 * Read-only TRIAGE cola of borderline asegurabilidad verdicts ("con
 * condiciones"), via the unified WorkItem endpoint (?agente=cotizador). Each
 * card deep-links (onOpen) into the EXISTING rich /asegurabilidad/[quoteId]
 * workflow, where the operator chooses a carrier, adjusts, or re-quotes — F5
 * never duplicates that decision surface. Owned by the comercial role.
 */

import { useRouter } from 'next/navigation'

import { useAgentWorkItems } from '@/lib/hooks/ai/use-agent-work-items'
import { ColaHumana } from '@/components/inmobiliaria/ai/ColaHumana'
import { useI18n } from '@/lib/i18n'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'

export default function CotizadorColaPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { items, total, isLoading, error, errorCrudo, refetch, runAction } =
    useAgentWorkItems('cotizador')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Encabezado de la casa; a la derecha, el único número real de la
          pantalla: cuántos casos esperan. */}
      {/* Glow up 22-10: el encabezado común; lo pendiente junto al título (antes una caja de KPI aparte). */}
      <EncabezadoDePantalla
        seccion={t('inmobiliaria.ai.nav.cotizador')}
        titulo={t('inmobiliaria.ai.workspace.pages.cotizador.colaTitle')}
        descripcion={
          <>
            {t('inmobiliaria.ai.workspace.pages.cotizador.colaDescPre')}{' '}
            <strong className="font-medium text-fg">{t('inmobiliaria.ai.workspace.pages.cotizador.colaDescStrong')}</strong>{' '}
            {t('inmobiliaria.ai.workspace.pages.cotizador.colaDescPost')}
          </>
        }
        junto={
          <span className="text-caption text-fg-muted">
            <span className="font-mono tabular-nums text-fg">{isLoading ? '—' : total}</span>{' '}
            {t('inmobiliaria.ai.workspace.pages.cotizador.porRevisar').toLowerCase()}
          </span>
        }
      />

      {/* Cola humana (transversal component) — read-only triage, deep-links to detail */}
      <ColaHumana
        agente="cotizador"
        items={items}
        isLoading={isLoading}
        error={errorCrudo ?? error}
        onReintentar={refetch}
        onAction={(item, action, body) => runAction(item, action, body)}
        onOpen={(item) => router.push(`/panel/inmobiliaria/postulaciones/asegurabilidad/${encodeURIComponent(item.id)}`)}
        emptyHint={t('inmobiliaria.ai.workspace.pages.cotizador.colaEmptyHint')}
      />
    </div>
  )
}
