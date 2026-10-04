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
import { ApiError } from '@/lib/api/client'
import { toast } from 'sonner'
import {
  MENSAJE_NIT_INVALIDO,
  MENSAJES_DE_LA_INMOBILIARIA,
} from '@/lib/configuracion/limites-de-la-inmobiliaria'

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

  it('un NIT con letras sigue siendo inválido (la regla del registro, con su frase)', async () => {
    // 02-10-2026: el NIT sólo se escribe mientras la agencia no tiene uno; uno
    // ya guardado está bloqueado y NO se valida (no puede impedir guardar lo
    // demás: la persona no lo puede cambiar).
    const props = render({ agency: { ...AGENCY, nit: null } })
    enterEditMode()
    act(() => setInputValue(container.querySelector('input[placeholder="901.234.567-8"]') as HTMLInputElement, 'ABC-1'))
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.querySelector('#perfil-nit-error')?.textContent).toBe(MENSAJE_NIT_INVALIDO)
  })

  it('un NIT guardado con formato viejo (bloqueado) no impide guardar otro campo', async () => {
    const props = render({ agency: { ...AGENCY, nit: 'ABC-1' } })
    enterEditMode()
    act(() => setInputValue(container.querySelector('[data-testid="dias-de-plazo"]') as HTMLInputElement, '5'))
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ diasDePlazo: 5 })
  })

  it('el NIT se manda sin puntos ni espacios (el back usa la regla del registro)', async () => {
    const props = render({ agency: { ...AGENCY, nit: null } })
    enterEditMode()
    act(() => setInputValue(container.querySelector('input[placeholder="901.234.567-8"]') as HTMLInputElement, '901.234.567-8'))
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ nit: '901234567-8' })
  })
})

describe('<ConfigPerfilAgencia> — perfil fiscal de la agencia (agenteRetenedor*)', () => {
  // 🔴 T-0107: Agency.responsableIva es de TRES estados
  // (`liquidacion-del-propietario.ts:cobraIvaSobreLaComision`, `!== false`
  // cobra IVA). null = no declarado → SE COBRA; false = declarado no
  // responsable → NO se cobra, y es una declaración legal (commit 90720fc3,
  // 22-09, evitó repetir los 40.132 cuotas con IVA en cero). Un checkbox sin
  // marcar que mande `false` apagaría el IVA de una agencia en silencio.
  // Estas pruebas cubren los tres campos `agenteRetenedor*`, que comparten la
  // misma semántica de tres estados (ver back: hoy sin consumidor propio,
  // pero guardados igual de protegidos por si mañana lo tienen).

  it('sin tocar nada, guardar NUNCA manda false para un campo fiscal no declarado (null)', async () => {
    const props = render({
      agency: {
        ...AGENCY,
        agenteRetenedorRenta: null,
        agenteRetenedorIva: null,
        agenteRetenedorIca: null,
      },
    })
    enterEditMode()

    // Toca un campo cualquiera, no los fiscales
    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, 'Inmobiliaria XYZ')
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledTimes(1)
    const payload = (props.onSave as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(payload).not.toHaveProperty('agenteRetenedorRenta')
    expect(payload).not.toHaveProperty('agenteRetenedorIva')
    expect(payload).not.toHaveProperty('agenteRetenedorIca')
    expect(payload).toEqual({ name: 'Inmobiliaria XYZ' })
  })

  it('simplemente entrar y salir de edición sin tocar nada no manda ningún campo fiscal', async () => {
    const props = render({
      agency: { ...AGENCY, agenteRetenedorRenta: null, agenteRetenedorIva: null, agenteRetenedorIca: null },
    })
    enterEditMode()
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
  })

  it('muestra «Sin definir» en modo lectura cuando el campo es null, no "No"', () => {
    render({
      agency: { ...AGENCY, agenteRetenedorRenta: null, agenteRetenedorIva: true, agenteRetenedorIca: false },
    })
    const text = container.textContent ?? ''
    expect(text).toContain('Sin definir')
  })

  it('clickear «No» en un campo sin definir manda { agenteRetenedorIca: false } explícitamente', async () => {
    const props = render({ agency: { ...AGENCY, agenteRetenedorIca: null } })
    enterEditMode()

    const btnNo = container.querySelector(
      '[data-testid="fiscal-agenteRetenedorIca-false"]',
    ) as HTMLButtonElement
    expect(btnNo).toBeTruthy()
    act(() => {
      btnNo.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ agenteRetenedorIca: false })
  })

  it('clickear «Sí» manda { agenteRetenedorRenta: true }', async () => {
    const props = render({ agency: { ...AGENCY, agenteRetenedorRenta: null } })
    enterEditMode()

    const btnSi = container.querySelector(
      '[data-testid="fiscal-agenteRetenedorRenta-true"]',
    ) as HTMLButtonElement
    act(() => {
      btnSi.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ agenteRetenedorRenta: true })
  })

  it('volver a declarar «Sin definir» sobre un campo ya en true manda null explícito', async () => {
    const props = render({ agency: { ...AGENCY, agenteRetenedorIva: true } })
    enterEditMode()

    const btnVacio = container.querySelector(
      '[data-testid="fiscal-agenteRetenedorIva-null"]',
    ) as HTMLButtonElement
    act(() => {
      btnVacio.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ agenteRetenedorIva: null })
  })

  it('cancelar la edición después de tocar un campo fiscal no manda nada', async () => {
    const props = render({ agency: { ...AGENCY, agenteRetenedorRenta: null } })
    enterEditMode()

    const btnSi = container.querySelector(
      '[data-testid="fiscal-agenteRetenedorRenta-true"]',
    ) as HTMLButtonElement
    act(() => {
      btnSi.click()
    })

    act(() => {
      findButton('Cancelar').click()
    })

    enterEditMode()
    await clickSave()

    expect(props.onSave).not.toHaveBeenCalled()
  })

  it('responsableIva se muestra de sólo lectura (no hay botones para tocarlo acá) y enlaza a Mandato', () => {
    render({ agency: { ...AGENCY, responsableIva: null } })
    expect(container.querySelector('[data-testid^="fiscal-responsableIva-"]')).toBeNull()
    const link = container.querySelector('a[href="/panel/inmobiliaria/configuracion/mandato"]')
    expect(link).toBeTruthy()
  })
})

