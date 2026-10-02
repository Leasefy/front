/**
 * Formularios de cobranza: el error va a su campo (02-10-2026, tanda 2 de
 * errores, A6).
 *
 * Acuerdo general, resolver una escalación, resolver una disputa y los
 * umbrales del reporte. Lo que cada prueba fija:
 *   · un 400 con `campos` pinta el error debajo de su campo y le da el foco;
 *   · un 5xx dice «de nuestro lado» con la referencia (antes: «Error 500»,
 *     «error 500», el cuerpo crudo);
 *   · un `fetch` que no salió (status 0) habla de la conexión;
 *   · lo que el servidor rechazaría se ataja ANTES, con su frase en español.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'

void React

const { routerPush } = vi.hoisted(() => ({ routerPush: vi.fn() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn(), back: vi.fn() }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: 'es',
    formatCurrency: (n: number) => `$${n}`,
    formatDate: () => '1 oct',
    formatRelativeDate: () => 'hace un día',
  }),
}))
vi.mock('@/components/providers/SmoothScroll', () => ({ useLenis: () => null }))
vi.mock('@/components/ui/responsive-dialog', () => {
  const Pasa = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  return {
    ResponsiveDialog: ({ open, children }: { open: boolean; children?: React.ReactNode }) =>
      open ? <div>{children}</div> : null,
    ResponsiveDialogContent: Pasa,
    ResponsiveDialogHeader: Pasa,
    ResponsiveDialogTitle: Pasa,
    ResponsiveDialogFooter: Pasa,
  }
})
// El Select de Radix abre un portal que happy-dom no maneja: un <select> nativo
// alcanza para elegir una opción.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string
    onValueChange?: (v: string) => void
    children?: React.ReactNode
  }) => (
    <select data-testid="select-nativo" value={value ?? ''} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="">—</option>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => (
    <option value={value}>{typeof children === 'string' ? children : value}</option>
  ),
}))

import { AcuerdoGeneralForm, BORRADOR_VACIO } from './AcuerdoGeneralForm'
import { EscalationResolveModal } from './EscalationResolveModal'
import { DisputaDetailPanel } from './DisputaDetailPanel'
import { ThresholdEditor } from './ThresholdEditor'

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  routerPush.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function pintar(nodo: React.ReactNode) {
  await act(async () => {
    root.render(nodo)
  })
}

async function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  await act(async () => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function elegir(select: HTMLSelectElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(select, valor)
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function clic(el: Element | null) {
  if (!el) throw new Error('No está el elemento')
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}

const $ = <T extends Element = HTMLElement>(sel: string) => contenedor.querySelector<T>(sel)

const SOBRE_400 = (campo: string, mensaje: string) =>
  new ApiError(400, [mensaje], 'DATOS_INVALIDOS', {
    statusCode: 400,
    code: 'DATOS_INVALIDOS',
    message: [mensaje],
    campos: [{ campo, regla: 'maximo', mensaje }],
  })

const UN_500 = () =>
  new ApiError(500, '', undefined, { error: 'Internal Server Error', requestId: 'deadbeef-0000' })

// ── Acuerdo general ──────────────────────────────────────────────────────────

describe('AcuerdoGeneralForm', () => {
  async function montar(onGuardar: (p: unknown) => Promise<void>) {
    await pintar(
      <AcuerdoGeneralForm titulo="Crear acuerdo general" inicial={BORRADOR_VACIO} onGuardar={onGuardar} />,
    )
    await escribir($<HTMLInputElement>('#ag-nombre')!, 'Cierre de fin de mes')
    await escribir($<HTMLInputElement>('#ag-condicion')!, 'Paga la inicial en 7 días')
  }

  it('un rango de días al revés se ataja antes de enviar, con la frase del micro, en su campo y con el foco', async () => {
    const onGuardar = vi.fn().mockResolvedValue(undefined)
    await montar(onGuardar)
    await escribir($<HTMLInputElement>('#ag-min-dias')!, '60')
    await escribir($<HTMLInputElement>('#ag-max-dias')!, '30')
    await clic($('[data-testid="acuerdo-general-guardar"]'))
    expect(onGuardar).not.toHaveBeenCalled()
    expect($('#ag-max-dias-error')?.textContent).toBe(
      'El rango de días de mora está al revés: el mínimo es mayor que el máximo.',
    )
    expect(document.activeElement).toBe($('#ag-max-dias'))
  })

  it('un 400 con `campos` pinta el error en su campo y le da el foco; nada arriba de Guardar', async () => {
    const onGuardar = vi.fn().mockRejectedValue(SOBRE_400('priority', 'La prioridad no puede pasar de 1000.'))
    await montar(onGuardar)
    await clic($('[data-testid="acuerdo-general-guardar"]'))
    expect($('#ag-prioridad-error')?.textContent).toBe('La prioridad no puede pasar de 1000.')
    expect(document.activeElement).toBe($('#ag-prioridad'))
    expect(contenedor.querySelector('main [role="alert"].rounded-lg')).toBeNull()
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('un 5xx dice «de nuestro lado» con la referencia', async () => {
    await montar(vi.fn().mockRejectedValue(UN_500()))
    await clic($('[data-testid="acuerdo-general-guardar"]'))
    const alerta = [...contenedor.querySelectorAll('[role="alert"]')].map((a) => a.textContent).join(' ')
    expect(alerta).toContain('No pudimos guardar el acuerdo: algo falló de nuestro lado')
    expect(alerta).toContain('deadbeef')
  })

  it('un `fetch` que no salió (status 0) habla de la conexión', async () => {
    await montar(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await clic($('[data-testid="acuerdo-general-guardar"]'))
    const alerta = [...contenedor.querySelectorAll('[role="alert"]')].map((a) => a.textContent).join(' ')
    expect(alerta).toMatch(/conexi[oó]n/i)
  })
})

// ── Resolver una escalación ──────────────────────────────────────────────────

describe('EscalationResolveModal', () => {
  const TEXTO_LARGO = 'Se habló con el deudor y se acordó un plan de pago en tres cuotas a partir del viernes próximo.'

  async function montarYLlenar(onResolve: (...a: unknown[]) => Promise<unknown>) {
    await pintar(
      <EscalationResolveModal escalationId="e-1" isOpen onClose={vi.fn()} onResolve={onResolve as never} />,
    )
    const select = $<HTMLSelectElement>('[data-testid="select-nativo"]')!
    const primera = [...select.options].find((o) => o.value !== '' && o.value !== 'escalated-to-legal')!
    await elegir(select, primera.value)
    await escribir($<HTMLTextAreaElement>('#resolve-text')!, TEXTO_LARGO)
  }

  function enviar() {
    return clic($('[data-testid="resolve-submit-button"]'))
  }

  it('un 400 con `campos` pinta el error debajo del texto y le da el foco', async () => {
    const onResolve = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      fallo: SOBRE_400('resolution_text', 'El texto de la resolución puede tener hasta 2000 caracteres.'),
    })
    await montarYLlenar(onResolve)
    await enviar()
    expect(onResolve).toHaveBeenCalled()
    expect($('#resolve-text-error')?.textContent).toBe(
      'El texto de la resolución puede tener hasta 2000 caracteres.',
    )
    expect(document.activeElement).toBe($('#resolve-text'))
  })

  it('un 5xx dice «de nuestro lado» con la referencia, no «Error 500»', async () => {
    await montarYLlenar(vi.fn().mockResolvedValue({ ok: false, status: 500, fallo: UN_500() }))
    await enviar()
    const texto = $('[data-testid="escalacion-resolver-error"]')?.textContent ?? ''
    expect(texto).toContain('No pudimos resolver la escalación: algo falló de nuestro lado')
    expect(texto).toContain('deadbeef')
    expect(texto).not.toBe('Error 500')
  })

  it('un `fetch` que no salió (status 0) habla de la conexión', async () => {
    await montarYLlenar(
      vi.fn().mockResolvedValue({ ok: false, status: 0, fallo: new TypeError('Failed to fetch') }),
    )
    await enviar()
    expect($('[data-testid="escalacion-resolver-error"]')?.textContent).toMatch(/conexi[oó]n/i)
  })
})

// ── Resolver una disputa ─────────────────────────────────────────────────────

describe('DisputaDetailPanel — resolver', () => {
  const DISPUTA = {
    id: 'disp-1',
    debtor_id: '00000000-0000-4000-8000-000000000001',
    debtor_name: 'Ana Gómez',
    status: 'open',
    reason: 'El saldo no corresponde.',
    disputed_amount: null,
    opened_at: '2026-10-01T00:00:00.000Z',
    resolved_at: null,
    outcome: null,
    resolution_note: null,
  }

  async function montarYLlenar(onResolve: (...a: unknown[]) => Promise<unknown>) {
    await pintar(<DisputaDetailPanel dispute={DISPUTA as never} onResolve={onResolve as never} />)
    await elegir($<HTMLSelectElement>('[data-testid="select-nativo"]')!, 'procedente')
    await escribir($<HTMLTextAreaElement>('#resolver-note')!, 'Se revisó el estado de cuenta y procede.')
  }

  it('un 400 con `campos` pinta el error debajo de la nota y le da el foco', async () => {
    const onResolve = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      recommendation: null,
      fallo: SOBRE_400('resolutionNote', 'La nota puede tener hasta 2000 caracteres.'),
    })
    await montarYLlenar(onResolve)
    await clic($('[data-testid="disputa-resolver-submit"]'))
    expect($('#resolver-note-error')?.textContent).toBe('La nota puede tener hasta 2000 caracteres.')
    expect(document.activeElement).toBe($('#resolver-note'))
  })

  it('un 5xx dice «de nuestro lado» con la referencia, no «error 500»', async () => {
    await montarYLlenar(vi.fn().mockResolvedValue({ ok: false, status: 500, recommendation: null, fallo: UN_500() }))
    await clic($('[data-testid="disputa-resolver-submit"]'))
    const texto = $('[data-testid="disputa-resolver-error"]')?.textContent ?? ''
    expect(texto).toContain('No pudimos resolver la disputa: algo falló de nuestro lado')
    expect(texto).toContain('deadbeef')
  })

  it('un `fetch` que no salió (status 0) habla de la conexión, no «el servicio no está disponible»', async () => {
    await montarYLlenar(
      vi.fn().mockResolvedValue({ ok: false, status: 0, recommendation: null, fallo: new TypeError('Failed to fetch') }),
    )
    await clic($('[data-testid="disputa-resolver-submit"]'))
    const texto = $('[data-testid="disputa-resolver-error"]')?.textContent ?? ''
    expect(texto).toMatch(/conexi[oó]n/i)
    expect(texto).not.toContain('servicio no está disponible')
  })
})

// ── Umbrales del reporte diario ──────────────────────────────────────────────

describe('ThresholdEditor', () => {
  const ACTIVO = {
    version: 3,
    top_n_debtors_in_report: 5,
    mora_dias_bucket_boundaries: [0, 8, 31, 91],
    pkr_pct_alert_below: 80,
    indice_morosidad_pct_alert_above: 10,
    compliance_violations_critical_at_least: 1,
    calls_outside_window_critical_at_least: 1,
  }

  async function montar(onSubmit: (b: unknown) => Promise<{ version: number | null }>) {
    await pintar(<ThresholdEditor active={ACTIVO as never} onSubmit={onSubmit as never} />)
  }

  async function guardar() {
    const form = contenedor.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
  }

  it('un valor fuera de rango se ataja con una frase en español (no el inglés de zod), en su campo', async () => {
    const onSubmit = vi.fn()
    await montar(onSubmit)
    await escribir($<HTMLInputElement>('#umbral-top-n')!, '80')
    await guardar()
    expect(onSubmit).not.toHaveBeenCalled()
    expect($('#umbral-top-n-error')?.textContent).toBe('Van de 1 a 50 deudores, en números enteros.')
    expect(document.activeElement).toBe($('#umbral-top-n'))
  })

  it('cortes que no suben se dicen en español (antes: «must_be_monotonically_increasing»)', async () => {
    await montar(vi.fn())
    await escribir($<HTMLInputElement>('#umbral-cortes-de-mora')!, '0,31,8')
    await guardar()
    expect($('#umbral-cortes-de-mora-error')?.textContent).toBe('Cada corte tiene que ser mayor que el anterior.')
  })

  it('un 400 con `campos` pinta el error en su campo y le da el foco', async () => {
    await montar(vi.fn().mockRejectedValue(SOBRE_400('pkr_pct_alert_below', 'El porcentaje va de 0 a 100.')))
    await guardar()
    expect($('#umbral-pkr-error')?.textContent).toBe('El porcentaje va de 0 a 100.')
    expect(document.activeElement).toBe($('#umbral-pkr'))
  })

  it('un 5xx dice «de nuestro lado» con la referencia', async () => {
    await montar(vi.fn().mockRejectedValue(UN_500()))
    await guardar()
    const texto = $('[data-testid="umbrales-error"]')?.textContent ?? ''
    expect(texto).toContain('No pudimos guardar los umbrales: algo falló de nuestro lado')
    expect(texto).toContain('deadbeef')
  })

  it('un `fetch` que no salió (status 0) habla de la conexión', async () => {
    await montar(vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await guardar()
    expect($('[data-testid="umbrales-error"]')?.textContent).toMatch(/conexi[oó]n/i)
  })

  it('un 403 dice que no hay permiso, decidido por el status (antes: «Sin permiso» por el texto)', async () => {
    await montar(vi.fn().mockRejectedValue(new ApiError(403, '', undefined, { error: 'Forbidden' })))
    await guardar()
    expect($('[data-testid="umbrales-error"]')?.textContent).toBe(
      'No tienes permiso para cambiar los umbrales. Pídeselo a un administrador.',
    )
  })
})
