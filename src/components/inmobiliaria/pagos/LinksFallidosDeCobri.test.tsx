/**
 * @vitest-environment happy-dom
 *
 * COBRI-13 (Nico 18-10): las acciones masivas de Pagos fallidos funcionan de
 * verdad sobre los links de Cobri que se marcan (antes: «Próximamente»).
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const aplicar = vi.fn()
vi.mock('@/lib/api/pagos-fallidos.service', () => ({ pagosFallidosApi: { aplicar: (...a: unknown[]) => aplicar(...a) } }))
vi.mock('@/components/ui/confirmar', () => ({ confirmar: vi.fn(async () => true) }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => `$ ${n}` }),
  useOptionalI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }))
vi.mock('@/lib/i18n/use-tr', () => ({ useTr: () => (s: string, v?: Record<string, string | number>) => (v ? s.replace(/\{(\w+)\}/g, (_, k) => String(v[k])) : s) }))

import { LinksFallidosDeCobri } from './LinksFallidosDeCobri'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const LINK = {
  cuotaId: 'q-1', contratoId: 'c-1', contratoNumero: '#10', inmueble: 'Calle 1', inquilino: 'John Mesa',
  fechaDeVencimiento: '2026-10-20', montoCop: 2_600_000, estado: 'fallido', hitosEnviados: ['dia'],
  ultimoEnvioEn: null, pagadoEn: null, paymentUrl: 'https://x', pagada: false,
  seguimiento: { por: 'Ana Asesora', desde: '2026-10-18T15:00:00.000Z' },
}

let root: Root
let cont: HTMLDivElement
afterEach(() => { act(() => root.unmount()); cont.remove(); aplicar.mockReset() })

function pintar() {
  cont = document.createElement('div'); document.body.appendChild(cont); root = createRoot(cont)
  const recargar = vi.fn(async () => {})
  act(() => root.render(<LinksFallidosDeCobri lectura={{ items: [LINK as never], total: 1, cargando: false, error: null, recargar }} esperanEnLaBandeja={new Map()} />))
  return { recargar }
}
const boton = (t: string) => [...cont.querySelectorAll('button')].find((b) => b.textContent?.includes(t)) as HTMLButtonElement

describe('LinksFallidosDeCobri — COBRI-13', () => {
  it('sin marcar nada los botones están apagados; la fila dice quién la sigue', () => {
    pintar()
    expect(boton('Reenviar links').disabled).toBe(true)
    expect(cont.textContent).toContain('En seguimiento · Ana Asesora')
  })

  it('marca una cuota, «Quitar seguimiento» la manda y la fila dice lo que pasó', async () => {
    aplicar.mockResolvedValue([{ cuotaId: 'q-1', resultado: 'hecho', mensaje: 'Sin seguimiento: Cobri vuelve a sus avisos.' }])
    const { recargar } = pintar()
    const caja = cont.querySelector('[data-testid="marcar-q-1"]') as HTMLElement
    await act(async () => { caja.click() })
    await act(async () => { boton('Quitar seguimiento').click() })
    expect(aplicar).toHaveBeenCalledWith('quitar_seguimiento', ['q-1'])
    expect(cont.textContent).toContain('Sin seguimiento: Cobri vuelve a sus avisos.')
    expect(recargar).toHaveBeenCalled()
  })
})
