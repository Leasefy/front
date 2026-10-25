'use client'

/**
 * Frontera de error del admin (ronda 26, 23-10-2026, revisora).
 *
 * Antes el admin no tenía la suya: un error de render en UNA pantalla (el
 * `TypeError … reading 'split'` de Ingresos contra un back viejo) subía hasta
 * `global-error.tsx` y se llevaba la barra lateral y todo el armazón. Esta
 * frontera vive dentro del layout del panel: la barra queda, la pantalla dice
 * qué pasó en español y ofrece «Reintentar» (remonta sólo esa pantalla).
 */

import { useEffect } from 'react'
import { ErrorBlock } from '@/components/admin/screen/states'

export default function ErrorDelAdmin({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin] error de render', error)
  }, [error])

  const referencia = error.digest ? ` Si sigue pasando, avisa con la referencia ${error.digest.slice(0, 8)}.` : ''

  return (
    <div className="p-6 lg:p-8" data-testid="admin-error">
      <ErrorBlock
        titulo="Esta pantalla no pudo abrir"
        error={`Algo falló de nuestro lado al mostrarla; la barra y las demás pantallas siguen funcionando.${referencia}`}
        onReintentar={reset}
        volverA={{ label: 'Ir al resumen', href: '/admin' }}
      />
    </div>
  )
}
