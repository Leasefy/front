/**
 * Rótulo de honestidad para /panel/inmobiliaria/conciliacion-ia.
 *
 * Las 9 pantallas de esta carpeta son un prototipo: ni una hace un solo fetch.
 * Los datos —nombres de pagador, cuentas «Bancolombia ***4821», montos en
 * pesos— están escritos a mano en cada page.tsx.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function ConciliacionIaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="Los movimientos del banco, los pagadores, las cuentas y los montos"
          queFalta="El árbol real es /panel/inmobiliaria/conciliacion, que ya usa los hooks de src/lib/hooks/conciliacion (summary, queue, settlements, connections, policy, run). Esta copia quedó sin cablear y sin enlace en el menú."
        />
      </div>
      {children}
    </>
  )
}
