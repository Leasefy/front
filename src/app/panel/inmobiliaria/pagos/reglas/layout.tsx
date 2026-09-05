/**
 * Rótulo de honestidad para /panel/inmobiliaria/pagos/reglas.
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

export default function PagosReglasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="Los valores de las reglas (día de generación, días de recordatorio, monto de aprobación automática)"
          queFalta="Son 14 useState con defaults escritos a mano: no se leen del back ni se guardan. La pantalla ya avisa que no persiste; lo que faltaba es decir que los valores tampoco son los tuyos."
        />
      </div>
      {children}
    </>
  )
}
