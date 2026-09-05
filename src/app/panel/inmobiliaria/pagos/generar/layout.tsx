/**
 * Rótulo de honestidad para /panel/inmobiliaria/pagos/generar.
 *
 * Los datos que pinta esta pantalla están escritos a mano en el código.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function PagosGenerarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="Los resultados de la corrida (cobros generados, links enviados, casos a revisar)"
          queFalta="RESULTADO_EJEMPLO (page.tsx:405) es fijo; la generación masiva todavía no está expuesta."
        />
      </div>
      {children}
    </>
  )
}
