/**
 * QA-PROP-95 PO-27 (04-10-2026, decidido por el coordinador): un propietario
 * con ficha en la inmobiliaria (y la invitación) pero todavía sin contratos
 * entraba al panel del propietario INDEPENDIENTE: «Publica tu propiedad»,
 * «Mejorar plan» y un 503 PANEL_PROPIETARIO_INDEPENDIENTE en la red. Ahora es
 * propietario de inmobiliaria: menú corto e Inicio con el vacío honesto.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const api = vi.hoisted(() => ({ mio: vi.fn(), disponibles: vi.fn() }))
vi.mock('@/lib/api/estado-de-cuenta.service', () => ({ estadoDeCuentaApi: { mio: api.mio } }))
vi.mock('@/lib/api/informes-del-propietario.service', () => ({ informesDelPropietarioApi: { disponibles: api.disponibles } }))

import { useContratosAdministrados, type ContratosAdministrados } from './ContratosConLaInmobiliaria'

let host: HTMLDivElement
let root: Root
let visto: ContratosAdministrados | null = null
function Sonda() {
  visto = useContratosAdministrados()
  return null
}
beforeEach(() => {
  visto = null
  api.mio.mockReset()
  api.disponibles.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})
const montar = async () => {
  await act(async () => root.render(<Sonda />))
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}

describe('PO-27 · ficha en la inmobiliaria y ningún contrato', () => {
  it('404 SIN_CONTRATOS + una ficha → propietario de inmobiliaria, con el nombre de la inmobiliaria', async () => {
    api.mio.mockRejectedValue(Object.assign(new Error('No tienes contratos'), { status: 404, code: 'SIN_CONTRATOS' }))
    api.disponibles.mockResolvedValue({ fichas: [{ propietarioId: 'p', agencyId: 'a', agencia: 'Inmobiliaria Laboratorio S.A.S.' }], anios: [], motivo: null })
    await montar()
    expect(visto).toMatchObject({ cargando: false, doc: null, fichaSinContratos: { inmobiliaria: 'Inmobiliaria Laboratorio S.A.S.' } })
  })

  it('sin ficha (el independiente) sigue siendo independiente', async () => {
    api.mio.mockRejectedValue(Object.assign(new Error('No tienes contratos'), { status: 404, code: 'SIN_CONTRATOS' }))
    api.disponibles.mockResolvedValue({ fichas: [], anios: [], motivo: 'No encontramos tu ficha' })
    await montar()
    expect(visto).toMatchObject({ cargando: false, doc: null, fichaSinContratos: null })
  })

  it('otro fallo (500) no se adivina: no pregunta por la ficha', async () => {
    api.mio.mockRejectedValue(Object.assign(new Error('x'), { status: 500, code: 'ERROR_INTERNO' }))
    await montar()
    expect(api.disponibles).not.toHaveBeenCalled()
    expect(visto?.fichaSinContratos).toBeNull()
  })

  it('el menú corto del portal también lo lee (layout del propietario)', () => {
    const layout = readFileSync(join(process.cwd(), 'src/app/panel/(landlord)/layout.tsx'), 'utf8')
    expect(layout).toMatch(/const deInmobiliaria = administrados\.cargando \|\| administrados\.doc !== null \|\| Boolean\(administrados\.fichaSinContratos\);/)
  })
})
