'use client'

/**
 * Avisa antes de cerrar o recargar la pestaña mientras haya una migración a
 * medias en el navegador.
 *
 * T-0125. Los importadores recorren los endpoints `aplicar` en un bucle que
 * vive en el navegador: cerrar la pestaña a mitad corta la carga. Lo ya
 * escrito queda a salvo en el back y se puede continuar, pero un cierre por
 * accidente cuesta una carga cortada — esto sólo lo evita.
 *
 * `activo` debe ser verdadero SÓLO mientras hay algo que perder: una operación
 * en vuelo, o un archivo leído en el navegador que todavía no se aplicó. En
 * reposo no se registra nada; un aviso que salta siempre se aprende a ignorar.
 *
 * El texto lo pone el navegador (los navegadores modernos ignoran el propio):
 * acá sólo se pide la confirmación. Cada llamada registra su propio oyente, así
 * que dos pantallas a la vez no se pisan.
 */

import { useEffect } from 'react'

export function useAvisoAlSalir(activo: boolean): void {
  useEffect(() => {
    if (!activo) return

    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
      // Chrome sólo muestra el aviso si `returnValue` está asignado.
      evento.returnValue = ''
    }

    window.addEventListener('beforeunload', alSalir)
    return () => window.removeEventListener('beforeunload', alSalir)
  }, [activo])
}
