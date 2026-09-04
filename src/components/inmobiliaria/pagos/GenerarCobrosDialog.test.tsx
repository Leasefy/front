/**
 * La confirmación de la única acción MASIVA de Pagos IA.
 *
 * Lo que se protege: la acción NUNCA se dispara sin decir antes su alcance —
 * sobre qué mes cae y cuántos cobros de ese mes ya existen— y el mes viaja al
 * endpoint tal como se anunció. Nico: «eso de "generar cobros del mes" no se
 * entiende».
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n}`,
    formatDate: (d: unknown) => String(d),
  }),
}))

const generate = vi.fn()
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  cobrosApi: {
    generate: (...args: unknown[]) => generate(...args),
  },
}))

import { GenerarCobrosDialog } from './GenerarCobrosDialog'

// El diálogo del DS usa un portal: el contenido NO cuelga del container.
const dialogo = () =>
  document.body.querySelector<HTMLElement>('[data-testid="generar-cobros-dialog"]')
const porTestId = (id: string) => document.body.querySelector<HTMLElement>(`[data-testid="${id}"]`)

// Los tests que no montan tienen que poder desmontar igual.
let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  root = undefined
  container = undefined
  generate.mockReset()
})

function montar(props: Partial<React.ComponentProps<typeof GenerarCobrosDialog>> = {}) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  const onOpenChange = vi.fn()
  const onGenerado = vi.fn()
  act(() => {
    r.render(
      <GenerarCobrosDialog
        open
        onOpenChange={onOpenChange}
        mes="2026-09"
        yaGenerados={0}
        onGenerado={onGenerado}
        {...props}
      />,
    )
  })
  return { onOpenChange, onGenerado }
}

describe('GenerarCobrosDialog', () => {
  it('dice el alcance antes de hacer nada: el mes con todas las letras y cuántos ya hay', () => {
    montar({ yaGenerados: 7 })

    expect(dialogo()).not.toBeNull()
    // El mes NUNCA se muestra como '2026-09'.
    expect(porTestId('generar-mes')?.textContent).toBe('Septiembre de 2026')
    expect(porTestId('generar-mes')?.textContent).not.toContain('2026-09')
    expect(porTestId('generar-ya-generados')?.textContent).toBe('7')
    // Y no se generó nada por el solo hecho de abrirlo.
    expect(generate).not.toHaveBeenCalled()
  })

  it('si ya hay cobros de ese mes, avisa antes de duplicar', () => {
    montar({ yaGenerados: 7 })
    const aviso = porTestId('generar-aviso-duplicado')
    expect(aviso).not.toBeNull()
    expect(aviso!.textContent).toContain('7')
    expect(aviso!.textContent).toContain('Septiembre de 2026')
  })

  it('si no hay ninguno, no inventa una advertencia', () => {
    montar({ yaGenerados: 0 })
    expect(porTestId('generar-aviso-duplicado')).toBeNull()
    expect(porTestId('generar-ya-generados')?.textContent).toBe('0')
  })

  it('al confirmar manda EL MISMO mes que anunció, y avisa para refrescar', async () => {
    generate.mockResolvedValue(undefined)
    const { onGenerado, onOpenChange } = montar({ mes: '2026-09' })

    await act(async () => {
      porTestId('generar-confirmar')!.click()
    })

    expect(generate).toHaveBeenCalledTimes(1)
    expect(generate).toHaveBeenCalledWith('2026-09')
    expect(onGenerado).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('si el back falla, el diálogo NO se cierra y el fallo se ve', async () => {
    generate.mockRejectedValue(new Error('500'))
    const { onGenerado, onOpenChange } = montar()

    await act(async () => {
      porTestId('generar-confirmar')!.click()
    })

    // Cerrar acá haría creer que se generaron.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(onGenerado).not.toHaveBeenCalled()
    expect(document.body.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
  })
})
