/**
 * «Resolver» desde la cola humana (02-10-2026).
 *
 * La cola mandaba `{ reason }` a toda acción con motivo, y «Resolver» una
 * escalación pide `{ category, resolution_text }`: el micro respondía 400
 * SIEMPRE. Ahora el micro declara los campos de la acción y la cola los pinta.
 * Lo que se fija:
 *
 *  · el cuerpo lleva las claves declaradas (y nunca `reason`);
 *  · el cliente valida antes de mandar (obligatorio, máximo) con el error
 *    BAJO cada campo y el foco en el primero;
 *  · un 400 del micro con `campos` va a cada campo, con el foco; lo demás
 *    al toast por el traductor;
 *  · una acción SIN `campos` sigue con el motivo de siempre;
 *  · el detalle del caso (`AccionSugerida`) hace lo mismo.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toasts } = vi.hoisted(() => ({ toasts: { ok: [] as string[], error: [] as string[] } }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.ok.push(m),
    error: (m: string) => toasts.error.push(m),
  },
}))

/*
 * El Select de Radix no abre en happy-dom. Éste guarda la misma API: el
 * disparador es un botón enfocable (con el id y los aria del campo) y cada
 * opción, un botón que elige su valor.
 */
vi.mock('@/components/ui/select', async () => {
  const R = await import('react')
  type Ctx = { value?: string; onValueChange?: (v: string) => void }
  const Contexto = R.createContext<Ctx>({})
  return {
    Select: ({ value, onValueChange, children }: Ctx & { children?: React.ReactNode }) =>
      R.createElement(Contexto.Provider, { value: { value, onValueChange } }, children),
    SelectTrigger: ({ children, ...props }: { children?: React.ReactNode }) => {
      const ctx = R.useContext(Contexto)
      return R.createElement('button', { type: 'button', 'data-valor': ctx.value ?? '', ...props }, children)
    },
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: React.ReactNode }) => R.createElement('div', null, children),
    SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) => {
      const ctx = R.useContext(Contexto)
      return R.createElement(
        'button',
        { type: 'button', 'data-opcion': value, onClick: () => ctx.onValueChange?.(value) },
        children,
      )
    },
  }
})

import { ColaHumana } from './ColaHumana'
import { AccionSugerida } from './AccionSugerida'
import { falloDelMicro } from '@/lib/api/fallo-del-micro'
import type { WorkItem, WorkItemAction } from '@/lib/api/work-item'

const RESOLVER: WorkItemAction = {
  id: 'resolve',
  label: 'Resolver',
  kind: 'primary',
  method: 'POST',
  path: '/api/agency/a/cobranza/escalations/e-1/resolve',
  bodyHint: { category: 'enum', resolution_text: 'string' },
  requiresReason: true,
  campos: [
    {
      nombre: 'category',
      etiqueta: 'Categoría',
      tipo: 'opcion',
      obligatorio: true,
      opciones: [
        { valor: 'compromise', etiqueta: 'Acuerdo de pago' },
        { valor: 'customer-rejected', etiqueta: 'El cliente lo rechazó' },
        { valor: 'escalated-to-legal', etiqueta: 'Pasa a jurídico' },
        { valor: 'false-positive', etiqueta: 'Falso positivo' },
        { valor: 'other', etiqueta: 'Otro' },
      ],
    },
    { nombre: 'resolution_text', etiqueta: 'Cómo se resolvió', tipo: 'texto', obligatorio: true, minimo: 1, maximo: 2000 },
  ],
}

/** La misma acción como la manda un micro viejo: sin `campos`. */
const RESOLVER_SIN_CAMPOS: WorkItemAction = { ...RESOLVER, campos: undefined }

