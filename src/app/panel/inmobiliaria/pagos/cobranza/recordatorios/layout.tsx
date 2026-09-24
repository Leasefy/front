/**
 * Rótulo de honestidad para la secuencia de recordatorios de Cobranza.
 *
 * Vivía en la raíz de Pagos y se mudó acá el 2026-09-16 con el resto del tercer
 * renglón (NOTA al pie de `agentWorkspaceNav.ts`).
 *
 * PREVIEW_POR_TONO (page.tsx:102) arma los mensajes con «María» y
 * «$1.850.000» escritos a mano.
 *
 * Va en un layout y no dentro de la página para cubrir la subruta entera sin
 * editar el JSX de cada pantalla, y para que una pantalla nueva en esta
 * carpeta nazca ya rotulada.
 *
 * 🔴 Esto NO arregla la pantalla: la deja de mentir. Lo que sigue es cablearla
 * a su fuente real o retirarla, y eso lo decide Nico.
 */

import { AvisoDatosDeEjemplo } from '@/components/estado/AvisoDatosDeEjemplo'

export default function PagosRecordatoriosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="px-4 pt-4 sm:px-6 lg:px-8">
        <AvisoDatosDeEjemplo
          queEsInventado="Los mensajes de la vista previa, con su nombre y su monto"
          queFalta="La secuencia no se guarda en ningún lado: el estado es local y no hay endpoint detrás."
        />
      </div>
      {children}
    </>
  )
}