// ── T-0107 ronda 2 ──────────────────────────────────────────────────────────
// Verificación encontró: `agenteRetenedorIva` y `agenteRetenedorIca` SÍ tienen
// consumidor a nivel agencia — `facturas-de-proveedor.service.ts:tarifasPara`
// (cuentas por pagar). Y no comparten semántica: IVA es opt-in (sólo `true`
// practica), ICA es opt-out (sólo `false` NO practica). Un control uniforme
// "Sin definir" en los tres da a entender que las dos filas se comportan
// igual, y no es así. `agenteRetenedorRenta` sigue sin ningún consumidor a
// nivel agencia (confirmado de nuevo, exhaustivo, sin match fuera de
// Propietario/Contrato) — se lo trata distinto: mismo control, pero con una
// leyenda fija que dice que no tiene efecto todavía.
describe('<ConfigPerfilAgencia> — semántica real de cada campo (T-0107 ronda 2)', () => {
  it('el botón «Sin definir» de reteIVA dice que hoy NO practica (opt-in)', () => {
    render()
    enterEditMode()
    const boton = container.querySelector('[data-testid="fiscal-agenteRetenedorIva-null"]')
    expect(boton?.textContent ?? '').toMatch(/no practica/i)
  })

  it('el botón «Sin definir» de reteICA dice que hoy SÍ practica (opt-out)', () => {
    render()
    enterEditMode()
    const boton = container.querySelector('[data-testid="fiscal-agenteRetenedorIca-null"]')
    expect(boton?.textContent ?? '').toMatch(/sí practica|si practica/i)
  })

  it('reteIVA en null: la leyenda dice que se comporta como «No» y no practica', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIva: null } })
    const leyenda = container.querySelector('[data-testid="efecto-agenteRetenedorIva"]')
    expect(leyenda?.textContent ?? '').toMatch(/no practica/i)
    expect(leyenda?.textContent ?? '').toMatch(/«no»|como no/i)
  })

  it('reteIVA en true: la leyenda dice que sí practica', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIva: true } })
    const leyenda = container.querySelector('[data-testid="efecto-agenteRetenedorIva"]')
    expect(leyenda?.textContent ?? '').toMatch(/practica reteiva/i)
    expect(leyenda?.textContent).not.toMatch(/no practica/i)
  })

  it('reteICA en null: la leyenda dice que se comporta como «Sí» y sí practica', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIca: null } })
    const leyenda = container.querySelector('[data-testid="efecto-agenteRetenedorIca"]')
    expect(leyenda?.textContent ?? '').toMatch(/sí practica|si practica/i)
    expect(leyenda?.textContent ?? '').toMatch(/«sí»|como sí|como si/i)
  })

  it('reteICA en false: la leyenda dice que no practica', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIca: false } })
    const leyenda = container.querySelector('[data-testid="efecto-agenteRetenedorIca"]')
    expect(leyenda?.textContent ?? '').toMatch(/no practica/i)
  })

  it('la leyenda de reteIVA/reteICA reacciona en vivo al click, antes de guardar', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIva: null } })
    enterEditMode()
    const leyendaAntes = container.querySelector('[data-testid="efecto-agenteRetenedorIva"]')?.textContent ?? ''
    expect(leyendaAntes).toMatch(/no practica/i)

    const btnSi = container.querySelector('[data-testid="fiscal-agenteRetenedorIva-true"]') as HTMLButtonElement
    act(() => {
      btnSi.click()
    })

    const leyendaDespues = container.querySelector('[data-testid="efecto-agenteRetenedorIva"]')?.textContent ?? ''
    expect(leyendaDespues).toMatch(/practica reteiva/i)
    expect(leyendaDespues).not.toMatch(/no practica/i)
  })

  it('agenteRetenedorRenta muestra que no tiene efecto en el sistema todavía, sea cual sea el valor', () => {
    const propsTrue = render({ agency: { ...AGENCY, agenteRetenedorRenta: true } })
    expect(
      container.querySelector('[data-testid="efecto-agenteRetenedorRenta"]')?.textContent ?? '',
    ).toMatch(/no tiene (ningún )?efecto/i)
    void propsTrue
  })

  it('clickear «No» en reteIVA sin definir manda { agenteRetenedorIva: false } explícitamente', async () => {
    const props = render({ agency: { ...AGENCY, agenteRetenedorIva: null } })
    enterEditMode()

    const btnNo = container.querySelector('[data-testid="fiscal-agenteRetenedorIva-false"]') as HTMLButtonElement
    act(() => {
      btnNo.click()
    })

    await clickSave()

    expect(props.onSave).toHaveBeenCalledWith({ agenteRetenedorIva: false })
  })

  it('sin tocar reteIVA/reteICA, guardar otro campo nunca los manda (aunque tengan defaults opuestos)', async () => {
    const props = render({
      agency: { ...AGENCY, agenteRetenedorIva: null, agenteRetenedorIca: null },
    })
    enterEditMode()

    const nameInput = Array.from(container.querySelectorAll('input')).find(
      (i) => i.value === 'Inmobiliaria ABC',
    ) as HTMLInputElement
    act(() => {
      setInputValue(nameInput, 'Inmobiliaria XYZ')
    })

    await clickSave()

    const payload = (props.onSave as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(payload).not.toHaveProperty('agenteRetenedorIva')
    expect(payload).not.toHaveProperty('agenteRetenedorIca')
    expect(payload).toEqual({ name: 'Inmobiliaria XYZ' })
  })

  it('ReteIVA se marca «no se aplica» cuando la agencia no es agente de reteIVA (null u false)', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIva: null, reteivaPorcentaje: 15 } })
    expect(container.querySelector('[data-testid="reteiva-no-se-aplica"]')).toBeTruthy()
  })

  it('ReteIVA NO se marca cuando sí es agente de reteIVA', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIva: true, reteivaPorcentaje: 15 } })
    expect(container.querySelector('[data-testid="reteiva-no-se-aplica"]')).toBeNull()
  })

  it('ReteICA se marca «no se aplica» sólo cuando está declarado que no es agente (false)', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIca: false, reteicaPorMil: 9.66 } })
    expect(container.querySelector('[data-testid="reteica-no-se-aplica"]')).toBeTruthy()
  })

  it('ReteICA NO se marca cuando está sin definir (se sigue practicando por defecto)', () => {
    render({ agency: { ...AGENCY, agenteRetenedorIca: null, reteicaPorMil: 9.66 } })
    expect(container.querySelector('[data-testid="reteica-no-se-aplica"]')).toBeNull()
  })
})

