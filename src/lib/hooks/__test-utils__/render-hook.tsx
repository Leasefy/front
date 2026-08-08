/**
 * Render mínimo de un hook, con la convención del repo (`createRoot` + `act`,
 * sin `@testing-library/react`, que no está instalado).
 *
 * Espera a que los efectos asíncronos se asienten y devuelve el último valor
 * que el hook produjo.
 */

import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

export async function renderHook<T>(hook: () => T): Promise<T> {
  const contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  const root = createRoot(contenedor)

  let ultimo: T | undefined
  function Sonda() {
    ultimo = hook()
    return null
  }

  await act(async () => {
    root.render(<Sonda />)
  })
  // Segundo tick: los efectos que resuelven promesas actualizan estado después
  // del primer render.
  await act(async () => {
    await Promise.resolve()
  })

  act(() => root.unmount())
  contenedor.remove()
  return ultimo as T
}
