/**
 * Rótulo de honestidad para /panel/inmobiliaria/avaluos-ia.
 *
 * Las subrutas de esta carpeta son un prototipo huérfano: nada en el panel
 * las enlaza, y el índice de la carpeta ya redirige al módulo real. Además de
 * inventar datos, sus botones de «enviar» sólo cambian un useState: la
 * pantalla dice «Reporte enviado a Carlos» sin haber enviado nada.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function AvaluosIaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="Los inmuebles, las direcciones, los propietarios y los avalúos en pesos"
          queFalta="El módulo real es /panel/inmobiliaria/inmuebles/avaluos (useAgencyAvaluos + avaluosApi), que es adonde ya redirige el índice de esta misma carpeta. Estas subrutas quedaron vivas por URL directa."
        />
      </div>
      {children}
    </>
  )
}