describe('<ConfigPerfilAgencia> — dirección y código postal con la regla del registro (QA 01-10)', () => {
  const porTestId = (id: string) => container.querySelector(`[data-testid="${id}"]`) as HTMLInputElement

  it('🔴 una dirección con símbolos no se guarda: borde rojo y mensaje', async () => {
    const props = render()
    enterEditMode()
    act(() => setInputValue(porTestId('perfil-direccion'), '!@#$%^&*()(*&^%$'))
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
    expect(porTestId('perfil-direccion').getAttribute('aria-invalid')).toBe('true')
    expect(container.textContent).toMatch(/no van en una dirección/)
  })

  it('una dirección real se guarda limpia', async () => {
    const props = render()
    enterEditMode()
    act(() => setInputValue(porTestId('perfil-direccion'), ' Calle 93   # 11-27 Of. 502 '))
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ address: 'Calle 93 # 11-27 Of. 502' })
  })

  it('el código postal sólo deja dígitos, hasta seis, sin maxLength', () => {
    render()
    enterEditMode()
    const postal = porTestId('perfil-codigo-postal')
    expect(postal.getAttribute('inputmode')).toBe('numeric')
    expect(postal.hasAttribute('maxlength')).toBe(false)
    act(() => setInputValue(postal, '11a02-21 99'))
    expect(porTestId('perfil-codigo-postal').value).toBe('110221')
  })

  it('un código postal de otro departamento no se guarda', async () => {
    const props = render({ agency: { ...AGENCY, department: 'Antioquia', postalCode: '' } })
    enterEditMode()
    act(() => setInputValue(porTestId('perfil-codigo-postal'), '110221'))
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
    expect(container.textContent).toContain('Ese código postal es de Bogotá D.C. Los de Antioquia empiezan por 05.')
  })

  it('lo guardado antes de la regla no impide guardar otro campo', async () => {
    // Cundinamarca con 110221 (prefijo de Bogotá) y una dirección con «;».
    const props = render({ agency: { ...AGENCY, address: 'Cra 11 #82-76; Of. 501' } })
    enterEditMode()
    const web = Array.from(container.querySelectorAll('input')).find((i) => i.value === 'https://abc.co')!
    act(() => setInputValue(web, 'https://abc.com.co'))
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ website: 'https://abc.com.co' })
  })
})

