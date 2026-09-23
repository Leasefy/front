/**
 * «Movimientos» dentro de un cajón.
 *
 * Lo que fija:
 *   · plegada NO le pide nada al back (el cajón no cuesta una consulta más);
 *   · al abrirla pide los de ESE recurso y dice quién · rol · qué · cuándo;
 *   · sin el permiso `bitacora:view` el botón está apagado y dice por qué, y
 *     no hay llamada (un cable muerto que responde 403 no sirve);
 *   · sin la migración, lo dice en vez de parecer vacía;
 *   · con dos recursos (el inmueble y su mandato) es UNA lista, por fecha.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const delRecurso = vi.fn()
vi.mock('@/lib/api/movimientos.service', () => ({
  movimientosApi: { delRecurso: (...a: unknown[]) => delRecurso(...a) },
}))

let permisos: { canAccess: (m: string, a: string) => boolean } | null = null
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos,
}))

import { BitacoraDelRecurso } from './BitacoraDelRecurso'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  vi.clearAllMocks()
  permisos = { canAccess: (m, a) => m === 'bitacora' && a === 'view' }
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

const q = (t: string) => document.body.querySelector(`[data-testid="${t}"]`)

function mov(id: string, fecha: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    fecha,
    actor: { userId: 'u', nombre: 'Juana Pérez', email: 'j@x.co', rol: 'CONTADOR' },
    metodo: 'POST',
    ruta: '/x',
    modulo: 'lotes-de-dispersion',
    accion: 'Aprobó el lote de giros',
    recurso: { tipo: 'lote', id: 'L-1' },
    resultado: 201,
    duracionMs: 10,
    resumen: null,
    ip: null,
    agente: null,
    ...extra,
  }
}

async function montar(el: React.ReactElement) {
  await act(async () => {
    raiz.render(el)
  })
}

async function abrir() {
  await act(async () => {
    ;(q('movimientos-abrir') as HTMLButtonElement).click()
  })
}

describe('<BitacoraDelRecurso>', () => {
  it('plegada no pide nada; al abrirla pide los del recurso y dice quién, rol y qué', async () => {
    delRecurso.mockResolvedValue({
      disponible: true,
      motivo: null,
      filas: [mov('m1', '2026-09-22T15:00:00.000Z'), mov('m2', '2026-09-22T14:00:00.000Z', { resultado: 403, actor: { userId: 'v', nombre: 'Pedro', email: null, rol: 'AGENTE' } })],
    })
    await montar(<BitacoraDelRecurso tipo="lote" id="L-1" />)
    expect(delRecurso).not.toHaveBeenCalled()

    await abrir()
    expect(delRecurso).toHaveBeenCalledWith('lote', 'L-1')
    const m1 = q('movimiento-m1')?.textContent ?? ''
    expect(m1).toContain('Aprobó el lote de giros')
    expect(m1).toContain('Juana Pérez')
    expect(m1).toContain('Contador')
    // El intento negado se dice como negado.
    const m2 = q('movimiento-m2')?.textContent ?? ''
    expect(m2).toContain('Negado')
    expect(m2).toContain('Asesor comercial')
  })

  it('sin el permiso: apagada, dice por qué y NO llama al back', async () => {
    permisos = { canAccess: () => false }
    await montar(<BitacoraDelRecurso tipo="egreso" id="E-1" />)
    const boton = q('movimientos-abrir') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(q('movimientos-sin-permiso')?.textContent).toContain('permiso «Bitácora»')
    await abrir()
    expect(delRecurso).not.toHaveBeenCalled()
  })

  it('sin la migración lo dice, no se hace pasar por vacía', async () => {
    delRecurso.mockResolvedValue({ disponible: false, motivo: 'Falta la migración X', filas: [] })
    await montar(<BitacoraDelRecurso tipo="dispersion" id="D-1" />)
    await abrir()
    expect(q('movimientos-sin-migrar')).not.toBeNull()
    expect(q('movimientos-vacio')).toBeNull()
  })

  it('el inmueble y su mandato salen en UNA lista, de lo más nuevo a lo más viejo', async () => {
    delRecurso.mockImplementation((tipo: string) =>
      Promise.resolve({
        disponible: true,
        motivo: null,
        filas:
          tipo === 'inmueble'
            ? [mov('viejo', '2026-09-01T10:00:00.000Z', { accion: 'Modificó el inmueble' })]
            : [mov('nuevo', '2026-09-20T10:00:00.000Z', { accion: 'Modificó la consignación' })],
      }),
    )
    await montar(
      <BitacoraDelRecurso
        recursos={[
          { tipo: 'inmueble', id: 'P-1' },
          { tipo: 'consignacion', id: 'C-1' },
        ]}
      />,
    )
    await abrir()
    expect(delRecurso).toHaveBeenCalledWith('inmueble', 'P-1')
    expect(delRecurso).toHaveBeenCalledWith('consignacion', 'C-1')
    const ids = [...document.body.querySelectorAll('[data-testid^="movimiento-"]')].map((e) =>
      e.getAttribute('data-testid'),
    )
    expect(ids).toEqual(['movimiento-nuevo', 'movimiento-viejo'])
  })

  it('sin id no se pinta nada', async () => {
    await montar(<BitacoraDelRecurso tipo="lote" id={null} />)
    expect(q('movimientos-abrir')).toBeNull()
  })
})
