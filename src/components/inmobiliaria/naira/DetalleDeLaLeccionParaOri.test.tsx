/**
 * @vitest-environment happy-dom
 *
 * DetalleDeLaLeccionParaOri — paso 4 (Nico, 18-10-2026: «Le enseña, el admin confirma»), dentro del cajón de Aprobaciones:
 * dice lo que Ori aprendería, de dónde lo sacó Naira (agente y proceso, o lo decidido en Aprobaciones), en qué sentido
 * decide el equipo y las cifras con su nombre. Aprobar y rechazar van directo; con las lecciones del chat apagadas lo dice;
 * lo decidido no tiene botones; si otra persona ya la decidió, lo dice y la tabla vuelve a leer.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => ({ decidir: vi.fn() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/lecciones-para-ori', () => ({ decidirLeccionParaOri: red.decidir }))

import { Cajon } from '@/components/ui/cajon'
import type { LeccionParaOri } from '@/lib/api/naira/lecciones-para-ori'

import { DetalleDeLaLeccionParaOri } from './DetalleDeLaLeccionParaOri'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLDivElement
let root: Root

const TEXTO = 'Aquí descartan las inspecciones de salida que prepara Vidi (14 de 14 en 30 días): no las sugieras sin que te lo pidan.'
const DE_VIDI: LeccionParaOri = {
  id: 'lesson-feedback-naira-0123456789abcdef',
  texto: TEXTO,
  agente: 'inspeccion',
  nombre: 'Vidi (inspección)',
  proceso: 'inspeccion.salida',
  queHaceElProceso: 'Prepara la inspección de salida del inmueble.',
  sentido: 'descartan',
  cifras: { descartadas_30d: 14, proceso_1_acciones_30d: 14 },
  estado: 'por_decidir',
  propuestaEn: '2026-10-18T11:38:00.000Z',
  decididaEn: null,
}
const DE_APROBACIONES: LeccionParaOri = {
  ...DE_VIDI,
  id: 'lesson-feedback-naira-fedcba9876543210',
  texto: 'Aquí rechazan las tareas que propone Naira (6 en 30 días): no las sugieras como primera opción.',
  agente: null,
  nombre: null,
  proceso: null,
  queHaceElProceso: null,
  cifras: { naira_crear_tarea_rechazadas_30d: 6, cambios_de_modo_vencidos_30d: 5 },
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

async function montar(leccion: LeccionParaOri, oriLasUsa = true, onDecidido = vi.fn()): Promise<typeof onDecidido> {
  await act(async () => {
    root.render(
      <Cajon abierto onOpenChange={() => {}}>
        <DetalleDeLaLeccionParaOri leccion={leccion} oriLasUsa={oriLasUsa} onDecidido={onDecidido} />
      </Cajon>,
    )
  })
  return onDecidido
}

const texto = () => document.body.textContent ?? ''
const boton = (t: string) => [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === t)

describe('el detalle de una lección para Ori (paso 4)', () => {
  it('[LECC-F:detalle] dice lo que aprendería, de qué agente y proceso, en qué sentido y las cifras con su nombre', async () => {
    await montar(DE_VIDI)
    expect(texto()).toContain(TEXTO)
    expect(texto()).toContain('De lo que el equipo decide en la Bandeja con Vidi (inspección).')
    expect(texto()).toContain('En este proceso: Prepara la inspección de salida del inmueble.')
    expect(texto()).toContain('El equipo casi siempre lo descarta.')
    expect(texto()).toContain('Descartadas en 30 días')
    expect(texto()).toContain('Acciones de uno de sus procesos en 30 días')
    expect(texto()).toContain('Naira no lo vuelve a proponer')
    expect(document.body.querySelector('[data-naira-lecciones-apagadas]')).toBeNull()
    expect(boton('Aprobar')).toBeTruthy()
    expect(boton('Rechazar')).toBeTruthy()
  })

  it('[LECC-F:aprobaciones] la de lo decidido en Aprobaciones nombra el tipo de acción y los cambios de modo', async () => {
    await montar(DE_APROBACIONES)
    expect(texto()).toContain('De lo que el equipo decide en Naira → Aprobaciones')
    expect(texto()).toContain(': rechazadas en 30 días')
    expect(texto()).toContain('Cambios de modo vencidos sin respuesta en 30 días')
    expect(texto()).not.toContain('naira_crear_tarea')
  })

  it('[LECC-F:aprobar] aprobar va directo, avisa que Ori ya la usa y deja de ofrecer los botones', async () => {
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: 'aprendida' })
    const onDecidido = await montar(DE_VIDI)
    await act(async () => boton('Aprobar')!.click())
    expect(red.decidir).toHaveBeenCalledWith('AGY-1', DE_VIDI.id, 'aprobar')
    expect(texto()).toContain('Listo: Ori ya lo tiene en cuenta al responder.')
    expect(onDecidido).toHaveBeenCalled()
    expect(boton('Aprobar')).toBeUndefined()
  })

  it('[LECC-F:apagadas] con las lecciones del chat apagadas lo dice antes y después de aprobar', async () => {
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: 'aprendida' })
    await montar(DE_VIDI, false)
    expect(document.body.querySelector('[data-naira-lecciones-apagadas]')).not.toBeNull()
    await act(async () => boton('Aprobar')!.click())
    expect(texto()).toContain('Ori la usará cuando se prendan las lecciones del chat')
  })

  it('[LECC-F:rechazar-y-conflicto] rechazar dice que no vuelve; si otra persona ya la decidió, lo dice y la tabla vuelve a leer', async () => {
    red.decidir.mockResolvedValue({ kind: 'ok', resultado: 'descartada' })
    await montar(DE_VIDI)
    await act(async () => boton('Rechazar')!.click())
    expect(red.decidir).toHaveBeenCalledWith('AGY-1', DE_VIDI.id, 'rechazar')
    expect(texto()).toContain('Ori no lo aprende y Naira no lo vuelve a proponer')

    act(() => root.unmount())
    root = createRoot(container)
    red.decidir.mockResolvedValue({ kind: 'conflicto' })
    const onDecidido = await montar(DE_APROBACIONES)
    await act(async () => boton('Aprobar')!.click())
    expect(texto()).toContain('Otra persona ya la decidió.')
    expect(onDecidido).toHaveBeenCalled()
    expect(boton('Aprobar')).toBeUndefined()
  })

  it('[LECC-F:decidida] lo decidido dice cuándo y no tiene botones; si no se pudo, no cambia nada y deja reintentar', async () => {
    await montar({ ...DE_VIDI, estado: 'aprendida', decididaEn: '2026-10-19T14:00:00.000Z' })
    expect(texto()).toContain('Aprendida el')
    expect(boton('Aprobar')).toBeUndefined()
    expect(boton('Rechazar')).toBeUndefined()

    act(() => root.unmount())
    root = createRoot(container)
    red.decidir.mockResolvedValue({ kind: 'no_disponible' })
    await montar(DE_VIDI)
    await act(async () => boton('Aprobar')!.click())
    expect(texto()).toContain('No pude hacerlo ahora.')
    expect(boton('Aprobar')).toBeTruthy()
  })
})
