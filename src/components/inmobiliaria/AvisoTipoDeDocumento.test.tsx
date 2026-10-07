/**
 * AVISO-TIPO-DOC (05-10-2026): el aviso del panel de los propietarios cuyo
 * documento frena la factura por mandato.
 *  · lo ve quien puede arreglarlo (administrador, o contador que edita
 *    propietarios) y nadie más pregunta (el asesor no dispara un 403);
 *  · dice lo que escribió el back y lleva a la lista filtrada;
 *  · no tiene «cerrar»: se va solo cuando el back dice que ya no hay ninguno
 *    (al tocar un propietario se vuelve a pedir).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { permisos, getMock, oyentes } = vi.hoisted(() => ({
  permisos: {
    valor: null as null | {
      isAdmin: boolean
      agencyRole: string | null
      isLoading: boolean
      canAccess: (m: string, a: string) => boolean
    },
  },
  getMock: vi.fn(),
  oyentes: [] as Array<() => void | Promise<unknown>>,
}))

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContextSafe: () => permisos.valor,
}))
vi.mock('@/lib/api/client', () => ({ apiClient: { get: getMock } }))
vi.mock('@/lib/hooks/use-refresco-automatico', () => ({
  useRefrescoAutomatico: (_recursos: readonly string[], refetch: () => void) => {
    oyentes.push(refetch)
  },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href, ...props }, children),
}))

import { AvisoTipoDeDocumento } from './AvisoTipoDeDocumento'

const AVISO = {
  mes: '2026-10',
  nombreDelMes: 'Octubre de 2026',
  total: 10,
  facturasDelMes: 4,
  propietarios: [{ id: 'p-1', nombre: 'Inversiones Laboratorio S.A.S.', falta: 'MANDANTE_TIPO_DE_DOCUMENTO_POR_REVISAR', queFalta: 'Revisa el tipo de documento del propietario', facturasDelMes: 2 }],
  titulo: '10 propietarios con el documento por completar: sus facturas por mandato no se emiten hasta completarlo',
  detalle: 'En octubre de 2026 son 4 facturas por mandato que no se emiten por esto. Complétalo en la ficha de cada uno y se emiten.',
  enlace: '/panel/inmobiliaria/propietarios?falta=tipo-de-documento',
}
const NINGUNO = { ...AVISO, total: 0, facturasDelMes: 0, propietarios: [], titulo: null, detalle: null }

const admin = { isAdmin: true, agencyRole: 'ADMIN', isLoading: false, canAccess: () => true }

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  permisos.valor = admin
  getMock.mockReset().mockResolvedValue(AVISO)
  oyentes.length = 0
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

async function pintar(el: React.ReactElement) {
  await act(async () => {
    root.render(el)
  })
  await act(async () => {
    await Promise.resolve()
  })
}
const elAviso = () => host.querySelector('[data-testid="aviso-tipo-de-documento"]')

describe('<AvisoTipoDeDocumento>', () => {
  it('🔴 al administrador: el título y el detalle del back, y lleva a la lista filtrada', async () => {
    await pintar(<AvisoTipoDeDocumento />)
    expect(getMock).toHaveBeenCalledWith('/inmobiliaria/facturacion/aviso-tipo-de-documento')
    expect(elAviso()?.textContent).toContain(AVISO.titulo)
    expect(elAviso()?.textContent).toContain('son 4 facturas por mandato')
    expect(elAviso()?.getAttribute('data-severidad')).toBe('warning')
    const boton = elAviso()?.querySelector('a')
    expect(boton?.getAttribute('href')).toBe(AVISO.enlace)
    expect(boton?.textContent).toContain('Completar las fichas')
    // Sin «cerrar»: no hay ningún botón que lo esconda.
    expect(elAviso()?.querySelectorAll('button')).toHaveLength(0)
  })

  it('🔴 el asesor (edita propietarios, no ve facturación) ni pregunta ni lo ve', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'AGENTE', isLoading: false, canAccess: () => true }
    await pintar(<AvisoTipoDeDocumento />)
    expect(getMock).not.toHaveBeenCalled()
    expect(elAviso()).toBeNull()
  })

  it('el contador lo ve sólo si su inmobiliaria le deja editar propietarios', async () => {
    permisos.valor = { isAdmin: false, agencyRole: 'CONTADOR', isLoading: false, canAccess: (m, a) => m === 'propietarios' && a === 'view' }
    await pintar(<AvisoTipoDeDocumento />)
    expect(getMock).not.toHaveBeenCalled()
    expect(elAviso()).toBeNull()

    act(() => root.unmount())
    root = createRoot(host)
    permisos.valor = { isAdmin: false, agencyRole: 'CONTADOR', isLoading: false, canAccess: () => true }
    await pintar(<AvisoTipoDeDocumento />)
    expect(elAviso()?.textContent).toContain(AVISO.titulo)
  })

  it('🔴 con la inmobiliaria sin ninguno, no hay aviso', async () => {
    getMock.mockResolvedValue(NINGUNO)
    await pintar(<AvisoTipoDeDocumento />)
    expect(elAviso()).toBeNull()
  })

  it('🔴 se va solo cuando se completa la última ficha (se vuelve a pedir al tocar un propietario)', async () => {
    await pintar(<AvisoTipoDeDocumento />)
    expect(elAviso()).not.toBeNull()
    getMock.mockResolvedValue(NINGUNO)
    await act(async () => {
      await oyentes[oyentes.length - 1]()
    })
    // La salida es animada (Presence): se espera a que termine.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    expect(elAviso()).toBeNull()
  })

  it('en la lista con el filtro puesto no ofrece «Ver»: la lista de abajo ya es eso', async () => {
    await pintar(<AvisoTipoDeDocumento enLaLista filtroPuesto />)
    expect(elAviso()?.textContent).toContain(AVISO.titulo)
    expect(elAviso()?.querySelector('a')).toBeNull()

    act(() => root.unmount())
    root = createRoot(host)
    await pintar(<AvisoTipoDeDocumento enLaLista />)
    expect(elAviso()?.querySelector('a')?.textContent).toContain('Ver los 10')
  })

  it('un fallo del back no inventa un aviso', async () => {
    getMock.mockRejectedValue(new Error('500'))
    await pintar(<AvisoTipoDeDocumento />)
    expect(elAviso()).toBeNull()
  })
})
