'use client'

/**
 * Conceptos y liquidación — el catálogo de cobros del contrato.
 *
 * Se entra desde el encabezado de Contratos. No es una ruta suelta: una
 * pantalla a la que nada enlaza no es una pantalla.
 */

import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'
import { Eyebrow } from '@leasefy/cadence'

import { PageGuard } from '@/components/auth/PageGuard'
import { ConceptosYLiquidacion } from '@/components/contratos/ConceptosYLiquidacion'
import { CONCEPTOS } from '@/lib/contratos/conceptos'

export default function ConceptosPage() {
  return (
    <PageGuard module="contratos">
      <div className="space-y-6 p-6 lg:p-8">
        <header className="space-y-1">
          <Link
            href="/panel/inmobiliaria/contratos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Contratos
          </Link>
          <Eyebrow>Portafolio</Eyebrow>
          <h1 className="text-h2 text-fg">
            Conceptos y liquidación
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground line-clamp-2">
            {CONCEPTOS.length} conceptos, uno por cosa que se cobra. Los
            impuestos no van en el nombre: salen de quién le paga a quién y del
            uso del inmueble.
          </p>
        </header>

        <ConceptosYLiquidacion />
      </div>
    </PageGuard>
  )
}