/**
 * 02-10-2026 · tanda 2 del sistema de errores (A6): los topes del back
 * atajados antes de mandar, y los `campos` de un 400 en su campo.
 */
describe('<ConfigPerfilAgencia> — errores en su campo', () => {
  const porId = (id: string) => container.querySelector(`#${id}`) as HTMLInputElement | null
  /** Por su valor: así la prueba también corre contra el formulario de antes. */
  const porValor = (valor: string) =>
    Array.from(container.querySelectorAll('input')).find((i) => i.value === valor) as HTMLInputElement

  it('un nombre de 201 caracteres no se manda: la frase del back en su campo', async () => {
    const props = render()
    enterEditMode()
    act(() => setInputValue(porValor('Inmobiliaria ABC'), 'a'.repeat(201)))
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
    expect(porId('perfil-name-error')?.textContent).toBe(MENSAJES_DE_LA_INMOBILIARIA.nombreLargo)
    expect(porId('perfil-name')?.getAttribute('aria-invalid')).toBe('true')
  })

  it('el tope sólo mira lo que cambió: un teléfono viejo de 25 caracteres no impide guardar otro campo', async () => {
    const props = render({ agency: { ...AGENCY, phone: '+57 601 345 6789 ext. 1234' } })
    enterEditMode()
    act(() => setInputValue(porValor('Bogota'), 'Medellín'))
    await clickSave()
    expect(props.onSave).toHaveBeenCalledWith({ city: 'Medellín' })
  })

  it('un monto de doble aprobación de once cifras no se manda', async () => {
    const props = render()
    enterEditMode()
    act(() =>
      setInputValue(
        container.querySelector('[data-testid="dispersion-monto-doble-aprobacion"]') as HTMLInputElement,
        '30000000000',
      ),
    )
    await clickSave()
    expect(props.onSave).not.toHaveBeenCalled()
    expect(porId('perfil-dispersionMontoDobleAprobacion-error')?.textContent).toBe(
      MENSAJES_DE_LA_INMOBILIARIA.montoDobleAprobacionMaximo,
    )
  })

  it('🔴 un 400 con campos pinta cada error en su campo, con el foco en el primero, y sólo lo suelto va al toast', async () => {
    const error = new ApiError(
      400,
      ['El correo puede tener hasta 255 caracteres.', 'El nombre del representante legal puede tener hasta 200 caracteres.', 'Algo que este formulario no muestra.'],
      'DATOS_INVALIDOS',
      {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        campos: [
          { campo: 'email', regla: 'longitud_maxima', mensaje: 'El correo puede tener hasta 255 caracteres.' },
          {
            campo: 'legalRepresentative',
            regla: 'longitud_maxima',
            mensaje: 'El nombre del representante legal puede tener hasta 200 caracteres.',
          },
          { campo: 'branding.socials.x', regla: 'longitud_maxima', mensaje: 'Algo que este formulario no muestra.' },
        ],
      },
    )
    const props = render({ onSave: vi.fn().mockRejectedValue(error) })
    enterEditMode()
    act(() => setInputValue(porValor('Bogota'), 'Medellín'))
    await clickSave()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })

    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(porId('perfil-email-error')?.textContent).toBe('El correo puede tener hasta 255 caracteres.')
    expect(porId('perfil-legalRepresentative-error')?.textContent).toBe(
      'El nombre del representante legal puede tener hasta 200 caracteres.',
    )
    expect(porId('perfil-email')?.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(porId('perfil-email'))
    // Lo que el formulario no muestra va al toast; lo demás, no.
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith('Algo que este formulario no muestra.')
    // Sigue en edición, con lo escrito.
    expect(porValor('Medellín')).toBeTruthy()
  })

  it('un 5xx no pinta campos ni repite el toast (lo dice el padre por el traductor) y se queda en edición', async () => {
    const error = new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
      statusCode: 500,
      code: 'ERROR_INTERNO',
      referencia: 'a1b2c3d4',
    })
    const props = render({ onSave: vi.fn().mockRejectedValue(error) })
    enterEditMode()
    act(() => setInputValue(porValor('Bogota'), 'Medellín'))
    await clickSave()
    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
    expect(findButton('Guardar cambios')).toBeTruthy()
  })
})