const item = (actions: WorkItemAction[]): WorkItem => ({
  id: 'e-1',
  agente: 'cobranza',
  tipo: 'escalacion',
  estado: 'detectado',
  flags: ['necesita_humano'],
  ownerRole: 'cobrador',
  severidad: 'alta',
  titulo: 'Escalación de cobranza — pide hablar con un humano',
  accionSugerida: { label: 'Llamar al deudor', razon: 'Pidió un asesor.' },
  actions,
  subject: { kind: 'escalation', id: 'e-1' },
  createdAt: '2026-10-01T10:00:00.000-05:00',
  source: { endpoint: '/cobranza/escalations', entity: 'escalation' },
})

let container: HTMLDivElement
let root: Root
let onAction: ReturnType<typeof vi.fn>

beforeEach(() => {
  toasts.ok = []
  toasts.error = []
  onAction = vi.fn().mockResolvedValue({ ok: true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function renderCola(actions: WorkItemAction[] = [RESOLVER]) {
  act(() => {
    root.render(
      <ColaHumana
        items={[item(actions)]}
        agente="cobranza"
        onAction={onAction as unknown as React.ComponentProps<typeof ColaHumana>['onAction']}
      />,
    )
  })
}

function boton(re: RegExp, dentro: ParentNode = container): HTMLButtonElement {
  const b = Array.from(dentro.querySelectorAll('button')).find((x) => re.test((x.textContent ?? '').trim()))
  if (!b) throw new Error(`No hay botón ${re}`)
  return b as HTMLButtonElement
}

const formulario = () => container.querySelector('[data-testid="formulario-de-la-accion"]') as HTMLFormElement | null
const campo = (sufijo: string) => container.querySelector(`[id$="-${sufijo}"]`) as HTMLElement | null
const errorDe = (sufijo: string) => container.querySelector(`[id$="-${sufijo}-error"]`)?.textContent ?? ''

function escribir(area: HTMLTextAreaElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(area, valor)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Espera al cuadro siguiente: el foco va con `requestAnimationFrame`. */
const unCuadro = () => act(async () => { await new Promise((r) => setTimeout(r, 40)) })

async function enviar() {
  await act(async () => {
    formulario()!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await unCuadro()
}

describe('ColaHumana — una acción que declara sus campos', () => {
  it('pinta un campo por cada uno declarado (las cinco opciones y el texto con contador), no el motivo', () => {
    renderCola()
    act(() => boton(/^Resolver$/).click())
    expect(formulario()).not.toBeNull()
    expect(container.querySelector('#reason-e-1')).toBeNull()
    expect(container.querySelectorAll('[data-opcion]')).toHaveLength(5)
    expect(container.querySelector('textarea')).not.toBeNull()
    expect(container.querySelector('[data-testid="contador-resolution_text"]')?.textContent).toMatch(/0\s*\/\s*2\.000/)
    expect(formulario()!.textContent).toContain('Categoría')
    expect(formulario()!.textContent).toContain('Cómo se resolvió')
  })

  it('🔴 manda el cuerpo con las claves del micro (category, resolution_text) y no `reason`', async () => {
    renderCola()
    act(() => boton(/^Resolver$/).click())
    act(() => (container.querySelector('[data-opcion="compromise"]') as HTMLButtonElement).click())
    escribir(container.querySelector('textarea')!, '  Acordó pagar el 15 de octubre.  ')
    await enviar()

    expect(onAction).toHaveBeenCalledTimes(1)
    const [, accion, cuerpo] = onAction.mock.calls[0]
    expect(accion.id).toBe('resolve')
    expect(cuerpo).toEqual({ category: 'compromise', resolution_text: 'Acordó pagar el 15 de octubre.' })
    expect(toasts.ok).toHaveLength(1)
    // Salió bien: el formulario se cierra.
    expect(formulario()).toBeNull()
  })

  it('🔴 vacío no se manda: el error va BAJO cada campo y el foco al primero', async () => {
    renderCola()
    act(() => boton(/^Resolver$/).click())
    await enviar()

    expect(onAction).not.toHaveBeenCalled()
    expect(errorDe('category')).toBe('Elige una opción en «Categoría».')
    expect(errorDe('resolution_text')).toBe('Completa «Cómo se resolvió».')
    expect(campo('category')?.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('category'))
  })

  it('más de 2.000 caracteres: se avisa al escribir y no se manda', async () => {
    renderCola()
    act(() => boton(/^Resolver$/).click())
    act(() => (container.querySelector('[data-opcion="other"]') as HTMLButtonElement).click())
    escribir(container.querySelector('textarea')!, 'a'.repeat(2001))
    expect(errorDe('resolution_text')).toBe('«Cómo se resolvió» puede tener hasta 2.000 caracteres.')
    await enviar()
    expect(onAction).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(campo('resolution_text'))
  })

  it('🔴 un 400 del micro con `campos` va a su campo, con el foco, y lo escrito se queda', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: '400',
      fallo: await falloDelMicro({
        status: 400,
        json: async () => ({
          statusCode: 400,
          code: 'DATOS_INVALIDOS',
          message: ['Cuenta cómo se resolvió con un poco más de detalle.'],
          campos: [
            { campo: 'resolution_text', regla: 'longitud_minima', mensaje: 'Cuenta cómo se resolvió con un poco más de detalle.' },
          ],
        }),
      }),
    })
    renderCola()
    act(() => boton(/^Resolver$/).click())
    act(() => (container.querySelector('[data-opcion="compromise"]') as HTMLButtonElement).click())
    escribir(container.querySelector('textarea')!, 'ok')
    await enviar()

    expect(errorDe('resolution_text')).toBe('Cuenta cómo se resolvió con un poco más de detalle.')
    expect(campo('resolution_text')?.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(campo('resolution_text'))
    expect(toasts.error).toEqual([])
    expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe('ok')
  })

  it('un 5xx va al toast por el traductor: «de nuestro lado» con la referencia', async () => {
    onAction.mockResolvedValue({
      ok: false,
      error: '500',
      fallo: await falloDelMicro({ status: 500, json: async () => ({ error: 'boom', requestId: 'cafe0042-bbbb' }) }),
    })
    renderCola()
    act(() => boton(/^Resolver$/).click())
    act(() => (container.querySelector('[data-opcion="compromise"]') as HTMLButtonElement).click())
    escribir(container.querySelector('textarea')!, 'Pagará el 15.')
    await enviar()

    expect(toasts.error).toHaveLength(1)
    expect(toasts.error[0]).toContain('No pudimos resolver: algo falló de nuestro lado')
    expect(toasts.error[0]).toContain('cafe0042')
    expect(formulario()).not.toBeNull()
  })

  it('una acción SIN `campos` sigue con el motivo de siempre: manda `{ reason }`', async () => {
    renderCola([RESOLVER_SIN_CAMPOS])
    act(() => boton(/^Resolver$/).click())
    expect(formulario()).toBeNull()
    const area = container.querySelector('#reason-e-1') as HTMLTextAreaElement
    expect(area).not.toBeNull()
    escribir(area, 'Ya pagó')
    await act(async () => boton(/confirmar$/i).click())
    expect(onAction).toHaveBeenCalledWith(expect.anything(), RESOLVER_SIN_CAMPOS, { reason: 'Ya pagó' })
  })
})

describe('AccionSugerida (el detalle del caso) — la misma acción', () => {
  it('🔴 manda el cuerpo declarado y no `reason`', async () => {
    const enviarAccion = vi.fn().mockResolvedValue({ ok: true })
    act(() => {
      root.render(
        <AccionSugerida
          accion={{ label: 'Llamar al deudor', razon: 'Pidió un asesor.' }}
          actions={[RESOLVER]}
          onAction={enviarAccion}
        />,
      )
    })
    act(() => boton(/^Resolver$/).click())
    expect(container.querySelector('#accion-sugerida-reason')).toBeNull()
    act(() => (container.querySelector('[data-opcion="false-positive"]') as HTMLButtonElement).click())
    escribir(container.querySelector('textarea')!, 'No era una escalación.')
    await enviar()
    expect(enviarAccion).toHaveBeenCalledWith(RESOLVER, {
      category: 'false-positive',
      resolution_text: 'No era una escalación.',
    })
  })
})
