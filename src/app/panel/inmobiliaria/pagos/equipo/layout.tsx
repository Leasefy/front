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
 * QA-IA-B (04-10-2026): el texto decía «LOTE_EJEMPLO (page.tsx:279) pinta
 * badges…»: jerga de programador delante del usuario.
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
          queFalta="El lote del mes de abajo es un ejemplo para explicar cómo trabaja el equipo: no son pagos de tu inmobiliaria. Lo real está en Pagos y en Cobranza."
        />
      </div>
      {children}
    </>
  )
}
