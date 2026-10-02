/**
 * @vitest-environment happy-dom
 *
 * `<FalloDeCarga>` y `<EstadoDeDatos>` ante una caída (01-10-2026).
 *
 *   · Se cayó UNA parte (503 `SERVICIO_NO_DISPONIBLE`): la nombran, dicen que
 *     no es culpa de la persona, ofrecen reintentar y —sólo si
 *     `/health/servicios` lo confirma— que el equipo ya está avisado.
 *   · Leasefy entero no responde o no hay internet: la franja de arriba ya lo
 *     dice, así que el cartel no repite un rojo técnico: «Esperando a
 *     Leasefy…», con su reintento.
 */
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import {
  avisarFallaDeRed,
  avisarQueLeasefyNoResponde,
  avisarQueLeasefyRespondio,
  CODIGO_LEASEFY_NO_RESPONDE,
  MENSAJE_LEASEFY_NO_RESPONDE,
  reiniciarEstadoDeConexion,
} from '@/lib/conexion/estado-de-conexion'
import { olvidarEstadoDeLosServicios } from '@/lib/conexion/servicio-no-disponible'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: { children?: React.ReactNode; asChild?: boolean }) =>
    asChild ? React.createElement('span', props, children) : React.createElement('button', props, children),
}))

import { FalloDeCarga } from './FalloDeCarga'
import { EstadoDeDatos } from './EstadoDeDatos'

function pagosCaidos() {
  const cuerpo = { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE', servicio: 'pagos', message: 'Wompi no responde' }
  return new ApiError(503, cuerpo.message, 'SERVICIO_NO_DISPONIBLE', cuerpo)
}

function healthDeServicios(equipoAvisado: boolean) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      revisadoEn: '2026-10-01T22:00:00.000Z',
      servicios: [{ servicio: 'pagos', estado: 'caido', desde: null, equipoAvisado }],
    }),
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true })
  reiniciarEstadoDeConexion()
  olvidarEstadoDeLosServicios()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  reiniciarEstadoDeConexion()
})

const render = async (el: React.ReactElement) => {
  await act(async () => root.render(el))
}
const texto = () => container.textContent ?? ''
const cartel = () => container.querySelector('[data-testid="fallo-de-carga"]') as HTMLElement

describe('<FalloDeCarga> con una parte caída', () => {
  it('nombra lo caído, sin código ni referencia, y ofrece reintentar', async () => {
    vi.stubGlobal('fetch', healthDeServicios(false))
    const onReintentar = vi.fn()
    await render(<FalloDeCarga error={pagosCaidos()} queEs="los pagos" onReintentar={onReintentar} />)

    expect(cartel().getAttribute('data-tipo')).toBe('servicioNoDisponible')
    expect(texto()).toContain('Los pagos con Wompi no están disponibles en este momento')
    expect(texto()).toContain('Lo demás de Leasefy sigue funcionando')
    expect(texto()).toContain('No es nada que hayas hecho')
    expect(texto()).not.toContain('Referencia')
    expect(texto()).not.toMatch(/503/)
    expect(container.querySelector('[data-testid="reintentar"]')).not.toBeNull()
  })

  it('«Nuestro equipo ya está avisado» sólo cuando /health/servicios lo confirma', async () => {
    vi.stubGlobal('fetch', healthDeServicios(true))
    await render(<FalloDeCarga error={pagosCaidos()} onReintentar={vi.fn()} />)
    expect(texto()).toContain('Nuestro equipo ya está avisado.')
  })

  it('con equipoAvisado false no lo promete', async () => {
    vi.stubGlobal('fetch', healthDeServicios(false))
    await render(<FalloDeCarga error={pagosCaidos()} onReintentar={vi.fn()} />)
    expect(texto()).not.toContain('equipo')
  })

  it('si /health/servicios no existe (back viejo), tampoco', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    await render(<FalloDeCarga error={pagosCaidos()} onReintentar={vi.fn()} />)
    expect(texto()).toContain('Los pagos con Wompi')
    expect(texto()).not.toContain('equipo')
  })

  it('un 503 sin `servicio` dice el genérico y no le pregunta al back', async () => {
    const f = vi.fn()
    vi.stubGlobal('fetch', f)
    const error = new ApiError(503, 'x', 'SERVICIO_NO_DISPONIBLE', { statusCode: 503, code: 'SERVICIO_NO_DISPONIBLE' })
    await render(<FalloDeCarga error={error} onReintentar={vi.fn()} />)
    expect(texto()).toContain('Esta parte de Leasefy no está respondiendo')
    expect(f).not.toHaveBeenCalled()
  })

  it('un 503 con otro code sigue siendo lo de antes, no una caída', async () => {
    const error = new ApiError(503, 'falta', 'FALTA_UNA_MIGRACION', { statusCode: 503 })
    await render(<FalloDeCarga error={error} onReintentar={vi.fn()} />)
    expect(cartel().getAttribute('data-tipo')).toBe('baseAtrasada')
  })
})

