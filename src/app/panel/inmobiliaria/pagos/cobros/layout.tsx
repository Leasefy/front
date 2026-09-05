/**
 * Rótulo de honestidad para /panel/inmobiliaria/pagos/cobros.
 *
 * COBRO_EJEMPLO (page.tsx:75) trae inquilino, dirección y montos en pesos.
 * La tarjeta lleva un chip «Ejemplo», pero se lee igual que un cobro real.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function PagosCobrosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="El cobro que se muestra (contrato, inquilino, inmueble, conceptos y fecha límite)"
          queFalta="La fuente real ya existe: fetchPaymentDetail() en src/lib/api/pagos-home.service.ts."
        />
      </div>
      {children}
    </>
  )
}
