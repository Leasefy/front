/**
 * QA-CONT CR-18 (SEGUIMIENTO-FRONT, 03-10-2026): un contrato trimestral se
 * cobra en cuotas de 3 meses; al generar los cobros de un mes que va DENTRO de
 * la cuota de otro, el back no genera nada y lo cuenta en `dentroDeOtraCuota`.
 * Si la pantalla no lo dice, parece que se olvidó ese inmueble. Preparación
 * copiada de `GenerarCobrosDialog.test.tsx`.
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

import { ApiError } from '@/lib/api/client'
import { GenerarCobrosDialog, ordenarVencidos } from './GenerarCobrosDialog'

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

describe('GenerarCobrosDialog · contratos trimestrales (CR-18)', () => {
  async function generar() {
    await act(async () => {
      porTestId('generar-confirmar')?.click()
    })
  }

  it('🔴 dice cuántos inmuebles van en la cuota trimestral de otro mes y se queda abierto', async () => {
    generate.mockResolvedValue({
      month: '2026-11',
      created: 30,
      omitidosPorContratoVencido: { consultado: true, cuantos: 0, contratos: [] },
      dentroDeOtraCuota: { cuantos: 2, consignaciones: [{ consignacionId: 'c1', mesDeLaCuota: '2026-10' }, { consignacionId: 'c2', mesDeLaCuota: '2026-10' }] },
    })
    const { onOpenChange } = montar()
    await generar()
    expect(porTestId('dentro-de-otra-cuota')?.textContent).toContain('2 inmuebles se cobran por trimestre')
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('sin trimestrales ni vencidos, se cierra como siempre', async () => {
    generate.mockResolvedValue({
      month: '2026-11',
      created: 30,
      omitidosPorContratoVencido: { consultado: true, cuantos: 0, contratos: [] },
      dentroDeOtraCuota: { cuantos: 0, consignaciones: [] },
    })
    const { onOpenChange } = montar()
    await generar()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
