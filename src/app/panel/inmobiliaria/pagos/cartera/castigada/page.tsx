'use client'

/**
 * Cartera castigada — la que la inmobiliaria decidió dejar de perseguir.
 *
 * Nico y Juan Camilo, 17-09-2026: «cartera incobrable: se castiga con
 * aprobación del administrador y el contador; sale del informe de cartera
 * activa y queda en un listado de castigada; si alguna vez paga, entra como
 * recuperación». Éste es ese listado.
 *
 * Permiso `cobros`/view, el mismo de las otras cinco lecturas de cartera.
 * Firmar es aparte y lo decide el ROL (administrador o contador), no el
 * permiso: lo verifica el back.
 */

import { SectionLabel } from '@/components/ui/section-label'
import { PageGuard } from '@/components/auth/PageGuard'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { CastigoDeCartera } from '@/components/cartera/CastigoDeCartera'

export default function CarteraCastigadaPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1.5">
          <SectionLabel>Pagos · inquilinos</SectionLabel>
          <h1 className="text-h2 text-fg">Cartera castigada</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Castigar es dejar de perseguir una deuda incobrable: sale de la
            cartera activa y la cobranza no la toca. El inquilino sigue
            debiéndola y la puede pagar; si paga, entra como recuperación.
          </p>
        </header>

        <PestanasDeCartera />

        <CastigoDeCartera />
      </div>
    </PageGuard>
  )
}