/*
 * 🔴 CONSISTENCIA (04-10-2026): «Fijar los días de plazo» caía al tope del
 * Perfil y el campo estaba escondido detrás del «Editar» de todo el perfil.
 * Con `#perfil-diasDePlazo` quien puede editar entra directo y el foco queda en
 * el campo; y un plazo nunca fijado se dice «Sin fijar», no «0».
 */
describe('<ConfigPerfilAgencia> · llegar al campo de los días de plazo', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  async function pintarConAncla(props: Partial<React.ComponentProps<typeof ConfigPerfilAgencia>> = {}) {
    window.history.replaceState(null, '', '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo')
    render(props)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
  }

  it('con el ancla y permiso: abre la edición y deja el foco en el campo', async () => {
    await pintarConAncla()
    const campo = container.querySelector<HTMLInputElement>('[data-testid="dias-de-plazo"]')
    expect(campo).not.toBeNull()
    expect(document.activeElement).toBe(campo)
  })

  it('con el ancla y sin permiso: no abre la edición, resalta el dato', async () => {
    await pintarConAncla({ canEdit: false })
    expect(container.querySelector('[data-testid="dias-de-plazo"]')).toBeNull()
    const dato = container.querySelector('[data-testid="plazo-de-lectura"]')
    expect(dato?.id).toBe('perfil-diasDePlazo')
    expect(dato?.className).toContain('ring-2')
  })

  it('sin el ancla: el perfil abre en lectura como siempre', () => {
    render()
    expect(container.querySelector('[data-testid="dias-de-plazo"]')).toBeNull()
  })

  it('un plazo nunca fijado se lee «Sin fijar», no «0»', () => {
    render({ agency: { ...AGENCY, diasDePlazo: 0, plazoDePagoFijadoAt: null } as AgencyProfile })
    const dato = container.querySelector('[data-testid="plazo-de-lectura"]')
    expect(dato?.textContent).toContain('Sin fijar')
  })

  it('un plazo fijado en 0 se lee 0', () => {
    render({
      agency: { ...AGENCY, diasDePlazo: 0, plazoDePagoFijadoAt: '2026-10-01T00:00:00.000Z' } as AgencyProfile,
    })
    const dato = container.querySelector('[data-testid="plazo-de-lectura"]')
    expect(dato?.textContent).not.toContain('Sin fijar')
    expect(dato?.textContent).toContain('0')
  })
})
