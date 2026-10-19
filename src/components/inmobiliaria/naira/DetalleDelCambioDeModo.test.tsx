/**
 * @vitest-environment happy-dom
 *
 * DetalleDelCambioDeModo — paso 2 (Nico, 18-10-2026), dentro del cajón de Aprobaciones: dice qué cambio, por qué con sus
 * cifras, el modo de hoy y hasta cuándo vale. Aprobar Manual va directo; subir a Automático abre el diálogo del Piloto
 * (segundo factor); rechazar dice que no vuelve en 7 días; lo que no se aplicó dice por qué; lo decidido no tiene botones.
 * Paso 3: lo que descubrió Naira dice «Lo descubrió Naira», su porqué tal cual y las cifras que citó; frenar se aprueba
 * directo y dice que lo apagó.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => ({ decidir: vi.fn() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cambios-de-modo', () => ({ decidirCambioDeModo: red.decidir }))
vi.mock('@/components/inmobiliaria/piloto/ConfirmarAutomatico', () => ({
  ConfirmarAutomatico: (p: { abierto: boolean; titulo?: string }) => (p.abierto ? <div data-testid="confirmar-automatico">{p.titulo}</div> : null),
}))

import { Cajon } from '@/components/ui/cajon'
import type { CambioDeModo } from '@/lib/api/naira/cambios-de-modo'

import { DetalleDelCambioDeModo } from './DetalleDelCambioDeModo'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

const MANUAL: CambioDeModo = {
  id: 'c-1',
  agente: 'calidad',
  nombre: 'Niti (calidad de las publicaciones)',
  de: 'copiloto',
  a: 'sombra',
  regla: 'manual',
  cifras: { esperando: 60, dias: 7 },
  porQue: '',
  origen: 'regla',
  porqueDeNaira: null,
  propuestoEn: '2026-10-18T16:00:00.000Z',
  expiraEn: '2026-10-25T16:00:00.000Z',
  estado: 'abierto',
  razon: null,
}
const SUBIR: CambioDeModo = { ...MANUAL, id: 'c-2', agente: 'mantenimiento', nombre: 'Fixi (mantenimiento)', a: 'autonomo', regla: 'subir', cifras: { aprobadas: 25, descartadas: 0, dias: 30 } }
const PORQUE = 'Siete de sus últimas doce inspecciones fallaron por lo mismo: conviene frenarlo y revisar la plantilla.'
const FRENAR: CambioDeModo = {
  ...MANUAL,
  id: 'c-9',
  agente: 'inspeccion',
  nombre: 'Vidi (inspección)',
  a: 'apagado',
  regla: 'frenar',
  cifras: { fallo_1_veces: 7, acciones_30d: 12, proceso_2_fallidas_30d: 7 },
  porQue: `Apagar a Vidi (inspección) para tu inmobiliaria: ${PORQUE}`,
  origen: 'naira',
  porqueDeNaira: PORQUE,
}

beforeEach(() => {
  red.decidir.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar(cambio: CambioDeModo, onDecidido = vi.fn()): Promise<typeof onDecidido> {
  await act(async () => {
    root.render(
      <Cajon abierto onOpenChange={() => {}}>
        <DetalleDelCambioDeModo cambio={cambio} onDecidido={onDecidido} />
      </Cajon>,
    )
  })
  return onDecidido
}

const texto = () => document.body.textContent ?? ''
const boton = (t: string) => [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === t)

describe('el detalle de un cambio de modo (paso 2)', () => {
  it('[CAMBIO-F:detalle] dice qué cambio, por qué con sus cifras, el modo de hoy y hasta cuándo vale', async () => {
    await montar(MANUAL)
    expect(texto()).toContain('Pasar a Niti (calidad de las publicaciones) a Manual')
    expect(texto()).toContain('60 propuestas suyas esperan hace más de 7 días sin respuesta')
    expect(texto()).toContain('Hoy está en Copiloto.')
    expect(boton('Aprobar')).toBeTruthy()
    expect(boton('Rechazar')).toBeTruthy()
  })

  it('[CAMBIO-F:aprobar] Manual se aprueba directo, avisa y deja de ofrecer los botones', async () => {
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: { resultado: 'aplicado', razon: null, mensaje: '' } })
    const onDecidido = await montar(MANUAL)
    await act(async () => boton('Aprobar')!.click())
    expect(red.decidir).toHaveBeenCalledWith('AGY-1', 'c-1', 'aprobar')
    expect(texto()).toContain('Listo: cambié el modo.')
    expect(onDecidido).toHaveBeenCalled()
    expect(boton('Aprobar')).toBeUndefined()
  })

  it('[CAMBIO-F:subir] subir a Automático no decide de una: abre el diálogo del Piloto (segundo factor)', async () => {
    await montar(SUBIR)
    await act(async () => boton('Aprobar')!.click())
    expect(red.decidir).not.toHaveBeenCalled()
    expect(document.body.querySelector('[data-testid="confirmar-automatico"]')?.textContent).toContain('Fixi (mantenimiento)')
  })

  it('[CAMBIO-F:rechazar-y-no-aplicado] rechazar dice que no vuelve en 7 días; lo que no se aplicó dice por qué', async () => {
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: { resultado: 'rechazado', razon: null, mensaje: '' } })
    await montar(MANUAL)
    await act(async () => boton('Rechazar')!.click())
    expect(texto()).toContain('no lo vuelve a proponer en 7 días')

    act(() => root.unmount())
    root = createRoot(container)
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: { resultado: 'no_aplicado', razon: 'modo_cambiado', mensaje: '' } })
    await montar({ ...MANUAL, id: 'c-3' })
    await act(async () => boton('Aprobar')!.click())
    expect(texto()).toContain('Alguien ya le había cambiado el modo')
  })

  it('[CAMBIO-F:decidido] lo decidido muestra por qué no se aplicó y no tiene botones', async () => {
    await montar({ ...MANUAL, estado: 'no_aplicado', razon: 'ya_no_corresponde' })
    expect(texto()).toContain('Naira ya no lo recomendaba')
    expect(boton('Aprobar')).toBeUndefined()
    expect(boton('Rechazar')).toBeUndefined()
  })

  it('[CAMBIO-F:descubierto] lo de Naira dice «Lo descubrió Naira», su porqué tal cual y las cifras que vio con su nombre', async () => {
    await montar(FRENAR)
    expect(document.body.querySelector('[data-naira-descubierto]')?.textContent).toBe('Lo descubrió Naira')
    expect(texto()).toContain('Apagar a Vidi (inspección) para tu inmobiliaria')
    expect(texto()).toContain(PORQUE)
    const cifras = document.body.querySelector('[data-naira-cifras-citadas]')?.textContent ?? ''
    expect(cifras).toContain('Las cifras que vio')
    expect(cifras).toContain('Veces que falló por la misma causa7')
    expect(cifras).toContain('Acciones en 30 días12')
    expect(cifras).toContain('Fallidas de uno de sus procesos en 30 días7')
    expect(texto()).toContain('deja de correr para tu inmobiliaria')
    // Lo de las reglas no lleva la etiqueta ni la lista de cifras.
    act(() => root.unmount())
    root = createRoot(container)
    await montar(MANUAL)
    expect(document.body.querySelector('[data-naira-descubierto]')).toBeNull()
    expect(document.body.querySelector('[data-naira-cifras-citadas]')).toBeNull()
  })

  it('[CAMBIO-F:frenar] frenar se aprueba directo y dice que lo apagó; si ya estaba apagado, lo dice', async () => {
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: { resultado: 'aplicado', razon: null, mensaje: '' } })
    await montar(FRENAR)
    await act(async () => boton('Aprobar')!.click())
    expect(red.decidir).toHaveBeenCalledWith('AGY-1', 'c-9', 'aprobar')
    expect(document.body.querySelector('[data-testid="confirmar-automatico"]')).toBeNull()
    expect(texto()).toContain('Listo: apagué a Vidi (inspección) para tu inmobiliaria.')

    act(() => root.unmount())
    root = createRoot(container)
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: { resultado: 'no_aplicado', razon: 'modo_cambiado', mensaje: '' } })
    await montar({ ...FRENAR, id: 'c-10' })
    await act(async () => boton('Aprobar')!.click())
    expect(texto()).toContain('Ya estaba apagado: no se tocó nada.')
  })
})
