'use client'

/**
 * /ai/estudio/analitica — F10: per-agent Analítica (superficie 6).
 *
 * Thin instantiation of <AnaliticaAgente> over
 * GET …/ai-hub/agentes/estudio/analitica (404 → graceful panel).
 */

import { PageGuard } from '@/components/auth/PageGuard'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { useAgentAnalitica } from '@/lib/hooks/ai/use-agent-analitica'
import { AnaliticaAgente } from '@/components/inmobiliaria/ai/AnaliticaAgente'
import { useI18n } from '@/lib/i18n'

function EstudioAnalitica() {
  const { t } = useI18n()
  const { data, isLoading, error, notAvailable } = useAgentAnalitica('estudio')

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <EncabezadoDePantalla
        seccion="Captación y arriendo"
        titulo={t('inmobiliaria.ai.workspace.pages.comun.analiticaTitle')}
        descripcion={t('inmobiliaria.ai.workspace.pages.estudio.analiticaDesc')}
      />

      <AnaliticaAgente data={data} isLoading={isLoading} error={error} notAvailable={notAvailable} />
    </div>
  )
}

export default function EstudioAnaliticaPage() {
  return (
    <PageGuard module="estudio">
      <EstudioAnalitica />
    </PageGuard>
  )
}
