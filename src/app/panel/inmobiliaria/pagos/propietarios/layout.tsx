/**
 * Rótulo de honestidad para /panel/inmobiliaria/pagos/propietarios.
 *
 * La bandeja de esta pantalla es BANDEJA_EJEMPLO (page.tsx:90) y la
 * liquidación es LIQUIDACION_EJEMPLO (page.tsx:115). Ninguna lleva rótulo, y
 * el banner del agente afirma «hay N pagos listos por $X» con la cifra
 * derivada del mock.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function PagosPropietariosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="Los propietarios, los montos a transferir y el desglose de la liquidación"
          queFalta="La fuente real ya existe: fetchOwnerInbox() en src/lib/api/pagos-home.service.ts, con el hook useOwnerInbox y el componente PagosHomeOwnerInbox ya escritos."
        />
      </div>
      {children}
    </>
  )
}
