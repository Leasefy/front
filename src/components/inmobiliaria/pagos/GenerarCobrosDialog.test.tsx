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

/**
 * 🔴 Los contratos VENCIDOS que la corrida deja fuera (15-09).
 *
 * El back los excluye y los devuelve en `omitidosPorContratoVencido`. Si la
 * pantalla no los muestra, la exclusión pasa en silencio — que es exactamente
 * lo que vino a evitar: un contrato vencido deja de cobrarse y nadie se entera
 * hasta que el propietario reclama.
 */
describe('GenerarCobrosDialog · contratos vencidos', () => {
  const vencido = (over: Record<string, unknown> = {}) => ({
    consignacionId: 'cons-1',
    contractId: 'ct-1',
    code: 1839,
    externalId: '1686',
    tenantName: 'Nubia Amparo David',
    propertyAddress: 'Cra 76 #45-12 apto 302',
    endDate: '2026-03-31',
    diasVencido: 168,
    leyenda: 'Vencido desde el 2026-03-31 (168 días)',
    tieneRenovacionAbierta: false,
    ...over,
  })

  async function generar() {
    await act(async () => {
      porTestId('generar-confirmar')?.click()
    })
  }

  it('los lista, dice cuántos son y enlaza a cada contrato', async () => {
    generate.mockResolvedValue({
      month: '2026-09',
      created: 812,
      omitidosPorContratoVencido: {
        consultado: true,
        cuantos: 1,
        contratos: [vencido()],
      },
    })
    const { onOpenChange } = montar()
    await generar()

    const bloque = porTestId('vencidos-omitidos')
    expect(bloque).not.toBeNull()
    expect(bloque?.textContent).toContain('Nubia Amparo David')
    expect(bloque?.textContent).toContain('Vencido desde el 2026-03-31')
    expect(
      porTestId('ir-al-contrato-ct-1')?.getAttribute('href'),
    ).toBe('/panel/inmobiliaria/contratos/ct-1')
    // 🔴 El diálogo NO se cierra solo: si se cerrara, nadie vería la lista.
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
  })

  it('🔴 primero los que ya tienen una renovación abierta; después, el más vencido', () => {
    const orden = ordenarVencidos([
      vencido({ contractId: 'a', diasVencido: 10, tieneRenovacionAbierta: false }),
      vencido({ contractId: 'b', diasVencido: 200, tieneRenovacionAbierta: false }),
      vencido({ contractId: 'c', diasVencido: 5, tieneRenovacionAbierta: true }),
    ])
    expect(orden.map((c) => c.contractId)).toEqual(['c', 'b', 'a'])
  })

  it('🔴 «no se pudo verificar» NO se dice como «no hay vencidos»', async () => {
    generate.mockResolvedValue({
      month: '2026-09',
      created: 812,
      omitidosPorContratoVencido: {
        consultado: false,
        motivo: 'La migración de terminación no está aplicada en esta base.',
        cuantos: 0,
        contratos: [],
      },
    })
    montar()
    await generar()

    const aviso = porTestId('vencidos-no-verificado')
    expect(aviso).not.toBeNull()
    expect(aviso?.textContent).toContain('NO excluyó a ninguno')
    expect(aviso?.textContent).toContain('La migración de terminación')
    // Y no se dibuja la lista de omitidos, que no existe.
    expect(porTestId('vencidos-omitidos')).toBeNull()
  })

  it('sin vencidos y con la consulta hecha, el diálogo se cierra como siempre', async () => {
    generate.mockResolvedValue({
      month: '2026-09',
      created: 812,
      omitidosPorContratoVencido: { consultado: true, cuantos: 0, contratos: [] },
    })
    const { onOpenChange, onGenerado } = montar()
    await generar()

    expect(onGenerado).toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(porTestId('vencidos-omitidos')).toBeNull()
  })
})
