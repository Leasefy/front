'use client'

/**
 * Conceptos y liquidación — el catálogo de cobros del contrato.
 *
 * Se entra desde el encabezado de Contratos. No es una ruta suelta: una
 * pantalla a la que nada enlaza no es una pantalla.
 */

import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'

import { PageGuard } from '@/components/auth/PageGuard'
import { EncabezadoDePantalla } from '@/components/pantalla/EncabezadoDePantalla'
import { ParaEntenderMas } from '@/components/ui/para-entender-mas'
import { ROLES_DE_CONTRATOS } from '@/lib/contratos/roles-de-contratos'
import { ConceptosYLiquidacion } from '@/components/contratos/ConceptosYLiquidacion'
import { useCatalogoDeConceptos } from '@/lib/conceptos/use-catalogo-de-conceptos'

export default function ConceptosPage() {
  const { activos } = useCatalogoDeConceptos()
  return (
    <PageGuard module="contratos" roles={ROLES_DE_CONTRATOS}>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="space-y-3">
          <Link
            href="/panel/inmobiliaria/contratos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Contratos
          </Link>
          <EncabezadoDePantalla
            seccion="Portafolio"
            titulo="Conceptos y liquidación"
            descripcion={`${activos.length} conceptos, uno por cosa que se cobra. Los nombres se cambian en Configuración → Conceptos.`}
            ayuda={
              <ParaEntenderMas etiqueta="¿Cómo funciona?" titulo="Cómo funciona: conceptos y liquidación" variante="secundario">
                <div className="space-y-3 text-body-sm text-fg-muted">
                  <p>Cada concepto es una cosa que se cobra en el contrato: el canon, la administración, un servicio.</p>
                  <p>
                    Los impuestos no van en el nombre: salen de quién le paga a quién y del uso del inmueble (vivienda
                    o comercial).
                  </p>
                  <p>Los nombres que ve el inquilino se cambian en Configuración → Conceptos.</p>
                </div>
              </ParaEntenderMas>
            }
          />
        </div>

        <ConceptosYLiquidacion />
      </div>
    </PageGuard>
  )
}
