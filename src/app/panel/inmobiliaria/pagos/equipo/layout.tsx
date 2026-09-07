/**
 * Rótulo de honestidad para /panel/inmobiliaria/pagos/equipo.
 *
 * Las fichas de los agentes son material de producto y no son el problema;
 * el lote sí, porque usa los mismos badges que las pantallas con datos.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function PagosEquipoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="El lote de trabajo del equipo y sus resultados"
          queFalta="LOTE_EJEMPLO (page.tsx:279) pinta badges de estado de pago reales sobre un lote que no existe."
        />
      </div>
      {children}
    </>
  )
}
