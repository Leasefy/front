/**
 * ConfigRenovacionAutomatica.test.tsx — prender la renovación automática desde
 * los ajustes de la inmobiliaria.
 *
 * Cubre: el interruptor escribe `{ renovacionAutomatica }` por el mismo
 * `onSave` del perfil y vuelve atrás si el PUT falla; el IPC se guarda al
 * confirmar y se valida como el back (0 a 30, dos decimales, coma o punto);
 * el campo vacío manda `null` (= la tabla del DANE); sin permiso de ADMIN nada
 * se puede tocar; y el pronóstico («si corriera ahora») sale de `?simular=true`
 * y no se pinta cuando no hay nada que mover ni cuando la llamada falla.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { simularMock } = vi.hoisted(() => ({ simularMock: vi.fn() }))
vi.mock('@/lib/api/renovacion-automatica.service', () => ({
  renovacionAutomaticaApi: { simular: simularMock },
}))

import { ConfigRenovacionAutomatica, leerIpc, escribirIpc } from './ConfigRenovacionAutomatica'
import type { AgencyProfile } from '@/lib/types/inmobiliaria'

const AGENCY: AgencyProfile = {
  id: 'ag-1',
  name: 'Inmobiliaria ABC',
  memberRole: 'ADMIN',
  renovacionAutomatica: false,
  ipcVigente: null,
}

const SIN_MOVIMIENTO = {
  agencias: 1,
  revisadas: 3,
  propuestas: 0,
  renovadas: 0,
  terminadas: 0,
  sinCambios: 3,
  fallidas: 0,
  simulado: true,
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  simularMock.mockResolvedValue(SIN_MOVIMIENTO)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function flush() {
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 0))
  })
}

async function render(props: Partial<React.ComponentProps<typeof ConfigRenovacionAutomatica>> = {}) {
  const defaultProps: React.ComponentProps<typeof ConfigRenovacionAutomatica> = {
    agency: AGENCY,
    onSave: vi.fn().mockResolvedValue(undefined),
    canEdit: true,
    ...props,
  }
  await act(async () => {
    root.render(<ConfigRenovacionAutomatica {...defaultProps} />)
  })
  await flush()
  return defaultProps
}

function q<T extends Element = HTMLElement>(testId: string): T | null {
  return container.querySelector<T>(`[data-testid="${testId}"]`)
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('leerIpc / escribirIpc', () => {
  it('lee el IPC con coma o con punto', () => {
    expect(leerIpc('5,2')).toBe(5.2)
    expect(leerIpc('5.2')).toBe(5.2)
    expect(leerIpc(' 13,12 ')).toBe(13.12)
    expect(leerIpc('0')).toBe(0)
    expect(leerIpc('30')).toBe(30)
  })

  it('el campo vacío es null: se usa la tabla del DANE que trae Leasefy', () => {
    expect(leerIpc('')).toBeNull()
    expect(leerIpc('   ')).toBeNull()
  })

  it('🔴 rechaza lo que el back rechaza: fuera de 0-30, tres decimales y texto', () => {
    expect(leerIpc('30,01')).toBeUndefined()
    expect(leerIpc('-1')).toBeUndefined()
    expect(leerIpc('5,123')).toBeUndefined()
    expect(leerIpc('cinco')).toBeUndefined()
    expect(leerIpc('5,')).toBeUndefined()
  })

  it('lo guardado se pinta con coma, como se escribe acá', () => {
    expect(escribirIpc(5.2)).toBe('5,2')
    expect(escribirIpc(null)).toBe('')
    expect(escribirIpc(undefined)).toBe('')
  })
})

describe('ConfigRenovacionAutomatica — el interruptor', () => {
  it('prenderlo manda { renovacionAutomatica: true } y nada más', async () => {
    const props = await render()
    await act(async () => {
      q('renovacion-automatica-switch')!.click()
    })
    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith({ renovacionAutomatica: true })
  })

  it('🔴 si el PUT falla, el interruptor vuelve a como estaba', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('403'))
    await render({ onSave })
    const sw = q('renovacion-automatica-switch')!
    await act(async () => {
      sw.click()
    })
    await flush()
    expect(sw.getAttribute('data-state')).toBe('unchecked')
  })

  it('el texto de ayuda dice lo que pasa en cada estado, sin prometer de más', async () => {
    await render()
    expect(q('renovacion-automatica-hint')!.textContent).toContain('Apagado')
    await render({ agency: { ...AGENCY, renovacionAutomatica: true } })
    // D5/D6 (17-09): prendida prorroga y extiende cuotas; ningún correo sale solo.
    const hint = q('renovacion-automatica-hint')!.textContent
    expect(hint).toContain('prorroga')
    expect(hint).toContain('Ningún correo sale solo')
  })

  it('sin ser ADMIN no se puede tocar nada y se dice por qué', async () => {
    await render({ canEdit: false })
    expect(q<HTMLButtonElement>('renovacion-automatica-switch')!.disabled).toBe(true)
    expect(q<HTMLInputElement>('renovacion-ipc-vigente')!.disabled).toBe(true)
    expect(container.textContent).toContain('Sólo un administrador')
  })
})

describe('ConfigRenovacionAutomatica — el IPC vigente', () => {
  it('guarda el IPC al salir del campo, como número', async () => {
    const props = await render()
    const input = q<HTMLInputElement>('renovacion-ipc-vigente')!
    await act(async () => {
      setInputValue(input, '5,2')
      // React mapea `onBlur` al `focusout` nativo (que sí burbujea).
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onSave).toHaveBeenCalledWith({ ipcVigente: 5.2 })
  })

  it('🔴 un IPC inválido no llega al back: se avisa y el campo vuelve al guardado', async () => {
    const props = await render({ agency: { ...AGENCY, ipcVigente: 5.2 } })
    const input = q<HTMLInputElement>('renovacion-ipc-vigente')!
    await act(async () => {
      setInputValue(input, '99')
      // React mapea `onBlur` al `focusout` nativo (que sí burbujea).
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onSave).not.toHaveBeenCalled()
    expect(q('renovacion-ipc-ayuda')!.textContent).toContain('entre 0 y 30')
    expect(input.value).toBe('5,2')
  })

  it('vaciarlo manda null: vuelve al IPC de diciembre de la tabla de Leasefy', async () => {
    const props = await render({ agency: { ...AGENCY, ipcVigente: 5.2 } })
    const input = q<HTMLInputElement>('renovacion-ipc-vigente')!
    await act(async () => {
      setInputValue(input, '')
      // React mapea `onBlur` al `focusout` nativo (que sí burbujea).
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onSave).toHaveBeenCalledWith({ ipcVigente: null })
  })

  it('escribir el mismo valor no manda nada', async () => {
    const props = await render({ agency: { ...AGENCY, ipcVigente: 5.2 } })
    const input = q<HTMLInputElement>('renovacion-ipc-vigente')!
    await act(async () => {
      setInputValue(input, '5,2')
      // React mapea `onBlur` al `focusout` nativo (que sí burbujea).
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(props.onSave).not.toHaveBeenCalled()
  })

  it('la ayuda explica de dónde sale el IPC cuando el campo está vacío', async () => {
    await render()
    expect(q('renovacion-ipc-ayuda')!.textContent).toContain(
      'IPC de diciembre del año anterior de la tabla de Leasefy',
    )
  })
})

describe('ConfigRenovacionAutomatica — el pronóstico', () => {
  it('🔴 D5: con movimiento dice cuántos se prorrogan, cuántos quedan en alerta y cuántos esperan confirmación', async () => {
    simularMock.mockResolvedValue({
      ...SIN_MOVIMIENTO,
      renovadas: 7,
      porConfirmar: 3,
      alertas: { avisoDeNoRenovacion: 1, sinUso: 1, terminoPorConfirmar: 0, renovacionEnCurso: 0 },
    })
    await render()
    const aviso = q('renovacion-pronostico')!
    expect(aviso.textContent).toContain('7 contratos se prorrogarían')
    expect(aviso.textContent).toContain('2 quedarían en alerta')
    expect(aviso.textContent).toContain('3 esperan')
    expect(aviso.textContent).toContain('00:20')
    expect(aviso.textContent).not.toContain('correo')
  })

  it('sin nada que mover no se pinta un aviso vacío', async () => {
    await render()
    expect(q('renovacion-pronostico')).toBeNull()
  })

  it('🔴 un fallo de red NO se pinta como «no va a pasar nada»', async () => {
    simularMock.mockRejectedValue(new Error('500'))
    await render()
    expect(q('renovacion-pronostico')).toBeNull()
    expect(q('config-renovacion-automatica')).toBeTruthy()
  })

  it('sin permiso de ADMIN ni se pregunta: el endpoint pide operaciones:edit', async () => {
    await render({ canEdit: false })
    expect(simularMock).not.toHaveBeenCalled()
  })

  /*
   * 🔴 Nico, 2026-09-13 00:44: Configuración → Perfil entera cambiada por
   * «Esta sección se rompió · REFERENCIA TYPEERROR».
   *
   * Su `next dev` llevaba horas arriba y ya tenía cargado el módulo viejo de
   * `renovacion-automatica.service` (la ficha del contrato lo usa desde antes),
   * el de ANTES de que existiera `simular`. Cuando el Fast Refresh le metió
   * este bloque nuevo al lado, `renovacionAutomaticaApi.simular` no era una
   * función: el error salió del efecto —un `.catch()` sólo atrapa el rechazo de
   * una promesa que nunca llegó a existir— y la frontera de error se llevó la
   * sección.
   *
   * Reproducido en el navegador rebobinando ese archivo:
   * `TypeError: …renovacionAutomaticaApi.simular is not a function`
   * en `ConfigRenovacionAutomatica.tsx` dentro de `commitHookEffectListMount`.
   *
   * El pronóstico es información de más. Falle como falle, la sección se lee.
   */
  it('🔴 si `simular` NI SIQUIERA es una función, la sección se dibuja igual', async () => {
    simularMock.mockImplementation(() => {
      throw new TypeError('renovacionAutomaticaApi.simular is not a function')
    })
    await render()
    expect(q('config-renovacion-automatica')).toBeTruthy()
    expect(q('renovacion-automatica-switch')).toBeTruthy()
    expect(q('renovacion-pronostico')).toBeNull()
  })

  it('🔴 si la simulación vuelve con otra forma, no se pinta «NaN propuestas»', async () => {
    simularMock.mockResolvedValue(undefined)
    await render()
    expect(q('config-renovacion-automatica')).toBeTruthy()
    expect(q('renovacion-pronostico')).toBeNull()

    simularMock.mockResolvedValue({ propuestas: 'siete', renovadas: null })
    await render()
    expect(q('renovacion-pronostico')).toBeNull()
  })
})
