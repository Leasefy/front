/**
 * DialogoDeBorrado.test.tsx — el AlertDialog de borrado de la memoria (13-07, Tarea 2; UI-SPEC §10.4).
 *
 * Qué prueba: el motivo es obligatorio y NINGUNO viene marcado (ni al abrir ni al reabrir); se envía el motivo elegido UNA
 * vez; «Volver» sale sin escribir; 409/404/403 cierran y suben; un fallo reintentable se queda con el motivo elegido; la
 * razón técnica nunca aparece. Arnés: molde de 13-05. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import type { NairaMemoryErasureResult } from '@/lib/api/naira/contrato'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { borrar } = vi.hoisted(() => ({ borrar: vi.fn() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  borrarItem: borrar,
}))

import { DialogoDeBorrado } from './DialogoDeBorrado'

const BORRADO: NairaMemoryErasureResult = { erasedItemIds: ['MEM-1'], erasedAt: '2000-01-03T12:00:00.000Z', auditId: 'AUD-1' }

let host: HTMLDivElement
let root: Root
const espiaAbierto = vi.fn()
const espiaDesenlace = vi.fn()
let abrir: ((a: boolean) => void) | null = null

function Arnes() {
  const [abierto, setAbierto] = useState(true)
  abrir = setAbierto
  return (
    <DialogoDeBorrado
      itemId="MEM-1"
      abierto={abierto}
      onAbiertoCambia={(a) => {
        espiaAbierto(a)
        setAbierto(a)
      }}
      onDesenlace={espiaDesenlace}
    />
  )
}

type Diferida = { resolver: (e: EstadoNaira<NairaMemoryErasureResult>) => void }
function diferida(): Diferida {
  const d: Diferida = { resolver: () => undefined }
  borrar.mockImplementationOnce(() => new Promise((r) => (d.resolver = r)))
  return d
}

const dialogo = () => document.querySelector('[role="alertdialog"]')
const confirmar = () => document.querySelector('[data-testid="naira-confirmar-borrado"]') as HTMLButtonElement
const radios = () => Array.from(document.querySelectorAll('input[type="radio"]')) as HTMLInputElement[]
const radioDe = (etiqueta: string) =>
  radios().find((r) => r.closest('label')?.textContent?.includes(etiqueta)) as HTMLInputElement

async function esperar() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

async function clic(el: Element | null | undefined) {
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

async function reabrir() {
  await act(async () => abrir?.(true))
  await esperar()
}

async function borrarCon(e: EstadoNaira<NairaMemoryErasureResult>) {
  await clic(radioDe('Decisión de la inmobiliaria'))
  const d = diferida()
  await clic(confirmar())
  await act(async () => d.resolver(e))
  await esperar()
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  borrar.mockReset()
  espiaAbierto.mockReset()
  espiaDesenlace.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

describe('DialogoDeBorrado', () => {
  it('[N13:control-positivo] abierto: título, cuerpo, motivo con dos radios, «Volver» y «Borrar ítem»', async () => {
    await montar()
    const d = dialogo()
    expect(d?.textContent).toContain('¿Borrar esto de la memoria de Naira?')
    expect(d?.textContent).toContain(
      'Se borra el texto y todo lo que Naira derivó de él. No se puede deshacer. Queda el registro de que se borró y cuándo.',
    )
    const fs = d?.querySelector('fieldset[data-naira-motivo-de-borrado]')
    expect(fs?.querySelector('legend')?.textContent).toBe('Motivo (obligatorio)')
    expect(radios()).toHaveLength(2)
    expect(radioDe('Lo pidió el titular de los datos')).toBeDefined()
    expect(radioDe('Decisión de la inmobiliaria')).toBeDefined()
    expect(Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Volver')).toBe(true)
    expect(confirmar().textContent).toContain('Borrar ítem')
  })

  it('[N13:borrar-exige-motivo] ninguno marcado al abrir ni al reabrir, y sin motivo no se envía', async () => {
    await montar()
    expect(radios().some((r) => r.checked)).toBe(false)
    expect(confirmar().disabled).toBe(true)
    await clic(confirmar())
    expect(borrar).not.toHaveBeenCalled()
    await clic(radioDe('Decisión de la inmobiliaria'))
    expect(confirmar().disabled).toBe(false)
    borrar.mockResolvedValueOnce({ kind: 'ok', data: BORRADO, origen: 'agente' })
    await clic(confirmar())
    expect(borrar).toHaveBeenCalledTimes(1)
    expect(borrar).toHaveBeenCalledWith('AGY-1', 'MEM-1', 'decision_de_la_agencia')
    await reabrir()
    expect(radios().some((r) => r.checked)).toBe(false)
    expect(confirmar().disabled).toBe(true)
  })

  it('[N13:motivo-real] el pedido lleva el motivo elegido', async () => {
    await montar()
    await clic(radioDe('Lo pidió el titular de los datos'))
    borrar.mockResolvedValueOnce({ kind: 'ok', data: BORRADO, origen: 'agente' })
    await clic(confirmar())
    expect(borrar).toHaveBeenCalledWith('AGY-1', 'MEM-1', 'solicitud_del_titular')
  })

  it('[N13:borrar-con-dialogo] «Volver» cierra sin borrar', async () => {
    await montar()
    await clic(radioDe('Decisión de la inmobiliaria'))
    await clic(Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Volver'))
    expect(espiaAbierto).toHaveBeenCalledWith(false)
    expect(borrar).not.toHaveBeenCalled()
  })

  it('[N13:borrar-una-vez] en vuelo todo deshabilitado y sin reenvío; el ok cierra y sube hecho', async () => {
    await montar()
    await clic(radioDe('Decisión de la inmobiliaria'))
    const d = diferida()
    await clic(confirmar())
    expect(confirmar().disabled).toBe(true)
    expect(radios().every((r) => r.disabled || r.closest('fieldset')?.disabled === true)).toBe(true)
    await clic(confirmar())
    expect(borrar).toHaveBeenCalledTimes(1)
    await act(async () => d.resolver({ kind: 'ok', data: BORRADO, origen: 'agente' }))
    await esperar()
    expect(espiaDesenlace).toHaveBeenCalledTimes(1)
    expect(espiaDesenlace).toHaveBeenCalledWith({ kind: 'hecho' })
    expect(espiaAbierto).toHaveBeenCalledWith(false)
  })

  it('[N13:borrar-por-razon] 409/404/403 cierran y suben; sin servicio o 400 se queda con el motivo; sin razón técnica', async () => {
    await montar()
    await borrarCon({ kind: 'conflicto', razon: 'ya-redactado' })
    expect(espiaDesenlace).toHaveBeenLastCalledWith({ kind: 'recargar', aviso: 'item_cambio' })
    expect(espiaAbierto).toHaveBeenLastCalledWith(false)
    expect(document.body.innerHTML).not.toContain('ya-redactado')
    await reabrir()
    await borrarCon({ kind: 'no_encontrado' })
    expect(espiaDesenlace).toHaveBeenLastCalledWith({ kind: 'recargar', aviso: 'item_ya_no_esta' })
    await reabrir()
    await borrarCon({ kind: 'sin_permiso' })
    expect(espiaDesenlace).toHaveBeenLastCalledWith({ kind: 'sin_permiso' })
    expect(espiaAbierto).toHaveBeenLastCalledWith(false)
    await reabrir()
    espiaDesenlace.mockReset()
    for (const e of [{ kind: 'no_disponible' }, { kind: 'rechazado', razon: 'solicitud-invalida' }] as const) {
      await borrarCon(e)
      expect(dialogo()).not.toBeNull()
      expect(dialogo()?.textContent).toContain('No pudimos borrar este ítem. Intenta de nuevo.')
      expect(radioDe('Decisión de la inmobiliaria').checked).toBe(true)
    }
    expect(espiaDesenlace).not.toHaveBeenCalled()
    expect(document.body.innerHTML).not.toContain('solicitud-invalida')
  })
})