describe('<FalloDeCarga> con Leasefy entero caído', () => {
  const general = () =>
    new ApiError(503, MENSAJE_LEASEFY_NO_RESPONDE, CODIGO_LEASEFY_NO_RESPONDE, {})

  it('mientras la franja avisa: «Esperando a Leasefy…», calmado y con su reintento', async () => {
    avisarQueLeasefyNoResponde()
    const onReintentar = vi.fn()
    await render(<FalloDeCarga error={general()} onReintentar={onReintentar} />)
    expect(cartel().getAttribute('data-conexion')).toBe('esperando')
    expect(cartel().getAttribute('role')).toBe('status')
    expect(texto()).toContain('Esperando a Leasefy…')
    expect(texto()).not.toContain('Referencia')
    expect(container.querySelector('[data-testid="reintentar"]')).not.toBeNull()
  })

  it('un fallo de red sin internet: «Esperando la conexión…»', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true })
    avisarFallaDeRed()
    await render(<FalloDeCarga error={new ApiError(0, 'Sin conexión')} onReintentar={vi.fn()} />)
    expect(texto()).toContain('Esperando la conexión…')
  })

  it('cuando la franja se va, vuelve el cartel de siempre', async () => {
    avisarQueLeasefyNoResponde()
    await render(<FalloDeCarga error={new ApiError(0, 'fetch failed')} onReintentar={vi.fn()} />)
    expect(texto()).toContain('Esperando a Leasefy…')
    await act(async () => avisarQueLeasefyRespondio())
    expect(cartel().getAttribute('data-conexion')).toBeNull()
    expect(cartel().getAttribute('data-tipo')).toBe('red')
    expect(texto()).toContain('No pudimos conectarnos')
  })

  it('con la conexión bien, un fallo de red es el de siempre (la franja no lo dijo)', async () => {
    await render(<FalloDeCarga error={new ApiError(0, 'fetch failed')} onReintentar={vi.fn()} />)
    expect(cartel().getAttribute('data-tipo')).toBe('red')
    expect(cartel().getAttribute('role')).toBe('alert')
  })
})

describe('<EstadoDeDatos> con una parte caída', () => {
  it('muestra el texto de la caída en el hueco de contenido, sin marco', async () => {
    vi.stubGlobal('fetch', healthDeServicios(true))
    await render(
      <EstadoDeDatos cargando={false} error={pagosCaidos()} queEs="los pagos" onReintentar={vi.fn()}>
        <p>los datos</p>
      </EstadoDeDatos>,
    )
    expect(cartel().getAttribute('data-enmarcado')).toBe('no')
    expect(texto()).toContain('Los pagos con Wompi no están disponibles en este momento')
    expect(texto()).toContain('Nuestro equipo ya está avisado.')
    expect(texto()).not.toContain('los datos')
  })

  it('el reintento sigue conectado', async () => {
    vi.stubGlobal('fetch', healthDeServicios(false))
    const onReintentar = vi.fn()
    await render(
      <EstadoDeDatos cargando={false} error={pagosCaidos()} onReintentar={onReintentar}>
        <p>los datos</p>
      </EstadoDeDatos>,
    )
    const boton = container.querySelector('[data-testid="reintentar"]') as HTMLButtonElement
    await act(async () => {
      boton.click()
    })
    expect(onReintentar).toHaveBeenCalledTimes(1)
  })
})
