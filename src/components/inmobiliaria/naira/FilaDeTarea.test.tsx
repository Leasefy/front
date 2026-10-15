/**
 * FilaDeTarea.test.tsx — una tarea que creó Naira, en Aprobaciones (13-05, Tarea 3).
 *
 * Qué prueba: nombre por el detector, «Rol: …», «Abierta desde el …» en `<time>`, «Ver la bitácora» y «Cancelar tarea»;
 * cancelar SIEMPRE pasa por el AlertDialog (UI-SPEC §10.4) y llama una sola vez; el resultado se dice por su razón, en un
 * `role="status"` con el foco, sin copiar la razón del servidor; sin `task-cancel` o sin la tarea abierta no hay botón; un
 * detector desconocido no muestra su id; el dueño es un rol; con datos de ejemplo no se cancela; y sin `href` no hay
 * bitácora.
 *
 * Arnés (molde de 13-04): createRoot + act, stub de i18n real (es.json), `next/link` → `<a>`, `useAuth` con AGY-1, el
 * cliente mockeado en `cancelarTarea` (promesas diferidas), permisos falsos; el AlertDialog sale por portal a
 * `document.body`. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaTask, type NairaTaskCancelResult } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { tituloDeLaMetrica } from '@/lib/naira/vocabulario-de-seguimiento'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { cancelar } = vi.hoisted(() => ({
  cancelar: vi.fn(async (): Promise<EstadoNaira<NairaTaskCancelResult>> => ({ kind: 'no_disponible' })),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...resto }: React.PropsWithChildren<{ href: string; prefetch?: boolean } & Record<string, unknown>>) =>
    React.createElement('a', { href, 'data-prefetch': String(prefetch), ...resto }, children),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  cancelarTarea: cancelar,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true, isAdmin: false, agencyRole: 'ADMIN' }),
}))

import { FilaDeTarea, type FilaDeTareaProps } from './FilaDeTarea'
import { ProveedorDeOrigen, type OrigenDeLosDatos } from './OrigenDeNaira'

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['tareas.lista']
const LISTA = EJEMPLOS_DE_NAIRA['tareas.lista']

function tareaCon(over: Partial<NairaTask> = {}): NairaTask {
  const tarea: NairaTask = {
    ...LISTA.tareas[0],
    tareaId: 'TAREA-1',
    proposalId: 'PROP-1',
    loopId: 'LOOP-1',
    detectorId: 'estado.vacancia_tendencia',
    owner: 'role:cartera',
    estado: 'abierta',
    creadaEn: '2000-01-03T08:00:00.000Z',
    ...over,
  }
  return ESTRICTO.parse({ ...LISTA, tareas: [tarea] }).tareas[0]
}

let contenedor: HTMLDivElement
let root: Root

function montar(over: Partial<FilaDeTareaProps> = {}, origen: OrigenDeLosDatos = 'agente') {
  const props: FilaDeTareaProps = { tarea: tareaCon(), hrefDelLoop: '/l/LOOP-1', puedeCancelar: true, ...over }
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <ul>
          <FilaDeTarea {...props} />
        </ul>
      </ProveedorDeOrigen>,
    )
  })
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })

const boton = () => contenedor.querySelector<HTMLButtonElement>('[data-testid="naira-cancelar-tarea"]')
const dialogo = () => document.querySelector('[role="alertdialog"]')

async function clic(el: Element | null) {
  expect(el).not.toBeNull()
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}

function botonDelDialogo(texto: string): HTMLButtonElement | null {
  return (Array.from(dialogo()?.querySelectorAll('button') ?? []).find((b) => b.textContent?.trim() === texto) ??
    null) as HTMLButtonElement | null
}

async function cancelarCon(r: EstadoNaira<NairaTaskCancelResult>) {
  cancelar.mockImplementation(async () => r)
  await clic(boton())
  await clic(document.querySelector('[data-testid="naira-confirmar-cancelar-tarea"]'))
  await asentar()
}

beforeEach(() => {
  cancelar.mockReset()
  cancelar.mockImplementation(async () => ({ kind: 'no_disponible' }))
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('FilaDeTarea', () => {
  it('[N13:control-positivo] nombre, rol, abierta desde, bitácora y cancelar', () => {
    montar()
    const fila = contenedor.querySelector('[data-naira-tarea="abierta"]')
    expect(fila).not.toBeNull()
    const nombre = tituloDeLaMetrica('portafolio.vacancy_rate')
    expect(nombre).not.toBeNull()
    expect(fila?.textContent).toContain(nombre ?? '∅')
    expect(fila?.textContent).toContain('Rol: Cartera')
    expect(fila?.textContent).toContain('Abierta desde el')
    expect(fila?.querySelector('time[datetime="2000-01-03T08:00:00.000Z"]')).not.toBeNull()
    expect(fila?.querySelector('a[href="/l/LOOP-1"]')?.textContent).toBe('Ver la bitácora')
    expect(boton()?.textContent).toBe('Cancelar tarea')
  })

  it('[N13:fixture-es-contrato] la tarea con el centinela pasa el esquema estricto y un campo renombrado no', () => {
    const buena = { ...LISTA.tareas[0], tareaId: 'TAREA-1' }
    expect(() => ESTRICTO.parse({ ...LISTA, tareas: [buena] })).not.toThrow()
    const { tareaId, ...resto } = buena
    expect(() => ESTRICTO.parse({ ...LISTA, tareas: [{ ...resto, tareaIdd: tareaId }] })).toThrow()
  })

  it('[N13:cancelar-con-dialogo] cancelar pasa por el diálogo, «Volver» no cancela y confirmar llama una vez', async () => {
    montar()
    await clic(boton())
    expect(cancelar).not.toHaveBeenCalled()
    expect(dialogo()?.textContent).toContain('¿Cancelar esta tarea?')
    expect(dialogo()?.textContent).toContain('rol Cartera')
    await clic(botonDelDialogo('Volver'))
    expect(dialogo()).toBeNull()
    expect(cancelar).not.toHaveBeenCalled()
    await cancelarCon({ kind: 'ok', data: { kind: 'cancelada', tareaId: 'TAREA-1' }, origen: 'agente' })
    expect(cancelar).toHaveBeenCalledTimes(1)
    expect(cancelar).toHaveBeenCalledWith('AGY-1', 'TAREA-1')
    const estado = contenedor.querySelector('p[role="status"]')
    expect(estado?.textContent).toBe(
      'Cancelamos la tarea. Si el problema sigue, Naira lo seguirá mostrando en Seguimiento.',
    )
    expect(document.activeElement).toBe(estado)
    expect(contenedor.querySelector('[data-naira-tarea="cancelada"]')).not.toBeNull()
    expect(boton()).toBeNull()
  })

  it('[N13:cancelar-por-razon] cada respuesta se dice por su razón, sin copiar la razón del servidor', async () => {
    montar()
    await cancelarCon({ kind: 'sin_permiso' })
    expect(contenedor.querySelector('p[role="status"]')?.textContent).toBe('No tienes permiso para esta acción.')
    expect(boton()?.disabled).toBe(true)

    for (const r of [{ kind: 'no_encontrado' }, { kind: 'conflicto', razon: 'ya_cerrada' }] as const) {
      act(() => root.unmount())
      root = createRoot(contenedor)
      montar()
      await cancelarCon(r)
      expect(contenedor.querySelector('p[role="status"]')?.textContent).toBe('Esta tarea ya no está abierta.')
      expect(boton()).toBeNull()
      expect(contenedor.innerHTML).not.toContain('ya_cerrada')
      expect(document.body.innerHTML).not.toContain('ya_cerrada')
    }

    act(() => root.unmount())
    root = createRoot(contenedor)
    montar()
    await cancelarCon({ kind: 'no_disponible' })
    expect(contenedor.querySelector('p[role="status"]')?.textContent).toBe('No pudimos cancelar la tarea. Intenta de nuevo.')
    expect(boton()?.disabled).toBe(false)
  })

  it('[N13:cancelar-segun-permiso] sin task-cancel o sin la tarea abierta no hay botón', () => {
    montar({ puedeCancelar: false })
    expect(boton()).toBeNull()
    expect(contenedor.textContent).not.toContain('Cancelar tarea')
    montar({ tarea: tareaCon({ estado: 'cancelada' }) })
    expect(boton()).toBeNull()
    expect(contenedor.textContent).not.toContain('Cancelar tarea')
  })

  it('[N13:nombre-de-la-tarea] un detector que el panel no reconoce no muestra su id', () => {
    for (const detectorId of ['x.y', 'cartera.mora_umbral_cop']) {
      montar({ tarea: tareaCon({ detectorId }) })
      expect(contenedor.textContent).toContain('Una tarea sobre algo que esta versión del panel no reconoce')
      expect(contenedor.innerHTML).not.toContain(detectorId)
    }
  })

  it('[N13:rol-no-persona] el dueño es un rol, en la fila y en el diálogo', async () => {
    montar()
    await clic(boton())
    for (const html of [contenedor.innerHTML, dialogo()?.innerHTML ?? '']) {
      expect(html).not.toContain('role:')
      for (const id of USER_IDS_DE_EJEMPLO) expect(html).not.toContain(id)
    }
    expect(contenedor.textContent).toContain('Rol: Cartera')
  })

  it('[N13:simulado-visible] con datos de ejemplo no se cancela y lo dice', async () => {
    montar({}, 'ejemplo')
    expect(boton()?.disabled).toBe(true)
    expect(contenedor.textContent).toContain('Datos de ejemplo: no se puede cancelar.')
    await act(async () => {
      boton()?.click()
    })
    expect(dialogo()).toBeNull()
    expect(cancelar).not.toHaveBeenCalled()
  })

  it('[N13:sin-href-del-agente] sin href del loop no hay «Ver la bitácora»', () => {
    montar({ hrefDelLoop: null })
    expect(contenedor.textContent).not.toContain('Ver la bitácora')
    expect(contenedor.querySelector('a')).toBeNull()
  })
})
