'use client'

/**
 * /ai/pagos — F9: the Pagos (AP) Sala (complete workspace).
 *
 * Reframed from the F4 single-page cola: this page is now the generic
 * <SalaAgente> fed by the per-agent overview endpoint; the queue moved to
 * ./cola, the case detail lives at ./[id] and the autonomy posture at
 * ./configuracion — mirroring the F6/F7/F8 workspaces 1:1.
 *
 * Decisión cerrada: la Sala vive aquí; las operaciones profundas (facturas,
 * aging, matriz de aprobación, payment-runs) SIGUEN en Tesorería y
 * Dispersiones — el domain slot las cross-linkea, NO las duplica.
 * Nota de rutas: /tesoreria/ap no tiene index (solo el detalle [id]) →
 * "Tesorería · AP" apunta al index real /panel/inmobiliaria/tesoreria.
 */

import Link from 'next/link'
import { ArrowSquareOut, CurrencyDollar, PaperPlaneTilt, Wallet } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { AGENCY_ROLES } from '@/lib/auth/agency-roles'
import { useAgentOverview } from '@/lib/hooks/ai/use-agent-overview'
import { SalaAgente } from '@/components/inmobiliaria/ai/SalaAgente'

/** Deep-ops surfaces the agent prepares work for — framed, never duplicated. */
const OPERACIONES_PROFUNDAS: { label: string; detalle: string; href: string; icon: Icon }[] = [
  {
    label: 'Tesorería · AP',
    detalle: 'Facturas, aging y matriz de aprobación',
    href: '/panel/inmobiliaria/tesoreria',
    icon: Wallet,
  },
  {
    label: 'Dispersiones',
    detalle: 'Payment-runs y comprobantes',
    href: '/panel/inmobiliaria/dispersiones',
    icon: PaperPlaneTilt,
  },
]

function PagosSala() {
  const { data, isLoading, error } = useAgentOverview('pagos')

  // CTA count: prefer the backend's "en_cola" KPI; absent → CTA without count.
  const colaCount = data?.kpis.find((kpi) => kpi.id === 'en_cola')?.value

  return (
    <SalaAgente
      agente="pagos"
      titulo="Pagos (AP)"
      descripcion="El agente prepara la dispersión a proveedores — facturas, aging, matriz de aprobación por monto y payment-runs — y deja en tu cola lo que requiere firma humana. La matriz por monto/centro de costo y la separación de funciones se validan en el servidor. El agente prepara, el humano aprueba."
      icon={CurrencyDollar}
      overview={data}
      isLoading={isLoading}
      error={error}
      colaHref="/panel/inmobiliaria/ai/pagos/cola"
      colaCount={colaCount}
    >
      {/* Domain slot: operaciones profundas — cross-links, no duplicación */}
      <section className="space-y-2" data-testid="pagos-operaciones-profundas">
        <h2 className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
          Operaciones profundas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
          {OPERACIONES_PROFUNDAS.map((op) => {
            const OpIcon = op.icon
            return (
              <Link
                key={op.href}
                href={op.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition"
              >
                <OpIcon
                  className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition shrink-0"
                  weight="duotone"
                  aria-hidden="true"
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-foreground">{op.label}</span>
                  <span className="block text-xs text-muted-foreground truncate">{op.detalle}</span>
                </span>
                <ArrowSquareOut
                  className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition shrink-0"
                  aria-hidden="true"
                />
              </Link>
            )
          })}
        </div>
      </section>
    </SalaAgente>
  )
}

export default function PagosPage() {
  return (
    <PageGuard roles={[AGENCY_ROLES.ADMIN, AGENCY_ROLES.CONTADOR]}>
      <PagosSala />
    </PageGuard>
  )
}
