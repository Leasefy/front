/**
 * ConfigPerfilAgencia.test.tsx — profile form wired to PUT /inmobiliaria/agency.
 *
 * Covers: view-mode rendering from the real agency shape, changed-fields-only
 * save payload, no-op save when nothing changed, admin-only edit gating, and
 * staying in edit mode when the save rejects (e.g. backend 403).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { ConfigPerfilAgencia } from './ConfigPerfilAgencia'
import type { AgencyProfile } from '@/lib/types/inmobiliaria'

const AGENCY: AgencyProfile = {
  id: 'ag-1',
  name: 'Inmobiliaria ABC',
  nit: '901.234.567-8',
  address: 'Cra 11 #82-76',
  city: 'Bogota',
  phone: '+57 601 345 6789',
  email: 'contacto@abc.co',
  website: 'https://abc.co',
  whatsapp: '+57 310 555 1234',
  supportEmail: 'soporte@abc.co',
  razonSocial: 'Inmobiliaria ABC S.A.S.',
  matriculaInmobiliaria: 'INM-2024-001234',
  registroCamara: 'S0012345',
  department: 'Cundinamarca',
  postalCode: '110221',
  legalRepresentative: 'Juan Perez',
  legalDocumentNumber: '80123456',
  defaultCommissionPercent: 10,
  defaultLateFeePercent: 2,
  paymentDueDay: 5,
  disbursementDay: 15,
  reminderDaysBefore: [3, 1],
  reminderDaysAfter: [1, 3, 7, 15],
  motorDeCobrosV2: false,
  diasDePlazo: 3,
  diasParaSiniestro: 30,
  dispersionExigePin: false,
  dispersionMontoDobleAprobacion: 50_000_000,
  memberRole: 'ADMIN',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

function render(props: Partial<React.ComponentProps<typeof ConfigPerfilAgencia>> = {}) {
  const defaultProps: React.ComponentProps<typeof ConfigPerfilAgencia> = {
    agency: AGENCY,
    onSave: vi.fn().mockResolvedValue(undefined),
    ...props,
  }
  act(() => {
    root.render(<ConfigPerfilAgencia {...defaultProps} />)
  })
  return defaultProps
}

function findButton(text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'))
  const btn = buttons.find((b) => (b.textContent ?? '').includes(text))
  if (!btn) throw new Error(`Button with text "${text}" not found`)
  return btn as HTMLButtonElement
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function enterEditMode() {
  act(() => {
    findButton('Editar').click()
  })
}

async function clickSave() {
  await act(async () => {
    findButton('Guardar cambios').click()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('<ConfigPerfilAgencia>', () => {
  it('renders the real agency fields in view mode', () => {
    render()
    const text = container.textContent ?? ''
    expect(text).toContain('Inmobiliaria ABC')
    expect(text).toContain('+57 601 345 6789')
    expect(text).toContain('contacto@abc.co')
    expect(text).toContain('901.234.567-8')
    expect(text).toContain('Juan Perez')
    // Reminder arrays from the agency row
    expect(text).toContain('3d, 1d')
  })

  it('renders the extended design fields in view mode', () => {
    render()
    const text = container.textContent ?? ''
    expect(text).toContain('https://abc.co')
    expect(text).toContain('+57 310 555 1234')
    expect(text).toContain('Inmobiliaria ABC S.A.S.')
    expect(text).toContain('INM-2024-001234')
    expect(text).toContain('S0012345')
    // Department is joined into the address line
    expect(text).toContain('Cundinamarca')
  })

  it('saves changed extended fields with their contract payload keys', async () => {
    const props = render()
    enterEditMode()

    const whatsappInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === '+57 310 555 1234',
    ) as HTMLInputElement
    expect(whatsappInput).toBeTruthy()
    act(() => {
      setInputValue(whatsappInput, '+57 320 999 8877')
    })

    const websiteInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'https://abc.co',
    ) as HTMLInputElement
    expect(websiteInput).toBeTruthy()
    act(() => {
      setInputValue(websiteInput, 'https://abc.com.co')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({
      whatsapp: '+57 320 999 8877',
      website: 'https://abc.com.co',
    })
  })

  it('saves the real-estate license under the matriculaInmobiliaria key (backend field name)', async () => {
    const props = render()
    enterEditMode()

    const matriculaInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'INM-2024-001234',
    ) as HTMLInputElement
    expect(matriculaInput).toBeTruthy()
    act(() => {
      setInputValue(matriculaInput, 'INM-2026-009999')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ matriculaInmobiliaria: 'INM-2026-009999' })
  })

  it('toggles a reminder day chip and sends the full array', async () => {
    const props = render()
    enterEditMode()

    // "Antes" group: currently [3, 1] → clicking 5d adds it
    const beforeChip = container.querySelector(
      '[data-testid="reminder-before-5"]',
    ) as HTMLButtonElement
    expect(beforeChip).toBeTruthy()
    act(() => {
      beforeChip.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({
      reminderDaysBefore: [1, 3, 5],
    })
  })

  it('allows clearing all reminder days (empty array = disabled)', async () => {
    const props = render()
    enterEditMode()

    for (const day of [1, 3]) {
      const chip = container.querySelector(
        `[data-testid="reminder-before-${day}"]`,
      ) as HTMLButtonElement
      act(() => {
        chip.click()
      })
    }

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ reminderDaysBefore: [] })
  })

  it('does not send reminder arrays when they were not touched', async () => {
    const props = render()
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, 'Inmobiliaria XYZ')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ name: 'Inmobiliaria XYZ' })
  })

  it('saves only the changed fields', async () => {
    const props = render()
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    expect(nameInput).toBeTruthy()
    act(() => {
      setInputValue(nameInput, 'Inmobiliaria XYZ')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith({ name: 'Inmobiliaria XYZ' })
  })

  // ── Cobros y mora / Dispersiones — las perillas reales de Agency ──────────

  it('muestra en modo lectura el motor, los días de plazo y los controles de la dispersión', () => {
    render()
    const text = container.textContent ?? ''
    expect(text).toContain('% mensual fijo (2%)')
    expect(text).toContain('Días de plazo antes de la mora')
    expect(text).toContain('30 días de mora')
    expect(text).toContain('50.000.000')
    expect(text).toContain('Código en todos los lotes')
  })

  it('con el motor prendido lo dice, y sin umbral dice «Nunca por monto»', () => {
    render({
      agency: { ...AGENCY, motorDeCobrosV2: true, dispersionMontoDobleAprobacion: null },
    })
    const text = container.textContent ?? ''
    expect(text).toContain('Reglas de mora')
    expect(text).toContain('Nunca por monto')
  })

  it('prender el motor manda { motorDeCobrosV2: true } y nada más', async () => {
    const props = render()
    enterEditMode()

    const sw = container.querySelector('[data-testid="motor-de-cobros"]') as HTMLElement
    expect(sw).toBeTruthy()
    await act(async () => {
      sw.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ motorDeCobrosV2: true })
  })

  it('cambiar los días de plazo manda un number, no un string', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector('[data-testid="dias-de-plazo"]') as HTMLInputElement
    expect(input.value).toBe('3')
    act(() => {
      setInputValue(input, '5')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ diasDePlazo: 5 })
  })

  it('las tarifas llegan del back como texto (Decimal) y guardar no las rechaza ni las manda sin cambio', async () => {
    const props = render({
      agency: {
        ...AGENCY,
        ivaPorcentaje: '19',
        retefuenteArrendamientoPorcentaje: '3.5',
        retefuenteComisionPorcentaje: '11',
        reteicaPorMil: null,
        reteivaPorcentaje: '15',
      } as AgencyProfile,
    })
    enterEditMode()

    const reteica = container.querySelector('[data-testid="reteica-por-mil"]') as HTMLInputElement
    expect(reteica.value).toBe('')
    act(() => {
      setInputValue(reteica, '9.66')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith({ reteicaPorMil: 9.66 })
  })

  it('cambiar los días para siniestro manda { diasParaSiniestro: 45 }', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector('[data-testid="dias-para-siniestro"]') as HTMLInputElement
    expect(input.value).toBe('30')
    act(() => {
      setInputValue(input, '45')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ diasParaSiniestro: 45 })
  })

  it('cambiar los días para avisar a la aseguradora manda { diasParaAvisoAseguradora: 10 }', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector('[data-testid="dias-para-aviso-aseguradora"]') as HTMLInputElement
    // Sin dato de la agencia, el default de Portofino: día 8.
    expect(input.value).toBe('8')
    act(() => {
      setInputValue(input, '10')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ diasParaAvisoAseguradora: 10 })
  })

  it('el aviso a la aseguradora tiene que ser ANTES del siniestro: no llama al back', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector('[data-testid="dias-para-aviso-aseguradora"]') as HTMLInputElement
    act(() => {
      setInputValue(input, '30')
    })

    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.textContent).toContain('antes del siniestro')
  })

  it('un siniestro a los 0 días no existe: no llama al back', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector('[data-testid="dias-para-siniestro"]') as HTMLInputElement
    act(() => {
      setInputValue(input, '0')
    })

    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Entre 1 y 365 días')
  })

  it('rechaza más de 60 días de plazo sin llamar al back', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector('[data-testid="dias-de-plazo"]') as HTMLInputElement
    act(() => {
      setInputValue(input, '61')
    })

    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Entre 0 y 60 días')
  })

  it('el código en todos los lotes viaja como dispersionExigePin', async () => {
    const props = render()
    enterEditMode()

    const sw = container.querySelector('[data-testid="dispersion-exige-pin"]') as HTMLElement
    await act(async () => {
      sw.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ dispersionExigePin: true })
  })

  it('el umbral del segundo aprobador se lee como pesos enteros, no como 80.000 → 80', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector(
      '[data-testid="dispersion-monto-doble-aprobacion"]',
    ) as HTMLInputElement
    expect(input).toBeTruthy()
    act(() => {
      setInputValue(input, '$ 80.000.000')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ dispersionMontoDobleAprobacion: 80_000_000 })
  })

  it('vaciar el umbral manda null («nunca por monto»), no 0 ni ausencia', async () => {
    const props = render()
    enterEditMode()

    const input = container.querySelector(
      '[data-testid="dispersion-monto-doble-aprobacion"]',
    ) as HTMLInputElement
    act(() => {
      setInputValue(input, '')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ dispersionMontoDobleAprobacion: null })
  })

  it('does not call onSave when nothing changed', async () => {
    const props = render()
    enterEditMode()

    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
    // Back to view mode — the edit button is visible again
    expect(findButton('Editar')).toBeTruthy()
  })

  it('stays in edit mode when the save rejects (backend 403 surfaced by the parent)', async () => {
    const props = render({ onSave: vi.fn().mockRejectedValue(new Error('403')) })
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, 'Otro Nombre')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledTimes(1)
    // Still editing: the save button remains rendered
    expect(findButton('Guardar cambios')).toBeTruthy()
  })

  it('hides the edit button and shows a hint for non-admins', () => {
    render({ canEdit: false })
    const buttons = Array.from(container.querySelectorAll('button'))
    expect(buttons.some((b) => (b.textContent ?? '').includes('Editar'))).toBe(false)
    expect(container.textContent).toContain(
      'Solo los administradores de la agencia pueden editar esta información.',
    )
  })

  it('validates the name before saving', async () => {
    const props = render()
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, '   ')
    })

    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.textContent).toContain('El nombre de la agencia es obligatorio')
  })
})

describe('<ConfigPerfilAgencia> — impuestos y retenciones', () => {
  it('muestra las tarifas en modo lectura, con la reteICA sin configurar como tal', () => {
    render({ agency: { ...AGENCY, ivaPorcentaje: 19, retefuenteArrendamientoPorcentaje: 3.5, reteicaPorMil: null } })
    const text = container.textContent ?? ''
    expect(text).toContain('Impuestos y retenciones')
    expect(text).toContain('19 %')
    expect(text).toContain('3.5 %')
    expect(text).toContain('Sin configurar — no se practica')
  })

  it('cambiar la retefuente manda el decimal tal cual (3.5 no es 35) y nada más', async () => {
    const props = render({ agency: { ...AGENCY, retefuenteArrendamientoPorcentaje: 3.5 } })
    enterEditMode()
    const input = container.querySelector('[data-testid="retefuente-arrendamiento"]') as HTMLInputElement
    expect(input.value).toBe('3.5')
    act(() => {
      setInputValue(input, '2.5')
    })
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ retefuenteArrendamientoPorcentaje: 2.5 })
  })

  it('configurar la reteICA manda el por mil como número; vaciarla manda null', async () => {
    const props = render({ agency: { ...AGENCY, reteicaPorMil: null } })
    enterEditMode()
    const input = container.querySelector('[data-testid="reteica-por-mil"]') as HTMLInputElement
    expect(input.value).toBe('')
    act(() => {
      setInputValue(input, '9.66')
    })
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ reteicaPorMil: 9.66 })

    const props2 = render({ agency: { ...AGENCY, reteicaPorMil: 9.66 } })
    enterEditMode()
    const input2 = container.querySelector('[data-testid="reteica-por-mil"]') as HTMLInputElement
    act(() => {
      setInputValue(input2, '')
    })
    await clickSave()
    expect(props2.onSave).toHaveBeenCalledWith({ reteicaPorMil: null })
  })

  it('rechaza un IVA de 150 % sin llamar al back', async () => {
    const props = render()
    enterEditMode()
    const input = container.querySelector('[data-testid="iva-porcentaje"]') as HTMLInputElement
    act(() => {
      setInputValue(input, '150')
    })
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Un porcentaje entre 0 y 100')
  })

  it('la base mínima se lee en pesos enteros y vacía manda null', async () => {
    const props = render({ agency: { ...AGENCY, baseMinimaRetefuenteCop: null } })
    enterEditMode()
    const input = container.querySelector('[data-testid="base-minima-retefuente"]') as HTMLInputElement
    act(() => {
      setInputValue(input, '523740')
    })
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ baseMinimaRetefuenteCop: 523740 })
  })

  it('un NIT sin dígito de verificación ya no bloquea guardar la configuración', async () => {
    const props = render({ agency: { ...AGENCY, nit: '1004997858' } })
    enterEditMode()
    const input = container.querySelector('[data-testid="dias-de-plazo"]') as HTMLInputElement
    act(() => {
      setInputValue(input, '5')
    })
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ diasDePlazo: 5 })
  })

  it('un NIT con letras sigue siendo inválido', async () => {
    const props = render({ agency: { ...AGENCY, nit: 'ABC-1' } })
    enterEditMode()
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
  })
})
