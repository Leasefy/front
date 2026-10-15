/**
 * DialogoDeCorreccion.test.tsx — el diálogo de corrección de la memoria (13-07, Tarea 2).
 *
 * Qué prueba: el texto se precarga y se restaura al abrir; «Guardar corrección» exige un texto nuevo; se envía UNA vez; el
 * 422 de la pantalla de datos personales se queda en el diálogo y se dice por su razón SIN repetir el texto en ningún otro
 * nodo (Ley 1581, P3); 409/404/2xx ilegible/403 suben y cierran; un fallo reintentable se queda; en móvil es un Sheet.
 * Arnés: molde de 13-05 (createRoot + act, portal en document.body). Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import type { NairaMemoryWriteResult } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { corregir, movil } = vi.hoisted(() => ({ corregir: vi.fn(), movil: { valor: false } }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => movil.valor }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  corregirItem: corregir,
}))

import { DialogoDeCorreccion } from './DialogoDeCorreccion'

const TEXTO_ACTUAL = 'Texto actual (ejemplo)'
const ESCRITURA: NairaMemoryWriteResult = EJEMPLOS_DE_NAIRA['memoria.corregir']

let host: HTMLDivElement
let root: Root
const espiaAbierto = vi.fn()
const espiaDesenlace = vi.fn()
let abrir: ((a: boolean) => void) | null = null

function Arnes() {
  const [abierto, setAbierto] = useState(true)
  abrir = setAbierto
  return (
    <DialogoDeCorreccion
      itemId="MEM-1"
      textoActual={TEXTO_ACTUAL}
      abierto={abierto}
      onAbiertoCambia={(a) => {
        espiaAbierto(a)
        setAbierto(a)
      }}
      onDesenlace={espiaDesenlace}
    />
  )
}

type Diferida = { resolver: (e: EstadoNaira<NairaMemoryWriteResult>) => void }
function diferida(): Diferida {
  const d: Diferida = { resolver: () => undefined }
  corregir.mockImplementationOnce(() => new Promise((r) => (d.resolver = r)))
  return d
}

const dialogo = () => document.querySelector('[role="dialog"]')
const campo = () => document.querySelector('textarea') as HTMLTextAreaElement
const guardar = () => document.querySelector('[data-testid="naira-corregir-guardar"]') as HTMLButtonElement
const rechazo = () => document.querySelector('[data-naira-rechazo]')

async function esperar() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

async function escribir(valor: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(campo(), valor)
    campo().dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function clic(el: Element | null) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
  await esperar()
}

async function montar() {
  await act(async () => {
    root.render(<Arnes />)
  })
  await esperar()
}

async function enviarCon(texto: string, e: EstadoNaira<NairaMemoryWriteResult>) {
  await escribir(texto)
  const d = diferida()
  await clic(guardar())
  await act(async () => d.resolver(e))
  await esperar()
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  corregir.mockReset()
  espiaAbierto.mockReset()
  espiaDesenlace.mockReset()
  movil.valor = false
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

const boton = (texto: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto) as HTMLButtonElement | undefined

describe('DialogoDeCorreccion', () => {
  it('[N13:control-positivo] abierto: título, descripción, campo precargado con su etiqueta y los dos botones', async () => {
    await montar()
    const d = dialogo()
    expect(d).not.toBeNull()
    expect(d?.hasAttribute('data-naira-dialogo-de-correccion')).toBe(true)
    expect(d?.textContent).toContain('Corregir lo que cree Naira')
    expect(d?.textContent).toContain('Naira usará tu versión desde ahora; la anterior queda en el historial.')
    expect(campo().value).toBe(TEXTO_ACTUAL)
    expect(campo().maxLength).toBe(4000)
    const label = document.querySelector(`label[for="${campo().id}"]`)
    expect(label?.textContent).toBe('Texto corregido')
    expect(boton('Volver')).toBeDefined()
    expect(guardar().textContent).toContain('Guardar corrección')
  })

  it('[N13:guardar-deshabilitado] sin cambios o vacío no se puede guardar', async () => {
    await montar()
    expect(guardar().disabled).toBe(true)
    await escribir('   ')
    expect(guardar().disabled).toBe(true)
    await escribir('Texto nuevo')
    expect(guardar().disabled).toBe(false)
  })

  it('[N13:corregir-una-vez] se envía una vez, en vuelo no se reenvía, y el ok cierra y sube hecho', async () => {
    await montar()
    await escribir('Texto nuevo')
    const d = diferida()
    await clic(guardar())
    expect(corregir).toHaveBeenCalledTimes(1)
    expect(corregir).toHaveBeenCalledWith('AGY-1', 'MEM-1', 'Texto nuevo')
    expect(guardar().disabled).toBe(true)
    expect(campo().readOnly).toBe(true)
    await clic(guardar())
    expect(corregir).toHaveBeenCalledTimes(1)
    await act(async () => d.resolver({ kind: 'ok', data: ESCRITURA, origen: 'agente' }))
    await esperar()
    expect(espiaDesenlace).toHaveBeenCalledTimes(1)
    expect(espiaDesenlace).toHaveBeenCalledWith({ kind: 'hecho' })
    expect(espiaAbierto).toHaveBeenCalledWith(false)
  })

  it('[N13:pii-sin-eco] el 422 de la pantalla se queda y dice la razón sin repetir el texto ni la razón cruda', async () => {
    await montar()
    await enviarCon('Llamar al 3001234567 CENTINELA-PII-77', { kind: 'rechazado', razon: 'pii:telefono' })
    expect(dialogo()).not.toBeNull()
    const r = rechazo()
    expect(r?.getAttribute('role')).toBe('alert')
    expect(r?.textContent).toBe('Tiene un teléfono. Quítalo y vuelve a guardar.')
    expect(r?.textContent).not.toContain('CENTINELA-PII-77')
    const clon = document.body.cloneNode(true) as HTMLElement
    clon.querySelectorAll('textarea').forEach((t) => t.remove())
    expect(clon.innerHTML).not.toContain('CENTINELA-PII-77')
    expect(clon.innerHTML).not.toContain('pii:telefono')
    expect(campo().value).toBe('Llamar al 3001234567 CENTINELA-PII-77')
    expect(espiaDesenlace).not.toHaveBeenCalled()
    const casos: ReadonlyArray<readonly [string, string]> = [
      ['pii:cedula', 'Tiene un número de cédula.'],
      ['pii:email', 'Tiene un correo.'],
      ['pending_counsel:naira_desempeno_empleados', 'Habla del desempeño de una persona del equipo; eso todavía no se puede guardar.'],
    ]
    for (const [razon, frase] of casos) {
      const d = diferida()
      await clic(guardar())
      expect(rechazo()).toBeNull()
      await act(async () => d.resolver({ kind: 'rechazado', razon }))
      await esperar()
      expect(rechazo()?.textContent).toBe(frase + ' Quítalo y vuelve a guardar.')
      expect(document.body.innerHTML).not.toContain(razon)
    }
    const d = diferida()
    await clic(guardar())
    await act(async () => d.resolver({ kind: 'rechazado', razon: 'otra' }))
    await esperar()
    expect(rechazo()?.textContent).toBe('Este texto no se puede guardar tal como está.')
    expect(rechazo()?.textContent).not.toContain('Quítalo')
    expect(document.body.textContent).not.toContain('otra')
  })

  it('[N13:conflicto-sube] 409, 404 y 2xx ilegible cierran y suben recargar sin la razón', async () => {
    await montar()
    await enviarCon('Texto nuevo', { kind: 'conflicto', razon: 'not-current' })
    expect(espiaDesenlace).toHaveBeenLastCalledWith({ kind: 'recargar', aviso: 'item_cambio' })
    expect(espiaAbierto).toHaveBeenCalledWith(false)
    expect(document.body.innerHTML).not.toContain('not-current')
    await act(async () => abrir?.(true))
    await esperar()
    await enviarCon('Texto nuevo', { kind: 'no_encontrado' })
    expect(espiaDesenlace).toHaveBeenLastCalledWith({ kind: 'recargar', aviso: 'item_ya_no_esta' })
    await act(async () => abrir?.(true))
    await esperar()
    await enviarCon('Texto nuevo', { kind: 'contrato_roto' })
    expect(espiaDesenlace).toHaveBeenLastCalledWith({ kind: 'recargar', aviso: 'sin_confirmar' })
  })

  it('[N13:escritura-403] un 403 sube sin_permiso y cierra, sin eco del texto', async () => {
    await montar()
    await enviarCon('Texto nuevo CENTINELA-403', { kind: 'sin_permiso' })
    expect(espiaDesenlace).toHaveBeenCalledWith({ kind: 'sin_permiso' })
    expect(espiaAbierto).toHaveBeenCalledWith(false)
    expect(document.body.innerHTML).not.toContain('CENTINELA-403')
  })

  it('[N13:reintentable] sin servicio se queda abierto con el fallo y el botón habilitado', async () => {
    await montar()
    await enviarCon('Texto nuevo', { kind: 'no_disponible' })
    expect(dialogo()).not.toBeNull()
    expect(dialogo()?.textContent).toContain('No pudimos guardar la corrección. Intenta de nuevo.')
    expect(guardar().disabled).toBe(false)
    expect(espiaDesenlace).not.toHaveBeenCalled()
  })

  it('[N13:volver-sin-escribir] «Volver» cierra sin escribir', async () => {
    await montar()
    await clic(boton('Volver') ?? null)
    expect(espiaAbierto).toHaveBeenCalledWith(false)
    expect(corregir).not.toHaveBeenCalled()
  })

  it('[N13:restaura-al-abrir] al reabrir vuelve el texto actual sin mensaje', async () => {
    await montar()
    await enviarCon('X', { kind: 'rechazado', razon: 'pii:email' })
    expect(rechazo()).not.toBeNull()
    await act(async () => abrir?.(false))
    await esperar()
    await act(async () => abrir?.(true))
    await esperar()
    expect(campo().value).toBe(TEXTO_ACTUAL)
    expect(rechazo()).toBeNull()
  })

  it('[N13:dialogo-responsivo] en móvil el mismo título y el mismo botón están en un dialog (Sheet)', async () => {
    movil.valor = true
    await montar()
    const d = dialogo()
    expect(d?.textContent).toContain('Corregir lo que cree Naira')
    expect(d?.querySelector('[data-testid="naira-corregir-guardar"]')).not.toBeNull()
  })
})
