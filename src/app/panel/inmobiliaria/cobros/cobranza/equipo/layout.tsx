/**
 * Rótulo de honestidad para /panel/inmobiliaria/cobros/cobranza/equipo.
 *
 * Las fichas de los seis agentes son material de producto. El lote de abajo
 * no: usa la misma tabla que las pantallas con datos reales.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function CobranzaEquipoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="El lote de gestión y la gestión atribuida a cada persona"
          queFalta="LOTE_EJEMPLO (page.tsx:182) inventa contactos, promesas de pago y escalamientos. El equipo real de la agencia sale de useEquipo() en src/lib/hooks/useInmobiliaria.ts; para las métricas por subagente IA no encontré endpoint."
        />
      </div>
      {children}
    </>
  )
}
