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

import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { PageGuard } from '@/components/auth/PageGuard'
import { PestanasDeCartera } from '@/components/cartera/PestanasDeCartera'
import { CastigoDeCartera } from '@/components/cartera/CastigoDeCartera'

export default function CarteraCastigadaPage() {
  return (
    <PageGuard module="cobros" action="view">
      <div className="space-y-6 p-6 lg:p-8">
        <EncabezadoDePantalla
          seccion="Pagos · inquilinos"
          titulo="Cartera castigada"
          descripcion="Las deudas incobrables que salieron de la cartera activa: la cobranza no las toca."
          ayuda={
            <ParaEntenderMas etiqueta="Qué es castigar" titulo="Qué es castigar una deuda" variante="secundario">
              <p className="text-body-sm text-fg-muted">
                Castigar es dejar de perseguir una deuda incobrable: sale de la cartera activa y la
                cobranza no la toca. El inquilino sigue debiéndola y la puede pagar; si paga, entra
                como recuperación.
              </p>
            </ParaEntenderMas>
          }
        />

        <PestanasDeCartera />

        <CastigoDeCartera />
      </div>
    </PageGuard>
  )
}
