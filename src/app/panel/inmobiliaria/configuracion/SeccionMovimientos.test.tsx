/**
 * La pantalla «Bitácora de movimientos».
 *
 * Lo que fija:
 *   · pide el MES en curso (días de Bogotá) y dice UNA frase de resumen;
 *   · cada fila dice quién, con qué rol, qué hizo y si se negó;
 *   · la fila abre el cajón con el detalle y lo enviado REDACTADO, sin pedirle
 *     nada nuevo al back;
 *   · sin la migración la pantalla lo dice: vacía no es «nadie hizo nada».
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const listar = vi.fn()
const opciones = vi.fn()
vi.mock('@/lib/api/movimientos.service', () => ({
  movimientosApi: {
    listar: (...a: unknown[]) => listar(...a),
    opciones: (...a: unknown[]) => opciones(...a),
    delRecurso: vi.fn(),
  },
}))

import { SeccionMovimientos } from './SeccionMovimientos'
import { mesActual } from '@/lib/recaudo/meses'
import { rangoDelMes } from '@/lib/movimientos/en-palabras'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  vi.clearAllMocks()
  opciones.mockResolvedValue({ disponible: true, personas: [], roles: [], modulos: [] })
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

const q = (t: string) => document.body.querySelector(`[data-testid="${t}"]`)
const montar = async () => {
  await act(async () => {
    raiz.render(<SeccionMovimientos />)
  })
}

const NEGADO = {
  id: 'm-1',
  fecha: '2026-09-22T20:00:00.000Z',
  actor: { userId: 'u-1', nombre: 'Pedro Ruiz', email: 'pedro@x.co', rol: 'AGENTE' },
  metodo: 'POST',
  ruta: '/inmobiliaria/lotes-de-dispersion/L-1/aprobar',
  modulo: 'lotes-de-dispersion',
  accion: 'Aprobó el lote de giros',
  recurso: { tipo: 'lote', id: 'L-1' },
  resultado: 403,
  duracionMs: 12,
  resumen: { motivo: 'Urgente', codigoDeAprobacion: '«redactado»' },
  ip: '10.0.0.1',
  agente: 'Mozilla/5.0',
}

describe('<SeccionMovimientos>', () => {
  it('pide el mes en curso y dice UNA frase; la fila dice quién, rol, qué y si se negó', async () => {
    listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      pagina: 1,
      porPagina: 50,
      resumen: { negados: 1, errores: 0, personas: 1 },
      filas: [NEGADO],
    })
    await montar()

    const { desde, hasta } = rangoDelMes(mesActual())
    expect(listar).toHaveBeenCalledWith(
      expect.objectContaining({ desde, hasta, pagina: 1, porPagina: 50 }),
    )
    expect(q('frase-del-resumen')?.textContent).toMatch(
      /hubo 1 movimiento de 1 persona; 1 fue negado por permiso\./,
    )
    const fila = q('movimiento-m-1')?.textContent ?? ''
    expect(fila).toContain('Pedro Ruiz')
    expect(fila).toContain('Asesor comercial')
    expect(fila).toContain('Aprobó el lote de giros')
    expect(fila).toContain('Negado')
    // Los filtros dicen que son filtros.
    expect(q('filtros-de-movimientos')?.textContent).toContain('Filtrar por')
  })

  it('la fila abre el cajón con el rol de ese día y lo enviado redactado, sin otra llamada', async () => {
    listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      pagina: 1,
      porPagina: 50,
      resumen: { negados: 1, errores: 0, personas: 1 },
      filas: [NEGADO],
    })
    await montar()
    const llamadas = listar.mock.calls.length

    await act(async () => {
      ;(q('movimiento-m-1') as HTMLElement).click()
    })
    expect(q('cajon-del-movimiento')).not.toBeNull()
    expect(q('rol-del-movimiento')?.textContent).toBe('Asesor comercial')
    expect(q('que-quiere-decir')?.textContent).toContain('no lo dejó')
    const enviado = q('lo-enviado')?.textContent ?? ''
    expect(enviado).toContain('Urgente')
    expect(enviado).toContain('«redactado»')
    expect(listar.mock.calls.length).toBe(llamadas)
  })

  it('dice cuánto se guarda con el número que manda el back (Nico: 5 años)', async () => {
    listar.mockResolvedValue({
      disponible: true,
      motivo: null,
      total: 1,
      pagina: 1,
      porPagina: 50,
      resumen: { negados: 1, errores: 0, personas: 1 },
      retencion: { anos: 5 },
      filas: [NEGADO],
    })
    await montar()
    expect(q('retencion-de-la-bitacora')?.textContent).toMatch(/Se guarda 5 años/)
  })

  it('sin la migración lo dice: vacía no es «nadie hizo nada»', async () => {
    listar.mockResolvedValue({
      disponible: false,
      motivo: 'Falta la migración 20260922210000_bitacora_de_movimientos',
      total: 0,
      pagina: 1,
      porPagina: 50,
      resumen: { negados: 0, errores: 0, personas: 0 },
      filas: [],
    })
    await montar()
    expect(q('movimientos-sin-migrar')).not.toBeNull()
    expect(q('frase-del-resumen')).toBeNull()
    expect(q('movimientos-vacio')?.textContent).not.toContain('Nadie hizo nada')
  })
})
